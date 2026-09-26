import fs from 'node:fs';

const OUT = 'films/scene/refstudy.json';
const SAFE = { x0: 65, x1: 929, y0: 192, y1: 1498 };
const r1 = (v) => +v.toFixed(2);
const P = '/assets/brands/refstudy/photos/';

// ── the measured shot list ─────────────────────────────────────────────────────────────────────────
const CUTS = [0, 1.44, 3.2, 4.88, 5.96, 7.48, 9.56, 12.76, 14.16, 15.56, 16.32, 17.87];
const shot = (i) => ({ t: CUTS[i], d: r1(CUTS[i + 1] - CUTS[i]) });
const DUR = 17.87;
const layers = [];

const DARK = ['ink', 'deep', 'ink'];
const TONE = ['dark', 'dark', 'dark', 'light', 'light', 'dark', 'light', 'light', 'light', 'light', 'dark'];

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

const pathBg = (from, to, a0, a1) => ({
  from: CUTS[from], to: CUTS[to],
  tone: 'light',
  html: `<div style="position:absolute;inset:0;background:#f4f6fb"></div>
    <svg viewBox="0 0 1080 1920" preserveAspectRatio="xMidYMid slice"
         style="position:absolute;inset:-15%;width:130%;height:130%;
                transform:rotate(calc((${a1} - ${a0}) * 1deg * var(--t) / ${(CUTS[to] - CUTS[from]).toFixed(2)} + ${a0}deg));
                transform-origin:50% 55%">
      <path d="M -220 1780 C 180 1320, 420 900, 980 -140" fill="none"
            stroke="rgba(15,23,42,0.075)" stroke-width="330" stroke-linecap="round"/>
    </svg>`,
});

const prop = (src, i, { y = 720, w = 700, ken = true, rot = 0, scale = 1 } = {}) => {
  const s = shot(i);
  const h = Math.round(w * 0.66);
  return {
    type: 'image', id: `prop${i}`, src: P + src, radius: 18, motionBlur: false,
    x: Math.round(SAFE.x0 + (SAFE.x1 - SAFE.x0 - w) / 2), y, w, h, ken, track: 8,
    start: r1(s.t), duration: s.d, anim: 'none', exitDur: 0.2,
    motion: [
      { t: 0, opacity: 0.55, scale: scale * 0.965, rot: rot * 1.5 },
      { t: 0.16, opacity: 1, scale, rot, ease: 'brake' },
    ],
  };
};
layers.push(prop('light-bulb-1.jpg', 0, { y: 700, w: 620, rot: -2 }));
layers.push(prop('mechanical-keyboard-1.jpg', 1, { y: 760, w: 760, rot: 2.5 }));
layers.push(prop('briefcase-money-1.webp', 5, { y: 700, w: 720, rot: -3 }));

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
layers.push({
  type: 'image', id: 'click', src: P + 'mechanical-keyboard-1.jpg',
  x: 105, y: 700, w: 790, h: 521, radius: 16, track: 9, motionBlur: false,
  start: r1(shot(9).t), duration: shot(9).d, anim: 'none', exitDur: 0.12,
  motion: [
    { t: 0, opacity: 0, scale: 1.12 },
    { t: 0.26, opacity: 1, scale: 1, ease: 'brake' },
  ],
});

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

// `make seam-check` can (engine-doctrine/MISTAKES.md #144). Holding each span a little past its cut means the frame
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
