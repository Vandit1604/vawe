#!/usr/bin/env node
// `vawe approve <page> [--note "..."]`: records the owner's approval of the full draft so `vawe ship` may render the final.
// `vawe approve <page> --reject [--note "..."]`: records the rejection and withdraws any approval. Both append to the film's run log.
//   node harness/live/approve.mjs <page.html> [--reject] [--note text]
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { approveProblem, writeApproval, recordOwnerVerdict } from '../lib/approval.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const args = process.argv.slice(2);
const noteAt = args.indexOf('--note');
const note = noteAt >= 0 ? args[noteAt + 1] ?? null : null;
const reject = args.includes('--reject');
const [page] = args.filter((a, i) => !a.startsWith('--') && i !== noteAt + 1);

if (reject) {
  recordOwnerVerdict(page, { verdict: 'reject', note, root: ROOT });
  console.log(`rejected ${page}${note ? `: ${note}` : ''}`);
} else {
  const problem = approveProblem(page, { root: ROOT });
  if (problem) {
    console.error(`vawe: approve refused: ${problem}`);
    process.exit(1);
  }
  const record = writeApproval(page, { root: ROOT });
  recordOwnerVerdict(page, { verdict: 'approve', note, root: ROOT });
  console.log(`approved ${record.draft} (${record.draftBytes} bytes) as ${record.by}`);
}
