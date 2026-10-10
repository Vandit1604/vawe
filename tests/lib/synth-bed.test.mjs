// The synth bed has a pulse at data-bpm, so `vawe sound <page> --cuts <page>` can read its grid.
//   node --test tests/lib/synth-bed.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { writeSynthBed } from '../../harness/lib/synth-bed.mjs';
import { readSound } from '../../harness/lib/sound-read.mjs';
import { bedBeats, BED_LOOP_SAMPLES } from '../../core/audio/palette.mjs';
import { SR } from '../../core/audio/dsp.mjs';

test('the bed reads as a usable tempo near data-bpm, over a film longer than one loop', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'synth-bed-'));
  try {
    const file = writeSynthBed({ bpm: 120 }, 25, dir);
    const sound = readSound(file, { cache: false });
    const snapped = bedBeats(120) * 60 / (BED_LOOP_SAMPLES / SR);
    assert.ok(sound.duration >= 25, `bed covers ${sound.duration} s`);
    assert.ok(sound.tempo.usable, `tempo not usable: ${JSON.stringify(sound.tempo)}`);
    assert.ok(Math.abs(sound.tempo.bpm - snapped) / snapped < 0.03, `read ${sound.tempo.bpm} BPM, wrote ${snapped}`);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});
