// core/raster.js: THE ONE PLACE A DOM SUBTREE BECOMES PIXELS.
//
// Lifted out of core/seams.js, which owned it alone for as long as the only thing that wanted a
// DOM raster was a seam. A second caller now wants one (core/resample.js, so a resample pass can be
// aimed at a built beat and not only at a photograph), and two copies of an SVG <foreignObject>
// serialiser is the "one fact, two owners" drift CLAUDE.md names as the recurring failure here. So
// seams.js imports from this file and nothing else changed about what a seam bakes.
//
// CHOICE: in-browser SVG <foreignObject> serialisation, over a Go screenshot pre-pass.
//   • self-contained in the page: no Go/JS coordination, so `make check GATE=probe`/`make check GATE=snap`/`make
//     canvas-purity` on existing scenes are untouched (a scene that bakes nothing never calls here).
//   • the bake is one-shot at build; the result is a static canvas, so renderFrame(n) stays pure in n.
// The two <foreignObject> gotchas are both handled here: (1) external stylesheets and CSS custom
// properties do NOT apply inside the isolated SVG render, so tokens.css + the scene <style> + the
// :root vars are INLINED into the SVG; (2) @font-face url()s are not fetched during the SVG→image
// rasterisation, so every USED face is fetched and embedded as a data: URI. Same-origin only.
//
// WHAT IT CANNOT SEE, and every caller has to plan around it: a <canvas> serialises as an EMPTY box
// (its bitmap is not part of the DOM), and a cross-origin <img> rasterises blank. Callers that need
// the canvas bitmap composite it themselves (stageToCanvas draws #cv under the raster); callers that
// cannot must refuse the source by name rather than bake a hole.
// Two caches, and the reason they are safe. A seam raster refetches and re-base64s every face it
// uses, and tokens.css with it, once per seam. The bytes are identical every time, so caching them
// changes no pixel and cannot break renderFrame(n) purity: the cached value is what the fetch would
// have returned. The declaration below existed for months and nothing read it, so a comment claimed
// "inlined once per document" while the work ran on every seam (engine-doctrine/MISTAKES.md #257).
const _fontCache = new Map();   // absolute url → data: URI
const _linkedCss = new Map();   // same-origin stylesheet href → CSS text, fetched once each

async function fetchAsDataUri(url, mime) {
  const res = await fetch(url);
  if (!res.ok) throw new Error('fetch ' + url + ' ' + res.status);
  const buf = await res.arrayBuffer();
  let bin = ''; const bytes = new Uint8Array(buf);
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return `data:${mime};base64,${btoa(bin)}`;
}

