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
import { readFile, writeFile, unlink } from 'node:fs/promises';
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
  // Read from origin/main rather than the checkout: after the app merges its
  // own PRs the checkout is behind, and edit indices must match what is
  // actually on main. Falls back to the checkout if offline.
  try {
    await git(['fetch', 'origin', 'main']);
    const src = await git(['show', 'origin/main:src/data/coffee.ts']);
    const tmp = path.join('/tmp', `shot-logger-state-${Date.now()}.ts`);
    await writeFile(tmp, src, 'utf8');
    const mod = await import(pathToFileURL(tmp).href);
    unlink(tmp).catch(() => {});
    return mod;
  } catch {
    const url = pathToFileURL(COFFEE_TS).href + '?t=' + Date.now();
    return import(url);
  }
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
  // Last 10 shots with their absolute index in brews, for retroactive edits.
  const first = Math.max(0, brews.length - 10);
  const recent = brews.slice(first).map((entry, k) => ({ index: first + k, entry }));
  const bagRef = (b) => ({ bean: b.bean, roaster: b.roaster ?? null, roastDate: b.roastDate });
  return {
    today: localToday(),
    bags: openBags,
    comingSoon: bags.filter((b) => !b.openedDate && !b.closedDate).map(bagRef),
    allBags: bags.map(bagRef),
    grinds,
    baskets: distinct('basket'),
    // MaraX V2 has three fixed temp levels; not derived from history so
    // unused levels (Low) are still selectable.
    temps: ['Low', 'Mid', 'High'],
    recent,
  };
}

// ---------------------------------------------------------------------------
// Entry formatting + insertion

