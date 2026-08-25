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

import { defineRegistry } from './registry.js';
import { SHADER_FX } from './stings.js';

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
    deviceShowcase: [en('device', ['phone', 'laptop', 'tablet'], 'phone', 'device shell'), col('bodyColor', '#1b1d22', 'shell colour'), n('spin', 1, 'auto-rotate'), n('yaw', 0, 'yaw deg'), n('pitch', 0, 'pitch deg'), { name: 'screen', type: 'string', default: '', desc: 'image put on the screen face' }],
    uiParallax: [n('planes', 4, 'stacked planes'), n('travel', 1, 'parallax travel'), n('swing', 1, 'sway amount')],
    pointCloud: [n('count', 4000, 'particle count'), n('pointSize', 0.018, 'particle size'), n('morphSpeed', 1, 'morph rate'), n('spin', 1, 'auto-rotate'), n('seed', 1, 'shape seed')],
    extrudeText: [n('depth', 0.3, 'extrusion depth'), n('roughness', 0.28, 'surface roughness'), n('metalness', 0.72, 'metalness'), n('spin', 1, 'auto-rotate')],
    shatter: [n('count', 144, 'shards (rounded to a square grid)'), n('seed', 7, 'break pattern seed'), n('breakAt', 0.6, 'seconds before the surface breaks'), n('breakDur', 2.4, 'seconds the break takes'), n('travel', 2.6, 'how far the shards fly'), n('depth', 1.6, 'how far they fly toward camera'), n('spin', 1, 'tumble rate'), n('roughness', 0.32, 'surface roughness'), n('metalness', 0.55, 'metalness'), n('yaw', 0, 'yaw'), n('pitch', 0, 'pitch'), { name: 'screen', type: 'string', default: '', desc: 'image mapped across the surface before it breaks' }],
    magnetic: [n('poles', 2, '2 = dipole, 1 = a single source', [1, 2]), n('count', 18, 'field lines'), n('seed', 3, 'launch-angle seed'), n('pointSize', 0.05, 'travelling charge size'), n('spin', 1, 'orbit rate'), n('yaw', 0, 'yaw'), n('pitch', 0.18, 'pitch')],
    // The code-* trio share ONE layout builder (`codeBoard` in core/three-fx.js), so they share their
    // dials too: `lines` is the snippet the board is derived from, and breakAt/breakDur are that
    // scene's single event — a build-in, a burn, an assembly.
    codeExtrude: [{ name: 'lines', type: 'string', default: '', desc: 'the snippet, one string per line (array)' }, n('breakAt', 0.3, 'seconds before the first row rises'), n('breakDur', 1.1, 'seconds one row takes to land'), n('travel', 1, 'row-to-row delay multiplier'), n('depth', 1.8, 'how far back a row starts'), n('seed', 5, 'per-token constants seed'), n('spin', 1, 'drift rate'), n('roughness', 0.34, 'surface roughness'), n('metalness', 0.5, 'metalness'), n('yaw', -0.34, 'yaw'), n('pitch', 0.16, 'pitch')],
    codeDissolve: [{ name: 'lines', type: 'string', default: '', desc: 'the snippet, one string per line (array)' }, n('breakAt', 0.8, 'seconds before the burn starts'), n('breakDur', 2, 'seconds the burn takes'), n('seed', 5, 'grain seed'), n('spin', 1, 'drift rate'), n('yaw', -0.28, 'yaw'), n('pitch', 0.14, 'pitch')],
    codeAssemble: [{ name: 'lines', type: 'string', default: '', desc: 'the snippet, one string per line (array)' }, n('breakAt', 0.3, 'seconds before the first token flies in'), n('breakDur', 1.2, 'seconds one token takes to land'), n('travel', 1, 'how far apart the arrivals are spread'), n('seed', 5, 'scatter seed'), n('spin', 1, 'tumble rate'), n('roughness', 0.34, 'surface roughness'), n('metalness', 0.5, 'metalness'), n('yaw', -0.3, 'yaw'), n('pitch', 0.15, 'pitch')],
    liquidBackground: [n('count', 96, 'plane subdivisions per side'), n('amp', 0.34, 'swell height'), n('morphSpeed', 1, 'churn rate'), n('seed', 11, 'wave-set seed'), n('roughness', 0.22, 'surface roughness'), n('metalness', 0.62, 'metalness'), n('pitch', 0.62, 'tilt away from camera'), n('yaw', 0, 'roll')],
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

