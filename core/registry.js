// core/registry.js — the primitive every named vocabulary is built from.
//
// WHY THIS EXISTS. The engine has a dozen name→thing maps (anims, cuts, kinetic presets, timings, icons,
// looks, modifiers…) and each one was resolved by hand:
//
//   const resolveAnim = (name) => ANIM[name] || fade;              // core/clips.js
//   const P = PRESENTATIONS[name] || PRESENTATIONS.fade;           // core/cuts.js
//   const fn = PRESETS[preset] || PRESETS.up;                      // core/type.js, fixed in #354
//
// Every one of those renders a plausible frame that is not what was asked for. Measured across all 146
// scene files at the time this was written: FIVE layers in three shipped scenes name an `anim` the engine
// does not have, and have therefore always faded in instead of doing what their author wrote.
//
// The point of a primitive rather than a lint: a lint finds the fourth instance. `pick()` takes no
// fallback parameter, so a silent default is not expressible through this helper at all, and the fifth
// registry cannot be written wrong.
//
// THE CROSS-REGISTRY HINT, which is the part the evidence actually demanded. Of those five stranded
// names, THREE are real names from a DIFFERENT registry: `popIn` is a GSAP effect, `down` and `blur` are
// kinetic presets. The author reached for something that exists and put it in the wrong slot. So a failed
// pick searches every other registry and says where the name DOES live. "unknown anim" is a dead end;
// "`popIn` is a gsap effect, not an anim — did you mean `fx: \"popIn\"`?" is a fix.

const ALL = [];   // every registry built here, so a failed pick can ask the others

/**
 * defineRegistry(kind, entries, opts) → { kind, entries, names, has, pick, blurbs }
 *   kind    — the author-facing noun, used verbatim in the error ("anim", "cut", "kinetic preset")
 *   entries — the name→value map itself
 *   opts.blurbs — the one-line-per-entry map, kept beside its registry (the blocks/catalog.mjs pattern)
 *   opts.slot   — how an author writes it in JSON (`anim`, `fx`, `preset`), used to phrase the hint
 * There is deliberately no `fallback` option.
 */
export function defineRegistry(kind, entries, { blurbs, slot } = {}) {
  if (!entries || typeof entries !== 'object') throw new Error(`defineRegistry("${kind}"): entries must be an object`);
  const has = (name) => typeof name === 'string' && Object.prototype.hasOwnProperty.call(entries, name);

  const reg = {
    kind,
    slot: slot || kind,
    entries,
    blurbs: blurbs || null,
    get names() { return Object.keys(entries); },
    has,
    /** The value, or a throw naming what this vocabulary knows — never a substitute. */
    pick(name) {
      if (has(name)) return entries[name];
      throw new Error(hint(reg, name));
    },
  };
  ALL.push(reg);
  return reg;
}

// Where else does this name live? Returns the registries that DO know it.
function elsewhere(self, name) {
  return ALL.filter((r) => r !== self && r.has(name));
}

/**
 * nearMisses(written, known) — the names close enough to be worth printing beside a rejection.
 * Exported because core/motion.js resolveEasing rejects by hand (its registry predates this file and
 * carries a cross-registry hint of its own), and two spellings of "did you mean" is one too many.
 */
export const nearMisses = (written, known, max = 4) => {
  const head = String(written).slice(0, 3).toLowerCase();
  return known.filter((n) => n.toLowerCase().startsWith(head)).slice(0, max);
};

function hint(reg, name) {
  const shown = String(name);
  const other = elsewhere(reg, shown);
  const head = `unknown ${reg.kind} "${shown}"`;
  if (other.length) {
    const where = other.map((r) => `\`${r.slot}: "${shown}"\` (a ${r.kind})`).join(' or ');
    return `${head} — but that IS a real name somewhere else: ${where}. `
      + `The vocabularies are adjacent and easy to confuse, so this is refused rather than quietly `
      + `resolved to a default that would look deliberate.`;
  }
  const names = reg.names;
  const near = nearMisses(shown, names);
  return `${head}${near.length ? ` — did you mean ${near.map((n) => `"${n}"`).join(', ')}?` : ''} `
    + `Known ${reg.kind}s: ${names.join(', ')}. A name this registry does not know would otherwise `
    + `resolve to a default and render a frame that looks deliberate.`;
}

/** Every registry defined so far — for catalog/coverage surfaces that want the whole vocabulary. */
export const registries = () => ALL.slice();
