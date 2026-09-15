// harness/author/build-thread.mjs: generate films/scene/thread.json.
//
// The first film here held together by a SENTENCE rather than a prop. Nothing survives a cut: every beat
// is its own world, its own palette, its own graphic. What stops it being a slideshow is that no clause
// finishes, so each cut is a comma. Grammar in engine-doctrine/CRAFT/CONTINUITY-WITHOUT-AN-OBJECT.md, studied off
// refs/pin-522769469268499616.mp4.
//
// The palette FLIPS every beat (dark, light, dark, light, dark). That is the point of paying for the
// sentence thread: once the words carry continuity, the pictures owe each other nothing.
//
// Every prop is drawn from real primitives and every one does EXPLANATORY work (engine-doctrine/CRAFT/SHOW-DONT-TELL):
//   1 bars placed by hand, each one landing separately and none of them quite square
//   2 the same bars, squared up and lit, because the setup has to actually look good
//   3 one figure rolling while the bars beneath it go out of true, the damage, not a word for it
//   4 a wall of identical days filling in faster than the eye tracks
//   5 the wall collapsing into one file
import fs from 'node:fs';

const OUT = 'films/scene/thread.json';
const W = 1080;
const r1 = (v) => +v.toFixed(1);

// ── the clock: one clause per beat, cut on the comma ───────────────────────────────────────────────
const B = [
  { t: 0.0, d: 2.8 },
  { t: 2.8, d: 2.6 },
  { t: 5.4, d: 2.8 },
  { t: 8.2, d: 3.0 },
  { t: 11.2, d: 3.8 },
];
const DUR = 15.0;
const layers = [];

// ── the sentence: one clause per beat, emphasis on the WORD, never the line ────────────────────────
// A clause sits in the same place every beat so the reading eye never hunts, while everything behind it
// changes completely. That fixed slot is what lets the worlds be as different as they are.
const CLAUSE_Y = 300;
const clause = (text, i, { color, size = 74, preset = 'up' } = {}) => ({
  type: 'text', text, x: 90, y: CLAUSE_Y, w: 900, size, weight: 800, color, align: 'left',
  split: 'word', preset, stagger: 0.055, each: 0.42, track: 20,
  start: B[i].t + 0.1, duration: B[i].d - 0.1, anim: 'none', exitDur: i === 4 ? 0 : 0.25,
});

// ── beat 1 · dark · bars placed by hand ────────────────────────────────────────────────────────────
// Hand-placed means NOT square: each bar carries its own small rotation and offset, and they arrive one
// at a time rather than as a set. The unevenness is the information.
// THE PROP IS A REAL RENDERED FRAME, not a rounded rectangle. The film is about rebuilding a video, so
// the thing being rebuilt should BE a video frame, and every one of these is real output from this
// engine. Rectangles were the first thing I reached for and they are exactly what
// engine-doctrine/CRAFT/CONTINUITY-WITHOUT-AN-OBJECT.md warns against: props need weight.
const SHOT = '/assets/brands/vawe/stills/';
// Sized and centred on the reels SAFE BOX (x 65..929, 864 wide), with room left for the tilt: a frame
// rotated 2.6 degrees is ~22px wider each side than its own box, and a frame that fits at rot 0 does not
// fit at rot 2.6. The old 880 was sized against the 1080 canvas and never fit either.
const FRAME_W = 780, FRAME_H = 439, FRAME_X = 65 + (864 - FRAME_W) / 2;
// The bar stack that used to sit under each frame is GONE. It was five rects pretending to be a
// hand-built timeline, and on the sheet it read as placeholder scribble: decoration wearing an
// explanation's clothes, which is the exact thing this film is supposed to avoid. The frame's own tilt
// carries "by hand" on its own, and one honest signal beats two competing ones.
layers.push({
  type: 'image', id: 'built', src: `${SHOT}frame-4.jpg`,
  x: FRAME_X, y: 820, w: FRAME_W, h: FRAME_H, radius: 14, track: 8, motionBlur: false,
  start: r1(B[0].t + 0.15), duration: r1(B[0].d - 0.15), anim: 'none', exitDur: 0.25,
  motion: [
    { t: 0, opacity: 0, scale: 0.90, rot: -4.5 },
    { t: 0.55, opacity: 1, scale: 1, rot: -2.6, ease: 'brake' },   // never quite square: placed by hand
  ],
});
layers.push(clause('You built it <b>by hand</b>,', 0, { color: '#eef2fb' }));