// ── THE SPECTACLE DIAL: one loud moment, and everything else pulled down ─────────────────────────
//
// WHY IT LIVES HERE. Every knob above answers "what can this preset be told". The spectacle answers
// the question one level up: of all the dials a film sets, which ONE is allowed to sit at the top of
// its range. A film that shouts on four beats has no loud moment, it has a volume setting, and
// neither `effect-soup` (the ceiling) nor `plain-slideshow` (the floor) ever asks the author to
// NOMINATE the peak — so a film can sit safely between them and still be shapeless.
//
// The clause is two-sided and that is the whole point. Naming the loud moment is simultaneously a
// promise that every other beat stays restrained, and a promise nobody enforces is a comment. So the
// author declares the peak once and the ENGINE pulls the rest down, which makes one loud moment the
// cheap thing to write. That is the actual lack: authors were not failing to be restrained, they had
// no way to say WHERE the restraint was being spent.
//
// The walk that applies these numbers to a scene is core/spectacle.js; the vocabulary and the
// arithmetic are here, beside the other dials, and they are pure so a gate can test them.

// THE DEVICES, and every one of them already ships. `device` names a SHADER STING (core/stings.js) —
// the engine's existing vocabulary for a loud instant at an arbitrary time, which is exactly the
// shape of the thing being declared. No new effect: the twelve below are the subset of SHADER_FX
// that read as a PEAK rather than as a transition, and a name outside it is refused rather than
// substituted (core/registry.js — a `pick` takes no fallback).
const DEVICE_BLURBS = {
  flash: 'a single bright bloom over the whole frame, up and gone — the plainest peak there is',
  chromaticSplit: 'the frame tears into red/green/blue and snaps back — impact, energy, a hard landing',
  glitch: 'a stepped horizontal shear, no smoothing — alarm, breakage, a system under load',
  streak: 'a bright bar sweeps the frame — a specular pass over a mark, the cheapest premium peak',
  whipPan: 'the frame smears sideways as if the camera whipped to it — motion the picture cannot carry alone',
  ripple: 'a ring travels out from the centre and distorts what it crosses — an impact you can watch spread',
  sdfIris: 'a hard iris opens from the centre — a shutter on the moment, theatrical and exact',
  vortex: 'the frame twists about its centre and unwinds — the loudest of the radial family',
  lens: 'a wide optical bulge and release — the frame bending under the weight of the moment',
  dispersion: 'the picture separates into its spectrum and reassembles — glass, prisms, luxury',
  iridescence: 'an oil-slick sheen washes across the frame once — colour as the event',
  cinematicZoom: 'a fast push with the blur that comes off it — the frame lunging at the subject',
};

// A device that is not a real sting would resolve to nothing at render, so the list is asserted
// against its source at load rather than trusted to stay in step with a rename.
for (const d of Object.keys(DEVICE_BLURBS))
  if (!SHADER_FX.includes(d))
    throw new Error(`spectacle device "${d}" is not a shader sting — core/knobs.js and core/stings.js have drifted.`);

export const SPECTACLE_DEVICES = defineRegistry('spectacle device',
  Object.fromEntries(Object.keys(DEVICE_BLURBS).map((k) => [k, k])),
  { blurbs: DEVICE_BLURBS, slot: 'spectacle.device' });

// THE TWO NUMBERS. `peak` is what the declared moment's own sting is set to, over the sting default
// of 1; `rest` is what every competing amplitude dial elsewhere in the film is multiplied by.
//
// 0.55 rather than something gentler because the gesture has to survive being watched once. A film
// that drops its other effects by a tenth has not made room for anything, and the author will simply
// go back to hand-tuning — which is the behaviour this dial exists to replace. Roughly half is the
// point at which a beat stops competing and starts supporting.
export const SPECTACLE_GAIN = Object.freeze({ peak: 1.35, rest: 0.55 });

// The default sting span. Stated here because the spectacle WRITES a sting rather than reading one,
// so it cannot inherit scene.js's `s.dur ?? 1.0` by omission and still be legible in the JSON.
export const SPECTACLE_DUR = 0.9;

const r3 = (v) => +(+v).toFixed(3);

/** An amplitude dial pulled down. `def` is the value the engine would have used had it been unset. */
export const attenuated = (v, def) => r3((v == null ? def : v) * SPECTACLE_GAIN.rest);

/**
 * A KICK pulled down. `kick.scale` is a multiplier about 1, not an amount, so scaling it directly
 * would attenuate a 0.94 kick-IN into a stronger one. The distance FROM 1 is the amplitude.
 */
export const attenuatedKick = (scale) => r3(1 + (scale - 1) * SPECTACLE_GAIN.rest);
