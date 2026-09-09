// harness/author/build-onefile.mjs: generate formats/scene/onefile.json.
//
// vawe's own film, and the first one built ON the box track and keyed depth rather than around them.
//
// THE CONTINUOUS OBJECT is the JSON card. It is on screen from the first frame to the last and it is
// never cut away from: it grows from one line to a full file, then its box becomes the first tile of a
// grid of real rendered frames, then that grid collapses back into one hero frame with a ribbon around
// it. Same object, four shapes. Nothing here is a slideshow because nothing here is ever replaced.
//
// The stills are REAL OUTPUT (frames pulled from films in out/) because a film claiming "one JSON,
// one video" that shows a stock photograph instead of its own output is telling, not showing.
import fs from 'node:fs';

const OUT = 'formats/scene/onefile.json';
const S = '/assets/brands/vawe/stills/';
// The scene's duration IS where the content ends. Declaring 17.5 while the last layer stopped at
// 14.6 left 2.9s of bare backdrop, which is exactly the frame a feed freezes on (`ends-on-nothing`).
const r = (v) => +v.toFixed(1);

// ── the clock ──────────────────────────────────────────────────────────────────────────────────────
// Beat edges are where the OBJECT changes shape, not where a layer is swapped. Grow, deal, collapse.
const T = { grow: 3.0, growEnd: 3.9, deal: 6.6, dealEnd: 7.6, hero: 11.0, heroEnd: 12.2, end: 14.6 };
// The card leaves BEFORE the tiles converge. Overlapping the two put three simultaneous changes in one
// frame (card shrinking, four tiles flying inward, hero growing) and the handover read as a pile-up.
const CARD_OUT = 10.7;
const DUR = T.end;
const EASE = 'brake';            // fitted off the reference in #206, not chosen by name

const layers = [];

// ── the JSON card: the continuous object ───────────────────────────────────────────────────────────
// Four boxes it passes through. The card is a real file, formatted, in a mono face.
const CARD = { x: 660, y: 380, w: 600, h: 320 };      // one line, centred, quiet (320 fits the 7 lines
                                                      // exactly; 290 cropped the file mid-glyph)
// 420, not 580. Type does not scale with its box yet, so a 580-tall card holds 310 of content and 270
// of empty dark: the growth reads as an oversized panel rather than as a file opening. 600x320 -> 920x420
// is still half again the area, and the box is full at both ends.
const FILE = { x: 500, y: 300, w: 920, h: 420 };      // the whole file
const TILE = { x: 210, y: 250, w: 500, h: 316 };      // first cell of the grid
const HERO = { x: 500, y: 250, w: 920, h: 580 };      // back to the middle, alone

// Six short lines, deliberately. An html layer's type does NOT scale with its box (the box track moves
// the frame, the font stays put), so copy written to fill the widest state wraps into a mess in the
// narrowest one. Until type can ride a box, the content has to fit the SMALLEST shape it will occupy.
const json = [
  '<span class="k">"module"</span>: <span class="s">"scene"</span>,',
  '<span class="k">"layers"</span>: [{',
  '  <span class="k">"type"</span>: <span class="s">"image"</span>,',
  '  <span class="k">"motion"</span>: [',
  '    { <span class="k">"w"</span>: <span class="n">500</span> },',
  '    { <span class="k">"w"</span>: <span class="n">920</span> }]',
  '}]',
].join('<br>');

layers.push({
  type: 'html', id: 'card', x: CARD.x, y: CARD.y, w: CARD.w, h: CARD.h, track: 6,
  start: 0, duration: T.end, anim: 'fade', enterDur: 0.6, exitDur: 0,
  html: `<div class="j"><style>
    .j{font:500 23px/1.60 ui-monospace,SFMono-Regular,Menlo,monospace;background:#0d1420;color:#c8d3e4;
       border-radius:14px;padding:26px 30px;height:100%;box-sizing:border-box;overflow:hidden;
       box-shadow:0 24px 60px rgba(13,20,32,.22);
       display:flex;flex-direction:column;justify-content:center}
    .j .c{width:100%}
    .j .k{color:#7aa7ff}.j .s{color:#8ee0b0}.j .n{color:#f0c674}
  </style><div class="c">${json}</div></div>`,
  motion: [
    { t: 0, w: CARD.w, h: CARD.h, x: 0, y: 0 },
    { t: T.grow, w: CARD.w, h: CARD.h, x: 0, y: 0, ease: 'linear' },
    { t: T.growEnd, w: FILE.w, h: FILE.h, x: r(FILE.x - CARD.x), y: r(FILE.y - CARD.y), ease: EASE },
    { t: T.deal, w: FILE.w, h: FILE.h, x: r(FILE.x - CARD.x), y: r(FILE.y - CARD.y), ease: 'linear' },
    { t: T.dealEnd, w: TILE.w, h: TILE.h, x: r(TILE.x - CARD.x), y: r(TILE.y - CARD.y), ease: EASE },
    { t: T.hero, w: TILE.w, h: TILE.h, x: r(TILE.x - CARD.x), y: r(TILE.y - CARD.y), ease: 'linear' },
    // it does not survive to the hero: it HANDS OVER, shrinking to nothing behind the frame it made
    { t: CARD_OUT, w: TILE.w, h: TILE.h, x: r(TILE.x - CARD.x), y: r(TILE.y - CARD.y), opacity: 0, ease: EASE },
    { t: T.end, w: TILE.w, h: TILE.h, x: r(TILE.x - CARD.x), y: r(TILE.y - CARD.y), opacity: 0, ease: 'linear' },
  ],
});

