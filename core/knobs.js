// core/knobs.js: the machine-readable map of every preset's dials.
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
import { PRESETS } from './type.js';
import { dialsOf } from './props.js';

const n = (name, def, desc, range) => ({ name, type: 'number', default: def, desc, ...(range ? { range } : {}) });
const col = (name, def, desc) => ({ name, type: 'color', default: def, desc });
const en = (name, values, def, desc) => ({ name, type: 'enum', values, default: def, desc });

// The kinetic three. Same shape, MINUS the default, because a kinetic preset already states its
// defaults in its own signature and the block at the bottom of this file reads them back off it. A
// row here writes only what a signature cannot: the desc, the range, the enum members.
const kn = (name, desc, range) => ({ name, type: 'number', desc, ...(range ? { range } : {}) });
const kcol = (name, desc) => ({ name, type: 'color', desc });
const ken = (name, values, desc) => ({ name, type: 'enum', values, desc });
const kstr = (name, desc, extra) => ({ name, type: 'string', desc, ...extra });

export const KNOBS = {
  // ── kinetic presets (core/type.js): set on a split text layer via `preset` + `presetOpts` ──────
  // Every preset also takes the shared timing dials; only the per-preset ones are listed here.
  kinetic: {
    _shared: [
      n('each', 0.06, 'seconds between each unit entering'),
      n('stagger', 0.04, 'extra offset per unit (rhythm)'),
      n('speed', 1, 'overall speed multiplier'),
    ],
    weight: [kn('from', 'starting weight on the font\'s own wght axis', [100, 900]), kn('to', 'weight it lands on', [100, 900]), kn('rise', 'px the line lifts through while the weight arrives')],
    up: [kn('dist', 'rise distance px')],
    down: [kn('dist', 'drop distance px')],
    scale: [kn('from', 'start scale (0..1)')],
    stretch: [kn('from', 'start scaleX: over 1 is the smear this preset is for, under 1 is a squeeze')],
    blur: [kn('px', 'start blur px')],
    focus: [kn('px', 'start blur px')],
    bounce: [kn('bounce', 'spring bounciness'), kn('settle', 'settle time'), kn('dist', 'travel px')],
    elastic: [kn('bounce', 'wobble amount'), kn('settle', 'settle time')],
    slide: [ken('dir', ['left', 'right', 'up', 'down'], 'slide direction'), kn('dist', 'travel px')],
    wave: [kn('amp', 'wave height px'), kn('phase', 'waves across the line')],
    shimmerWave: [kn('amp', 'crest size: the lift, depth, rotation and scale all ride on it')],
    fall: [kn('dist', 'fall distance px')],
    skew: [kn('dist', 'travel px')],
    tilt: [kn('deg', 'tilt degrees'), kn('dist', 'travel px')],
    gradient: [kcol('c1', 'gradient start (also both ends of the ramp)'), kcol('c2', 'gradient midpoint, the bright band that sweeps through')],
    highlight: [kcol('color', 'marker colour: keep it translucent, it sits BEHIND the glyphs')],
    underline: [kcol('color', 'underline colour'), kn('h', 'underline thickness px')],
    shadow: [kn('dist', 'shadow offset px at the start, collapsing to 0 as the word settles')],
    riseClip: [kn('dist', 'clip rise as a PERCENTAGE of the unit\'s own height, so it scales with the type')],
    draw: [kstr('ease', 'easing name (core/ease.js)', { probe: 'linear' }), { name: 'back', type: 'bool', desc: 'draw from the far end' }],
    chroma: [kn('dist', 'split distance px'), kn('rise', 'rise px'), kn('residual', 'fringe left at rest: 0 is a crisp glyph')],
    swing: [kn('deg', 'swing angle'), kn('bounce', 'bounciness'), kn('settle', 'settle time')],
    unfold: [kn('deg', 'fold angle')],
    // the three that USED to be fixed, now knobbed
    type: [kn('at', 'fraction of the entrance where it snaps on (0 = instant)', [0, 1])],
    flip: [ken('axis', ['x', 'y'], 'hinge axis: x = top-over, y = door-swing'), kn('deg', 'start angle')],
    // colorWave paints `color` every frame, so both ends default to a THEME variable rather than to a
    // literal: the accent it lights in, the layer's own settled ink it lands on. Neither is a number a
    // signature can state, so both rows come back with a null default and the desc carries the answer.
    colorWave: [kcol('flash', 'the colour each unit lights in (unset = the theme accent)'), kcol('to', 'the colour it settles to (unset = that layer\'s own ink)'), kn('hold', 'fraction of the window the unit holds the flash before it starts settling', [0, 0.95])],
    strike: [kcol('color', 'rule colour'), kn('h', 'rule thickness px'), kn('fade', 'how far the word dims once the line has crossed it (0 keeps it at full strength)', [0, 1]), kn('at', 'height of the rule as a percentage of the line box', [0, 100])],
    flap: [kn('steps', 'how many flaps it runs before it lands, so also the speed: the whole run is fitted into `each`')],
    // assemble's five worked and were catalogued NOWHERE, so the AE recipe the preset was built from
    // (a range selector with randomize-order on) was unreachable from the outside. `shuffle` is the one
    // that matters: it is the randomized ORDER, and at 0 the preset reads as a line being typed.
    assemble: [kn('dist', 'how far out a glyph starts, px: each takes its own fraction of it'), kn('spin', 'largest start rotation in degrees, signed per glyph'), kn('shuffle', 'fraction of a unit\'s own window spent as a hashed delay, which is what scatters the arrival ORDER', [0, 1]), kstr('seed', 'seed for the scatter field: change it for a different arrangement, same on every render'), kn('blur', 'motion blur px on the travel, 0 turns it off')],
    // decode used to read NOTHING: animateUnits returned before it passed popts, so every dial written
    // here would have been accepted and ignored (docs/MISTAKES.md #542). These three are what the
    // reference implementations expose and what a brand actually changes.
    //
    // IT IS ALSO THE ONE PRESET WHOSE ROWS ARE STILL HAND-WRITTEN END TO END, defaults included. It
    // takes no options bag at all, animateUnits reads these dials for it, so `dialsOf` returns null and
    // the reconciliation at the bottom of this file skips it. That is "cannot say", never "reads none".
    decode: [
      { name: 'chars', type: 'string', default: 'mixed', desc: 'charset name (core/type.js DECODE_CHARS: mixed, upperCase, lowerCase, numbers, symbols, blocks, binary) or your own string of glyphs' },
      n('rate', 48, 'junk-character refreshes per SECOND (a rate, so a slower reveal is not also a slower scramble)'),
      n('revealDelay', 0, 'fraction of the window the unit holds fully scrambled before it starts resolving', [0, 0.95]),
    ],
  },

  // ── three.js scenes (core/three-fx.js), `three: "name"`, per-scene knobs ────────────────────────
  three: {
    _shared: [col('colors', '#8ab4ff', 'palette (array); colors[0] subject, colors[1] fill light'), n('speed', 1, 'motion speed')],
    deviceShowcase: [en('device', ['phone', 'laptop', 'tablet'], 'phone', 'device shell'), col('bodyColor', '#1b1d22', 'shell colour'), n('spin', 1, 'auto-rotate'), n('yaw', 0, 'yaw deg'), n('pitch', 0, 'pitch deg'), { name: 'screen', type: 'string', default: '', desc: 'image put on the screen face' }, n('roughness', 0.34, 'surface roughness'), n('metalness', 0.86, 'metalness')],
    uiParallax: [n('planes', 4, 'stacked planes'), n('travel', 1, 'parallax travel'), n('swing', 1, 'sway amount')],
    pointCloud: [n('count', 4000, 'particle count'), n('pointSize', 0.018, 'particle size'), n('morphSpeed', 1, 'morph rate'), n('spin', 1, 'auto-rotate'), n('seed', 1, 'shape seed')],
    extrudeText: [n('depth', 0.3, 'extrusion depth'), n('roughness', 0.28, 'surface roughness'), n('metalness', 0.72, 'metalness'), n('spin', 1, 'auto-rotate')],
    shatter: [n('count', 144, 'shards (rounded to a square grid)'), n('seed', 7, 'break pattern seed'), n('breakAt', 0.6, 'seconds before the surface breaks'), n('breakDur', 2.4, 'seconds the break takes'), n('travel', 2.6, 'how far the shards fly'), n('depth', 1.6, 'how far they fly toward camera'), n('spin', 1, 'tumble rate'), n('roughness', 0.32, 'surface roughness'), n('metalness', 0.55, 'metalness'), n('yaw', 0, 'yaw'), n('pitch', 0, 'pitch'), { name: 'screen', type: 'string', default: '', desc: 'image mapped across the surface before it breaks' }],
    magnetic: [n('poles', 2, '2 = dipole, 1 = a single source', [1, 2]), n('count', 18, 'field lines'), n('seed', 3, 'launch-angle seed'), n('pointSize', 0.05, 'travelling charge size'), n('spin', 1, 'orbit rate'), n('yaw', 0, 'yaw'), n('pitch', 0.18, 'pitch')],
    // The code-* trio share ONE layout builder (`codeBoard` in core/three-fx.js), so they share their
    // dials too: `lines` is the snippet the board is derived from, and breakAt/breakDur are that
    // scene's single event, a build-in, a burn, an assembly.
    codeExtrude: [{ name: 'lines', type: 'string', default: '', desc: 'the snippet, one string per line (array)' }, n('breakAt', 0.3, 'seconds before the first row rises'), n('breakDur', 1.1, 'seconds one row takes to land'), n('travel', 1, 'row-to-row delay multiplier'), n('depth', 1.8, 'how far back a row starts'), n('seed', 5, 'per-token constants seed'), n('spin', 1, 'drift rate'), n('roughness', 0.34, 'surface roughness'), n('metalness', 0.5, 'metalness'), n('yaw', -0.34, 'yaw'), n('pitch', 0.16, 'pitch')],
    codeDissolve: [{ name: 'lines', type: 'string', default: '', desc: 'the snippet, one string per line (array)' }, n('breakAt', 0.8, 'seconds before the burn starts'), n('breakDur', 2, 'seconds the burn takes'), n('seed', 5, 'grain seed'), n('spin', 1, 'drift rate'), n('yaw', -0.28, 'yaw'), n('pitch', 0.14, 'pitch')],
    codeAssemble: [{ name: 'lines', type: 'string', default: '', desc: 'the snippet, one string per line (array)' }, n('breakAt', 0.3, 'seconds before the first token flies in'), n('breakDur', 1.2, 'seconds one token takes to land'), n('travel', 1, 'how far apart the arrivals are spread'), n('seed', 5, 'scatter seed'), n('spin', 1, 'tumble rate'), n('roughness', 0.34, 'surface roughness'), n('metalness', 0.5, 'metalness'), n('yaw', -0.3, 'yaw'), n('pitch', 0.15, 'pitch')],
    liquidBackground: [n('count', 96, 'plane subdivisions per side'), n('amp', 0.34, 'swell height'), n('morphSpeed', 1, 'churn rate'), n('seed', 11, 'wave-set seed'), n('roughness', 0.22, 'surface roughness'), n('metalness', 0.62, 'metalness'), n('pitch', 0.62, 'tilt away from camera'), n('yaw', 0, 'roll')],
  },

  // ── raymarch (core/raymarch-fx.js), `raymarch: "name"`, SAME dials for all 5 ────────────────────
  raymarch: {
    _shared: [
      col('colors', '#8ab4ff', 'palette (array)'),
      n('intensity', 1, 'effect strength', [0, 2]),
      n('speed', 1, 'motion speed'),
      n('spin', 1, 'rotation rate'),
      n('seed', 1, 'variation seed'),
    ],
  },

  // ── ambient shader fields (core/shaders-ambient.js), `shader: "name"`, SAME dials for all 17 ────
  ambient: {
    _shared: [
      col('colors', '#8ab4ff', 'palette (array)'),
      n('intensity', 0.35, 'field strength', [0, 1]),
      n('speed', 1, 'flow speed'),
      n('seed', 1, 'variation seed'),
    ],
  },

  // ── shader stings (core/stings.js): `fx` in a stings[] entry, SAME dials for all 35 ─────────────
  sting: {
    _shared: [
      col('color', '#ffffff', 'tint colour'),
      n('intensity', 1, 'strength', [0, 2]),
      col('colors', '#8ab4ff', 'palette (only leak/domainWarp use it)'),
      n('seed', 1, 'variation seed'),
    ],
  },

  // ── composite looks (core/looks.js), `filter: "name"` or "name:0.8"; strength + lookOpts ────────
  look: {
    _shared: [
      n('strength', 0.7, 'master 0..1; also the positional "neon:0.8"', [0, 1]),
      col('color', null, 'recolour the look: glow, streak, leak, wash and light all follow it'),
      col('color2', null, 'the opposite side of a colour split (looks with a `chromatic` pass)'),
      col('colors', null, 'gradient-map ramp stops (thermal, chrome)'),
      n('grain', null, 'grain amount'),
      n('vignette', null, 'vignette strength'),
      // No `warmth`: it was listed here, in core/looks.js and in docs/PRIMITIVES.md, and no pass in
      // any of the 31 looks ever read it. Not every look takes every knob either, `liveKnobs(name)`
      // says which, and passing one a look cannot apply now throws. docs/MISTAKES.md #351.
    ],
  },
};

