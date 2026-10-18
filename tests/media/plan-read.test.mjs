// The plan read before any render (harness/media/plan-read.mjs): a 4-card slideshow lists its tells from the page alone, and the `vawe new`
// starter lists none, so a new film starts clean.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { readPlan } from '../../harness/media/plan-read.mjs';
import { starterPage, starterFace } from '../../harness/cli/new.mjs';

const ROOT = path.resolve(new URL('../../', import.meta.url).pathname);

test('a 4-card slideshow page lists the slideshow tells before any render', async () => {
  const { advice } = await readPlan(path.join(ROOT, 'tests/fixtures/pages/slideshow-classic.html'));
  assert.match(advice.join('\n'), /^slideshow: score [1-9]\/10$/m);
  for (const code of ['same-entrance', 'swap-no-carry', 'equal-shots']) assert.match(advice.join('\n'), new RegExp(`^slideshow: ${code} at `, 'm'), code);
});

test('the vawe new starter lists no page ban before any render', async () => {
  const dir = path.join(ROOT, 'films', `zz-plan-read-${process.pid}`);
  const face = starterFace('zz-plan-read');
  fs.mkdirSync(path.join(dir, 'assets'), { recursive: true });
  try {
    fs.copyFileSync(path.join(ROOT, 'assets', 'fonts', face.font), path.join(dir, 'assets', face.font));
    fs.writeFileSync(path.join(dir, 'page.html'), starterPage({ length: 10, face }));
    const { advice } = await readPlan(path.join(dir, 'page.html'));
    assert.deepEqual(advice, []);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
