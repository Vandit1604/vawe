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

export const GENERATORS = [
  {
    name: 'lightfield',
    blurb: 'Light-field backdrops. Four colour roles, a pattern, a fall of shadow, one seed.',
    docs: 'docs/LIGHTFIELD.md',
    schema: LIGHTFIELD_SCHEMA,
    presets: LIGHTFIELD_PRESETS,
    render: lightfield,
  },
];

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