// ── ONE OWNER PER DEFAULT ────────────────────────────────────────────────────────────────────────
//
// A kinetic dial's NAME and its DEFAULT live in the preset's own signature (core/type.js). This block
// reads them back off it with `dialsOf` (core/props.js) and writes them onto the rows above, so the
// rows state only what a signature cannot: the desc, the range, the enum members.
//
// IT REFUSES RATHER THAN RECONCILES, because the two sides had already drifted on TEN dials and
// nothing anywhere said so. `stretch` destructures `from = 1.6`, a horizontal smear that snaps in from
// over-wide, and this file advertised 0.4, a scale-up from small: the opposite gesture. `gradient` and
// `highlight` advertised a different brand's colours entirely. That is worse than a stale doc, because
// mcp/catalog.mjs hands these rows to `vawe_capabilities`: an outside model asked what `stretch` takes,
// was told 0.4, wrote 0.4 to KEEP the default, and got a frame the engine would never have rendered on
// its own. No error, no gate, just a wrong picture.
//
// A gate cannot close this and one was already trying: scripts/gates/knobs-audit.mjs proves an
// advertised dial CHANGES the output, and it probes with `(Number(k.default) || 1) * 2 + 3`, so a dial
// whose stated default is wrong still moves the frame and still passes. The refusal has to sit at the
// write site, which is here.
//
// Exported so the refusals can be exercised on a fixture: they fire at module load, and a test cannot
// break a manifest that has already loaded.
export function bindDials(family, presets) {
  for (const [name, fn] of Object.entries(presets)) {
    const sig = dialsOf(fn);
    // null is "cannot say", never "reads no dials". `decode` is the live case: it takes no options bag
    // because animateUnits reads its dials for it, so nothing here can check its rows and it keeps them.
    if (!sig) continue;
    const rows = family[name] || [];
    for (const row of rows) {
      if (!(row.name in sig))
        throw new Error(`kinetic preset "${name}" advertises a dial "${row.name}" its signature does not`
          + ` read. It reads: ${Object.keys(sig).join(', ')}. Delete the row in core/knobs.js, or`
          + ` destructure the dial in core/type.js. A dial nothing reads is ignored at render.`);
      // A row may still carry a hand-written default, because nothing stops a future author typing one
      // back in, and a SECOND opinion about a number is the state this block exists to end. Name both.
      if ('default' in row && row.default !== sig[row.name])
        throw new Error(`kinetic preset "${name}" states two defaults for "${row.name}": core/type.js`
          + ` destructures ${JSON.stringify(sig[row.name])} and core/knobs.js advertises`
          + ` ${JSON.stringify(row.default)}. The signature is what the engine runs. Delete the default`
          + ` from the knobs row: it is read off the signature.`);
      // undefined means the signature names the dial and states no default (colorWave's flash and to
      // resolve to a theme variable at render). `null` is this manifest's word for "no stated default".
      row.default = sig[row.name] === undefined ? null : sig[row.name];
    }
    const missing = Object.keys(sig).filter((d) => !rows.some((r) => r.name === d));
    if (missing.length)
      throw new Error(`kinetic preset "${name}" reads ${missing.map((d) => `"${d}"`).join(', ')} and`
        + ` core/knobs.js does not list ${missing.length > 1 ? 'them' : 'it'}. A dial with no row is`
        + ` invisible to vawe_capabilities, to make knobs and to the dead-knob validator, so nobody`
        + ` outside this file can find it. Add the row: the desc is what a signature cannot state.`);
  }
  return family;
}

