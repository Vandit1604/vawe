// ensure-preflight.mjs: the hidden prerequisite `make check`/`make ship` used to leave to memory.
//
// W11's audit named this directly: preflight is the nine decisions that belong BEFORE the JSON, and
// it only ever ran if an author remembered to type it as its own step first. So `make check` and
// `make ship` call this before the ladder now; it is silent when the receipt is fresh (the common
// case, once preflight has actually run) and runs `make preflight` for you otherwise, the same way
// `make dev` already writes contact sheets for you instead of leaving that a separate command.
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
const res = spawnSync(process.execPath, [path.join(repoRoot, 'scripts/gates/preflight.mjs'), subject, '--record'], { stdio: 'inherit' });
process.exit(res.status ?? 0);
