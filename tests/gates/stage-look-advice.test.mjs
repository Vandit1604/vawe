// tests/gates/stage-look-advice.test.mjs: quality/gates/stage.mjs advises (never blocks) when a
// film's layers already carry motion but no `make look LOOKS=1` receipt is on record for this exact
// scene, and clears once one is written (harness/lib/receipt.mjs, keyed by content hash).
//   node --test tests/gates/stage-look-advice.test.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import { lookAdviceFor } from '../../quality/gates/stage.mjs';
import { writeReceipt, dirFor, receiptPath } from '../../harness/lib/receipt.mjs';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const scenePath = path.join(repoRoot, 'tests/fixtures/stage-look-motion.json');
const scene = JSON.parse(fs.readFileSync(scenePath, 'utf8'));
const receiptFile = receiptPath('look', scenePath);

test.after(() => { fs.rmSync(receiptFile, { force: true }); });

test('motion with no look receipt yet gets an advisory tip', () => {
  fs.rmSync(receiptFile, { force: true });
  const tip = lookAdviceFor(scene, true, scenePath, 'tests/fixtures/stage-look-motion');
  assert.match(tip, /LOOKS=1/);
  assert.match(tip, /before more motion work/);
});

test('a scene with no motion at all gets no tip', () => {
  const stillScene = { ...scene, layers: [{ type: 'text', text: 'hello', size: 80, start: 0, duration: 3 }] };
  assert.equal(lookAdviceFor(stillScene, true, scenePath, 'x'), null);
});

test('writing a look receipt for this exact scene clears the tip', () => {
  fs.mkdirSync(dirFor('look'), { recursive: true });
  writeReceipt('look', scenePath, { sheet: '/tmp/preview_scene_looks.png' });
  assert.equal(lookAdviceFor(scene, true, scenePath, 'x'), null);
});

test('a stale receipt (the scene file changed since) brings the tip back', () => {
  writeReceipt('look', scenePath, { sheet: '/tmp/preview_scene_looks.png' });
  const original = fs.readFileSync(scenePath, 'utf8');
  fs.writeFileSync(scenePath, original.replace('"duration": 3', '"duration": 99'));
  try {
    const tip = lookAdviceFor(scene, true, scenePath, 'x');
    assert.match(tip, /LOOKS=1/);
  } finally {
    fs.writeFileSync(scenePath, original);
  }
});
