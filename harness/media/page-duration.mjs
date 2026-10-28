// harness/media/page-duration.mjs: the one owner of a page's length. <meta name="duration"> is a number of seconds, or "auto":
// the last move's end plus a hold. Every reader asks resolveDuration; none parses the meta itself.
import fs from 'node:fs';
import path from 'node:path';
import { metaOf } from '../lib/page-meta.mjs';
import { HOLD_RULE, lineNeed } from '../lib/read-hold.mjs';

// A draft renders at 30 fps and a final at 60: a length on the 1/30 s grid is a whole number of frames in both.
const GRID_FPS = 30;

export class DurationError extends Error {}

/** The page's own length text: a number of seconds, 'auto', or null when the page has none. Pure. */
export function statedLength(html) {
  const text = metaOf(html, 'duration')?.trim();
  if (text == null) return null;
  return text === 'auto' ? 'auto' : Number(text);
}

/** Auto length from the last move's end, the read time of the longest line of the last world, and a floor hold. Pure. */
export function autoLength({ endS, lastWorldWords }) {
  const holdS = Math.max(HOLD_RULE.floor, ...lastWorldWords.map(lineNeed));
  const seconds = Math.ceil((endS + holdS) * GRID_FPS - 1e-6) / GRID_FPS;
  return { seconds, endS, holdS };
}

// Runs in the page: the end of the last finite animation, and the word count of each text leaf in the last world.
function readPageEnd() {
  const { endS, infinite } = window.vawe.animationEnd();
  const world = [...document.querySelectorAll('[data-world]')].at(-1);
  const leaves = world ? [...world.querySelectorAll('*')].filter((el) => !el.closest('[aria-hidden="true"]') && !el.children.length && el.textContent.trim()) : [];
  return { endS, infinite, lastWorldWords: leaves.map((el) => el.textContent.split(/\s+/).filter(Boolean).length) };
}

/**
 * { seconds, auto, endS?, holdS?, ignoredInfinite? } of a loaded, settled page (openPage, then settle). A stated number is returned as written.
 * Throws DurationError for an auto page with no finite animation: it drives time through window.seek alone, so only a number can say its length.
 */
export async function lengthOfOpenPage(page, pagePath) {
  const stated = statedLength(fs.readFileSync(pagePath, 'utf8'));
  if (typeof stated === 'number') return { seconds: stated || 0, auto: false };
  const read = await page.evaluate(readPageEnd);
  if (stated === null) return { seconds: read.endS, auto: false };
  if (!(read.endS > 0)) {
    throw new DurationError(`${pagePath}: duration is auto but no animation ends (a page driven by window.seek alone has no end to find): state a number in <meta name="duration" content="seconds">`);
  }
  return { ...autoLength(read), auto: true, ignoredInfinite: read.infinite };
}

const found = new Map();

/** The length of a page as an object, see lengthOfOpenPage. A stated number needs no browser; an auto page is measured once per file version. */
export async function resolveLength(pagePath) {
  const file = path.resolve(pagePath);
  const stated = statedLength(fs.readFileSync(file, 'utf8'));
  if (typeof stated === 'number') return { seconds: stated || 0, auto: false };
  const stat = fs.statSync(file);
  const key = `${file}:${stat.mtimeMs}:${stat.size}`;
  if (!found.has(key)) found.set(key, measure(file));
  return found.get(key);
}

async function measure(file) {
  const { openPage, gotoLoaded, settle, resolveFrame } = await import('./render-page.mjs');
  const { page, url, close } = await openPage(file, resolveFrame(file, {}), { final: false });
  try {
    await gotoLoaded(page, url, file);
    await settle(page);
    return await lengthOfOpenPage(page, file);
  } finally { await close(); }
}

/** The length of a page in seconds: the number it states, or the auto length. 0 when the page has none. */
export async function resolveDuration(pagePath) {
  return (await resolveLength(pagePath)).seconds;
}

/** The html with its duration meta set to `seconds`. Pure. */
export function lockLength(html, seconds) {
  const tag = html.match(/<meta\b[^>]*\bname\s*=\s*["']duration["'][^>]*>/i)?.[0];
  if (!tag) throw new DurationError('the page has no <meta name="duration"> to lock');
  return html.replace(tag, tag.replace(/(\bcontent\s*=\s*["'])[^"']*/i, `$1${+seconds.toFixed(3)}`));
}

/** Writes the found length of an auto page into its meta, so a cut to music can fix it. Returns the line to print. */
export function lockPageLength(pagePath, length) {
  if (!length.auto) return `${pagePath}: the length is already a number, nothing to lock`;
  fs.writeFileSync(pagePath, lockLength(fs.readFileSync(pagePath, 'utf8'), length.seconds));
  return `${pagePath}: duration locked at ${+length.seconds.toFixed(3)} s`;
}
