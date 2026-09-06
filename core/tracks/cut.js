// core/tracks/cut.js: a declared `cut` owns this layer's enter and exit styling, in place of the
// plain fade driveClips wrote a moment earlier. FIRST in the pipeline for that reason: it writes a
// whole style block (transform, opacity, clip-path, filter) and everything after it composes onto
// what it left, so anything running before it would be overwritten without a word.
import { cutStyle } from '../cuts/index.js';
import { clamp01 } from '../motion/motion.js';

export const slot = 'enter';

// Everything but `cut` itself is inside the guard: a layer that states a `dist` or a `cutTiming` and no
// `cut` is describing a transition it never declared, and the frame is identical without it.
export const PROPS = {
  cut: {},
  enterDur: { when: 'cut' }, exitDur: { when: 'cut' },
  dir: { when: 'cut' }, dist: { when: 'cut' }, cutTiming: { when: 'cut' },
  cx: { when: 'cut' }, cy: { when: 'cut' },
};

export function frame(kit, el, L, units, t, f, start, end) {
  if (!(L.cut && t >= start && t < end)) return;
  const enD = L.enterDur ?? 0.5, exD = L.exitDur ?? 0.5;
  const enter = enD > 0 ? clamp01((t - start) / enD) : 1;
  const exit = exD > 0 ? clamp01((t - (end - exD)) / exD) : 0;
  Object.assign(el.style, cutStyle(L.cut, { enter, exit }, { dir: L.dir, dist: L.dist ?? 110, timing: L.cutTiming, cx: L.cx, cy: L.cy }));
}
