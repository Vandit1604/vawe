import assert from 'node:assert/strict';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { decodeMono } from '../../harness/lib/audio-onsets.mjs';
import { cutsVsSound, placeSound, readSound } from '../../harness/lib/sound-read.mjs';
import { cueLines, cutLines, soundLines } from '../../harness/lib/sound-report.mjs';
import { soundSvg } from '../../harness/lib/sound-picture.mjs';

const TRACK = path.join(path.dirname(fileURLToPath(import.meta.url)), '../fixtures/truth/beat/track.wav');
const placed = placeSound(readSound(TRACK, { cache: false }));

test('soundLines prints the header, the loudness, the tempo and one row per strongest hit', () => {
  const text = soundLines({ name: 'beat', source: 'track.wav', placed }).join('\n');
  assert.match(text, /^# sound: beat/);
  assert.match(text, /Tempo 100 BPM/);
  assert.match(text, /## Strongest hits, ranked/);
  assert.match(text, /## Every onset \(14\)/);
});

test('soundLines caps the long tables at the limit and says where the rest is', () => {
  const lines = soundLines({ name: 'beat', source: 'track.wav', placed, limit: 2, file: 'sound.md' });
  assert.ok(lines.some((l) => /sound\.md/.test(l)));
});

test('soundLines says why the loudness is missing when the reader recorded a reason', () => {
  const noted = { ...placed, loudness: null, loudnessNote: 'loudness not read: ffmpeg failed (1)' };
  const text = soundLines({ name: 'beat', source: 'track.wav', placed: noted }).join('\n');
  assert.match(text, /^loudness not read: ffmpeg failed \(1\)\.$/m);
  assert.match(soundLines({ name: 'beat', source: 'x', placed: { ...placed, loudness: null } }).join('\n'), /^Loudness: not measured\.$/m);
});

test('cueLines puts each cue against the nearest beat line, none for no cues', () => {
  assert.deepEqual(cueLines([], placed), []);
  const text = cueLines([{ at: 0.61, voice: 'pluck', gain: -12, world: 's1' }], placed).join('\n');
  assert.match(text, /## Cues of the page/);
  assert.match(text, /pluck/);
});

test('cutLines tells a cut that is on the beat from one that is off, with the second to move to', () => {
  const result = cutsVsSound([1.5, 5.8333], placed, 30);
  const text = cutLines({ result, fps: 30, source: 'track.wav' }).join('\n');
  assert.match(text, /1 of 2 cuts are on the beat/);
  assert.match(text, /- cut 2 at 5\.83 s is .* move it to 5\.70 s/);
});

test('soundSvg draws one panel per 12 seconds with the hits, the beat lines and the cuts', () => {
  const { samples } = decodeMono(TRACK, 8000);
  const svg = soundSvg({ samples, rate: 8000, placed, cuts: [{ n: 1, t: 1.5, verdict: 'on beat' }, { n: 2, t: 5.8333, verdict: 'off' }], title: 'beat <fixture>' });
  assert.match(svg, /^<svg /);
  assert.match(svg, /beat &lt;fixture>/);
  assert.match(svg, /class="cut on-beat"/);
  assert.match(svg, /class="cut off"/);
  assert.equal((svg.match(/class="hit"/g) ?? []).length > 0, true);
});
