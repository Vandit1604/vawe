// Reads out/<film>.runs.jsonl records, new and old, into tables. Pure: no I/O, no clock (`now` is passed in).
// Old records (before harness/lib/run-events.mjs) hold `render` for a draft or final and `judge` for a verdict.
import { namedAgent } from './runlog.mjs';

const DAY_MS = 86_400_000;
const WINDOW_DAYS = 30;
const MAX_LINES = 40;
const PASS_AT = 8;

const agentName = (agent) => { const name = namedAgent(agent); return name && !/^\d+$/.test(name) ? name : null; };

const median = (xs) => {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  return s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2;
};
const num = (x, digits = 1) => (x == null ? '-' : String(Number(x.toFixed(digits))));
const sum = (scores) => {
  const v = Object.values(scores ?? {}).filter(Number.isFinite);
  return v.length > 1 ? v.reduce((a, b) => a + b, 0) : null;
};

/** An old record in the new event shape: `render` was a draft or a final, `judge` a verdict. */
function fromOld(r) {
  if (r.render) return { cmd: /-draft/.test(r.render.file ?? '') ? 'dev' : 'ship', seconds: r.render.ms != null ? r.render.ms / 1000 : null };
  if (!r.judge) return {};
  const struct = r.cmd === 'judge-struct';
  return { cmd: 'judge', stage: struct ? 'struct' : 'manual', verdict: r.judge.verdict ?? null, scores: r.judge.overall != null ? { overall: r.judge.overall } : null };
}

/** One record of either age as { at, cmd, agent, model, seconds, green, measured, stage, verdict, scores, total }. */
export function normalize(r) {
  const e = { ...r, ...fromOld(r) };
  return {
    at: e.at, cmd: e.cmd, agent: agentName(e.agent), model: e.model ?? null,
    seconds: e.wallS ?? e.renderS ?? e.seconds ?? null,
    green: e.acceptance?.green ?? null, measured: e.acceptance?.measured ?? null,
    stage: e.stage ?? null, verdict: e.verdict ?? null, scores: e.scores ?? null, total: sum(e.scores),
  };
}

const isDraft = (e) => e.cmd === 'dev' && e.seconds != null;
const isRound = (e) => e.cmd === 'judge' && e.stage !== 'stills' && (e.verdict === 'PASS' || e.verdict === 'FIX');

/** { drafts, medianDraftS, rounds, passed, firstTotal, bestTotal } of one film's normalized events, oldest first. */
export function filmStats(events) {
  const drafts = events.filter(isDraft);
  const rounds = events.filter(isRound);
  const passAt = rounds.findIndex((e) => e.verdict === 'PASS');
  const totals = events.filter((e) => e.cmd === 'judge' && e.stage !== 'stills' && e.total != null).map((e) => e.total);
  return {
    drafts: drafts.length, medianDraftS: median(drafts.map((e) => e.seconds)),
    roundsToPass: passAt < 0 ? null : passAt + 1, passed: passAt >= 0,
    firstTotal: totals[0] ?? null, bestTotal: totals.length ? Math.max(...totals) : null,
  };
}

const lowAxes = (scores) => Object.entries(scores ?? {}).filter(([, v]) => v < PASS_AT).map(([k, v]) => `${k} ${v}`).join(', ');

function judgeCell(e) {
  if (e.cmd === 'ship') return e.verdict ?? '-';
  if (e.cmd === 'judge') {
    const low = lowAxes(e.scores);
    return [e.verdict, e.total != null ? `total ${e.total}` : null, low ? `(${low})` : null, e.stage ? `[${e.stage}]` : null].filter(Boolean).join(' ');
  }
  return '-';
}

const pad = (rows, widths) => rows.map((r) => r.map((c, i) => (i === widths.length ? c : String(c).padEnd(widths[i]))).join('  ').trimEnd());
const table = (rows) => pad(rows, rows[0].slice(0, -1).map((_, i) => Math.max(...rows.map((r) => String(r[i]).length))));

/** The lines of `vawe runs <film>`: one row per event in time order, then one summary line. */
export function filmLines(film, records) {
  const events = records.map(normalize).sort((a, b) => String(a.at).localeCompare(String(b.at)));
  if (!events.length) return [`${film}: no runs logged`];
  const rows = [['time', 'cmd', 'agent', 'secs', 'accept', 'judge'], ...events.map((e) => [
    String(e.at).slice(5, 16).replace('T', ' '), e.cmd ?? '?', e.agent ?? '-', num(e.seconds),
    e.green != null ? `${e.green}/${e.measured}` : '-', judgeCell(e),
  ])];
  const s = filmStats(events);
  const pass = s.passed ? `PASS after ${s.roundsToPass} judge round${s.roundsToPass > 1 ? 's' : ''}` : 'no PASS yet';
  return [...table(rows), `drafts ${s.drafts} · median draft ${num(s.medianDraftS)} s · ${pass} · first judged total ${num(s.firstTotal, 0)}`];
}

/** One row per film with an event in the last 30 days: stats plus who ran it (model, else agent name), newest first. */
export function allRows(films, now) {
  const since = now - WINDOW_DAYS * DAY_MS;
  return films.map(({ film, runs }) => {
    const events = runs.map(normalize).filter((e) => Date.parse(e.at) >= since).sort((a, b) => String(a.at).localeCompare(String(b.at)));
    const who = events.findLast((e) => e.model) ?? events.findLast((e) => e.agent);
    return events.length ? { film, last: events.at(-1).at, ...filmStats(events), model: who?.model ?? null, agent: who?.model ? null : who?.agent ?? null } : null;
  }).filter(Boolean).sort((a, b) => b.last.localeCompare(a.last));
}

/** Pooled medians for the films that name a model: [{ model, films, medianDrafts, medianDraftS, medianFirstTotal, passed }]. */
export function modelRows(rows) {
  const models = [...new Set(rows.map((r) => r.model).filter(Boolean))].sort();
  return models.map((model) => {
    const mine = rows.filter((r) => r.model === model);
    return {
      model, films: mine.length, medianDrafts: median(mine.map((r) => r.drafts)),
      medianDraftS: median(mine.filter((r) => r.medianDraftS != null).map((r) => r.medianDraftS)),
      medianFirstTotal: median(mine.filter((r) => r.firstTotal != null).map((r) => r.firstTotal)),
      passed: mine.filter((r) => r.passed).length,
    };
  });
}

/** The lines of `vawe runs --all`: at most 40, plain text. */
export function allLines(rows, models) {
  if (!rows.length) return ['no films with runs in the last 30 days'];
  const modelBlock = models.length ? ['', ...table([['model', 'films', 'med drafts', 'med draft s', 'med first total', 'passed'],
    ...models.map((m) => [m.model, m.films, num(m.medianDrafts), num(m.medianDraftS), num(m.medianFirstTotal, 0), `${m.passed}/${m.films}`])])] : [];
  const room = MAX_LINES - 1 - modelBlock.length - 1;
  const shown = rows.length > room ? rows.slice(0, room - 1) : rows;
  const body = table([['film', 'drafts', 'med draft s', 'first total', 'best total', 'PASS', 'agent/model'],
    ...shown.map((r) => [r.film, r.drafts, num(r.medianDraftS), num(r.firstTotal, 0), num(r.bestTotal, 0), r.passed ? 'yes' : 'no', r.model ?? r.agent ?? '-'])]);
  const more = rows.length > shown.length ? [`... ${rows.length - shown.length} more films (use --json)`] : [];
  return [...body, ...more, ...modelBlock];
}
