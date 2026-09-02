// core/registry.js: the primitive every named vocabulary is built from.
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
// "`popIn` is a gsap effect, not an anim. Did you mean `fx: \"popIn\"`?" is a fix.

const ALL = [];   // every registry built here, so a failed pick can ask the others

/**
 * defineRegistry(kind, entries, opts) → { kind, entries, names, has, pick, blurbs }
 *   kind: the author-facing noun, used verbatim in the error ("anim", "cut", "kinetic preset")
 *   entries: the name→value map itself
 *   opts.blurbs: the one-line-per-entry map, kept beside its registry (the blocks/catalog.mjs pattern)
 *   opts.slot: how an author writes it in JSON (`anim`, `fx`, `preset`), used to phrase the hint and
 *     to render the paste `make arsenal` prints. It is a PATH, and two markers say where the NAME goes:
 *     `bg[].preset` (the value of `preset` in an array of objects), `modifiers[]` (the KEY of an object
 *     inside the array), `effector.drives{}` (a KEY in an object map).
 *   opts.catalog: everything docs/EFFECTS.md and the site's arsenal need in order to PUBLISH this
 *     vocabulary, written here so that adding one is a single edit. See checkCatalog below.
 * There is deliberately no `fallback` option.
 */
export function defineRegistry(kind, entries, { blurbs, slot, catalog } = {}) {
  if (!entries || typeof entries !== 'object') throw new Error(`defineRegistry("${kind}"): entries must be an object`);
  if (catalog) checkCatalog(kind, catalog);
  const has = (name) => typeof name === 'string' && Object.prototype.hasOwnProperty.call(entries, name);

  const reg = {
    kind,
    slot: slot || kind,
    entries,
    blurbs: blurbs || null,
    catalog: catalog || null,
    get names() { return Object.keys(entries); },
    has,
    /** The value, or a throw naming what this vocabulary knows, never a substitute. */
    pick(name) {
      if (has(name)) return entries[name];
      throw new Error(hint(reg, name));
    },
  };
  ALL.push(reg);
  return reg;
}

/**
 * checkCatalog(kind, c): the publishing half of a vocabulary, refused at LOAD if it is incomplete.
 *
 * WHY IT LIVES ON THE REGISTRY. Adding one capability used to be four edits in three files: the
 * registry here, a five-part section tuple in scripts/site/effects-catalog.mjs, a `USAGE[id]` form and
 * a `PREVIEW[id]` scene (or a `NO_PREVIEW[id]` reason) in scripts/site/effects-json.mjs. The id those
 * last three are keyed by is a slug of the section TITLE, so renaming a section silently orphaned its
 * usage and its preview. Two gates then held the four halves together, and either one could stop a
 * push. Every one of those facts is a fact about the vocabulary, so the vocabulary owns them.
 *
 *   title    the section heading, and the thing its id is slugged from
 *   tag      the one-word slot label the catalogue prints beside the heading (`per-layer`, `camera`)
 *   intro    the prose an author reads before choosing. Written for docs/EFFECTS.md
 *   usage    (name, kit) → the JSON snippet an author writes. `kit` is the catalogue's own furniture
 *            (`j`, `text`, `full`), passed in rather than imported so core/ keeps no site dependency
 *   preview  (name, kit) → a whole scene object the site plays, `kit` being { base, HERO, TWO, OVER }
 *   noPreview  why this family cannot honestly be played in one small clip. The alternative to
 *            `preview`, never a companion to it, and never absent: a blank was how blanks got shipped
 *   register optional, the key into SELECTION.md §4 when the register IS the description (looks, stings)
 *   skip     optional, the DECISION that a family is self-describing, rendered instead of a blank row
 *
 * Refused here rather than checked by a gate, because a gate only promises to notice: a registry with
 * half a catalogue entry cannot exist at all if the constructor will not build one.
 */
