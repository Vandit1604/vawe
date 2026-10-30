// A ship job and the run log tell the looks of one page apart.
//   node --test tests/lib/page-params-jobs.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { PARAMS_ENV, ASPECT_ENV, paramsFilm } from '../../harness/lib/page-params.mjs';
import { sameRender } from '../../harness/lib/ship-status.mjs';
import { devEvent, shipEvent } from '../../harness/lib/run-events.mjs';

const PAGE = 'films/my-film/page.html';
const withParams = (query, fn) => {
  const had = process.env[PARAMS_ENV];
  process.env[PARAMS_ENV] = query;
  try { return fn(); } finally { if (had === undefined) delete process.env[PARAMS_ENV]; else process.env[PARAMS_ENV] = had; }
};

test('a ship job is cancelled only by a render of the same page and the same params', () => {
  assert.equal(sameRender({ page: PAGE, film: 'my-film-look-a' }, PAGE, 'my-film-look-a'), true);
  assert.equal(sameRender({ page: PAGE, film: 'my-film-look-a' }, PAGE, 'my-film-look-b'), false);
  assert.equal(sameRender({ page: PAGE, film: 'my-film' }, PAGE, 'my-film'), true);
  assert.equal(sameRender({ page: PAGE, film: 'my-film' }, 'films/other/page.html', 'my-film'), false);
});

test('a job of another aspect is another render', () => {
  const film = (env) => paramsFilm('my-film', env);
  assert.equal(sameRender({ page: PAGE, film: film({}) }, PAGE, film({ [ASPECT_ENV]: '1200:630' })), false);
  assert.equal(sameRender({ page: PAGE, film: film({ [ASPECT_ENV]: '1200:630' }) }, PAGE, film({ [ASPECT_ENV]: '1200:630' })), true);
});

test('run events record the aspect', () => {
  const had = process.env[ASPECT_ENV];
  process.env[ASPECT_ENV] = '2:1';
  try {
    assert.equal(devEvent({ tier: 'draft', wallS: 1, phases: {}, shape: {}, checks: [] }).aspect, '2:1');
    assert.equal(shipEvent({ verdict: null, renderS: 1 }).aspect, '2:1');
  } finally { if (had === undefined) delete process.env[ASPECT_ENV]; else process.env[ASPECT_ENV] = had; }
  assert.equal('aspect' in shipEvent({ verdict: null, renderS: 1 }), false);
});

test('run events record the params', () => {
  const dev = withParams('look=riso', () => devEvent({ tier: 'draft', wallS: 1, phases: {}, shape: {}, checks: [] }));
  assert.equal(dev.params, 'look=riso');
  assert.equal(withParams('look=riso', () => shipEvent({ verdict: null, renderS: 1 })).params, 'look=riso');
  assert.equal('params' in shipEvent({ verdict: null, renderS: 1 }), false);
});
