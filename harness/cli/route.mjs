// `vawe new` without --from: the film type from the request words and the length. The templates come
// from the table in engine-doctrine/CRAFT/ROUTING.md; this file holds only the words that point at a row.
import fs from 'node:fs';
import path from 'node:path';

export const ROUTING = 'engine-doctrine/CRAFT/ROUTING.md';
export const FALLBACK = 'sting';

// ROUTING.md: a sting is under 10 s, a long form over 60 s.
const STING_MAX_S = 10;
const LONG_MIN_S = 60;

const WORDS = [
  ['reference rebuild', /\b(recreat\w*|rebuild|remake|reference)\b/],
  ['sting', /\b(sting|bumper|ident|logo reveal|intro|outro|title card|lower third|motion graphic|stat hit|teaser)\b/],
  ['long form', /\b(long form|long-form|chapters?|documentary)\b/],
  ['music video', /\b(music video|song|drop|beat synced|beat-synced)\b/],
  ['UI morph', /\b(morph|ui loop)\b/],
  ['story or explainer', /\b(explain\w*|story|article|tutorial|how it works)\b/],
  ['app or game capture', /\b(game|lab|interactive|simulation)\b/],
  ['showreel', /\b(showreel|reel|taste probe)\b/],
  ['brand launch', /(https?:\/\/|\bwww\.|\b(launch|promo|product|saas|landing page|website|site)\b)/],
];

/** { type: template } from the ROUTING.md film-type table. */
export function routingTable(markdown) {
  const rows = {};
  for (const line of markdown.split('\n')) {
    const cells = line.split('|').map((c) => c.trim());
    if (!/^\d+$/.test(cells[1] || '')) continue;
    const template = /`([^`]+\.md)`/.exec(cells[4] || '');
    if (template) rows[cells[2]] = `prompts/${template[1]}`;
  }
  return rows;
}

function typeFor(text, length) {
  if (WORDS[0][1].test(text)) return { type: WORDS[0][0], why: 'the request names a reference' };
  if (length !== undefined && length <= STING_MAX_S) return { type: 'sting', why: `${length} s is ${STING_MAX_S} s or less` };
  if (length !== undefined && length > LONG_MIN_S) return { type: 'long form', why: `${length} s is over ${LONG_MIN_S} s` };
  for (const [type, re] of WORDS.slice(1)) {
    const m = re.exec(text);
    if (m) return { type, why: `the request says "${m[0]}"` };
  }
  return null;
}

/**
 * The template for a request: { template, type, why, known }. `known` is false when no word or length
 * matched and the motion-graphic row (a sting) was taken. Throws when ROUTING.md lacks the row.
 */
export function pickTemplate({ request = '', name = '', title = '', length } = {}, table) {
  const text = [request, name.replace(/-/g, ' '), title].join(' ').toLowerCase();
  const hit = typeFor(text, length);
  const { type, why } = hit || { type: FALLBACK, why: 'no word or length named a film type, so the motion-graphic row' };
  const template = table[type];
  if (!template) throw new Error(`${ROUTING} has no "${type}" row; rows: ${Object.keys(table).join(', ')}`);
  return { template, type, why, known: Boolean(hit) };
}

/** The routing table read from the repo at `root`. */
export function readRouting(root) {
  return routingTable(fs.readFileSync(path.join(root, ROUTING), 'utf8'));
}
