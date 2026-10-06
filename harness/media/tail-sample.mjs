// The tail's DOM evidence: how many Web Animations run on a visible element at times in the last second.
// The decision is in harness/lib/tail-motion.mjs. A page that paints in window.seek has no animation to count.
import { SHOWS_SOURCE, SEEN_MIN_OPACITY } from './world-sample.mjs';
import { tailTimes } from '../lib/tail-motion.mjs';

// Runs inside the page, bundled with elementShows. The page seek pauses every animation, and this Chromium reports no timing phase, so active is read from the times.
function runningOnVisible(minOpacity) {
  const active = (a) => {
    const t = a.effect.getComputedTiming();
    return a.currentTime >= t.delay && a.currentTime < t.endTime;
  };
  return document.getAnimations().filter((a) => a.effect?.target && active(a) && elementShows(a.effect.target, minOpacity)).length;
}

const SOURCE = `${SHOWS_SOURCE}\n${runningOnVisible.toString()}`;

/** [n] per tail sample time: the animations running on a visible element. `seek(ms)` is a layout seek. */
export async function sampleTail(page, dur, seek) {
  const counts = [];
  for (const t of tailTimes(dur)) {
    await seek(t * 1000);
    counts.push(await page.evaluate((src, o) => new Function(`${src}\nreturn runningOnVisible(${o});`)(), SOURCE, SEEN_MIN_OPACITY));
  }
  return counts;
}
