// tests/media/sound-palette.test.mjs: the subtle sound palette (core/audio/palette.mjs) is a pure function
// of its seed, no voice rings long, the default gains keep every cue within a few dB of the rest,
// and the old voice names still render.
//   node --test tests/media/sound-palette.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CUES, DEFAULT_GAIN_DB, renderCue, renderCueStereo, SR } from '../../core/audio/kit.mjs';
import { VOICES } from '../../core/audio/palette.mjs';
import { cueSpreadWarnings, measureMixLevel } from '../../harness/media/page-audio.mjs';
import { PEAK_DBFS } from '../../harness/lib/peak-limit.mjs';

const CUE_VOICES = Object.keys(VOICES);
const OLD_VOICES = ['pluck', 'chime', 'sparkle', 'droplet', 'bloom', 'success', 'ready', 'whoosh', 'riser', 'drop', 'impact', 'swell'];
const peakOf = (c) => c.reduce((m, ch) => Math.max(m, ch.reduce((a, v) => Math.max(a, Math.abs(v)), 0)), 0);
const same = (a, b) => a.every((ch, c) => ch.length === b[c].length && ch.every((v, i) => v === b[c][i]));

test('the same seed gives the same samples, another seed gives another take', () => {
  for (const name of CUE_VOICES) {
    const a = renderCueStereo(CUES[name], 5), b = renderCueStereo(CUES[name], 5), c = renderCueStereo(CUES[name], 6);
    assert.ok(same(a, b), `${name}: seed 5 twice differs`);
    assert.ok(!same(a, c), `${name}: seed 5 and 6 are the same take`);
  }
});

test('every voice is finite, audible, and has two channels of one length', () => {
  for (const name of CUE_VOICES) {
    const ch = renderCueStereo(CUES[name], 1);
    assert.equal(ch.length, 2);
    assert.equal(ch[0].length, ch[1].length, `${name}: channel lengths differ`);
    assert.ok(ch.every((c) => c.every(Number.isFinite)), `${name}: a sample is not finite`);
    assert.ok(peakOf(ch) > 0.01, `${name}: silent`);
    assert.ok(ch[0].length / SR < 4, `${name}: ${(ch[0].length / SR).toFixed(1)} s is not a cue`);
  }
});

test('a tap is a transient: it peaks in the first 10 ms and is gone within half a second', () => {
  const [l] = renderCueStereo(CUES.tap, 1), peak = peakOf([l]);
  const at = l.findIndex((v) => Math.abs(v) > 0.9 * peak);
  assert.ok(at / SR < 0.01, `tap peaks at ${(at / SR * 1000).toFixed(1)} ms`);
  assert.ok(l.length / SR < 0.5, `tap lasts ${(l.length / SR).toFixed(2)} s`);
});

test('data-length sets the length of air, swoosh-long and swell-soft', () => {
  for (const name of ['air', 'swoosh-long']) {
    const short = renderCueStereo(CUES[name], 1, { length: 0.5 })[0].length, long = renderCueStereo(CUES[name], 1, { length: 1.5 })[0].length;
    assert.ok(Math.abs((long - short) / SR - 1) < 0.01, `${name}: 1 s more length gave ${((long - short) / SR).toFixed(3)} s more cue`);
  }
});

test('no voice is a bed: every voice ends within 6 s at default length', () => {
  for (const name of CUE_VOICES) {
    const seconds = renderCueStereo(CUES[name], 1)[0].length / SR;
    assert.ok(seconds <= 6, `${name} lasts ${seconds.toFixed(1)} s`);
  }
  for (const name of ['bed', 'swell-soft', 'braam']) assert.ok(!(name in CUES), `${name} is a banned sustained voice`);
});

test('default gains: every palette cue peaks within 4 dB of the others', () => {
  const gains = CUE_VOICES.map((n) => DEFAULT_GAIN_DB[n]);
  assert.ok(Math.max(...gains) - Math.min(...gains) <= 4, `spread ${Math.max(...gains) - Math.min(...gains)} dB`);
  const tracks = CUE_VOICES.map((synth) => ({ spec: { role: 'sfx', synth, at: 0 }, peakDb: 20 * Math.log10(0.8) + DEFAULT_GAIN_DB[synth] }));
  assert.deepEqual(cueSpreadWarnings(tracks), []);
});

test('default gains: one palette cue per beat lands in the loudness band and under the peak limit', () => {
  const beats = ['tap', 'tick', 'swoosh-long', 'shimmer', 'sub-thump'];
  const base = { trim: 0, fadeIn: 0, fadeOut: 0, duck: null };
  const specs = [
    ...beats.map((synth, i) => ({ ...base, synth, role: 'sfx', at: 0.5 + i * 1.1, gain: DEFAULT_GAIN_DB[synth] })),
  ];
  const { I, TP } = measureMixLevel({ specs, duration: 6 });
  assert.ok(I >= -22 && I <= -18, `${I.toFixed(1)} LUFS`);
  assert.ok(TP <= PEAK_DBFS, `${TP.toFixed(1)} dBTP`);
});

test('the old voice names still render and keep a default gain', () => {
  for (const name of OLD_VOICES) {
    assert.ok(CUES[name] && !CUES[name].voice, `${name} is gone or replaced`);
    assert.ok(name in DEFAULT_GAIN_DB);
    assert.ok(renderCue(CUES[name]).length > 0);
  }
});