bindDials(KNOBS.kinetic, PRESETS);

// The families whose whole preset list shares one dial set (no per-preset overrides).
export const UNIFORM_FAMILIES = ['raymarch', 'ambient', 'sting', 'look'];

/** Every knob NAME that any preset in a family reads. The set a dead-knob check measures against. */
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
// NOMINATE the peak, so a film can sit safely between them and still be shapeless.
//
// The clause is two-sided and that is the whole point. Naming the loud moment is simultaneously a
// promise that every other beat stays restrained, and a promise nobody enforces is a comment. So the
// author declares the peak once and the ENGINE pulls the rest down, which makes one loud moment the
// cheap thing to write. That is the actual lack: authors were not failing to be restrained, they had
// no way to say WHERE the restraint was being spent.
//
// The walk that applies these numbers to a scene is core/spectacle.js; the vocabulary and the
// arithmetic are here, beside the other dials, and they are pure so a gate can test them.

// THE DEVICES, and every one of them already ships. `device` names a SHADER STING (core/stings.js).
// The engine's existing vocabulary for a loud instant at an arbitrary time, which is exactly the
// shape of the thing being declared. No new effect: the twelve below are the subset of SHADER_FX
// that read as a PEAK rather than as a transition, and a name outside it is refused rather than
// substituted (core/registry.js, a `pick` takes no fallback).
const DEVICE_BLURBS = {
  flash: 'a single bright bloom over the whole frame, up and gone, the plainest peak there is',
  chromaticSplit: 'the frame tears into red/green/blue and snaps back, impact, energy, a hard landing',
  glitch: 'a stepped horizontal shear, no smoothing. Alarm, breakage, a system under load',
  streak: 'a bright bar sweeps the frame. A specular pass over a mark, the cheapest premium peak',
  whipPan: 'the frame smears sideways as if the camera whipped to it, motion the picture cannot carry alone',
  ripple: 'a ring travels out from the centre and distorts what it crosses, an impact you can watch spread',
  sdfIris: 'a hard iris opens from the centre. A shutter on the moment, theatrical and exact',
  vortex: 'the frame twists about its centre and unwinds, the loudest of the radial family',
  lens: 'a wide optical bulge and release. The frame bending under the weight of the moment',
  dispersion: 'the picture separates into its spectrum and reassembles, glass, prisms, luxury',
  iridescence: 'an oil-slick sheen washes across the frame once, colour as the event',
  cinematicZoom: 'a fast push with the blur that comes off it, the frame lunging at the subject',
};

