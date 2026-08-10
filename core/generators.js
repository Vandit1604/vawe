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
//   normalise optional. Turns a PLAUSIBLE option set into a legal one, and throws if it cannot. Some
//           dials are only meaningful for some structures, and a caller that picks a structure at
//           random cannot be expected to know the table. Without this the randomiser makes illegal
//           pairs and the person clicking sees an error they did not cause. It is not a silent
//           substitution: what it resets is a value the chosen structure has no way to express.
//   render  called with a partial options object. It MUST validate and throw on anything it does not
//           understand, rather than substituting a default. The playground shows that message to the
//           person turning the dial, so a thrown error is a feature here, not a failure.
//   produces what `render` returns: 'html', a markup string to inject and drive with `--t`. The page
//           also understands 'layers', an array of scene layers, which it previews by booting the
//           engine on a scene built around them. Nothing declares that today; it is kept because it is
//           the only correct way to show a scene fragment, and re-deriving it later would mean writing
//           a second engine that agrees with the first until it does not.
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
import { SCHEMA as LIGHTFIELD_SCHEMA, normalise as lightfieldNormalise, HONOURS } from './lightfield/options.js';
import { PRESETS as LIGHTFIELD_PRESETS } from './lightfield/presets.js';
// The playground lists FIELD GENERATORS only. The 70 block families keep their declared schemas and
// their gate (blocks/schema.mjs, scripts/gates/block-schema.mjs), because a contract is worth having
// whether or not a page renders it. They are not here because a block is a scene FRAGMENT rather than a
// picture: previewing one means booting a whole scene around it, and a picker of 71 entries buried the
// thing people came to turn.
//
// ONE ENTRY PER LOOK, not one entry with five presets. `slats`, `rings` and `shards` are different
// pictures with different dials and different references, and folding them together meant one averaged
// fidelity score that could not say which look regressed. Each look now carries its own reference and
// is measured on its own (scripts/author/lightfield-check.mjs).
//
// One implementation underneath. A look is a name, a preset, a reference, and a NARROWED VIEW of the
// same schema.

// Which dials a look does not honour, taken from the generator's own HONOURS table rather than listed
// again here. Narrowing is why a `rings` look cannot show `shadow.seamWidth` and therefore cannot build
// the illegal pair that used to throw in someone's face (docs/MISTAKES.md #277).
function narrow(schema, kind) {
  const drop = HONOURS.filter((r) => !r.by.includes(kind)).map((r) => r.at);
  const out = {};
  for (const [key, spec] of Object.entries(schema)) {
    if (drop.includes(key)) continue;                       // a whole group
    if (spec.kind !== 'group') { out[key] = spec; continue; }
    const fields = Object.fromEntries(
      Object.entries(spec.fields).filter(([k]) => !drop.includes(`${key}.${k}`)));
    out[key] = { ...spec, fields };
  }
  return out;
}

// A look's reference, where one exists. `tide` and `fern` have none, and that is stated rather than
// scored against nothing.
const LOOKS = [
  { name: 'blinds', preset: 'ref', ref: 'refs/lightfield-ref.jpg',
    blurb: 'A backlit blind. Fine slats, a warm bloom behind them, cool shadow.' },
  { name: 'ember', preset: 'ember', ref: 'refs/ref-a.jpg',
    blurb: 'Spires rising along an envelope, tapered, hot at the base.' },
  { name: 'colonnade', preset: 'colonnade', ref: 'refs/ref-b.png',
    blurb: 'Wide panels split by bright hairlines, soft masses under a glow.' },
  { name: 'tide', preset: 'tide', ref: null,
    blurb: 'Concentric bands round a point, like light on water.' },
  { name: 'fern', preset: 'fern', ref: null,
    blurb: 'A fan of rays from a pivot below the frame.' },
];

export const GENERATORS = LOOKS.map(({ name, preset, ref, blurb }) => {
  const opts = LIGHTFIELD_PRESETS[preset];
  const kind = opts.pattern?.kind ?? LIGHTFIELD_SCHEMA.pattern.fields.kind.def;
  return {
    name,
    group: 'lightfield',
    blurb,
    docs: 'docs/LIGHTFIELD.md',
    reference: ref,
    schema: narrow(LIGHTFIELD_SCHEMA, kind),
    presets: { [preset]: opts },
    produces: 'html',
    normalise: lightfieldNormalise,
    render: lightfield,
  };
});

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
// IT VARIES THE LOOK ON SCREEN, it does not replace it. Rolling every field uniformly changes the
// STRUCTURE and the COLOUR at once, so each click is an unrelated picture and most of them are muddy.
// Here the preset chooses what kind of thing this is and randomise explores inside it:
//
//   enum      KEPT. `pattern.kind` and `motion.kind` are what the thing IS.
//   number    NUDGED around its current value, not rolled across its range.
//   colour    hue and saturation roll, LIGHTNESS is kept, so the palette's own ordering survives.
//   seed      rolled outright. A range in the billions is an identifier, not a dial, and re-rolling
//             it is the cheapest way to get a genuinely different arrangement of the same look.
//
// Every one of those is derived from what the schema already declares. Nothing here knows what a
// lightfield is.
//
// `rand` is injected so a caller can seed it. Same rand and same base, same options.
// A number moves by up to 22% of its declared range OR half of where it already sits, whichever is
// SMALLER. The second clause is what keeps a nudge a nudge: `pattern.count` is declared 1 to 400, so a
// flat 22% is plus or minus 88, and a field of 58 slats became 138. Half the current value keeps a
// small number in its own neighbourhood while a large one still gets room.
const NUDGE = 0.22;
const IDENTIFIER = 100000;          // a range wider than this is an id, not a dial

// `free` rolls a field across its whole declared range instead of nudging, and lets an enum change.
// That is what a PER SECTION button means: the global one varies the look you have, and asking for one
// section by name is asking for that aspect to be different, not slightly different.
export function randomOptions(schema, rand = Math.random, out = {}, skipped = [], base = null, free = false) {
  for (const [key, spec] of Object.entries(schema)) {
    switch (spec.kind) {
      case 'group': {
        const sub = {};
        randomOptions(spec.fields, rand, sub, skipped, base?.[key] ?? null, free);
        out[key] = sub;
        break;
      }
      case 'enum':
        // What the thing IS. Rolling it is picking a different subject, which the presets already do.
        out[key] = free || base?.[key] === undefined ? spec.of[Math.floor(rand() * spec.of.length)] : base[key];
        break;
      case 'bool':
        out[key] = free || base?.[key] === undefined ? rand() < 0.5 : base[key];
        break;
      case 'unit':
      case 'int':
      case 'num': {
        const min = spec.kind === 'unit' ? 0 : spec.min;
        const max = spec.kind === 'unit' ? 1 : spec.max;
        if (typeof min !== 'number' || typeof max !== 'number') { skipped.push(key); break; }
        const span = max - min;
        const from = typeof base?.[key] === 'number' ? base[key] : min + rand() * span;
        // An identifier is rolled; a dial is nudged around where it already sits.
        const reach = Math.min(span * NUDGE, Math.abs(from) * 0.5 || span * NUDGE);
        const v = free || span > IDENTIFIER
          ? min + rand() * span
          : Math.min(max, Math.max(min, from + (rand() * 2 - 1) * reach));
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
