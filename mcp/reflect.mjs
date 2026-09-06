// mcp/reflect.mjs. Read a real site's palette and faces so a video can be authored in the brand's
// own colours instead of invented ones.
//
// DELIBERATELY NO BROWSER. The repo can screenshot a site with puppeteer, but a headless browser
// pointed at a caller's URL fetches whatever that page tells it to, straight past the SSRF guard:
// the metadata endpoint, an internal service, anything. So this reads the HTML (and its stylesheets)
// through safeFetch and extracts the signal from the source. It returns the colours and font names,
// not a screenshot. Less than the full `make sections` pipeline, and safe to expose to strangers.
import { safeFetch } from './net.mjs';

const HEX = /#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})\b/g;
const FONT = /font-family\s*:\s*([^;{}"']+)/gi;
const VAR_COLOR = /--[\w-]*(?:color|bg|accent|brand|primary|fg|ink|surface)[\w-]*\s*:\s*(#[0-9a-fA-F]{3,6})/gi;

const norm = (h) => (h.length === 4 ? '#' + [...h.slice(1)].map((c) => c + c).join('') : h).toLowerCase();
// Near-white and near-black dominate every site and say nothing about the brand; rank by frequency
// but let the caller see them, since dominance (white-first vs dark-first) is itself the key decision.
const isNeutral = (h) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
  return mx - mn < 16 && (mx > 235 || mx < 20);
};

function tally(text, re, group = 0) {
  const counts = new Map();
  for (const m of text.matchAll(re)) {
    const v = (group ? m[group] : m[0]).trim();
    counts.set(v, (counts.get(v) || 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1]);
}

export async function reflect(rawUrl) {
  const url = /^https?:\/\//i.test(rawUrl) ? rawUrl : 'https://' + rawUrl;
  const html = (await safeFetch(url)).toString('utf8');

  // Pull in linked stylesheets too (guarded, capped): most brand colour lives in the CSS, not the
  // inline HTML. Only same-origin-ish absolute/relative hrefs; a handful, not the whole tree.
  let css = html;
  const hrefs = [...html.matchAll(/<link[^>]+rel=["']?stylesheet["']?[^>]*href=["']([^"']+)["']/gi)]
    .map((m) => m[1]).slice(0, 4);
  for (const href of hrefs) {
    try { css += '\n' + (await safeFetch(new URL(href, url).toString())).toString('utf8'); } catch { /* skip */ }
  }

  // Prefer colours declared as brand/accent CSS VARIABLES: those are the tokens the site chose to
  // name, so they are the palette, not the 117 incidental hexes a full stylesheet contains. Fall back
  // to frequency only when a site names no variables. Cap hard: a brand has a handful of colours, and
  // handing back a hundred is the same as handing back none.
  const brandVars = tally(css, VAR_COLOR, 1).map(([h]) => norm(h)).slice(0, 6);
  const byFreq = tally(css, HEX).map(([h]) => norm(h));
  const seen = new Set(brandVars);
  const brandColours = [...brandVars, ...byFreq.filter((h) => !isNeutral(h) && !seen.has(h))].slice(0, 5);
  const neutrals = byFreq.filter(isNeutral).slice(0, 3);
  const fonts = tally(css, FONT, 1)
    .map(([f]) => f.split(',')[0].replace(/["']/g, '').trim())
    .filter((f) => f && !/^var\(|^(inherit|initial|sans-serif|serif|monospace|system-ui|-apple-system)$/i.test(f))
    .slice(0, 4);

  const title = (/<title[^>]*>([^<]+)</i.exec(html) || [])[1]?.trim();
  return { url, title, brandVars, brandColours, neutrals, fonts };
}
