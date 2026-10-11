#!/usr/bin/env node
// Runs before `vawe ship`: refuses a final render without the owner's approval of the current page. VAWE_UNATTENDED=1 skips it.
//   node harness/live/ship-approval.mjs <page.html>
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { shipProblem } from '../lib/approval.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const [page] = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const problem = page ? shipProblem(page, { root: ROOT }) : null;
if (problem) {
  console.error(`vawe: ship refused: ${problem}`);
  process.exit(1);
}
if (process.env.VAWE_UNATTENDED === '1') console.log('vawe: ship runs unattended (VAWE_UNATTENDED=1): no owner approval checked');
