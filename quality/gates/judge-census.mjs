#!/usr/bin/env node
// quality/gates/judge-census.mjs: a COUNT of what the eye has caught, never a score.
//
// `quality/gates/judge.mjs --verdict FIX --fix <code>@<beat>` (harness/lib/judge-codes.mjs) writes each
// fix the agent found into the render's receipt under `quality/baselines/approved/judge/`. Nothing
// summed those across films. This reads every receipt and tallies fix codes by dimension and by their
// position in the film, because the useful question after enough renders is "where in a film does the
// eye keep catching things", not "is this film good".
//
// WHY THIS IS A COUNT AND REFUSES TO BE A SCORE. `engine-doctrine/EVALS.md` refuses an aesthetic score
// on purpose: a number invites optimizing the number instead of the film, and a PASS/FIX verdict already
// says the only thing that matters (is the eye satisfied). This gate prints no average, no grade, and no
// per-film total, because any of those reads as "how good is this film" the moment two films are next to
// each other. If you are about to add one here: don't. Add it to `make judge`'s own verdict instead,
// where a human states it, not a script.
//
// BEAT POSITION IS RELATIVE, NOT ABSOLUTE. A receipt records which beats were flagged, never how many
// beats the film had (judge.mjs's prep step never wrote that count down). So "first / middle / last" is
// computed per film, over the DISTINCT beats that film's own fixes named: the earliest-flagged third is
// "first", the latest third "last", the rest "middle". A film with only one flagged beat has no earlier
// or later beat to compare it to, so it counts as "middle" rather than guessing.
//
// READ ONLY. This never writes a baseline and never touches quality/baselines/approved/judge/ itself.
//
//   node quality/gates/judge-census.mjs [--json]   ·   make judge-census
import fs from 'node:fs';
import path from 'node:path';
import { dirFor } from '../../harness/lib/receipt.mjs';
import { JUDGE_CODES } from '../../harness/lib/judge-codes.mjs';
import { gateFindings } from '../../harness/lib/findings.mjs';

const RECEIPT_DIR = dirFor('judge');

/** Every receipt currently on disk, parsed. A receipt that fails to parse is skipped, not thrown on: a
 *  corrupt file elsewhere must not stop this from counting the rest. */
export function loadReceipts(dir = RECEIPT_DIR) {
  let names;
  try { names = fs.readdirSync(dir).filter((n) => n.endsWith('.json')); }
  catch { return []; }
  const out = [];
  for (const n of names) {
    try { out.push(JSON.parse(fs.readFileSync(path.join(dir, n), 'utf8'))); }
    catch { /* skip: a bad file here is not this gate's fact to report */ }
  }
  return out;
}

const bucketOf = (rank, n) => {
  const frac = n > 1 ? rank / (n - 1) : 0.5; // one flagged beat alone: no basis to call it early or late
  if (frac < 1 / 3) return 'first';
  if (frac > 2 / 3) return 'last';
  return 'middle';
};

/**
 * Tally `{code, beat}` fix records across receipts.
 * Returns { totalReceipts, receiptsWithFixes, totalFixes, unparsedLegacy, byDimension, byBeatPosition,
 *   unknownCodes }. `unparsedLegacy` counts receipts still carrying the free-text `--fixes` string
 * (judge.mjs's one-release back-compat path): counted, never dropped silently
 * (engine-doctrine/MISTAKES.md #401 is exactly a machine-readable output nobody could parse and a count
 * that went unquestioned because of it).
 */
export function census(receipts) {
  const byDimension = Object.fromEntries(JUDGE_CODES.map((c) => [c, 0]));
  const byBeatPosition = { first: 0, middle: 0, last: 0 };
  const unknownCodes = {};
  let totalFixes = 0, unparsedLegacy = 0, receiptsWithFixes = 0;

  for (const r of receipts) {
    const fixes = r && r.fixes;
    if (!Array.isArray(fixes)) {
      if (fixes) unparsedLegacy += 1;
      continue;
    }
    if (!fixes.length) continue;
    receiptsWithFixes += 1;

    const beats = [...new Set(fixes.map((x) => x.beat))]
      .sort((a, b) => (Number(a) - Number(b)) || String(a).localeCompare(String(b)));
    const rankOf = new Map(beats.map((b, i) => [b, i]));

    for (const { code, beat } of fixes) {
      totalFixes += 1;
      if (Object.prototype.hasOwnProperty.call(byDimension, code)) byDimension[code] += 1;
      else unknownCodes[code] = (unknownCodes[code] || 0) + 1;
      byBeatPosition[bucketOf(rankOf.get(beat), beats.length)] += 1;
    }
  }
  return { totalReceipts: receipts.length, receiptsWithFixes, totalFixes, unparsedLegacy, byDimension, byBeatPosition, unknownCodes };
}

if (process.argv[1] === new URL(import.meta.url).pathname) {
  const f = gateFindings();
  const c = census(loadReceipts());

  f.note('judge-census-receipts',
    `${c.totalReceipts} judge receipt(s) on disk, ${c.receiptsWithFixes} carrying at least one fix`,
    { totalReceipts: c.totalReceipts, receiptsWithFixes: c.receiptsWithFixes, totalFixes: c.totalFixes });

  for (const code of JUDGE_CODES) {
    f.note(`dimension:${code}`, `${code}: ${c.byDimension[code]}`, { count: c.byDimension[code] });
  }
  for (const bucket of ['first', 'middle', 'last']) {
    f.note(`beat:${bucket}`, `${bucket} beat(s): ${c.byBeatPosition[bucket]}`, { count: c.byBeatPosition[bucket] });
  }
  if (c.unparsedLegacy) {
    f.note('judge-census-legacy', `${c.unparsedLegacy} receipt(s) still carry the old free-text --fixes string, not counted above`, { count: c.unparsedLegacy });
  }
  for (const [code, count] of Object.entries(c.unknownCodes)) {
    f.note('judge-census-unknown-code', `"${code}" is not one of the seven judge codes but appears ${count} time(s)`, { code, count });
  }

  if (!process.argv.includes('--json')) {
    console.log(`\n  JUDGE CENSUS · a count of what the eye caught, never a score (engine-doctrine/EVALS.md)`);
    console.log(`  ${c.totalReceipts} receipt(s), ${c.receiptsWithFixes} with fixes, ${c.totalFixes} fix(es) total`);
    if (c.totalReceipts === 0) {
      console.log(`  (no receipts yet: run \`make judge D=<file>\` then record a verdict to populate this)`);
    } else {
      console.log(`\n  by dimension:`);
      for (const code of JUDGE_CODES) console.log(`    ${code.padEnd(24)} ${c.byDimension[code]}`);
      console.log(`\n  by beat position:`);
      for (const bucket of ['first', 'middle', 'last']) console.log(`    ${bucket.padEnd(24)} ${c.byBeatPosition[bucket]}`);
      if (c.unparsedLegacy) console.log(`\n  ~ ${c.unparsedLegacy} receipt(s) carry unparsed free-text --fixes, not counted above`);
      for (const [code, count] of Object.entries(c.unknownCodes)) console.log(`  ~ unknown code "${code}": ${count}`);
    }
  }

  f.emit();
}
