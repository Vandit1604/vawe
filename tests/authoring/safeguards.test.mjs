// harness/lib/safeguards.test.mjs: the two adapt entries added by the craft-rules-into-harness pass.
// Unit-level, against adaptFinding() directly, the same way craft-rules.test.mjs exercises its own
// module without spinning up a full render: each entry's applies()/adapt() is a pure function of a
// finding + ctx, so a full film build would only add render time, not coverage.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { adaptFinding } from '../../harness/lib/safeguards.mjs';

test('archetype-repeat softens when the storyboard NOT line names the repeat on purpose', () => {
  const finding = { kind: 'archetype-repeat' };
  const named = adaptFinding(finding, { not: ['repeats the split archetype on purpose, for the pair'] });
  assert.equal(named.adapted.verdict, 'skip');
  assert.match(named.adapted.line, /adapted archetype-repeat/);
  const unrelated = adaptFinding(finding, { not: ['no centred text default'] });
  assert.equal(unrelated.adapted, undefined, 'a NOT line that does not name the repeat stays hard');
  const missingCtx = adaptFinding(finding, {});
  assert.equal(missingCtx.adapted, undefined, 'no NOT line at all: applies() declines, stays hard');
});

test('seam-split reclassifies when a real content layer occupies the margin field box', () => {
  const finding = { kind: 'seam-split', fieldBox: { x: 0, y: 1000, w: 1920, h: 80 } };
  const occupied = adaptFinding(finding, { layers: [{ id: 'caption', box: { x: 0, y: 980, w: 400, h: 120 } }] });
  assert.equal(occupied.adapted.verdict, 'reclassify');
  assert.match(occupied.adapted.line, /adapted seam-split/);
  const empty = adaptFinding(finding, { layers: [{ id: 'hero', box: { x: 0, y: 0, w: 1920, h: 800 } }] });
  assert.equal(empty.adapted, undefined, 'no layer overlaps the field box: stays hard');
});
