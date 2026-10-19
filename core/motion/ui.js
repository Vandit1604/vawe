// Product UI motion, measured on the everestchris component clips (ChatGPT, Vercel Analytics, 30 fps, read off frames, plus or minus 33 ms).
// Durations are milliseconds, because these feed Web Animations; core/motion/README.md section "Product UI presets" gives each source.
export const UI = {
  typing: { charMs: 30, spaceMs: 70, jitter: 0.25 },
  stream: { gapMs: [55, 110], fadeMs: 200, tintMs: 500 },
  send: { k: 500, d: 25 },
  panel: { fadeMs: 220, rise: '0.8vh' },
  row: { fadeMs: 300, rise: '1vh', staggerMs: 70 },
  roll: { outMs: 150, inMs: 260, rise: '0.8vh' },
  exit: { ms: 300, endGapMs: 100, drift: '-1.2vh' },
  snap: { overshoot: [0.09, 0.2] },
};
