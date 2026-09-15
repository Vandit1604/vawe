// harness/author/build-refstudy.mjs: a shot-for-shot study of refs/pin-522769469268499616.mp4.
//
// THIS IS A RECREATION EXERCISE (engine-doctrine/CRAFT/RECREATION.md). The point is to reproduce the reference's
// STRUCTURE exactly and see what our engine cannot do, so the gaps become the roadmap. Everything
// structural is measured from the file rather than eyeballed:
//
//   cuts    0 · 1.44 · 3.2 · 4.88 · 5.96 · 7.48 · 9.56 · 12.76 · 14.16 · 15.56 · 16.32 · 17.87
//   shots   1.44 1.76 1.68 1.08 1.52 2.08 3.20 1.40 1.40 0.76 1.55   (median 1.52s, min 0.76s)
//
// That cut rate is the single biggest difference from anything in this library: our beats run 2.5-4s,
// roughly half the pace, and no amount of composition reads as energetic at half the cut rate.
//
// WHAT IS COPIED: the skeleton. Shot count and lengths, the palette sequence, one clause per shot with
// the sentence never finishing, emphasis on a word rather than a line, a prop per shot, the list card
// that builds a row at a time, the fast 0.76s shot before the payoff, and the grey PATH that runs
// through the light section (the thing a first pass at this reference missed entirely).
//
// WHAT IS NOT COPIED: its content, copy, artwork and assets. Its subject is audience growth; ours is
// hand-built video. Props are openly-licensed photographs fetched via `make photos` with attribution in
// assets/brands/refstudy/photos/credits.json, and the brand slot holds our own mark rather than the
// third-party wordmark the reference puts there.
import fs from 'node:fs';

const OUT = 'formats/scene/refstudy.json';
const SAFE = { x0: 65, x1: 929, y0: 192, y1: 1498 };
const r1 = (v) => +v.toFixed(2);
const P = '/assets/brands/refstudy/photos/';

// ── the measured shot list ─────────────────────────────────────────────────────────────────────────
const CUTS = [0, 1.44, 3.2, 4.88, 5.96, 7.48, 9.56, 12.76, 14.16, 15.56, 16.32, 17.87];
const shot = (i) => ({ t: CUTS[i], d: r1(CUTS[i + 1] - CUTS[i]) });
const DUR = 17.87;
const layers = [];

// The palette sequence, taken from the reference shot by shot. It flips seven times in eighteen seconds.
// A held backdrop across this many cuts would flatten the whole thing.
const DARK = ['ink', 'deep', 'ink'];
const TONE = ['dark', 'dark', 'dark', 'light', 'light', 'dark', 'light', 'light', 'light', 'light', 'dark'];

// ── the sentence, one clause per shot, none of them finishing ──────────────────────────────────────
// Written to the reference's SHAPE, not its words: a setup, a question that turns it, a definition, a
// list, a contrast pair, and a full stop that only arrives on the last shot.
const CLAUSES = [
  'You had the <b>idea</b>,',
  'but the edit? <b>still manual</b>,',
  'because a video you <b>hand-built</b>',
  'is',
  'just a <b>one-off</b>,',
  'and the <b>source</b> is the asset.',
  null,                                   // shot 7 is the list card; the sentence pauses on it
  'A timeline does not',
  'reward <b>describing</b>,',
  'it rewards <b>clicking</b>.',
  '<b>Describe it once.</b>',
];

const INK_ON_DARK = '#f2f6ff', INK_ON_LIGHT = '#0b1220';

const clause = (i) => {
  const text = CLAUSES[i];
  if (!text) return null;
  const s = shot(i);
  const light = TONE[i] === 'light';
  return {
    type: 'text', text, x: 90, y: i === 10 ? 300 : 260, w: 820,
    size: i === 10 ? 84 : 66, weight: 800,
    color: light ? INK_ON_LIGHT : INK_ON_DARK, align: 'left',
    split: 'word', preset: 'up', stagger: 0.04, each: 0.3, track: 30,
    start: r1(s.t + 0.06), duration: r1(s.d - 0.06), anim: 'none',
    exitDur: i === 10 ? 0 : 0.18,          // fast exits: at 1.5s a shot cannot afford a slow one
  };
};

