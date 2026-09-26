import fs from 'node:fs';

const OUT = 'films/scene/glass.json';
const DUR = 12.0;
const r1 = (v) => +v.toFixed(2);
const layers = [];
const SHOT = '/assets/cutouts/bulb.png';   // rembg cutout: `make media X=cutout SRC=… NAME=bulb`

layers.push({
  type: 'image', id: 'subject', src: SHOT,
  x: 667, y: 68, w: 587, h: 880, radius: 0, track: 2, motionBlur: false,
  start: 0, duration: DUR, anim: 'none', exitDur: 0,
  motion: [
    { t: 0, scale: 1.05, y: 24 },   // sized so the push never takes the bulb past the safe box
    { t: DUR, scale: 1.0, y: 0, ease: 'linear' },   // one continuous push, no easing beats inside it
  ],
});

layers.push({
  type: 'glow', id: 'halo', x: 720, y: 400, w: 480, h: 480, track: 1,
  color: '#ffb457', opacity: 0.5, intensity: 0.85,
  start: 0, duration: DUR, anim: 'fade', enterDur: 2.0, exitDur: 0,
});

const PANES = [
  { id: 'p1', x: -300, y: -260, w: 1500, h: 1700, rot: -6.0, blur: 30, off: { x: -1700, y: -260,  rot: -13 }, go: 3.1 },
  { id: 'p2', x: 520,  y: -420, w: 1700, h: 1150, rot: 4.5,  blur: 26, off: { x: 500,   y: -1500, rot: 11 },  go: 5.0 },
  { id: 'p3', x: 380,  y: 260,  w: 1800, h: 1200, rot: -3.0, blur: 22, off: { x: 1800,  y: 420,   rot: 8 },   go: 6.9 },
  { id: 'p4', x: -240, y: 340,  w: 1500, h: 1100, rot: 5.5,  blur: 18, off: { x: -260,  y: 1400,  rot: -9 },  go: 8.8 },
];

PANES.forEach((p, i) => {
  const clear = r1(p.go + 1.5);
  layers.push({
    type: 'html', id: p.id, x: p.x, y: p.y, w: p.w, h: p.h, track: 4 + i,
    start: 0, duration: DUR, anim: 'none', exitDur: 0,
    html: `<div class="g"><style>
      /* Near-opaque on purpose. backdrop-filter blurs what is BEHIND it, and behind most of each pane is
         flat darkness, so blurring alone produced nothing. Two passes at this were far too transparent:
         at ~0.15 alpha over near-black a single pane is invisible, and only the OVERLAPS doubled up
         enough to see, which read as narrow bands crossing the frame rather than four slabs. Measuring
         the boxes settled it. They were 1227x841 and tiling correctly the whole time, so the geometry
         was never the problem. Frost that does not conceal cannot stage a reveal. */
      .g{height:100%;border-radius:18px;
         background:linear-gradient(${140 + i * 25}deg, rgba(216,228,247,0.62), rgba(146,168,202,0.50));
         -webkit-backdrop-filter:blur(${p.blur}px) saturate(1.25) brightness(1.05);
         backdrop-filter:blur(${p.blur}px) saturate(1.25) brightness(1.05);
         box-shadow:0 40px 90px rgba(2,5,12,0.55),
                    inset 0 1px 0 rgba(255,255,255,0.45),
                    inset 0 0 0 1px rgba(255,255,255,0.16)}
    </style></div>`,
    motion: [
      { t: 0, x: 0, y: 0, rot: p.rot, opacity: 1 },
      { t: p.go, x: 0, y: 0, rot: p.rot, opacity: 1, ease: 'linear' },
      { t: clear, x: p.off.x, y: p.off.y, rot: p.off.rot, opacity: 0, ease: 'brake' },
      { t: DUR, x: p.off.x, y: p.off.y, rot: p.off.rot, opacity: 0, ease: 'linear' },
    ],
  });
});

layers.push({
  type: 'text', text: 'It was lit the whole time.', x: 150, y: 870, w: 900, size: 58, weight: 600,
  color: 'rgba(246,240,230,0.92)', align: 'left', track: 20,
  split: 'word', preset: 'up', stagger: 0.07, each: 0.6,
  start: 9.4, duration: r1(DUR - 9.4), anim: 'none', exitDur: 0,
});

const scene = {
  module: 'scene',
  theme: 'glassatmos',
  aspect: '16:9',
  duration: DUR,
  authoringNote: 'A reveal in which the glass is what hides the subject. A real photograph of a lit '
    + 'filament sits behind four frosted panes that cover it completely at t=0 and leave one at a time. '
    + 'The photograph is the continuous object; what changes is how much of it you can see.',
  authoring: {
    allow: ['no-transition'],
    _why: {
      'no-transition': 'There is no cut in this film. One continuous shot on one subject, with the obstruction leaving in four stages; a cut would break the only thing holding it together.',
    },
  },
  layers,
  bg: [{ t: 0, preset: 'deep', from: 0, to: DUR }],
  audio: { silent: true },
};

fs.writeFileSync(OUT, JSON.stringify(scene, null, 2) + '\n');
console.log(`✓ ${OUT}  ${layers.length} layers · ${DUR}s · 16:9`);
console.log('  a lit filament behind four frosted panes · they leave at 3.1 / 5.0 / 6.9 / 8.8s');
