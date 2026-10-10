import test from 'node:test';
import assert from 'node:assert/strict';
import { stillsAction, stillsKey, stillsLines } from '../../harness/lib/stills-pick.mjs';

const slot = (id) => `### ${id}\n- family: ${id}\n- sentence: s${id}\n- key frame: k${id}\n`;
const brief = (ids) => `# x\n\n## Directions\n\n${ids.map(slot).join('\n')}\n- picked:\n`;
const HTML = '<html>three stills</html>';

test('dev judges the stills only when three directions are filled, once per change', () => {
  assert.equal(stillsAction({ brief: brief(['A', 'B']), html: HTML, cached: null }), 'skip');
  assert.equal(stillsAction({ brief: null, html: HTML, cached: null }), 'skip');
  assert.equal(stillsAction({ brief: brief(['A', 'B', 'C']), html: null, cached: null }), 'skip');
  assert.equal(stillsAction({ brief: brief(['A', 'B', 'C']), html: HTML, cached: null }), 'run');
  const key = stillsKey(HTML, brief(['A', 'B', 'C']));
  assert.equal(stillsAction({ brief: brief(['A', 'B', 'C']), html: HTML, cached: { key } }), 'cached');
  assert.equal(stillsAction({ brief: brief(['A', 'B', 'C']), html: `${HTML} `, cached: { key } }), 'run');
  assert.equal(stillsKey(HTML, `${brief(['A', 'B', 'C'])}\n## Beats\n\nmore`), key, 'an edit outside the slots is not a change');
});

test('the pick prints in three lines', () => {
  const lines = stillsLines({ strongest: 'B', reason: 'the object carries it', fixFirst: 'light the bottle from the left', scores: { concept: 8, template: 7 }, directions: [{ id: 'A', score: 6 }, { id: 'B', score: 8 }, { id: 'C', score: 5 }] });
  assert.deepEqual(lines, [
    'stills judge, advice and not a target: pick B',
    '  why: the object carries it',
    '  fix first: light the bottle from the left',
  ]);
  assert.ok(!stillsLines({ strongest: 'B', scores: { concept: 8 }, directions: [{ id: 'B', score: 8 }] }).join('\n').match(/\d/), 'no score is printed');
  assert.match(stillsLines({ strongest: 'A' }, { cached: true })[0], /^stills judge \(unchanged since the last run\), advice and not a target: pick A/);
});
