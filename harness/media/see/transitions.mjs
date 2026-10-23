// The shot changes of a rendered video as [{ startT, endT, type, frames }], found by the finder the references use (harness/lib/ref-measure/transition.mjs).
// startT is the time of the first changing frame, endT the first frame of the new shot.
import fs from 'node:fs';
import path from 'node:path';
import { decode } from '../../lib/ref-measure/decode.mjs';
import { findTransitions } from '../../lib/ref-measure/transition.mjs';
import { scratchBase } from '../../lib/scratch.mjs';
import { probeVideo } from './core.mjs';

const GRID_W = 160;
const MAX_FRAMES = 2400;
const MAX_FPS = 30;

export function videoTransitions(video) {
  const { width, height, dur, fps: sourceFps } = probeVideo(video);
  const fps = Math.min(sourceFps, MAX_FPS, Math.floor(((MAX_FRAMES - 2) / dur) * 100) / 100);
  const dir = fs.mkdtempSync(path.join(scratchBase(), 'transitions-'));
  try {
    const V = decode(video, fps, dir, width, height, GRID_W, MAX_FRAMES);
    return findTransitions(V).map((t) => ({ startT: +(t.startFrame / fps).toFixed(3), endT: +(t.endFrame / fps).toFixed(3), type: t.type, frames: t.frames }));
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}
