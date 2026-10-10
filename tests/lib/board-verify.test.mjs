import test from 'node:test';
import assert from 'node:assert/strict';
import { boardVerify } from '../../harness/lib/board-verify.mjs';
import { moveRows } from '../../harness/lib/board.mjs';

const brief = (cuts, sound = '| 2.75 | pluck | | the spectacle |') => `## Board

| beat | in s | hold s | cut out s (length) |
|---|---|---|---|
| cold | 0.00 | 0.70 | 0.70 (0.00) |
| warm | 0.70 | 1.30 | 2.00 (1.00) |

Spectacle: the one big moment at 2.75 s (also \`<meta name="spectacle">\`).

| cut | move (prompts/moves) | what carries the eye | what leaves first | overlap s | camera (push, drift, whip, none) | depth | overshoots (EASE.nudge, one EASE.pop) |
|---|---|---|---|---|---|---|---|
${cuts}

| at s | voice | gain dB | for |
|---|---|---|---|
${sound}

## Motion pass
`;
const CUTS = '| cold to warm, 0.70 | match-cut | the ring | the ground | 0 | none, the ring moves in 3D | ground | none |\n| warm to hot, 2.00 to 3.00 | push-in | the name | the ring | 1 | push from 2.45 | lockup | the ring lands on the pop curve |';

test('the move table is read as rows with the cut seconds', () => {
  const rows = moveRows(brief(CUTS));
  assert.deepEqual(rows.map((r) => [r.at, r.end]), [[0.7, null], [2, 3]]);
  assert.equal(rows[1].camera, 'push from 2.45');
});

test('camera "none" against a measured camera move, and a named push against none, are both named with both values', () => {
  const lines = boardVerify(brief(CUTS), { cameraSpans: [[0.5, 1.4]], dur: 5 });
  assert.equal(lines.length, 2);
  assert.match(lines[0], /^board: cut 1 \(cold to warm, 0\.70\) says camera "none" but the page runs a camera move at 0\.5-1\.4 s$/);
  assert.match(lines[1], /^board: cut 2 .* says camera "push from 2\.45" but no camera move runs between 1\.7 and 3 s$/);
  assert.deepEqual(boardVerify(brief(CUTS), { cameraSpans: [[2.45, 3]], dur: 5 }), []);
  assert.deepEqual(boardVerify(brief(CUTS), { cameraSpans: null, dur: 5 }), [], 'a camera that was not read is not compared');
});

test('overshoots: "none" against an overshooting arrival, and a named overshoot against none', () => {
  const lines = boardVerify(brief(CUTS), { arrivals: [{ at: 0.8, over: true }, { at: 0.9, over: false }, { at: 2.2, over: false }], dur: 5 });
  assert.equal(lines.length, 2);
  assert.match(lines[0], /cut 1 .* says overshoots "none" but 1 of 2 arrivals overshoot, at 0\.8 s/);
  assert.match(lines[1], /cut 2 .* says overshoots "the ring lands on the pop curve" but none of its 1 arrivals overshoot/);
  assert.deepEqual(boardVerify(brief(CUTS), { arrivals: [], dur: 5 }), []);
});

test('a sound row that is not on a cue, and a gain left empty that the page sets, are named', () => {
  const far = boardVerify(brief(CUTS), { cues: [{ name: 'pluck', at: 2.95, gain: -3, gainSet: false }], dur: 5 });
  assert.match(far[0], /the sound row "pluck" is at 2\.75 s but the nearest cue on the page is "pluck" at 2\.95 s/);
  const gain = boardVerify(brief(CUTS), { cues: [{ name: 'pluck', at: 2.78, gain: -9, gainSet: true }], dur: 5 });
  assert.match(gain[0], /leaves the gain empty .* sets data-gain -9 dB on "pluck"/);
  assert.deepEqual(boardVerify(brief(CUTS), { cues: [{ name: 'pluck', at: 2.78, gain: -3, gainSet: false }], dur: 5 }), []);
});

test('no filled Board, no lines', () => {
  assert.deepEqual(boardVerify(null, {}), []);
  assert.deepEqual(boardVerify('## Board\n\n| [s1] | [0] |', {}), []);
});
