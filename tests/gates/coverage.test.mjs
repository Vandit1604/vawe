// tests/gates/coverage.test.mjs: the smallest check that fails if a whole registry silently stops
// being counted. `.claude/plans/unwired.plan.md` Phase 6 names the real failure this closes: four
// directory-list gates dropped 1,622 lines earlier the same week, silently, because nothing asserted
// the POPULATION a sweep walks stays the population it claims to walk. `darkVocabularySummary()` sums
// every GROUP's `all.length`; if an import breaks and a registry's name-list quietly becomes `[]`, the
// group still "passes" (0 unused of 0) and the whole registry vanishes from the report with no error.
// This pins the floor so that vanishing shows up as a failing test instead of a smaller printout nobody
// compares against yesterday's.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { darkVocabularySummary } from '../../quality/gates/coverage.mjs';

test('coverage counts every registered vocabulary group, not a shrunken subset', () => {
  const { total, dark, groups, unusedProps } = darkVocabularySummary();
  // 16 GROUPS as of this test (layer type, enter anim, kinetic preset, cut style, shader sting,
  // composite look, canvas fx, paint fx, idle, part entrance, three scene, sound cue, beat blueprint,
  // block, move shape, path curve). A count under this means a registry import failed silently and
  // returned an empty array rather than throwing: raise this number when you add a group on purpose,
  // never to silence a drop.
  assert.ok(total > 400, `total named vocabulary dropped to ${total}; a registry likely failed to import`);
  assert.ok(groups >= 10, `only ${groups} of 16 groups report any dark names; a registry likely returned []`);
  assert.ok(dark >= 0 && dark <= total, 'dark count must be a real subset of the named total');
  assert.ok(unusedProps >= 0, 'unusedProps must be a count, not undefined');
});
