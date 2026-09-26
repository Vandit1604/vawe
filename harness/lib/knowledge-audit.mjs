#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadCraftRules, ROOT } from './craft-rules.mjs';
import { readRuns } from './runlog.mjs';

/** ruleChecks(rules) -> Map<ruleId, checkCode|null>, the join key this whole tool runs on. */
export function ruleChecks(rules) {
  return new Map(rules.map((r) => [r.id, r.check || null]));
}

/**
 * auditFilm(runs, checks) -> { hits, unproven, notJoinable }, over one film's runs (oldest first, the
 * order readRuns already returns).
 *   hits:        a rule dropped `feature-not-matched` whose own check code fired in a LATER run for the
 *                same film. Proof: the film needed the rule and the harness never showed it.
 *   unproven:    dropped, joinable (has a check code), but that code never fired afterward. No evidence
 *                either way, not proof the gate was right.
 *   notJoinable: count of drops whose rule carries `check: null` and so cannot be judged this way.
 */
export function auditFilm(runs, checks) {
  const hits = [];
  const unproven = [];
  let notJoinable = 0;
  runs.forEach((run, i) => {
    if (!run.knowledge) return;
    const later = runs.slice(i + 1);
    for (const d of run.knowledge.dropped || []) {
      if (d.reason !== 'feature-not-matched') continue;
      const code = checks.get(d.id);
      if (!code) { notJoinable++; continue; }
      const provenRun = later.find((r) => (r.checks || []).some((c) => (c.codes || []).includes(code)));
      const entry = { ruleId: d.id, category: d.category, stage: run.knowledge.stage, droppedAt: run.at, code };
      if (provenRun) hits.push({ ...entry, provenAt: provenRun.at, provenCmd: provenRun.cmd });
      else unproven.push(entry);
    }
  });
  return { hits, unproven, notJoinable };
}

/** auditAllFilms({root}) -> { perFilm: Map<film, result>, totals, ruleCount, conditionalCount,
 * joinableCount }, scanning every out/<film>.runs.jsonl this checkout has produced. */
export function auditAllFilms({ root = ROOT } = {}) {
  const dir = path.join(root, 'out');
  const files = fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => f.endsWith('.runs.jsonl')) : [];
  const rules = loadCraftRules({ root });
  const checks = ruleChecks(rules);
  const perFilm = new Map();
  const totals = { films: 0, filmsWithKnowledge: 0, drops: 0, notJoinable: 0, hits: 0, unproven: 0 };
  for (const f of files) {
    const film = f.slice(0, -'.runs.jsonl'.length);
    const runs = readRuns(film);
    const result = auditFilm(runs, checks);
    perFilm.set(film, result);
    totals.films++;
    if (runs.some((r) => r.knowledge)) totals.filmsWithKnowledge++;
    totals.drops += result.hits.length + result.unproven.length + result.notJoinable;
    totals.notJoinable += result.notJoinable;
    totals.hits += result.hits.length;
    totals.unproven += result.unproven.length;
  }
  const conditional = rules.filter((r) => r.applies !== 'always');
  return {
    perFilm, totals, ruleCount: rules.length,
    conditionalCount: conditional.length,
    joinableCount: conditional.filter((r) => r.check).length,
  };
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const { perFilm, totals, ruleCount, conditionalCount, joinableCount } = auditAllFilms();
  console.log(`craft rules: ${ruleCount} total, ${conditionalCount} conditionally gated, `
    + `${joinableCount} of those carry a check code (joinable to a finding).`);
  console.log(`run-log history: ${totals.films} film(s) scanned, ${totals.filmsWithKnowledge} `
    + `carrying at least one stage-say knowledge receipt.`);
  if (!totals.drops) {
    console.log('\nno feature-not-matched drops logged yet: nothing to join. The receipt (c1771ef7) is '
      + 'new; run `make dev`/`make next` on a live film to grow real history, then run this again.');
    process.exit(0);
  }
  console.log(`\ndrops tagged feature-not-matched: ${totals.drops} total`);
  console.log(`  not joinable (check: null):        ${totals.notJoinable}`);
  console.log(`  PROVEN (film later hit the code):  ${totals.hits}`);
  console.log(`  unproven (joinable, silent since):  ${totals.unproven}`);
  for (const [film, r] of perFilm) {
    if (!r.hits.length) continue;
    console.log(`\n${film}:`);
    for (const h of r.hits) {
      console.log(`  rule ${h.ruleId} withheld at stage ${h.stage} (feature-not-matched, ${h.droppedAt}), `
        + `then the film hit [${h.code}] at ${h.provenAt} via \`make ${h.provenCmd}\`. `
        + `Routing failed: the author needed this rule and was never shown it.`);
    }
  }
}
