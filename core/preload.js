// core/preload.js — the awaited readiness phase, one async pass per asset kind. Every function here
// runs BEFORE the virtual clock is installed and before the first frame is captured, so whatever it
// puts on `window.__*` is a plain, static table by render time and renderFrame(n) stays pure in n.
//
// Extracted from boot() so each concern reads on its own, and so the tree-walk that finds each asset
// kind lives in ONE place (walkData) instead of five hand-copied recursive scanners.
import { bakeCanvasFx, canvasFxKey } from './canvas-fx.js';
import { registerGsapEffects } from './gsap-effects.js';

// Visit every node of the scene JSON (objects, arrays, and string leaves), pre-order. Each preloader
// passes a `visit` that picks out the nodes it cares about. One walker, five callers.
export function walkData(node, visit) {
  visit(node);
  if (Array.isArray(node)) node.forEach((c) => walkData(c, visit));
  else if (node && typeof node === 'object') Object.values(node).forEach((c) => walkData(c, visit));
}

// fetchJson(url, what): the ONE place a JSON URL becomes an object. A non-OK response still has a
// BODY, and `res.json()` parses it happily — so a 404 whose body is "not found" was reported as
// `SyntaxError: Unexpected token 'o'`, naming the first character of the error page instead of the
// missing file. Every JSON fetch in the engine goes through here so the three outcomes stay distinct:
// the request failed, the server refused it, or the file really is malformed.
export async function fetchJson(url, what = 'file') {
  let res;
  try { res = await fetch(url); }
  catch (e) { throw new Error(`${what}: ${url} could not be fetched (${e.message})`); }
  if (!res.ok) {
    throw new Error(`${what}: ${url} → HTTP ${res.status} — the render server did not serve it. `
      + `Either the file does not exist, or its path is outside the roots the server allows `
      + `(core/, themes/, formats/, assets/, .vawe-data/scenes/, .vawe-data/uploads/).`);
  }
  try { return await res.json(); }
  catch (e) { throw new Error(`${what}: ${url} is not valid JSON (${e.message})`); }
}

const decodeImage = (src, crossOrigin) => new Promise((res, rej) => {
  const im = new Image();
  if (crossOrigin) im.crossOrigin = 'anonymous';
  im.onload = () => (im.decode ? im.decode().then(() => res(im), () => res(im)) : res(im));
  im.onerror = rej;
  im.src = src;
});

// AUDIO-REACTIVITY: `audio.spectrum` names a sidecar written offline by scripts/media/spectrum.mjs;
// the render reads row n and never touches a decoder. A missing sidecar is a warning, not a throw —
// the scene still renders, the reactive layers simply hold still.
export async function preloadSpectrum(data) {
  window.__spectrum = null;
  if (!(data.audio && data.audio.spectrum)) return;
  try {
    const r = await fetch(data.audio.spectrum.startsWith('/') ? data.audio.spectrum : '/' + data.audio.spectrum);
    if (r.ok) window.__spectrum = await r.json();
    else console.warn(`spectrum: ${data.audio.spectrum} not found (${r.status}) — react layers will hold still`);
  } catch (e) { console.warn(`spectrum: ${data.audio.spectrum} unreadable — react layers will hold still`); }
}

// cobe is LAZY and AWAITED, for the same two reasons three is: a `globe` layer builds synchronously
// and would otherwise race the module load, and a layer that renders empty on whichever workers got
// there first is a purity break rather than a glitch. It is 12.9 KB, so laziness is about correctness
// here, not weight.
export async function preloadCobe(data) {
  if (!JSON.stringify(data).includes('"globe"')) return;
  try { window.__cobe = (await import('/assets/vendor/cobe.module.js')).default; }
  catch (e) { throw new Error('cobe failed to load from /assets/vendor/cobe.module.js: ' + e.message); }
}

