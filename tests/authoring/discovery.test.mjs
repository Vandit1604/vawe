// tests/authoring/discovery.test.mjs: the runnable self-check for the discovery corpus/router shared by
// `make stage`'s adoption block (quality/gates/stage.mjs), the beat-surfacer save-time nudge
// (harness/live/beat-surfacer.mjs), and ideate.mjs's route brackets.
//
// What this guards, in order: a beat naming a capability in its own words gets a grounded suggestion
// (never a guess with no evidence); a beat with nothing relevant gets nothing; an engine-internal
// vocabulary (generator, envelope, field motion, lightfield, shadow direction, effector, keyframe
// handle, interpolation mode, scramble charset, theme look key) is never offered, because none of them
// is in GROUPS at all; a dedicated-field kind (camera move, cut, move shape, part entrance, recipe)
// prints its OWN field, never a `use:` line.
//   node tests/authoring/discovery.test.mjs
import assert from 'node:assert/strict';
import { GROUPS, dedicatedField, usedNames, pasteLine, ambiguousNames, tokenGroupsOf, bestWindowMatch }
  from '../../harness/author/discovery.mjs';
import { coverageIn } from '../../harness/author/arsenal.mjs';

const all = GROUPS.flatMap(([, entries]) => entries());
const coverage = coverageIn(all);
const ambiguous = ambiguousNames(all);

// ---- a beat naming a capability in its own words gets a grounded suggestion ------------------------
{
  const beat = { mechanism: 'an aurora glow pulses behind the title', picture: '', style: '', becomes: '', onscreen: [] };
  const groups = tokenGroupsOf(beat);
  const aurora = all.find((e) => e.name === 'aurora');
  assert.ok(aurora, 'the corpus must actually carry an "aurora" background preset for this test to mean anything');
  const m = bestWindowMatch(aurora, groups, coverage);
  assert.ok(m.s > 0 && m.c >= 0.47, `"aurora glow behind the title" must confidently match aurora, got c=${m.c}`);
  // "aurora" collides with another kind's own name (ambiguousNames), so the paste line disambiguates
  // with `<kind>:<name>` rather than a bare name that would not say which one is meant.
  assert.match(pasteLine(aurora, ambiguous), /^use: (aurora|background preset:aurora)$/,
    'a background preset with no dedicated field pastes through use:, disambiguated if its name collides');
}

// ---- a beat with nothing relevant suggests nothing ---------------------------------------------------
{
  const beat = { mechanism: 'zzz qqq xyzzy plugh wibble', picture: '', style: '', becomes: '', onscreen: [] };
  const groups = tokenGroupsOf(beat);
  const hits = all.filter((e) => bestWindowMatch(e, groups, coverage).c >= 0.47);
  assert.equal(hits.length, 0, 'nonsense prose must clear CONFIDENT for nothing in the corpus');
}

// ---- engine internals are never suggested: GROUPS names no internal kind at all ----------------------
{
  const internalKinds = ['generator', 'envelope shape', 'envelope anchor', 'field motion',
    'lightfield pattern', 'shadow direction', 'effector falloff', 'effector drive', 'keyframe handle',
    'interpolation mode', 'scramble charset', 'theme look key'];
  const kindsCovered = new Set(all.map((e) => e.kind));
  for (const k of internalKinds) {
    assert.ok(!kindsCovered.has(k), `${k} is an engine internal and must not appear in GROUPS`);
  }
}

// ---- dedicated-field kinds print their own field, never use: ----------------------------------------
{
  const camera = all.find((e) => e.kind === 'camera move');
  assert.match(pasteLine(camera, ambiguous), /^camera: /, 'a camera move pastes into camera:, not use:');
  const cut = all.find((e) => e.kind === 'cut');
  assert.match(pasteLine(cut, ambiguous), /^transition_in: fx:/, 'a cut pastes into transition_in:, not use:');
  const shape = all.find((e) => e.kind === 'move shape');
  assert.match(pasteLine(shape, ambiguous), /^move: /, 'a move shape pastes into move:, not use:');
  const part = all.find((e) => e.kind === 'part entrance');
  assert.match(pasteLine(part, ambiguous), /^motion: /, 'a part entrance pastes into motion:, not use:');
  const recipe = all.find((e) => e.kind === 'recipe');
  assert.match(pasteLine(recipe, ambiguous), /^recipe: /, 'a recipe pastes into recipe:, not use:');
  assert.equal(dedicatedField('background preset'), null, 'a background preset has no dedicated field');
}

// ---- usedNames reads the dedicated fields, and a real use: line, never a stray word in prose --------
{
  const sbSrc = '## Beat 1\n- camera: slowPush\n- mechanism: the frame just holds\nuse: aurora\n';
  const beats = [{ camera: 'slowPush', move: null, motion: null, transition_in: null, recipe: null }];
  const isUsed = usedNames(sbSrc, beats);
  const slowPush = all.find((e) => e.name === 'slowPush' && e.kind === 'camera move');
  assert.ok(isUsed(slowPush), 'a beat\'s own camera: field marks that camera move used');
  const aurora = all.find((e) => e.name === 'aurora');
  assert.ok(isUsed(aurora), 'a real use: line marks that use: kind used');
  const focusPull = all.find((e) => e.kind === 'kinetic preset');
  assert.ok(!isUsed(focusPull), 'a kind named nowhere in the film is not used');
}

console.log('✓ discovery.test.mjs: grounded match, no-match silence, internals excluded, dedicated fields, usedNames');
