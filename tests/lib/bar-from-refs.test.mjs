import test from 'node:test';
import assert from 'node:assert/strict';
import { quantile, referenceFilms, barOf } from '../../harness/dev/bar-from-refs.mjs';

const film = (group, speed, over, text, dwell, extra = {}) => ({ group, spec: { peak_speed_p90_fh_s: speed, overshoot_share: over, text_time_share: text, word_dwell_s_median: dwell }, ...extra });

test('quantile interpolates between ranks like numpy', () => {
  assert.equal(quantile([1, 2, 3, 4], 0.5), 2.5);
  assert.equal(quantile([10, 20, 30, 40, 50], 0.1), 14);
  assert.equal(quantile([5], 0.9), 5);
  assert.equal(quantile([], 0.5), null);
  assert.equal(quantile([3, null, 1], 0.5), 2);
});

test('our films and films out of scope do not set the bar', () => {
  const measures = { a: film('product', 5, 0.2, 0.5, 1), b: film('studio', 9, 0.4, 0.8, 2), c: film('ours', 30, 0, 0.94, 4), d: film('studio', 50, 0.9, 0.9, 9, { out_of_scope: true }), e: { group: 'product' } };
  assert.equal(referenceFilms(measures).length, 2);
  const bar = barOf(measures);
  assert.equal(bar.films, 2);
  assert.deepEqual(bar.peak_speed_p90_fh_s, { p10: 5.4, median: 7, p90: 8.6, n: 2 });
  assert.equal(bar.overshoot_pct.median, 30);
  assert.equal(bar.text_time_pct.p90, 77);
});

test('a film with no word dwell is left out of that metric only', () => {
  const bar = barOf({ a: film('product', 5, 0.2, 0.5, 1), b: film('studio', 9, 0.4, 0, null) });
  assert.equal(bar.word_dwell_s_median.n, 1);
  assert.equal(bar.text_time_pct.n, 2);
});