function ruleFontFace(rule, want) {
  if (!(rule.type === 5 || rule.constructor?.name === 'CSSFontFaceRule')) return null;
  const fam = (rule.style.fontFamily || '').replace(/^["']|["']$/g, '');
  if (!fam || !want.has(fam.toLowerCase())) return null;
  const src = rule.style.src || '';
  const m = src.match(/url\((["']?)([^"')]+)\1\)/); // first url() wins (woff2 is declared first)
  if (!m) return null;
  return { fam, url: m[2] };
}

async function fetchFaceCss(fam, url, ruleStyle) {
  const abs = new URL(url, location.href).href;
  try {
    if (!_fontCache.has(abs)) _fontCache.set(abs, await fetchAsDataUri(abs, 'font/woff2'));
    const data = _fontCache.get(abs);
    return `@font-face{font-family:'${fam}';font-weight:${ruleStyle.fontWeight || 'normal'};font-style:${ruleStyle.fontStyle || 'normal'};font-display:block;src:url(${data}) format('woff2');}`;
  } catch {
    return null; // a face that won't fetch just falls back inside the raster
  }
}

async function faceCssForRule(rule, want, seen) {
  const parsed = ruleFontFace(rule, want);
  if (!parsed) return null;
  if (parsed.url.startsWith('data:')) return rule.cssText;
  const key = parsed.fam + '|' + rule.style.fontWeight + '|' + rule.style.fontStyle;
  if (seen.has(key)) return null;
  seen.add(key);
  return fetchFaceCss(parsed.fam, parsed.url, rule.style);
}

async function facesFromSheet(sheet, want, seen) {
  let rules;
  try { rules = sheet.cssRules; } catch { return []; }
  if (!rules) return [];
  const out = [];
  for (const rule of rules) {
    const css = await faceCssForRule(rule, want, seen);
    if (css) out.push(css);
  }
  return out;
}

// Collect @font-face rules from same-origin sheets, fetch each src file once, emit @font-face blocks
// with data: URIs. Restricted to `families` (the faces the DOM actually uses) to keep the fetch small.
async function inlineFonts(families) {
  const want = new Set([...families].map((f) => f.toLowerCase()));
  const seen = new Set();
  const faces = [];
  for (const sheet of document.styleSheets) faces.push(...await facesFromSheet(sheet, want, seen));
  return faces.join('\n');
}

// Which families does this element actually paint? (mirrors fonts.usedFamilies, kept local so seams.js
// has no import cycle with fonts.js). Only these get fetched+inlined.
function usedFamilies(el) {
  const fams = new Set();
  const GENERIC = new Set(['sans-serif', 'serif', 'monospace', 'cursive', 'fantasy', 'system-ui', 'inherit', 'ui-sans-serif', 'ui-monospace', 'ui-serif']);
  const walk = (n) => {
    const cs = getComputedStyle(n);
    const first = (cs.fontFamily || '').split(',')[0].trim().replace(/^["']|["']$/g, '');
    if (first && !GENERIC.has(first.toLowerCase())) fams.add(first);
    for (const c of n.children) walk(c);
  };
  walk(el);
  return fams;
}

async function fetchLinkedCss(href) {
  if (!_linkedCss.has(href)) {
    try { _linkedCss.set(href, await (await fetch(href)).text()); } catch { _linkedCss.set(href, ''); }
  }
  return _linkedCss.get(href);
}

// Linked stylesheets are INVISIBLE to a <style> query, so fetch each once and inline it. This closes
// the bug where the seam bake lost `.hs-layer{position:absolute}` (it lives in the LINKED scene.css,
// not an inline <style>): without it every baked layer fell back to `position: static`, collapsed to
// top-of-frame block flow, and seam content jumped upward until the window ended
// (engine-doctrine/MISTAKES.md).
async function inlineLinkedStylesheets() {
  let css = '';
  for (const link of document.querySelectorAll('link[rel="stylesheet"]')) {
    const href = link.href;
    if (!href || new URL(href, location.href).origin !== location.origin) continue;  // skip cross-origin (fonts): inlineFonts handles those
    css += '\n' + await fetchLinkedCss(href);
  }
  return css;
}

export async function buildInlinedCss(el) {
  const families = usedFamilies(el);
  let base = '';
  for (const st of document.querySelectorAll('style')) base += '\n' + st.textContent;
  base += await inlineLinkedStylesheets();
  base = base.replace(/@font-face\s*\{[^}]*\}/g, '');
  const fonts = await inlineFonts(families);
  // :root custom properties (applyTheme wrote --bg/--accent/--font-* onto the documentElement inline
  // style; they are NOT in any stylesheet, so re-declare them for the isolated render).
  const rootVars = document.documentElement.getAttribute('style') || '';
  return `${fonts}\n:root{${rootVars}}\n${base}`;
}

// Chromium never loads a nested <img src="…"> while rasterising a detached SVG (the
// data:image/svg+xml this file feeds to `new Image()`): that render runs a same-document-only
// resource policy, so even a same-origin repo-local image comes back BLANK, not just the
// documented cross-origin case. The pixels already exist, though: preloadImages (boot.js) decoded
// every <img> before the scene reported ready, so a clone's <img> can be swapped for the ALREADY
// DECODED bitmap as a data: URI, exactly how inlineFonts closes the parallel gap for @font-face.
// A genuinely tainted cross-origin source still throws on toDataURL and is left as-is (unchanged,
// documented behaviour); everything else now bakes instead of leaving a flat background slab.
function inlineOneImage(cloneEl, origEl) {
  if (!origEl || !origEl.complete || !origEl.naturalWidth) return;
  try {
    const c = document.createElement('canvas');
    c.width = origEl.naturalWidth; c.height = origEl.naturalHeight;
    c.getContext('2d').drawImage(origEl, 0, 0);
    cloneEl.src = c.toDataURL('image/png');
  } catch { /* tainted cross-origin source: leave the original src, same as before */ }
}

function inlineImages(work, live) {
  const clones = work.querySelectorAll('img');
  const origs = live.querySelectorAll('img');
  for (let i = 0; i < clones.length; i++) inlineOneImage(clones[i], origs[i]);
}

// domToCanvas(el, w, h): serialise `el` into an SVG <foreignObject> with the inlined CSS, rasterise
// it through an <img>, and return a canvas. Async (image decode), build-time only.
// CSS goes in a CDATA section: stylesheet text can legally contain characters (`<`, `&`) that are
// not valid raw XML, and the SVG is parsed as XML during rasterisation.
function foreignObjectSvg(xml, css, size) {
  const { w, h } = size;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">` +
    `<defs><style type="text/css"><![CDATA[${css}]]></style></defs>` +
    `<foreignObject x="0" y="0" width="${w}" height="${h}">` +
    `<div xmlns="http://www.w3.org/1999/xhtml" style="width:${w}px;height:${h}px;position:relative;overflow:hidden;">${xml}</div>` +
    `</foreignObject></svg>`;
}

// Time-bound the decode with a REAL timer (scene setTimeout is virtualized and would never fire
// during boot): a raster that never resolves must not deadlock the render, it becomes a bake miss.
function loadRasterImage(img, url, timer) {
  return new Promise((res, rej) => {
    let done = false;
    const finish = (fn) => (arg) => { if (done) return; done = true; fn(arg); };
    const ok = finish(res), fail = finish(rej);
    timer(() => fail(new Error('foreignObject raster timed out')), 15000);
    img.onload = () => ok();
    img.onerror = () => fail(new Error('foreignObject raster failed'));
    img.src = url;
  });
}

function newSizedImage(w, h) {
  const img = new Image();
  img.width = w; img.height = h;
  return img;
}

async function decodeIfPossible(img) {
  if (img.decode) { try { await img.decode(); } catch {} }
}

function drawToCanvas(img, w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  c.getContext('2d').drawImage(img, 0, 0, w, h);
  return c;
}

export async function domToCanvas(el, w, h, css) {
  const work = el.cloneNode(true);
  inlineImages(work, el);
  const xml = new XMLSerializer().serializeToString(work);
  const svg = foreignObjectSvg(xml, css, { w, h });
  const url = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  const img = newSizedImage(w, h);
  await loadRasterImage(img, url, window.__realTimeout || setTimeout);
  await decodeIfPossible(img);
  return drawToCanvas(img, w, h);
}

// rasterStats(canvas): the two things a caller wants to know about a bake, sampled on a stride:
// how much of it is opaque at all, and how much of it differs from its own first pixel. They are
// separate questions and conflating them was a bug waiting for its caller: a seam wants both (a flat
// field means the beat did not rasterise), while a single resampled layer wants only the first, a
// `rect` layer IS one flat colour, and grading that as a failed bake refused a perfectly good source.
function sampleRaster(d, step, base) {
  let opaque = 0, nonUniform = 0, n = 0;
  for (let i = 0; i < d.length; i += step) {
    n++;
    if (d[i + 3] > 8) opaque++;
    if (Math.abs(d[i] - base.r) > 6 || Math.abs(d[i + 1] - base.g) > 6 || Math.abs(d[i + 2] - base.b) > 6) nonUniform++;
  }
  return { opaque, nonUniform, n };
}

export function rasterStats(canvas) {
  try {
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    const { width: w, height: h } = canvas;
    const d = ctx.getImageData(0, 0, w, h).data;
    const step = Math.max(4, (w * h / 4000 | 0)) * 4;
    const { opaque, nonUniform, n } = sampleRaster(d, step, { r: d[0], g: d[1], b: d[2] });
    return { opaque: opaque / n, nonUniform: nonUniform / n };
  } catch { return null; }   // unreadable (tainted) → the caller assumes it painted
}

// isBlankRaster(canvas): a bake that produced essentially nothing (all one colour / transparent).
// The signal to fall back to the plain cross-fade rather than flashing an empty frame.
export function isBlankRaster(canvas) {
  const s = rasterStats(canvas);
  if (!s) return false; // unreadable (tainted) → assume it painted; the GL path can still use it
  return s.opaque < 0.02 || s.nonUniform < 0.005;
}
