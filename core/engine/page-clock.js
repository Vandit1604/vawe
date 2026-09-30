// core/engine/page-clock.js: the virtual clock a bare HTML page runs under while it is rendered.
// harness/media/render-page.mjs injects installPageClock's source with evaluateOnNewDocument, so it runs
// before any page script; the page then sees time and randomness as pure functions of the seek time.
//
//   Date, performance.now   film time in ms
//   requestAnimationFrame   callbacks flush once per set(t) with film time
//   setTimeout/setInterval  fire when set(t) passes their due time, in due order
//   Math.random             mulberry32, reseeded from t on every set(t): same t, same sequence
//
// Lifted from installVirtualClock in core/engine/boot.js, which keys on frame numbers for the JSON
// engine. A page is seeked in fractional seconds (subframe blur, 59.94 masters), so this keys on t.
// installPageClock serializes with toString(), so it must not reference anything outside its body.
// The real timers stay reachable as window.__pageClock.real for the renderer's own paint barrier.
// pending() counts the rAF callbacks and timers still waiting: at 0, time can change the page only
// through its animations, which lets the renderer reuse a capture when their state repeats.
export function installPageClock() {
  if (typeof window === 'undefined' || window.__pageClock) return;
  const real = {
    raf: window.requestAnimationFrame.bind(window),
    setTimeout: window.setTimeout.bind(window),
    clearTimeout: window.clearTimeout.bind(window),
  };
  const RealDate = Date;
  let ms = 0;
  let seed = 0;
  const rafQ = new Map(); let rafId = 0;
  const timers = new Map(); let timerId = 0;
  const MAX_CATCH_UP = 1000;

  window.Date = class extends RealDate {
    constructor(...a) { if (a.length) super(...a); else super(ms); }
    static now() { return ms; }
  };
  performance.now = () => ms;
  Math.random = () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  window.requestAnimationFrame = (cb) => { rafQ.set(++rafId, cb); return rafId; };
  window.cancelAnimationFrame = (id) => { rafQ.delete(id); };
  const schedule = (cb, delay, args, every) => {
    if (typeof cb !== 'function') return 0;
    const id = ++timerId;
    timers.set(id, { at: ms + Math.max(0, Number(delay) || 0), cb, args, every });
    return id;
  };
  window.setTimeout = (cb, delay = 0, ...args) => schedule(cb, delay, args, 0);
  window.setInterval = (cb, delay = 0, ...args) => schedule(cb, delay, args, Math.max(1, Number(delay) || 1));
  window.clearTimeout = window.clearInterval = (id) => { timers.delete(id); };

  const fireDue = () => {
    for (let n = 0; n < MAX_CATCH_UP; n++) {
      let next = null; let nextId = 0;
      for (const [id, tm] of timers) if (tm.at <= ms && (!next || tm.at < next.at)) { next = tm; nextId = id; }
      if (!next) return;
      if (next.every) next.at += next.every; else timers.delete(nextId);
      next.cb(...next.args);
    }
  };

  window.__pageClock = {
    set(seconds) {
      ms = seconds * 1000;
      seed = Math.round(ms * 1000) * 2654435761 | 0;
      fireDue();
      const q = [...rafQ.values()]; rafQ.clear();
      for (const cb of q) cb(ms);
    },
    now: () => ms,
    pending: () => rafQ.size + timers.size,
    real,
  };
}
