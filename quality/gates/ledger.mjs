// ledger.mjs. Two things this repo needs to know about a shipped film, in one file because both
// answer "what does the record say", never "how good is this":
//
//   1. THE DESIGN LEDGER: cross-video memory that makes anti-sameness enforceable. Every shipped video
//      logs its fingerprint; every new design is checked against history BEFORE shipping. Per-video QA
//      can't see repetition, this can. `add` refuses unless the eye already judged THIS render PASS,
//      which is also where WAS THIS FILM JUDGED lives: isJudged/checkOne answer that question, reused
//      by `make ship`'s last step and by `add`'s own guard, so there is one definition of "looked at",
//      not three (this file used to share that question with the now-deleted no-judge.mjs and
//      judge-census.mjs; see git history for their prior separate headers).
//   2. THE JUDGE RECORD: has the eye looked at every film that shipped a render (corpus ratchet,
//      `unjudged`), and what has it caught across every receipt so far (`census`, a COUNT, never a
//      score: engine-doctrine/EVALS.md refuses an aesthetic score on purpose, because a number invites
//      optimizing the number instead of the film). Both are READ ONLY over quality/baselines/approved/judge/.
//
//   node quality/gates/ledger.mjs check    films/x/brand-video.json   # compare vs all logged designs
//   node quality/gates/ledger.mjs add      films/x/brand-video.json   # log it (after it ships, judged PASS)
//   node quality/gates/ledger.mjs list
//   node quality/gates/ledger.mjs not      [theme]                     # the FORWARD query: see deriveNotLine
//   node quality/gates/ledger.mjs judged   films/x/brand-video.json   # single-film: was THIS render judged
//   node quality/gates/ledger.mjs unjudged [--stamp] [--json]          # corpus ratchet: how many still aren't
//   node quality/gates/ledger.mjs census   [--json]                    # count of judge fixes by dimension/beat
//   make ledger D=… (check) · make ledger-add D=… · make no-judge · make judge-census
//
// Rules enforced by `check`: cross-brand SAME (>0.75) exits 1; cross-brand CLOSE (>0.55) warns;
// same-brand videos may share style but not an identical beat skeleton (SAME-SKELETON warns).
//
// A judge PASS is never self-recorded here either: every question below reads a receipt
// `quality/gates/judge.mjs` already wrote (harness/lib/receipt.mjs), and nothing in this file invents
// a verdict. See engine-doctrine/JUDGE.md.
import fs from 'node:fs';
import crypto from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { fingerprint, similarity, verdict } from './similarity.mjs';
import { gateFindings } from '../../harness/lib/findings.mjs';
import { readReceipt, dirFor } from '../../harness/lib/receipt.mjs';
import { JUDGE_CODES } from '../../harness/lib/judge-codes.mjs';
import { population, ROOT } from '../../harness/lib/census.mjs';
import { renderOf } from './tile.mjs';

const LEDGER = path.join(ROOT, 'quality', 'ledger', 'ledger.json');
const RATCHET = path.join(ROOT, 'quality/baselines/no-judge-ratchet.json');
const RECEIPT_DIR = dirFor('judge');

export const load = () => (fs.existsSync(LEDGER) ? JSON.parse(fs.readFileSync(LEDGER, 'utf8')) : []);

