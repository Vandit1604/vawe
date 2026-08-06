// scripts/author/build-glass.mjs — generate formats/scene/glass.json.
//
// An ATMOSPHERIC piece, not a message film: frosted panes, depth, and light moving behind glass. There
// is no product and almost no copy, so everything has to be carried by material and motion.
//
// WHAT MAKES GLASS READ AS GLASS, and it is only one of these four:
//   1. SOMETHING ALIVE BEHIND IT. `backdrop-filter` blurs whatever is underneath, so a frosted pane over
//      a flat field is a grey rectangle. The aurora background is not decoration here, it is the thing
//      being refracted — remove it and the entire look collapses.
//   2. DEPTH, from overlap and differential drift. Panes at different distances move at different
//      speeds; that parallax is what stops a stack of translucent boxes reading as flat.
//   3. AN EDGE. Real glass catches light on its rim: a 1px border at low white alpha, brighter on the
//      top edge than the bottom, is most of the illusion.
//   4. A SPECULAR SWEEP. A highlight travelling across the surface, driven by var(--t) so it is a pure
//      function of the frame and the render stays deterministic.
//
// The panes are `html` layers because backdrop-filter has no equivalent in the primitive vocabulary.
// That is the honest reason, not a preference: a rect cannot refract what is behind it.
import fs from 'node:fs';

const OUT = 'formats/scene/glass.json';
const W = 1920, H = 1080;
const DUR = 13.0;
const r1 = (v) => +v.toFixed(2);
const layers = [];

// ── the panes ──────────────────────────────────────────────────────────────────────────────────────
// Overlapping, at three depths. `depth` drives blur strength, opacity, drift distance and z-order at
// once, because those are not four decisions — they are one decision (how far away is this) expressed
// four ways. Tuning them independently is how a glass stack stops looking like one space.
const PANES = [
  { id: 'far',  x: 250,  y: 180, w: 520, h: 700, rot: -5.5, depth: 0.35, start: 1.4 },
  { id: 'mid',  x: 700,  y: 300, w: 640, h: 460, rot: 2.5,  depth: 0.7,  start: 0.2 },
  { id: 'near', x: 1150, y: 210, w: 480, h: 620, rot: -2.0, depth: 1.0,  start: 2.6 },
  { id: 'chip', x: 880,  y: 760, w: 300, h: 120, rot: 1.5,  depth: 0.85, start: 5.4 },
];

const pane = (p) => {
  const blur = r1(6 + p.depth * 16);          // nearer glass frosts harder
  const alpha = r1(0.06 + p.depth * 0.07);
  const edge = r1(0.16 + p.depth * 0.24);
  const drift = r1(14 + p.depth * 34);        // parallax: nearer panes travel further
  const dur = r1(DUR - p.start);
  return {
    type: 'html', id: p.id, x: p.x, y: p.y, w: p.w, h: p.h, track: Math.round(2 + p.depth * 6),
    start: p.start, duration: dur, anim: 'none', exitDur: 0,
    html: `<div class="g"><style>
      .g{position:relative;height:100%;border-radius:26px;overflow:hidden;
         background:linear-gradient(150deg, rgba(255,255,255,${alpha + 0.05}), rgba(255,255,255,${alpha * 0.4}));
         -webkit-backdrop-filter:blur(${blur}px) saturate(1.5);
         backdrop-filter:blur(${blur}px) saturate(1.5);
         box-shadow:0 30px 80px rgba(4,8,18,${r1(0.2 + p.depth * 0.3)}),
                    inset 0 1px 0 rgba(255,255,255,${edge}),
                    inset 0 0 0 1px rgba(255,255,255,${r1(edge * 0.45)})}
      /* the specular sweep: a soft diagonal highlight crossing the pane, positioned from the scene
         clock so it is a pure function of the frame. Offset per pane so they do not flash in unison. */
      .g::after{content:"";position:absolute;top:-60%;bottom:-60%;width:36%;
         background:linear-gradient(90deg,transparent,rgba(255,255,255,${r1(0.10 + p.depth * 0.12)}),transparent);
         transform:rotate(18deg);
         left:calc(-40% + 180% * (0.5 + 0.5 * cos(calc((var(--t) * 0.55 + ${p.depth * 2.1}) * 1rad))))}
    </style></div>`,
    motion: [
      { t: 0, opacity: 0, scale: 0.965, y: r1(drift * 0.7), rot: r1(p.rot * 1.5), blur: 5 },
      { t: 1.1, opacity: 1, scale: 1, y: 0, rot: p.rot, blur: 0, ease: 'brake' },
      // it never settles completely: glass this close to the camera should always be breathing
      { t: dur, opacity: 1, scale: r1(1 + p.depth * 0.03), y: r1(-drift), rot: r1(p.rot + p.depth * 1.4), blur: 0, ease: 'linear' },
    ],
  };
};
PANES.forEach((p) => layers.push(pane(p)));

