import fs from 'node:fs';
import path from 'node:path';
import { CUES, renderCueStereo, normalizeStereo, encodeWav } from '../../core/audio/kit.mjs';
import { SR } from '../../core/audio/dsp.mjs';

const BED_SEED = 1;

/** Writes the page's synth bed (<audio data-synth="bed">), looped to cover `seconds`, as a wav in `dir`, so it is read like any music file. Returns the path. */
export function writeSynthBed(bed, seconds, dir) {
  const loop = normalizeStereo(renderCueStereo(CUES.bed, BED_SEED, bed.bpm == null ? {} : { bpm: bed.bpm }));
  const n = Math.max(loop[0].length, Math.ceil(seconds * SR));
  const tiled = loop.map((ch) => Float32Array.from({ length: n }, (_, i) => ch[i % ch.length]));
  const file = path.join(dir, 'bed-synth.wav');
  fs.writeFileSync(file, encodeWav(tiled));
  return file;
}
