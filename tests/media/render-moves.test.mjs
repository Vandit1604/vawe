import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { recordClips } from '../../harness/media/render-moves.mjs';
import { ensureFonts, fontFilesIn } from '../../harness/lib/ensure-fonts.mjs';
import { filmKeyOf } from '../../harness/lib/runlog.mjs';
import { filmOfCall } from '../../harness/lib/verb-log.mjs';

const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'moves-test-'));
const MODULE = path.resolve('harness/media/render-moves.mjs');

const writer = (lockFile, name) => new Promise((resolve, reject) => {
  const code = `import('${MODULE}').then((m) => m.recordClips({ '${name}': { hash: 'h-${name}', crf: 20 } }, '${lockFile}'))`;
  const child = spawn(process.execPath, ['-e', code], { stdio: 'inherit' });
  child.on('close', (c) => (c === 0 ? resolve() : reject(new Error(`writer ${name} exited ${c}`))));
});

test('recordClips: processes writing different clips at once all land', async () => {
  const lockFile = path.join(tmp(), 'clips.lock.json');
  const names = ['a', 'b', 'c', 'd', 'e', 'f'];
  await Promise.all(names.map((n) => writer(lockFile, n)));
  assert.deepEqual(Object.keys(JSON.parse(fs.readFileSync(lockFile, 'utf8'))), names);
  assert.deepEqual(fs.readdirSync(path.dirname(lockFile)), ['clips.lock.json']);
});

test('recordClips: keeps entries it was not given and replaces the one it was', async () => {
  const lockFile = path.join(tmp(), 'clips.lock.json');
  await recordClips({ a: { hash: 'old', crf: 20 }, b: { hash: 'b', crf: 20 } }, lockFile);
  await recordClips({ a: { hash: 'new', crf: 22 } }, lockFile);
  assert.deepEqual(JSON.parse(fs.readFileSync(lockFile, 'utf8')), { a: { hash: 'new', crf: 22 }, b: { hash: 'b', crf: 20 } });
});

test('ensureFonts: fetches only when a listed face is missing', () => {
  const root = tmp();
  fs.mkdirSync(path.join(root, 'assets', 'fonts'), { recursive: true });
  fs.writeFileSync(path.join(root, 'assets', 'fonts', 'A.woff2'), 'x');
  const calls = [];
  const run = (cmd, args) => calls.push(args[0]);
  assert.equal(ensureFonts(root, ['A.woff2'], { run }), false);
  assert.equal(ensureFonts(root, ['A.woff2', 'B.woff2'], { run }), true);
  assert.deepEqual(calls, [path.join(root, 'generators', 'media', 'fonts.mjs')]);
});

test('fontFilesIn: reads the face files out of css and html', () => {
  const css = "src: url('/assets/fonts/IBMPlexMono-400.woff2') format('woff2'); src: url(/assets/fonts/Geist.woff2)";
  assert.deepEqual(fontFilesIn(css, '<link href="/assets/fonts/Geist.woff2">'), ['IBMPlexMono-400.woff2', 'Geist.woff2']);
});

test('a clip render holds a slot under the name wait takes: the clip name', () => {
  assert.equal(filmKeyOf('prompts/moves/demo/iris-wipe.html'), 'iris-wipe');
  assert.equal(filmKeyOf('prompts/moves/iris-wipe.mp4'), 'iris-wipe');
  assert.equal(filmOfCall('moves', [], ['--only', 'iris-wipe']), 'iris-wipe');
});
