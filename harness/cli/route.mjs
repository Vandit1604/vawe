// `vawe new` without --from: the film type from the request words and the length. The templates come
// from the table in guides/ROUTING.md; this file holds only the words that point at a row.
import fs from 'node:fs';
import path from 'node:path';

export const ROUTING = 'guides/ROUTING.md';
export const FALLBACK = 'sting';

// ROUTING.md: a sting is under 10 s, a long form over 60 s.
const STING_MAX_S = 10;
const LONG_MIN_S = 60;

// A brand launch films a real site with real captures: it needs a URL, and an invented product has none.
const URL_WORDS = /(https?:\/\/|\bwww\.|\b[a-z0-9-]+\.(?:com|io|ai|app|dev|co|net|org|so)\b)/;
const INVENTED_WORDS = /\b(invented|fictional|fictitious|imaginary|made[- ]up|fake|hypothetical|placeholder)\b/;

const WORDS = [
  ['reference rebuild', /\b(recreat\w*|rebuild|remake|reference)\b/],
  ['sting', /\b(sting|bumper|ident|logo reveal|intro|outro|title card|lower third|motion graphic|stat hit|teaser)\b/],
  ['long form', /\b(long form|long-form|chapters?|documentary)\b/],
  ['music video', /\b(music video|song|drop|beat synced|beat-synced)\b/],
  ['UI morph', /\b(morph|ui loop)\b/],
  ['story or explainer', /\b(explain\w*|story|article|tutorial|how it works)\b/],
  ['app or game capture', /\b(game|lab|interactive|simulation)\b/],
  ['showreel', /\b(showreel|reel|taste probe)\b/],
  ['brand launch', /\b(launch|promo|product|saas|landing page|website|site|url|ai demo|product demo|demo video|feature tour|walkthrough|proof film|case study)\b/],
];

// RECIPES.md "Complete videos": one chain per 20 to 30 s film, found by its heading number.
export const RECIPES = 'prompts/moves/RECIPES.md';
const RECIPE_MIN_S = 20;
const RECIPE_MAX_S = 30;
const RECIPE_WORDS = [
  [13, /\b(manifesto|kinetic type|kinetic typography|typographic)\b/],
  [12, /\b(proof|testimonials?|case study|results|metrics)\b/],
  [11, /\b(feature tour|tour|walkthrough|walk-through|features)\b/],
  [10, /\b(ai|agent|assistant|copilot|chatbot|llm)\b/],
  [14, /\b(brand reveal|reveal|rebrand|brand film|identity)\b/],
  [9, /\b(problem|pain|before and after|launch)\b/],
];

/** { number: heading } from the RECIPES.md chain headings ("## 10. AI product demo, 22 s (thread: ...)"). */
export function recipeTable(markdown) {
  const rows = {};
  for (const m of markdown.matchAll(/^## (\d+)\. (.+)$/gm)) rows[m[1]] = `${m[1]}. ${m[2]}`;
  return rows;
}

/** The chain a 20 to 30 s request starts from: { heading, why }, or null. Throws when RECIPES.md lacks the row. */
export function pickRecipe({ request = '', name = '', title = '', length } = {}, recipes) {
  if (!(length >= RECIPE_MIN_S && length <= RECIPE_MAX_S)) return null;
  const text = [request, name.replace(/-/g, ' '), title].join(' ').toLowerCase();
  for (const [n, re] of RECIPE_WORDS) {
    const m = re.exec(text);
    if (!m) continue;
    if (!recipes[n]) throw new Error(`${RECIPES} has no "## ${n}." chain; chains: ${Object.keys(recipes).join(', ')}`);
    return { heading: recipes[n], why: `${length} s and the request says "${m[0]}"` };
  }
  return null;
}

/** The RECIPES.md chain headings read from the repo at `root`. */
export function readRecipes(root) {
  return recipeTable(fs.readFileSync(path.join(root, RECIPES), 'utf8'));
}

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
    if (!m) continue;
    if (type === 'brand launch' && INVENTED_WORDS.test(text) && !URL_WORDS.test(text)) return { type: FALLBACK, why: 'the product is invented and has no URL to capture, so the beat sheet, with the launch chain for the beats' };
    return { type, why: `the request says "${m[0]}"` };
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