// ── the light ──────────────────────────────────────────────────────────────────────────────────────
// One slow bar of light crossing behind the panes, so the frosting has something to do. It sits UNDER
// the near panes and OVER the far one, which is the whole reason the depth ordering above is explicit.
layers.push({
  type: 'glow', id: 'shaft', x: -200, y: -260, w: 620, h: 1600, track: 5,
  // glow speaks its OWN vocabulary — angle/intensity/preset — not the generic transform props. `rot`
  // and `blur` are motion-KEY names, and the validator rightly refused them here rather than accepting
  // them and rendering a shaft with neither.
  color: '#7cc5ff', opacity: 0.30, intensity: 0.9, angle: 16,
  start: 3.0, duration: r1(DUR - 3.0), anim: 'fade', enterDur: 1.4, exitDur: 1.2,
  motion: [
    { t: 0, x: 0 },
    { t: r1(DUR - 3.0), x: 1900, ease: 'linear' },   // constant travel: a light source does not ease
  ],
});

// ── the one line of type ───────────────────────────────────────────────────────────────────────────
// Small, late, and off to one side. An atmospheric piece that opens on a headline stops being
// atmospheric; the type arrives once the material has already made its case.
layers.push({
  type: 'text', text: 'light, held still', x: 250, y: 930, w: 700, size: 46, weight: 500,
  color: 'rgba(226,236,252,0.72)', align: 'left', track: 20,
  split: 'word', preset: 'blur', stagger: 0.09, each: 0.7,
  start: 8.2, duration: r1(DUR - 8.2), anim: 'none', exitDur: 0,
});

const scene = {
  module: 'scene',
  theme: 'glassatmos',
  aspect: '16:9',
  duration: DUR,
  authoringNote: 'Atmospheric glassmorphism study. The aurora background is load-bearing, not decorative: '
    + 'backdrop-filter blurs what is behind it, so a frosted pane over a flat field is a grey rectangle. '
    + 'Depth comes from one `depth` value driving blur, opacity, drift and z-order together.',
  authoring: {
    allow: ['no-continuous-object', 'no-continuous-object-inferred', 'no-transition', 'text-only-beat',
      'graphics-thin', 'no-visual-vocabulary'],
    _why: {
      'no-continuous-object': 'The panes ARE the continuous object: all four are on screen from their entrance to the last frame and none is ever replaced. The gate looks for a prop that survives a CUT, and this film has no cuts at all, because an atmospheric piece that cuts is no longer atmospheric.',
      'no-continuous-object-inferred': 'Same panes. The inferred boundaries are entrances, not cuts.',
      'no-transition': 'Nothing to transition between. One continuous shot is the form.',
      'text-only-beat': 'The opposite is true here: the beats are almost entirely material and carry one small line of type at the very end.',
      'graphics-thin': 'Same reason as no-visual-vocabulary below.',
      'no-visual-vocabulary': 'The gate is RIGHT and this is a deliberate exception, not a measurement problem. Its own taxonomy says gradients are decoration that carries no information, and these panes are gradients plus a backdrop blur: they encode no quantity and depict no real thing. A first draft of this waiver argued the panes were graphics the gate could not count, which was wrong. htmlGraphic() looks for an inline svg, a conic-gradient or variable-length bars, and those are the right things to look for. The honest position is that an ATMOSPHERIC piece has no information to show, so a rule about how information should be shown does not apply to it. That exemption is available to exactly this kind of film and to nothing that makes a claim.',
    },
  },
  layers,
  // Load-bearing. Remove this and every pane above becomes a grey rectangle.
  // `blobs` is an ARRAY of blob specs, not a count — passing the number 5 threw `blobs.forEach is not a
  // function` at the first frame. The validator accepted it because the KEY is a real aurora parameter
  // and its type is never checked, which is the type-agnostic gap from docs/MISTAKES.md #213 showing up
  // one level down, in fx options rather than layer props.
  //
  // Tuned rather than defaulted: the stock blobs are blue/purple/cyan, and these are the theme's own ice
  // blue plus a deep indigo and a teal, at large radii and long periods (18-26s) so the field moves
  // slower than the panes do. Glass reads as glass when what is behind it drifts and the surface does
  // not — matching their speeds flattens the whole illusion.
  // INTENSITY IS THE WHOLE LOOK. At 0.42 the field was too dim to survive a 6-22px backdrop blur and
  // every pane rendered as a grey rectangle — the exact failure the header of this file warns about,
  // committed anyway on the first pass. Frosting DIVIDES what is behind it; the field has to be far
  // brighter than looks right on its own, because you are never seeing it directly.
  // Positioned to sit BEHIND the panes (which occupy x 250-1630, y 180-880) rather than spread evenly
  // across the canvas: colour in the corners is colour no pane will ever refract.
  bg: [{ t: 0, preset: 'aurora', from: 0, to: DUR, opts: { intensity: 0.95, blobs: [
    { color: '104,186,255', x: 0.26, y: 0.30, r: 900, ax: 140, ay: 100, px: 22, py: 26, ph: 0 },
    { color: '92,74,236', x: 0.70, y: 0.58, r: 880, ax: 170, ay: 130, px: 26, py: 19, ph: 2.1 },
    { color: '46,214,196', x: 0.52, y: 0.22, r: 700, ax: 120, ay: 90, px: 18, py: 24, ph: 4.2 },
    { color: '236,96,168', x: 0.84, y: 0.34, r: 520, ax: 100, ay: 120, px: 30, py: 21, ph: 1.3 },
  ] } }],
  audio: { silent: true },
};

fs.writeFileSync(OUT, JSON.stringify(scene, null, 2) + '\n');
console.log(`✓ ${OUT}  ${layers.length} layers · ${DUR}s · 16:9`);
console.log('  4 panes at 3 depths over an aurora field · one light shaft · one line, late');
