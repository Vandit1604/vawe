import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { moveRows } from '../../harness/lib/board.mjs';
import { parseHandoff, handoffAdvice, measuredAdvice } from '../../harness/lib/handoffs.mjs';

const brief = (handoffs) => `## Board

| cut | move (prompts/moves) | what carries the eye | what leaves first | overlap s | camera | depth | overshoots | handoff (family: object) |
|---|---|---|---|---|---|---|---|---|
${handoffs.map((h, i) => `| s${i + 1} to s${i + 2}, ${i * 2}.00 to ${i * 2 + 0.5} | move${i} | logo | card | 0.2 | none | 2 | none | ${h} |`).join('\n')}

## Motion pass
`;

const advice = (handoffs) => handoffAdvice(moveRows(brief(handoffs)));

const VARIED = ['graphic match: the ring', 'flood: warm glow', 'type-driven: the word ship', 'deliberate cut: lands on the downbeat'];
const FADES = ['crossfade: the card', 'crossfade: the card', 'crossfade: the card', 'crossfade: the card'];

test('a varied board earns no advice', () => {
  assert.deepEqual(advice(VARIED), []);
});

test('a board of four crossfades fires on the family repeats and the missing reasons', () => {
  const lines = advice(FADES);
  assert.equal(lines.filter((l) => /plain fade or crossfade with no reason/.test(l)).length, 4);
  assert.equal(lines.filter((l) => /both use/.test(l)).length, 3);
});

test('a crossfade with a reason passes the reason check', () => {
  assert.deepEqual(advice(['flood: glow', 'deliberate cut: the beat', 'shared axis: crossfade because time passes between calm frames']), []);
});

test('an empty handoff, an unknown family and a third use are named', () => {
  assert.match(advice(['flood: a', '', 'zigzag: b'])[0], /cut 2 has no planned handoff/);
  assert.match(advice(['flood: a', 'zigzag: b'])[0], /"zigzag", none of the twelve/);
  assert.match(advice(['flood: a', 'camera through: b', 'flood: c', 'invisible cut: d', 'flood: e']).join('\n'), /flood is used on 3 cuts/);
});

test('deliberate cuts may repeat', () => {
  assert.deepEqual(advice(['deliberate cut: a', 'deliberate cut: b', 'deliberate cut: c']), []);
});

test('a board with no handoff column says so once', () => {
  const old = '## Board\n\n| cut | move |\n|---|---|\n| s1 to s2, 1.00 to 1.50 | whip |\n| s2 to s3, 3.00 to 3.50 | push |\n';
  const lines = handoffAdvice(moveRows(old));
  assert.equal(lines.length, 1);
  assert.match(lines[0], /no "handoff \(family: object\)" column/);
});

test('family names parse with aliases', () => {
  assert.equal(parseHandoff('Colour or light flood: warm').id, 'flood');
  assert.equal(parseHandoff('shared element: card').id, 'container-transform');
  assert.equal(parseHandoff('shared axis: x').id, 'shared-axis');
  assert.equal(parseHandoff('J-cut: the click').id, 'sound-bridge');
  assert.equal(parseHandoff('').name, '');
});

test('a planned flood that measures as a hard cut is named, a built one is not', () => {
  const rows = moveRows(brief(['flood: glow', 'shared axis: x']));
  const hard = [{ startFrame: 2 * 30, endFrame: 2 * 30, type: 'cut' }];
  assert.equal(measuredAdvice(rows, [{ startFrame: 0, type: 'cut' }], 30).length, 1);
  assert.match(measuredAdvice(rows, [{ startFrame: 0, endFrame: 0, type: 'cut' }, ...hard], 30)[0], /cut 1 plans flood but the film measures a hard cut at 0 s/);
  assert.deepEqual(measuredAdvice(rows, [{ startFrame: 0, endFrame: 10, type: 'crossfade' }, { startFrame: 60, endFrame: 70, type: 'push' }], 30), []);
});

test('a deliberate cut that measures as a hard cut is fine, and a cut with no detected change is not judged', () => {
  const rows = moveRows(brief(['deliberate cut: a', 'camera through: b']));
  assert.deepEqual(measuredAdvice(rows, [{ startFrame: 0, type: 'cut' }], 30), []);
});

test('vawe check transitions: 4 crossfades fire, a varied board passes', () => {
  const run = (handoffs) => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'transitions-'));
    try {
      fs.writeFileSync(path.join(dir, 'brief.md'), brief(handoffs));
      fs.writeFileSync(path.join(dir, 'page.html'), '<html><body></body></html>');
      return spawnSync(process.execPath, ['quality/gates/transitions.mjs', path.join(dir, 'page.html')], { encoding: 'utf8' });
    } finally { fs.rmSync(dir, { recursive: true, force: true }); }
  };
  const bad = run(FADES);
  assert.equal(bad.status, 0);
  assert.match(bad.stdout, /plain fade or crossfade with no reason/);
  assert.doesNotMatch(run(VARIED).stdout, /\[transitions\]/);
});
