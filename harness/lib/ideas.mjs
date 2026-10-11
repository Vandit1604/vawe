// The "Ideas" section of a brief.md (guides/IDEATE.md) as data, and the advice it earns.
// Pure: brief text and the page's authoring block in, advice lines out. Advice only: a ledger is a plan, so nothing here refuses.
import { sectionOf, rowsOf } from './board.mjs';
import { isWaived, waiverHint } from './waivers.mjs';

export const IDEAS_PER_ROW = 4;
export const OVERLAP_MAX = 0.5;
export const MIN_ROWS_FOR_VARIETY = 3;

// Order matters: the first match wins ("literalise" before "literal").
const DEVICES = [
  ['literalise', /literali[sz]e/],
  ['literal', /literal/],
  ['metaphor', /metaphor/],
  ['transformation', /transform|becomes/],
  ['show-the-invisible', /invisible|hidden|show/],
  ['scale-shift', /scale/],
  ['personification', /person/],
  ['part-for-whole', /part|whole/],
  ['reversal', /revers/],
  ['collision', /collid|collision/],
];

const STOP = new Set('the a an of to and or in on at is it its this that for with into as by from then than'.split(' '));
const REASON = /\bbecause\b/i;

/** { device (id or null), name, text, typicality (0 to 1 or null) } of an idea cell "device: the idea, 0.2". */
export function parseIdea(cell) {
  const raw = (cell ?? '').trim();
  const colon = raw.indexOf(':');
  const name = (colon < 0 ? '' : raw.slice(0, colon)).trim();
  const num = /[,(]\s*(0?\.\d+|[01](?:\.0+)?)\s*\)?\s*$/.exec(raw);
  const body = colon < 0 ? '' : raw.slice(colon + 1, num ? num.index : undefined).trim();
  const found = DEVICES.find(([, re]) => re.test(name.toLowerCase()));
  return { device: found ? found[0] : null, name, text: body, typicality: num ? Number(num[1]) : null };
}

// 0-based index of the idea a `chosen` cell names (a number 1 to 4, or a device name), or null.
function chosenIndex(cell, ideas) {
  const n = /^\s*(\d)\b/.exec(cell ?? '');
  if (n) return Number(n[1]) >= 1 && Number(n[1]) <= ideas.length ? Number(n[1]) - 1 : null;
  const d = DEVICES.find(([, re]) => re.test((cell ?? '').toLowerCase()));
  const at = d ? ideas.findIndex((i) => i.device === d[0]) : -1;
  return at < 0 ? null : at;
}

/** The answer rows of the Ideas table as { at, meaning, ideas (parsed, empty cells dropped), chosen (0-based or null), why }; [] when the brief has none. */
export function ideaRows(brief) {
  const section = brief ? sectionOf(brief, 'Ideas') : undefined;
  if (section === undefined) return [];
  return rowsOf(section, 'at').map((c) => {
    const ideas = c.slice(2, 2 + IDEAS_PER_ROW).filter(Boolean).map(parseIdea);
    return { at: (c[0] ?? '').trim().toLowerCase(), meaning: c[1] ?? '', ideas, chosen: chosenIndex(c[2 + IDEAS_PER_ROW], ideas), why: c[3 + IDEAS_PER_ROW] ?? '' };
  });
}

/** False while the Ideas section holds no answer row; null when the brief has no Ideas section. */
export function ideasFilled(brief) {
  if (!brief || sectionOf(brief, 'Ideas') === undefined) return null;
  return ideaRows(brief).length > 0;
}

const words = (text) => new Set((text.toLowerCase().match(/[a-z]{3,}/g) ?? []).filter((w) => !STOP.has(w)));

/** Shared words over all words (0 to 1) of two idea texts. */
export function overlap(a, b) {
  const [x, y] = [words(a), words(b)];
  const shared = [...x].filter((w) => y.has(w)).length;
  const all = new Set([...x, ...y]).size;
  return all ? shared / all : 0;
}

const pairs = (list) => list.flatMap((a, i) => list.slice(i + 1).map((b) => [a, b]));
const chosenOf = (r) => (r.chosen === null ? null : r.ideas[r.chosen]);

