import test from 'node:test';
import assert from 'node:assert/strict';
import { whenToUse, moveDocs, moveDocLines } from '../../harness/lib/move-docs.mjs';

const board = (moves) => `## Board

| beat | in s | hold s | cut out s (length) |
|---|---|---|---|
| s1 | 0 | 1.5 | 0.6 |

| cut | move (prompts/moves) | what carries the eye |
|---|---|---|
${moves.map((m, i) => `| s${i + 1} to s${i + 2} | ${m} | logo |`).join('\n')}

## Motion pass
`;

test('whenToUse takes the first sentence after "Use when" across wrapped lines', () => {
  assert.equal(whenToUse('# X\n\n**Use when** the next shot is to the side\nand a cut would feel abrupt. Both shots sit.'), 'the next shot is to the side and a cut would feel abrupt');
  assert.equal(whenToUse('# X\n\nno such line'), null);
});

test('every move doc has a use-when sentence the Board can print', () => {
  const docs = moveDocs();
  assert.ok(docs.length > 50);
  assert.deepEqual(docs.filter((d) => !d.when).map((d) => d.name), []);
});

test('a Board move cell that names a move doc prints its path and when to use it, once, and a longer name wins', () => {
  const docs = [{ name: 'whip-pan', when: 'the next shot is to the side' }, { name: 'pan', when: 'a plain pan' }];
  assert.deepEqual(moveDocLines(board(['whip pan', 'Whip-Pan']), docs), ['board: read prompts/moves/whip-pan.md (use when the next shot is to the side)']);
  assert.deepEqual(moveDocLines(board(['hard cut']), docs), []);
  assert.deepEqual(moveDocLines('## Board\n\n| beat |\n|---|\n| [s1] |\n', docs), []);
  assert.deepEqual(moveDocLines(null, docs), []);
});
