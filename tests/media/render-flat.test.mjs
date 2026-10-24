// A page that draws one flat colour in every frame (missing fonts, a 404) fails a draft and a sheet with one line, never "ok".
// Needs Chrome and ffmpeg.   node --test tests/media/render-flat.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { frameProblems } from '../../harness/media/render-page.mjs';

const PAGE = 'tests/fixtures/flat/missing-font.html';
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'vawe-flat-'));
const tmp = (name) => path.join(dir, name);
process.on('exit', () => fs.rmSync(dir, { recursive: true, force: true }));
const run = (script, args) => spawnSync(process.execPath, [script, ...args], { encoding: 'utf8' });

test('a draft whose frames are all one colour fails and names the font generator', () => {
  const r = run('harness/media/render-page.mjs', [PAGE, tmp('draft.mp4')]);
  assert.equal(r.status, 2, r.stdout + r.stderr);
  assert.match(r.stderr, /^error: every frame is one flat colour: the page drew nothing; fonts missing from assets\/fonts \(gone-not-generated\.woff2\): run `node generators\/media\/fonts\.mjs`/m);
});

test('a face the page uses that is missing from the checkout names the font generator too', () => {
  const r = run('harness/media/render-page.mjs', ['tests/fixtures/flat/used-font.html', tmp('used.mp4')]);
  assert.equal(r.status, 2, r.stdout + r.stderr);
  assert.match(r.stderr, /^error: font Gone failed to load: .*; fonts missing from assets\/fonts \(gone-not-generated\.woff2\): run `node generators\/media\/fonts\.mjs`/m);
});

test('a sheet whose tiles are all one colour fails the same way', () => {
  const r = run('harness/media/sheet.mjs', [PAGE, '--out', tmp('sheet.png')]);
  assert.equal(r.status, 2, r.stdout + r.stderr);
  assert.match(r.stderr, /^error: every tile is one flat colour: the page drew nothing; fonts missing from assets\/fonts/m);
});

test('a declared blank film is not refused, and a half-flat film only advises', () => {
  const opts = { frames: 4, fps: 4, from: 0 };
  assert.deepEqual(frameProblems([true, true, true, true], { ...opts, declared: [[0, 1]] }), []);
  assert.equal(frameProblems([true, true, false, false], { ...opts, declared: [] }).some((l) => l.startsWith('every frame')), false);
});
