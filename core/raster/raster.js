// core/raster.js: THE ONE PLACE A DOM SUBTREE BECOMES PIXELS.
//
// Lifted out of core/seams.js, which owned it alone for as long as the only thing that wanted a
// DOM raster was a seam. A second caller now wants one (core/resample.js, so a resample pass can be
// aimed at a built beat and not only at a photograph), and two copies of an SVG <foreignObject>
// serialiser is the "one fact, two owners" drift CLAUDE.md names as the recurring failure here. So
// seams.js imports from this file and nothing else changed about what a seam bakes.
//
// CHOICE: in-browser SVG <foreignObject> serialisation, over a Go screenshot pre-pass.
//   • self-contained in the page: no Go/JS coordination, so `make probe`/`make snap`/`make
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

// Collect @font-face rules from same-origin sheets, fetch each src file once, emit @font-face blocks
// with data: URIs. Restricted to `families` (the faces the DOM actually uses) to keep the fetch small.
async function inlineFonts(families) {
  const want = new Set([...families].map((f) => f.toLowerCase()));
  const faces = [];
  const seen = new Set();
  for (const sheet of document.styleSheets) {
    let rules; try { rules = sheet.cssRules; } catch { continue; }
    if (!rules) continue;
    for (const rule of rules) {
      if (!(rule.type === 5 || rule.constructor?.name === 'CSSFontFaceRule')) continue;
      const fam = (rule.style.fontFamily || '').replace(/^["']|["']$/g, '');
      if (!fam || !want.has(fam.toLowerCase())) continue;
      const src = rule.style.src || '';
      const m = src.match(/url\((["']?)([^"')]+)\1\)/); // first url() wins (woff2 is declared first)
      if (!m) continue;
      let url = m[2];
      if (url.startsWith('data:')) { faces.push(rule.cssText); continue; }
      const abs = new URL(url, location.href).href;
      const key = fam + '|' + rule.style.fontWeight + '|' + rule.style.fontStyle;
      if (seen.has(key)) continue; seen.add(key);
      try {
        if (!_fontCache.has(abs)) _fontCache.set(abs, await fetchAsDataUri(abs, 'font/woff2'));
        const data = _fontCache.get(abs);
        faces.push(`@font-face{font-family:'${fam}';font-weight:${rule.style.fontWeight || 'normal'};font-style:${rule.style.fontStyle || 'normal'};font-display:block;src:url(${data}) format('woff2');}`);
      } catch (e) { /* a face that won't fetch just falls back inside the raster */ }
    }
  }
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

export async function buildInlinedCss(el) {
  const families = usedFamilies(el);
  // base sheet: the scene's own <style> blocks AND every linked stylesheet, minus their @font-face
  // (url()s that would not resolve in the isolated raster, the data: versions below replace them).
  let base = '';
  for (const st of document.querySelectorAll('style')) base += '\n' + st.textContent;
  // Linked stylesheets are INVISIBLE to the <style> query above, so fetch each once and inline it.
  // This closes the bug where the seam bake lost `.hs-layer{position:absolute}` (it lives in the
  // LINKED scene.css, not an inline <style>): without it every baked layer fell back to `position:
  // static`, collapsed to top-of-frame block flow, and seam content jumped upward until the window
  // ended (engine-doctrine/MISTAKES.md). tokens.css was the one link hand-fetched here; this generalises it so
  // no future linked sheet goes missing from a raster.
  for (const link of document.querySelectorAll('link[rel="stylesheet"]')) {
    const href = link.href;
    if (!href || new URL(href, location.href).origin !== location.origin) continue;  // skip cross-origin (fonts): inlineFonts handles those
    if (!_linkedCss.has(href)) {
      try { _linkedCss.set(href, await (await fetch(href)).text()); } catch (e) { _linkedCss.set(href, ''); }
    }
    base += '\n' + _linkedCss.get(href);
  }
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
function inlineImages(work, live) {
  const clones = work.querySelectorAll('img');
  const origs = live.querySelectorAll('img');
  for (let i = 0; i < clones.length; i++) {
    const im = origs[i];
    if (!im || !im.complete || !im.naturalWidth) continue;
    try {
      const c = document.createElement('canvas');
      c.width = im.naturalWidth; c.height = im.naturalHeight;
      c.getContext('2d').drawImage(im, 0, 0);
      clones[i].src = c.toDataURL('image/png');
    } catch (e) { /* tainted cross-origin source: leave the original src, same as before */ }
  }
}

// domToCanvas(el, w, h): serialise `el` into an SVG <foreignObject> with the inlined CSS, rasterise
// it through an <img>, and return a canvas. Async (image decode), build-time only.
export async function domToCanvas(el, w, h, css) {
  const work = el.cloneNode(true);
  inlineImages(work, el);
  const xml = new XMLSerializer().serializeToString(work);
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">` +
    // CSS goes in a CDATA section: stylesheet text can legally contain characters (`<`, `&`) that are
    // not valid raw XML, and the SVG is parsed as XML during rasterisation.
    `<defs><style type="text/css"><![CDATA[${css}]]></style></defs>` +
    `<foreignObject x="0" y="0" width="${w}" height="${h}">` +
    `<div xmlns="http://www.w3.org/1999/xhtml" style="width:${w}px;height:${h}px;position:relative;overflow:hidden;">${xml}</div>` +
    `</foreignObject></svg>`;
  const url = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  const img = new Image();
  img.width = w; img.height = h;
  // Time-bound the decode with a REAL timer (scene setTimeout is virtualized and would never fire
  // during boot): a raster that never resolves must not deadlock the render, it becomes a bake miss.
  const timer = window.__realTimeout || setTimeout;
  await new Promise((res, rej) => {
    let done = false;
    const finish = (fn) => (arg) => { if (done) return; done = true; fn(arg); };
    const ok = finish(res), fail = finish(rej);
    timer(() => fail(new Error('foreignObject raster timed out')), 15000);
    img.onload = () => ok();
    img.onerror = () => fail(new Error('foreignObject raster failed'));
    img.src = url;
  });
  if (img.decode) { try { await img.decode(); } catch (e) {} }
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  c.getContext('2d').drawImage(img, 0, 0, w, h);
  return c;
}

// rasterStats(canvas): the two things a caller wants to know about a bake, sampled on a stride:
// how much of it is opaque at all, and how much of it differs from its own first pixel. They are
// separate questions and conflating them was a bug waiting for its caller: a seam wants both (a flat
// field means the beat did not rasterise), while a single resampled layer wants only the first, a
// `rect` layer IS one flat colour, and grading that as a failed bake refused a perfectly good source.
export function rasterStats(canvas) {
  try {
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    const { width: w, height: h } = canvas;
    const d = ctx.getImageData(0, 0, w, h).data;
    let opaque = 0, nonUniform = 0; const r0 = d[0], g0 = d[1], b0 = d[2];
    const step = Math.max(4, (w * h / 4000 | 0)) * 4;
    let n = 0;
    for (let i = 0; i < d.length; i += step) {
      n++;
      if (d[i + 3] > 8) opaque++;
      if (Math.abs(d[i] - r0) > 6 || Math.abs(d[i + 1] - g0) > 6 || Math.abs(d[i + 2] - b0) > 6) nonUniform++;
    }
    return { opaque: opaque / n, nonUniform: nonUniform / n };
  } catch (e) { return null; }   // unreadable (tainted) → the caller assumes it painted
}

// isBlankRaster(canvas): a bake that produced essentially nothing (all one colour / transparent).
// The signal to fall back to the plain cross-fade rather than flashing an empty frame.
export function isBlankRaster(canvas) {
  const s = rasterStats(canvas);
  if (!s) return false; // unreadable (tainted) → assume it painted; the GL path can still use it
  return s.opaque < 0.02 || s.nonUniform < 0.005;
}
