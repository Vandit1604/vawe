// tests/gates/consequence-lint.test.mjs: the advisory lint that flags a finding message with no stated
// consequence (quality/gates/consequence-lint.mjs). Tests the pure pieces directly, the same shape
// tests/gates/coverage.test.mjs uses for darkVocabularySummary(), rather than shelling out for every
// case: the heuristic is the thing that can silently drift (a rewording that stops matching
// CONSEQUENCE_RE would make every real message read as vague), so it needs cases pinned here, not just
// exercised end to end.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CONSEQUENCE_RE, extractArgs, findCalls, scan } from '../../quality/gates/consequence-lint.mjs';

test('extractArgs finds the matching close paren across a multi-line, multi-arg call', () => {
  const src = "f.fail('code',\n  `a message with (parens) inside it`,\n  { fix: 'do the thing' });\nafter();";
  const open = src.indexOf('(');
  const args = extractArgs(src, open);
  assert.ok(args.includes('a message with (parens) inside it'));
  assert.ok(args.includes("fix: 'do the thing'"));
  assert.ok(!args.includes('after()'), 'must stop at the call\'s own closing paren, not run past it');
});

test('extractArgs returns null on an unbalanced call (never throws)', () => {
  assert.equal(extractArgs('f.fail(`unterminated', 6), null);
});

test('findCalls skips a bare passthrough with no literal prose', () => {
  const src = "out.push(sourceConflict);\nout.push(`${a} ${b}`);";
  assert.equal(findCalls(src, 'x.mjs').length, 0);
});

test('findCalls reports a real message with its 1-indexed line number', () => {
  const src = "\n\nf.warn('some-code',\n  `this message is long enough to pass the literal-length floor for sure`);";
  const hits = findCalls(src, 'x.mjs');
  assert.equal(hits.length, 1);
  assert.equal(hits[0].line, 3);
  assert.equal(hits[0].file, 'x.mjs');
});

test('CONSEQUENCE_RE: known-vague and known-stated messages classify correctly', () => {
  // The exact shape this pass rewrote AWAY from: a bare cause/fix statement, no stated effect.
  const vague = [
    'layers[0] must be a number (got NaN)',
    'transitions[0] must be an object',
    'aspects."16:9" must be an object of layer props',
  ];
  for (const m of vague) assert.equal(CONSEQUENCE_RE.test(m), false, `expected no match: ${m}`);

  // The exact shape this pass rewrote TOWARD: cause, stated consequence, one fix.
  const stated = [
    'layers[0] must be a number, not NaN: the render refuses to start until this is fixed.',
    'this film derives cues but assets/sfx/ holds no .wav, so every cue resolves to nothing and the mixer writes a SILENT track.',
    'the layer snaps rather than moves, which reads as a stutter on screen.',
  ];
  for (const m of stated) assert.equal(CONSEQUENCE_RE.test(m), true, `expected a match: ${m}`);
});

test('scan() walks a real, non-empty surface and returns { files, vague } without throwing', () => {
  const { files, vague } = scan();
  assert.ok(files.length > 20, 'the scan surface (core/validate + quality/gates + harness/live) should be more than a handful of files');
  assert.ok(Array.isArray(vague));
  for (const v of vague) {
    assert.equal(typeof v.file, 'string');
    assert.equal(typeof v.line, 'number');
    assert.equal(typeof v.snippet, 'string');
  }
});

test('scan() finds schema-walk.mjs and jolt-check.mjs fully clean under this heuristic', () => {
  // These two were rewritten line-for-line in this pass and every message in them now states its
  // consequence, so the gate should report zero for both, not just "fewer than before".
  const { vague } = scan();
  for (const f of ['core/validate/schema-walk.mjs', 'quality/gates/jolt-check.mjs']) {
    const here = vague.filter((v) => v.file === f);
    assert.equal(here.length, 0, `${f} still has a vague message per this gate's own heuristic: ${JSON.stringify(here)}`);
  }
});
