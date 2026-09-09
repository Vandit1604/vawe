#!/usr/bin/env node
// blurb-retrieval.mjs: does an entry's own description find that entry?
//
//   node harness/dev/blurb-retrieval.mjs            # the distribution, plus the entries that fail
//   node harness/dev/blurb-retrieval.mjs --all      # every entry and its rank
//
// WHY THIS EXISTS, from a real failure. An author searched the arsenal in plain English for
// "elements react to a moving point by distance". `core/tracks/effector.js` IS that, exactly, and the
// search said NOTHING HERE CLEARLY MATCHES. One blurb was then rewritten and the query started
// working, which fixed one row and left the class alone.
//
// The class is this: `harness/author/arsenal.mjs` ranks on name + kind + blurb and nothing else (read
// `score` and `coverageIn` there), so a blurb is not a caption, it IS the retrieval index. Nothing said
// so and nothing measured it, which is how a blurb could be written that reads well and finds nothing.
//
// THE MEASUREMENT, and the trick that makes it a fact rather than a taste opinion: take each entry's
// OWN blurb as the query, and ask where the entry lands in its own search results. A description that
// cannot retrieve the thing it describes is carrying no distinguishing signal, whatever it reads like.
//
// WHAT THIS DOES NOT MEASURE, written here rather than left to be discovered:
//   · It measures DISTINCTIVENESS, never ACCURACY. A confidently wrong blurb that uses rare words
//     retrieves itself at rank 1 and scores perfectly here. Nothing automated can catch that; a reader
//     can. Do not read a green run as "the blurbs are correct".
//   · A blurb that repeats the entry's own NAME would retrieve itself for free, so every query token
//     the name already contains is STRIPPED before ranking (see `queryFor`). Without that the test
//     grades itself and everything passes.
//   · Near-identical siblings (`spring` vs `springStiff`, `dark` vs `deep`) legitimately cannot
//     separate: their honest descriptions ARE nearly the same sentence, and forcing rank 1 on them
//     would mean writing a lie about one of them. TOP-3 is the useful bar, and rank 1 is reported
//     alongside it rather than demanded.
//   · Entries with no blurb at all cannot be scored here. `blurbsOf` refuses those at load for the
//     registries that use it; the few vocabularies that pass no blurbs map at all are counted and named
//     separately, because "unscored" is not "passed".
//
// It reports and exits 0. The refusal that BLOCKS lives at the write site, in `blurbsOf`
// (core/registry.js), because a gate running afterwards only promises to notice.
import { collect, toks, score } from '../author/arsenal.mjs';

// Split a name the way a person reads it: `thermalBlur` → thermal, blur; `ken-burns` → ken, burns.
const nameParts = (name) => String(name)
  .replace(/([a-z0-9])([A-Z])/g, '$1 $2').toLowerCase().match(/[a-z0-9]+/g) || [];

/**
 * The query for one entry: its own blurb, with every word the NAME already carries removed.
 * Without this strip, "the fade cut fades" retrieves `fade` at rank 1 and the test proves nothing.
 */
export function queryFor(entry) {
  const lower = String(entry.name).toLowerCase();
  const parts = new Set(nameParts(entry.name));
  return toks(entry.blurb).filter((q) => !lower.includes(q) && !parts.has(q));
}

export function rankSelf(all, entry) {
  const qt = queryFor(entry);
  if (!qt.length) return { rank: null, why: 'no query left after stripping the name' };
  const ranked = all
    .map((e) => ({ e, s: score(e, qt) }))
    .filter((x) => x.s > 0)
    // The same order arsenal.mjs prints, ties broken by name, so a rank here is the rank an author sees.
    .sort((a, b) => b.s - a.s || a.e.name.localeCompare(b.e.name));
  const i = ranked.findIndex((x) => x.e.name === entry.name && x.e.kind === entry.kind);
  return { rank: i < 0 ? null : i + 1, why: i < 0 ? 'absent from its own results' : '', top: ranked.slice(0, 3).map((x) => x.e.name) };
}

const all = await collect();
const scored = all.filter((e) => e.blurb && e.blurb.trim());
const unscored = all.filter((e) => !e.blurb || !e.blurb.trim());

const rows = scored.map((e) => ({ e, ...rankSelf(all, e) }));
const at = (n) => rows.filter((r) => r.rank === n).length;
const within = (n) => rows.filter((r) => r.rank && r.rank <= n).length;
const missing = rows.filter((r) => !r.rank || r.rank > 3);

const pct = (n) => `${((n / rows.length) * 100).toFixed(1)}%`;
console.log(`\n  BLURB RETRIEVABILITY · ${all.length} named things · ${rows.length} with a blurb to test\n`);
console.log(`  rank 1        ${String(at(1)).padStart(4)}   ${pct(at(1))}`);
console.log(`  top 3         ${String(within(3)).padStart(4)}   ${pct(within(3))}`);
console.log(`  top 10        ${String(within(10)).padStart(4)}   ${pct(within(10))}`);
console.log(`  outside 3     ${String(missing.length).padStart(4)}   ${pct(missing.length)}`);
console.log(`  not at all    ${String(rows.filter((r) => !r.rank).length).padStart(4)}`);
if (unscored.length) console.log(`\n  ${unscored.length} entries carry no blurb and are UNSCORED, not passed: `
  + `${unscored.slice(0, 8).map((e) => `${e.name} (${e.kind})`).join(', ')}${unscored.length > 8 ? ' …' : ''}`);

if (missing.length) {
  console.log(`\n  Their own description does not put them in their own top 3:\n`);
  for (const r of missing.sort((a, b) => (b.rank || 1e9) - (a.rank || 1e9))) {
    console.log(`  ${(r.rank ? `#${r.rank}` : 'ABSENT').padStart(7)}  ${r.e.name.padEnd(20)} ${r.e.kind}`);
    console.log(`           ${r.e.blurb}`);
    if (r.top) console.log(`           beaten by: ${r.top.join(', ')}`);
  }
}
if (process.argv.includes('--all')) {
  console.log('');
  for (const r of rows.sort((a, b) => (b.rank || 1e9) - (a.rank || 1e9))) {
    console.log(`  ${(r.rank ? `#${r.rank}` : 'ABSENT').padStart(7)}  ${r.e.name.padEnd(20)} ${r.e.kind}`);
  }
}
console.log('');
