// core/knobs.js — the machine-readable map of every preset's dials.
//
// WHY THIS EXISTS. Every preset in the engine reads knobs (colours, speed, count, angle…), but an
// author could not FIND them: kinetic knob names lived in a label string, a look's pass knobs lived
// nowhere reachable, and a knob set on the wrong preset was silently ignored. This file is the one
// place that says, per preset, which dials it reads. Three things consume it: `vawe_capabilities`
// (so a caller's model can discover the dials), `make knobs` (docs), and the dead-knob validator
// (so a dial on a preset that ignores it fails LOUD instead of doing nothing).
//
// A knob: { name, type, default, range?, values?, desc }. `type` is number | enum | color | bool |
// string. Families whose presets share ONE dial set list it under `_shared` with no per-preset block;
// families with genuinely different dials per preset list each.

const n = (name, def, desc, range) => ({ name, type: 'number', default: def, desc, ...(range ? { range } : {}) });
const col = (name, def, desc) => ({ name, type: 'color', default: def, desc });
const en = (name, values, def, desc) => ({ name, type: 'enum', values, default: def, desc });

export const KNOBS = {
  // ── kinetic presets (core/type.js) — set on a split text layer via `preset` + `presetOpts` ──────
  // Every preset also takes the shared timing dials; only the per-preset ones are listed here.
  kinetic: {
    _shared: [
      n('each', 0.06, 'seconds between each unit entering'),
      n('stagger', 0.04, 'extra offset per unit (rhythm)'),
      n('speed', 1, 'overall speed multiplier'),
    ],
    up: [n('dist', 60, 'rise distance px')],
    down: [n('dist', 60, 'drop distance px')],
    scale: [n('from', 0.4, 'start scale (0..1)')],
    stretch: [n('from', 0.4, 'start scale')],
    blur: [n('px', 16, 'start blur px')],
    focus: [n('px', 16, 'start blur px')],
    bounce: [n('bounce', 0.5, 'spring bounciness'), n('settle', 0.5, 'settle time'), n('dist', 60, 'travel px')],
    elastic: [n('bounce', 0.62, 'wobble amount'), n('settle', 0.5, 'settle time')],
    slide: [en('dir', ['left', 'right', 'up', 'down'], 'left', 'slide direction'), n('dist', 70, 'travel px')],
    wave: [n('amp', 14, 'wave height px'), n('phase', 0, 'waves across the line')],
    fall: [n('dist', 90, 'fall distance px')],
    skew: [n('dist', 70, 'travel px')],
    tilt: [n('deg', 8, 'tilt degrees'), n('dist', 26, 'travel px')],
    gradient: [col('c1', '#ff5e7a', 'gradient start'), col('c2', '#7c5cff', 'gradient end')],
    highlight: [col('color', '#ffe08a', 'marker colour')],
    underline: [col('color', '#5e6ad2', 'underline colour'), n('h', 6, 'underline thickness px')],
    shadow: [n('dist', 6, 'shadow offset px')],
    riseClip: [n('dist', 60, 'clip rise px')],
    draw: [{ name: 'ease', type: 'string', default: 'easeOutCubic', probe: 'linear', desc: 'easing name (core/ease.js)' }, { name: 'back', type: 'bool', default: false, desc: 'overshoot the stroke' }],
    chroma: [n('dist', 16, 'split distance px'), n('rise', 10, 'rise px'), n('residual', 0, 'trailing fringe')],
    swing: [n('deg', 24, 'swing angle'), n('bounce', 0.5, 'bounciness'), n('settle', 0.55, 'settle time')],
    unfold: [n('deg', 90, 'fold angle')],
    // the three that USED to be fixed, now knobbed
    type: [n('at', 0, 'fraction of the entrance where it snaps on (0 = instant)', [0, 1])],
    flip: [en('axis', ['x', 'y'], 'x', 'hinge axis: x = top-over, y = door-swing'), n('deg', 80, 'start angle')],
    // decode's only parameter is engine-injected; nothing author-facing.
    decode: [],
  },

  // ── three.js scenes (core/three-fx.js) — `three: "name"`, per-scene knobs ────────────────────────
  three: {
    _shared: [col('colors', '#8ab4ff', 'palette (array); colors[0] subject, colors[1] fill light'), n('speed', 1, 'motion speed')],
    deviceShowcase: [en('device', ['phone', 'laptop', 'tablet'], 'phone', 'device shell'), col('bodyColor', '#1b1d22', 'shell colour'), n('spin', 1, 'auto-rotate'), n('yaw', 0, 'yaw deg'), n('pitch', 0, 'pitch deg')],
    uiParallax: [n('planes', 4, 'stacked planes'), n('travel', 1, 'parallax travel'), n('swing', 1, 'sway amount')],
    pointCloud: [n('count', 4000, 'particle count'), n('pointSize', 0.018, 'particle size'), n('morphSpeed', 1, 'morph rate'), n('spin', 1, 'auto-rotate'), n('seed', 1, 'shape seed')],
    extrudeText: [n('depth', 0.3, 'extrusion depth'), n('roughness', 0.28, 'surface roughness'), n('metalness', 0.72, 'metalness'), n('spin', 1, 'auto-rotate')],
  },

  // ── raymarch (core/raymarch-fx.js) — `raymarch: "name"`, SAME dials for all 5 ────────────────────
  raymarch: {
    _shared: [
      col('colors', '#8ab4ff', 'palette (array)'),
      n('intensity', 1, 'effect strength', [0, 2]),
      n('speed', 1, 'motion speed'),
      n('spin', 1, 'rotation rate'),
      n('seed', 1, 'variation seed'),
    ],
  },

  // ── ambient shader fields (core/shaders-ambient.js) — `shader: "name"`, SAME dials for all 17 ────
  ambient: {
    _shared: [
      col('colors', '#8ab4ff', 'palette (array)'),
      n('intensity', 0.35, 'field strength', [0, 1]),
      n('speed', 1, 'flow speed'),
      n('seed', 1, 'variation seed'),
    ],
  },

  // ── shader stings (core/stings.js) — `fx` in a stings[] entry, SAME dials for all 35 ─────────────
  sting: {
    _shared: [
      col('color', '#ffffff', 'tint colour'),
      n('intensity', 1, 'strength', [0, 2]),
      col('colors', '#8ab4ff', 'palette (only leak/domainWarp use it)'),
      n('seed', 1, 'variation seed'),
    ],
  },

  // ── composite looks (core/looks.js) — `filter: "name"` or "name:0.8"; strength + lookOpts ────────
  look: {
    _shared: [
      n('strength', 0.7, 'master 0..1; also the positional "neon:0.8"', [0, 1]),
      col('color', null, 'recolour the look: glow, streak, leak, wash and light all follow it'),
      col('color2', null, 'the opposite side of a colour split (looks with a `chromatic` pass)'),
      col('colors', null, 'gradient-map ramp stops (thermal, chrome)'),
      n('grain', null, 'grain amount'),
      n('vignette', null, 'vignette strength'),
      // No `warmth`: it was listed here, in core/looks.js and in docs/PRIMITIVES.md, and no pass in
      // any of the 31 looks ever read it. Not every look takes every knob either — `liveKnobs(name)`
      // says which, and passing one a look cannot apply now throws. docs/MISTAKES.md #351.
    ],
  },
};

// The families whose whole preset list shares one dial set (no per-preset overrides).
export const UNIFORM_FAMILIES = ['raymarch', 'ambient', 'sting', 'look'];

/** Every knob NAME that any preset in a family reads — the set a dead-knob check measures against. */
export function knobNames(family) {
  const fam = KNOBS[family];
  if (!fam) return new Set();
  const names = new Set((fam._shared || []).map((k) => k.name));
  for (const [k, list] of Object.entries(fam)) {
    if (k === '_shared') continue;
    for (const knob of list) names.add(knob.name);
  }
  return names;
}

/** The knobs legal for ONE preset: shared + that preset's own. */
export function knobsFor(family, preset) {
  const fam = KNOBS[family];
  if (!fam) return [];
  return [...(fam._shared || []), ...(fam[preset] || [])];
}
