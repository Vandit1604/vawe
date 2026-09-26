// arsenal.mjs: ask the arsenal for the thing you mean, in plain English.
//
//   node harness/author/arsenal.mjs "a page scrolling under a static tilt"
//   node harness/author/arsenal.mjs "leave the frame" --kind "gsap fx"
//   node harness/author/arsenal.mjs --census            # what is built and never used
//
// WHY. The census that prompted this is not close: the `{type:"beat"}` blueprint mechanism, which
// CLAUDE.md names as the #1 defence against a plain slideshow, is used by 2 of 153 scenes, and 11 of
// its 19 beats have zero users. `EXIT_FX`, eleven named exits, was used by NONE and was deleted whole
// rather than left uncatalogued (engine-doctrine/MISTAKES.md #364): every film still needs its layers to leave,
// and `out` already reaches every motion that family named. That instruction has been given for
// months and obeyed twice, so the
// problem is not persuasion: 566 effects reachable only by reading an 849-line generated file are not
// reachable. An author who cannot find the thing re-derives a worse version of it, which is exactly
// how sixteen layers ended up saying `preset: "up"`.
//
// THIS OWNS NO LIST, and that is the whole design. `defineRegistry` (core/registry/registry.js) already carries
// `kind`, `slot`, `names` and `blurbs` for every vocabulary, and `recipes/index.mjs` already carries
// a blurb and its measured sources per recipe. A fourth copy of those names would drift from the three
// that exist, which is the failure this repo logs more than any other. Everything below is read at
// runtime; adding an effect to a registry makes it searchable here with no edit.
//
// The ranking is deliberately boring: token overlap against name + blurb + kind, no model, no network,
// no index to rebuild. It has to be right about "this word appears", not clever.
//
// AND IT MUST BE ABLE TO SAY IT DOES NOT KNOW. Ranking alone has no ceiling, so the best of 420 things
// came back whether it answered the question or not: `dollyZoom` was offered, twice in one day, for two
// capabilities this engine does not have (engine-doctrine/MISTAKES.md #552). A wrong tool is worse than no tool
// here, because this is the tool an author is told to consult before inventing anything. Everything
// under CONFIDENT is now printed as a WEAK GUESS, under a line saying nothing clearly matches.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { newSince, WINDOW_DAYS } from './recency.mjs';
import { rowsFrom, compactDials } from './block-dials.mjs';
// The tokenizer lives in core/registry/registry.js, where the load-time blurb refusal also needs it. Two
// tokenizers would eventually disagree about which words an entry is indexed under, and the refusal has
// to grade a blurb by exactly the words this search will find it by.
import { searchWords } from '../../core/registry/registry.js';
import { emitJson } from '../lib/findings.mjs';
// The same population walk `make check GATE=unused` and `make census` already use. A hand-rolled `readdirSync`
// here used to count whatever sat on THIS machine's disk, most of it gitignored brand content
// (.gitignore:93), so "used in 34 films" was a number nobody else could reproduce. `population` is the
// one owner of "which films can this checkout see, and is it blind to some of them" (its own header);
// reusing it means a partial checkout SAYS so instead of quietly undercounting.
import { population, AUTHORED } from '../lib/census.mjs';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

// Every module that defines a vocabulary, DISCOVERED rather than listed. The list used to be
// hand-kept, with a comment saying an import cannot be discovered without one. It can: readdir names
// the files, and a module that will not import in node is skipped by the try/catch that was already
// there for exactly that case.
//
// The hand-kept version had already gone stale in the way this whole tool exists to prevent. It named
// only files directly under `core/`, so a vocabulary declared in `core/fx/` or `core/layers/` was
// unsearchable, and an author looking for the thing they could not name was told it did not exist. Two
// registries were in that state the day this changed. A search tool with a manual index is a search
// tool that answers for the index and not for the engine.
const dirsOf = (rel) => {
  try {
    return fs.readdirSync(path.join(repoRoot, rel))
      // a test file runs its assertions on import and prints into this tool's stdout, so never a vocabulary
      .filter((f) => (f.endsWith('.js') || f.endsWith('.mjs')) && !/\.test\.m?js$/.test(f))
      .map((f) => `${rel}/${f}`);
  } catch { return []; }
};
// core/ itself holds ONLY package directories now (W9: no root file may go orphaned), so a fixed
// list of three subdirectories is exactly the "hand-kept index" this file's own header warns against:
// a vocabulary moved into a fourth package would be unsearchable again. Discover every package under
// core/ instead, the same way the header already discovers files within one.
const corePackages = fs.readdirSync(path.join(repoRoot, 'core'), { withFileTypes: true })
  .filter((e) => e.isDirectory())
  .map((e) => `core/${e.name}`);
const MODULE_PATHS = corePackages.flatMap(dirsOf);

/** Read one entry's value out of an optional registry map (blurbs, aka, pitfalls), or a default. */
const at = (map, name, dflt = '') => (map && map[name] != null ? map[name] : dflt);

// Sound cues were the last hole in this corpus: `make arsenal Q="a whoosh"` answered ABSENT while 13
// synthesized cues sat in core/audio/kit.mjs. sfx-catalog.mjs owns their metadata and exposes it as
// rows; imported as a function so its own gate does not read that map as a second vocabulary.
async function cueSource() {
  try {
    const { cueCorpus } = await import('./sfx-catalog.mjs');
    return cueCorpus();
  } catch { return []; }
}

