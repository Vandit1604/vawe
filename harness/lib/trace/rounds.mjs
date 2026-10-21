const inWindow = (ms, from, to) => ms > from && ms <= to;
const minutes = (ms) => Number((ms / 60000).toFixed(1));
const isRender = (e) => !e.help && ['dev', 'ship'].includes(e.verb) && !/--(status|wait)\b/.test(e.args);

function boundsOf(fold) {
  const { startMs, endMs } = fold.meta;
  const starts = [{ ms: startMs, text: 'first request' }, ...fold.notes];
  return starts.map((note, i) => ({ note, from: note.ms, to: fold.notes[i]?.prevMs ?? endMs, next: fold.notes[i]?.ms ?? Infinity }));
}

function sumUsage(fold, from, to) {
  let cacheWrite = 0;
  let cacheRead = 0;
  for (const u of fold.usageAt.values()) {
    if (u.ms >= from && u.ms <= to) {
      cacheWrite += u.cacheWrite;
      cacheRead += u.cacheRead;
    }
  }
  return { cacheWrite, cacheRead };
}

/** One entry per round: a round starts at the first request or at a user text row after it. Pure over a fold and its verb events. */
export function roundsOf(fold, events) {
  if (fold.meta.startMs === undefined) return [];
  const { calls } = fold;
  return boundsOf(fold).map(({ note, from, to, next }, index) => {
    const mine = calls.filter((c) => c.ms >= from && c.ms < next);
    const renders = events.filter((e) => isRender(e) && calls[e.call].ms >= from && calls[e.call].ms < next);
    const activeMs = fold.active.filter((a) => inWindow(a.ms, from, to)).reduce((t, a) => t + a.dt, 0);
    return {
      index: index + 1, note: note.text,
      startMin: minutes(from - fold.meta.startMs), endMin: minutes(to - fold.meta.startMs),
      wallMin: minutes(to - from), activeMin: minutes(Math.min(activeMs, to - from)),
      calls: mine.length, renders: renders.length, renderSecs: Math.round(renders.reduce((t, e) => t + (e.secs ?? e.callSecs), 0)),
      ...sumUsage(fold, from, to),
    };
  });
}
