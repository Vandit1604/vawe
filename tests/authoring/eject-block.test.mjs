// tests/authoring/eject-block.test.mjs: `make dev-tool X=add BLOCK=<name> D=<film>` writes a block factory's own
// output straight into the film, in place of the sugar layer, tagged `ejectedFrom`. node tests/authoring/eject-block.test.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { ejectBlock } from '../../harness/author/eject-block.mjs';

const tmp = path.join(os.tmpdir(), `eject-block-test-${process.pid}.json`);
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
} finally {
  fs.rmSync(tmp, { force: true });
}

console.log('eject-block.test.mjs: ok');