// three.js is LAZY and AWAITED. Lazy because it is 635KB and most scenes never touch it; awaited
// because a `three` layer builds synchronously and would otherwise race the module load — a layer that
// renders empty on the workers that got there first is a purity break, not a glitch. Extruded type
// needs glyph outlines (make glyphs); a missing typeface is a LOUD failure in three-fx.js, not a swap.
export async function preloadThree(data) {
  if (!JSON.stringify(data).includes('"three"')) return;
  try { window.THREE = await import('/assets/vendor/three.module.min.js'); }
  catch (e) { throw new Error('three.js failed to load from /assets/vendor/three.module.min.js: ' + e.message); }
  window.__typefaces = {};
  const fonts = new Set();
  walkData(data, (o) => { if (o && typeof o === 'object' && o.three === 'extrudeText' && typeof o.font === 'string') fonts.add(o.font); });
  for (const f of fonts) {
    try { window.__typefaces[f] = await fetchJson(`/assets/fonts/3d/${f}.typeface.json`, 'typeface'); }
    catch (e) { /* left absent on purpose: three-fx.js throws with the `make glyphs` instruction */ }
  }
}

// Tier-2 CANVAS FX: bake each image with a `canvasFx` (halftone/dither/mosaic/…) ONCE, into a static
// PNG data-URL. image.js then swaps the <img> src to it, so the pixels are static at frame time and
// renderFrame(n) stays byte-identical (probe/snap prove it).
export async function preloadCanvasFx(data) {
  window.__canvasFx = {};
  const jobs = [];
  walkData(data, (o) => { if (o && typeof o === 'object' && o.type === 'image' && o.canvasFx && typeof o.src === 'string') jobs.push({ src: o.src, spec: o.canvasFx }); });
  for (const job of jobs) {
    const key = canvasFxKey(job.src, job.spec);
    if (window.__canvasFx[key]) continue;
    try {
      const url = bakeCanvasFx(await decodeImage(job.src, true), job.spec);
      if (url) window.__canvasFx[key] = url;
    } catch (e) { /* missing/tainted source → image.js falls back to the raw <img> */ }
  }
}

// Preload captured components (real UI lifted off a site by scripts/capture-component.mjs) so a
// `component` scene can inject real HTML synchronously. Any string like /…/components/x.json.
export async function preloadComponents(data) {
  window.__components = {};
  const paths = new Set();
  walkData(data, (o) => { if (typeof o === 'string' && /\/(components|scenes)\/[^/]+\.json$/.test(o)) paths.add(o); });
  // A component that fails to load leaves its `component` layer EMPTY. Warn (matches lottie/gsap) so a
  // moved/mistyped capture path is visible, not a silently blank box.
  for (const p of paths) { try { const r = await fetch(p); if (r.ok) window.__components[p] = await r.json(); else console.warn(`component: ${p} → ${r.status} — layer renders EMPTY`); } catch (e) { console.warn(`component: ${p} unreadable — layer renders EMPTY`); } }
}

