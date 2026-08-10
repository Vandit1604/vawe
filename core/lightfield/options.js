// The option contract, and the only place that decides what a valid field is.
//
// Every rule lives in one table so the checker is one loop and the error messages are uniform.
// Nothing is ever silently dropped or silently replaced: an unknown key, an out-of-range number
// or a malformed colour throws and names itself. That is deliberate. A generator that quietly
// ignores `patern:` hands you a field you did not ask for and no way to find out why.

import { isHex } from './colour.js';

export const PATTERNS = ['slats', 'rings', 'shards'];
// How an element's extent varies with where it sits. `full` is the no-op: every element runs the
// whole frame, which is what a blind does.
export const SHAPES = ['full', 'ramp', 'arch', 'valley', 'wave'];
// Which edge an element grows from. An envelope is a horizon, and a horizon has a side.
export const ANCHORS = ['bottom', 'top'];
// Light rarely leaves along an axis. The corners are here because a frame that darkens down AND
// right at once is ordinary, and no edge keyword can say it.
export const DIRECTIONS = ['left', 'right', 'top', 'bottom', 'center',
  'top-left', 'top-right', 'bottom-left', 'bottom-right'];
export const MOTIONS = ['still', 'drift', 'breathe', 'shimmer'];

// kind: int | unit (a 0..1 dial) | signed (a -1..1 dial) | num | hex | enum | group
export const SCHEMA = {
  seed: { kind: 'int', min: 0, max: 4294967295, def: 3449610, primary: true },

  colour: {
    kind: 'group',
    fields: {
      // The hot core of the light. Read the field from here outwards.
      bloom: { kind: 'hex', def: '#ee7c56', primary: true },
      // The second colour, opposite the bloom. This is what stops a field being one hue.
      mid: { kind: 'hex', def: '#c22d45', primary: true },
      // The saturated body the light sits in.
      deep: { kind: 'hex', def: '#851b08', primary: true },
      // What the light falls away into. Usually near black.
      //
      // `ground` is the FAR STOP OF THE BODY GRADIENT as well as the backdrop, so it is not free to
      // be the shadow colour: it is mixed with `deep` at 35% and 70% across the frame, and a violet
      // ground drags the lit body violet too. Measured, on the reference: pushing ground from
      // #000202 to #12082a took the shadow band's temperature error from +14.4 to -2.6, which is
      // the fix, and the shadow band's dE from 27.7 to 42.2 and the mid band's brightest cell from
      // r-b 133 to 55, which is the picture falling apart. That is why `shade` exists below.
      ground: { kind: 'hex', def: '#000202', primary: true },
      // AMBIENT FILL, and the reason real shadows are cool while the sunlit parts stay warm.
      //
      // A field lit by one warm source has warm shadows, because a shadow here is just less of the
      // same hue. Photographs almost never look like that: the key light is warm and a faint cold
      // skylight fills everything it does not reach, so the dark end of the picture goes blue or
      // violet while the lit end is untouched. That is one operation, SCREEN, with a very dark
      // colour: it lifts black to exactly this colour and leaves white exactly white, which is what
      // "fill" means and what no combination of the four roles above could say.
      //
      // Black is the EXACT no-op (screen(x, 0) = x), so the dial removes itself at its default and
      // the markup says what the options said. The colour's own darkness is its strength, so there
      // is no second amount dial to keep in step with it.
      shade: { kind: 'hex', def: '#000000' },
      // How much the FINISHED field is saturated. 1 leaves it exactly alone.
      //
      // This exists to undo a property of the construction, not to season it to taste. Stacking
      // translucent light means every mid-tone is an sRGB composite of two hues, and an sRGB
      // composite always lands on the straight line between them while real light rides above it:
      // halfway from #ee7c56 to #851b08 the compositor gives #ba4c2f and the reference image has
      // #b52a1a. Measured against the reference, 1.15 takes the field's chroma from 0.82x to 0.93x
      // AND improves the block error, which is the shape of a correction rather than a preference.
      //
      // It is an OPTION and not a constant because on an already-saturated palette it overshoots,
      // and because a hidden multiplier would mean the bloom you typed is not the bloom you get.
      vivid: { kind: 'num', min: 0.5, max: 2, def: 1.15 },
      // How far a lobe of light reaches before it dies, as a stretch of its own falloff.
      //
      // This was a CONSTANT, and it was fitted to one photograph. That image really does have
      // separate lobes with edges you can point at, so the ramp holds 0.85 out to 30% and finishes
      // by 80%, and it measured better than a gentle one. On any reference whose light is one broad
      // mass, the same ramp draws three hard ellipses and no palette can hide them: it is the single
      // thing that stopped a field of flame and a field of evening sky, and both showed it as
      // circles nobody asked for.
      //
      // 0 is the fitted ramp exactly, so the field that constant was chosen for does not move.
      spread: { kind: 'unit', def: 0 },
      // Anything the four roles cannot name, as an ordered list, laid over them in the order given.
      // The roles stay the whole API for a simple field: this is empty by default and most palettes
      // never touch it. The reference needs it, because it carries a dark magenta lane between two
      // orange lobes and a blue corner, and neither is a bloom, a mid, a deep or a ground.
      extra: { kind: 'hexlist', max: 4, def: [] },
    },
  },

  shadow: {
    kind: 'group',
    fields: {
      // How far into darkness the far side goes. 0 emits no shadow layer at all, which is what the
      // reference wants: its colour field already drains to the ground on the right, and a second
      // fall on top of that measured WORSE against the real image.
      depth: { kind: 'unit', def: 0 },
      // How gradual that fall is. 0 is an edge you can point at, 1 crosses the whole frame.
      softness: { kind: 'unit', def: 0.3 },
      // Which way the light falls off.
      direction: { kind: 'enum', of: DIRECTIONS, def: 'bottom' },
      // The two halves of the pattern's contrast, and they are two dials because they are two jobs.
      // `seam` is the line BETWEEN elements: it multiplies, so it darkens without desaturating.
      // `sheen` is the light ON an element's face: it adds the bloom colour, so it brightens along
      // the hue instead of towards white. One combined `relief` could not raise the seams without
      // dimming the picture, which is what made the first pass brown and soft at the same time.
      //
      // SEAM IS SIGNED, and the sign is the polarity. A gap between two slats is dark because the
      // light is behind them; a gap between two lit panels is BRIGHT because the light is between
      // them, and both are ordinary pictures. So a NEGATIVE seam draws the same line into the dodge
      // layer instead of the multiply layer, and one pattern serves a backlit blind and a lit
      // colonnade. The magnitude is the strength either way, and 0 emits no seam cell at all, the
      // same contract `sheen` already had.
      seam: { kind: 'signed', def: 0.5 },
      // How wide that line is, as a fraction of the element it trails. A fraction, not a length, so
      // a dense field gets fine seams and a sparse one gets broad ones without touching this.
      //
      // It is a dial and not a constant because polarity alone cannot draw the second picture: a
      // bright seam at the old fixed 16-40% of an 11-panel field is a bright BAND a tenth of the
      // frame wide, and what a lit colonnade actually shows is a hairline. The default reproduces
      // the old fixed range exactly.
      seamWidth: { kind: 'unit', def: 0.28 },
      // SHEEN IS SIGNED FOR THE SAME REASON, and the two signs together are what make one pattern
      // reach two opposite pictures. A backlit blind is bright faces cut by dark seams; a colonnade
      // against a bright sky is dark SILHOUETTES separated by bright gaps. That is not a second
      // structure, it is the same structure with both polarities flipped, and without a negative
      // sheen the elements can only ever be the lit thing. 0 still emits no face layer at all.
      sheen: { kind: 'signed', def: 0.8 },
    },
  },

  // The silhouette of each element as a function of WHERE IT SITS.
  //
  // Two references asked for what looked like two features: a row of spikes whose heights climb
  // from left to right, and a row of panels whose light stops at a soft horizon that dips in the
  // middle. They are one thing. Each element has an extent, that extent is a function of the
  // element's position across the frame, and the only differences are the function, which end the
  // element grows from, and whether it narrows as it goes.
  envelope: {
    kind: 'group',
    fields: {
      // The function. `full` is 1 everywhere, so the default envelope is no envelope.
      kind: { kind: 'enum', of: SHAPES, def: 'full' },
      // The extent at the function's floor and at its ceiling. `from` above `to` runs the shape
      // backwards, which is why there is no separate direction dial.
      from: { kind: 'unit', def: 0 },
      to: { kind: 'unit', def: 1 },
      // How much each element wanders off the curve. 0 is a clean edge, 1 is a ragged one.
      jitter: { kind: 'unit', def: 0 },
      // Which edge the element grows from. The far end is the one that tapers.
      anchor: { kind: 'enum', of: ANCHORS, def: 'bottom' },
      // How much the element narrows towards its far end. 0 is a bar, 1 is a spike ending in a
      // point. This is the cross-axis half of the same silhouette, which is why it lives here and
      // not beside `count`: it narrows towards whichever end `anchor` says is free.
      taper: { kind: 'unit', def: 0 },
      // How sharply the extent ENDS. 0 stops dead, 1 fades over the element's whole length.
      //
      // An extent with a hard end is a bar chart. Both references that needed an envelope end soft:
      // a flame's tip glows out rather than stopping, and a hill against a bright sky is a blurred
      // edge, not a rectangle. Fading is a mask along the element's own axis, so it costs no filter
      // and no second element, and it fades whichever end `anchor` left free. 0 emits nothing.
      softness: { kind: 'unit', def: 0 },
    },
  },

  pattern: {
    kind: 'group',
    fields: {
      kind: { kind: 'enum', of: PATTERNS, def: 'slats', primary: true },
      // How many elements across the field.
      count: { kind: 'int', min: 1, max: 400, def: 62, primary: true },
      // How unequal they are. 0 is a ruler, 1 is a thicket.
      jitter: { kind: 'unit', def: 0.55 },
    },
  },

  motion: {
    kind: 'group',
    fields: {
      kind: { kind: 'enum', of: MOTIONS, def: 'shimmer', primary: true },
      // Cycles per second, roughly. Motion is driven off var(--t), the engine frame clock.
      speed: { kind: 'num', min: 0, max: 4, def: 1 },
      // How big the move is, as a multiple of the preset's own size.
      amount: { kind: 'num', min: 0, max: 4, def: 1 },
    },
  },
};

