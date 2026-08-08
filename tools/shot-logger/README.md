# Shot logger

Local web app that logs espresso shots to `src/data/coffee.ts` and ships them
without a chat session: feature branch → push → PR → wait for CI checks →
squash-merge. Shots queue into a batch and ship together as one commit/PR;
basket and temp fields offer prior values from the log history. Shot PRs
skip Lighthouse (workflow paths-ignore); the Cloudflare Pages build is the
merge gate.

```
node tools/shot-logger/server.mjs
# open http://127.0.0.1:4737
```

Requires Node ≥ 22.6 and an authenticated `gh`. Binds to localhost only.

## Deliberate choices

- **Throwaway worktree per shot.** Every submission branches from
  `origin/main` in a `/tmp` worktree, so the main checkout is never touched
  and two quick back-to-back shots can't collide (branch names get a `-2`
  suffix if today's is taken).
- **`coffee.ts` stays the source of truth.** The app inserts a formatted
  object literal before the closing `];` of `brews`, then re-imports the
  file as a syntax gate before committing. No schema migration, no JSON
  sidecar.
- **Merge gate = all reported checks green.** Shot PRs skip Lighthouse via
  the workflow's paths-ignore (scoring a page that gained one data point
  wastes ~8 runner-minutes), so the gate is the Cloudflare Pages build,
  which still fails on a broken site. A failed or timed-out check leaves
  the PR open for manual review instead of merging.
- **Retroactive edits, no deletes.** The last 10 shots can be corrected from
  the UI. Corrections queue in the same batch as new shots and everything
  ships as one commit/PR on the single ship button — nothing pushes until
  then. Each correction is verified by re-importing the file and comparing
  the entry. Deleting shots is deliberately unsupported — bad shots get a
  `flag` and stay visible, per the chart's design. Entries containing
  comments refuse app edits so comments are never destroyed.
- **State reads from origin/main, not the checkout.** The app merges its own
  PRs, so the local checkout lags; bag defaults and edit indices must track
  what is actually deployed.
- **Bags are read-only.** Opening, closing, and adding bags needs judgment
  (chart colors sampled from packaging, badge metadata), so that stays a
  chat task.
