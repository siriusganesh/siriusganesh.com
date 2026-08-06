# Shot logger

Local web app that logs espresso shots to `src/data/coffee.ts` and ships them
without a chat session: feature branch → push → PR → wait for Lighthouse
checks → squash-merge.

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
- **Merge gate = both Lighthouse checks green.** LHCI assertions are
  warn-only, so this gates on the build and both runs completing, not on
  score floors. A failed or timed-out check leaves the PR open for manual
  review instead of merging.
- **Bags are read-only.** Opening, closing, and adding bags needs judgment
  (chart colors sampled from packaging, badge metadata), so that stays a
  chat task.