/** Every entry the engine can name: {name, kind, slot, blurb, pitfall}. */
export async function collect() {
  const out = [];
  const seen = new Set();
  for (const m of MODULE_PATHS) {
    let mod; try { mod = await import(`../../${m}`); } catch { continue; }
    for (const [expName, reg] of Object.entries(mod)) {
      if (!expName.endsWith('_REGISTRY') || !reg || !Array.isArray(reg.names)) continue;
      // A registry re-exported from a second module would otherwise be listed twice. Keyed on the
      // registry's own kind plus the name, so two vocabularies that legitimately share a word (a `blur`
      // depth and a `blur` look) both survive.
      for (const name of reg.names) {
        const key = `${reg.kind}\u0000${name}`;
        if (seen.has(key)) continue;
        seen.add(key);
        // `aka` is the searchable-but-unprinted half of a description: the words a person types that
        // an honest blurb cannot carry ("handheld" for `driftHold`, "kerning" for `expandIn`). It joins
        // the corpus below and never reaches the output, so a synonym cannot turn a blurb into keyword soup.
        // `docs` is the doctrine route (core/registry/registry.js's `docs` option): today only the 24
        // layer types carry one, and only 18 of those have real craft doctrine beyond their own blurb.
        // Printed as a doc path, never inlined prose, same as a craft rule's `doc` below: an agent opens
        // the real page only when the blurb was not enough.
        const docEntry = reg.docs && reg.docs[name];
        out.push({ name, kind: reg.kind, slot: reg.slot || null, blurb: at(reg.blurbs, name),
          aka: at(reg.aka, name, []), pitfall: at(reg.pitfalls, name), doc: docEntry ? docEntry.doc : null });
      }
    }
  }
  // Blueprints are retired; recipes/index.mjs (below) is now the one vocabulary that lives outside core/.
  // BLOCKS, AND THEY WERE THE LARGEST HOLE IN THIS CORPUS. Measured before this landed: 97 of 97 block
  // families were absent, so `make arsenal Q="a terminal window"` and even `Q="morphText"` answered
  // NOTHING HERE CLEARLY MATCHES and told the author to assume the engine does not have it. The engine
  // has 185 nameable blocks. The website's /arsenal has indexed them the whole time, so the two indexes
  // over one library disagreed by 185 entries, and the one an author is told to run was the poorer.
  //
  // Why the two sources above could not see them. Blocks are not `*_REGISTRY` exports (the registry
  // object lives in blocks/kit.mjs and is FILLED by blocks/index.mjs, so there is no `BLOCK_REGISTRY`
  // to walk), and their catalogue is engine-doctrine/BLOCKS.md, not engine-doctrine/EFFECTS.md. Each source was correct about
  // its own subject and neither had any reason to mention it.
  //
  // blocks/catalog.mjs is already the one owner of a block's name and its blurb: blocks/index.mjs
  // THROWS at load for a factory with no row there. So this is the same fact read once more, not a
  // third list.
  //
  // BARE FAMILY ROWS ONLY, and the 88 namespaced `family.variant` rows are left out on purpose. They
  // are presets of a family, so their blurbs describe the same subject in fewer words ("toast, amber
  // accent" beside notification's own line), and adding them measurably HURT the search: the blurb
  // self-retrieval floor fell from 97% to 95% the moment they went in, because a variant and its
  // family compete for their shared words and neither wins. A person searching for a notification
  // wants the family; the variants are on its page. This is the one place where fewer names is a
  // better index, which is the opposite of the rest of this file's argument and worth saying out loud.
  try {
    const [cat, idx] = await Promise.all([
      import('../../blocks/catalog.mjs'),
      import('../../blocks/index.mjs').catch(() => null),
    ]);
    const catOf = (idx && idx.CATEGORY_OF) || {};
    // The OPTION TABLES, read off the module this already imported. Every family declares one
    // (blocks/index.mjs throws at load for a module that does not), and quality/gates/block-schema.mjs
    // holds each against its factory's real signature, so these dials cannot disagree with the engine.
    const schemas = (idx && idx.SCHEMAS) || {};
    // A FAMILY WITH NO BARE ROW WOULD OTHERWISE BE ABSENT ENTIRELY, and five were: `pricingCard`,
    // `statCard`, `profileCard`, `lowerThird` and `searchEngine` exist only as `card.pricing`,
    // `lowerThird.bild` and so on. The dotted skip below is right about why it exists and wrong about
    // where it applies: a variant is excluded because it SPLITS ITS FAMILY'S WORDS, and where there is
    // no family entry there is nothing to split with. So the first variant of such a family is indexed,
    // under the name a scene actually writes. `make arsenal Q="a pricing plan card"` reported ABSENT
    // about a block the engine ships, which is the failure this whole corpus exists to prevent.
    const bare = new Set((cat.CATALOG || []).filter((r) => r && r.name && !r.name.includes('.')).map((r) => r.name));
    const orphanShown = new Set();
    for (const row of cat.CATALOG || []) {
      if (!row || !row.name) continue;
      if (row.name.includes('.')) {
        if (bare.has(row.family) || orphanShown.has(row.family)) continue;
        orphanShown.add(row.family);
      }
      const key = `block\u0000${row.name}`;
      if (seen.has(key)) continue;
      seen.add(key);
      // `block`, because the printer renders a slot as `"<slot>": "<name>"` and that is exactly the
      // line an author writes inside a block layer. A first attempt put the whole layer JSON in here
      // and the snippet came out as nested quotes inside nested quotes, unreadable and uncopyable.
      // `family`, because the OPTIONS live on the family, not on the row: `card.pricing` is the
      // pricingCard factory with preset props, so its dials are pricingCard's dials. Carried on the
      // entry so harness/author/block-dials.mjs can answer without a second catalog read.
      out.push({ name: row.name, kind: 'block', slot: 'block', family: row.family,
        dials: rowsFrom(schemas[row.family]),
        blurb: row.blurb || '', aka: [catOf[row.family] || '', ...(row.aka || [])].filter(Boolean),
        pitfall: row.pitfall || '' });
    }
  } catch { /* the block library is optional to search, the same way recipes are */ }

  // Layer types used to need a special case here, because they were LAYER_TYPES + LAYER_BLURBS and not
  // a registry, so `beam` was invisible to a query naming its own blurb (engine-doctrine/MISTAKES.md #551). They
  // are `LAYER_REGISTRY` now and the generic walk above finds them like everything else.

  // THE CATALOGUE KNOWS MORE THAN THE REGISTRIES DO, and the search was the last thing to hear about it.
  //
  // Everything above reads `*_REGISTRY` exports, plus the two hardcoded special cases sitting right
  // there (recipes, layer types), each added because its subject is not a registry. That is the
  // whole shape of the bug: a capability the engine offers but has not been given a registry is
  // invisible to the search this repo tells you to run before inventing anything.
  //
  // Measured: engine-doctrine/EFFECTS.md carries 639 effects across 48 families and this corpus carried 445, so
  // roughly 150 real names could not be found. `easeOutExpo`, `tiktok`, `wordFlash`, `refract` and
  // `commaSplit` all returned NOTHING HERE CLEARLY MATCHES over a sentence claiming 445 things had been
  // searched. The sentence was true about the corpus and false about the engine.
  //
  // So the corpus takes the catalogue as its second source. The catalogue is already the union of the
  // registries that publish themselves and the 16 sections still hand-written, so this is one fact with
  // one owner rather than a third list: anything a reader can find in engine-doctrine/EFFECTS.md is now findable
  // here, and anything added to either is added to both.
  //
  // A REGISTRY ENTRY WINS where both know a name, because it carries `slot` and `aka` and the section
  // does not. The section only ever fills gaps.
  try {
    const { sections } = await import('../../scripts/site/effects-catalog.mjs');
    for (const [title, , names, slot, opts = {}] of sections) {
      const kind = opts.kind || title.replace(/\s*\(.*\)\s*$/, '').replace(/s$/, '').toLowerCase();
      for (const entry of names || []) {
        const name = typeof entry === 'string' ? entry : entry && entry.name;
        if (!name) continue;
        if (out.some((e) => e.name === name)) continue;
        out.push({ name, kind, slot: slot || null,
          blurb: (opts.blurbs && opts.blurbs[name]) || '', aka: [], pitfall: at(opts.pitfalls, name) });
      }
    }
  } catch { /* the catalogue is optional to search: a fresh clone can still find the registries */ }
  // RECIPES: structure measured off real video (recipes/recipes.json), not a `defineRegistry` vocabulary
  // (it names motion the ENGINE can already do, copied from a reference, never a new capability), so it
  // needs the same small adapter as blocks above rather than a fourth index.
  try {
    const { RECIPES } = await import('../../recipes/index.mjs');
    for (const [name, r] of Object.entries(RECIPES)) {
      const src = r.sources[0];
      out.push({ name, kind: 'recipe', slot: 'recipe', blurb: r.blurb,
        aka: [`${src.ref}@${src.t}s`], pitfall: '' });
    }
  } catch { /* recipes are optional to search */ }
  // Only the cues no registry already owns: MOTION_CUE_REGISTRY (core/audio-tactile.js) covers seven,
  // and a cue findable twice under two kinds is the drift this tool exists to remove. This fills the rest.
  out.push(...(await cueSource()).filter((c) => !out.some((e) => e.name === c.name && e.slot === c.slot)));
  // CRAFT RULES: engine-doctrine/CRAFT/rules/*.json, so an agent can PULL a rule on demand by searching for what
  // it is about ("caption safe strip") instead of waiting for the harness to push every rule at once.
  // Dynamic import only: a static import of craft-rules.mjs drags in craft-checklist.mjs and
  // finding-codes.mjs at module load, which deadlocks this file's own top-level `await collect()`
  // (engine-doctrine/MISTAKES.md style trap, fixed once already for craft-coverage in commit 12f25371). No slot:
  // a rule is prose to read, not JSON to paste, so it never enters pasteOf's JSON path.
  try {
    const { loadCraftRules } = await import('../lib/craft-rules.mjs');
    for (const rec of loadCraftRules()) {
      out.push({ name: rec.id, kind: 'rule', slot: null, blurb: rec.brief,
        aka: [rec.category], pitfall: null, doc: rec.doc });
    }
  } catch { /* craft rules are optional to search: a fresh clone can still find the registries */ }
  // SKILLS: a skill answers "what should I LOAD for this job", which nothing ranked before. It was
  // findable only through the hand-kept router table in AGENTS.md, so an agent that had not memorised
  // that table picked by habit. The description is the skill's own retrieval text, the same line
  // Claude Code matches a request against, read through harness/lib/skill-stages.mjs so the stage
  // router and this search cannot disagree about what a skill says.
  //
  // Dynamic import for the same reason the craft rules above use one: skill-stages.mjs imports
  // STAGE_ORDER from quality/gates/stage.mjs, which statically imports THIS file for score/toks/
  // coverageIn. A static import here closes that cycle and Node refuses it.
  try {
    const { skillIndex } = await import('../lib/skill-stages.mjs');
    for (const sk of skillIndex()) {
      out.push({ name: sk.name, kind: 'skill', slot: null, blurb: sk.description,
        aka: sk.stage ? [sk.stage] : [], pitfall: null, doc: sk.doc });
    }
  } catch { /* skills are optional to search, the same way recipes are */ }
  return out;
}

