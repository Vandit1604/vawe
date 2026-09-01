// arsenal.mjs: ask the arsenal for the thing you mean, in plain English.
//
//   node scripts/author/arsenal.mjs "a page scrolling under a static tilt"
//   node scripts/author/arsenal.mjs "leave the frame" --kind "gsap exit"
//   node scripts/author/arsenal.mjs --census            # what is built and never used
//
// WHY. The census that prompted this is not close: the `{type:"beat"}` blueprint mechanism, which
// CLAUDE.md names as the #1 defence against a plain slideshow, is used by 2 of 153 scenes, and 11 of
// its 19 beats have zero users. `EXIT_FX`, eleven named exits, is used by NONE, while every film still
// needs its layers to leave. That instruction has been given for months and obeyed twice, so the
// problem is not persuasion: 566 effects reachable only by reading an 849-line generated file are not
// reachable. An author who cannot find the thing re-derives a worse version of it, which is exactly
// how sixteen layers ended up saying `preset: "up"`.
//
// THIS OWNS NO LIST, and that is the whole design. `defineRegistry` (core/registry.js) already carries
// `kind`, `slot`, `names` and `blurbs` for every vocabulary, and `blueprints/index.mjs` already carries
// a description and a prose REQUEST per beat. A fourth copy of those names would drift from the three
// that exist, which is the failure this repo logs more than any other. Everything below is read at
// runtime; adding an effect to a registry makes it searchable here with no edit.
//
// The ranking is deliberately boring: token overlap against name + blurb + kind, no model, no network,
// no index to rebuild. It has to be right about "this word appears", not clever.
//
// AND IT MUST BE ABLE TO SAY IT DOES NOT KNOW. Ranking alone has no ceiling, so the best of 420 things
// came back whether it answered the question or not: `dollyZoom` was offered, twice in one day, for two
// capabilities this engine does not have (docs/MISTAKES.md #552). A wrong tool is worse than no tool
// here, because this is the tool an author is told to consult before inventing anything. Everything
// under CONFIDENT is now printed as a WEAK GUESS, under a line saying nothing clearly matches.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { newSince, WINDOW_DAYS } from './recency.mjs';

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
      .filter((f) => f.endsWith('.js'))
      .map((f) => `${rel}/${f}`);
  } catch { return []; }
};
const MODULE_PATHS = ['core', 'core/fx', 'core/layers'].flatMap(dirsOf);

/** Every entry the engine can name: {name, kind, slot, blurb}. */
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
        out.push({ name, kind: reg.kind, slot: reg.slot || null, blurb: (reg.blurbs && reg.blurbs[name]) || '' });
      }
    }
  }
  // Blueprints are not a registry (they are factories), but they are the highest-value thing to find
  // and they carry the best description in the repo: a prose sentence saying how to ASK for the beat.
  try {
    const bp = await import('../../blueprints/index.mjs');
    const src = fs.readFileSync(path.join(repoRoot, 'blueprints/index.mjs'), 'utf8');
    const notes = new Map();
    for (const m of src.matchAll(/^\s*(\w+):\s*\w+\.\w+,\s*\/\/\s*(.+)$/gm)) notes.set(m[1], m[2].trim());
    for (const name of Object.keys(bp.BEATS || {})) {
      out.push({ name, kind: 'blueprint beat', slot: 'layers[].beat',
        blurb: (bp.REQUESTS && bp.REQUESTS[name]) || notes.get(name) || '' });
    }
  } catch { /* blueprints are optional to search */ }
  // Layer TYPES: the coarsest vocabulary in the engine, and the one it could not search. They are not a
  // `*_REGISTRY`; they are LAYER_TYPES + LAYER_BLURBS in core/layers/index.js, derived there from each
  // module's own `blurb` export. So `beam`, whose blurb reads "a light that travels the rounded-rect
  // border", was invisible to a query naming exactly that, and the search offered three wrong things
  // instead (docs/MISTAKES.md #551). Read from that owner, never restated here.
  try {
    const L = await import('../../core/layers/index.js');
    const blurbs = L.LAYER_BLURBS || {};
    for (const name of L.LAYER_TYPES || []) {
      out.push({ name, kind: 'layer type', slot: 'layers[].type', blurb: blurbs[name] || '' });
    }
  } catch { /* layer types are optional to search */ }
  return out;
}

