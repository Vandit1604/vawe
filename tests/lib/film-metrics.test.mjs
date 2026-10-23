import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { filmMetrics, coveredSeconds, readableWords } from '../../harness/lib/ref-measure/film-metrics.mjs';
import { measuresOf, barOf } from '../../harness/dev/bar-from-refs.mjs';

const el = (peakSpeed, overshoot, movingFrames = 5, easing = { class: 'spring' }) => ({ peakSpeed, overshoot, movingFrames, easing });
const word = (text, t0, t1, h = 40) => ({ word: text, t0, t1, h });

const spec = (elements, words) => ({
  fps: 30, duration: 10, media: { height: 400 },
  shots: [{ elements }],
  textLines: [{ words }],
});

test('peak speed is in frame heights per second, from px per frame', () => {
  const m = filmMetrics(spec([el(4, 1), el(8, 1), el(12, 1)], []));
  assert.equal(m.peak_speed_median_fh_s, 0.6);
  assert.equal(m.peak_speed_p90_fh_s, 0.84);
});

test('an element with fewer than 3 moving frames or no easing is not an arrival', () => {
  const m = filmMetrics(spec([el(40, 1.2, 2), el(40, 1.2, 5, null), el(4, 1.0)], []));
  assert.equal(m.peak_speed_p90_fh_s, 0.3);
  assert.equal(m.overshoot_share, 0);
});

test('overshoot share counts arrivals over 1.05', () => {
  const m = filmMetrics(spec([el(1, 1.05), el(1, 1.06), el(1, 1.3), el(1, null)], []));
  assert.equal(m.overshoot_share, 0.67);
});

test('text time is the union of word intervals, words under 3 letters and half-frame words are left out', () => {
  const words = [word('alpha', 0, 4), word('beta', 2, 6), word('a!', 7, 9), word('HUGE', 8, 9, 300)];
  assert.deepEqual(readableWords(spec([], words)).map((w) => w.word), ['alpha', 'beta']);
  assert.equal(coveredSeconds(words.slice(0, 2)), 6);
  const m = filmMetrics(spec([], words));
  assert.equal(m.text_time_share, 0.6);
  assert.equal(m.word_dwell_s_median, 4);
});

test('a film with no words or arrivals gives null, and zero text time', () => {
  assert.deepEqual(filmMetrics(spec([], [])), { peak_speed_median_fh_s: null, peak_speed_p90_fh_s: null, overshoot_share: null, text_time_share: 0, word_dwell_s_median: null });
});

test('measuresOf reads each registered spec.json and barOf leaves out a film out of scope', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'bar-'));
  const registry = [{ id: 'a', type: 'product', inScope: true, spec: 'spec/a/spec.json' }, { id: 'b', type: 'brand', inScope: false, spec: 'spec/b/spec.json' }, { id: 'c', type: 'brand', inScope: true }];
  fs.writeFileSync(path.join(dir, 'refs.json'), JSON.stringify(registry));
  for (const id of ['a', 'b']) {
    fs.mkdirSync(path.join(dir, 'spec', id), { recursive: true });
    fs.writeFileSync(path.join(dir, 'spec', id, 'spec.json'), JSON.stringify(spec([el(12, 1.3)], [word('hello', 0, 2)])));
  }
  const measures = measuresOf(dir);
  assert.deepEqual(Object.keys(measures), ['a', 'b']);
  assert.equal(measures.b.out_of_scope, true);
  const bar = barOf(measures);
  assert.equal(bar.films, 1);
  assert.equal(bar.overshoot_pct.median, 100);
  assert.equal(bar.word_dwell_s_median.median, 2);
});