// ---- usage, so "built and never used" is a measured fact rather than an impression ----------------
//
// `soft: true` because this is a display number inside a search tool, not a gate: a blind checkout
// should say so and keep answering, not exit(3) on an author who typed a query. A caller that shows
// `used` MUST print `blind` where it would have printed the count (population's own contract) so a
// partial number never reads as a complete one.
//
// AUTHORED, not LIBRARY, and the difference is the whole point of the number. LIBRARY counts every
// source scene in films/scene, and about half of them are catalogue tiles, probes and one-thing demos
// that were never planned as films. `make demo Q="..."` writes one every time an author asks a
// question, so the population grows with QUESTIONS asked rather than with films made, and an effect
// used once in a film plus nine times in demos of itself read as "used in 10 films". Every agent sees
// this figure on every search, so it steers what gets reached for, and it was measured against a
// population that is 53% not-films. AUTHORED is the same population minus anything with no
// `.storyboard.md` sidecar: a person planned it, so it is a film.
const CACHE = { counts: null };
function usage() {
  if (CACHE.counts) return CACHE.counts;
  const { names, n, blind } = population('arsenal · usage corpus', { filter: AUTHORED, quiet: true, soft: true });
  const dir = path.join(repoRoot, 'films/scene');
  const texts = [];
  for (const f of names) {
    try { texts.push(fs.readFileSync(path.join(dir, f), 'utf8')); } catch { /* raced with a delete, skip it */ }
  }
  CACHE.counts = {
    texts, n, blind: blind || null,
    count: (name) => texts.reduce((c, t) => c + (t.includes(`"${name}"`) ? 1 : 0), 0),
    // What "used in N films" means, and the command that reproduces N without trusting this tool's word.
    note: () => `usage counted across ${n} planned film(s) in films/scene, reproducible via `
      + `\`node harness/lib/census.mjs\`${blind ? ` (PARTIAL: ${blind.split('\n')[0]})` : ''}`,
  };
  return CACHE.counts;
}

