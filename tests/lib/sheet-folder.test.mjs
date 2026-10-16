import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const SHEET = path.resolve('harness/media/sheet.mjs');
const run = (dir, out) => spawnSync(process.execPath, [SHEET, dir, '--out', out], { encoding: 'utf8' });

test('sheet of a folder of images is one tile per image, named by file', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sheet-folder-'));
  try {
    for (const [name, colour] of [['b-second.png', 'red'], ['a-first.png', 'blue']]) {
      spawnSync('ffmpeg', ['-v', 'error', '-y', '-f', 'lavfi', '-i', `color=c=${colour}:s=64x36`, '-frames:v', '1', path.join(dir, name)]);
    }
    const out = path.join(dir, 'sheet.png');
    const r = run(dir, out);
    assert.equal(r.status, 0, r.stderr);
    assert.match(r.stdout, /2 tile\(s\).*a-first\.png, b-second\.png/);
    assert.ok(fs.statSync(out).size > 0);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('sheet of a folder with no image says so', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sheet-folder-'));
  try {
    const r = run(dir, path.join(dir, 'sheet.png'));
    assert.equal(r.status, 2);
    assert.match(r.stderr, /no png, jpg or webp image/);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
