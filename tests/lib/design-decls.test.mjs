import test from 'node:test';
import assert from 'node:assert/strict';
import { judgeLines, parseDecls, rulesWith } from '../../harness/lib/design-decls.mjs';

const DESIGN = `# film

## Type

One face.

## Declared

- font: Tahoma (system, local())
- type-scale: 4%
- ui-scale: 2.5%
- camera: still (the owner holds it)
- mood: warm

## Parts

- type-scale: 9%
`;

test('parseDecls reads font, scales and camera under "## Declared" only, and names a bad line', () => {
  const d = parseDecls(DESIGN);
  assert.deepEqual([d.font, d.typeScale, d.uiScale, d.camera], ['Tahoma', 4, 2.5, 'still']);
  assert.equal(d.lines.length, 4);
  assert.deepEqual(d.problems, ['"mood" is not a declaration (font, type-scale, ui-scale, camera)']);
});

test('parseDecls rejects a scale out of range and a camera word that is not still or free', () => {
  const d = parseDecls('## Declared\n- type-scale: 90%\n- camera: spin\n');
  assert.equal(d.typeScale, null);
  assert.equal(d.camera, null);
  assert.equal(d.problems.length, 2);
  assert.deepEqual(parseDecls('no section').lines, []);
});

test('rulesWith puts each declared scale over its floor and leaves the rest', () => {
  const rules = { capFrac: 0.06, uiCapFrac: 0.03, chromeCapFrac: 0.025 };
  assert.deepEqual(rulesWith(parseDecls(DESIGN), rules), { capFrac: 0.04, uiCapFrac: 0.025, chromeCapFrac: 0.025 });
  assert.deepEqual(rulesWith(parseDecls(''), rules), rules);
});

test('judgeLines tells the judge not to ask for what the film declared otherwise', () => {
  const text = judgeLines(parseDecls(DESIGN)).join('\n');
  assert.match(text, /the face is Tahoma: do not ask for the house face/);
  assert.match(text, /camera is declared still: never ask for a push/);
  assert.deepEqual(judgeLines(parseDecls('')), []);
});