// Preload the images INSIDE captured components and hand-authored fragments.
//
// preloadImages in core/boot.js walks the SCENE DATA for image-like strings, and its own comment says
// why it exists: without it the renderer screenshots a frame mid-download and the image is missing on
// some frames. A component's <img> tags are not in the scene data. They arrive inside the component's
// own HTML, fetched by preloadComponents above, so they were never preloaded and every capture raced
// them. Measured on brew-launch: two renders of identical code differed on 373 of 1890 frames, in two
// contiguous runs, and each run lined up with a `component` layer's span to within a few frames
// (docs/MISTAKES.md #258).
//
// Runs AFTER preloadComponents and preloadHtml, because it reads what they fetched.
export async function preloadEmbeddedImages() {
  const urls = new Set();
  // The browser's own parser, not a regex. A captured `src` is attribute TEXT, so it carries HTML
  // entities: brew's images are `?url=…&amp;w=1200&amp;q=70`, and fetching that literal string asks
  // for a different URL than the one the browser resolves. The first version of this function used a
  // regex, preloaded seven URLs that were not the ones being drawn, and changed nothing. DOMParser
  // builds an INERT document, so reading .src resolves and decodes entities without fetching anything.
  const parser = new DOMParser();
  const collect = (html) => {
    if (typeof html !== 'string' || !html.includes('<')) return;
    for (const im of parser.parseFromString(html, 'text/html').images) {
      if (im.src && !im.src.startsWith('data:')) urls.add(im.src);
    }
  };
  const walkAny = (o) => {
    if (Array.isArray(o)) o.forEach(walkAny);
    else if (o && typeof o === 'object') Object.values(o).forEach(walkAny);
    else collect(o);
  };
  walkAny(window.__components || {});
  walkAny(window.__html || {});
  // A dead link resolves rather than hangs, exactly as preloadImages does: the frame degrades to a
  // missing picture, which is visible, instead of the render never reporting ready. These are often
  // THIRD-PARTY URLs off the captured site, so this is also the step that stops a render depending on
  // how fast someone else's CDN answers.
  window.__embeddedImages = [...urls];
  // A REMOTE url here is debt, not a feature. Captures are localized at capture time
  // (scripts/brand/localize-assets.mjs), so anything still pointing off-origin makes this render
  // depend on how fast a third party answers, and makes an archived film change when their site does.
  // Warn per URL rather than silently preloading it, so the dependency is visible in the render log
  // instead of only in a frame. Run `node scripts/brand/localize-assets.mjs --write` to clear it.
  const remote = [...urls].filter((u) => { try { return new URL(u).origin !== location.origin; } catch { return false; } });
  for (const u of remote) console.warn(`embedded image is REMOTE: ${u} — this render depends on the network. Fix: node scripts/brand/localize-assets.mjs --write`);
  await Promise.all([...urls].map((src) => decodeImage(src, true).catch(() => {})));
}

// Preload HAND-AUTHORED HTML FRAGMENTS: `{"type":"html","src":"formats/scene/hero.html"}` on a layer, or
// `src` on a bg window, as the alternative to the inline `html` string. Typed like preloadLottie above,
// NOT sniffed like preloadComponents: a path-shaped string somewhere in a scene is not a promise that it
// is a fragment, and that sniff is why an unrelated .json path gets fetched as a component.
//
// A missing fragment THROWS (see htmlSource in core/sanitize-html.js for why this one does not degrade).
export async function preloadHtml(data) {
  window.__html = {};
  const srcs = new Set();
  walkData(data, (o) => { if (o && typeof o === 'object' && o.type === 'html' && typeof o.src === 'string') srcs.add(o.src); });
  // bg windows carry no `type`, so they are read off `data.bg` directly rather than by shape.
  for (const b of Array.isArray(data.bg) ? data.bg : []) if (b && typeof b === 'object' && typeof b.src === 'string') srcs.add(b.src);
  for (const p of srcs) window.__html[p] = await fetchHtmlText(p);
}

// The .html twin of fetchJson: same three distinct outcomes, same served-roots message. fetchJson parses
// and cannot be reused, and a fragment that 404s must not arrive as the error page's own markup.
async function fetchHtmlText(src) {
  // Root-normalised like lottie's src (:182): "formats/scene/x.html" resolved against the scene page at
  // /formats/scene/ happens to work and resolves to nothing from anywhere else. Which page is loading a
  // fragment is not something an author should have to know.
  const url = /^(https?:)?\//.test(src) ? src : '/' + src;
  let res;
  try { res = await fetch(url); }
  catch (e) { throw new Error(`html fragment: ${url} could not be fetched (${e.message})`); }
  if (!res.ok) {
    throw new Error(`html fragment: ${url} → HTTP ${res.status} — the render server did not serve it. `
      + `Either the file does not exist, or its path is outside the roots the server allows `
      + `(core/, themes/, formats/, assets/, .vawe-data/scenes/, .vawe-data/uploads/).`);
  }
  return await res.text();
}

