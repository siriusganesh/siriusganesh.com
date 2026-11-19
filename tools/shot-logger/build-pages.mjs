// Builds the GitHub Pages copy of the shot logger into the given directory
// (default _site): the same UI the local server renders, in 'pages' mode,
// plus a state.json snapshot of origin/main and the GitHub API backend.
//
//   node tools/shot-logger/build-pages.mjs _site
import { mkdir, writeFile, copyFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getState, renderPage } from './server.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const out = path.resolve(process.argv[2] || '_site');
await mkdir(out, { recursive: true });

const state = await getState();
delete state.today; // the page uses the phone's date, not the build date

await writeFile(path.join(out, 'index.html'), renderPage('pages'));
await writeFile(path.join(out, 'state.json'), JSON.stringify(state));
await copyFile(path.join(here, 'pages-api.js'), path.join(out, 'pages-api.js'));
await writeFile(path.join(out, '.nojekyll'), '');
console.log(`Built shot logger page in ${out} (${state.recent.length} recent shots, ${state.bags.length} open bags)`);