// ── the PATH lives in the BACKGROUND, not in layers ────────────────────────────────────────────────
// It is the spatial thread the first study of this reference missed: a pale band curving through the
// light shots, dropping out for the dark briefcase shot and returning, so those shots read as one
// travelling surface rather than separate cards.
//
// It belongs in `bg` because it is a BACKDROP and backdrops are expected to bleed off-frame. Authored as
// a layer it was a 1000px rotating box that failed the safe-zone audit on both spans, and the only fixes
// available were to shrink a band whose whole job is to run past the edges, or to waive a gate that was
// reading it as content. Neither is right when the element is simply in the wrong place.
// `var(--t)` is the scene clock, so the drift is pure in t and the render stays deterministic.
const pathBg = (from, to, a0, a1) => ({
  from: CUTS[from], to: CUTS[to],
  // `tone` is REQUIRED and the validator is right to insist: the engine cannot read lightness out of
  // arbitrary CSS, so without it a layer with no explicit colour falls back to theme ink and can land
  // white on white. The base fill lives here too; the band alone is transparent and would show nothing.
  tone: 'light',
  // An inline SVG, not a linear-gradient. A gradient can only produce a straight-edged wedge, and that is
  // what it produced: a flat grey triangle instead of a band curving through the shots. The reference's
  // path bends, and the bend is what makes consecutive shots read as one travelling surface.
  html: `<div style="position:absolute;inset:0;background:#f4f6fb"></div>
    <svg viewBox="0 0 1080 1920" preserveAspectRatio="xMidYMid slice"
         style="position:absolute;inset:-15%;width:130%;height:130%;
                transform:rotate(calc((${a1} - ${a0}) * 1deg * var(--t) / ${(CUTS[to] - CUTS[from]).toFixed(2)} + ${a0}deg));
                transform-origin:50% 55%">
      <path d="M -220 1780 C 180 1320, 420 900, 980 -140" fill="none"
            stroke="rgba(15,23,42,0.075)" stroke-width="330" stroke-linecap="round"/>
    </svg>`,
});

// ── the props, one per shot, photographic ──────────────────────────────────────────────────────────
// Sized and centred on the SAFE box, never the canvas: reels paints a rail right and captions bottom.
const prop = (src, i, { y = 720, w = 700, ken = true, rot = 0, scale = 1 } = {}) => {
  const s = shot(i);
  const h = Math.round(w * 0.66);
  return {
    type: 'image', id: `prop${i}`, src: P + src, radius: 18, motionBlur: false,
    x: Math.round(SAFE.x0 + (SAFE.x1 - SAFE.x0 - w) / 2), y, w, h, ken, track: 8,
    start: r1(s.t), duration: s.d, anim: 'none', exitDur: 0.2,
    // FAST. At a 1.5s cut rate a 0.34s fade-in leaves the first tenth of the shot on bare backdrop, which
    // seam-check reads as a dark flash at the cut and the eye reads as the film losing its footing. The
    // prop starts already mostly present and settles; it never arrives from nothing.
    motion: [
      { t: 0, opacity: 0.55, scale: scale * 0.965, rot: rot * 1.5 },
      { t: 0.16, opacity: 1, scale, rot, ease: 'brake' },
    ],
  };
};
layers.push(prop('light-bulb-1.jpg', 0, { y: 700, w: 620, rot: -2 }));
layers.push(prop('mechanical-keyboard-1.jpg', 1, { y: 760, w: 760, rot: 2.5 }));
// shot 3 is type only on black, exactly as the reference plays it: one shot with no prop, so the line lands
layers.push(prop('briefcase-money-1.webp', 5, { y: 700, w: 720, rot: -3 }));

// shots 4 and 5 share ONE prop at three scales and depths, the reference's parallax move: same object,
// near/mid/far, the far ones dimmed so the frame has depth instead of a flat sticker.
[
  { i: 3, x: 520, y: 430, w: 330, o: 0.30 },
  { i: 3, x: 130, y: 780, w: 620, o: 1 },
  { i: 3, x: 490, y: 1150, w: 400, o: 0.45 },
].forEach((c, k) => {
  const s = shot(3), s2 = shot(4);
  layers.push({
    type: 'image', id: `dup${k}`, src: `${P}light-bulb-1.jpg`, radius: 14, motionBlur: false,
    x: c.x, y: c.y, w: c.w, h: Math.round(c.w * 0.66), track: 6,
    start: s.t, duration: r1(s2.t + s2.d - s.t), anim: 'none', exitDur: 0.2,
    motion: [
      { t: 0, opacity: r1(c.o * 0.5), scale: 0.94, y: 16 },
      { t: r1(0.18 + k * 0.05), opacity: c.o, scale: 1, y: 0, ease: 'brake' },
    ],
  });
});

