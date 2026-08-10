// core/generators.js — the registry of PLAYABLE GENERATORS.
//
// A generator is a pure function from an options object to markup. It knows nothing about scenes,
// layers or the renderer, which is what lets the same function run in the Go render, in `make
// preview`, and in a browser on the marketing site with dials attached to it.
//
// THE CONTRACT. An entry is:
//
//   { name, blurb, schema, render(opts) -> html, docs }
//
//   schema  a DECLARATIVE option table, the shape core/lightfield/options.js defines: every field is
//           `{ kind, ...bounds, def }`, and `kind: 'group'` nests via `fields`. This is the whole
//           reason the registry exists. A JS default (`w = 560`) is a value; a schema entry is a
//           contract, and only a contract can produce a control: a range makes a slider, an `of`
//           makes a select, `hex` makes a colour well.
//   presets an optional named set of full option objects, and the better place to START someone. A
//           schema's `def` is the neutral value a field takes when nobody said otherwise, which is not
//           the same thing as a good-looking result: lightfield's fitted `ref` differs from its
//           defaults on three colour stops. Landing a visitor on the raw defaults shows them the
//           least considered version of the thing you are asking them to judge.
//   render  called with a partial options object. It MUST validate and throw on anything it does not
//           understand, rather than substituting a default. The playground shows that message to the
//           person turning the dial, so a thrown error is a feature here, not a failure.
//   produces what `render` returns, and therefore how a page previews it:
//             'html'   a markup string. Inject it and drive `--t`.
//             'layers' an array of scene layers. A block is a scene FRAGMENT, not a picture, so it is
//                      previewed by booting the engine on a scene built around it, which is the path
//                      /blocks already takes. Rendering its `html` layers by hand would be a second
//                      engine that agrees with the first until it does not.
//
// WHY A REGISTRY AND NOT A LIST IN THE SITE. The site is a separate app that vendors this directory
// (scripts/site/site-engine.mjs). A hand-kept list over there is a second source of truth that goes
// stale silently, which is precisely how site/public froze 77 files behind core/ (docs/MISTAKES.md
// #271). The site reads GENERATORS and renders whatever it finds.
//
// ADDING ONE. Export a `SCHEMA` and a render function from your module, then add a row here. If your
// generator has no schema it does not belong in the playground yet: without one there is nothing to
// build a panel from, and inferring dials from example values guesses ranges and misses enums.
import { lightfield } from './lightfield/index.js';
import { SCHEMA as LIGHTFIELD_SCHEMA } from './lightfield/options.js';
import { PRESETS as LIGHTFIELD_PRESETS } from './lightfield/presets.js';
import { SCHEMA as BLOCK_SCHEMA } from '../blocks/schema.mjs';
import { CATALOG } from '../blocks/catalog.mjs';
import * as BLOCKS from '../blocks/index.mjs';

const FIELDS = [
  {
    name: 'lightfield',
    group: 'fields',
    blurb: 'Light-field backdrops. Four colour roles, a pattern, a fall of shadow, one seed.',
    docs: 'docs/LIGHTFIELD.md',
    schema: LIGHTFIELD_SCHEMA,
    presets: LIGHTFIELD_PRESETS,
    produces: 'html',
    render: lightfield,
  },
];

// The block families, DERIVED from the two registries rather than listed again here. A third list of
// blocks would go stale the first time one was added, and `make coverage` already reported 14 of 14
// while a 15th type existed (docs/MISTAKES.md #21, #65).
//
// `catalog.mjs` maps a NAMED entry to a family plus example props, and several names share a family,
// so the examples become this family's presets: `card.pricing` and `card.stat` are two starting points
// for one set of dials, which is exactly what a preset is for.
const blockFamilies = () => {
  const byFamily = new Map();
  for (const c of CATALOG) {
    if (!BLOCK_SCHEMA[c.family] || typeof BLOCKS[c.family] !== 'function') continue;
    if (!byFamily.has(c.family)) byFamily.set(c.family, { blurb: c.blurb, presets: {} });
    byFamily.get(c.family).presets[c.name] = c.props || {};
  }
  return [...byFamily].map(([family, { blurb, presets }]) => ({
    name: family,
    group: 'blocks',
    blurb,
    docs: 'docs/BLOCKS.md',
    schema: BLOCK_SCHEMA[family],
    presets,
    produces: 'layers',
    // x/y/start/dur are placement and timing the SCENE supplies, never dials, so the caller provides
    // them and the panel never shows them (blocks/schema.mjs says the same thing from the other side).
    // The values match scripts/site/blocks-scenes.mjs, which builds the /blocks posters: a block placed
    // at the origin sits half off the canvas, and one that starts at 0 has not finished animating in.
    render: (opts) => BLOCKS[family]({ x: 160, y: 160, start: 0.2, dur: 8, ...opts }),
  }));
};

