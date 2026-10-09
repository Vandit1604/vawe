import assert from 'node:assert/strict';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { fitGrid } from '../../core/beats/detect.js';
import { cutTimesOf, cutsVsSound, hitKind, pageAudio, pageBed, placeSound, readSound } from '../../harness/lib/sound-read.mjs';

const DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), '../fixtures/truth/beat');

test('fitGrid recovers the true period from a coarse one and ignores off-beat onsets', () => {
  const times = [0.3, 0.9, 1.5, 1.8, 2.1, 2.7, 3.3];
  const fit = fitGrid(times, 0.6193, 0.31);
  assert.ok(Math.abs(fit.periodSeconds - 0.6) < 1e-6);
  assert.ok(Math.abs(fit.phaseSeconds - 0.3) < 1e-6);
  assert.equal(fitGrid([0.3, 0.9], 0.6, 0.3), null);
});

test('hitKind: soft under 0.25, sustained on a slow rise, else hit', () => {
  assert.equal(hitKind({ strength: 0.1, errMs: 1 }), 'soft');
  assert.equal(hitKind({ strength: 0.9, errMs: 60 }), 'sustained');
  assert.equal(hitKind({ strength: 0.9, errMs: 2 }), 'hit');
});

test('readSound finds the tempo and the strikes of the beat fixture', () => {
  const sound = readSound(path.join(DIR, 'track.wav'), { cache: false });
  assert.ok(Math.abs(sound.tempo.bpm - 100) < 1);
  assert.equal(sound.onsets.length, 14);
  assert.ok(sound.tempo.usable);
});

test('cutsVsSound: on beat within 1 frame, near within 3, off beyond, with the second to move to', () => {
  const placed = placeSound(readSound(path.join(DIR, 'track.wav'), { cache: false }));
  const { rows, onBeat } = cutsVsSound([1.5, 1.52, 4.5667, 5.8333], placed, 30);
  assert.deepEqual(rows.map((r) => r.verdict), ['on beat', 'on beat', 'near', 'off']);
  assert.equal(onBeat, 2);
  assert.ok(Math.abs(rows[3].move - 5.7) < 0.01);
  assert.equal(rows[0].move, null);
});

test('cutTimesOf puts each world start on its frame and drops the first world', () => {
  const cuts = cutTimesOf([{ id: 'a', start: 0 }, { id: 'b', start: 1.5 }, { id: 'c', start: 4.57 }, { id: 'd', start: null }], 30);
  assert.deepEqual(cuts, [1.5, 137 / 30]);
});

test('pageBed reads the looping local audio tag and its offset', () => {
  const html = '<audio loop src="a.wav" data-at="2" data-trim="0.5"></audio><audio data-synth="pluck" data-at="1"></audio>';
  assert.deepEqual(pageAudio(html).map((a) => a.loop), [true, false]);
  assert.equal(pageBed(html, path.join(DIR, 'page.html')), null);
  const bed = pageBed('<audio loop src="track.wav" data-at="2" data-trim="0.5"></audio>', path.join(DIR, 'page.html'));
  assert.equal(bed.offset, 1.5);
});
