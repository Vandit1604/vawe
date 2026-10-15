// Turn one run (and optionally an earlier run) into a short markdown report.
import { CHANNELS } from './channels.mjs';

const label = (c) => CHANNELS[c]?.label || c;
const topKeys = (results, n) => results.slice(0, n).map((r) => r.key).join(', ') || '(none)';

function ourRank(entry) {
  const hit = entry?.results.find((r) => r.ours);
  return hit ? hit.rank : null;
}

function channelRow(name, perQuery, prevPerQuery) {
  const qs = Object.keys(perQuery);
  const ranks = qs.map((q) => ourRank(perQuery[q])).filter((r) => r !== null);
  const failed = qs.filter((q) => perQuery[q].error && !perQuery[q].results.length).length;
  const empty = qs.filter((q) => !perQuery[q].results.length).length;
  const prevHits = prevPerQuery ? Object.values(prevPerQuery).filter((e) => ourRank(e) !== null).length : null;
  const delta = prevHits === null ? '' : ` (was ${prevHits})`;
  const best = ranks.length ? Math.min(...ranks) : '-';
  return `| ${label(name)} | ${qs.length} | ${failed} | ${empty} | ${ranks.length}${delta} | ${best} |`;
}

function winnerTable(data, name) {
  const counts = new Map();
  for (const e of Object.values(data.channels[name])) {
    for (const r of e.results.slice(0, 5)) counts.set(r.key, (counts.get(r.key) || 0) + 1);
  }
  const top = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10);
  return [`### ${label(name)}: most frequent in the top 5`, '', '| key | queries |', '|---|---|', ...top.map(([k, n]) => `| ${k} | ${n} |`), ''];
}

export function renderReport(data, prev) {
  const names = Object.keys(data.channels);
  const L = [`# Discovery report ${data.date}`, '', `${data.queries.length} generic queries, no product name. A rank is the position of vawe in that channel's results; "-" means absent.`, ''];
  L.push('| channel | queries | failed | empty | queries with vawe | best rank |', '|---|---|---|---|---|---|');
  for (const n of names) L.push(channelRow(n, data.channels[n], prev?.channels?.[n]));
  L.push('', '## Per query', '', `| query | ${names.map(label).join(' | ')} | top 3 on first channel |`, `|---|${names.map(() => '---').join('|')}|---|`);
  for (const q of data.queries) {
    const cells = names.map((n) => ourRank(data.channels[n][q]) ?? '-');
    L.push(`| ${q} | ${cells.join(' | ')} | ${topKeys(data.channels[names[0]][q].results, 3)} |`);
  }
  L.push('', '## Winners', '');
  for (const n of names) L.push(...winnerTable(data, n));
  return L.join('\n') + '\n';
}
