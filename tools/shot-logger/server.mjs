// Shot logger — local web app that replaces the chat-based coffee log flow.
//
// Serves a form at http://127.0.0.1:4737, appends the submitted shot to
// src/data/coffee.ts, then ships it the same way chat sessions did:
// feature branch → push → PR → wait for Lighthouse checks → squash-merge.
//
// Run from the repo root (or anywhere): node tools/shot-logger/server.mjs
// Requires: Node >= 22.6 (TS type stripping), git + gh authenticated.
//
// Notes:
// - All git work happens in a throwaway worktree under /tmp, so the main
//   checkout is never touched, even if it is dirty or on another branch.
// - Merge gate: every reported check must conclude green. Shot PRs skip
//   Lighthouse via the workflow's paths-ignore, so in practice this waits
//   on the Cloudflare Pages build — which still fails if the site breaks.
// - Bags are read-only here. Adding/opening/closing bags stays a chat task.

import http from 'node:http';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

const exec = promisify(execFile);

const PORT = 4737;
const HOST = '127.0.0.1';
const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const COFFEE_TS = path.join(REPO_ROOT, 'src', 'data', 'coffee.ts');
const CHECK_POLL_MS = 30_000;
const CHECK_TIMEOUT_MS = 25 * 60_000;

// ---------------------------------------------------------------------------
// Data access

async function loadCoffeeData() {
  // Cache-bust so repeated loads see fresh file contents.
  const url = pathToFileURL(COFFEE_TS).href + '?t=' + Date.now();
  return import(url);
}

function localToday() {
  return new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD, local tz
}

async function getState() {
  const mod = await loadCoffeeData();
  const { bags, brews, bagIdOf } = mod;
  const openBags = bags
    .filter((b) => b.openedDate && !b.closedDate)
    .map((b) => {
      const id = bagIdOf(b);
      const last = [...brews].reverse().find((e) => bagIdOf(e) === id);
      return {
        bagId: id,
        bean: b.bean,
        roaster: b.roaster ?? null,
        roastDate: b.roastDate,
        lastShot: last
          ? {
              doseG: last.doseG,
              yieldG: last.yieldG,
              timeS: last.timeS,
              grind: last.grind ?? null,
              basket: last.basket ?? null,
              temp: last.temp ?? null,
              puckScreen: last.puckScreen ?? false,
            }
          : null,
      };
    });
  const distinct = (key) => [...new Set(brews.map((e) => e[key]).filter(Boolean))];
  // Sort grind settings by their numeric part ("DF64 #6.5" → 6.5) so the
  // dropdown reads finest to coarsest instead of first-seen order.
  const grindNum = (s) => parseFloat(String(s).match(/[\d.]+(?!.*[\d.])/)?.[0] ?? '');
  const grinds = distinct('grind').sort((a, b) => {
    const na = grindNum(a), nb = grindNum(b);
    if (Number.isFinite(na) && Number.isFinite(nb) && na !== nb) return na - nb;
    return String(a).localeCompare(String(b));
  });
  return {
    today: localToday(),
    bags: openBags,
    grinds,
    baskets: distinct('basket'),
    // MaraX V2 has three fixed temp levels; not derived from history so
    // unused levels (Low) are still selectable.
    temps: ['Low', 'Mid', 'High'],
  };
}

// ---------------------------------------------------------------------------
// Entry formatting + insertion

