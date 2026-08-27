// scripts/author/build-zerochrome.mjs: generate formats/scene/zerochrome.json.
//
// This film exists to prove one primitive. Its reference (refs/arc-zero-chrome.mp4, measured frame by
// frame) is a browser whose chrome dissolves while the photo grid underneath REFLOWS to fill the space
// the chrome gave up. Same eight photographs the whole time, in a different layout. Before the `w`/`h`
// motion keys existed this engine could not express that at all: it could move a box and it could scale
// one, and scaling a grid magnifies the photographs instead of re-cropping them.
//
// Timings are the reference's own, not invented:
//   0.000-0.467  hold, chrome present
//   0.467-0.817  open   (0.35s)
//   0.817-1.783  hold, full bleed
//   1.783-2.083  close  (0.30s)   <- leaving is FASTER than arriving, and that asymmetry is the craft
//   2.083-3.000  hold
//
// A generator rather than hand-JSON because eight tiles x six keys is 300 numbers, and a layout typed
// by hand is a layout with an arithmetic mistake in it.
import fs from 'node:fs';

const OUT = 'formats/scene/zerochrome.json';
const P = '/assets/brands/zerochrome/photos/architecture-interior-landscape-';
const r = (v) => +v.toFixed(1);

// the reference's clock
const T = { openFrom: 0.467, openTo: 0.817, closeFrom: 1.783, closeTo: 2.083, end: 3.0 };
// NOT a guess, and not a name picked because it sounded like the shape. Displacement per frame ramps
// for ~3 frames, peaks about 15% in, then decays over four times as long, so it is neither easeOut
// (peak at frame one) nor easeInOut (peak at the middle). `make measure refs/arc-zero-chrome.mp4 0.467
// 0.817` fits that curve against every easing the engine has and answers `brake`, residual 0.032, with
// easeOutQuad behind it. The first pass here used `settle` on the reasoning above and was visibly
// wrong: it spent the whole 0.35s budget in the first 40% of it and then held still.
const EASE = 'brake';

// ── the two layouts ────────────────────────────────────────────────────────────────────────────────
// A: chrome present, content starts after the sidebar.  B: chrome gone, content owns the window.
const grid = (x0, y0, w, h, rowH) => {
  const gap = 14, col = (w - gap * 2) / 3, cx = [x0, x0 + col + gap, x0 + col * 2 + gap * 2];
  const ry = [y0, y0 + rowH + gap, y0 + rowH * 2 + gap * 2];
  return [
    { x: cx[0], y: ry[0], w: col, h: rowH },
    { x: cx[1], y: ry[0], w: col, h: rowH },
    { x: cx[2], y: ry[0], w: col, h: rowH },
    { x: cx[0], y: ry[1], w: col * 2 + gap, h: rowH },   // the hero spans two columns
    { x: cx[2], y: ry[1], w: col, h: rowH },
    { x: cx[0], y: ry[2], w: col, h: rowH },
    { x: cx[1], y: ry[2], w: col, h: rowH },
    { x: cx[2], y: ry[2], w: col, h: rowH },
  ];
};
const A = grid(540, 150, 1150, 780, 250);
const B = grid(226, 134, 1468, 812, 261);

// ── layers ─────────────────────────────────────────────────────────────────────────────────────────
const layers = [];

// the window card, which never moves. In the reference the WINDOW is fixed and only its contents
// change, and that is what makes the reflow read as one object rearranging rather than a camera move.
layers.push({
  type: 'rect', id: 'win', x: 210, y: 120, w: 1500, h: 840, radius: 18,
  bg: '#ffffff', elevation: 3, start: 0, duration: T.end, anim: 'none', exitDur: 0,
});