export const toks = searchWords;

/** Everything an entry is INDEXED by: what it is called, what it is, what it does, what it is also called. */
export const corpusOf = (e) => `${e.name} ${e.kind} ${e.blurb} ${(e.aka || []).join(' ')}`;

// ---- confidence: how much of the QUESTION this entry actually answers -----------------------------
//
// `score` ranks. It cannot say whether the winner is an answer, because it has no ceiling: the best of
// 397 things is returned whether it addresses the query or not. That is how "a light that travels
// around the border of a card" came back as `cardCascade`, `lightLeak` and `highlight`, three confident
// wrong things (engine-doctrine/MISTAKES.md #551).
//
// Coverage is the share of the query this entry accounts for, and the weighting is the whole trick.
// Plain word-count coverage does not separate the two cases: "make one layer chase another layer around
// the frame" (no answer) scored 4 of 8 on `count`, exactly what "count up to a big number" (a real
// answer) scored. The words doing that work were `layer` and `frame`, which appear in most blurbs and
// therefore distinguish nothing. So each query word is weighted by its RARITY across the corpus, the
// standard idf. Two consequences, both wanted:
//   · a word in nearly every blurb (`layer`, `frame`, `one`) is nearly free, so padding cannot buy
//     confidence;
//   · a word in NO entry (`upright`, `invert`, `stereoscopic`) carries the most weight and can never be
//     hit, so asking for something the engine has never heard of drives coverage down. That is the
//     signal, not noise: it is the query saying it is outside the vocabulary.
//
// The weak prefix credit inside score() deliberately does not count as a hit, because `travel` lending
// a point to `travelling` is a nudge for ranking and not evidence that the thing was found.

// Calibrated, not picked. Two query sets live in quality/gates/lib-test.mjs: twelve with a known-good
// answer in this engine, and five the engine genuinely has no answer to. This is the MIDPOINT of the
// gap between them, and lib-test asserts both ends plus the fact that the threshold still sits between
// them, which is what stops a later loosening of the matcher from quietly turning the honesty off.
//
// IT SURVIVED THE BLOCK LIBRARY, and that was worth checking rather than assuming. Coverage is
// idf-weighted, so it is a property of the CORPUS: adding 95 block families changed every word's
// rarity. Re-measured after, with `toks` from this file (see the warning below): worst known-good
// 0.634, best known-absent 0.402. 0.47 still sits between them, and it answers MORE plain-English
// questions than the recomputed midpoint of 0.518 would. So it stays.
//
// MEASURE WITH `toks`, NEVER WITH YOUR OWN SPLIT. A calibration pass here used a plain
// /[a-z0-9]+/g tokenizer to "re-derive" this number and got 0.366, because that split does not do
// what `toks` does. Every figure it produced was wrong in the same direction and the value it argued
// for let a known-absent query through. The tokenizer is exported for this reason: the number is
// meaningless unless it is measured through the same words the search actually indexes.
export const CONFIDENT = 0.47;

// Two things a bare ratio gets wrong, and both were measured rather than guessed.
//
// FILLER CANNOT COUNT AS EVIDENCE. `layer` and `frame` each appear in 37 of the 420 entries, so a query
// of nothing but those words is answered in full by dozens of things and scores a perfect 1.00. A word
// carried by more than this share of the corpus therefore weighs nothing at all, the same idea as the
// STOP list above but derived from the corpus instead of typed out. When a query has no word left after
// that, it asked no question and nothing can be confident about it.
const FILLER_SHARE = 0.06;
// A SHORT QUERY IS STILL A QUESTION, but a one-word one is thin evidence. The denominator is floored so
// a query is treated as carrying at least this much rarity whether it does or not. 6.0 is a little more
// than one word unique to a single entry (5.35 here), so `thermal blur` asks something and `blur` alone
// is a hint rather than an answer.
const MIN_MASS = 6.0;

/** coverageIn(corpus) → (entry, queryTokens) → 0..1, the idf-weighted share of the query it answers. */
export function coverageIn(all) {
  const hay = new Map(all.map((e) => [e, new Set(toks(corpusOf(e)))]));
  const floor = Math.log(1 / FILLER_SHARE);   // the idf a word must beat to count as content at all
  const df = new Map();
  const idf = (q) => {
    if (!df.has(q)) {
      const n = all.filter((e) => e.name.toLowerCase().includes(q) || hay.get(e).has(q)).length;
      const w = Math.log(all.length / (n + 1));
      df.set(q, w < floor ? 0 : w);
    }
    return df.get(q);
  };
  return (entry, qt) => {
    const name = entry.name.toLowerCase();
    const words = hay.get(entry) || new Set(toks(corpusOf(entry)));
    let hit = 0, total = 0;
    for (const q of qt) {
      const w = idf(q);
      total += w;
      if (name.includes(q) || words.has(q)) hit += w;
    }
    return hit / Math.max(total, MIN_MASS);
  };
}

