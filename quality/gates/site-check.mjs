// quality/gates/site-check.mjs: everything the SITE publishes, checked against the thing that
// produced it. Chains five checks that used to run only when somebody remembered to type all five:
// scenes-json + site-counts (a rendered film matches its source) and registry/blocks-docs/blocks-json
// --check (the three committed GENERATED artifacts match blocks/catalog.mjs). One rendered-from-a-
// scene-edit-later-lost-in-a-merge, one committed-before-its-sound-existed, one still-9:16-while-its-
// film-was-16:9 all drifted before this existed. A gate nobody runs is not a gate.
//
//   node quality/gates/site-check.mjs   ·   make check GATE=site-check
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

const STEPS = [
  ['scripts/site/films-json.mjs', []],
  ['harness/lib/check-gate.mjs', ['scenes-json']],
  ['harness/lib/check-gate.mjs', ['site-counts']],
  ['scripts/site/registry.mjs', ['--check']],
  ['scripts/site/blocks-docs.mjs', ['--check']],
  ['scripts/site/blocks-json.mjs', ['--check']],
];

let failed = 0;
for (const [script, args] of STEPS) {
  const r = spawnSync(process.execPath, [path.join(ROOT, script), ...args], { stdio: 'inherit', cwd: ROOT });
  if ((r.status || 0) !== 0) failed++;
}
process.exit(failed ? 1 : 0);
