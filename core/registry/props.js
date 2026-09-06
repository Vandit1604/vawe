// core/props.js: what a module says about the layer props it reads, and the two operations every
// registry and every gate performs on those statements.
//
// A module that reads `L.<prop>` declares it beside the read:
//
//   export const PROPS = {
//     radius: {},                 // read unconditionally
//     preset: { when: 'split' },  // read only when the layer also sets `split`
//   };
//
// WHY DECLARED AND NOT FOUND. `layer-props` used to answer "does anything read this prop?" by regex
// over a hardcoded list of files plus one hop of each builder's relative imports. That list is a map of
// where the engine lived on the day the gate was written, and the engine keeps moving: the day
// core/tracks/ became a registry, 1454 live props started reporting as dropped, because a directory the
// list did not name is a directory the gate cannot see. Three earlier fixes to the same gate each widened
// the scan by one shape and each was overtaken by the next move (docs/MISTAKES.md #229 · #232 · #242).
// A declaration cannot be outrun by a file move: it travels in the file that does the reading.
//
// THE GUARD IS THE HALF THAT MATTERS. Six props fire only behind another prop, `preset` needs `split`,
// `dist` needs `cut` or `split`, `motionBlur` needs `motion`, and a layer that sets one without its
// enabler renders exactly as if the prop were absent. The old scanner could not express that at all, so
// it called those live and shouted about the 1482 that worked.

// Both spellings of a guard: `when: 'split'` and `when: ['cut', 'split']` (any of them enables the read).
export const guardsOf = (d) => (d && d.when ? (Array.isArray(d.when) ? d.when : [d.when]) : []);

// A guard is satisfied by PRESENCE, not by truth of an arbitrary value, except `false`, which is how
// every opt-out in this engine is spelled (`motionBlur: false`, `caret: false`). `motion: []` counts as
// present because the track runs on it and finds nothing, which is a different bug from a missing enabler.
export const guardMet = (L, g) => L[g] != null && L[g] !== false;

// Does this declaration fire for THIS layer? Unconditional, or any one of its guards is set.
export const firesOn = (L, decl) => {
  const g = guardsOf(decl);
  return g.length === 0 || g.some((k) => guardMet(L, k));
};

// mergeProps: the union of several modules' declarations. Two modules reading the same prop is the
// normal case, not a conflict: `dist` is read by the cut track behind `cut` and by the units track behind
// `split`, and a layer that sets either enabler gets it. So guards UNION, and an unconditional read
// anywhere makes the prop unconditional. The least restrictive claim wins, because the question the
// gate asks is "does ANYTHING read this", and one reader is enough.
export function mergeProps(...sets) {
  const out = {};
  for (const set of sets) {
    for (const [k, decl] of Object.entries(set || {})) {
      const g = guardsOf(decl);
      const prev = out[k];
      if (prev === undefined) { out[k] = g.length ? { when: [...g] } : {}; continue; }
      if (!prev.when || !g.length) { out[k] = {}; continue; }
      for (const x of g) if (!prev.when.includes(x)) prev.when.push(x);
    }
  }
  return out;
}

// propsOf: a builder's declaration read off its OWN signature, the same trick `paramsOf`
// (core/camera-moves.js:483) plays on a camera generator. A builder that destructures the layer in its
// signature states each prop once, at the place it reads it, so there is no second list to drift:
//
//   export function build(kit, el, L, { h, bg } = L) { ... }
//   export const PROPS = propsOf(build);
//
// It reads the LAST destructuring pattern in the parameter list, because a builder's layer comes last
// (a camera generator's options come first, which is why paramsOf scans from the other end). A guard
// (`when:`) has no spelling in a signature, so a builder with conditional reads keeps a hand-written set
// and unions it in with mergeProps. Returns null for a non-destructuring signature: that is "cannot
// say", never "reads nothing", and a caller must not turn it into an empty declaration.
export function propsOf(fn) {
  const src = String(fn);
  const open = src.lastIndexOf('{', src.indexOf(')'));
  if (open < 0) return null;
  const names = patternParts(src, open);
  if (!names) return null;
  const own = names.map((n) => n.split(/[=:]/)[0].trim()).filter(Boolean);
  return Object.fromEntries(own.map((n) => [n, {}]));
}

