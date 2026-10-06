// The world reader's I/O: which data-world elements show at each sample time, read from the live page
// (pure span math: harness/lib/worlds.mjs). It runs in the draft check's text sample times.
import { sampleTimes } from '../lib/draft-check.mjs';
import { worldSpans } from '../lib/worlds.mjs';
import { runStart } from '../lib/spec-conformance.mjs';

export const SEEN_MIN_OPACITY = 0.05;
const GROUND_MIN_SHARE = 0.5;

// Runs inside the page, bundled as source with the readers that use it (tail-sample.mjs too): no display:none or visibility:hidden,
// opacity (with its ancestors') above minOpacity, and a box that meets the viewport.
export function elementShows(el, minOpacity) {
  let opacity = 1;
  for (let n = el; n; n = n.parentElement) {
    const s = getComputedStyle(n);
    if (s.display === 'none') return false;
    opacity *= Number(s.opacity);
  }
  const r = el.getBoundingClientRect();
  const inside = r.width > 0 && r.height > 0 && r.right > 0 && r.bottom > 0 && r.left < innerWidth && r.top < innerHeight;
  return getComputedStyle(el).visibility !== 'hidden' && opacity > minOpacity && inside;
}

// Runs inside the page: [{ id, visible, ground, texts }] for every [data-world] element. visible: elementShows. ground: the first
// non-transparent background of the element, its ancestors, then a descendant covering over GROUND_MIN_SHARE of the frame, as #rrggbb, or null.
function worldsSample(minOpacity, minShare) {
  const hex = (css) => {
    const m = /^rgba?\(([^)]+)\)$/.exec(css);
    if (!m) return null;
    const p = m[1].split(/[ ,/]+/).filter(Boolean).map(Number);
    if ((p.length > 3 ? p[3] : 1) <= 0) return null;
    return `#${p.slice(0, 3).map((v) => Math.round(v).toString(16).padStart(2, '0')).join('')}`;
  };
  const bgOf = (el) => hex(getComputedStyle(el).backgroundColor);
  const covers = (el) => {
    const r = el.getBoundingClientRect();
    const w = Math.max(0, Math.min(r.right, innerWidth) - Math.max(r.left, 0));
    const h = Math.max(0, Math.min(r.bottom, innerHeight) - Math.max(r.top, 0));
    return (w * h) / (innerWidth * innerHeight) > minShare;
  };
  const groundOf = (el) => {
    for (let n = el; n; n = n.parentElement) { const c = bgOf(n); if (c) return c; }
    const child = [...el.querySelectorAll('*')].find((n) => covers(n) && bgOf(n));
    return child ? bgOf(child) : null;
  };
  // The texts to read: each visible element with its own words, skipping texture (aria-hidden) and product chrome (data-chrome), as the text checks do.
  const textsOf = (world) => [...world.querySelectorAll('*')]
    .filter((n) => [...n.childNodes].some((c) => c.nodeType === 3 && c.textContent.trim()) && !n.closest('[aria-hidden="true"],[data-chrome]') && elementShows(n, minOpacity))
    .map((n) => n.textContent.replace(/\s+/g, ' ').trim());
  return [...document.querySelectorAll('[data-world]')].map((el) => {
    const visible = elementShows(el, minOpacity);
    return { id: el.dataset.world, visible, ground: groundOf(el), texts: visible ? textsOf(el) : [] };
  });
}

export const SHOWS_SOURCE = elementShows.toString();
const WORLDS_SOURCE = [elementShows, worldsSample].map((fn) => fn.toString()).join('\n');
export const readWorlds = (page) => page.evaluate((src, o, s) => new Function(`${src}\nreturn worldsSample(${o}, ${s});`)(), WORLDS_SOURCE, SEEN_MIN_OPACITY, GROUND_MIN_SHARE);

/** Seek to each draft sample time and read the worlds there; returns [{ id, start, end, ground }] in page order. `seek(ms)` is a layout seek. */
export async function sampleWorlds(page, dur, seek, from = 0) {
  const { step, times } = sampleTimes(dur);
  const samples = [];
  for (const rel of times) {
    const t = +(from + rel).toFixed(3);
    await seek(t * 1000);
    samples.push({ t, worlds: await readWorlds(page) });
  }
  const spans = worldSpans(samples, { step, dur: from + dur });
  return refineSpans(spans, async (id, t) => { await seek(t * 1000); return (await readWorlds(page)).some((w) => w.id === id && w.visible); }, from + dur);
}

/** Moves each coarse span edge onto the frame grid: start is the first visible frame, end the first hidden frame after it (or dur). */
async function refineSpans(spans, visibleAt, dur) {
  const out = [];
  for (const s of spans) {
    if (s.start == null) { out.push(s); continue; }
    const start = await runStart((t) => visibleAt(s.id, t), s.start, { dur });
    const end = await runStart(async (t) => t > start && !(await visibleAt(s.id, t)), s.end, { dur });
    out.push({ ...s, start: start ?? s.start, end: end ?? dur });
  }
  return out;
}
