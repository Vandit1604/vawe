#!/usr/bin/env node
// `vawe approve <page>`: records the owner's approval of the full draft so `vawe ship` may render the final.
//   node harness/live/approve.mjs <page.html>
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { approveProblem, writeApproval } from '../lib/approval.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const [page] = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const problem = approveProblem(page, { root: ROOT });
if (problem) {
  console.error(`vawe: approve refused: ${problem}`);
  process.exit(1);
}
const record = writeApproval(page, { root: ROOT });
console.log(`approved ${record.draft} (${record.draftBytes} bytes) as ${record.by}`);