// Preload generated CLIPS (scripts/gen-clip.mjs): any "/…/manifest.json" string is a frame-sequence
// manifest {fps,w,h,frames:[url]}. Decode EVERY frame up front so the `clip` layer can swap an <img>
// src per renderFrame(n) with zero async — deterministic playback of a generated/any video.
export async function preloadClips(data) {
  window.__clips = {};
  const paths = new Set();
  walkData(data, (o) => { if (typeof o === 'string' && /\/manifest\.json$/.test(o)) paths.add(o); });
  for (const p of paths) {
    try {
      const r = await fetch(p);
      if (!r.ok) { console.warn(`clip: ${p} → ${r.status} — layer renders EMPTY`); continue; }
      const man = await r.json();
      window.__clips[p] = man;
      await Promise.all((man.frames || []).map((src) => decodeImage(src).catch(() => {})));
    } catch (e) { console.warn(`clip: ${p} unreadable — layer renders EMPTY`); }
  }
}

// Preload the RANSOM SPRITE SET (assets/ransom/manifest.json + every letter PNG), when a scene opts
// into `ransom: { sprites: true }`. Decoded up front so ransomStyle can size each scrap from its own
// aspect synchronously at build — a real cutout set has a different width per letter, and measuring it
// at frame time would be async, which frame n cannot be.
export async function preloadRansomSprites(data) {
  window.__ransomSprites = null;
  if (!/"sprites"\s*:\s*true/.test(JSON.stringify(data))) return;
  const base = '/assets/ransom/';
  let manifest;
  try { manifest = await fetchJson(base + 'manifest.json', 'ransom sprites'); }
  catch (e) { throw new Error('ransom sprites: /assets/ransom/manifest.json is missing or unreadable — run `make ransom-sprites` after unzipping a cut-out letter pack into assets/ransom-src/'); }
  await Promise.all(Object.values(manifest).flat().map((v) => decodeImage(base + v.file).catch(() => {})));
  window.__ransomSprites = { base, manifest };
}

// Load GSAP (the tween engine) ONLY when a scene uses it — a `gsap` layer field or a `morph`. Loaded
// before the virtual clock like the other runtimes; seekAll(t) pauses gsap.globalTimeline and seeks it
// per frame, so tweens stay pure in n. The ticker is stopped so GSAP never self-advances (we drive it).
const loadScript = (src) => new Promise((res) => { const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = res; document.head.appendChild(s); });

// The formerly-paid bonus plugins (free since GSAP 3.13). Each is loaded + registered ONLY when a scene
// declares its field, so a text-only render never parses them. A plugin file exposes a UMD global that
// gsap.registerPlugin() then wires in. A missing/failed file warns (the layer degrades) — never silent.
const GSAP_PLUGINS = {
  motionPath: { file: 'MotionPathPlugin.min.js', global: 'MotionPathPlugin' },
  physics:    { file: 'Physics2DPlugin.min.js', global: 'Physics2DPlugin' },
  splitText:  { file: 'SplitText.min.js', global: 'SplitText' },
};

// THE TRIGGER SET. A scene naming any of these props has motion authored on the seeked GSAP timeline,
// so GSAP must be loaded before build or the engine accepts the input and renders it UNANIMATED, the
// silent-substitution failure that shipped once already, when the boot→preload extraction dropped `parts`
// from a hand-typed list (docs/MISTAKES.md #148).
//
// The plugin fields derive from GSAP_PLUGINS above, so that half cannot drift at all. The other five are
// read in modules this one does not import (applyGsapHooks in formats/scene/scene.js for morph, fx, fxOut,
// parts, and core/layers/composition.js for comp) and are stated here instead. Stating them is safe only
// because scripts/gates/lib-test.mjs RE-DERIVES the whole set from the source that does the reading and
// fails when the two disagree; the list on its own is exactly what #148 was.
//
// `gsap` was the ninth name and is gone: the `gsap:{from,to}` field was removed in #208 and no code has
// read it since, so it loaded a tween engine for a prop with no reader.
const GSAP_HOOK_PROPS = ['morph', 'fx', 'fxOut', 'parts', 'comp'];
export const GSAP_PROPS = Object.freeze([...GSAP_HOOK_PROPS, ...Object.keys(GSAP_PLUGINS)]);
const GSAP_TRIGGER_RE = new RegExp(`"(${GSAP_PROPS.join('|')})"\\s*:`);

