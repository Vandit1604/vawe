// harness/lib/ref-measure/world-turns.mjs: the shot boundaries where the dominant colour jumps, so the film
// turns into a new colour world. Reads the per-shot dominant colours of colour.mjs.
import { r3 } from '../move-fit.mjs';
import { deltaE } from './colour.mjs';

export const TURN_DE = 15;

export function worldTurns(perShot, seconds) {
  const times = [];
  for (let i = 1; i < perShot.length; i++) if (deltaE(perShot[i].dominant, perShot[i - 1].dominant) > TURN_DE) times.push(perShot[i].t0);
  return { thresholdDE: TURN_DE, count: times.length, per10s: seconds > 0 ? r3((times.length / seconds) * 10) : null, times };
}