class LightfieldError extends Error {
  constructor(msg) {
    super(msg);
    this.name = 'LightfieldError';
  }
}

const fail = (msg) => {
  throw new LightfieldError(msg);
};

const list = (xs) => xs.map((x) => `"${x}"`).join(', ');

function checkUnknown(given, allowed, at) {
  for (const key of Object.keys(given)) {
    if (!allowed.includes(key)) {
      fail(`lightfield: unknown option ${at}${key}. Valid keys here: ${list(allowed)}.`);
    }
  }
}

function checkValue(rule, value, at) {
  switch (rule.kind) {
    case 'hex':
      if (!isHex(value)) fail(`lightfield: ${at} must be a 6-digit hex colour like "#ee7c56". Got ${JSON.stringify(value)}.`);
      return value;
    case 'hexlist':
      if (!Array.isArray(value)) fail(`lightfield: ${at} must be an array of 6-digit hex colours. Got ${JSON.stringify(value)}.`);
      if (value.length > rule.max) fail(`lightfield: ${at} takes at most ${rule.max} colours. Got ${value.length}.`);
      value.forEach((v, i) => {
        if (!isHex(v)) fail(`lightfield: ${at}[${i}] must be a 6-digit hex colour like "#ee7c56". Got ${JSON.stringify(v)}.`);
      });
      return [...value];
    case 'enum':
      if (!rule.of.includes(value)) fail(`lightfield: ${at} must be one of ${list(rule.of)}. Got ${JSON.stringify(value)}.`);
      return value;
    case 'int':
      if (!Number.isInteger(value)) fail(`lightfield: ${at} must be a whole number. Got ${JSON.stringify(value)}.`);
      if (value < rule.min || value > rule.max) fail(`lightfield: ${at} must be between ${rule.min} and ${rule.max}. Got ${value}.`);
      return value;
    case 'unit':
      if (typeof value !== 'number' || !Number.isFinite(value)) fail(`lightfield: ${at} must be a number from 0 to 1. Got ${JSON.stringify(value)}.`);
      if (value < 0 || value > 1) fail(`lightfield: ${at} must be between 0 and 1. Got ${value}.`);
      return value;
    case 'signed':
      if (typeof value !== 'number' || !Number.isFinite(value)) fail(`lightfield: ${at} must be a number from -1 to 1, where the sign is the polarity. Got ${JSON.stringify(value)}.`);
      if (value < -1 || value > 1) fail(`lightfield: ${at} must be between -1 and 1. Got ${value}.`);
      return value;
    case 'num':
      if (typeof value !== 'number' || !Number.isFinite(value)) fail(`lightfield: ${at} must be a number. Got ${JSON.stringify(value)}.`);
      if (value < rule.min || value > rule.max) fail(`lightfield: ${at} must be between ${rule.min} and ${rule.max}. Got ${value}.`);
      return value;
    default:
      return value;
  }
}

