import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { readReceipt } from './receipt.mjs';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const subject = process.argv[2];
if (!subject) process.exit(0); // no D= given: nothing to check a receipt against

const r = readReceipt('preflight', subject);
if (r.exists && !r.stale) process.exit(0);

console.log(r.exists
  ? `  · preflight receipt is stale for ${subject}, running it now …`
  : `  · no preflight receipt for ${subject}, running it now (this is the hidden step W11 made automatic) …`);
const res = spawnSync(process.execPath, [path.join(repoRoot, 'quality/gates/preflight.mjs'), subject, '--record'], { stdio: 'inherit' });
process.exit(res.status ?? 0);
