import test from 'node:test';
import assert from 'node:assert/strict';
import { TRICKS, tricksPrompt, readTricks, capByTricks, trickLines } from '../../harness/lib/judge-tricks.mjs';
import { freshRubric } from '../../quality/gates/rubric.mjs';
import { reportLines } from '../../harness/lib/judge-report.mjs';

test('the film rubric lists every known trick, requires a cited second, and the owner decisions', () => {
  const rubric = freshRubric({ stage: 'draft' });
  for (const t of TRICKS) assert.ok(rubric.includes(`- ${t.id}:`), t.id);
  assert.match(rubric, /Name a trick only with the second you saw it at/);
  assert.match(rubric, /"tricks":\[\{"trick"/);
  assert.match(rubric, /DESIGN\.md/);
  assert.match(rubric, /no house face such as Anybody/);
  assert.match(rubric, /a camera push is never a reward/);
  assert.match(rubric, /not a target for the author/);
});

test('the stills rubric carries the owner decisions and no trick list', () => {
  const rubric = freshRubric({ stage: 'stills' });
  assert.match(rubric, /Owner decisions/);
  assert.ok(!rubric.includes('Known tricks'));
  assert.ok(!rubric.includes('"tricks"'));
  assert.equal(tricksPrompt({ stage: 'stills' }).includes('camera-drift'), false);
});

test('a trick with no second, no evidence or an unknown id is dropped; a cited one counts and caps the axes it games', () => {
  const tricks = readTricks({ tricks: [
    { trick: 'camera-drift', at: '3.2', evidence: 'the whole frame scales 4% through the hold, nothing else moves' },
    { trick: 'camera-drift', evidence: 'the whole frame scales through the hold' },
    { trick: 'camera-drift', at: 2, evidence: 'drift' },
    { trick: 'new-trick', at: 2, evidence: 'something I made up on the spot' },
  ] });
  assert.deepEqual(tricks, [{ trick: 'camera-drift', at: 3.2, evidence: 'the whole frame scales 4% through the hold, nothing else moves' }]);
  assert.deepEqual(capByTricks({ motion: 9, pace: 8, type: 9, sound: 9 }, tricks), { motion: 7, pace: 7, type: 9, sound: 9 });
  assert.deepEqual(capByTricks({ motion: 6 }, tricks), { motion: 6 });
  assert.deepEqual(readTricks({}), []);
  assert.deepEqual(trickLines(tricks), ['trick camera-drift at 3.2 s: the whole frame scales 4% through the hold, nothing else moves']);
});

test('the printed judge report lists the cited tricks', () => {
  const lines = reportLines({ stage: 'draft', verdict: 'FIX', scores: { motion: 7 }, fixes: [], tricks: [{ trick: 'overlay-ground', at: 1.5, evidence: 'a faint grain sits over a flat red ground' }] }, 'out/x.judge.json');
  assert.ok(lines.includes('trick overlay-ground at 1.5 s: a faint grain sits over a flat red ground'));
});