function thinProblem(r) {
  if (r.ideas.length < IDEAS_PER_ROW) return `has ${r.ideas.length} ideas; write ${IDEAS_PER_ROW}, each with a different device`;
  const bad = r.ideas.find((i) => !i.device);
  if (bad) return `names the device "${bad.name}", none of the ten in guides/IDEATE.md`;
  const devices = r.ideas.map((i) => i.device);
  if (new Set(devices).size < devices.length) return 'repeats a device; use four different devices';
  if (r.ideas.some((i) => i.typicality === null)) return 'has an idea with no typicality number (0 to 1)';
  return null;
}

function rowFindings(r) {
  const out = [];
  const thin = thinProblem(r);
  if (thin) out.push({ code: 'ideas-thin', at: r.at, text: `row "${r.at}" ${thin}` });
  const same = pairs(r.ideas).find(([a, b]) => overlap(a.text, b.text) >= OVERLAP_MAX);
  if (same) out.push({ code: 'ideas-reworded', at: r.at, text: `row "${r.at}": the ideas "${same[0].text}" and "${same[1].text}" are one idea reworded; write four different ideas` });
  const pick = chosenOf(r);
  if (!pick) return [...out, { code: 'ideas-thin', at: r.at, text: `row "${r.at}" has no chosen idea (a number 1 to ${IDEAS_PER_ROW})` }];
  const top = Math.max(...r.ideas.map((i) => i.typicality ?? 0));
  if (pick.typicality !== null && pick.typicality >= top && !REASON.test(r.why)) {
    out.push({ code: 'ideas-typical', at: r.at, text: `row "${r.at}" picks its most typical idea (${pick.typicality}) with no "because ..." in why; pick a less typical idea or give the reason` });
  }
  return out;
}

function ledgerFindings(rows) {
  const out = [];
  const picks = rows.map((r) => ({ r, pick: chosenOf(r) })).filter((p) => p.pick?.device);
  if (picks.length && picks.every((p) => p.pick.device === 'literal')) {
    out.push({ code: 'ideas-literal', at: null, text: 'every chosen idea is literal; choose a metaphor, a transformation or another device for the beats that carry the film' });
  } else if (picks.length >= MIN_ROWS_FOR_VARIETY) {
    for (const device of new Set(picks.map((p) => p.pick.device))) {
      const n = picks.filter((p) => p.pick.device === device).length;
      if (n > picks.length / 2) out.push({ code: 'ideas-variety', at: null, text: `${device} is chosen on ${n} of ${picks.length} rows; choose from more devices` });
    }
  }
  for (const [a, b] of pairs(picks)) {
    if (overlap(a.pick.text, b.pick.text) >= OVERLAP_MAX) out.push({ code: 'ideas-reworded', at: b.r.at, text: `rows "${a.r.at}" and "${b.r.at}" choose the same idea; give each decision its own` });
  }
  return out;
}

/** Every finding as { code, at (row id or null), text }: missing rows, thin or reworded rows, a typical pick, the ledger as a whole. `worlds` are the page's data-world ids, or null when not known. */
export function ideaFindings(brief, worlds = null) {
  const rows = ideaRows(brief);
  if (!rows.length) return [{ code: 'ideas-missing', at: null, text: 'the "Ideas" ledger has no rows; write one per beat and per cut (guides/IDEATE.md)' }];
  const missing = (worlds ?? []).filter((id) => !rows.some((r) => r.at === id.toLowerCase()));
  return [
    ...missing.map((id) => ({ code: 'ideas-missing', at: id, text: `world ${id} has no row in the "Ideas" ledger` })),
    ...rows.flatMap(rowFindings),
    ...ledgerFindings(rows),
  ];
}

/**
 * The advice lines for a brief, waivers applied, with the waiver hint after the first line of each code. [] for a brief with no Ideas
 * section (an old brief). `authoring` is the page's authoring block (harness/lib/motion-stamp.mjs pageAuthoring).
 */
export function ideasAdvice(brief, authoring = {}) {
  if (ideasFilled(brief ?? '') === null) return [];
  const live = ideaFindings(brief, authoring._worlds ?? null).filter((f) => !isWaived(authoring, f.code, f.at));
  return live.flatMap((f, i) => [`${f.code}: ${f.text}`, ...(live.findIndex((g) => g.code === f.code) === i ? [waiverHint(f.code)] : [])]);
}
