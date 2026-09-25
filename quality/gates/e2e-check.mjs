// quality/gates/e2e-check.mjs: run `make e2e` at push time, but ONLY when the pushed range actually
// touches something it can catch. Same shape as site-build-check.mjs's trigger (derived paths, a git
// diff over the range, skip loudly if nothing matches) for the same reason: `make e2e` costs a couple of
// minutes (a puppeteer sweep of every scene and block, a real browser test, the authoring ladder), and a
// push that touches only a doc or an unrelated skill must not pay that every time.
//
//   node quality/gates/e2e-check.mjs <range>     ·   part of .githooks/pre-push
//
// TRIGGER SET: core/, renderer/, blocks/, generators/, films/scene/ (tracked files only: the rest is
// gitignored, so a diff never names them), site/public's vendored engine copy, and quality/gates/snap-*
// (the two signature definitions themselves). Anything else, including this file and the rest of
// quality/gates/, is deliberately NOT a trigger: broadening it defeats the point, which is keeping an
// ordinary push fast.
import { execFileSync, spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const range = process.argv[2];
if (!range) { console.error('usage: node quality/gates/e2e-check.mjs <range>'); process.exit(2); }

const TRIGGER_DIRS = ['core/', 'renderer/', 'blocks/', 'generators/', 'films/scene/', 'site/public/'];
const TRIGGER_FILES_PREFIX = 'quality/gates/snap-';

const changed = execFileSync('git', ['diff', '--name-only', range], { cwd: ROOT, encoding: 'utf8' })
  .split('\n').filter(Boolean);

const triggered = changed.some((f) => TRIGGER_DIRS.some((d) => f.startsWith(d)) || f.startsWith(TRIGGER_FILES_PREFIX));

if (!triggered) {
  console.log('· e2e-check: this push touches none of the engine, so `make e2e` is skipped');
  process.exit(0);
}

console.log(`▶ e2e-check: this push touches the engine (${changed.filter((f) => TRIGGER_DIRS.some((d) => f.startsWith(d)) || f.startsWith(TRIGGER_FILES_PREFIX)).join(', ')}), running \`make e2e\` …`);
const r = spawnSync('make', ['e2e'], { cwd: ROOT, stdio: 'inherit' });
process.exit(r.status == null ? 1 : r.status);
