// tests/dev/verify.test.mjs: harness/dev/verify.mjs prints hard numbers, not a vision judgement, and
// refuses only on an objective failure (no render, a missing referenced asset). Requires
// films/scene/sample.json to be rendered first (`./bin/vawe films/scene/sample.json --draft
// --out out/sample.mp4`); this test does not render, the same "render first" contract every gate
// reusing tile.mjs's gradeable() already holds.
//   node --test tests/dev/verify.test.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { verify } from '../../harness/dev/verify.mjs';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const film = path.join(repoRoot, 'films/scene/sample.json');
const mp4 = path.join(repoRoot, 'out/sample.mp4');

if (!fs.existsSync(mp4)) {
  console.log('  ~ skipped: out/sample.mp4 not rendered, run ./bin/vawe films/scene/sample.json --draft --out out/sample.mp4 first');
} else {
  const result = verify(film);
  assert.match(result.text, /^=== VERIFY: sample ===/, 'the block must open with the fixed VERIFY header');
  assert.match(result.text, /=== END VERIFY ===$/, 'the block must close with the fixed END marker');
  assert.match(result.text, /frame coverage: \d+ beat frame\(s\) inspected \/ [\d.]+s/);
  assert.match(result.text, /exposure range per beat/);
  assert.match(result.text, /light-map distance to reference: \(no REF given, skipped\)/);
  assert.match(result.text, /beat timing vs storyboard/);
  assert.match(result.text, /asset use: \d+ referenced, \d+ present, \d+ missing/);
  assert.match(result.text, /text clipped at edges: \d+/);
  assert.match(result.text, /blank-seam count: \d+/);
  assert.equal(result.ok, true, 'sample.json has no missing assets, so verify must not fail objectively');
  assert.ok(result.beats.length > 0, 'must inspect at least one beat');

  // REF given as the render's own file: identical frames must round-trip to ~0 ΔE.
  const withRef = verify(film, mp4);
  assert.match(withRef.text, /light-map distance to reference \(mean ΔE, CIE76\): 0\.0/,
    'a render compared against itself must measure zero colour distance');

  // missing render is an objective failure, not a silent skip: pick any tracked film with no out/*.mp4.
  const unrendered = path.join(repoRoot, 'films/scene/motion-test.json');
  if (fs.existsSync(unrendered) && !fs.existsSync(path.join(repoRoot, 'out/motion-test.mp4'))) {
    const missing = verify(unrendered);
    assert.equal(missing.ok, false, 'no rendered mp4 must be reported as an objective failure');
    assert.match(missing.text, /render: MISSING\/STALE/);
  }
  console.log('  ✓ verify.test.mjs: block shape, REF self-comparison, and missing-render handling all hold');
}
