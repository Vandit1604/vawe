// blocks/schema.mjs · the OPTION CONTRACT for the block registry, and the only place that decides
// what a valid block field is.
//
// WHY THIS EXISTS: a JS default is a value, not a contract. `w = 560` says nothing about the floor
// below which the plot area clamps to zero, `color = SERIES[0]` says nothing about it being a colour
// rather than a string, and `tone = 'info'` says nothing about the six other spellings that paint.
// So nothing could build a control panel for a block, nothing could validate a caller, and every
// range lived in the author's head. One table per FAMILY fixes all three.
//
// It mirrors core/lightfield/options.js key for key, so one reader handles a generator and a block:
//   { kind, def, ...bounds }, groups nest through `fields`, an enum names its values in `of`.
//
// SEVEN KINDS ARE NEW HERE, and each one exists because a block needs a shape lightfield never had:
//   str    : a title, a label, a URL. Stuffing prose into an `enum` to avoid this would be a lie
//            about the field, and the playground would render a dropdown for a headline.
//   bool   : `dark`, `highlight`, `done`, `area`, `divider`. A two-value enum would render as a
//            dropdown where the interface wants a switch.
//   color  : a hex OR a theme expression. `hex` cannot hold `var(--accent)` or a `color-mix()`, and
//            those ARE the library's defaults: blocks emit CSS vars so the same block reskins per
//            brand. A `hex`-only rule would have failed 30 of the library's own defaults.
//   list   : the ordered content a block draws: chart data, log lines, tabs, commits. The single
//            most common shape in the registry, and lightfield has no array of anything but colours.
//   row    : one element of a list, as a field table with no defaults. Distinct from `group`, which
//            is a nested OPTIONS object the resolver fills in; a row is caller-supplied content and
//            filling it with defaults would invent data.
//   oneOf  : a slot that genuinely takes two shapes: a code line is a string or {text, color}, a tab
//            is a string or {label, icon}. Both forms ship in the catalog today.
//   block  : a `{block, props}` descriptor: what a container pane holds. splitScreen, screenSwap and
//            comparison's screen form all take one, and it is not a string, a row or a list.
//
// x · y · start · dur appear in NO table. They are placement and timing the scene supplies (a
// container injects them, `make expand` writes them), never content an author dials. The check in
// scripts/gates/block-schema.mjs holds every table to that, and to the defaults the code really has.

// The tables themselves are DISCOVERED, not imported: blocks/index.mjs reads the family modules and
// merges every `<FAM>_SCHEMAS` export it finds. This file used to carry one import line per family
// plus a name in the spread below, which is two edits per new family carrying no information the
// family module did not already have.
import { SCHEMAS } from './index.mjs';

// Every kind the tables may use. The first seven are lightfield's; the rest are declared above.
export const KINDS = ['int', 'unit', 'num', 'hex', 'hexlist', 'enum', 'group',
  'str', 'bool', 'color', 'list', 'row', 'oneOf', 'block'];

// family → option table. One table per FAMILY, never per catalog entry: a namespaced entry
// ("card.pricing") is the same factory with preset props, so it is the same contract.
export const SCHEMA = SCHEMAS;

class BlockOptionError extends Error {
  constructor(msg) { super(msg); this.name = 'BlockOptionError'; }
}
const fail = (msg) => { throw new BlockOptionError(msg); };
const list = (xs) => xs.map((x) => `"${x}"`).join(', ');

