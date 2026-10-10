// The tail's DOM evidence: the Web Animations that run on a visible element at times in the last second, each as
// { id, props, duration, fullFrame, decorative }. The decision is in harness/lib/tail-motion.mjs. A page that paints in window.seek has no animation to read.
import { SHOWS_SOURCE, SEEN_MIN_OPACITY } from './world-sample.mjs';
import { tailTimes } from '../lib/tail-motion.mjs';
import { DECORATIVE } from '../lib/draft-check.mjs';

// Runs inside the page, bundled with elementShows. The page seek pauses every animation, and this Chromium reports no timing phase, so active is read from the times.
function runningOnVisible(minOpacity) {
  const active = (a) => {
    const t = a.effect.getComputedTiming();
    return a.currentTime >= t.delay && a.currentTime < t.endTime;
  };
  const area = innerWidth * innerHeight;
  return document.getAnimations().filter((a) => a.effect?.target && active(a) && elementShows(a.effect.target, minOpacity)).map((a) => {
    const box = a.effect.target.getBoundingClientRect();
    return {
      id: a.id || a.animationName || '', duration: (a.effect.getComputedTiming().duration || 0) / 1000,
      props: [...new Set(a.effect.getKeyframes().flatMap((f) => Object.keys(f).filter((p) => !['offset', 'computedOffset', 'easing', 'composite'].includes(p))))],
      fullFrame: box.width * box.height >= 0.6 * area, decorative: Boolean(a.effect.target.closest(DECORATIVE)),
    };
  });
}

const SOURCE = `const DECORATIVE = ${JSON.stringify(DECORATIVE)};\n${SHOWS_SOURCE}\n${runningOnVisible.toString()}`;

/** The animations running on a visible element, per tail sample time. `seek(ms)` is a layout seek. */
export async function sampleTail(page, dur, seek) {
  const counts = [];
  for (const t of tailTimes(dur)) {
    await seek(t * 1000);
    counts.push(await page.evaluate((src, o) => new Function(`${src}\nreturn runningOnVisible(${o});`)(), SOURCE, SEEN_MIN_OPACITY));
  }
  return counts;
}
