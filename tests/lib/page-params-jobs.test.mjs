// A ship job and the run log tell the looks of one page apart.
//   node --test tests/lib/page-params-jobs.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { PARAMS_ENV } from '../../harness/lib/page-params.mjs';
import { sameRender } from '../../harness/lib/ship-status.mjs';
import { devEvent, shipEvent } from '../../harness/lib/run-events.mjs';

const PAGE = 'films/my-film/page.html';
const withParams = (query, fn) => {
  const had = process.env[PARAMS_ENV];
  process.env[PARAMS_ENV] = query;
  try { return fn(); } finally { if (had === undefined) delete process.env[PARAMS_ENV]; else process.env[PARAMS_ENV] = had; }
};

test('a ship job is cancelled only by a render of the same page and the same params', () => {
  assert.equal(sameRender({ page: PAGE, query: 'look=a' }, PAGE, 'look=a'), true);
  assert.equal(sameRender({ page: PAGE, query: 'look=a' }, PAGE, 'look=b'), false);
  assert.equal(sameRender({ page: PAGE }, PAGE, ''), true);
  assert.equal(sameRender({ page: PAGE }, 'films/other/page.html', ''), false);
});

test('run events record the params', () => {
  const dev = withParams('look=riso', () => devEvent({ tier: 'draft', wallS: 1, phases: {}, shape: {}, checks: [] }));
  assert.equal(dev.params, 'look=riso');
  assert.equal(withParams('look=riso', () => shipEvent({ verdict: null, renderS: 1 })).params, 'look=riso');
  assert.equal('params' in shipEvent({ verdict: null, renderS: 1 }), false);
});