// THE FORWARD QUERY. `check` asks "does this finished design repeat history"; an author staring at a
// blank brief needs the opposite direction: "what has recent work already leant on, so I can exclude it
// BY NAME instead of guessing". Same corpus (quality/ledger/ledger.json), same fingerprint, read the other way.
//
// A NOT line is a constraint, never a ban: it names what recent films used, it never tells the author
// what to use instead (that is `make arsenal`'s job), and a film with a real reason to repeat a value
// still can, via `authoring.allow` + `_why`.
//
// The item count is evidence, not taste: only a value used by a STRICT MAJORITY of the pool (more than
// half; a pool of one counts its own vocab, since one film is all the evidence there is) counts as
// "leant on", and each category is capped at 3 so the line stays pasteable. A twenty-item NOT line
// excludes nothing, because nobody reads it before ignoring it.
export function deriveNotLine(theme, entries) {
  const pool = theme ? entries.filter((e) => e.theme === theme) : entries;
  if (!pool.length) return { pool, line: null };
  const majority = Math.floor(pool.length / 2) + 1; // a STRICT majority: for a pool of 1, its own vocab
  const tally = (pick) => {
    const counts = new Map();
    for (const e of pool) for (const v of new Set(pick(e.fp))) counts.set(v, (counts.get(v) || 0) + 1);
    return [...counts.entries()].filter(([, n]) => n >= majority).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, 3).map(([v]) => v);
  };
  const cats = (fp) => fp.cats || {};
  const bg = tally((fp) => cats(fp).bg || []);
  const entrance = tally((fp) => cats(fp).entrance || []);
  const exit = tally((fp) => cats(fp).exit || []);
  const cut = tally((fp) => cats(fp).cut || []);
  const clauses = [];
  if (bg.length) clauses.push(`no ${bg.join('/')} background`);
  if (entrance.length) clauses.push(`no ${entrance.join('/')} entrance`);
  if (exit.length) clauses.push(`no ${exit.join('/')} exit`);
  if (cut.length) clauses.push(`no ${cut.join('/')} cut`);
  if (!clauses.length) return { pool, line: null };
  const scope = `${pool.length} logged design(s)${theme ? ` for theme "${theme}"` : ''}`;
  return { pool, line: `NOT   ${clauses.join(', ')}  (derived from ${scope})` };
}

