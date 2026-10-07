import test from 'node:test';
import assert from 'node:assert/strict';
import { parseBoard, boardChecks, boardFilled, spectacleOf } from '../../harness/lib/board.mjs';

const board = ({ cuts = ['0.6', '0.3', '1.1'], spectacle = 'at 7.2', moves = ['whip', 'push', 'overlap'], sound = ['bed, loop', 'tick'] } = {}) => `## Look

## Board

Rhythm: cut lengths vary.

| beat | in s | hold s | cut out s (length) |
|---|---|---|---|
${cuts.map((c, i) => `| s${i + 1} | ${i} | 1.5 | ${c} |`).join('\n')}

Spectacle: the one big moment ${spectacle} (also \`<meta name="spectacle">\`). Quiet before it.

| cut | move (prompts/moves) | what carries the eye | what leaves first | overlap s |
|---|---|---|---|---|
${moves.map((m, i) => `| s${i + 1} to s${i + 2} | ${m} | logo | card | 0.2 |`).join('\n')}

Sound is part of every film.

| at s | voice | gain dB | for |
|---|---|---|---|
${sound.map((v, i) => `| ${i} | ${v} | -20 | cut |`).join('\n')}

## Motion pass
`;

test('the parser reads cut lengths, moves, sound rows and the spectacle second', () => {
  const b = parseBoard(board());
  assert.deepEqual(b.cuts, [0.6, 0.3, 1.1]);
  assert.deepEqual(b.moves, ['whip', 'push', 'overlap']);
  assert.equal(b.sound.length, 2);
  assert.equal(b.spectacle, 7.2);
});

test('the parser gives null for a brief with no Board, and ignores placeholder rows', () => {
  assert.equal(parseBoard('## Look\n'), null);
  assert.equal(parseBoard(null), null);
  const template = '## Board\n\n| beat | in s | hold s | cut out s (length) |\n|---|---|---|---|\n| [s1] | [0] | [s] | [s] |\n';
  assert.deepEqual(parseBoard(template).cuts, []);
  assert.equal(boardFilled(template), false);
});

test('a good board earns no advice', () => {
  assert.deepEqual(boardChecks(board(), 7.2), []);
});

test('a board with a placeholder row, or no board, is left to stage-say', () => {
  assert.deepEqual(boardChecks('## Board\n\n| beat | in s | hold s | cut out s (length) |\n|---|---|---|---|\n| [s1] | [0] | [s] | [s] |\n', 7), []);
  assert.deepEqual(boardChecks('## Look\n', 7), []);
  assert.deepEqual(boardChecks(null, 7), []);
});

test('cuts that are all equal are named', () => {
  const lines = boardChecks(board({ cuts: ['0.6', '0.6', '0.6'] }), 7.2);
  assert.ok(lines.some((l) => /all 3 cuts last 0\.6 s/.test(l)));
});

test('no cut under 0.4 s is named', () => {
  const lines = boardChecks(board({ cuts: ['0.5', '0.7', '1.1'] }), 7.2);
  assert.deepEqual(lines.map((l) => l.replace(/;.*/, '')), ['board: no cut under 0.4 s']);
});

test('no cut over 0.9 s is named', () => {
  const lines = boardChecks(board({ cuts: ['0.3', '0.7', '0.9'] }), 7.2);
  assert.deepEqual(lines.map((l) => l.replace(/;.*/, '')), ['board: no cut over 0.9 s']);
});

test('a missing spectacle second is named', () => {
  const lines = boardChecks(board({ spectacle: 'near the end' }), 7.2);
  assert.match(lines[0], /Spectacle line names no second/);
});

test('a spectacle more than 0.25 s from the page meta is named; 0.25 s is not', () => {
  assert.match(boardChecks(board(), 7.6)[0], /Spectacle is at 7\.2 s but <meta name="spectacle"> says 7\.6 s/);
  assert.deepEqual(boardChecks(board(), 7.45), []);
  assert.deepEqual(boardChecks(board(), null), []);
});

test('no sound rows and no bed are named', () => {
  assert.match(boardChecks(board({ sound: [] }), 7.2)[0], /no sound rows/);
  assert.match(boardChecks(board({ sound: ['tick', 'whoosh'] }), 7.2)[0], /no bed/);
});

test('a move that says fade or is empty is named by its cut', () => {
  const lines = boardChecks(board({ moves: ['whip', 'crossfade or fade', ''] }), 7.2);
  assert.equal(lines.length, 2);
  assert.match(lines[0], /cut 2 names "crossfade or fade"/);
  assert.match(lines[1], /cut 3 names no move/);
});

test('the spectacle second reads from the page meta', () => {
  assert.equal(spectacleOf('<meta name="spectacle" content="7.2">'), 7.2);
  assert.equal(spectacleOf('<meta name="spectacle" content="">'), null);
  assert.equal(spectacleOf('<p>x</p>'), null);
});