export function tsString(s) {
  return `'${String(s)
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/\r\n|\r|\n/g, '\\n')}'`; // multi-line notes must not break the literal
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

export function insertEntry(source, entryText, anchor = 'export const brews') {
  const start = source.indexOf(anchor);
  if (start === -1) throw new Error(`${anchor} not found in coffee.ts`);
  const close = source.indexOf('\n];', start);
  if (close === -1) throw new Error(`closing ]; after ${anchor} not found`);
  return source.slice(0, close + 1) + entryText + '\n' + source.slice(close + 1);
}

/** Format a Bag object literal. Field order mirrors the Bag type declaration. */
export function formatBag(b) {
  const lines = ['  {'];
  const push = (k, v) => lines.push(`    ${k}: ${v},`);
  const arr = (xs) => `[${xs.map(tsString).join(', ')}]`;
  push('bean', tsString(b.bean));
  if (b.roaster) push('roaster', tsString(b.roaster));
  push('roastDate', tsString(b.roastDate));
  if (b.openedDate) push('openedDate', tsString(b.openedDate));
  if (b.closedDate) push('closedDate', tsString(b.closedDate));
  if (b.specialRelease) push('specialRelease', 'true');
  if (b.type) push('type', tsString(b.type));
  if (b.process) push('process', tsString(b.process));
  if (b.roastLevel) push('roastLevel', tsString(b.roastLevel));
  if (b.origin) push('origin', tsString(b.origin));
  if (b.tastingNotes?.length) push('tastingNotes', arr(b.tastingNotes));
  if (b.producer) push('producer', tsString(b.producer));
  if (b.elevation) push('elevation', tsString(b.elevation));
  if (b.varieties?.length) push('varieties', arr(b.varieties));
  if (b.harvest) push('harvest', tsString(b.harvest));
  if (b.certifications?.length) push('certifications', arr(b.certifications));
  if (b.chartColor) push('chartColor', tsString(b.chartColor));
  lines.push('  },');
  return lines.join('\n');
}

/**
 * Locate every entry object literal inside the brews array as [start, end)
 * offsets into source. Relies on the machine-written format: entries open
 * with a line that is exactly "  {" and close with "  },".
 */
export function findEntryBlocks(source, anchor = 'export const brews') {
  const start = source.indexOf(anchor);
  if (start === -1) throw new Error(`${anchor} not found in coffee.ts`);
  const close = source.indexOf('\n];', start);
  if (close === -1) throw new Error(`closing ]; after ${anchor} not found`);
  const region = source.slice(start, close);
  const re = /^  \{\n[\s\S]*?^  \},$/gm;
  const blocks = [];
  let m;
  while ((m = re.exec(region)))
    blocks.push({ start: start + m.index, end: start + m.index + m[0].length });
  return blocks;
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

async function pickBranchName(base = `coffee-log-${localToday()}`) {
  for (let i = 0; i < 10; i++) {
    const name = i === 0 ? base : `${base}-${i + 1}`;
    const remote = await git(['ls-remote', 'origin', `refs/heads/${name}`]);
    const local = await git(['branch', '--list', name]);
    if (!remote && !local) return name;
  }
  throw new Error('could not find a free branch name');
}

function commitMessage(shots, edits = [], bagOps = []) {
  const parts = [];
  if (shots.length) {
    const [, m, d] = shots[0].date.split('-').map(Number);
    const beans = [...new Set(shots.map((s) => s.bean))];
    const what = beans.length === 1 ? `${beans[0]} shot${shots.length > 1 ? 's' : ''}` : 'shots';
    parts.push(`log ${m}/${d} ${what}`);
  }
  if (edits.length === 1) {
    const e = edits[0].entry;
    const [, m, d] = e.date.split('-').map(Number);
    parts.push(`correct ${m}/${d} ${e.bean} shot`);
  } else if (edits.length > 1) {
    parts.push(`correct ${edits.length} shots`);
  }
  for (const op of bagOps) {
    if (op.op === 'rebuy') {
      const [, m, d] = op.date.split('-').map(Number);
      parts.push(`add ${op.bean} bag (${m}/${d} roast)`);
    } else {
      parts.push(`${op.op} ${op.bean} bag`);
    }
  }
  return `coffee: ${parts.join('; ')}`;
}

async function runPipeline(job, shots, edits = [], bagOps = []) {
  const worktree = path.join('/tmp', 'shot-logger', `wt-${Date.now()}`);
  let branch = null;
  try {
    jlog(job, 'Fetching origin/main…');
    await git(['fetch', 'origin', 'main']);

    branch = await pickBranchName(
      shots.length ? undefined
        : edits.length ? `coffee-correct-${localToday()}`
        : `coffee-bags-${localToday()}`,
    );
    jlog(job, `Creating worktree on ${branch}…`);
    await git(['worktree', 'add', '-b', branch, worktree, 'origin/main']);

    const wtCoffee = path.join(worktree, 'src', 'data', 'coffee.ts');
    let source = await readFile(wtCoffee, 'utf8');
    const mod = await import(pathToFileURL(wtCoffee).href + '?t=' + Date.now());

    // Bag lifecycle first: open/close are pure line insertions inside the
    // matching bag block; a re-add copies the parsed bag with a new roast
    // date and no lifecycle dates (enters as coming soon).
    for (const op of bagOps) {
      if (op.op === 'rebuy') {
        const src = mod.bags.find((b) => b.bean === op.bean && b.roastDate === op.roastDate);
        if (!src) throw new Error(`bag not found: ${op.bean} · ${op.roastDate}`);
        if (mod.bags.some((b) => b.bean === op.bean && b.roastDate === op.date))
          throw new Error(`a ${op.bean} bag with roast date ${op.date} already exists`);
        const copy = { ...src, roastDate: op.date };
        delete copy.openedDate;
        delete copy.closedDate;
        source = insertEntry(source, formatBag(copy), 'export const bags');
        continue;
      }
      const blocks = findEntryBlocks(source, 'export const bags');
      const matches = blocks.filter((bl) => {
        const t = source.slice(bl.start, bl.end);
        return t.includes(`bean: ${tsString(op.bean)},`) &&
               t.includes(`roastDate: ${tsString(op.roastDate)},`);
      });
      if (matches.length !== 1)
        throw new Error(`expected exactly one bag block for ${op.bean} · ${op.roastDate}`);
      const bl = matches[0];
      const text = source.slice(bl.start, bl.end);
      if (op.op === 'open') {
        if (text.includes('openedDate') || text.includes('closedDate'))
          throw new Error(`${op.bean} · ${op.roastDate} is not a coming-soon bag`);
        const anchor = `roastDate: ${tsString(op.roastDate)},`;
        const at = bl.start + text.indexOf(anchor) + anchor.length;
        source = source.slice(0, at) + `\n    openedDate: ${tsString(op.date)},` + source.slice(at);
      } else if (op.op === 'close') {
        const opened = text.match(/openedDate: '[^']*',/);
        if (!opened || text.includes('closedDate'))
          throw new Error(`${op.bean} · ${op.roastDate} is not an open bag`);
        const at = bl.start + text.indexOf(opened[0]) + opened[0].length;
        source = source.slice(0, at) + `\n    closedDate: ${tsString(op.date)},` + source.slice(at);
      } else {
        throw new Error(`unknown bag op: ${op.op}`);
      }
    }

    // Apply corrections first (in-place block replacement, count unchanged).
    for (const ed of edits) {
      if (!Number.isInteger(ed.index) || ed.index < 0 || ed.index >= mod.brews.length)
        throw new Error('entry index out of range');
      const orig = mod.brews[ed.index];
      if (
        orig.date !== ed.expect.date || orig.doseG !== ed.expect.doseG ||
        orig.yieldG !== ed.expect.yieldG || orig.timeS !== ed.expect.timeS
      )
        throw new Error('entry changed on main since page load — reload and retry');

      const merged = { ...orig };
      for (const [k, v] of Object.entries(ed.entry)) {
        if (v === null) delete merged[k];
        else if (v !== undefined) merged[k] = v;
      }

      const blocks = findEntryBlocks(source);
      if (blocks.length !== mod.brews.length)
        throw new Error('entry block count mismatch — edit via chat instead');
      const b = blocks[ed.index];
      if (source.slice(b.start, b.end).includes('//'))
        throw new Error('entry contains comments — edit via chat so they are preserved');
      source = source.slice(0, b.start) + formatEntry(merged) + source.slice(b.end);
      ed.merged = merged;
    }

    if (shots.length) source = insertEntry(source, shots.map(formatEntry).join('\n'));
    await writeFile(wtCoffee, source, 'utf8');

    // The edited file must import cleanly, have the right counts, and show
    // every correction and bag change.
    const check = await import(pathToFileURL(wtCoffee).href + '?t=' + Date.now());
    if (check.brews.length !== mod.brews.length + shots.length)
      throw new Error('entry count mismatch after write');
    const rebuys = bagOps.filter((o) => o.op === 'rebuy').length;
    if (check.bags.length !== mod.bags.length + rebuys)
      throw new Error('bag count mismatch after write');
    for (const ed of edits) {
      const now = check.brews[ed.index];
      if (now.yieldG !== ed.merged.yieldG || now.timeS !== ed.merged.timeS || now.doseG !== ed.merged.doseG)
        throw new Error('verification failed — corrected entry does not match');
    }
    for (const op of bagOps) {
      const rd = op.op === 'rebuy' ? op.date : op.roastDate;
      const bag = check.bags.find((b) => b.bean === op.bean && b.roastDate === rd);
      if (!bag) throw new Error(`bag verification failed: ${op.bean} · ${rd}`);
      if (op.op === 'open' && bag.openedDate !== op.date)
        throw new Error('bag open verification failed');
      if (op.op === 'close' && bag.closedDate !== op.date)
        throw new Error('bag close verification failed');
      if (op.op === 'rebuy' && (bag.openedDate || bag.closedDate))
        throw new Error('re-added bag should have no lifecycle dates');
    }
    jlog(job, `${shots.length} added, ${edits.length} corrected, ${bagOps.length} bag change${bagOps.length === 1 ? '' : 's'}; coffee.ts verified.`);

    await openPrAndMerge(job, worktree, branch, commitMessage(shots, edits, bagOps));
    branch = null;
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

// Shared tail of every pipeline: commit the coffee.ts change in the worktree,
// open a PR, clean up, wait for checks, squash-merge on green.
async function openPrAndMerge(job, worktree, branch, msg) {
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
      const shots = Array.isArray(body.shots) ? body.shots : [];
      const edits = Array.isArray(body.edits) ? body.edits : [];
      const bagOps = Array.isArray(body.bagOps) ? body.bagOps : [];
      if (!shots.length && !edits.length && !bagOps.length)
        return send(res, 400, { errors: ['nothing submitted'] });
      const dateRe = /^\d{4}-\d{2}-\d{2}$/;
      const errs = [
        ...shots.flatMap((s, i) => validate(s).map((e) => `shot ${i + 1}: ${e}`)),
        ...edits.flatMap((ed, i) => {
          const out = validate(ed.entry ?? {}).map((e) => `correction ${i + 1}: ${e}`);
          if (!Number.isInteger(ed.index) || ed.index < 0 || !ed.expect)
            out.push(`correction ${i + 1}: bad index/expect`);
          return out;
        }),
        ...bagOps.flatMap((op, i) => {
          const out = [];
          if (!['open', 'close', 'rebuy'].includes(op.op)) out.push(`bag change ${i + 1}: bad op`);
          if (!op.bean) out.push(`bag change ${i + 1}: bean required`);
          if (!dateRe.test(op.roastDate || '')) out.push(`bag change ${i + 1}: bad roastDate`);
          if (!dateRe.test(op.date || '')) out.push(`bag change ${i + 1}: bad date`);
          return out;
        }),
      ];
      if (errs.length) return send(res, 400, { errors: errs });
      const { id, job } = newJob();
      for (const s of shots)
        jlog(job, `Logging ${s.date} ${s.bean}: ${s.doseG}g → ${s.yieldG}g in ${s.timeS}s`);
      for (const ed of edits)
        jlog(job, `Correcting ${ed.entry.date} ${ed.entry.bean}: ${ed.entry.doseG}g → ${ed.entry.yieldG}g in ${ed.entry.timeS}s`);
      for (const op of bagOps)
        jlog(job, `Bag ${op.op === 'rebuy' ? 'add' : op.op}: ${op.bean} (${op.date})`);
      runPipeline(job, shots, edits, bagOps); // fire and forget; UI polls
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
  /* Palette and type from src/styles/global.css (the /coffee page theme). */
  :root { color-scheme: light; }
  body { font: 15px/1.6 Verdana, Geneva, "DejaVu Sans", sans-serif; background: #ffffff;
         color: #111113; max-width: 34rem; margin: 2rem auto; padding: 0 1rem; }
  h1 { font-size: 1.15rem; color: #303130; }
  h1 .accent { color: #990000; }
  h2 { font-size: .9rem; color: #303130; margin-top: 2.2rem; }
  label { display: block; margin-top: .8rem; font-size: .7rem; color: #717270;
          text-transform: uppercase; letter-spacing: .06em; }
  input, select, textarea { width: 100%; box-sizing: border-box; margin-top: .25rem;
          padding: .45rem .6rem; background: #f7f7f4; color: #111113;
          border: 1px solid #e4e4df; border-radius: 4px;
          font: 14px/1.5 "IBM Plex Mono", ui-monospace, Menlo, Consolas, monospace; }
  input:focus, select:focus, textarea:focus { outline: 2px solid #dbe3f5; border-color: #91928f; }
  .row { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: .8rem; }
  .check { display: flex; align-items: center; gap: .5rem; margin-top: 1rem; }
  .check input { width: auto; margin: 0; }
  .check label { margin: 0; text-transform: none; letter-spacing: 0; font-size: .9rem; color: #111113; }
  button { margin-top: 1.2rem; width: 100%; padding: .6rem; font: inherit; font-weight: 700;
          background: #011f5b; color: #fff; border: 0; border-radius: 4px; cursor: pointer; }
  button:hover:not(:disabled) { background: #001541; }
  button:disabled { opacity: .45; cursor: default; }
  button.secondary { background: #dbe3f5; color: #011f5b; }
  button.secondary:hover:not(:disabled) { background: #c9d5ef; }
  #editing { margin-top: 1rem; padding: .5rem .7rem; background: #fbe5e5; border: 1px solid #990000;
             border-radius: 4px; font-size: .85rem; }
  #editing a { color: #990000; cursor: pointer; text-decoration: underline; }
  #batch, #recent { list-style: none; padding: 0; margin: 1rem 0 0; }
  #batch li, #recent li { display: flex; justify-content: space-between; gap: .6rem; padding: .35rem .6rem;
              background: #f7f7f4; border: 1px solid #e4e4df; border-radius: 4px; margin-top: .4rem;
              font: 12.5px/1.5 "IBM Plex Mono", ui-monospace, monospace; }
  #batch a { color: #990000; text-decoration: none; cursor: pointer; }
  #recent a { color: #011f5b; text-decoration: none; cursor: pointer; }
  #log { margin-top: 1.2rem; padding: .8rem; background: #f7f7f4; border: 1px solid #e4e4df;
         border-radius: 4px; color: #616160;
         font: 12px/1.6 "IBM Plex Mono", ui-monospace, monospace; white-space: pre-wrap; display: none; }
  #log a { color: #011f5b; }
  .status-merged { color: #011f5b; font-weight: 700; }
  .status-error, .status-checks-failed { color: #990000; font-weight: 700; }
</style>
</head>
<body>
<h1>Shot logger<span class="accent">.</span></h1>
<div id="editing" hidden>Editing <span id="editWhat"></span> — <a id="cancelEdit">cancel</a></div>
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
<h2>Bags</h2>
<div class="row">
  <div><label>Action</label><select id="bagOpSel">
    <option value="open">open</option>
    <option value="close">close</option>
    <option value="rebuy">re-add (new roast)</option>
  </select></div>
  <div><label>Bag</label><select id="bagTarget"></select></div>
  <div><label id="bagDateLabel">Date</label><input id="bagDate" type="date"></div>
</div>
<button id="addBag" type="button" class="secondary">Add bag change to batch</button>
<ul id="batch"></ul>
<button id="go" disabled>Ship batch → PR → merge</button>
<h2>Recent shots</h2>
<ul id="recent"></ul>
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
  $('bagDate').value = state.today;
  fillBagTargets();
  renderRecent();
  if (!editing) fill();
}

function bagList() {
  const op = $('bagOpSel').value;
  return op === 'open' ? state.comingSoon : op === 'close' ? state.bags : state.allBags;
}

function fillBagTargets() {
  $('bagTarget').innerHTML = bagList().map((b, i) =>
    \`<option value="\${i}">\${b.bean} · \${b.roastDate}\${b.roaster ? ' — ' + b.roaster : ''}</option>\`).join('');
  $('bagDateLabel').textContent = $('bagOpSel').value === 'rebuy' ? 'New roast date' : 'Date';
}

function shotLine(e) {
  return \`\${e.date} \${e.bean} — \${e.doseG}g → \${e.yieldG}g in \${e.timeS}s\${e.flag ? ' [' + e.flag + ']' : ''}\`;
}

function renderRecent() {
  $('recent').innerHTML = [...state.recent].reverse().map((r) =>
    \`<li><span>\${shotLine(r.entry)}</span><a data-i="\${r.index}">edit</a></li>\`).join('');
  document.querySelectorAll('#recent a').forEach((a) => {
    a.onclick = () => startEdit(+a.dataset.i);
  });
}

let editing = null; // { index, entry } while correcting a past shot

function startEdit(index) {
  const r = state.recent.find((x) => x.index === index);
  if (!r) return;
  editing = r;
  const e = r.entry;
  $('date').value = e.date;
  $('doseG').value = e.doseG; $('yieldG').value = e.yieldG; $('timeS').value = e.timeS;
  $('grind').value = e.grind || ''; $('basket').value = e.basket || ''; $('temp').value = e.temp || '';
  $('puckScreen').checked = !!e.puckScreen;
  $('notes').value = e.notes || ''; $('flag').value = e.flag || '';
  $('editWhat').textContent = shotLine(e);
  $('editing').hidden = false;
  $('bag').disabled = true; // bean identity stays with the original entry
  $('add').textContent = 'Add correction to batch';
}

function endEdit() {
  editing = null;
  $('editing').hidden = true;
  $('bag').disabled = false;
  $('add').textContent = 'Add shot to batch';
  $('notes').value = ''; $('flag').value = '';
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

function batchLine(it) {
  if (it.kind === 'bag') {
    const verb = it.op === 'rebuy' ? 'add' : it.op;
    const when = it.op === 'rebuy' ? \`new roast \${it.date}\` : it.date;
    return \`\${verb} bag: \${it.bean} · \${when}\`;
  }
  return \`\${it.kind === 'edit' ? 'fix: ' : ''}\${shotLine(it.entry)}\`;
}

function renderBatch() {
  $('batch').innerHTML = batch.map((it, i) =>
    \`<li><span>\${batchLine(it)}</span><a data-i="\${i}">remove</a></li>\`).join('');
  document.querySelectorAll('#batch a').forEach((a) => {
    a.onclick = () => { batch.splice(+a.dataset.i, 1); renderBatch(); };
  });
  $('go').disabled = batch.length === 0;
  const noun = batch.every((it) => it.kind === 'log') ? 'shot' : 'change';
  $('go').textContent = \`Ship \${batch.length || ''} \${noun}\${batch.length === 1 ? '' : 's'} → PR → merge\`.replace('  ', ' ');
}

$('f').onsubmit = (ev) => {
  ev.preventDefault();
  if (editing) {
    const e = editing.entry;
    const entry = {
      date: $('date').value,
      bean: e.bean, roaster: e.roaster ?? null, roastDate: e.roastDate,
      doseG: +$('doseG').value, yieldG: +$('yieldG').value, timeS: +$('timeS').value,
      grind: $('grind').value || null, basket: $('basket').value || null,
      temp: $('temp').value || null, puckScreen: $('puckScreen').checked,
      notes: $('notes').value || null, flag: $('flag').value || null,
    };
    const expect = { date: e.date, doseG: e.doseG, yieldG: e.yieldG, timeS: e.timeS };
    batch.push({ kind: 'edit', index: editing.index, entry, expect });
    endEdit();
    renderBatch();
    return;
  }
  const b = state.bags[+$('bag').value];
  if (!b) return;
  batch.push({ kind: 'log', entry: {
    date: $('date').value,
    bean: b.bean, roaster: b.roaster || undefined, roastDate: b.roastDate,
    doseG: +$('doseG').value, yieldG: +$('yieldG').value, timeS: +$('timeS').value,
    grind: $('grind').value || undefined, basket: $('basket').value || undefined,
    temp: $('temp').value || undefined, puckScreen: $('puckScreen').checked,
    method: 'espresso',
    notes: $('notes').value || undefined,
    flag: $('flag').value || undefined,
  } });
  // Keep dose/grind/basket/temp for the next pull; clear the per-shot fields.
  $('yieldG').value = ''; $('timeS').value = ''; $('notes').value = ''; $('flag').value = '';
  renderBatch();
};

let lastShipped = null; // restored into the batch if the job errors

$('bagOpSel').onchange = fillBagTargets;

$('addBag').onclick = () => {
  const b = bagList()[+$('bagTarget').value];
  if (!b || !$('bagDate').value) return;
  batch.push({
    kind: 'bag', op: $('bagOpSel').value,
    bean: b.bean, roastDate: b.roastDate, date: $('bagDate').value,
  });
  renderBatch();
};

$('go').onclick = async () => {
  const payload = {
    shots: batch.filter((it) => it.kind === 'log').map((it) => it.entry),
    edits: batch.filter((it) => it.kind === 'edit')
      .map(({ index, entry, expect }) => ({ index, entry, expect })),
    bagOps: batch.filter((it) => it.kind === 'bag')
      .map(({ op, bean, roastDate, date }) => ({ op, bean, roastDate, date })),
  };
  const r = await (await fetch('/api/log', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })).json();
  if (r.errors) { alert(r.errors.join('\\n')); return; }
  lastShipped = batch.slice();
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
    if (j.status !== 'running') {
      clearInterval(t);
      if (j.status === 'error' && lastShipped) {
        // Nothing was committed; put the shots back so they aren't lost.
        batch.push(...lastShipped);
      }
      lastShipped = null;
      renderBatch();
      $('go').disabled = batch.length === 0;
      init(); // refresh state so recent shots reflect the merge
    }
  }, 3000);
}

$('cancelEdit').onclick = endEdit;
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
