// tests/authoring/eject-block.test.mjs: `make dev-tool X=add BLOCK=<name> D=<film>` writes a block factory's own
// output straight into the film, in place of the sugar layer, tagged `ejectedFrom`. node tests/authoring/eject-block.test.mjs
//
// Fixtures live under tests/fixtures/films/ (VAWE_FILMS_DIR points ejectBlock's containment check there
// for this run, never films/scene/, which is real film content this suite must not depend on).
process.env.VAWE_FILMS_DIR = 'tests/fixtures/films';

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ejectBlock } from '../../harness/author/eject-block.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const FIXTURES = path.join(ROOT, 'tests/fixtures/films');
fs.mkdirSync(FIXTURES, { recursive: true });
const tmp = path.join(FIXTURES, `eject-block-test-${process.pid}.json`);
fs.writeFileSync(tmp, JSON.stringify({
  module: 'scene',
  theme: 'default',
  layers: [
    { type: 'block', block: 'gauge', x: 100, y: 100, w: 300, value: 72, label: 'score', start: 0, dur: 4 },
  ],
}));

try {
  const n = ejectBlock(tmp, 'gauge');
  assert.equal(n, 1, 'gauge expands to one html layer');
  const after = JSON.parse(fs.readFileSync(tmp, 'utf8'));
  assert.equal(after.layers.length, 1);
  const layer = after.layers[0];
  assert.equal(layer.type, 'html', 'the sugar layer is gone, replaced by its real type');
  assert.equal(layer.block, undefined, 'no block sugar keys survive');
  assert.deepEqual(Object.keys(layer.ejectedFrom).sort(), ['block', 'commit']);
  assert.equal(layer.ejectedFrom.block, 'gauge');
  assert.match(layer.html, /var\(--v-radius/, 'the ejected HTML still reads the ambient surface vars, editable from here on');

  assert.throws(() => ejectBlock(tmp, 'gauge'), /no \{type:"block"/, 'ejecting twice finds nothing left to eject');

  const outside = path.join(ROOT, `.vawe-eject-outside-test-${process.pid}.json`);
  fs.writeFileSync(outside, JSON.stringify({
    module: 'scene',
    theme: 'default',
    layers: [{ type: 'block', block: 'gauge', x: 0, y: 0, w: 100, value: 1, label: 'x', start: 0, dur: 1 }],
  }));
  try {
    assert.throws(() => ejectBlock(outside, 'gauge'), /refusing to eject into a path outside/,
      'a D= path outside films/ is refused, never written');
    assert.deepEqual(JSON.parse(fs.readFileSync(outside, 'utf8')).layers[0].type, 'block',
      'the refused file is left untouched');
  } finally {
    fs.rmSync(outside, { force: true });
  }
} finally {
  fs.rmSync(tmp, { force: true });
}

console.log('eject-block.test.mjs: ok');