// ---- the paste: slot → the JSON an author actually types -----------------------------------------
//
// The slot string is a PATH, and its two markers are what tell a VALUE from a KEY. `bg[].preset` is an
// array of objects whose `preset` takes the name as its value; `modifiers[]` ends AT the array, so the
// name is the KEY of the object inside it; `effector.drives{}` ends at an object map, so the name is a
// key there too and its value is an amount.
//
// This was rendered by one string replace, and it got the two key-shaped families wrong. The modifier
// family printed `"modifiers[]": "upright" }]`, which is not JSON and cannot be pasted anywhere, and no
// author ever read it because that family was invisible to the search until the day before. Any slot
// with a dot printed a flat `"cameraMove.move": "push in"`, which parses and is still not what the
// engine reads. A snippet an author cannot paste is worse than none: it looks authoritative.
// lib-test now parses one snippet per family and finds the name at the path the slot claims.
const jsonish = (v) => {
  if (Array.isArray(v)) return `[${v.map(jsonish).join(', ')}]`;
  if (v && typeof v === 'object') {
    const es = Object.entries(v);
    return es.length ? `{ ${es.map(([k, x]) => `"${k}": ${jsonish(x)}`).join(', ')} }` : '{}';
  }
  return JSON.stringify(v);
};

/** The object an author pastes this entry into, or null when the slot is prose rather than a path. */
export function pasteOf(entry) {
  const slot = entry.slot;
  if (!slot || slot.includes('(')) return null;      // `svgIcon()`, `cameraBlur (a top-level boolean)`
  const segs = slot.split('.');
  const last = segs.pop();
  let node;
  if (last.endsWith('[]')) node = { [last.slice(0, -2)]: [{ [entry.name]: {} }] };
  else if (last.endsWith('{}')) node = { [last.slice(0, -2)]: { [entry.name]: 1 } };
  else node = { [last]: entry.name };
  for (const seg of segs.reverse()) {
    node = seg.endsWith('[]') ? { [seg.slice(0, -2)]: [node] } : { [seg]: node };
  }
  return node;
}

/** The same thing as text, without the outer braces, so it drops into a scene as written. */
export function snippet(entry) {
  // A rule is prose, not a paste: the "snippet" line is the doc#anchor so an agent opens the doc
  // only if the brief above was not enough, never a JSON object nobody can paste into a scene.
  if (SIDE_KINDS.has(entry.kind)) return entry.doc || null;
  const obj = pasteOf(entry);
  if (!obj) return null;
  return Object.entries(obj).map(([k, v]) => `"${k}": ${jsonish(v)}`).join(', ');
}

/** The rank order itself. Exported so harness/dev/blurb-retrieval.mjs measures THIS, not a copy of it. */
export function score(entry, qt) {
  const name = entry.name.toLowerCase();
  const hay = toks(corpusOf(entry));
  let s = 0;
  for (const q of qt) {
    if (name === q) s += 12;
    else if (name.includes(q)) s += 6;
    if (hay.includes(q)) s += 3;
    else if (hay.some((w) => w.startsWith(q) || q.startsWith(w))) s += 1;
  }
  return s;
}

// ---- rankQuery: the CLI's own rank → split → reorder pipeline, as one flat, callable step -----------
//
// The CLI block below used to inline all of this. It is pulled out so an agent driving `--json` gets
// the SAME ranking a human reads as prose, from ONE place, rather than a second reimplementation left
// to drift from the first. `n` mirrors the CLI's `--n` (defaults the top-slice to 8); `guessN` mirrors
// the CLI's fallback slice when nothing clears CONFIDENT (defaults to 3, the CLI's "a wall of guesses
// is the noise this exists to remove" default).
// Relevance (`s`, then `c`) decides which names answer the query at all: that part is unchanged, and
// it is why `background` still returns backgrounds. Novelty (never used here, or newer than the
// window) only gets a turn to reorder INSIDE a tie, never across one, which is the difference between
// a tiebreak and an override.
//
// `s` is naturally discrete (12/6/3/1 per matched word, see `score` above) so an exact tie is already
// a real band: most background presets tie on `s` for a bare "background" query, because they share
// the same kind word and nothing else differs. `c` is not discrete (idf-weighted, continuous 0..1), so
// tiebreaking on its exact value would tie almost never and novelty would almost never fire. `covBand`
// rounds it to a 0.05 step first, wide enough to catch "these blurbs answer the question about equally
// well" without being wide enough to call a much-better match merely comparable.
const covBand = (c) => Math.round(c * 20);

// KINDS THAT RANK ON THEIR OWN LIST, never mixed into the vocabulary results. A craft rule answers
// "how do I decide" and a skill answers "what should I load"; neither is a name you write into a
// scene, and about a hundred rules crowded effects out of their own results when they shared a list.
// Asking for one by name (`--kind rule`, `--kind skill`) still ranks it as the main list.
export const SIDE_KINDS = new Set(['rule', 'skill']);

/** One side-list: the best `n` entries of a SIDE_KIND for this query, or [] when none match. */
function sideList(allIn, kind, qt, n) {
  return allIn.filter((e) => e.kind === kind)
    .map((e) => ({ e, s: score(e, qt) })).filter((r) => r.s > 0)
    .sort((x, y) => y.s - x.s || x.e.name.localeCompare(y.e.name)).slice(0, n)
    .map(({ e }) => ({ name: e.name, blurb: e.blurb, snippet: snippet(e) }));
}