// Shots 8-10 had a clause and nothing else, and on the judge sheet they read as blank frames. The
// reference never does this: every shot has something in it. These three are the contrast pair and its
// payoff, so the props argue the point rather than decorate it - what a timeline gives you, versus what
// the source gives you.
layers.push({
  type: 'image', id: 'timeline', src: '/assets/brands/vawe/stills/frame-4.jpg',
  x: 145, y: 760, w: 700, h: 394, radius: 14, track: 8, motionBlur: false,
  start: r1(shot(7).t), duration: r1(shot(8).t + shot(8).d - shot(7).t), anim: 'none', exitDur: 0.18,
  motion: [
    { t: 0, opacity: 0, scale: 0.95, y: 26 },
    { t: 0.32, opacity: 1, scale: 1, y: 0, ease: 'brake' },
    { t: r1(shot(7).d + shot(8).d), opacity: 1, scale: 1.06, y: 0, ease: 'linear' },
  ],
});
// the 0.76s shot, the fastest in the film: it needs one loud object and no time to read anything else
layers.push({
  type: 'image', id: 'click', src: P + 'mechanical-keyboard-1.jpg',
  x: 105, y: 700, w: 790, h: 521, radius: 16, track: 9, motionBlur: false,
  start: r1(shot(9).t), duration: shot(9).d, anim: 'none', exitDur: 0.12,
  motion: [
    { t: 0, opacity: 0, scale: 1.12 },
    { t: 0.26, opacity: 1, scale: 1, ease: 'brake' },
  ],
});

// ── shot 7 · the list card, built one row at a time ────────────────────────────────────────────────
// The longest shot in the film (3.2s) and the only one that earns its length, because the prop is doing
// the explaining: each row arrives separately, so the viewer reads a cost accumulating rather than a
// finished list. Rows are separate layers so they can actually arrive.
const S7 = shot(6);
const CARD = { x: 300, y: 640, w: 470, h: 470 };
layers.push({
  type: 'html', id: 'card', x: CARD.x, y: CARD.y, w: CARD.w, h: CARD.h, track: 10,
  start: r1(S7.t + 0.1), duration: r1(S7.d - 0.1), anim: 'none', exitDur: 0.25,
  html: `<div class="c"><style>
    .c{background:#8d939c;color:#fff;height:100%;box-sizing:border-box;padding:34px 30px;
       font:700 44px/1.2 system-ui,sans-serif;box-shadow:0 26px 50px rgba(0,0,0,.28)}
    .c .t{border-bottom:2px solid rgba(255,255,255,.55);padding-bottom:14px}
  </style><div class="t">Hand-built</div></div>`,
  motion: [{ t: 0, rot: -2.5, y: -14 }, { t: 0.45, rot: 1.5, y: 0, ease: 'brake' }],   // it swings on its pin
});
['No reruns', 'No variants', 'No scale'].forEach((row, k) => {
  layers.push({
    type: 'text', id: `row${k}`, text: row, x: CARD.x + 30, y: CARD.y + 172 + k * 96, w: 400,
    size: 34, weight: 600, color: '#ffffff', align: 'left',
    split: 'line', preset: 'up', each: 0.3, track: 11,
    start: r1(S7.t + 0.7 + k * 0.55), duration: r1(S7.d - 0.7 - k * 0.55), anim: 'none', exitDur: 0.25,
  });
});
layers.push({                                    // the pin, so the card reads as pinned rather than floating
  type: 'rect', id: 'pin', x: CARD.x + 210, y: CARD.y - 16, w: 34, h: 34, radius: 17,
  fill: '#d33', track: 12, start: r1(S7.t + 0.1), duration: r1(S7.d - 0.1), anim: 'scale',
  enterDur: 0.3, exitDur: 0.25,
});

