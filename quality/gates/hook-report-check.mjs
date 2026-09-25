// quality/gates/hook-report-check.mjs: proves harness/lib/hook-report.mjs actually shrinks a hook
// message, not just that it compiles.
//
//   node quality/gates/hook-report-check.mjs
//
// Three facts checked against a scratch data dir (never the real .vawe-data/): a large finding gets
// written to the report file in full, the text injected into the transcript stays under a stated
// character budget, and the same finding on a later save is silent (dedup by hash) while a changed
// finding speaks again. Pure: no render, no network, no touch to the real .vawe-data/.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const INJECTED_BUDGET = 1000;   // characters; the whole point is this stays small regardless of finding size

const scratch = fs.mkdtempSync(path.join(os.tmpdir(), 'hook-report-check-'));
process.env.VAWE_HOOK_DATA_DIR = scratch;
delete process.env.VAWE_HOOK_FULL;

const { summarize } = await import(path.join(ROOT, 'harness/lib/hook-report.mjs'));

let bad = 0;
const check = (label, ok) => { console.log(`${ok ? 'ok  ' : 'FAIL'}  ${label}`); if (!ok) bad++; };

const big = Array.from({ length: 200 }, (_, i) => `  finding ${i}: something worth naming on its own line`).join('\n');
const full = `probe.js\n${big}\n  Nothing here blocks.`;
check('a large finding runs over the injected budget before summarizing', full.length > INJECTED_BUDGET);

const summary = summarize('probe-hook', 'core/probe.js', full);
check('the injected text stays under the stated budget', summary.length < INJECTED_BUDGET);
check('the injected text still names the file to read for the rest', /Full text: /.test(summary));

const reportPath = path.join(scratch, 'hook-reports', 'probe-hook', 'core__probe.js.txt');
check('the full text was written to the report file', fs.existsSync(reportPath));
check('the report file carries every finding, not a truncated copy',
  fs.existsSync(reportPath) && fs.readFileSync(reportPath, 'utf8') === full);

const repeat = summarize('probe-hook', 'core/probe.js', full);
check('an unchanged finding on a later save is silent', repeat === null);

const changed = summarize('probe-hook', 'core/probe.js', full + '\n  one more line');
check('a changed finding speaks again', changed !== null);

process.env.VAWE_HOOK_FULL = '1';
const unshortened = summarize('probe-hook', 'core/probe.js', full);
check('VAWE_HOOK_FULL=1 returns the old, un-shortened text', unshortened === full);
const unshortenedAgain = summarize('probe-hook', 'core/probe.js', full);
check('VAWE_HOOK_FULL=1 never suppresses a repeat either, matching the old always-print behaviour',
  unshortenedAgain === full);

fs.rmSync(scratch, { recursive: true, force: true });

console.log(bad === 0 ? '\nall checks correct' : `\n${bad} check(s) WRONG`);
process.exit(bad === 0 ? 0 : 1);