// The two readers above and below share one scan, and they used to be the same twenty lines twice.
// `open` is the index of the pattern's `{`; the result is its top-level comma-separated pieces, with
// nested braces, brackets and parens skipped, or null if the pattern never closes.
function patternParts(src, open) {
  let depth = 0, close = -1;
  for (let i = open; i < src.length; i++) {
    if (src[i] === '{') depth++;
    else if (src[i] === '}' && --depth === 0) { close = i; break; }
  }
  if (close < 0) return null;
  const parts = [];
  let d = 0, cur = '';
  for (const ch of src.slice(open + 1, close)) {
    if ('{[('.includes(ch)) d++;
    else if ('}])'.includes(ch)) d--;
    if (ch === ',' && d === 0) { parts.push(cur); cur = ''; } else cur += ch;
  }
  parts.push(cur);
  return parts;
}

// A literal default read back off the source text. Numbers, quoted strings and the two booleans cover
// every default any preset states today. An EXPRESSION is not a literal and reading one would mean
// evaluating source at load, so it comes back undefined: the dial's name is still known, its default is
// not, and a caller must print "no stated default" rather than invent one.
function literalDefault(text) {
  const t = String(text).trim();
  if (!t) return undefined;
  if (t === 'true') return true;
  if (t === 'false') return false;
  if (t === 'null') return null;
  if (/^-?(\d+\.?\d*|\.\d+)$/.test(t)) return Number(t);
  const q = t[0];
  if ((q === "'" || q === '"' || q === '`') && t.length > 1 && t.endsWith(q) && !t.slice(1, -1).includes(q))
    return t.slice(1, -1);
  return undefined;
}

// dialsOf: a preset's dials AND their defaults, read off its own options bag. The third member of the
// family (`propsOf` above, `paramsOf` at core/camera-moves.js:483), and the first one that KEEPS the
// defaults: both of the others throw them away on `n.split('=')[0]`, which is exactly the fact that had
// drifted. A kinetic preset states its dials in its signature:
//
//   up: preset((u, { dist = 40 } = {}) => ...)
//   dialsOf(PRESETS.up)  ->  { dist: 40 }
//
// so core/knobs.js carries only what a signature CANNOT say (the desc, the range, the enum values) and
// the number itself has ONE owner. Ten defaults had already drifted between the two before this existed
// (`stretch` read 1.6 and the manifest advertised 0.4, a scale-UP published as a scale-DOWN), and the
// manifest is the discovery surface `vawe_capabilities` hands to an outside model, so a wrong number
// there is a wrong frame with no error anywhere.
//
// It reads the FIRST destructuring pattern in the parameter list, because a preset's unit progress `u`
// comes first and the options bag second (a builder's layer comes LAST, which is why propsOf scans from
// the other end). A `{` after the parameter list has closed is the function BODY, so a preset with no
// options bag at all returns null: that is "cannot say", never "reads no dials". `decode` is the live
// case, it takes no bag and its dials are read later inside animateUnits, so it keeps a hand-written
// entry exactly as a guarded prop keeps one and is unioned in with mergeProps.
export function dialsOf(fn) {
  const src = String(fn);
  const open = src.indexOf('{', src.indexOf('('));
  if (open < 0 || open > src.indexOf(')')) return null;
  const parts = patternParts(src, open);
  if (!parts) return null;
  const out = {};
  for (const part of parts) {
    const eq = part.indexOf('=');
    const name = (eq < 0 ? part : part.slice(0, eq)).trim();
    if (!name) continue;
    out[name] = eq < 0 ? undefined : literalDefault(part.slice(eq + 1));
  }
  return out;
}