// ── beat 2 · LIGHT · the same bars, squared up ─────────────────────────────────────────────────────
// The palette flips on the cut. The setup has to be genuinely attractive or the reversal is not one, so
// here the bars are true, evenly spaced, and the frame is bright.
layers.push({
  type: 'image', id: 'good', src: `${SHOT}frame-4.jpg`,
  x: FRAME_X, y: 820, w: FRAME_W, h: FRAME_H, radius: 14, track: 8, motionBlur: false,
  start: B[1].t, duration: B[1].d, anim: 'none', exitDur: 0.25,
  motion: [
    { t: 0, rot: -2.6, scale: 1, opacity: 1 },
    { t: 0.6, rot: 0, scale: 1.02, opacity: 1, ease: 'brake' },    // it SNAPS true: that is "looked good"
    { t: r1(B[1].d), rot: 0, scale: 1.05, opacity: 1, ease: 'linear' },
  ],
});
layers.push(clause('and it <b>looked good</b>,', 1, { color: '#0b1220' }));

// ── beat 3 · dark · one figure rolls and the bars stop agreeing ────────────────────────────────────
// The count is the cause and the bars are the effect, in the same frame at the same time. A number on
// its own would be a word for the problem; the bars sliding out of true IS the problem.
layers.push({
  type: 'count', id: 'fig', from: 4820, to: 5140, x: 90, y: 620, w: 900, size: 190, weight: 800,
  color: '#ff8f8f', align: 'left', track: 12,
  start: r1(B[2].t + 0.25), duration: r1(B[2].d - 0.25), anim: 'fade', enterDur: 0.3, exitDur: 0.25,
});
layers.push({
  type: 'image', id: 'broken', src: `${SHOT}frame-4.jpg`,
  x: FRAME_X, y: 980, w: FRAME_W, h: FRAME_H, radius: 14, track: 4, motionBlur: false,
  start: B[2].t, duration: B[2].d, anim: 'none', exitDur: 0.25,
  motion: [
    { t: 0, opacity: 1, scale: 1 },
    { t: r1(B[2].d - 0.3), opacity: 0.45, scale: 0.98, ease: 'brake' },   // the work dims under the figure
  ],
});
layers.push(clause('until the <b>number moved</b>,', 2, { color: '#eef2fb' }));

// ── beat 4 · LIGHT · a wall of identical days ──────────────────────────────────────────────────────
// 7 x 6 cells filling in one after another, faster than the eye tracks each one, then stopping. The
// repetition IS the cost being described, so the frame has to repeat until it is uncomfortable.
// Every cell is the SAME frame, because that is the complaint: the same video, made again, every week.
// Grey squares would have been a diagram of the idea; the repeated real frame IS the idea.
// Sized to the REELS safe box, not the canvas. A 9:16 web hero and a 9:16 reel are the same shape and
// different frames: reels paints a rail down the right and captions across the bottom, so a grid centred
// on the canvas puts its right column under the chrome.
const COLS = 3, ROWS = 4, CELL_W = 246, CELL_H = 138, PAD = 16;
// Centred on the SAFE BOX, not the canvas. For reels those are different: the safe box runs x 65..929,
// whose centre is 497, while the canvas centre is 540. Centring on the canvas walks the right column
// 43px toward the rail, which is exactly where the audit kept finding it.
const SAFE_X0 = 65, SAFE_X1 = 929;
const GRID_W = COLS * CELL_W + (COLS - 1) * PAD;
const GRID_X = SAFE_X0 + (SAFE_X1 - SAFE_X0 - GRID_W) / 2, GRID_Y = 660;
for (let i = 0; i < COLS * ROWS; i++) {
  const cx = GRID_X + (i % COLS) * (CELL_W + PAD);
  const cy = GRID_Y + Math.floor(i / COLS) * (CELL_H + PAD);
  layers.push({
    type: 'image', id: `day${i}`, src: `${SHOT}frame-4.jpg`,
    x: cx, y: cy, w: CELL_W, h: CELL_H, radius: 8, track: 6, motionBlur: false,
    start: r1(B[3].t + 0.15 + i * 0.055), duration: r1(B[3].d - 0.15 - i * 0.055),
    anim: 'none', exitDur: 0.3,
    motion: [{ t: 0, opacity: 0, scale: 0.86 }, { t: 0.26, opacity: 1, scale: 1, ease: 'brake' }],
  });
}
layers.push(clause('and now it is <b>Friday</b> again.', 3, { color: '#0b1220' }));