// ── the output: five real frames, dealt around the card, then collapsing into one ──────────────────
// Each starts folded into the card's box (invisible), opens into its grid cell, then converges on the
// hero. The one that survives grows INTO the hero box, so the film ends on a frame the engine made.
const CELLS = [
  { x: 726, y: 250, w: 500, h: 316 },
  { x: 1242, y: 250, w: 468, h: 316 },
  { x: 210, y: 582, w: 500, h: 316 },
  { x: 726, y: 582, w: 500, h: 316 },
  { x: 1242, y: 582, w: 468, h: 316 },
];
// The deal is STAGGERED. Five boxes opening on identical keys is one box opening five times: the eye
// reads a single block, and the beat then has nothing to do until the collapse. Each cell lands a beat
// after the one before it, and the hero cell lifts once they have all settled, so the beat carries two
// changes rather than one change and a 3.4s hold.
const DEAL_STEP = 0.10;
const LIFT = 9.4;
// Named, not `frame-${i+2}`. frame-2 is a near-empty gradient: in a grid whose whole job is to prove
// these are frames the engine MADE, it reads as a stain rather than as output. frame-1 is legible and
// light-toned, which also keeps the grid from being six dark rectangles.
const STILLS = ['frame-1', 'frame-3', 'frame-4', 'frame-5', 'frame-6'];
CELLS.forEach((c, i) => {
  const isHero = i === 1;   // frame-3, the cut-letter type frame: the best-looking thing the engine has made
  const d = i * DEAL_STEP;
  layers.push({
    type: 'image', id: `out${i}`, src: `${S}${STILLS[i]}.jpg`,
    x: c.x, y: c.y, w: c.w, h: c.h, radius: 10, track: 4, motionBlur: false,
    start: T.deal - 0.2, duration: T.end - (T.deal - 0.2), anim: 'none', exitDur: 0,
    motion: [
      // folded inside the card's footprint, nothing to see
      { t: 0, w: 120, h: 76, x: r(CARD.x + 240 - c.x), y: r(CARD.y + 100 - c.y), opacity: 0 },
      { t: r(0.2 + d), w: 120, h: 76, x: r(CARD.x + 240 - c.x), y: r(CARD.y + 100 - c.y), opacity: 0, ease: 'linear' },
      { t: r(T.dealEnd - T.deal + 0.2 + d), w: c.w, h: c.h, x: 0, y: 0, opacity: 1, ease: EASE },
      // the hero cell lifts a little once the grid has settled; the rest hold. This is the beat's second
      // change and it tells you which frame the collapse is going to choose before it chooses it.
      { t: r(LIFT - T.deal + 0.2), w: c.w, h: c.h, x: 0, y: isHero ? -14 : 0, opacity: 1, ease: EASE },
      { t: r(T.hero - T.deal + 0.2), w: c.w, h: c.h, x: 0, y: isHero ? -14 : 0, opacity: 1, ease: 'linear' },
      isHero
        ? { t: r(T.heroEnd - T.deal + 0.2), w: HERO.w, h: HERO.h, x: r(HERO.x - c.x), y: r(HERO.y - c.y), opacity: 1, ease: EASE }
        : { t: r(T.heroEnd - T.deal + 0.2), w: c.w * 0.72, h: c.h * 0.72, x: r(HERO.x + HERO.w / 2 - c.x - c.w * 0.36), y: r(HERO.y + HERO.h / 2 - c.y - c.h * 0.36), opacity: 0, ease: EASE },
      isHero
        ? { t: r(T.end - T.deal + 0.2), w: HERO.w, h: HERO.h, x: r(HERO.x - c.x), y: r(HERO.y - c.y), opacity: 1, ease: 'linear' }
        : { t: r(T.end - T.deal + 0.2), w: c.w * 0.72, h: c.h * 0.72, x: r(HERO.x + HERO.w / 2 - c.x - c.w * 0.36), y: r(HERO.y + HERO.h / 2 - c.y - c.h * 0.36), opacity: 0, ease: 'linear' },
    ],
  });
});

