// Shot logger backend for the GitHub Pages build (see build-pages.mjs).
//
// Same API object as the local server's inline backend, but:
// - state comes from state.json, a snapshot of origin/main written by the
//   deploy job after every change to coffee.ts;
// - ship dispatches the "Shot logger" workflow, which runs the same
//   runPipeline as the local server (branch, PR, wait for checks, merge);
// - job polls that workflow run through the Actions API.
//
// Auth: a fine-grained PAT (this repo only, Actions read/write) kept in this
// browser's localStorage. It never leaves the device except to api.github.com.
(function () {
  const REPO = 'siriusganesh/siriusganesh.com';
  const WORKFLOW = 'shot-logger.yml';
  const K_TOKEN = 'shotLogger.token';
  const K_SAVED = 'shotLogger.saved';

  // localStorage can throw (private mode, blocked storage); treat as empty.
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch { return null; } },
    set(k, v) {
      try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch {}
    },
  };

  async function gh(path, opts = {}) {
    const token = store.get(K_TOKEN);
    if (!token) throw new Error('No GitHub token saved. Add one under "GitHub token" at the bottom.');
    const r = await fetch('https://api.github.com/repos/' + REPO + path, {
      ...opts,
      cache: 'no-store',
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: 'Bearer ' + token,
        ...(opts.body ? { 'Content-Type': 'application/json' } : {}),
      },
    });
    if (r.status === 204) return null;
    if (!r.ok) throw new Error('GitHub API ' + r.status + ': ' + (await r.text()).slice(0, 200));
    return r.json();
  }

  async function findRun(id) {
    const runs = await gh('/actions/workflows/' + WORKFLOW +
      '/runs?event=workflow_dispatch&per_page=20');
    return runs.workflow_runs.find((r) => r.display_title === 'shot-log ' + id) || null;
  }

  function stepLine(s) {
    const mark = s.status !== 'completed' ? (s.status === 'in_progress' ? '..' : '  ')
      : s.conclusion === 'success' ? 'ok' : s.conclusion === 'skipped' ? '--' : '!!';
    return '[' + mark + '] ' + s.name;
  }

  window.API = {
    pollMs: 6000,

    async state() {
      const s = await (await fetch('state.json?t=' + Date.now(), { cache: 'no-store' })).json();
      s.today = new Date().toLocaleDateString('en-CA'); // phone's local date, not build time
      return s;
    },

    async ship(payload) {
      const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
      try {
        await gh('/actions/workflows/' + WORKFLOW + '/dispatches', {
          method: 'POST',
          body: JSON.stringify({
            ref: 'main',
            inputs: { batch: JSON.stringify(payload), request_id: id },
          }),
        });
      } catch (err) {
        return { errors: [err.message] };
      }
      return { jobId: id };
    },

    // Maps the workflow run onto the local job shape { log, status, prUrl }.
    // status: running | merged | error (nothing shipped: batch is restored)
    //         | checks-failed (PR may be open: batch is not restored).
    async job(id) {
      let run;
      try {
        run = await findRun(id);
      } catch (err) {
        return { status: 'running', log: ['Retrying: ' + err.message] };
      }
      if (!run) return { status: 'running', log: ['Waiting for the workflow run to start...'] };

      const { jobs } = await gh('/actions/runs/' + run.id + '/jobs');
      const log = [];
      for (const j of jobs) {
        log.push(j.name + ': ' + (j.conclusion || j.status));
        for (const s of j.steps || []) log.push('  ' + stepLine(s));
      }
      const out = { log, runUrl: run.html_url, prUrl: null };
      if (run.status !== 'completed') return { ...out, status: 'running' };
      if (run.conclusion === 'success') {
        log.push('Merged. The page state refreshes on the next load.');
        return { ...out, status: 'merged' };
      }
      // Ship job outcome decides whether the batch can be safely re-queued.
      const ship = jobs.find((j) => j.name === 'ship');
      const step = ship?.steps?.find((s) => s.name === 'Ship batch');
      if (ship?.conclusion === 'success') {
        log.push('Merged, but the page deploy failed. Open the run for details.');
        return { ...out, status: 'merged' };
      }
      // Ship step failed or never ran: nothing merged, so re-queue the batch.
      // Succeeded (merge gate failed) or cancelled midway: a PR may be open.
      if (!step || !['success', 'cancelled'].includes(step.conclusion))
        return { ...out, status: 'error' };
      log.push('Not merged. A PR may be open; open the run summary for the link.');
      return { ...out, status: 'checks-failed' };
    },

    save(s) {
      const empty = !s.batch.length && !s.jobId;
      store.set(K_SAVED, empty ? null : JSON.stringify(s));
    },

    load() {
      try { return JSON.parse(store.get(K_SAVED) || 'null'); } catch { return null; }
    },
  };

  // Token setup block at the bottom of the page.
  document.addEventListener('DOMContentLoaded', () => {
    const box = document.createElement('details');
    box.style.marginTop = '2.2rem';
    box.innerHTML =
      '<summary class="h2" style="margin-top:0">GitHub token</summary>' +
      '<p style="font-size:.8rem;color:#616160">Fine-grained token, repository ' + REPO +
      ' only, permission Actions: read and write. Stored in this browser only.</p>' +
      '<input id="ghToken" type="password" autocomplete="off" placeholder="github_pat_...">' +
      '<div class="row" style="grid-template-columns:1fr 1fr">' +
      '<button id="ghSave" type="button" class="secondary">Save token</button>' +
      '<button id="ghClear" type="button" class="secondary">Remove token</button></div>' +
      '<p id="ghStatus" style="font-size:.8rem;color:#616160"></p>';
    (document.querySelector('main') || document.body).appendChild(box);
    const status = () => {
      const has = !!store.get(K_TOKEN);
      document.getElementById('ghStatus').textContent = has ? 'Token saved.' : 'No token saved.';
      box.open = !has;
    };
    document.getElementById('ghSave').onclick = () => {
      const v = document.getElementById('ghToken').value.trim();
      if (v) store.set(K_TOKEN, v);
      document.getElementById('ghToken').value = '';
      status();
    };
    document.getElementById('ghClear').onclick = () => { store.set(K_TOKEN, null); status(); };
    status();
  });
})();