// ── beat 5 · dark · the wall collapses into one file ───────────────────────────────────────────────
// Everything the film has been complaining about converges and goes out; the file does not move at all.
// Stillness is the payoff: it is the only thing in fifteen seconds that holds its position.
for (let i = 0; i < COLS * ROWS; i++) {
  const cx = GRID_X + (i % COLS) * (CELL_W + PAD);
  const cy = GRID_Y + Math.floor(i / COLS) * (CELL_H + PAD);
  layers.push({
    type: 'image', id: `fall${i}`, src: `${SHOT}frame-4.jpg`,
    x: cx, y: cy, w: CELL_W, h: CELL_H, radius: 8, track: 5, motionBlur: false,
    start: B[4].t, duration: 1.5, anim: 'none', exitDur: 0,
    motion: [
      { t: 0, x: 0, y: 0, opacity: 1, scale: 1 },
      { t: r1(0.5 + (i % COLS) * 0.05), x: r1(W / 2 - cx - CELL_W / 2), y: r1(840 - cy), opacity: 0, scale: 0.2, ease: 'brake' },
    ],
  });
}
layers.push({
  type: 'html', id: 'file', x: 265, y: 630, w: 550, h: 270, track: 10,
  start: r1(B[4].t + 0.55), duration: r1(DUR - B[4].t - 0.55), anim: 'fade', enterDur: 0.5, exitDur: 0,
  html: `<div class="f"><style>
    .f{font:500 30px/1.7 ui-monospace,SFMono-Regular,Menlo,monospace;background:#182338;color:#dce5f5;
       border:1px solid rgba(122,167,255,.42);
       border-radius:16px;padding:30px 34px;height:100%;box-sizing:border-box;overflow:hidden;
       display:flex;flex-direction:column;justify-content:center;
       box-shadow:0 0 0 6px rgba(122,167,255,.07), 0 30px 70px rgba(0,0,0,.55)}
    .f b{color:#7aa7ff;font-weight:500}.f i{color:#8ee0b0;font-style:normal}
  </style><div><b>"revenue"</b>: <i>5140</i><br><b>"week"</b>: <i>"friday"</i><br><b>"render"</b>: <i>true</i></div></div>`,
});
layers.push({
  type: 'image', id: 'once', src: `${SHOT}frame-4.jpg`,
  x: 205, y: 1010, w: 670, h: 377, radius: 14, track: 8, motionBlur: false,
  start: r1(B[4].t + 1.4), duration: r1(DUR - B[4].t - 1.4), anim: 'none', exitDur: 0,
  motion: [
    { t: 0, opacity: 0, y: 40, scale: 0.96 },
    { t: 0.7, opacity: 1, y: 0, scale: 1, ease: 'brake' },   // the file arrives, then what it made
  ],
});
layers.push(clause('<b>Describe it once.</b>', 4, { color: '#eef2fb', size: 82 }));

// ── the worlds ─────────────────────────────────────────────────────────────────────────────────────
// A cut in the palette is the loudest cut available and it costs nothing, so it carries the beat
// boundaries here instead of a transition effect.
const scene = {
  module: 'scene',
  theme: 'vawe',
  aspect: '9:16',
  destination: 'reels',
  duration: DUR,
  authoringNote: 'Generated by harness/author/build-thread.mjs. Held together by a SENTENCE, not a prop: '
    + 'nothing survives a cut, every beat is a new world and a new palette, and the film holds because no '
    + 'clause finishes. See engine-doctrine/CRAFT/CONTINUITY-WITHOUT-AN-OBJECT.md.',
  authoring: {
    allow: ['no-continuous-object', 'no-continuous-object-inferred', 'no-transition'],
    _why: {
      'no-continuous-object': 'The thread is GRAMMATICAL, not physical: the film speaks one sentence, a clause per beat, and every beat ends mid-sentence so the cut is a comma. The gate can see a prop that survives a junction; it cannot see an unfinished sentence. Keeping a box alive across these cuts purely so the gate could find one would add nothing a viewer would notice and would cost the palette flip that makes the film work.',
      'no-continuous-object-inferred': 'Same thread. The boundaries the gate infers are exactly the clause boundaries, which is the point.',
      'no-transition': 'The palette flip IS the transition. A cut from dark to light is the loudest boundary available and needs no effect laid over it; adding one would soften the only thing marking the beat.',
    },
  },
  layers,
  bg: [
    { t: 0, preset: 'ink', from: B[0].t, to: B[1].t },
    { t: 0, preset: 'paper', from: B[1].t, to: B[2].t },
    { t: 0, preset: 'deep', from: B[2].t, to: B[3].t },
    { t: 0, preset: 'paper', from: B[3].t, to: B[4].t },
    { t: 0, preset: 'ink', from: B[4].t, to: DUR },
  ],
  audio: { silent: true },
};

fs.writeFileSync(OUT, JSON.stringify(scene, null, 2) + '\n');
console.log(`✓ ${OUT}  ${layers.length} layers · ${DUR}s`);
console.log('  thread: sentence · palette flips dark/light/dark/light/dark · nothing survives a cut');
