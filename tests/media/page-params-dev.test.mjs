// `vawe dev --param look=riso` renders the look, and every file it writes carries the params. Needs Chrome and ffmpeg.
//   node --test tests/media/page-params-dev.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const PAGE = 'tests/fixtures/pages/param-look.html';
const out = (name) => path.resolve('out', name);

test('dev --param writes a draft, notes, checks, a still and a run event for the look', () => {
  const names = ['param-look-look-riso-draft.mp4', 'param-look-look-riso.dev.md', 'param-look-look-riso.checks.json', 'param-look-look-riso-draft-full.png', 'param-look-draft-full.png'];
  for (const n of names) fs.rmSync(out(n), { force: true });
  const r = spawnSync(process.execPath, [path.resolve('bin/vawe'), 'dev', PAGE, '--silent', '--no-judge', '--param', 'look=riso'], { encoding: 'utf8' });
  assert.equal(r.status, 0, r.stdout + r.stderr);
  for (const n of names.slice(0, 4)) assert.ok(fs.existsSync(out(n)), `${n} is missing`);
  assert.ok(!fs.existsSync(out('param-look-draft-full.png')), 'the look overwrote the plain still');
  assert.match(r.stdout, /top advice of param-look-look-riso/);
  const px = spawnSync('ffmpeg', ['-v', 'error', '-i', out(names[0]), '-frames:v', '1', '-vf', 'crop=8:8:0:0,scale=1:1,format=rgb24', '-f', 'rawvideo', '-'], { encoding: 'buffer' }).stdout;
  const [red, green, blue] = [...px];
  assert.ok(red > 200 && green < 60 && blue < 60, `the draft is not the riso red: ${red},${green},${blue}`);
  const events = fs.readFileSync(out('param-look.runs.jsonl'), 'utf8').trim().split('\n').map((l) => JSON.parse(l));
  assert.equal(events.filter((e) => e.cmd === 'dev').at(-1).params, 'look=riso');
});
