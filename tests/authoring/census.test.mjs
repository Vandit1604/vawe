// harness/lib/census.test.mjs: the smallest check that fails if a catalogue tile or a held-still demo
// re-enters the MOTION population. LIBRARY correctly keeps them (they are real scene JSON); AUTHORED
// must not, because neither one was ever authored as a film to grade for motion (census.mjs's own
// comment above AUTHORED explains why: no `.storyboard.md` sidecar means nobody planned it as a film).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { AUTHORED, LIBRARY, SCENE_DIR, ROOT } from '../../harness/lib/census.mjs';

const abs = (f) => path.join(ROOT, SCENE_DIR, f);

test('AUTHORED excludes a catalogue tile that LIBRARY keeps', () => {
  const tile = fs.readdirSync(path.join(ROOT, SCENE_DIR))
    .find((f) => /^_catalog-\d+\.json$/.test(f) && fs.existsSync(abs(f)));
  if (!tile) return; // no catalogue tiles on this checkout (gitignored on a fresh clone): nothing to assert
  assert.equal(LIBRARY(tile, abs(tile)), true, `${tile} should still be in LIBRARY (it is a real scene JSON)`);
  assert.equal(AUTHORED(tile, abs(tile)), false,
    `${tile} has no .storyboard.md sidecar and must not count as an authored film for motion sweeps`);
});

test('AUTHORED requires a real .storyboard.md sidecar, not just the right name shape', () => {
  const fake = 'quality/gates/no-authored-motion-does-not-exist.json';
  assert.equal(AUTHORED('no-authored-motion-does-not-exist.json', path.join(ROOT, fake)), false);
});