// A device that is not a real sting would resolve to nothing at render, so the list is asserted
// against its source at load rather than trusted to stay in step with a rename.
for (const d of Object.keys(DEVICE_BLURBS))
  if (!SHADER_FX.includes(d))
    throw new Error(`spectacle device "${d}" is not a shader sting, core/knobs.js and core/stings.js have drifted.`);

export const SPECTACLE_DEVICES = defineRegistry('spectacle device',
  Object.fromEntries(Object.keys(DEVICE_BLURBS).map((k) => [k, k])),
  { blurbs: DEVICE_BLURBS, slot: 'spectacle.device',
  catalog: {
    title: 'Spectacle devices',
    tag: 'scene',
    intro: '`"spectacle": { "at", "of", "device", "why" }`. The film NOMINATES its one loud moment. `device` is written as a shader sting at `at`, above the film; the other half is what makes it real, because with a spectacle declared the engine pulls EVERY competing amplitude dial down to 55% (other stings, seams, look strength, glow/beam intensity, kick scale) and exempts the layer named by `of`. Naming the peak is a promise the rest stays restrained. `core/spectacle.js`.',
    usage: (n, { j }) => j({ spectacle: { at: 2.4, of: 'hero', device: n, why: 'the one loud moment, and every other dial drops to 55%' } }),
    noPreview: 'a spectacle is a whole film turning its other dials down. One clip cannot show the restraint that makes it work.',
  },
});

// THE TWO NUMBERS. `peak` is what the declared moment's own sting is set to, over the sting default
// of 1; `rest` is what every competing amplitude dial elsewhere in the film is multiplied by.
//
// 0.55 rather than something gentler because the gesture has to survive being watched once. A film
// that drops its other effects by a tenth has not made room for anything, and the author will simply
// go back to hand-tuning, which is the behaviour this dial exists to replace. Roughly half is the
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