// ---- WAS THIS FILM JUDGED -----------------------------------------------------------------------------
//
// WHAT COUNTS AS "LOOKED AT". A valid receipt: exists, is not stale against the CURRENT scene JSON
// (receipt.mjs hashes the subject's bytes + any html fragment it names), and its `renderHash` matches a
// fresh sha256 of the mp4 sitting in `out/` right now. That last part is deliberate and is the difference
// from every mtime-based check in this repo (tile.mjs's `gradeable`, on purpose, uses mtime because a
// hash was judged not worth the cost there): a receipt is a claim about bytes someone looked at, and a
// claim that survives a changed video regardless of its own timestamp is exactly the stale-artefact-
// read-as-fresh mistake this repo has logged more than once. `renderHash` makes a re-render (same name,
// different bytes, whatever the mtime says) invalidate the receipt outright. Any verdict (PASS or FIX)
// counts as "looked at": this asks whether the eye ran, not whether it liked what it saw.
export const hashFile = (p) => { try { return crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex'); } catch { return null; } };

/** Has the eye looked at THIS scene's THIS render? False for "never judged" and for "judged a render
 *  that is no longer the one on disk" alike; `unjudged` below does not need to tell them apart, and
 *  neither does `add`'s guard deciding whether to trust a PASS. */
export function isJudged(scenePath, mp4 = renderOf(scenePath)) {
  const r = readReceipt('judge', scenePath);
  if (!r.exists || r.stale || !r.receipt.verdict) return false;
  return r.receipt.renderHash === hashFile(mp4);
}

/** Single-film answer for `make ship`: not just whether the eye looked, but WHY not, so the refusal can
 *  say which condition failed instead of a bare "unjudged". Three reasons, checked in the order a film
 *  actually passes through them: never judged at all, judged but the scene moved on since, judged but
 *  the mp4 on disk now is a different render. `ok: true` for a fresh PASS or FIX alike, same as isJudged. */
export function checkOne(scenePath, mp4 = renderOf(scenePath)) {
  const r = readReceipt('judge', scenePath);
  if (!r.exists) return { ok: false, reason: 'no judge receipt exists yet' };
  if (r.stale) return { ok: false, reason: 'the scene changed since the receipt was written' };
  if (!r.receipt.verdict) return { ok: false, reason: 'the receipt has no recorded verdict' };
  if (r.receipt.renderHash !== hashFile(mp4)) {
    return { ok: false, reason: 'the mp4 changed since the receipt was written (re-rendered without re-judging)' };
  }
  return { ok: true, reason: null };
}

const isScene = (name, dir = path.join(ROOT, 'films/scene')) => {
  try { return JSON.parse(fs.readFileSync(path.join(dir, name), 'utf8')).module === 'scene'; }
  catch { return false; }
};

// ---- WHAT THE EYE HAS CAUGHT: A COUNT, NEVER A SCORE --------------------------------------------------
//
// `quality/gates/judge.mjs --verdict FIX --fix <code>@<beat>` (harness/lib/judge-codes.mjs) writes each
// fix the agent found into the render's receipt under `quality/baselines/approved/judge/`. `census`
// tallies fix codes by dimension and by their position in the film, because the useful question after
// enough renders is "where in a film does the eye keep catching things", not "is this film good".
//
// WHY THIS IS A COUNT AND REFUSES TO BE A SCORE. `engine-doctrine/EVALS.md` refuses an aesthetic score
// on purpose: a number invites optimizing the number instead of the film, and a PASS/FIX verdict already
// says the only thing that matters (is the eye satisfied). This prints no average, no grade, and no
// per-film total, because any of those reads as "how good is this film" the moment two films are next to
// each other. If you are about to add one here: don't. Add it to `make judge`'s own verdict instead,
// where a human states it, not a script.
//
// BEAT POSITION IS RELATIVE, NOT ABSOLUTE. A receipt records which beats were flagged, never how many
// beats the film had (judge.mjs's prep step never wrote that count down). So "first / middle / last" is
// computed per film, over the DISTINCT beats that film's own fixes named: the earliest-flagged third is
// "first", the latest third "last", the rest "middle". A film with only one flagged beat has no earlier
// or later beat to compare it to, so it counts as "middle" rather than guessing.

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

function printCensus(c) {
  console.log(`\n  JUDGE CENSUS · a count of what the eye caught, never a score (engine-doctrine/EVALS.md)`);
  console.log(`  ${c.totalReceipts} receipt(s), ${c.receiptsWithFixes} with fixes, ${c.totalFixes} fix(es) total`);
  if (c.totalReceipts === 0) {
    console.log(`  (no receipts yet: run \`make judge D=<file>\` then record a verdict to populate this)`);
    return;
  }
  console.log(`\n  by dimension:`);
  for (const code of JUDGE_CODES) console.log(`    ${code.padEnd(24)} ${c.byDimension[code]}`);
  console.log(`\n  by beat position:`);
  for (const bucket of ['first', 'middle', 'last']) console.log(`    ${bucket.padEnd(24)} ${c.byBeatPosition[bucket]}`);
  if (c.unparsedLegacy) console.log(`\n  ~ ${c.unparsedLegacy} receipt(s) carry unparsed free-text --fixes, not counted above`);
  for (const [code, count] of Object.entries(c.unknownCodes)) console.log(`  ~ unknown code "${code}": ${count}`);
}

// CLI ONLY WHEN RUN DIRECTLY. deriveNotLine and load are imported (by tests, and by preflight.mjs
// spawning this file rather than importing it), and an import must never run the dispatch below with
// the IMPORTER's argv (that was the whole bug class this guard exists to close).
if (process.argv[1] && process.argv[1].endsWith('ledger.mjs')) {
  const [cmd, file] = process.argv.slice(2);

  if (cmd === 'list') {
    const entries = load();
    if (!entries.length) console.log('ledger empty: nothing shipped yet');
    for (const e of entries) console.log(`${e.file}  (${e.theme}) · ${e.fp.structure.join('→')}`);
    process.exit(0);
  }
  if (cmd === 'not') {
    const theme = file; // second arg reused as an optional theme filter; omit it to read the whole corpus
    const entries = load();
    const { pool, line } = deriveNotLine(theme, entries);
    if (!pool.length) {
      console.log(theme ? `ledger has no logged design for theme "${theme}": no NOT line to derive.`
        : 'ledger empty: no NOT line to derive.');
    } else if (!line) {
      console.log(`${pool.length} logged design(s)${theme ? ` for theme "${theme}"` : ''}, but nothing crosses the majority bar: no NOT line to derive.`);
    } else {
      console.log(line);
    }
    process.exit(0);
  }
  if (cmd === 'judged') {
    // single-film mode: `make ship`'s last step. Not just whether the eye looked, but WHY not, so the
    // refusal names the exact condition instead of a bare "unjudged".
    if (!file) { console.error('usage: node quality/gates/ledger.mjs judged films/x/video.json'); process.exit(2); }
    const { ok, reason } = checkOne(file);
    if (ok) { console.log(`  ✓ ${file} has a fresh judge receipt`); process.exit(0); }
    console.error(`  ✗ ${file}: no fresh judge receipt (${reason})` +
      `\n    make judge D=${file}, then READ the sheet and record the verdict:` +
      `\n    node quality/gates/judge.mjs ${file} --verdict PASS|FIX ...\n`);
    process.exit(1);
  }

  if (cmd === 'unjudged') {
    // corpus ratchet: how many rendered films have no valid judge receipt. `--stamp` lowers the ceiling.
    const stamp = process.argv.includes('--stamp');
    const f = gateFindings();
    const { names } = population('no-judge', { filter: (n) => n !== 'schema.json' && !n.startsWith('_') && isScene(n) });
    const rendered = [];
    for (const name of names) {
      const scenePath = path.join('films/scene', name);
      const mp4 = renderOf(scenePath);
      if (!fs.existsSync(mp4)) continue; // never rendered: not this ratchet's question
      rendered.push({ scenePath, mp4 });
    }
    const unjudged = rendered.filter(({ scenePath, mp4 }) => !isJudged(scenePath, mp4));
    console.log(`  ${rendered.length} rendered film(s), ${unjudged.length} with no valid judge receipt`);
    const prior = (() => { try { return JSON.parse(fs.readFileSync(RATCHET, 'utf8')); } catch { return null; } })();
    if (stamp) {
      fs.mkdirSync(path.dirname(RATCHET), { recursive: true });
      fs.writeFileSync(RATCHET, `${JSON.stringify({ noJudge: unjudged.length }, null, 1)}\n`);
      console.log(`  ✓ ratchet stamped at ${unjudged.length}${prior ? `, was ${prior.noJudge}` : ''}`);
    } else if (prior && unjudged.length > prior.noJudge) {
      f.fail('no-judge', `\n  ✗ ${unjudged.length} rendered film(s) have no valid judge receipt, up from ${prior.noJudge}:` +
        `\n    ${unjudged.slice(0, 6).map((u) => u.scenePath).join(', ')}${unjudged.length > 6 ? ', …' : ''}` +
        `\n    \`make judge D=<file>\` then \`node quality/gates/judge.mjs <file> --verdict PASS|FIX\` records that the` +
        `\n    eye actually ran on THIS render. Lower the bar deliberately only with: node quality/gates/ledger.mjs unjudged --stamp\n`);
    } else if (prior && unjudged.length < prior.noJudge) {
      console.log(`  ~ ${prior.noJudge - unjudged.length} fewer un-judged than the ratchet allows. Lower it: --stamp`);
    } else if (!prior) {
      console.log(`  (no ratchet stamped yet: node quality/gates/ledger.mjs unjudged --stamp)`);
    } else {
      console.log(`  ✓ at the ratchet (${prior.noJudge})`);
    }
    f.emit();
    process.exit(f.records.some((r) => r.severity === 'error') ? 1 : 0);
  }

  if (cmd === 'census') {
    const f = gateFindings();
    const c = census(loadReceipts());
    f.note('judge-census-receipts',
      `${c.totalReceipts} judge receipt(s) on disk, ${c.receiptsWithFixes} carrying at least one fix`,
      { totalReceipts: c.totalReceipts, receiptsWithFixes: c.receiptsWithFixes, totalFixes: c.totalFixes });
    for (const code of JUDGE_CODES) f.note(`dimension:${code}`, `${code}: ${c.byDimension[code]}`, { count: c.byDimension[code] });
    for (const bucket of ['first', 'middle', 'last']) f.note(`beat:${bucket}`, `${bucket} beat(s): ${c.byBeatPosition[bucket]}`, { count: c.byBeatPosition[bucket] });
    if (c.unparsedLegacy) f.note('judge-census-legacy', `${c.unparsedLegacy} receipt(s) still carry the old free-text --fixes string, not counted above`, { count: c.unparsedLegacy });
    for (const [code, count] of Object.entries(c.unknownCodes)) f.note('judge-census-unknown-code', `"${code}" is not one of the seven judge codes but appears ${count} time(s)`, { code, count });

    if (!process.argv.includes('--json')) printCensus(c);
    f.emit();
    process.exit(0);
  }

  if (!cmd || !file || !['check', 'add'].includes(cmd)) {
    console.error('usage: node quality/gates/ledger.mjs check|add|list|not|judged|unjudged|census [films/x/video.json | theme]');
    process.exit(1);
  }

  const rel = path.relative(ROOT, path.resolve(ROOT, file));
  const data = JSON.parse(fs.readFileSync(path.resolve(ROOT, file), 'utf8'));
  const fp = fingerprint(data);
  const entries = load();

  if (cmd === 'check') {
    const f = gateFindings();
    for (const e of entries) {
      if (e.file === rel) continue; // re-checking a shipped file against itself is meaningless
      const sameBrand = e.theme === fp.theme;
      const s = similarity(fp, e.fp);
      const v = verdict(s, sameBrand);
      if (v === 'ok' || v === 'distinct') continue;
      const scoreStr = `score ${(s.score * 100).toFixed(0)}% · vocab ${(s.vocab * 100).toFixed(0)}% · structure ${(s.struct * 100).toFixed(0)}%`;
      const fix = v === 'SAME-SKELETON' ? 'same brand retelling the same beat skeleton, vary the structure'
        : v === 'SAME' ? 'differentiate: change ≥2 of {cut family, beat structure, layout archetype}' : undefined;
      const add = v === 'SAME' ? f.fail : f.warn;
      add.call(f, v.toLowerCase(), `vs ${e.file}${sameBrand ? ' (same brand)' : ''}, ${scoreStr}`, { at: e.file, fix });
    }
    if (!f.count) console.log(`✓ distinct from all ${entries.length} logged design(s)`);
    f.emit();
    process.exit(f.records.some((r) => r.severity === 'error') ? 1 : 0);
  }

  if (cmd === 'add') {
    // DONE MEANS THE EYE PASSED (taste loop, phase 1+4). The ledger is the design memory of FINISHED
    // work, so a cut is not logged until it has been judged and the verdict is PASS. The judge receipt is
    // hashed to the scene, so a PASS on an older cut reads as stale and does not count: the loop is not
    // done until the eye stops finding fixes against THIS render.
    const jr = readReceipt('judge', file);
    const v = jr.exists ? (jr.receipt && jr.receipt.verdict) : null;
    if (!jr.exists || jr.stale || v !== 'PASS') {
      const why = !jr.exists ? 'this cut has no judge verdict'
        : jr.stale ? 'the judge verdict is for an older cut of this film'
        : `the last judge verdict was ${v || 'not PASS'}`;
      console.error(`✗ ledger-add refused: ${why}. A film is done when the EYE passes, not when it renders.`);
      console.error(`    make judge D=${file}                 # render the key frames, score every one against the rubric`);
      console.error(`    make judge D=${file} --verdict PASS  # once the eye is satisfied (or --verdict FIX, then fix and re-judge)`);
      process.exit(1);
    }
    const next = entries.filter((e) => e.file !== rel);
    next.push({ file: rel, theme: fp.theme, module: data.module, added: new Date().toISOString().slice(0, 10), fp });
    fs.mkdirSync(path.dirname(LEDGER), { recursive: true });
    fs.writeFileSync(LEDGER, JSON.stringify(next, null, 2) + '\n');
    console.log(`✓ logged ${rel} (${fp.theme}): ledger now ${next.length} design(s)`);
  }
}
