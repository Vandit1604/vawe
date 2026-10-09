import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { tileGrid } from '../../harness/lib/tile.mjs';

function tiles(n, dir) {
  return Array.from({ length: n }, (_, i) => {
    const f = path.join(dir, `t${i}.png`);
    spawnSync('ffmpeg', ['-v', 'error', '-y', '-f', 'lavfi', '-i', 'color=c=gray:s=600x338', '-frames:v', '1', f]);
    return f;
  });
}

test('tileGrid stacks 12, 16 and 18 landscape tiles into one sheet', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'vawe-tile-'));
  try {
    for (const n of [12, 16, 18]) {
      const out = path.join(dir, `o${n}.png`);
      tileGrid(tiles(n, dir), { cols: 2, tw: 600, th: 338, out });
      assert.ok(fs.statSync(out).size > 0, `${n} tiles`);
    }
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('tileGrid names the ffmpeg reason when an input is missing', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'vawe-tile-'));
  try {
    const list = tiles(2, dir);
    fs.rmSync(list[1]);
    assert.throws(() => tileGrid(list, { cols: 2, tw: 600, th: 338, out: path.join(dir, 'o.png') }), /ffmpeg failed \(.*t1\.png/);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});