// ---- usage, so "built and never used" is a measured fact rather than an impression ----------------
const CACHE = { counts: null };
function usage() {
  if (CACHE.counts) return CACHE.counts;
  const counts = new Map();
  const dir = path.join(repoRoot, 'formats/scene');
  const files = fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => f.endsWith('.json') && f !== 'schema.json') : [];
  const texts = [];
  for (const f of files) {
    let d; try { d = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')); } catch { continue; }
    if (d.module !== 'scene') continue;
    texts.push(JSON.stringify(d));
  }
  CACHE.counts = { texts, count: (name) => texts.reduce((n, t) => n + (t.includes(`"${name}"`) ? 1 : 0), 0) };
  return CACHE.counts;
}

const STOP = new Set(['a', 'an', 'the', 'of', 'to', 'in', 'on', 'and', 'or', 'is', 'it', 'that', 'with', 'for', 'as']);
export const toks = (s) => String(s).toLowerCase().match(/[a-z][a-z0-9]+/g)?.filter((w) => !STOP.has(w)) || [];

// ---- confidence: how much of the QUESTION this entry actually answers -----------------------------
//
// `score` ranks. It cannot say whether the winner is an answer, because it has no ceiling: the best of
// 397 things is returned whether it addresses the query or not. That is how "a light that travels
// around the border of a card" came back as `cardCascade`, `lightLeak` and `highlight`, three confident
// wrong things (docs/MISTAKES.md #551).
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

// Calibrated, not picked. Two query sets live in scripts/gates/lib-test.mjs: eleven with a known-good
// answer in this engine, and seven the engine genuinely has no answer to. Measured over the corpus the
// worst known-good scores 0.513 and the best known-absent scores 0.432, so this is the midpoint of that
// gap. lib-test asserts BOTH ends and that the threshold still sits between them, which is what stops a
// later loosening of the matcher from quietly turning the honesty off.
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
  const hay = new Map(all.map((e) => [e, new Set(toks(`${e.name} ${e.kind} ${e.blurb}`))]));
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
    const words = hay.get(entry) || new Set(toks(`${entry.name} ${entry.kind} ${entry.blurb}`));
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
  const obj = pasteOf(entry);
  if (!obj) return null;
  return Object.entries(obj).map(([k, v]) => `"${k}": ${jsonish(v)}`).join(', ');
}

function score(entry, qt) {
  const name = entry.name.toLowerCase();
  const hay = toks(`${entry.name} ${entry.kind} ${entry.blurb}`);
  let s = 0;
  for (const q of qt) {
    if (name === q) s += 12;
    else if (name.includes(q)) s += 6;
    if (hay.includes(q)) s += 3;
    else if (hay.some((w) => w.startsWith(q) || q.startsWith(w))) s += 1;
  }
  return s;
}