// Check the given options against the table and return a fully filled, key-ordered copy.
// Key order is fixed by the table, so two equal option sets always serialise the same way.
export function resolve(given = {}, skipHonours = false) {
  if (given === null || typeof given !== 'object' || Array.isArray(given)) {
    fail(`lightfield: options must be a plain object. Got ${JSON.stringify(given)}.`);
  }
  checkUnknown(given, Object.keys(SCHEMA), '');

  const out = {};
  for (const [key, rule] of Object.entries(SCHEMA)) {
    if (rule.kind !== 'group') {
      out[key] = key in given ? checkValue(rule, given[key], key) : rule.def;
      continue;
    }
    const sub = given[key];
    if (sub !== undefined && (sub === null || typeof sub !== 'object' || Array.isArray(sub))) {
      fail(`lightfield: ${key} must be an object with keys ${list(Object.keys(rule.fields))}. Got ${JSON.stringify(sub)}.`);
    }
    checkUnknown(sub || {}, Object.keys(rule.fields), `${key}.`);
    out[key] = {};
    for (const [k, r] of Object.entries(rule.fields)) {
      out[key][k] = sub && k in sub ? checkValue(r, sub[k], `${key}.${k}`) : r.def;
    }
  }
  if (!skipHonours) checkHonoured(out);
  return out;
}