export async function preloadGsap(data) {
  const json = JSON.stringify(data);
  if (!GSAP_TRIGGER_RE.test(json)) return;
  if (!window.gsap) await loadScript('/assets/vendor/gsap.min.js');
  if (!window.gsap) { console.warn('gsap: /assets/vendor/gsap.min.js failed to load, so fx/morph/parts/comp layers render unanimated'); return; }
  // autoRemoveChildren=false IS THE PURITY OF renderFrame(n), not a memory tweak. GSAP's ROOT timeline
  // ships with autoRemoveChildren:true: the instant a tween's playhead passes its end, GSAP unlinks it
  // from the timeline. For a PLAYING page that is right (a finished tween is garbage). For a SEEKED page
  // it is fatal — the tween is gone, so a later seek back to before its start can never restore the
  // from-state, and its targets stay frozen at the end values for every earlier frame drawn afterwards.
  // renderFrame(n) is then a function of n AND of the highest n this tab has already drawn.
  //
  // That is not hypothetical and it is not about one feature. The capture's dedup pre-pass calls
  // frameSig() over EVERY frame, in order, on the meta tab (internal/scene/scene.go) — and worker 0
  // then borrows that same tab and draws frames 0, 6, 12, … from a timeline whose playhead has already
  // been at the last frame. So one frame in six came back with every completed tween stuck at its end
  // state, which read as a 366-cell grid blinking five times a second (docs/MISTAKES.md #370).
  // It hits every GSAP-driven field alike (fx · fxOut · motionPath · physics · splitText · parts · comp);
  // `parts` only made it loud by putting 80 elements on one tween.
  try { window.gsap.ticker.sleep(); window.gsap.globalTimeline.pause(); window.gsap.globalTimeline.autoRemoveChildren = false; registerGsapEffects(window.gsap); } catch (e) {}
  for (const [field, p] of Object.entries(GSAP_PLUGINS)) {
    if (!new RegExp(`"${field}"\\s*:`).test(json)) continue;
    if (!window[p.global]) await loadScript('/assets/vendor/' + p.file);
    if (window[p.global]) { try { window.gsap.registerPlugin(window[p.global]); } catch (e) {} }
    else console.warn(`gsap: /assets/vendor/${p.file} failed to load — "${field}" layers render unanimated`);
  }
}

// Preload LOTTIE animation data (After Effects / Bodymovin JSON). A `lottie` layer references its src;
// fetch each once so build() can init the runtime synchronously and seek it per frame. The runtime is
// loaded ONLY when a scene uses it (no 168KB parse tax on text-only renders), before the virtual clock
// so no rAF is captured at load; onerror resolves so a missing lib degrades rather than hangs.
export async function preloadLottie(data) {
  window.__lottie = {};
  const srcs = new Set();
  walkData(data, (o) => { if (o && typeof o === 'object' && o.type === 'lottie' && typeof o.src === 'string') srcs.add(o.src); });
  if (!srcs.size) return;
  if (!window.lottie) await new Promise((res) => { const s = document.createElement('script'); s.src = '/assets/vendor/lottie_light.min.js'; s.onload = res; s.onerror = res; document.head.appendChild(s); });
  // Key by the ORIGINAL src (build reads kit.lottie[L.src]) but fetch a ROOT-relative URL: a src like
  // "assets/lottie/x.json" (no leading slash) resolved against the scene HTML at /formats/scene/ → 404 →
  // an empty box with NO warning (the exact silent substitution the doctrine forbids). Normalise + warn.
  for (const p of srcs) {
    const url = /^(https?:)?\//.test(p) ? p : '/' + p;
    try { const r = await fetch(url); if (r.ok) window.__lottie[p] = await r.json(); else console.warn(`lottie: ${url} → ${r.status} — layer renders EMPTY`); }
    catch (e) { console.warn(`lottie: ${url} unreadable — layer renders EMPTY`); }
  }
}