// ---- the CLI ------------------------------------------------------------------------------------
// Guarded, because the ranking above is a library now: lib-test imports `collect`, `coverageIn` and
// `CONFIDENT` to calibrate the threshold against real queries, and an unguarded CLI would exit(2) the
// moment it was imported with no query.
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const argv = process.argv.slice(2);
  const VALUE_FLAGS = new Set(['kind', 'n']);
  const flag = (n) => { const i = argv.indexOf('--' + n); return i < 0 ? null : argv[i + 1]; };
  const census = argv.includes('--census');
  const newOnly = argv.includes('--new');
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
    const dead = new Map();
    for (const e of all) if (u.count(e.name) === 0) {
      if (!dead.has(e.kind)) dead.set(e.kind, []);
      dead.get(e.kind).push(e.name);
    }
    console.log(`\n  ARSENAL CENSUS · ${all.length} named things · ${u.texts.length} scenes read\n`);
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
    const arr = newSince(all.map((e) => e.name), { cwd: repoRoot });
    const fresh = all.filter((e) => arr.has(e.name))
      .map((e) => ({ ...e, used: u.count(e.name) }))
      .sort((a, b) => a.used - b.used || a.kind.localeCompare(b.kind) || a.name.localeCompare(b.name));
    console.log(`\n  ARSENAL · what did not exist ${WINDOW_DAYS} days ago\n`);
    if (!fresh.length) {
      console.log(`  nothing. Either the window was quiet, or git cannot answer here (a shallow clone).\n`);
      process.exit(0);
    }
    console.log(`  ${fresh.length} of ${all.length} named things. New is not an endorsement, and neither is`);
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
    console.error(`usage: node scripts/author/arsenal.mjs "<what you want, in plain english>" [--kind <kind>] [--n 8]
         node scripts/author/arsenal.mjs --census
         node scripts/author/arsenal.mjs --new

    ${all.length} named things across ${kinds.length} vocabularies, read live from the registries:
    ${kinds.join(' · ')}`);
    process.exit(2);
  }

  const kind = flag('kind');
  const n = Number(flag('n') || 8);
  const qt = toks(query);
  const u = usage();
  const coverage = coverageIn(all);
  let ranked = all
    .filter((e) => !kind || e.kind === kind)
    .map((e) => ({ ...e, s: score(e, qt), c: coverage(e, qt) }))
    .filter((e) => e.s > 0)
    .sort((a, b) => b.s - a.s || a.name.localeCompare(b.name))
    .slice(0, n);

  // The split this whole file exists for. Anything under the bar is a GUESS, printed as one and never
  // in the position an answer occupies. Ranking still decides the order inside each half.
  const answers = ranked.filter((e) => e.c >= CONFIDENT);
  const guesses = ranked.filter((e) => e.c < CONFIDENT);
  // Three guesses by default, because a wall of things that do not answer the question is the noise
  // this change exists to remove. An explicit --n is still honoured: `make preflight` ranks a whole
  // storyboard paragraph rather than asking a question, and nothing will ever clear the bar for a
  // paragraph, so its five stay five and are simply labelled for what they are.
  ranked = answers.length ? answers : guesses.slice(0, Number(flag('n')) || 3);

  // Age, asked for AFTER the ranking and only about the handful that survived it: 46ms for five names
  // against 79ms for all 397, and nobody reads the other 392.
  const fresh = newSince(ranked.map((e) => e.name), { cwd: repoRoot });
  // New entries go first. Relevance already decided WHICH five you see; within five, the one you have
  // never heard of is the one worth putting where the eye lands. Score order is preserved inside each half.
  ranked = [...ranked.filter((e) => fresh.has(e.name)), ...ranked.filter((e) => !fresh.has(e.name))];

  if (!ranked.length) {
    console.log(`\n  nothing matched "${query}".`);
    console.log(`  Try one word instead of a sentence, or --kind to list one vocabulary.\n`);
    process.exit(0);
  }

  // The tally is line 2 on purpose: `make preflight` prints its own header and keeps the rest, so this is
  // the line an author skimming a preflight actually reads.
  const nUnused = ranked.filter((e) => u.count(e.name) === 0).length;
  console.log(`\n  ARSENAL · "${query}"`);
  if (!answers.length) {
    console.log(`  NOTHING HERE CLEARLY MATCHES. The ${all.length} named things were searched and none of them`);
    console.log(`  answers enough of that question to be called an answer. Assume the engine does not have it,`);
    console.log(`  and say so, rather than building on the ${ranked.length} below.\n`);
    console.log(`  Nearest by wording only, WEAK GUESSES, not answers:\n`);
  } else {
    console.log(`  ${ranked.length} matched · ${fresh.size} newer than ${WINDOW_DAYS} days · ${nUnused} never used here.`
      + `\n  New and unused is not a recommendation. It means you may not know it is there.\n`);
  }
  for (const e of ranked) {
    const used = u.count(e.name);
    console.log(`  ${e.name}${fresh.has(e.name) ? `   ← NEW, added in the last ${WINDOW_DAYS} days` : ''}`);
    console.log(`      ${e.kind}${e.slot ? ` · goes in \`${e.slot}\`` : ''} · ${used === 0 ? 'NEVER used in this library' : `${used} scene(s)`}`);
    if (e.blurb) console.log(`      ${e.blurb}`);
    if (e.kind === 'blueprint beat') console.log(`      {"type":"beat","beat":"${e.name}", …}   then: make expand D=<file>`);
    else { const snip = snippet(e); if (snip) console.log(`      ${snip}`); }
    console.log('');
  }

}
