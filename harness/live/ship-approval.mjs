#!/usr/bin/env node
// Runs before `vawe ship`: refuses a final render without a critique of the current page by another session and without the owner's
// approval of it. Each refusal line ends with the command to run. VAWE_UNATTENDED=1 skips both and says so.
//   node harness/live/ship-approval.mjs <page.html>
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { shipProblem } from '../lib/approval.mjs';
import { critiqueProblem } from '../lib/critique-gate.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const [page] = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const problems = page ? [critiqueProblem(page, { root: ROOT }), shipProblem(page, { root: ROOT })].filter(Boolean) : [];
if (problems.length) {
  for (const problem of problems) console.error(`vawe: ship refused: ${problem}`);
  process.exit(1);
}
if (process.env.VAWE_UNATTENDED === '1') console.log('vawe: ship runs unattended (VAWE_UNATTENDED=1): no fresh critique and no owner approval checked');
