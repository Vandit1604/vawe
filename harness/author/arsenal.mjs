// rather than left uncatalogued (engine-doctrine/MISTAKES.md #364): every film still needs its layers to leave,
// capabilities this engine does not have (engine-doctrine/MISTAKES.md #552). A wrong tool is worse than no tool
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { newSince, WINDOW_DAYS } from './recency.mjs';
import { rowsFrom, compactDials } from './block-dials.mjs';
import { searchWords } from '../../core/registry/registry.js';
import { emitJson } from '../lib/findings.mjs';
import { population, AUTHORED } from '../lib/census.mjs';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

const dirsOf = (rel) => {
  try {
    return fs.readdirSync(path.join(repoRoot, rel))
      .filter((f) => (f.endsWith('.js') || f.endsWith('.mjs')) && !/\.test\.m?js$/.test(f))
      .map((f) => `${rel}/${f}`);
  } catch { return []; }
};
const corePackages = fs.readdirSync(path.join(repoRoot, 'core'), { withFileTypes: true })
  .filter((e) => e.isDirectory())
  .map((e) => `core/${e.name}`);
const MODULE_PATHS = corePackages.flatMap(dirsOf);

/** Read one entry's value out of an optional registry map (blurbs, aka, pitfalls), or a default. */
const at = (map, name, dflt = '') => (map && map[name] != null ? map[name] : dflt);

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
      for (const name of reg.names) {
        const key = `${reg.kind}\u0000${name}`;
        if (seen.has(key)) continue;
        seen.add(key);
        const docEntry = reg.docs && reg.docs[name];
        out.push({ name, kind: reg.kind, slot: reg.slot || null, blurb: at(reg.blurbs, name),
          aka: at(reg.aka, name, []), pitfall: at(reg.pitfalls, name), doc: docEntry ? docEntry.doc : null });
      }
    }
  }
  try {
    const [cat, idx] = await Promise.all([
      import('../../blocks/catalog.mjs'),
      import('../../blocks/index.mjs').catch(() => null),
    ]);
    const catOf = (idx && idx.CATEGORY_OF) || {};
    const schemas = (idx && idx.SCHEMAS) || {};
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
      out.push({ name: row.name, kind: 'block', slot: 'block', family: row.family,
        dials: rowsFrom(schemas[row.family]),
        blurb: row.blurb || '', aka: [catOf[row.family] || '', ...(row.aka || [])].filter(Boolean),
        pitfall: row.pitfall || '' });
    }
  } catch { /* the block library is optional to search, the same way recipes are */ }


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
  try {
    const { RECIPES } = await import('../../recipes/index.mjs');
    for (const [name, r] of Object.entries(RECIPES)) {
      const src = r.sources[0];
      out.push({ name, kind: 'recipe', slot: 'recipe', blurb: r.blurb,
        aka: [`${src.ref}@${src.t}s`], pitfall: '' });
    }
  } catch { /* recipes are optional to search */ }
  out.push(...(await cueSource()).filter((c) => !out.some((e) => e.name === c.name && e.slot === c.slot)));
  try {
    const { loadCraftRules } = await import('../lib/craft-rules.mjs');
    for (const rec of loadCraftRules()) {
      out.push({ name: rec.id, kind: 'rule', slot: null, blurb: rec.brief,
        aka: [rec.category], pitfall: null, doc: rec.doc });
    }
  } catch { /* craft rules are optional to search: a fresh clone can still find the registries */ }
  try {
    const { skillIndex } = await import('../lib/skill-stages.mjs');
    for (const sk of skillIndex()) {
      out.push({ name: sk.name, kind: 'skill', slot: null, blurb: sk.description,
        aka: sk.stage ? [sk.stage] : [], pitfall: null, doc: sk.doc });
    }
  } catch { /* skills are optional to search, the same way recipes are */ }
  return out;
}

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
    note: () => `usage counted across ${n} planned film(s) in films/scene, reproducible via `
      + `\`node harness/lib/census.mjs\`${blind ? ` (PARTIAL: ${blind.split('\n')[0]})` : ''}`,
  };
  return CACHE.counts;
}

export const toks = searchWords;

/** Everything an entry is INDEXED by: what it is called, what it is, what it does, what it is also called. */
export const corpusOf = (e) => `${e.name} ${e.kind} ${e.blurb} ${(e.aka || []).join(' ')}`;

// wrong things (engine-doctrine/MISTAKES.md #551).

export const CONFIDENT = 0.47;

const FILLER_SHARE = 0.06;
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

const covBand = (c) => Math.round(c * 20);

export const SIDE_KINDS = new Set(['rule', 'skill']);

/** One side-list: the best `n` entries of a SIDE_KIND for this query, or [] when none match. */
function sideList(allIn, kind, qt, n) {
  return allIn.filter((e) => e.kind === kind)
    .map((e) => ({ e, s: score(e, qt) })).filter((r) => r.s > 0)
    .sort((x, y) => y.s - x.s || x.e.name.localeCompare(y.e.name)).slice(0, n)
    .map(({ e }) => ({ name: e.name, blurb: e.blurb, snippet: snippet(e) }));
}

export function rankQuery(allIn, query, { kind = null, n = 8, guessN = 3 } = {}) {
  const all = SIDE_KINDS.has(kind) ? allIn.filter((e) => e.kind === kind)
    : allIn.filter((e) => !SIDE_KINDS.has(e.kind));
  const qt = toks(query);
  const u = usage();
  const coverage = coverageIn(all);
  const matches = all
    .filter((e) => !kind || e.kind === kind)
    .map((e) => ({ ...e, s: score(e, qt), c: coverage(e, qt) }))
    .filter((e) => e.s > 0);

  const fresh = newSince(matches.map((e) => e.name), { cwd: repoRoot });
  const top = matches
    .sort((a, b) => b.s - a.s || covBand(b.c) - covBand(a.c)
      || Number(u.count(b.name) === 0) - Number(u.count(a.name) === 0)
      || Number(fresh.has(b.name)) - Number(fresh.has(a.name))
      || b.c - a.c || a.name.localeCompare(b.name));

  const answersRaw = top.filter((e) => e.c >= CONFIDENT).slice(0, n);
  const guessesRaw = top.filter((e) => e.c < CONFIDENT).slice(0, n);
  const selected = answersRaw.length ? answersRaw : guessesRaw.slice(0, guessN);

  const shape = (e) => ({
    name: e.name, kind: e.kind, slot: e.slot, blurb: e.blurb, pitfall: e.pitfall || null,
    doc: e.doc || null,
    coverage: e.c, score: e.s, isNew: fresh.has(e.name),
    snippet: snippet(e),
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

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
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
  const kind = flag('kind');
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
    if (e.snippet && e.snippet !== e.doc) console.log(`      ${e.snippet}`);
    if (e.dials && e.dials.length) {
      console.log(`      dials: ${compactDials(e.dials)}`);
      console.log(`      full:  make arsenal AT=block.${e.name}`);
    }
    console.log('');
  }
  if (result.skills.length) {
    console.log('  SKILLS (load one of these before you start)');
    for (const k of result.skills) console.log(`  ${k.name}\n      ${k.blurb}${k.snippet ? `\n      ${k.snippet}` : ''}\n`);
  }
  if (result.rules.length) {
    console.log('  RULES (how to decide, open the doc only if you need more)');
    for (const r of result.rules) console.log(`  ${r.name}\n      ${r.blurb}${r.snippet ? `\n      ${r.snippet}` : ''}\n`);
  }


}