// ── shot 11 · the payoff ───────────────────────────────────────────────────────────────────────────
const S11 = shot(10);
layers.push({
  type: 'html', id: 'file', x: 265, y: 640, w: 550, h: 250, track: 10,
  start: r1(S11.t + 0.25), duration: r1(DUR - S11.t - 0.25), anim: 'fade', enterDur: 0.35, exitDur: 0,
  html: `<div class="f"><style>
    .f{font:500 28px/1.7 ui-monospace,SFMono-Regular,Menlo,monospace;background:#182338;color:#dce5f5;
       border:1px solid rgba(122,167,255,.42);border-radius:16px;padding:26px 30px;height:100%;
       box-sizing:border-box;overflow:hidden;display:flex;flex-direction:column;justify-content:center;
       box-shadow:0 0 0 6px rgba(122,167,255,.07),0 30px 70px rgba(0,0,0,.55)}
    .f b{color:#7aa7ff;font-weight:500}.f i{color:#8ee0b0;font-style:normal}
  </style><div><b>"module"</b>: <i>"scene"</i><br><b>"render"</b>: <i>true</i></div></div>`,
});
layers.push({
  type: 'image', id: 'made', src: '/assets/brands/vawe/stills/frame-4.jpg',
  x: 205, y: 990, w: 670, h: 377, radius: 14, track: 8, motionBlur: false,
  start: r1(S11.t + 0.7), duration: r1(DUR - S11.t - 0.7), anim: 'none', exitDur: 0,
  motion: [{ t: 0, opacity: 0, y: 36, scale: 0.96 }, { t: 0.55, opacity: 1, y: 0, scale: 1, ease: 'brake' }],
});

CLAUSES.forEach((_, i) => { const c = clause(i); if (c) layers.push(c); });

// ── the scene ──────────────────────────────────────────────────────────────────────────────────────
// Spans OVERLAP by a beat at their trailing edge. Cut to cut they used to abut exactly, and at 7.48s the
// outgoing light backdrop and the incoming dark one were both mid-fade at the same instant, so neither was
// opaque and the black root showed through: a dark flash the centre-sampling gates cannot see and
// `make seam-check` can (engine-doctrine/MISTAKES.md #144). Holding each span a little past its cut means the frame
// is never uncovered.
const BG_LAP = 0.2;
const bg = TONE.map((tone, i) => {
  const to = i === TONE.length - 1 ? CUTS[i + 1] : r1(CUTS[i + 1] + BG_LAP);
  if (tone === 'dark') return { t: 0, preset: DARK[i % DARK.length], from: CUTS[i], to };
  return { t: 0, ...pathBg(i, i + 1, i < 5 ? -12 : 8, i < 5 ? -4 : 18), to };
});

const scene = {
  module: 'scene',
  theme: 'vawe',
  aspect: '9:16',
  destination: 'reels',
  duration: DUR,
  authoringNote: 'Shot-for-shot recreation study of refs/pin-522769469268499616.mp4 (engine-doctrine/CRAFT/RECREATION.md). '
    + 'Cut list, shot lengths and palette sequence are MEASURED from the reference; the copy, subject and '
    + 'assets are ours. Props are openly-licensed photographs with attribution in '
    + 'assets/brands/refstudy/photos/credits.json.',
  authoring: {
    allow: ['no-continuous-object', 'no-continuous-object-inferred'],
    _why: {
      'no-continuous-object': 'Two threads carry this instead of one prop: an unfinished sentence, a clause per shot with no full stop until the last, and a pale PATH that runs through the light shots, drops out for the dark briefcase shot and returns. Both are measured off the reference. Keeping a single prop alive across eleven shots would break the thing being studied, which is how a film holds at a 1.5s cut rate.',
      'no-continuous-object-inferred': 'Same two threads.',
    },
  },
  layers,
  bg,
  audio: { silent: true },
};

fs.writeFileSync(OUT, JSON.stringify(scene, null, 2) + '\n');
console.log(`✓ ${OUT}  ${layers.length} layers · ${DUR}s · 11 shots`);
console.log(`  median shot ${1.52}s (reference-matched) · palette flips ${TONE.filter((t, i) => i && t !== TONE[i - 1]).length}x`);