export function rankQuery(allIn, query, { kind = null, n = 8, guessN = 3 } = {}) {
  // Craft rule records answer a different question (how to decide) than the vocabulary (what to name),
  // and about a hundred of them crowded effects out of their own results. They rank on their own list.
  const all = SIDE_KINDS.has(kind) ? allIn.filter((e) => e.kind === kind)
    : allIn.filter((e) => !SIDE_KINDS.has(e.kind));
  const qt = toks(query);
  const u = usage();
  const coverage = coverageIn(all);
  const matches = all
    .filter((e) => !kind || e.kind === kind)
    .map((e) => ({ ...e, s: score(e, qt), c: coverage(e, qt) }))
    .filter((e) => e.s > 0);

  // Computed over every match, not just the slice that survives: a fresh or unused entry earns its
  // place in the top `n` the same way a more-covering one would, by winning its own tied band, rather
  // than being reordered after the cut had already decided it was not shown.
  const fresh = newSince(matches.map((e) => e.name), { cwd: repoRoot });
  const top = matches
    .sort((a, b) => b.s - a.s || covBand(b.c) - covBand(a.c)
      || Number(u.count(b.name) === 0) - Number(u.count(a.name) === 0)
      || Number(fresh.has(b.name)) - Number(fresh.has(a.name))
      || b.c - a.c || a.name.localeCompare(b.name));

  // THE CONFIDENCE SPLIT HAPPENS BEFORE THE DISPLAY CUT. `n` is a display preference, and it used to
  // decide whether the tool believed it had an answer at all: the slice ran first and the split
  // searched only the survivors.
  //
  // Scope, stated honestly because a first pass at this overstated it. At the default n=8 the old
  // order answers correctly, so this fixes no default query. It matters when an author NARROWS the
  // list. `score` rewards a word in the NAME (+6, +12 exact) while `coverage` asks whether the query
  // was answered, and they disagree on purpose: a filler word carried by over 6% of the corpus has
  // idf 0, so it buys score and no coverage. Q="northern lights" scores `hard-light`, `plus-lighter`
  // and `soft-light` at 9 with coverage 0.000 and `aurora` at 6 with coverage 0.957 against a 0.47
  // threshold, so `--n 4` used to print NOTHING HERE CLEARLY MATCHES while holding a 0.957 match.
  // Asking for a shorter list should shorten the list, never withdraw the answer.
  //
  // Each side is sliced separately, so answers are never rationed by how many high-scoring
  // non-answers ranked above them. The `fresh` computation above already carries this same lesson.
  const answersRaw = top.filter((e) => e.c >= CONFIDENT).slice(0, n);
  const guessesRaw = top.filter((e) => e.c < CONFIDENT).slice(0, n);
  const selected = answersRaw.length ? answersRaw : guessesRaw.slice(0, guessN);

  const shape = (e) => ({
    name: e.name, kind: e.kind, slot: e.slot, blurb: e.blurb, pitfall: e.pitfall || null,
    doc: e.doc || null,
    coverage: e.c, score: e.s, isNew: fresh.has(e.name),
    snippet: snippet(e),
    // The full typed rows, not the one-line summary the prose prints. A JSON consumer is not skimming,
    // so there is no reason to hand it the abbreviated form and make it ask again.
    dials: e.dials || null,
  });

  return {
    query,
    confident: answersRaw.length > 0,
    all: all.length,
    results: selected.map(shape),
    rules: kind ? [] : sideList(allIn, 'rule', qt, 3),
    skills: kind ? [] : sideList(allIn, 'skill', qt, 2),
    answers: answersRaw.map(shape),
    guesses: guessesRaw.map(shape),
  };
}

// ---- the CLI ------------------------------------------------------------------------------------
// Guarded, because the ranking above is a library now: lib-test imports `collect`, `coverageIn` and
// `CONFIDENT` to calibrate the threshold against real queries, and an unguarded CLI would exit(2) the
// moment it was imported with no query.
const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  // No top-level await: this used to be `await collect()` straight inside the guarded `if`, which gave
  // arsenal.mjs an unsettled top-level await. Loading engine-doctrine/CRAFT/rules/*.json below pulls in
  // quality/gates/stage.mjs, which statically imports THIS file for `score`/`toks`/`coverageIn`/
  // `CONFIDENT`, a real cycle back to arsenal.mjs. Node refuses to resolve that cycle while arsenal's
  // own top-level await is pending (exit 13, "unsettled top-level await"), even though every binding
  // stage.mjs wants is already defined above this line. An ordinary async function, called and left
  // unawaited, carries no such restriction: every terminal branch below calls process.exit(), so
  // nothing needs to be awaited at module scope for the CLI to still block until it is done.
  main().catch((err) => { console.error(err); process.exit(1); });
}

