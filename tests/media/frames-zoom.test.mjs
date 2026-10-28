import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { zoomStill } from '../../harness/media/frames.mjs';

test('a full still older than the page is not used for the zoom', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'zoom-'));
  const full = path.join(dir, 'hook-full.png');
  fs.writeFileSync(full, '');
  const shot = { id: 'hook', png: path.join(dir, 'hook.png') };
  const fullMs = fs.statSync(full).mtimeMs;
  assert.equal(zoomStill(shot, fullMs + 1000), undefined);
  assert.equal(zoomStill(shot, fullMs - 1000), full);
  assert.equal(zoomStill({ ...shot, fullPng: 'x.png' }, fullMs + 1000), 'x.png');
  fs.rmSync(dir, { recursive: true });
});