// A hex, or a theme expression that resolves at render. Only a literal hex can be judged here; a
// var() or a color-mix() is the library's own vocabulary and is passed through, exactly as the
// factories emit it.
const HEX = /^#[0-9a-fA-F]{6}$/;
const THEME_COLOUR = /^(var|color-mix|rgb|rgba|hsl|hsla|linear-gradient|radial-gradient)\(/;
export const isBlockColour = (v) => typeof v === 'string' && (HEX.test(v) || THEME_COLOUR.test(v));

// Check one value against one rule and return it. Nothing is silently dropped or replaced: an
// out-of-range number, a malformed colour or an unknown enum value throws and names itself.
export function checkValue(rule, value, at) {
  switch (rule.kind) {
    case 'hex':
      if (!HEX.test(String(value))) fail(`block: ${at} must be a 6-digit hex colour like "#4C8DFF". Got ${JSON.stringify(value)}.`);
      return value;
    case 'color':
      if (!isBlockColour(value)) fail(`block: ${at} must be a hex colour or a theme expression like "var(--accent)". Got ${JSON.stringify(value)}.`);
      return value;
    case 'hexlist':
      if (!Array.isArray(value)) fail(`block: ${at} must be an array of 6-digit hex colours. Got ${JSON.stringify(value)}.`);
      if (rule.max != null && value.length > rule.max) fail(`block: ${at} takes at most ${rule.max} colours. Got ${value.length}.`);
      value.forEach((v, i) => { if (!HEX.test(String(v))) fail(`block: ${at}[${i}] must be a 6-digit hex colour. Got ${JSON.stringify(v)}.`); });
      return [...value];
    case 'enum':
      if (!rule.of.includes(value)) fail(`block: ${at} must be one of ${list(rule.of)}. Got ${JSON.stringify(value)}.`);
      return value;
    case 'str':
      if (typeof value !== 'string') fail(`block: ${at} must be a string. Got ${JSON.stringify(value)}.`);
      if (rule.max != null && value.length > rule.max) fail(`block: ${at} must be at most ${rule.max} characters. Got ${value.length}.`);
      return value;
    case 'bool':
      if (typeof value !== 'boolean') fail(`block: ${at} must be true or false. Got ${JSON.stringify(value)}.`);
      return value;
    case 'int':
      if (!Number.isInteger(value)) fail(`block: ${at} must be a whole number. Got ${JSON.stringify(value)}.`);
      if (value < rule.min || value > rule.max) fail(`block: ${at} must be between ${rule.min} and ${rule.max}. Got ${value}.`);
      return value;
    case 'unit':
      if (typeof value !== 'number' || !Number.isFinite(value)) fail(`block: ${at} must be a number from 0 to 1. Got ${JSON.stringify(value)}.`);
      if (value < 0 || value > 1) fail(`block: ${at} must be between 0 and 1. Got ${value}.`);
      return value;
    case 'num':
      if (typeof value !== 'number' || !Number.isFinite(value)) fail(`block: ${at} must be a number. Got ${JSON.stringify(value)}.`);
      if (value < rule.min || value > rule.max) fail(`block: ${at} must be between ${rule.min} and ${rule.max}. Got ${value}.`);
      return value;
    case 'list':
      if (!Array.isArray(value)) fail(`block: ${at} must be an array. Got ${JSON.stringify(value)}.`);
      if (rule.max != null && value.length > rule.max) fail(`block: ${at} takes at most ${rule.max} entries. Got ${value.length}.`);
      return value.map((v, i) => checkValue(rule.of, v, `${at}[${i}]`));
    case 'row': {
      if (value === null || typeof value !== 'object' || Array.isArray(value)) {
        fail(`block: ${at} must be an object with keys ${list(Object.keys(rule.fields))}. Got ${JSON.stringify(value)}.`);
      }
      for (const key of Object.keys(value)) {
        if (!(key in rule.fields)) fail(`block: unknown key ${at}.${key}. Valid keys here: ${list(Object.keys(rule.fields))}.`);
      }
      // A row is caller content, so an absent field stays absent. Filling it would invent data.
      const out = {};
      for (const [k, r] of Object.entries(rule.fields)) {
        if (k in value && value[k] !== undefined) out[k] = checkValue(r, value[k], `${at}.${k}`);
      }
      return out;
    }
    case 'oneOf': {
      const why = [];
      for (const alt of rule.of) {
        try { return checkValue(alt, value, at); } catch (e) { why.push(e.message); }
      }
      return fail(`block: ${at} matched none of its accepted shapes (${rule.of.map((a) => a.kind).join(' or ')}). ${why.join(' ')}`);
    }
    case 'block':
      if (value === null || typeof value !== 'object' || Array.isArray(value) || typeof value.block !== 'string') {
        fail(`block: ${at} must be a block descriptor { block, props }. Got ${JSON.stringify(value)}.`);
      }
      return value;
    default:
      return fail(`block: ${at} declares kind "${rule.kind}", which is not one of ${list(KINDS)}.`);
  }
}

// Check the given options for one family against its table and return a filled, key-ordered copy.
// Key order is fixed by the table, so two equal option sets always serialise the same way.
//
// Placement and timing pass through untouched: they are the scene's, not the block's, and a resolver
// that rejected `x` would be unusable by the very containers that inject it.
export const PASSTHROUGH = ['x', 'y', 'start', 'dur'];

export function resolve(family, given = {}) {
  const table = SCHEMA[family];
  if (!table) fail(`block: no option table for family "${family}".`);
  if (given === null || typeof given !== 'object' || Array.isArray(given)) {
    fail(`block: ${family} options must be a plain object. Got ${JSON.stringify(given)}.`);
  }
  const allowed = [...Object.keys(table), ...PASSTHROUGH];
  for (const key of Object.keys(given)) {
    if (!allowed.includes(key)) fail(`block: ${family} has no option "${key}". Valid keys: ${list(allowed)}.`);
  }
  const out = {};
  for (const k of PASSTHROUGH) if (k in given) out[k] = given[k];
  for (const [key, rule] of Object.entries(table)) {
    if (key in given && given[key] !== undefined) { out[key] = checkValue(rule, given[key], `${family}.${key}`); continue; }
    // A rule with no `def` is a field the factory itself leaves undefined. Declaring one here would
    // invent a default the code does not have.
    if ('def' in rule) out[key] = rule.def;
  }
  return out;
}

export { BlockOptionError };
