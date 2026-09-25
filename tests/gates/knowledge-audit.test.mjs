// node --test tests/gates/knowledge-audit.test.mjs
//
// The join logic in harness/lib/knowledge-audit.mjs on synthetic run-log data: a rule dropped
// feature-not-matched, then proven (the same film later hits its check code), left unproven (the code
// never fires), or not joinable (check: null). No real out/ dir needed, so this runs the same
// everywhere, unlike the tool itself, whose real report depends on a film's local run-log history.
import test from 'node:test';
import assert from 'node:assert';
import { ruleChecks, auditFilm } from '../../harness/lib/knowledge-audit.mjs';

const rules = [
  { id: 'imagery.visual-ladder', check: null },
  { id: 'content.per-act-density', check: 'plain-content' },
  { id: 'sound.reach-for-a-cue', check: 'no-cue-pack' },
];
const checks = ruleChecks(rules);

test('ruleChecks maps id to its check code, or null', () => {
  assert.equal(checks.get('content.per-act-density'), 'plain-content');
  assert.equal(checks.get('imagery.visual-ladder'), null);
});

test('auditFilm: a joinable drop later proven by a matching finding code is a hit', () => {
  const runs = [
    { at: 't1', knowledge: { stage: 'design', dropped: [{ id: 'content.per-act-density', category: 'content', reason: 'feature-not-matched' }] }, checks: [] },
    { at: 't2', cmd: 'check', checks: [{ codes: ['plain-content'] }] },
  ];
  const r = auditFilm(runs, checks);
  assert.equal(r.hits.length, 1);
  assert.equal(r.hits[0].ruleId, 'content.per-act-density');
  assert.equal(r.hits[0].provenAt, 't2');
  assert.equal(r.unproven.length, 0);
  assert.equal(r.notJoinable, 0);
});

test('auditFilm: a joinable drop whose code never fires is unproven, not a hit', () => {
  const runs = [
    { at: 't1', knowledge: { stage: 'design', dropped: [{ id: 'content.per-act-density', category: 'content', reason: 'feature-not-matched' }] }, checks: [] },
    { at: 't2', cmd: 'check', checks: [{ codes: ['some-other-code'] }] },
  ];
  const r = auditFilm(runs, checks);
  assert.equal(r.hits.length, 0);
  assert.equal(r.unproven.length, 1);
});

test('auditFilm: a drop whose rule carries check: null cannot be joined either way', () => {
  const runs = [
    { at: 't1', knowledge: { stage: 'design', dropped: [{ id: 'imagery.visual-ladder', category: 'imagery', reason: 'feature-not-matched' }] }, checks: [] },
  ];
  const r = auditFilm(runs, checks);
  assert.equal(r.hits.length, 0);
  assert.equal(r.unproven.length, 0);
  assert.equal(r.notJoinable, 1);
});

test('auditFilm: a drop reason other than feature-not-matched is ignored', () => {
  const runs = [
    { at: 't1', knowledge: { stage: 'design', dropped: [{ id: 'content.per-act-density', category: 'content', reason: 'over-cap' }] }, checks: [] },
    { at: 't2', cmd: 'check', checks: [{ codes: ['plain-content'] }] },
  ];
  const r = auditFilm(runs, checks);
  assert.equal(r.hits.length, 0);
  assert.equal(r.unproven.length, 0);
  assert.equal(r.notJoinable, 0);
});

test('auditFilm: a finding BEFORE the drop does not count as proof (only later runs join)', () => {
  const runs = [
    { at: 't1', cmd: 'check', checks: [{ codes: ['plain-content'] }] },
    { at: 't2', knowledge: { stage: 'design', dropped: [{ id: 'content.per-act-density', category: 'content', reason: 'feature-not-matched' }] }, checks: [] },
  ];
  const r = auditFilm(runs, checks);
  assert.equal(r.hits.length, 0);
  assert.equal(r.unproven.length, 1);
});
