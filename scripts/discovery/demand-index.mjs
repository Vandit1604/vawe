// The demand index: pure math over what demand.mjs collected. No network here.
//
// Every component is 0 to 100. A missing component (source blocked or skipped) is left out and the
// remaining weights are rescaled, so a blocked source lowers confidence, not the score.
//
//   people demand = google 0.40, youtube 0.20, stackoverflow 0.20, hackernews 0.20
//   agent demand  = skills 0.40, github 0.40, context7 0.20
//   index         = 0.6 * people + 0.4 * agent
export const PEOPLE_WEIGHTS = { google: 0.4, youtube: 0.2, stackoverflow: 0.2, hackernews: 0.2 };
export const AGENT_WEIGHTS = { skills: 0.4, github: 0.4, context7: 0.2 };
export const SPLIT = { people: 0.6, agent: 0.4 };

const PREFIX_FACTOR = { 1: 1, 2: 0.85, 3: 0.7 };
const AC_WEIGHTS = { exact: 0.5, prefix: 0.3, tail: 0.2 };

const clamp = (n) => Math.max(0, Math.min(100, n));

// 100 at 10^capExp, 0 at 0, on a log scale.
export const logScore = (n, capExp) => (n == null ? null : clamp((100 * Math.log10(1 + n)) / capExp));

const mean = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
const positionScore = (pos) => (pos ? clamp(100 - 10 * (pos - 1)) : 0);

// Where a phrase sits in the autocomplete list of the phrase and of each prefix of 1 to 3 words.
export function positionIn(list, phrase) {
  const i = list.findIndex((s) => s.toLowerCase().trim() === phrase.toLowerCase().trim());
  return i < 0 ? null : i + 1;
}

// ac = { exact: position of the phrase in its own list or null, prefixes: { 1: pos|null, 2: ..., 3: ... }, tail: expansions of "phrase " }
export function autocompleteScore(ac) {
  if (!ac) return null;
  const exact = positionScore(ac.exact);
  const prefix = Math.max(0, ...Object.entries(ac.prefixes || {}).map(([k, pos]) => positionScore(pos) * (PREFIX_FACTOR[k] ?? 0)));
  const tail = clamp((ac.tail || 0) * 10);
  return AC_WEIGHTS.exact * exact + AC_WEIGHTS.prefix * prefix + AC_WEIGHTS.tail * tail;
}

// Stack Overflow and Hacker News: half the all-time count (full score at 10^4), half the last 12 months (full score at 10^3).
export function countsScore(c) {
  if (!c) return null;
  const parts = [logScore(c.total, 4), logScore(c.recent, 3)].filter((x) => x !== null);
  return mean(parts);
}

// Highest install count among the skills that answer the phrase; full score at 10^6.
export const skillsScore = (s) => (s ? logScore(Math.max(0, ...s.installs), 6) : null);

// Repository search total; full score at 10^5.
export const githubScore = (g) => (g ? logScore(g.total, 5) : null);

// Mean trust score (0 to 10) of the top three library hits. A weak signal: the hit may not be on topic.
export const context7Score = (c) => (c && c.trust.length ? clamp(10 * mean(c.trust.slice(0, 3))) : null);

export function weighted(parts, weights) {
  let sum = 0;
  let wsum = 0;
  for (const [k, w] of Object.entries(weights)) {
    if (parts[k] == null) continue;
    sum += parts[k] * w;
    wsum += w;
  }
  return wsum ? sum / wsum : null;
}

// raw = { google, youtube, stackoverflow, hackernews, skills, github, context7 } as collected, each possibly null.
export function scorePhrase(raw) {
  const components = {
    google: autocompleteScore(raw.google),
    youtube: autocompleteScore(raw.youtube),
    stackoverflow: countsScore(raw.stackoverflow),
    hackernews: countsScore(raw.hackernews),
    skills: skillsScore(raw.skills),
    github: githubScore(raw.github),
    context7: context7Score(raw.context7),
  };
  const people = weighted(components, PEOPLE_WEIGHTS);
  const agent = weighted(components, AGENT_WEIGHTS);
  const index = weighted({ people, agent }, SPLIT);
  return { components, people, agent, index };
}

const r1 = (n) => (n == null ? '-' : n.toFixed(0));
const fmt = (n) => (n == null ? '-' : n >= 1e6 ? `${(n / 1e6).toFixed(1)}M` : n >= 1e3 ? `${(n / 1e3).toFixed(1)}k` : String(n));

const HEAD = '| phrase | cluster | index | people | agent | google | youtube | SO | HN | skills | GitHub | C7 |';
const SEP = '|---|---|---|---|---|---|---|---|---|---|---|---|';

function row(p) {
  const c = p.components;
  return `| ${p.phrase} | ${p.cluster} | ${r1(p.index)} | ${r1(p.people)} | ${r1(p.agent)} | ${r1(c.google)} | ${r1(c.youtube)} | ${r1(c.stackoverflow)} | ${r1(c.hackernews)} | ${r1(c.skills)} | ${r1(c.github)} | ${r1(c.context7)} |`;
}

const byIndex = (a, b) => (b.index ?? -1) - (a.index ?? -1) || a.cluster.localeCompare(b.cluster) || a.phrase.localeCompare(b.phrase);

export function renderDemandReport(data) {
  const phrases = data.phrases.map((p) => ({ ...p, ...scorePhrase(p.raw) })).sort(byIndex);
  const L = [`# Demand index ${data.date}`, ''];
  L.push(`${phrases.length} phrases. Every component is 0 to 100. Index = ${SPLIT.people} x people + ${SPLIT.agent} x agent. A blocked source is left out and the weights of the rest are rescaled.`, '');
  L.push('| sub-score | component | weight | scale |', '|---|---|---|---|');
  L.push('| people | google (autocomplete) | 0.40 | 50% the phrase in its own list, 30% best prefix of 1 to 3 words (x1, x0.85, x0.7), 20% expansions of "phrase " (10 = full); each position costs 10 points |');
  L.push('| people | youtube (autocomplete) | 0.20 | same as google |');
  L.push('| people | SO (Stack Overflow) | 0.20 | half all-time total (full at 10^4), half asked in 12 months (full at 10^3), log scale |');
  L.push('| people | HN (Hacker News) | 0.20 | same as SO |');
  L.push('| agent | skills (skills.sh) | 0.40 | top install count among the hits, log scale, full at 10^6 |');
  L.push('| agent | GitHub | 0.40 | repository search total, log scale, full at 10^5 |');
  L.push('| agent | C7 (Context7) | 0.20 | 10 x mean trust score of the top 3 library hits (weak: the hit may be off topic) |', '');
  L.push('Sources: ' + Object.entries(data.sources).map(([k, v]) => `${k} ${v}`).join('; '), '');
  L.push('## All phrases by index', '', HEAD, SEP, ...phrases.map(row), '');
  const clusters = [...new Set(phrases.map((p) => p.cluster))].sort();
  L.push('## By cluster', '');
  for (const c of clusters) L.push(`### ${c}`, '', HEAD, SEP, ...phrases.filter((p) => p.cluster === c).map(row), '');
  L.push('## npm weekly downloads (context, not in the index)', '', '| package | downloads |', '|---|---|');
  for (const [pkg, n] of Object.entries(data.npm).sort((a, b) => (b[1] ?? 0) - (a[1] ?? 0))) L.push(`| ${pkg} | ${n == null ? '-' : fmt(n)} |`);
  L.push('');
  return L.join('\n');
}