async function main() {
  const argv = process.argv.slice(2);
  const VALUE_FLAGS = new Set(['kind', 'n']);
  const flag = (n) => {
    const eq = argv.find((a) => a.startsWith(`--${n}=`));
    if (eq) return eq.slice(n.length + 3);
    const i = argv.indexOf('--' + n);
    return i < 0 ? null : argv[i + 1];
  };

  // ---- W11: the ONE discovery front door. `make schema`, `make track`,
  // `make previews`, `make preset-sheets`, `make mistakes` and `make theme-sheet` were six
  // commands for "what can I say, and how do I ask for it". Each is now a flag here, dispatching
  // straight to the script that used to be its own target. This owns none of their logic, only
  // dispatches to it, for the same reason `collect()` owns no list above: a copy of somebody
  // else's answer is the thing that goes stale.
  const runScript = async (rel, args) => {
    const { spawnSync } = await import('node:child_process');
    const r = spawnSync(process.execPath, [path.join(repoRoot, rel), ...args], { stdio: 'inherit' });
    process.exit(r.status ?? 0);
  };
  if (flag('at') !== null) await runScript('harness/author/schema-at.mjs', [flag('at') || '']);
  if (argv.includes('--presets')) {
    const only = flag('only');
    await runScript('harness/dev/preset-sheets.mjs', only ? [`--only=${only}`] : []);
  }
  if (flag('theme') !== null) await runScript('harness/dev/theme-sheet.mjs', [`--theme=${flag('theme')}`]);
  if (argv.includes('--mistakes')) {
    await runScript('harness/author/mistakes.mjs', argv.filter((a) => a !== '--mistakes'));
  }
  if (flag('shape') !== null) {
    const pass = [flag('shape') || 'pan'];
    for (const [n, opt] of [['to'], ['dur'], ['from'], ['amp'], ['axis'], ['offset'], ['scene', '--scene'], ['layer', '--layer']]) {
      const v = flag(n);
      if (v !== null) pass.push(opt || `--${n}`, v);
    }
    await runScript('harness/author/track.mjs', pass);
  }

  // ---- --for <scene.json>: the vocabularies this film is already using, and has barely touched ------
  //
  // DISCOVERY WORKS HERE. TRIGGERING IT IS WHAT FAILS, and the evidence is not subtle. In one day three
  // capabilities turned out to be present, correct and unreachable in practice: cut timings were never
  // in the catalogue at all, `ease:"through"` had zero uses across 166 films, and 12 of 288 motion tracks
  // author a keyframe handle. None of those is a search problem. Nobody searched, because nothing in the
  // loop they were already in suggested there was anything to search FOR.
  //
  // So this runs inside `make dev`, not `make preflight`. Preflight is a step you take deliberately, once,
  // before the file exists; the twentieth render is where you want to be told that the thing you are
  // hand-rolling has a name.
  //
  // THE SIGNAL IS THE REGISTRY, NOT A QUERY, and the first cut of this got that wrong. It ranked the
  // arsenal against the film's own on-screen copy, which is a statement about the SUBJECT ("part of
  // Twitter") and says nothing about the vocabulary, so it matched nothing and printed nothing. What a
  // scene reliably states is which vocabularies it draws from: a film naming one cut has decided cuts
  // are in play, and the other 26 are then a real omission rather than a guess. Fully derived from
  // core/registry/registry.js, so a new vocabulary joins this the day it is defined.
  const forScene = argv.includes('--for') && argv[argv.indexOf('--for') + 1];
  if (forScene) {
    let raw; try { raw = fs.readFileSync(path.resolve(forScene), 'utf8'); } catch { process.exit(0); }
    await collect();   // every registry module is imported as a side effect of building the corpus
    const { registries } = await import('../../core/registry/registry.js');
    const used = (n) => raw.includes(`"${n}"`);
    const inPlay = registries()
      .map((r) => ({ r, has: r.names.filter(used), missing: r.names.filter((n) => !used(n)) }))
      .filter((x) => x.has.length && x.missing.length)
      .sort((a, b) => b.missing.length - a.missing.length)
      .slice(0, 4);
    const untouched = registries().filter((r) => r.names.length > 2 && !r.names.some(used)).length;
    if (!inPlay.length && !untouched) process.exit(0);
    console.log('\n  Vocabularies this film already uses, and what it has not reached for:\n');
    for (const { r, has, missing } of inPlay) {
      console.log(`    ${r.kind.padEnd(20)} uses ${String(has.length).padStart(2)}/${String(r.names.length).padEnd(3)} `
        + `· ${missing.slice(0, 6).join(' ')}${missing.length > 6 ? ' …' : ''}`);
    }
    if (untouched) {
      console.log(`\n    ${untouched} more vocabular(ies) this film names nothing from at all.`);
    }
    console.log(`  make arsenal Q="<what you mean>" searches all ${(await collect()).length}.\n`);
    process.exit(0);
  }

  const census = argv.includes('--census');
  const newOnly = argv.includes('--new');
  // --kind scopes --census/--new too: "what have I never reached for" is as often a question about ONE
  // vocabulary ("--census --kind background") as about the whole arsenal, and the flag already exists.
  // Read once, ahead of the query itself, since --census and --new both exit before the query is parsed.
  const kind = flag('kind');
  // Consume `--flag value` pairs by POSITION. Filtering on `argv.indexOf(a)` looked equivalent and is
  // not: indexOf finds the FIRST occurrence, so a repeated word is tested against the wrong neighbour,
  // and any flag but --kind leaked its value into the query ("…static tilt 3").
  const query = argv.reduce((acc, a, i) => {
    if (a.startsWith('--')) return acc;
    const prev = argv[i - 1];
    if (prev && prev.startsWith('--') && VALUE_FLAGS.has(prev.slice(2))) return acc;
    return acc.concat(a);
  }, []).join(' ').trim();

  const all = await collect();

  if (census) {
    const u = usage();
    const scope = kind ? all.filter((e) => e.kind === kind) : all;
    if (kind && !scope.length) {
      console.error(`\n  no entries of kind "${kind}". Kinds: ${[...new Set(all.map((e) => e.kind))].sort().join(' · ')}\n`);
      process.exit(2);
    }
    const dead = new Map();
    for (const e of scope) if (u.count(e.name) === 0) {
      if (!dead.has(e.kind)) dead.set(e.kind, []);
      dead.get(e.kind).push(e.name);
    }
    console.log(`\n  ARSENAL CENSUS${kind ? ` · kind "${kind}"` : ''} · ${scope.length} named things · ${u.note()}\n`);
    console.log(`  Zero-user entries. This does not say they are BAD: it says nothing distinguishes`);
    console.log(`  "undiscoverable" from "genuinely unwanted", and until something does, both look the same.\n`);
    for (const [kind, names] of [...dead].sort((a, b) => b[1].length - a[1].length)) {
      const total = all.filter((e) => e.kind === kind).length;
      console.log(`  ${(kind + ':').padEnd(22)} ${String(names.length).padStart(3)}/${String(total).padEnd(3)} unused   ${names.slice(0, 7).join(' ')}${names.length > 7 ? ' …' : ''}`);
    }
    // Age is the thing that tells those two apart, so the census now says which of the unused entries are
    // merely young. An entry with no users that landed this week has not been rejected by anybody.
    const young = newSince([...dead.values()].flat(), { cwd: repoRoot });
    if (young.size) {
      console.log(`\n  Of those, ${young.size} did not exist ${WINDOW_DAYS} days ago, so "unused" says nothing about`);
      console.log(`  them yet. The rest have had time to be chosen and were not:\n`);
      for (const name of [...young].sort()) {
        const e = all.find((x) => x.name === name);
        console.log(`    ${name.padEnd(18)} ${(e && e.kind) || ''}`);
      }
    }
    console.log('');
    process.exit(0);
  }

  // ---- --new: what landed lately, whether or not you can name it ------------------------------------
  // The other half of the census. Zero users reads two ways and age is what separates them: an entry that
  // arrived this week and has no users is unseen, not unwanted. Nobody can search for a thing they have
  // never heard of, so this is the one view that does not need a query.
  if (newOnly) {
    const u = usage();
    const scope = kind ? all.filter((e) => e.kind === kind) : all;
    const arr = newSince(scope.map((e) => e.name), { cwd: repoRoot });
    const fresh = scope.filter((e) => arr.has(e.name))
      .map((e) => ({ ...e, used: u.count(e.name) }))
      .sort((a, b) => a.used - b.used || a.kind.localeCompare(b.kind) || a.name.localeCompare(b.name));
    console.log(`\n  ARSENAL · what did not exist ${WINDOW_DAYS} days ago${kind ? ` · kind "${kind}"` : ''} · ${u.note()}\n`);
    if (!fresh.length) {
      console.log(`  nothing. Either the window was quiet, or git cannot answer here (a shallow clone).\n`);
      process.exit(0);
    }
    console.log(`  ${fresh.length} of ${scope.length} named things. New is not an endorsement, and neither is`);
    console.log(`  "no users yet". Both only mean you may not know these exist.\n`);
    for (const e of fresh) {
      console.log(`  ${e.name.padEnd(18)} ${(e.slot ? `${e.kind} · ${e.slot}` : e.kind).padEnd(40)}`
        + ` ${e.used === 0 ? 'no users yet' : `${e.used} scene(s)`}`);
    }
    console.log('');
    process.exit(0);
  }

  if (!query) {
    const kinds = [...new Set(all.map((e) => e.kind))].sort();
    console.error(`usage: node harness/author/arsenal.mjs "<what you want, in plain english>" [--kind <kind>] [--n 8]
         node harness/author/arsenal.mjs --census
         node harness/author/arsenal.mjs --new
         node harness/author/arsenal.mjs --at 'layers[].motion[]'         # what may I write there (was: make schema)
         node harness/author/arsenal.mjs --shape pan [--to -600] [...]    # a hand-keyed track     (was: make track)
         node harness/author/arsenal.mjs --mistakes "<words>"             # ask the mistake log     (was: make mistakes)
         node harness/author/arsenal.mjs --presets [--only=<name>]        # preset showcases        (was: make preset-sheets)
         node harness/author/arsenal.mjs --theme=<name>                   # one theme's look        (was: make theme-sheet)

    ${all.length} named things across ${kinds.length} vocabularies, read live from the registries:
    ${kinds.join(' · ')}`);
    process.exit(2);
  }

  const explicitN = flag('n');
  const result = rankQuery(all, query, {
    kind, n: Number(explicitN || 8), guessN: Number(explicitN) || 3,
  });

  // AGENT DOOR. Same ranking as the prose below, as a record instead of lines to grep. Nothing but this
  // JSON may reach stdout under --json (engine-doctrine/MISTAKES.md #401), so this must be the only exit past here.
  if (argv.includes('--json')) {
    emitJson(result);
    process.exit(0);
  }

  const ranked = result.results;

  if (!ranked.length) {
    console.log(`\n  nothing matched "${query}".`);
    console.log(`  Try one word instead of a sentence, or --kind to list one vocabulary.\n`);
    process.exit(0);
  }

  // The tally is line 2 on purpose: `make preflight` prints its own header and keeps the rest, so this is
  // the line an author skimming a preflight actually reads.
  const nFresh = ranked.filter((e) => e.isNew).length;
  console.log(`\n  ARSENAL · "${query}"`);
  if (!result.confident) {
    console.log(`  NOTHING HERE CLEARLY MATCHES. The ${all.length} named things were searched and none of them`);
    console.log(`  answers enough of that question to be called an answer. Assume the engine does not have it,`);
    console.log(`  and say so, rather than building on the ${ranked.length} below.\n`);
    console.log(`  Nearest by wording only, WEAK GUESSES, not answers:\n`);
  } else {
    console.log(`  ${ranked.length} matched · ${nFresh} newer than ${WINDOW_DAYS} days.\n`);
  }
  for (const e of ranked) {
    console.log(`  ${e.name}${e.isNew ? `   ← NEW, added in the last ${WINDOW_DAYS} days` : ''}`);
    console.log(`      ${e.kind}${e.slot ? ` · goes in \`${e.slot}\`` : ''}`);
    if (e.blurb) console.log(`      ${e.blurb}`);
    if (e.pitfall) console.log(`      pitfall: ${e.pitfall}`);
    if (e.doc) console.log(`      doc: ${e.doc}`);
    // A rule and a skill are prose, so their "snippet" IS their doc path. Printing it twice under
    // `--kind rule`/`--kind skill` read as two different answers to the same question.
    if (e.snippet && e.snippet !== e.doc) console.log(`      ${e.snippet}`);
    // The dials, and the door to the rest of them. Summary here and the typed table one command away,
    // because a query that returns six blocks must not print forty lines of ranges to say so.
    if (e.dials && e.dials.length) {
      console.log(`      dials: ${compactDials(e.dials)}`);
      console.log(`      full:  make arsenal AT=block.${e.name}`);
    }
    console.log('');
  }
  // SKILLS FIRST, because loading the right one changes how the whole job is done, and the effects
  // above are what it would then have you reach for. A rule refines a decision already being made.
  if (result.skills.length) {
    console.log('  SKILLS (load one of these before you start)');
    for (const k of result.skills) console.log(`  ${k.name}\n      ${k.blurb}${k.snippet ? `\n      ${k.snippet}` : ''}\n`);
  }
  if (result.rules.length) {
    console.log('  RULES (how to decide, open the doc only if you need more)');
    for (const r of result.rules) console.log(`  ${r.name}\n      ${r.blurb}${r.snippet ? `\n      ${r.snippet}` : ''}\n`);
  }


}
