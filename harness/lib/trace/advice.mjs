import { allowOf } from './calls.mjs';
import { splitWaiver } from '../waivers.mjs';

const IGNORED_DRAFTS = 3;

const ruleOf = (entry) => splitWaiver(entry).code;
const adviceKey = (text) => (/^frame \d/.test(text) ? 'blank frame' : text);
const roundAt = (notes, ms) => 1 + notes.filter((n) => n.ms <= ms).length;

function allowHistory(calls) {
  const added = new Map();
  const entries = new Set();
  for (const call of calls) {
    for (const w of call.writes.filter((x) => x.what === 'page')) {
      const allow = allowOf(w.text);
      if (!allow) continue;
      allow.map(ruleOf).filter((id) => !added.has(id)).forEach((id) => added.set(id, call.ms));
      allow.forEach((e) => entries.add(e));
    }
  }
  return { added, entries };
}

function findings(drafts) {
  const found = new Map();
  drafts.forEach(({ ms, rules, advice }, i) => {
    const items = [...rules.map((r) => ({ kind: 'rule', id: r.id, token: r.token })), ...advice.filter((a) => !a.startsWith('rule ')).map((a) => ({ kind: 'advice', id: adviceKey(a), token: null }))];
    for (const { kind, id, token } of items) {
      const f = found.get(`${kind}:${id}`) ?? { kind, id, tokens: new Set(), firstMs: ms, drafts: [] };
      if (token) f.tokens.add(token);
      if (!f.drafts.includes(i)) f.drafts.push(i);
      found.set(`${kind}:${id}`, f);
    }
  });
  return [...found.values()];
}

function outcomeOf(f, lastDraft, waivedMs) {
  if (waivedMs !== null) return 'waived';
  if (f.drafts.at(-1) !== lastDraft) return 'fixed';
  return f.drafts.length >= IGNORED_DRAFTS ? 'ignored' : 'open';
}

const RUN_START_SLACK_MS = 5000;
const isDev = (c) => c.verbs.some((v) => v.verb === 'dev' && !v.help);

function printedDrafts(calls) {
  return calls.filter((c) => c.advice && isDev(c)).map((c) => ({ ms: c.ms, ...c.advice }));
}

function loggedDrafts(calls, runs) {
  const devCalls = calls.filter(isDev);
  return runs.filter((r) => !r.failed).map((run) => {
    const at = Date.parse(run.at);
    const call = devCalls.findLast((c) => c.ms - RUN_START_SLACK_MS <= at);
    return { ms: call?.ms ?? at, advice: call?.advice?.advice ?? [], rules: (run.rules_fired ?? []).map((f) => ({ id: f.id, token: null })) };
  }).sort((a, b) => a.ms - b.ms);
}

/** Each rule and advice key the dev runs fired: fixed, ignored (in the last draft and in 3 or more drafts), waived (in the page allow block), or open. A draft is one dev run-log row, else one dev call with printed lines. Pure. */
export function adviceOutcomes(calls, notes, runLog = []) {
  const runs = runLog.filter((r) => r.cmd === 'dev');
  const drafts = runs.length ? loggedDrafts(calls, runs) : printedDrafts(calls);
  const { added, entries } = allowHistory(calls);
  const items = findings(drafts).map((f) => {
    const waivedMs = [f.id, ...f.tokens].map((id) => added.get(id)).find((ms) => ms !== undefined) ?? null;
    return {
      kind: f.kind, id: f.id, firstDraft: f.drafts[0] + 1, drafts: f.drafts.length,
      outcome: outcomeOf(f, drafts.length - 1, waivedMs),
      waivedSameRound: waivedMs !== null && roundAt(notes, waivedMs) === roundAt(notes, f.firstMs),
    };
  });
  return { drafts: drafts.length, items, waived: items.filter((i) => i.outcome === 'waived').length, waivedEntries: entries.size };
}
