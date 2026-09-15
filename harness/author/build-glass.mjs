// harness/author/build-glass.mjs: generate films/scene/glass.json.
//
// THE CONCEPT, because the first version of this file did not have one. That draft was four frosted
// rectangles drifting over a gradient: the stock result anyone gets from typing "glassmorphism" into
// anything. Nothing happened in it, nothing became anything, and it needed a `no-visual-vocabulary`
// waiver to ship, which was the tell.
//
// (`visual-vocabulary` has since been deleted for measuring size wrongly, but the tell was still a
// tell: the draft had no subject, and needing a waiver was how that showed.)
//
// Glass is not a surface, it is a BEHAVIOUR: it hides, it bends, it reveals. So the film is a reveal,
// and the glass is what is doing the hiding. A real photograph of a lit filament sits behind the panes,
// unreadable through the frost. The panes slide off one at a time and it resolves. That gives the film a
// subject, a turn, and a reason for the last frame to exist.
//
// It also earns its gates instead of waiving them:
//   · the SUBJECT is a real photograph, so the film shows something rather than excusing itself;
//   · the photograph is on screen from the first frame to the last and is never replaced, so it is a
//     genuine continuous object, and what changes across the film is how much of it you can see.
//
// Light through glass is also materially exact. A frosted pane over a gradient is decoration; a frosted
// pane over a light source is the substance doing the one thing it actually does.
import fs from 'node:fs';

const OUT = 'films/scene/glass.json';
const DUR = 12.0;
const r1 = (v) => +v.toFixed(2);
const layers = [];
const SHOT = '/assets/cutouts/bulb.png';   // rembg cutout: `make cutout SRC=… NAME=bulb`

// ── the subject ────────────────────────────────────────────────────────────────────────────────────
// Present from frame one, never replaced, pushing in slowly for the whole film. It is the continuous
// object; the panes are the obstruction. A 1024x1536 portrait photograph in a landscape frame, so it is
// deliberately oversized and cropped to the filament rather than letterboxed around the whole picture.
// A CUTOUT, not a photograph. This is the fix that four others failed to be. As a rectangular JPEG the
// subject could not both be recognisable and edge-free: cropped to fill the frame it read as an orange
// blob, and sized to the bulb it left its own border as the most obvious line on screen once the panes
// cleared. `fade:"edges"` applies but is a fixed radial that only softens the far corners, and matching
// the ground to the photo's sampled grey lost to the vignette. With the background actually REMOVED
// there is no edge to hide, the ground is free again, and light can sit behind the glass.
layers.push({
  type: 'image', id: 'subject', src: SHOT,
  x: 667, y: 68, w: 587, h: 880, radius: 0, track: 2, motionBlur: false,
  start: 0, duration: DUR, anim: 'none', exitDur: 0,
  motion: [
    { t: 0, scale: 1.05, y: 24 },   // sized so the push never takes the bulb past the safe box
    { t: DUR, scale: 1.0, y: 0, ease: 'linear' },   // one continuous push, no easing beats inside it
  ],
});

// The light the bulb is casting. Only possible with a cutout: behind a rectangular photo this would have
// been hidden by the photo's own black ground. It sits UNDER the subject and over the backdrop, so the
// glow reads as coming from inside the glass rather than as a lamp pointed at it.
layers.push({
  type: 'glow', id: 'halo', x: 720, y: 400, w: 480, h: 480, track: 1,
  color: '#ffb457', opacity: 0.5, intensity: 0.85,
  start: 0, duration: DUR, anim: 'fade', enterDur: 2.0, exitDur: 0,
});

// ── the obstruction ────────────────────────────────────────────────────────────────────────────────
// Four panes covering the subject completely at t=0, leaving one at a time. `off` is where each goes;
// they exit in four different directions so the clearing does not read as one curtain opening. Frost is
// heaviest on the panes that leave first, because the film should get clearer as it goes.
// THEY MUST TILE THE FRAME, not float in it. The first pass stacked four panes near the middle and left
// the backdrop showing down both sides, so the subject was already visible at 1.5s and the panes read as
// floating rectangles: the same failure as the draft this file replaces. Four oversized, slightly rotated
// slabs, but NOT a 2x2 grid: laid out as quadrants they aligned into a hard cross seam down the middle
// of the frame and read as four panels rather than overlapping glass. These are deliberately mismatched
// in size and rotated 3 to 6 degrees, each far oversized, so the frame is covered several times over and
// no two edges line up. Each one leaving uncovers a different part, so the reveal is staged rather than
// switched on.
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
      // it leaves and keeps going. A pane that drifted back would put the obstruction back on.
      { t: clear, x: p.off.x, y: p.off.y, rot: p.off.rot, opacity: 0, ease: 'brake' },
      { t: DUR, x: p.off.x, y: p.off.y, rot: p.off.rot, opacity: 0, ease: 'linear' },
    ],
  });
});

// ── the line ───────────────────────────────────────────────────────────────────────────────────────
// One line, arriving as the last pane leaves. It is a caption on a reveal rather than a headline over a
// mood, which is most of the difference between this film and the draft it replaces.
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
    // The first draft of this file waived `no-visual-vocabulary`, and that waiver was the 31st in a
    // library of 96 (quality/gates/waiver-drift.mjs). That gate is gone now; the reason for the rewrite
    // was never the gate. This film has a subject because a film needs one.
    allow: ['no-transition'],
    _why: {
      'no-transition': 'There is no cut in this film. One continuous shot on one subject, with the obstruction leaving in four stages; a cut would break the only thing holding it together.',
    },
  },
  layers,
  // Deep and nearly black, and NOT `ink`, whose dot matrix showed through the gaps and competed with the
  // subject. The light in this film comes from the subject; the ground's only job is to stay out of it.
  // Free to be dark again now that the subject carries no ground of its own. The light in this film comes
  // from inside the bulb, so the room around it should be a room, not a backdrop competing for attention.
  bg: [{ t: 0, preset: 'deep', from: 0, to: DUR }],
  audio: { silent: true },
};

fs.writeFileSync(OUT, JSON.stringify(scene, null, 2) + '\n');
console.log(`✓ ${OUT}  ${layers.length} layers · ${DUR}s · 16:9`);
console.log('  a lit filament behind four frosted panes · they leave at 3.1 / 5.0 / 6.9 / 8.8s');
