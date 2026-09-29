// harness/lib/audio-onsets.mjs: decode a rendered mp4's audio once and find where sound starts.
//
// One ffmpeg pass to mono PCM, one pass over the samples for a short-window loudness envelope and its
// onsets (a sudden rise over the trailing floor). No library, the same arithmetic as the pixel sweeps.
// Owned here so audio-render-check (scene JSON) and page-check (page) read the same onsets.
import { spawnSync } from 'node:child_process';

export const SR = 8000;
const WIN = Math.round(SR * 0.02);
const HOP = Math.round(SR * 0.01);
const DB_FLOOR = -60;

// Onset: this window's loudness jumps ONSET_DB over the trailing 300 ms floor and clears an absolute
// noise floor. Onsets inside MERGE_S merge into the first, the way buildSfx merges simultaneous cues.
const TRAIL_WIN = Math.round(0.3 / (HOP / SR));
const ONSET_DB = 8, NOISE_FLOOR_DB = -45, MERGE_S = 0.1;

/** decodeMono(file, sr) -> { samples: Float32Array, error } . `error` is set when there is no readable track. */
export function decodeMono(file, sr = SR) {
  const r = spawnSync('ffmpeg', ['-v', 'error', '-i', file, '-vn', '-ac', '1', '-ar', String(sr), '-f', 'f32le', '-'],
    { maxBuffer: 1 << 29 });
  if (r.status !== 0 || !r.stdout || r.stdout.length < sr * 4) {
    return { samples: null, error: (r.stderr || '').toString().trim().split('\n')[0] || 'no output' };
  }
  return { samples: new Float32Array(r.stdout.buffer, r.stdout.byteOffset, Math.floor(r.stdout.length / 4)), error: null };
}

/** envelopeOf(samples) -> [{t, db}], 20 ms windows every 10 ms. */
export function envelopeOf(samples) {
  const rmsDb = (start) => {
    let sum = 0;
    for (let i = start; i < start + WIN && i < samples.length; i++) sum += samples[i] * samples[i];
    const rms = Math.sqrt(sum / WIN);
    return rms > 0 ? 20 * Math.log10(rms) : DB_FLOOR;
  };
  const envelope = [];
  for (let s = 0; s + WIN <= samples.length; s += HOP) envelope.push({ t: s / SR, db: rmsDb(s) });
  return envelope;
}

/** onsetsOf(envelope) -> [{t, db}] */
export function onsetsOf(envelope) {
  const onsets = [];
  for (let i = 0; i < envelope.length; i++) {
    if (envelope[i].db < NOISE_FLOOR_DB) continue;
    let floor = envelope[i].db;
    for (let k = Math.max(0, i - TRAIL_WIN); k < i; k++) floor = Math.min(floor, envelope[k].db);
    if (envelope[i].db - floor >= ONSET_DB) {
      if (!onsets.length || envelope[i].t - onsets[onsets.length - 1].t > MERGE_S) onsets.push({ t: envelope[i].t, db: envelope[i].db });
    }
  }
  return onsets;
}

/** meanDb(envelope, t0, t1) -> mean of the window's dB values, or null when the window holds none. */
export function meanDb(envelope, t0, t1) {
  const w = envelope.filter((p) => p.t >= t0 && p.t < t1);
  return w.length ? w.reduce((a, p) => a + p.db, 0) / w.length : null;
}