// ── the ribbon: keyed depth, so it goes round the hero rather than over it ─────────────────────────
const RCX = HERO.x + HERO.w / 2, RCY = HERO.y + HERO.h / 2;
// The box is CROPPED TO THE INK. The arc is a circle of radius 370 plus a 16px stroke, so it occupies
// 122..878 of the 1000 viewBox and the other 244px each way is empty square. That empty square still
// rotates: a 1000px box turned 45 degrees has a 1414px bounding box, which put the layer 153px off the
// top of a 1080 canvas and failed the safe-zone audit even though no ink ever left the frame. Cropping
// the viewBox to the ink keeps the ring the same size on screen and the box inside the canvas.
// Large enough to pass AROUND the hero rather than across it. At 680 the ring was smaller than the card
// and its arcs cut through the wordmark; that size existed only to satisfy an audit measuring the empty
// rotating square this layer's arc is inscribed in, rather than the arc (fixed in quality/audit.mjs).
const RING = 950;
const ribbon = (id, d, color, t0, t1) => ({
  type: 'svg', id, d, viewBox: '122 122 756 756', fill: 'none', stroke: color, strokeWidth: 16,
  x: RCX - RING / 2, y: RCY - RING / 2, w: RING, h: RING, track: t0,
  start: T.hero, duration: T.end - T.hero, anim: 'fade', enterDur: 0.5, exitDur: 0,
  motion: [{ t: 0, rot: -30, track: t0 }, { t: r(T.end - T.hero), rot: 200, track: t1, ease: 'linear' }],
});
layers.push(ribbon('ribA', 'M 130 500 A 370 370 0 0 1 870 500', 'var(--accent)', 9, 1));
layers.push(ribbon('ribB', 'M 870 500 A 370 370 0 0 1 130 500', '#0b1b3a', 1, 9));

// ── the copy: three lines, each landing ON a shape change, never between them ──────────────────────
// `preset` varies per line on purpose. The two body lines share one (they are ONE sentence broken over
// two lines, so they must move alike); every other line reveals differently, or the film moves the same
// way five times and reads as one effect applied by habit.
const line = (text, x, y, size, weight, start, dur, color, preset = 'up', w = 900, exitDur = 0.3) => ({
  type: 'text', text, x, y, w, size, weight, color: color || 'var(--ink)', align: 'left',
  split: 'word', preset, stagger: 0.05, each: 0.5, track: 8,
  start, duration: dur, anim: 'none', exitDur,
});
layers.push(line('One file.', 190, 250, 96, 800, 0.5, 3.0));
layers.push(line('Every frame it names,', 190, 830, 52, 600, T.growEnd - 0.2, 2.9, 'var(--muted)'));
layers.push(line('rendered the same way twice.', 190, 894, 52, 600, T.growEnd + 0.1, 2.6, 'var(--muted)'));
// Beats 3 and 4 share ONE headline slot. The line changes where the picture changes, so the top of the
// frame reads as a single caption keeping up rather than as two captions arriving in different places.
layers.push(line('Six frames. One source.', 190, 118, 96, 800, T.dealEnd + 0.2, T.hero - T.dealEnd - 0.4, null, 'blur', 1400));
layers.push(line('One video.', 190, 118, 96, 800, T.hero + 0.2, T.end - T.hero - 0.2, null, 'riseClip', 900, 0));

const scene = {
  module: 'scene',
  theme: 'vawe',
  aspect: '16:9',
  duration: DUR,
  authoringNote: 'Generated by harness/author/build-onefile.mjs. vawe\'s own film and the first built ON '
    + 'the box track (#206) and keyed depth (#207). The JSON card is the continuous object: one line, then '
    + 'the whole file, then a grid cell, handing over to the frame it rendered. Stills are real output.',
  authoring: {
    allow: ['no-transition', 'linear-motion'],
    _why: { 'linear-motion': 'The two linear keys are the ribbon\'s rotation. An orbit turns at a constant rate; easing it would make the ring slow down at a point on its circle for no reason, which is the one place slow-in/slow-out is wrong.', 'no-transition': 'There is no cut in this film to put a transition on. One object changes shape four times and is never replaced, which is the thing the continuity doctrine asks for; a seam would be a cut invented so a gate could see one.' },
  },
  layers,
  // A living backdrop, not a flat field: the rings drift for the whole film so the frame is never
  // dead even while the object is holding still between shape changes.
  bg: [{ t: 0, preset: 'gradientWash', opts: { intensity: 0.35 }, from: 0, to: DUR }],
  audio: { silent: true },
};

fs.writeFileSync(OUT, JSON.stringify(scene, null, 2) + '\n');
console.log(`✓ ${OUT}  ${layers.length} layers · ${DUR}s`);
console.log(`  card: ${CARD.w}x${CARD.h} → ${FILE.w}x${FILE.h} → ${TILE.w}x${TILE.h} → hands over`);
console.log(`  grow ${T.grow}-${T.growEnd}s · deal ${T.deal}-${T.dealEnd}s · hero ${T.hero}-${T.heroEnd}s`);
