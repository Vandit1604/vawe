// The option contract, and the only place that decides what a valid field is.
//
// Every rule lives in one table so the checker is one loop and the error messages are uniform.
// Nothing is ever silently dropped or silently replaced: an unknown key, an out-of-range number
// or a malformed colour throws and names itself. That is deliberate. A generator that quietly
// ignores `patern:` hands you a field you did not ask for and no way to find out why.

import { isHex } from './colour.js';

export const PATTERNS = ['slats', 'rings', 'shards'];
// Light rarely leaves along an axis. The corners are here because a frame that darkens down AND
// right at once is ordinary, and no edge keyword can say it.
export const DIRECTIONS = ['left', 'right', 'top', 'bottom', 'center',
  'top-left', 'top-right', 'bottom-left', 'bottom-right'];
export const MOTIONS = ['still', 'drift', 'breathe', 'shimmer'];

// kind: int | unit (a 0..1 dial) | num | hex | enum | group
export const SCHEMA = {
  seed: { kind: 'int', min: 0, max: 4294967295, def: 1950907 },

  colour: {
    kind: 'group',
    fields: {
      // The hot core of the light. Read the field from here outwards.
      bloom: { kind: 'hex', def: '#ee7c56' },
      // The second colour, opposite the bloom. This is what stops a field being one hue.
      mid: { kind: 'hex', def: '#c22d45' },
      // The saturated body the light sits in.
      deep: { kind: 'hex', def: '#851b08' },
      // What the light falls away into. Usually near black.
      ground: { kind: 'hex', def: '#000202' },
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
      softness: { kind: 'unit', def: 0.5 },
      // Which way the light falls off.
      direction: { kind: 'enum', of: DIRECTIONS, def: 'right' },
      // How hard each pattern element is cut against its neighbour. This is the texture dial.
      relief: { kind: 'unit', def: 0.4 },
    },
  },

  pattern: {
    kind: 'group',
    fields: {
      kind: { kind: 'enum', of: PATTERNS, def: 'slats' },
      // How many elements across the field.
      count: { kind: 'int', min: 1, max: 400, def: 88 },
      // How unequal they are. 0 is a ruler, 1 is a thicket.
      jitter: { kind: 'unit', def: 0.55 },
    },
  },

  motion: {
    kind: 'group',
    fields: {
      kind: { kind: 'enum', of: MOTIONS, def: 'shimmer' },
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
export function resolve(given = {}) {
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
  return out;
}

export { LightfieldError };