// Which patterns honour which optional dial.
//
// A dial that only some structures can use is the silent-substitution trap this file exists to
// close: `rings` has no seam WIDTH and no left-to-right axis, so it cannot honour `seamWidth` or
// `envelope`, and quietly accepting them would hand back a field the caller did not ask for with no
// way to find out why. One table, one loop, and the error names the dial AND the patterns that do
// take it.
// A whole group, or one leaf inside it, and who takes it.
export const HONOURS = [
  { at: 'shadow.seamWidth', by: ['slats'] },
  // Rings have no axis to run an envelope along: a band's position is a radius, not a place in a
  // row, so `from` and `to` would have nothing to interpolate between.
  { at: 'envelope', by: ['slats', 'shards'] },
  // A shard grows from a pivot outwards, so its far end is always the far end and there is no
  // second choice for the anchor to make.
  { at: 'envelope.anchor', by: ['slats'] },
];

// Is this option still exactly what the schema would have given it?
function atDefault(out, at) {
  const [group, leaf] = at.split('.');
  const rule = SCHEMA[group];
  if (leaf) return out[group][leaf] === rule.fields[leaf].def;
  return Object.entries(rule.fields).every(([k, r]) => out[group][k] === r.def);
}

// normalise(opts) -> a valid option set from a plausible one.
//
// `resolve` REFUSES a dial the chosen structure cannot honour, which is right: quietly accepting it
// hands back a field nobody asked for. But a caller that picks a structure at random, like the
// playground's randomiser, then has to know the table to avoid making an illegal pair. It should not:
// the table is here, so the repair is here too. Every field a structure cannot honour goes back to its
// declared default, and nothing else is touched.
//
// This is the one legitimate reset. It is not a silent substitution, because the value being dropped
// is one the structure has no way to express.
export function normalise(given) {
  // Fill and range-check WITHOUT the cross-field rule, because that rule is the thing being repaired:
  // calling the strict resolver first would throw on exactly the input this function exists to accept.
  const out = resolve(given, true);
  const kind = out.pattern.kind;
  for (const rule of HONOURS) {
    if (rule.by.includes(kind)) continue;
    const [group, leaf] = rule.at.split('.');
    const spec = SCHEMA[group];
    if (leaf) out[group][leaf] = spec.fields[leaf].def;
    else for (const [k, r] of Object.entries(spec.fields)) out[group][k] = r.def;
  }
  checkHonoured(out);   // it must now pass the real rule, or the repair table is wrong
  return out;
}

function checkHonoured(out) {
  const kind = out.pattern.kind;
  for (const rule of HONOURS) {
    if (rule.by.includes(kind) || atDefault(out, rule.at)) continue;
    fail(`lightfield: pattern.kind "${kind}" does not honour ${rule.at}. `
      + `Only ${list(rule.by)} do. Leave ${rule.at} at its default or change the pattern.`);
  }
}

export { LightfieldError };