// the chrome: everything that dissolves. One opacity track, shared by every piece via panWith so the
// sidebar cannot drift out of step with the toolbar it belongs to.
const chromeFade = [
  { t: 0, opacity: 1 },
  { t: T.openFrom, opacity: 1, ease: 'linear' },
  { t: T.openTo, opacity: 0, ease: EASE },
  { t: T.closeFrom, opacity: 0, ease: 'linear' },
  { t: T.closeTo, opacity: 1, ease: EASE },
  { t: T.end, opacity: 1, ease: 'linear' },
];
layers.push({
  type: 'rect', id: 'chrome', x: 226, y: 134, w: 298, h: 812, radius: 12,
  bg: '#f4f3f1', start: 0, duration: T.end, anim: 'none', exitDur: 0, motion: chromeFade,
});
// traffic lights, the one place a flat colour is allowed to be literal
['#ff5f57', '#febc2e', '#28c840'].forEach((c, i) => layers.push({
  type: 'rect', x: 250 + i * 22, y: 158, w: 12, h: 12, radius: 6, bg: c,
  start: 0, duration: T.end, anim: 'none', exitDur: 0, panWith: 'chrome',
}));
// the address field and the folder rows
layers.push({
  type: 'rect', x: 246, y: 190, w: 258, h: 34, radius: 8, bg: '#ffffff',
  start: 0, duration: T.end, anim: 'none', exitDur: 0, panWith: 'chrome',
});
['Mood Boarding', 'Art', 'Places', 'Inspo'].forEach((t, i) => layers.push({
  type: 'text', text: t, x: 258, y: 252 + i * 42, w: 240, size: 19,
  weight: i === 0 ? 500 : 600, color: i === 0 ? '#9a9895' : '#2b2a28', align: 'left',
  start: 0, duration: T.end, anim: 'none', exitDur: 0, panWith: 'chrome', critical: false,
}));

// the photo grid: the CONTINUOUS OBJECT. Each tile keeps its identity across both changes; only its
// box and its offset move. `radius` is what puts the <img> on cover-fit, so the photograph re-crops
// inside the growing frame instead of stretching with it (core/validate.mjs refuses the other way).
A.forEach((a, i) => {
  const b = B[i];
  layers.push({
    type: 'image', src: `${P}${i + 1}.jpg`, x: a.x, y: a.y, w: a.w, h: a.h, radius: 6,
    start: 0, duration: T.end, anim: 'none', exitDur: 0, motionBlur: false,
    motion: [
      { t: 0, x: 0, y: 0, w: r(a.w), h: r(a.h) },
      { t: T.openFrom, x: 0, y: 0, w: r(a.w), h: r(a.h), ease: 'linear' },
      { t: T.openTo, x: r(b.x - a.x), y: r(b.y - a.y), w: r(b.w), h: r(b.h), ease: EASE },
      { t: T.closeFrom, x: r(b.x - a.x), y: r(b.y - a.y), w: r(b.w), h: r(b.h), ease: 'linear' },
      { t: T.closeTo, x: 0, y: 0, w: r(a.w), h: r(a.h), ease: EASE },
      { t: T.end, x: 0, y: 0, w: r(a.w), h: r(a.h), ease: 'linear' },
    ],
  });
});

const scene = {
  module: 'scene',
  theme: 'default',
  aspect: '16:9',
  duration: T.end,
  authoringNote: 'Generated by scripts/author/build-zerochrome.mjs. Recreation of refs/arc-zero-chrome.mp4 '
    + 'with our own CC0 photographs: the chrome dissolves and the grid reflows to fill the space it gave up. '
    + 'Exists to exercise the w/h motion keys, which is the only way this engine can express a reflow.',
  authoring: {
    allow: ['no-camera', 'plain-slideshow'],
    _why: {
      'no-camera': 'The reference holds a locked-off frame for all three seconds and lets the content rearrange inside it. A camera move here would fight the only idea the film has.',
      'plain-slideshow': 'The ambition floor counts motion presets and cuts, and this film has neither by design: one continuous object, two layouts, no cut anywhere. Every layer is under a keyed box track the floor cannot see, which is a gap in the floor rather than a thin film.',
    },
  },
  layers,
  bg: [{ t: 0, preset: 'plain', from: 0, to: T.end }],
  audio: { silent: true },
};

fs.writeFileSync(OUT, JSON.stringify(scene, null, 2) + '\n');
console.log(`✓ ${OUT}  ${layers.length} layers · ${T.end}s`);
console.log(`  open  ${T.openFrom}→${T.openTo}s (${((T.openTo - T.openFrom) * 1000).toFixed(0)}ms)`);
console.log(`  close ${T.closeFrom}→${T.closeTo}s (${((T.closeTo - T.closeFrom) * 1000).toFixed(0)}ms)`);
console.log(`  grid  ${A[0].w.toFixed(0)}x${A[0].h} → ${B[0].w.toFixed(0)}x${B[0].h} per tile`);
