// The brief's Look lines (ground, ink, accent, typeface) written from the page. The page declares the colours as
// :root custom properties and shows the face on its largest text; a Look line still marked as a guess or as
// written from the page is replaced when it disagrees. A line the author wrote is never touched. Pure.
import { GUESS } from './measured-brief.mjs';

export const FROM_PAGE = '(from the page)';

const ROLES = { ground: /^(ground|bg|background)$/, ink: /^(ink|fg|foreground|text)$/, accent: /^accent$/ };
const COLOUR = /^(#[0-9a-f]{3,8}|(?:rgba?|hsla?|oklch|oklab|hwb|lab|lch)\([^)]*\))/i;

function rootProperties(pageText) {
  const props = {};
  for (const block of pageText.matchAll(/:root\s*\{([^}]*)\}/g)) {
    const body = block[1].replace(/\/\*[\s\S]*?\*\//g, '');
    for (const m of body.matchAll(/--([\w-]+)\s*:\s*([^;]+);?/g)) props[m[1]] = m[2].trim();
  }
  return props;
}

/** { ground, ink, accent, typeface } the page declares; a field the page does not declare is absent. `largest` is { family, weight } of the largest text. */
export function pageLook(pageText, largest = null) {
  const props = rootProperties(pageText);
  const look = {};
  for (const [role, names] of Object.entries(ROLES)) {
    const name = Object.keys(props).find((n) => names.test(n));
    const colour = name && COLOUR.exec(props[name]);
    if (colour) look[role] = colour[1].toLowerCase();
  }
  const family = largest?.family ?? /@font-face\s*\{[^}]*font-family:\s*["']?([^"';}]+)/.exec(pageText)?.[1].trim();
  if (family) look.typeface = largest?.weight ? `${family}, weight ${largest.weight}` : family;
  return look;
}

/** The first family of a computed font-family list, without quotes. */
export const firstFamily = (list) => String(list).split(',')[0].replace(/["']/g, '').trim();

const ours = (text) => text.endsWith(GUESS) || text.endsWith(FROM_PAGE);
const agrees = (text, value) => text.toLowerCase().startsWith(value.toLowerCase());

/** { text, written }: the brief with each Look line that is still a guess (or came from the page) and disagrees with the page rewritten; `written` names the fields. */
export function writeLook(briefText, look) {
  const written = [];
  const lines = briefText.split('\n').map((line) => {
    const m = /^- (ground|ink|accent|typeface): (.*)$/.exec(line);
    if (!m || look[m[1]] === undefined || !ours(m[2]) || (m[2].endsWith(GUESS) && agrees(m[2], look[m[1]]))) return line;
    if (m[2] === `${look[m[1]]} ${FROM_PAGE}`) return line;
    written.push(m[1]);
    return `- ${m[1]}: ${look[m[1]]} ${FROM_PAGE}`;
  });
  return { text: lines.join('\n'), written };
}
