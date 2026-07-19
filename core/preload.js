// core/preload.js — the awaited readiness phase, one async pass per asset kind. Every function here
// runs BEFORE the virtual clock is installed and before the first frame is captured, so whatever it
// puts on `window.__*` is a plain, static table by render time and renderFrame(n) stays pure in n.
//
// Extracted from boot() so each concern reads on its own, and so the tree-walk that finds each asset
// kind lives in ONE place (walkData) instead of five hand-copied recursive scanners.
import { bakeCanvasFx, canvasFxKey } from './canvas-fx.js';

// Visit every node of the scene JSON (objects, arrays, and string leaves), pre-order. Each preloader
// passes a `visit` that picks out the nodes it cares about. One walker, five callers.
export function walkData(node, visit) {
  visit(node);
  if (Array.isArray(node)) node.forEach((c) => walkData(c, visit));
  else if (node && typeof node === 'object') Object.values(node).forEach((c) => walkData(c, visit));
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
    try { window.__typefaces[f] = await (await fetch(`/assets/fonts/3d/${f}.typeface.json`)).json(); }
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
  for (const p of paths) { try { window.__components[p] = await (await fetch(p)).json(); } catch (e) {} }
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
      const man = await (await fetch(p)).json();
      window.__clips[p] = man;
      await Promise.all((man.frames || []).map((src) => decodeImage(src).catch(() => {})));
    } catch (e) {}
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
  for (const p of srcs) { try { window.__lottie[p] = await (await fetch(p)).json(); } catch (e) {} }
}
