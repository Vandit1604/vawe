// tests/authoring/site-engine-sweep.test.mjs: `make regen` writes blocks/catalog/ (scripts/site/
// registry.mjs, the owner), then site-engine.mjs vendors blocks/ -> site/public/blocklib. Before this
// fix, site-engine.mjs only ever ADDED files, so a block retired from blocks/catalog/ left an orphan
// in site/public/blocklib/catalog/ forever, and since regen never called site-engine.mjs at all, the
// vendored copy only caught up whenever the site's own `predev` ran (during `make e2e`'s site-test),
// showing up as a git-dirty tree AFTER a supposedly read-only check.
//
// Proves two things against the real repo tree (temp files added and removed, never committed):
//   1. an orphan under site/public/blocklib/catalog/ (no matching blocks/catalog/ source) is swept.
//   2. a file under site/public/blocklib/presets/ (owned by harness/dev/preset-sheets.mjs, not
//      blocks/) is left alone: presets/ and themes/ share the blocklib destination root but are not
//      sourced from blocks/, so a blanket sweep would delete another generator's output.
//   node tests/authoring/site-engine-sweep.test.mjs
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

function assert(cond, msg) { if (!cond) throw new Error(`FAIL: ${msg}`); }

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const ORPHAN = path.join(ROOT, 'site/public/blocklib/catalog/__test-orphan.json');
const PROTECTED_DIR = path.join(ROOT, 'site/public/blocklib/presets');
const PROTECTED = path.join(PROTECTED_DIR, '__test-not-ours.json');

fs.writeFileSync(ORPHAN, '{}');
fs.mkdirSync(PROTECTED_DIR, { recursive: true });
fs.writeFileSync(PROTECTED, '{}');

try {
  execFileSync(process.execPath, [path.join(ROOT, 'scripts/site/site-engine.mjs')], { cwd: ROOT, encoding: 'utf8' });

  assert(!fs.existsSync(ORPHAN), 'an orphan with no blocks/catalog/ source must be swept from site/public/blocklib/catalog/');
  assert(fs.existsSync(PROTECTED), 'a file under blocklib/presets/ (a different generator\'s output) must survive the sweep');

  console.log('OK: site-engine sweeps catalog orphans and leaves sibling generators\' output alone');
} finally {
  fs.rmSync(ORPHAN, { force: true });
  fs.rmSync(PROTECTED, { force: true });
}