export const GENERATORS = [...FIELDS, ...blockFamilies()];

export const byName = (name) => GENERATORS.find((g) => g.name === name) || null;

// Walk a schema into a flat list of controls: [{ path, key, group, spec }]. One place decides how a
// schema becomes a panel, so the site never re-derives it and a new `kind` shows up everywhere at once.
export function controlsOf(schema, group = null, out = []) {
  for (const [key, spec] of Object.entries(schema)) {
    if (spec.kind === 'group') controlsOf(spec.fields, key, out);
    else out.push({ path: group ? `${group}.${key}` : key, key, group, spec });
  }
  return out;
}

// The defaults, as a real options object. Used for the playground's initial state and to diff against
// so a shared link carries only what was actually changed.
export function defaultsOf(schema) {
  const out = {};
  for (const [key, spec] of Object.entries(schema)) {
    out[key] = spec.kind === 'group' ? defaultsOf(spec.fields) : spec.def;
  }
  return out;
}

// Only what differs from the defaults, nested. A permalink is then short and, more usefully, READABLE:
// it says what this person changed, which is the thing worth copying into a scene or into a bug report.
export function diffFromDefaults(opts, schema) {
  const out = {};
  for (const [key, spec] of Object.entries(schema)) {
    const v = opts?.[key];
    if (v === undefined) continue;
    if (spec.kind === 'group') {
      const sub = diffFromDefaults(v, spec.fields);
      if (Object.keys(sub).length) out[key] = sub;
    } else if (JSON.stringify(v) !== JSON.stringify(spec.def)) {
      out[key] = v;
    }
  }
  return out;
}

// ── randomise, within what each field DECLARES ──────────────────────────────────────────────────
//
// The point of a schema is that a range is stated rather than guessed, so a randomiser is derivable:
// every bounded number, every enum, every boolean already carries its own legal set. Nothing here
// invents a bound. A field with no declared range is LEFT ALONE, and `skipped` says which, because a
// randomiser that makes up limits produces values the generator will refuse, and the person turning the
// dial gets an error they did not cause.
//
// `rand` is injected so a caller can seed it. Same rand, same options.
export function randomOptions(schema, rand = Math.random, out = {}, skipped = [], base = null) {
  for (const [key, spec] of Object.entries(schema)) {
    switch (spec.kind) {
      case 'group': {
        const sub = {};
        randomOptions(spec.fields, rand, sub, skipped, base?.[key] ?? null);
        out[key] = sub;
        break;
      }
      case 'enum':
        out[key] = spec.of[Math.floor(rand() * spec.of.length)];
        break;
      case 'bool':
        out[key] = rand() < 0.5;
        break;
      case 'unit':
        out[key] = +rand().toFixed(2);
        break;
      case 'int':
      case 'num': {
        if (typeof spec.min !== 'number' || typeof spec.max !== 'number') { skipped.push(key); break; }
        const v = spec.min + rand() * (spec.max - spec.min);
        out[key] = spec.kind === 'int' ? Math.round(v) : +v.toFixed(3);
        break;
      }
      case 'hex': {
        // A colour's range is the gamut, which is declared, just not as min and max. Hue and saturation
        // are free; LIGHTNESS IS KEPT from the value being replaced.
        //
        // That is not a stylistic nicety, it is the difference between a randomiser and a scrambler. A
        // palette's roles carry a composition: `ground` is the dark the field falls to and `bloom` is
        // the light it rises to. Rolling lightness uniformly makes a bright ground and a dark bloom, so
        // the field inverts and every result looks broken. The ordering is not in the schema, so rather
        // than invent a rule about which role means what, this preserves the ordering already present.
        const l = base?.[key] ? lightnessOf(base[key]) : 12 + rand() * 55;
        out[key] = hslHex(rand() * 360, 45 + rand() * 45, l);
        break;
      }
      // `color` may hold a theme expression, and a random hex would silently drop the theming that is
      // the whole reason that kind exists. `str`, `list`, `row`, `oneOf`, `block` and `hexlist` are
      // content, and content is not a dial.
      default:
        skipped.push(key);
    }
  }
  return out;
}

const lightnessOf = (hex) => {
  const m = /^#?([0-9a-f]{6})$/i.exec(String(hex));
  if (!m) return 40;
  const n = parseInt(m[1], 16);
  const r = ((n >> 16) & 255) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255;
  return ((Math.max(r, g, b) + Math.min(r, g, b)) / 2) * 100;
};

function hslHex(h, s, l) {
  const a = (s / 100) * Math.min(l / 100, 1 - l / 100);
  const f = (n) => {
    const k = (n + h / 30) % 12;
    const c = l / 100 - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
    return Math.round(255 * c).toString(16).padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}