export function tsString(s) {
  return `'${String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
}

export function formatEntry(e) {
  // Field order mirrors the BrewEntry type declaration.
  const lines = ['  {'];
  const push = (k, v) => lines.push(`    ${k}: ${v},`);
  push('date', tsString(e.date));
  push('bean', tsString(e.bean));
  if (e.roaster) push('roaster', tsString(e.roaster));
  push('roastDate', tsString(e.roastDate));
  push('doseG', e.doseG);
  push('yieldG', e.yieldG);
  push('timeS', e.timeS);
  if (e.grind) push('grind', tsString(e.grind));
  if (e.basket) push('basket', tsString(e.basket));
  if (e.temp) push('temp', tsString(e.temp));
  if (e.puckScreen) push('puckScreen', 'true');
  push('method', tsString(e.method || 'espresso'));
  if (e.rating) push('rating', e.rating);
  if (e.notes) push('notes', tsString(e.notes));
  if (e.flag) push('flag', tsString(e.flag));
  lines.push('  },');
  return lines.join('\n');
}

export function insertEntry(source, entryText) {
  const start = source.indexOf('export const brews');
  if (start === -1) throw new Error('brews array not found in coffee.ts');
  const close = source.indexOf('\n];', start);
  if (close === -1) throw new Error('closing ]; of brews not found');
  return source.slice(0, close + 1) + entryText + '\n' + source.slice(close + 1);
}

export function validate(body) {
  const errs = [];
  const num = (v) => typeof v === 'number' && Number.isFinite(v) && v > 0;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(body.date || '')) errs.push('date must be YYYY-MM-DD');
  if (!body.bean) errs.push('bean is required');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(body.roastDate || '')) errs.push('roastDate must be YYYY-MM-DD');
  if (!num(body.doseG)) errs.push('doseG must be a positive number');
  if (!num(body.yieldG)) errs.push('yieldG must be a positive number');
  if (!num(body.timeS)) errs.push('timeS must be a positive number');
  if (body.rating != null && ![1, 2, 3, 4, 5].includes(body.rating)) errs.push('rating must be 1-5');
  if (body.flag && !['dial-in', 'process-error', 'prep-error'].includes(body.flag))
    errs.push('invalid flag');
  return errs;
}

// ---------------------------------------------------------------------------
// Git / PR pipeline

const jobs = new Map(); // id → { log: [], status, prUrl }
let jobSeq = 0;

function newJob() {
  const id = String(++jobSeq);
  const job = { log: [], status: 'running', prUrl: null };
  jobs.set(id, job);
  return { id, job };
}

function jlog(job, msg) {
  job.log.push(`[${new Date().toLocaleTimeString()}] ${msg}`);
  console.log(msg);
}

async function git(args, cwd = REPO_ROOT) {
  const { stdout } = await exec('git', args, { cwd });
  return stdout.trim();
}

async function gh(args, cwd = REPO_ROOT) {
  const { stdout } = await exec('gh', args, { cwd });
  return stdout.trim();
}

async function pickBranchName() {
  const base = `coffee-log-${localToday()}`;
  for (let i = 0; i < 10; i++) {
    const name = i === 0 ? base : `${base}-${i + 1}`;
    const remote = await git(['ls-remote', 'origin', `refs/heads/${name}`]);
    const local = await git(['branch', '--list', name]);
    if (!remote && !local) return name;
  }
  throw new Error('could not find a free branch name');
}

function commitMessage(shots) {
  const [, m, d] = shots[0].date.split('-').map(Number);
  const beans = [...new Set(shots.map((s) => s.bean))];
  const what = beans.length === 1 ? `${beans[0]} shot${shots.length > 1 ? 's' : ''}` : 'shots';
  return `coffee: log ${m}/${d} ${what}`;
}

async function runPipeline(job, shots) {
  const worktree = path.join('/tmp', 'shot-logger', `wt-${Date.now()}`);
  let branch = null;
  try {
    jlog(job, 'Fetching origin/main…');
    await git(['fetch', 'origin', 'main']);

    branch = await pickBranchName();
    jlog(job, `Creating worktree on ${branch}…`);
    await git(['worktree', 'add', '-b', branch, worktree, 'origin/main']);

    const wtCoffee = path.join(worktree, 'src', 'data', 'coffee.ts');
    const source = await readFile(wtCoffee, 'utf8');
    const updated = insertEntry(source, shots.map(formatEntry).join('\n'));
    await writeFile(wtCoffee, updated, 'utf8');

    // Sanity check: the edited file must still import cleanly.
    await import(pathToFileURL(wtCoffee).href + '?t=' + Date.now());
    jlog(job, `${shots.length} ${shots.length === 1 ? 'entry' : 'entries'} inserted; coffee.ts still parses.`);

    const msg = commitMessage(shots);
    await git(['add', 'src/data/coffee.ts'], worktree);
    await git(['commit', '-m', msg], worktree);
    await git(['push', '-u', 'origin', branch], worktree);
    jlog(job, `Pushed ${branch}.`);

    const prUrl = await gh(
      ['pr', 'create', '--title', msg, '--body', 'Logged via shot-logger.', '--head', branch],
      worktree,
    );
    job.prUrl = prUrl;
    jlog(job, `PR opened: ${prUrl}`);

    // Worktree is no longer needed; PR operations go by URL.
    await git(['worktree', 'remove', '--force', worktree]);
    await git(['branch', '-D', branch]);
    branch = null;

    jlog(job, 'Waiting for CI checks…');
    const verdict = await waitForChecks(job, prUrl);

    if (verdict === 'pass') {
      await gh(['pr', 'merge', prUrl, '--squash', '--delete-branch']);
      job.status = 'merged';
      jlog(job, 'Checks green — squash-merged and deleted branch.');
    } else {
      job.status = verdict === 'fail' ? 'checks-failed' : 'timeout';
      jlog(job, `Not merging (${job.status}). PR left open: ${prUrl}`);
    }
  } catch (err) {
    job.status = 'error';
    jlog(job, `Error: ${err.message}`);
    // Best-effort cleanup so a failed run doesn't strand a worktree.
    try {
      await git(['worktree', 'remove', '--force', worktree]);
    } catch {}
    try {
      if (branch) await git(['branch', '-D', branch]);
    } catch {}
  }
}

async function waitForChecks(job, prUrl) {
  const deadline = Date.now() + CHECK_TIMEOUT_MS;
  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, CHECK_POLL_MS));
    let raw;
    try {
      raw = await gh(['pr', 'checks', prUrl, '--json', 'name,bucket']);
    } catch (err) {
      // gh exits non-zero while checks are pending/failing; stdout still has JSON.
      raw = err.stdout?.trim();
      if (!raw) {
        jlog(job, 'Checks not reported yet…');
        continue;
      }
    }
    const checks = JSON.parse(raw);
    if (checks.some((c) => c.bucket === 'fail')) return 'fail';
    // Merge once at least one check exists and none are pending or failing.
    // Shot PRs skip Lighthouse (paths-ignore), so this is the Pages build.
    if (checks.length > 0 && checks.every((c) => c.bucket === 'pass' || c.bucket === 'skipping'))
      return 'pass';
    jlog(
      job,
      `Pending: ${checks.filter((c) => c.bucket === 'pending').map((c) => c.name).join(', ') || 'waiting for checks to appear'}`,
    );
  }
  return 'timeout';
}

// ---------------------------------------------------------------------------
// HTTP server

async function readBody(req) {
  let data = '';
  for await (const chunk of req) data += chunk;
  return JSON.parse(data || '{}');
}

function send(res, code, body, type = 'application/json') {
  res.writeHead(code, { 'Content-Type': type });
  res.end(type === 'application/json' ? JSON.stringify(body) : body);
}

const server = http.createServer(async (req, res) => {
  try {
    if (req.method === 'GET' && req.url === '/') {
      return send(res, 200, PAGE, 'text/html');
    }
    if (req.method === 'GET' && req.url === '/api/state') {
      return send(res, 200, await getState());
    }
    if (req.method === 'GET' && req.url?.startsWith('/api/job/')) {
      const job = jobs.get(req.url.slice('/api/job/'.length));
      if (!job) return send(res, 404, { error: 'no such job' });
      return send(res, 200, job);
    }
    if (req.method === 'POST' && req.url === '/api/log') {
      const body = await readBody(req);
      const shots = Array.isArray(body.shots) ? body.shots : [body];
      if (!shots.length) return send(res, 400, { errors: ['no shots submitted'] });
      const errs = shots.flatMap((s, i) =>
        validate(s).map((e) => (shots.length > 1 ? `shot ${i + 1}: ${e}` : e)),
      );
      if (errs.length) return send(res, 400, { errors: errs });
      const { id, job } = newJob();
      for (const s of shots)
        jlog(job, `Logging ${s.date} ${s.bean}: ${s.doseG}g → ${s.yieldG}g in ${s.timeS}s`);
      runPipeline(job, shots); // fire and forget; UI polls
      return send(res, 200, { jobId: id });
    }
    send(res, 404, { error: 'not found' });
  } catch (err) {
    send(res, 500, { error: err.message });
  }
});

// ---------------------------------------------------------------------------
// UI

const PAGE = /* html */ `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Shot logger</title>
<style>
  :root { color-scheme: dark; }
  body { font: 15px/1.5 -apple-system, system-ui, sans-serif; background: #14100d;
         color: #e8e0d8; max-width: 34rem; margin: 2rem auto; padding: 0 1rem; }
  h1 { font-size: 1.2rem; letter-spacing: .02em; }
  label { display: block; margin-top: .8rem; font-size: .8rem; color: #b8a898;
          text-transform: uppercase; letter-spacing: .06em; }
  input, select, textarea { width: 100%; box-sizing: border-box; margin-top: .25rem;
          padding: .45rem .6rem; background: #201a15; color: #e8e0d8;
          border: 1px solid #3a3028; border-radius: 6px; font: inherit; }
  .row { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: .8rem; }
  .row2 { display: grid; grid-template-columns: 1fr 1fr; gap: .8rem; }
  .check { display: flex; align-items: center; gap: .5rem; margin-top: 1rem; }
  .check input { width: auto; margin: 0; }
  .check label { margin: 0; text-transform: none; letter-spacing: 0; font-size: .95rem; color: #e8e0d8; }
  button { margin-top: 1.2rem; width: 100%; padding: .6rem; font: inherit; font-weight: 600;
          background: #7a5c3e; color: #fff; border: 0; border-radius: 6px; cursor: pointer; }
  button:disabled { opacity: .5; cursor: default; }
  button.secondary { background: #3a3028; }
  #batch { list-style: none; padding: 0; margin: 1rem 0 0; }
  #batch li { display: flex; justify-content: space-between; gap: .6rem; padding: .35rem .6rem;
              background: #201a15; border: 1px solid #3a3028; border-radius: 6px; margin-top: .4rem;
              font: 13px/1.5 ui-monospace, monospace; }
  #batch a { color: #e77; text-decoration: none; cursor: pointer; }
  #log { margin-top: 1.2rem; padding: .8rem; background: #0d0a08; border-radius: 6px;
         font: 12px/1.6 ui-monospace, monospace; white-space: pre-wrap; display: none; }
  #log a { color: #d8b88a; }
  .status-merged { color: #9c6; } .status-error, .status-checks-failed { color: #e77; }
</style>
</head>
<body>
<h1>Shot logger</h1>
<form id="f">
  <label>Bag</label>
  <select id="bag"></select>
  <div class="row">
    <div><label>Dose g</label><input id="doseG" type="number" step="0.1" required></div>
    <div><label>Yield g</label><input id="yieldG" type="number" step="0.1" required></div>
    <div><label>Time s</label><input id="timeS" type="number" step="1" required></div>
  </div>
  <div class="row">
    <div><label>Grind</label><select id="grind"></select></div>
    <div><label>Basket</label><select id="basket"></select></div>
    <div><label>Temp</label><select id="temp"></select></div>
  </div>
  <label>Flag</label>
  <select id="flag"><option value="">none</option>
    <option value="dial-in">dial-in</option>
    <option value="process-error">process-error</option>
    <option value="prep-error">prep-error</option>
  </select>
  <label>Notes</label>
  <textarea id="notes" rows="2"></textarea>
  <div class="check"><input id="puckScreen" type="checkbox" checked><label for="puckScreen">Puck screen</label></div>
  <div class="check"><input id="date" type="date" style="width:auto"><label for="date">Brew date</label></div>
  <button id="add" type="submit" class="secondary">Add shot to batch</button>
</form>
<ul id="batch"></ul>
<button id="go" disabled>Ship batch → PR → merge</button>
<div id="log"></div>
<script>
let state;
const $ = (id) => document.getElementById(id);

async function init() {
  state = await (await fetch('/api/state')).json();
  $('date').value = state.today;
  $('bag').innerHTML = state.bags.map((b, i) =>
    \`<option value="\${i}">\${b.bean} · \${b.roastDate}\${b.roaster ? ' — ' + b.roaster : ''}</option>\`).join('');
  const opts = (vals) => '<option value="">—</option>' +
    vals.map((v) => \`<option value="\${v}">\${v}</option>\`).join('');
  $('grind').innerHTML = opts(state.grinds);
  $('basket').innerHTML = opts(state.baskets);
  $('temp').innerHTML = opts(state.temps);
  $('bag').onchange = fill;
  fill();
}

function fill() {
  const b = state.bags[+$('bag').value];
  if (!b) return;
  const l = b.lastShot;
  $('doseG').value = l ? l.doseG : '';
  $('grind').value = l?.grind || '';
  $('basket').value = l?.basket || '';
  $('temp').value = l?.temp || '';
  $('puckScreen').checked = l ? !!l.puckScreen : true;
  $('yieldG').value = '';
  $('timeS').value = '';
}

const batch = [];

function renderBatch() {
  $('batch').innerHTML = batch.map((s, i) =>
    \`<li><span>\${s.date} \${s.bean} — \${s.doseG}g → \${s.yieldG}g in \${s.timeS}s\${s.flag ? ' [' + s.flag + ']' : ''}</span><a data-i="\${i}">remove</a></li>\`).join('');
  document.querySelectorAll('#batch a').forEach((a) => {
    a.onclick = () => { batch.splice(+a.dataset.i, 1); renderBatch(); };
  });
  $('go').disabled = batch.length === 0;
  $('go').textContent = \`Ship \${batch.length || ''} shot\${batch.length === 1 ? '' : 's'} → PR → merge\`.replace('  ', ' ');
}

$('f').onsubmit = (ev) => {
  ev.preventDefault();
  const b = state.bags[+$('bag').value];
  if (!b) return;
  batch.push({
    date: $('date').value,
    bean: b.bean, roaster: b.roaster || undefined, roastDate: b.roastDate,
    doseG: +$('doseG').value, yieldG: +$('yieldG').value, timeS: +$('timeS').value,
    grind: $('grind').value || undefined, basket: $('basket').value || undefined,
    temp: $('temp').value || undefined, puckScreen: $('puckScreen').checked,
    method: 'espresso',
    notes: $('notes').value || undefined,
    flag: $('flag').value || undefined,
  });
  // Keep dose/grind/basket/temp for the next pull; clear the per-shot fields.
  $('yieldG').value = ''; $('timeS').value = ''; $('notes').value = ''; $('flag').value = '';
  renderBatch();
};

$('go').onclick = async () => {
  const r = await (await fetch('/api/log', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ shots: batch }),
  })).json();
  if (r.errors) { alert(r.errors.join('\\n')); return; }
  batch.length = 0;
  renderBatch();
  $('go').disabled = true;
  poll(r.jobId);
};

async function poll(id) {
  const el = $('log');
  el.style.display = 'block';
  const t = setInterval(async () => {
    const j = await (await fetch('/api/job/' + id)).json();
    el.innerHTML = j.log.join('\\n') +
      (j.prUrl ? \`\\n<a href="\${j.prUrl}" target="_blank">\${j.prUrl}</a>\` : '') +
      \`\\n<span class="status-\${j.status}">status: \${j.status}</span>\`;
    if (j.status !== 'running') { clearInterval(t); $('go').disabled = batch.length === 0; }
  }, 3000);
}

init();
</script>
</body>
</html>`;

// Only start listening when run directly (not when imported by tests).
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  server.listen(PORT, HOST, () => {
    console.log(`Shot logger: http://${HOST}:${PORT} (repo: ${REPO_ROOT})`);
  });
}
