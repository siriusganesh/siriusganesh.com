// CI entry point for the GitHub Pages shot logger.
//
// The "Shot logger" workflow runs this with the batch JSON from the page in
// $BATCH. It validates and ships the batch with the same runPipeline the local
// server uses (worktree from origin/main, branch, PR, wait for checks,
// squash-merge on green), then reports through the workflow:
//   - exit 1: batch rejected or failed before merging (status "error");
//   - exit 0 with output status=merged | checks-failed | timeout; the
//     workflow's "Merge gate" step fails the run for anything but merged.
import { appendFile } from 'node:fs/promises';
import { validateBatch, newJob, runPipeline } from './server.mjs';

async function report(lines, status) {
  const { GITHUB_STEP_SUMMARY: summary, GITHUB_OUTPUT: output } = process.env;
  if (summary) await appendFile(summary, '```\n' + lines.join('\n') + '\n```\n');
  if (output) await appendFile(output, `status=${status}\n`);
}

let body;
try {
  body = JSON.parse(process.env.BATCH || '');
} catch {
  console.error('BATCH is not valid JSON');
  await report(['BATCH is not valid JSON'], 'error');
  process.exit(1);
}

const { shots, edits, bagOps, errs } = validateBatch(body);
if (errs.length) {
  console.error(errs.join('\n'));
  await report(errs, 'error');
  process.exit(1);
}

const { job } = newJob();
await runPipeline(job, shots, edits, bagOps);
await report([...job.log, ...(job.prUrl ? [job.prUrl] : []), `status: ${job.status}`], job.status);
process.exit(job.status === 'error' ? 1 : 0);