function checkCatalog(kind, c) {
  const bad = (why) => { throw new Error(`defineRegistry("${kind}"): catalog ${why}`); };
  for (const k of ['title', 'tag', 'intro']) if (typeof c[k] !== 'string' || !c[k].trim()) bad(`needs a non-empty ${k}`);
  if (typeof c.usage !== 'function') bad('needs usage(name, kit), the JSON an author writes');
  if (!c.preview === !c.noPreview) bad('needs EITHER preview(name, kit) OR noPreview (a reason), never both and never neither');
  if (c.preview && typeof c.preview !== 'function') bad('preview must be a function of (name, kit)');
  if (c.noPreview && typeof c.noPreview !== 'string') bad('noPreview must be the reason, as a string');
}

// Where else does this name live? Returns the registries that DO know it.
function elsewhere(self, name) {
  return ALL.filter((r) => r !== self && r.has(name));
}

/**
 * nearMisses(written, known): the names close enough to be worth printing beside a rejection.
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
    return `${head}, but that IS a real name somewhere else: ${where}. `
      + `The vocabularies are adjacent and easy to confuse, so this is refused rather than quietly `
      + `resolved to a default that would look deliberate.`;
  }
  const names = reg.names;
  const near = nearMisses(shown, names);
  return `${head}${near.length ? `, did you mean ${near.map((n) => `"${n}"`).join(', ')}?` : '.'} `
    + `Known ${reg.kind}s: ${names.join(', ')}. A name this registry does not know would otherwise `
    + `resolve to a default and render a frame that looks deliberate.`;
}

/**
 * withBlurb(blurb, value): the description written where the entry is written, not in a second map.
 *
 * WHY. A vocabulary and its one-line-per-entry descriptions used to be two literals policed by a gate
 * (lib-test asserted the key sets matched), so adding one cut or one caption style was two edits in two
 * places and the gate was the only thing keeping them equal. One fact, one owner: the entry owns it.
 *
 * The blurb is NON-ENUMERABLE, so an entry's own shape is unchanged for everything that walks it, a cut
 * presentation still reads as exactly `{enter, exit}`, and Object.assign onto a function leaves it
 * callable, which is what `CAP_STYLES[name](u, active)` requires.
 */
export function withBlurb(blurb, value) {
  if (typeof blurb !== 'string' || !blurb.trim()) throw new Error('withBlurb: the blurb must be a non-empty string');
  return Object.defineProperty(value, 'blurb', { value: blurb });
}

/**
 * blurbsOf(kind, entries): the name→blurb map, DERIVED from the entries so the two cannot drift.
 * Refuses at load, naming the entry: the blurb is the row `make effects`, docs/EFFECTS.md and the site
 * print, so an entry without one exists and cannot be chosen, and that was caught by a gate after the
 * fact instead of at the point of writing.
 */
export function blurbsOf(kind, entries) {
  const out = {};
  for (const [name, value] of Object.entries(entries)) {
    if (!value || typeof value.blurb !== 'string' || !value.blurb.trim())
      throw new Error(`${kind} "${name}" has no blurb, wrap it where it is written: `
        + `${name}: withBlurb("what it does, in one line", …). Without one it is absent from `
        + `\`make effects\`, docs/EFFECTS.md and the site, so nobody can choose it.`);
    out[name] = value.blurb;
  }
  return out;
}

/** Every registry defined so far, for catalog/coverage surfaces that want the whole vocabulary. */
export const registries = () => ALL.slice();

/**
 * catalogued(): the registries that publish themselves, in the order docs/EFFECTS.md prints them.
 *
 * Sorted by slot label and then by title, NOT by definition order. Definition order is module
 * evaluation order, so deleting one unused import from the catalogue script would reshuffle the whole
 * document; sorting on the registry's own fields makes the order a property of the vocabulary.
 */
export const catalogued = () => ALL.filter((r) => r.catalog)
  .sort((a, z) => a.catalog.tag.localeCompare(z.catalog.tag) || a.catalog.title.localeCompare(z.catalog.title));
