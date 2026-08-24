// Vawe Company License 1.0 — see LICENSE at the repository root.
// core/boot.js — the scene RUNTIME lifted out of core/motion.js: theme resolution + CSS apply,
// the deterministic virtual clock, image/component preload, and boot() (fetch data → validate →
// build → expose window.__engine). Imports pure helpers from ./motion.js. DOM/fetch live here only.
import { FPS, isLightBg } from './motion.js';
import './frame-settle.js'; // installs window.__frameSettle, the capture's async barrier
import { themeErrors } from './theme-contract.js';
import { validateAll } from './validate.mjs';
import { produceBaseline, bakeCameraMove } from './produce.js';
import { safeArea, ASPECTS, sceneDims, CAPTION_SKINS, CAPTION_LINES, captionSkin, frameOf, reportBounds, boundsCheckOn } from './safe.js';
import { loadRegistered, auditFonts } from './fonts.js';
import { preloadEmbeddedImages, preloadSpectrum, preloadThree, preloadCobe, preloadCanvasFx, preloadComponents, preloadHtml, preloadClips, preloadLottie, preloadGsap, preloadRansomSprites, fetchJson } from './preload.js';
import { RANSOM_FACES } from './ransom.js';

const isObj = (o) => o && typeof o === 'object' && !Array.isArray(o);

// ---- tiny hex utils for deriving palette vars the theme didn't declare (e.g. --card) ----
const hexToRgb = (h) => { let s = String(h).replace('#', ''); if (s.length === 3) s = s.split('').map((c) => c + c).join(''); const n = parseInt(s, 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
const rgbToHex = (a) => '#' + a.map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
const mixHex = (a, b, t) => { try { const A = hexToRgb(a), B = hexToRgb(b); return rgbToHex(A.map((v, i) => v + (B[i] - v) * t)); } catch { return a; } };
// deriveCard: a raised CARD surface. Lighten the theme's surface toward white on light themes, lift it
// gently on dark — so elevated block cards read correctly on any brand that didn't declare palette.card.
const deriveCard = (P) => { const base = P.surface || P.bg || '#ffffff'; return mixHex(base, '#ffffff', isLightBg(P.bg || base) ? 0.55 : 0.1); };

// ---- multi-aspect: canvas sizes + a pure relative-coordinate resolver ----
// One source renders at any platform ratio. Absolute px coords pass through unchanged (back-compat);
// relative coords resolve against THIS canvas's W,H so the SAME layer lands right in every aspect.

// resolveCoords(data, W, H): mutate top-level layer x/y/w/h from relative forms to px. Forms:
//   number            → px (unchanged)
//   "50%" / "50%-40"  → fraction of the canvas dim (± an offset)
//   "center"          → centered given the layer's size
//   "left/right/top/bottom" → anchored to that edge inside a per-aspect safe inset
//   pin: "center|top|bottom|left|right|top-left|…" → shorthand for the x/y edge pair
// The props BOOT resolves before any layer is built: the placement grammar (edge keywords, the 12-col
// grid, string coordinates) and the per-aspect override map. They are read here and nowhere else, and
// this file is imported by node, so a gate can read the declaration without knowing where boot lives.
export const PROPS = {
  pin: {}, col: {}, cols: { when: 'col' }, gutter: { when: 'col' },
  aspects: {}, x: {}, y: {}, w: {}, h: {}, size: {}, children: {},
};

export function resolveCoords(data, W, H, safe = safeArea(W, H, 'web'), frame = null) {
  const inset = safe.margin;
  // keywords place a layer of `size` on a canvas line. TWO different lines, on purpose:
  //   • EDGES (left/right/top/bottom) resolve against the SAFE BOX. This is the invariant that makes
  //     the system honest: `pin:"bottom"` lands on the safe box's bottom, so an edge pin can never
  //     produce a safe-zone failure. It used to resolve against a 6% inset while the audit checked a
  //     different box entirely, so the engine placed content 550px inside the zone the gate rejected.
  //   • CENTRE / OPTICAL / THIRDS resolve against the CANVAS, because centred means centred. The safe
  //     box is deliberately asymmetric on a phone feed (the rail is only on the right); centring in it
  //     would push every hero off the visual centre to dodge chrome the viewer can see past anyway.
  //     If centred content collides with chrome, that is a composition call, and the audit says so.
  // `size` is the layer's declared extent on this axis, 0 when unset. `est` is the same thing with a
  // text-height fallback, and ONLY the far edges (right/bottom) use it — they are the two keywords that
  // must subtract a size to work at all, so with size 0 they placed the layer's NEAR edge on the far
  // safe line and hung the whole layer outside it. (`pin:"bottom"` set top=1340 on a 1340 safe bottom.)
  // centre/optical/thirds keep using the raw `size`: feeding them `est` would shift every centred layer
  // in the repo by half a line, and a missing `w` there is already reported as `degenerate-pin` by the
  // audit rather than papered over with a guess.
  const kw = (v, dim, size, lo, hi, est) =>
    v === 'center' ? (dim - size) / 2
      : v === 'optical' ? dim * 0.46 - size / 2
      : v === 'third1' ? dim / 3 - size / 2
      : v === 'third2' ? (2 * dim) / 3 - size / 2
      : (v === 'left' || v === 'top') ? lo
      : (v === 'right' || v === 'bottom') ? hi - est : null;
  const num = (v, dim, size, lo, hi, est = size) => {
    if (typeof v !== 'string') return v;
    const s = v.trim();
    const k = kw(s, dim, size, lo, hi, est); if (k != null) return Math.round(k);
    const m = s.match(/^(-?[\d.]+)%\s*([+-]\s*[\d.]+)?$/);
    if (m) return Math.round((parseFloat(m[1]) / 100) * dim + (m[2] ? parseFloat(m[2].replace(/\s+/g, '')) : 0));
    const n = parseFloat(s); return isNaN(n) ? v : n;
  };
  // pin → [x-keyword, y-keyword]. center uses OPTICAL vertical; thirds land on the power points.
  const PIN = { center: ['center', 'optical'], top: ['center', 'top'], bottom: ['center', 'bottom'],
    left: ['left', 'center'], right: ['right', 'center'], 'top-left': ['left', 'top'], 'top-right': ['right', 'top'],
    'bottom-left': ['left', 'bottom'], 'bottom-right': ['right', 'bottom'],
    'thirds-tl': ['third1', 'third1'], 'thirds-tr': ['third2', 'third1'], 'thirds-bl': ['third1', 'third2'],
    'thirds-br': ['third2', 'third2'], 'thirds-t': ['center', 'third1'], 'thirds-b': ['center', 'third2'],
    'thirds-l': ['third1', 'center'], 'thirds-r': ['third2', 'center'] };
  // Children were never walked, so `pin`, `col`, `gutter` and string coords ("50%", "center") were
  // inert inside a group — and in a `layout:"free"` group a "50%" string reached CSS as `left:50%px`,
  // which is not a coordinate at all. `applyAt` already recurses; this did not (MISTAKES #70).
  const allLayers = [];
  (function walk(ls) { for (const L of ls || []) { if (!isObj(L)) continue; allLayers.push(L); if (L.children) walk(L.children); } })(data.layers);
  for (const L of allLayers) {
    if (L.pin && PIN[L.pin]) { const [px, py] = PIN[L.pin]; if (L.x == null) L.x = px; if (L.y == null) L.y = py; }
    // 12-col grid: col "3" (one column) or "2-7" (a span) → x + w from a gutter grid (col overrides pin-x).
    // The grid spans the SAFE box, not the canvas, for the same reason the edge keywords do: a column
    // layout that runs under a platform's rail is not a layout.
    if (L.col != null) {
      const cols = L.cols || 12, g = L.gutter ?? Math.round(inset * 0.5);
      const gridW = safe.x1 - safe.x0;
      const colW = (gridW - (cols - 1) * g) / cols;
      const mm = String(L.col).match(/^(\d+)(?:-(\d+))?$/);
      if (mm) { const c1 = +mm[1], c2 = mm[2] ? +mm[2] : c1;
        L.x = Math.round(safe.x0 + (c1 - 1) * (colW + g));
        L.w = Math.round((c2 - c1 + 1) * colW + (c2 - c1) * g); }
    }
    if (typeof L.w === 'string') L.w = num(L.w, W, 0, safe.x0, safe.x1);
    if (typeof L.h === 'string') L.h = num(L.h, H, 0, safe.y0, safe.y1);
    const w = typeof L.w === 'number' ? L.w : 0, h = typeof L.h === 'number' ? L.h : 0;
    // A text layer rarely declares `h`, so estimate it from the font size for the bottom edge. size*1.2
    // is not a new invention: formats/scene/scene.html uses exactly this fallback to anchor layers to
    // each other. There is deliberately NO equivalent for width — a string's rendered width cannot be
    // known before layout, so `pin:"right"` without `w` stays an authoring error the audit reports.
    const hEst = h || (L.type === 'text' && L.size ? L.size * 1.2 : h);
    if (L.x != null) L.x = num(L.x, W, w, safe.x0, safe.x1);
    if (L.y != null) L.y = num(L.y, H, h, safe.y0, safe.y1, hEst);
  }

  // CAPTIONS PLACE WITH THE SAME GRAMMAR AS LAYERS, and reusing it is the whole point of doing this
  // here. A caption used to accept t0/t1/text and nothing else (formats/scene/schema.json), so where
  // it sat was a CSS constant in scene.css that no JSON could reach: an author who wanted a line at
  // the top of the frame had no way to say so, and nothing told them the wish was unsayable. Giving
  // captions their own placement words would have been a SECOND grammar for one job, which is the
  // duplicate-vocabulary shape core/safe.js opens by warning about. So a caption resolves through the
  // same `pin` table, the same edge keywords, the same "50%" strings and the same safe box.
  // A caption that declares none of them is left untouched and scene.css still places it, which is
  // why this cannot move a pixel of any film that has not asked it to.
  const capDefaults = CAPTION_SKINS[captionSkin(data)];
  for (const C of data.captions || []) {
    if (!isObj(C)) continue;
    // A PIN MOVES THE CAPTION VERTICALLY AND, WITHOUT A WIDTH, ONLY VERTICALLY. `pin` centres a BOX,
    // and a caption declares no width by default: scene.css pins its left AND right edges, so the box
    // is the stylesheet's. Applying the pin's x-keyword anyway releases the right edge, leaves the
    // width to shrink-to-fit, and lands the text's LEFT edge on the centre line — which is exactly the
    // `degenerate-pin` failure CLAUDE.md already names for layers, reproduced here on the first frame
    // this hook ever rendered. So the x-keyword waits for a `w` to centre against, and `pin:"top"`
    // does the obvious thing: same box, moved to the top. A pin that names a horizontal EDGE and
    // carries no `w` is refused by core/validate.mjs rather than half-applied in silence.
    if (C.pin && PIN[C.pin]) {
      const [px, py] = PIN[C.pin];
      if (C.x == null && C.w != null) C.x = px;
      if (C.y == null) C.y = py;
    }
    if (typeof C.w === 'string') C.w = num(C.w, W, 0, safe.x0, safe.x1);
    const w = typeof C.w === 'number' ? C.w : 0;
    // A caption never declares a height and its band is two lines by contract (core/safe.js
    // CAPTION_LINES), so `pin:"bottom"` has a real extent to subtract instead of hanging the band
    // off the bottom safe line the way a sizeless layer used to.
    const hEst = CAPTION_LINES * Math.ceil((C.size || capDefaults.fontPx) * 1.05);
    if (C.x != null) C.x = num(C.x, W, w, safe.x0, safe.x1);
    if (C.y != null) C.y = num(C.y, H, 0, safe.y0, safe.y1, hEst);
  }

  // THE BOUNDS CHECK LIVES HERE, at the one funnel where a relative coordinate becomes a pixel, so an
  // effect never carries placement logic of its own: one check instead of one per factory. It grades
  // only SETTLED boxes (core/safe.js outOfFrame), because a layer sliding in from off-frame is a
  // legitimate entrance and grading it manufactures findings (docs/MISTAKES.md #376).
  //
  // REPORT ONLY, off by default. It prints under `?bounds` in the browser or FRAME_BOUNDS=1 in node,
  // and it never throws: whether the engine should REFUSE a settled off-frame box is a decision for a
  // human holding the count of shipped films it would fail.
  //
  // TOP-LEVEL LAYERS ONLY. A group child's x/y is relative to its group, so measuring it against the
  // canvas would report the wrong number with total confidence.
  return boundsCheckOn()
    ? reportBounds((data.layers || []).filter(isObj), frame || { W, H, safe })
    : [];
}

// preloadImages: walk the data JSON for image-like strings (local paths, /…, or http(s)
// URLs — incl. user-supplied web image links) and fully load+decode them BEFORE the scene
// reports ready. Without this the Go renderer can screenshot a frame mid-download → a missing
// image on some frames. onerror also resolves so a dead link falls back (icon()) without hanging.
// A REPO-LOCAL IMAGE THAT 404s IS INVALID INPUT, AND IT THROWS. This used to degrade quietly: the
// frame simply had a hole in it, and the author found out from a preflight script or from looking at
// the render. That is the same failure `htmlSource` refuses one file over (a fragment `src` that never
// loaded), graded differently only because images happened to be preloaded here.
//
// WHAT THROWS: a path INSIDE this repo — `/assets/…`, `assets/…`, `./assets/…`. The author wrote a
// file that is not there, the write site is theirs, and nothing downstream can recover it.
// WHAT STAYS SOFT, deliberately:
//   · an `http(s)` URL — a dead CDN or an offline render is not an author error, and hard-failing a
//     film because a network hiccup ate one logo trades a hole in a frame for no film at all.
//   · a `data:` URI — it cannot 404; if it fails to decode the string itself is the bug and the
//     decoder says so.
//   · anything that is not a repo path. This walk reads EVERY string in the scene, not just image
//     slots, so a text layer reading "hero.png" is picked up too (one shipped film does exactly that,
//     formats/scene/ab-skill-shotcode.json). A bare filename is not a path into this repo, so it is
//     never grounds to refuse a film — the shape of the string is what separates the two, and it is
//     the only thing this walk knows.
// Measured across the 147 scenes in formats/scene/: zero of them name a repo-local image that is
// absent, so nothing shipped changes.
export async function preloadImages(data) {
  const urls = new Map(); // src → where it was written, for the refusal
  // an image extension (any source) OR an http(s) URL (web logos can be extensionless).
  // NOT bare assets/ or / paths — those also match audio (assets/music.wav) and aren't images.
  const isImg = (v) => typeof v === 'string' &&
    (/\.(svg|png|jpe?g|webp|gif)$/i.test(v) || /^https?:\/\/\S+$/.test(v));
  const walk = (o, at) => {
    if (Array.isArray(o)) o.forEach((v, i) => walk(v, `${at}[${i}]`));
    else if (o && typeof o === 'object') Object.entries(o).forEach(([k, v]) => walk(v, at ? `${at}.${k}` : k));
    else if (isImg(o) && !urls.has(o)) urls.set(o, at);
  };
  walk(data, '');
  const isRepoPath = (s) => /^\.?\/?assets\//.test(s) || (s.startsWith('/') && !s.startsWith('//'));
  const missing = [];
  await Promise.all([...urls.keys()].map((src) => new Promise((res) => {
    const im = new Image();
    im.onload = () => (im.decode ? im.decode().then(res, res) : res());
    im.onerror = () => { if (isRepoPath(src)) missing.push(src); res(); };
    im.src = src;
  })));
  if (missing.length)
    throw new Error(`${missing.length === 1 ? 'this image was' : 'these images were'} never loaded: `
      + `${missing.map((s) => `${urls.get(s)} → "${s}"`).join(' · ')}. `
      + `Either the file does not exist, or its path is outside the roots the render server allows `
      + `(core/, themes/, formats/, assets/, .vawe-data/scenes/, .vawe-data/uploads/). `
      + `Capture or fetch it (\`make assets D=<scene> WRITE=1\`), or drop the layer — a repo path that `
      + `404s renders as a hole in the frame and says nothing.`);
}

// Footage has to be DECODED before the first seek, for the same reason images are decoded before the
// first paint: a capture that starts on an unloaded source shoots a blank box and says nothing. Waits
// for `loadeddata` (frame 0 available), not `canplaythrough`, because this engine seeks and never plays,
// so buffering ahead buys nothing and would stall a render on a long clip.
async function preloadVideos(data) {
  const urls = new Set();
  const isVid = (v) => typeof v === 'string' && /\.(mp4|webm|mov|m4v)$/i.test(v);
  const walk = (o) => {
    if (Array.isArray(o)) o.forEach(walk);
    else if (o && typeof o === 'object') Object.values(o).forEach(walk);
    else if (isVid(o)) urls.add(o);
  };
  walk(data);
  await Promise.all([...urls].map((src) => new Promise((res) => {
    const v = document.createElement('video');
    v.muted = true; v.preload = 'auto';
    // Resolve on error too. A missing clip is caught by the assets preflight with a path in the message;
    // hanging the boot here would report it as a dead scene instead.
    v.onloadeddata = res; v.onerror = res;
    v.src = src;
  })));
}

// resolveTheme(spec): spec is "name" (→ fetch themes/name.json) | inline object. REQUIRED —
// no spec or a failed fetch throws; nothing silently substitutes a look.
export async function resolveTheme(spec) {
  if (typeof spec === 'string' && spec) {
    const res = await fetch(`/themes/${spec}.json`);
    if (!res.ok) throw new Error(`theme "${spec}" not found (themes/${spec}.json) — no default look exists`);
    return await res.json();
  }
  if (isObj(spec)) return spec;
  throw new Error('data.theme is required (a theme name or an inline theme object) — no default look exists');
}

// applyTheme(theme): assert the contract, then write the palette/gradient/font vars onto :root.
// The ONLY writer of look CSS — tokens.css carries fonts + geometry, never colors or type choices.
export function applyTheme(theme) {
  const missing = themeErrors(theme);
  if (missing.length) throw new Error(`theme "${theme?.name || 'inline'}" incomplete — missing ${missing.join(', ')}`);
  const root = document.documentElement.style;
  const set = (k, v) => { if (v != null) root.setProperty(k, v); };
  const P = theme.palette || {};
  set('--bg', P.bg); set('--bg-2', P.bg2); set('--surface', P.surface); set('--surface-2', P.surface2);
  set('--card', P.card || deriveCard(P)); // raised card surface (blocks use var(--card))
  set('--line', P.line); set('--line-strong', P.lineStrong);
  set('--text', P.text); set('--text-2', P.text2); set('--dim', P.dim); set('--ink', P.ink);
  set('--up', P.up); set('--up-2', P.up2); set('--down', P.down);
  // A THIRD STATUS COLOUR, optional to declare and always present. Every theme ships `up` and `down`,
  // so a status vocabulary that needs three (ok / warn / danger) was two thirds theme-aware and one
  // third a literal: blocks/kit.mjs TONES.warn was a hardcoded amber no brand could ever repaint.
  // Two independent audits found the same gap on the same day.
  // Defaulted rather than REQUIRED, following `--card` two lines up: adding it to the contract's
  // required list would fail all 38 shipped themes until each was hand-edited, for a colour most of
  // them have no opinion about. A theme that does have one declares `palette.warn` and wins.
  set('--warn', P.warn || '#F6A417');
  set('--accent', P.accent); set('--accent-dim', P.accentDim); set('--accent-glow', P.accentGlow);
  set('--accent-2', P.accent2); set('--grid', P.grid); set('--grid-2', P.grid2);
  set('--glass', P.glass); set('--highlight', P.highlight);
  (theme.gradient || []).forEach((c, i) => set(`--g${i}`, c));
  const T = theme.type || {};
  set('--font-sans', `'${T.sans}'`);
  set('--font-num', `'${T.num}'`);
  set('--font-serif', `'${T.serif}'`);
  set('--font-mono', `'${T.mono}'`);
  // raw passthrough: theme.vars = { "--anything": "value" } for scene-local custom props.
  if (isObj(theme.vars)) for (const [k, v] of Object.entries(theme.vars)) set(k, v);
}

// ---------- virtual clock: determinism is COERCED, not just required ----------
// Scene code (and any third-party lib it pulls in) sees time and randomness as pure functions of
// the current frame: Date.now / new Date() / performance.now return frame-time, rAF callbacks
// flush exactly once per rendered frame, timers fire when the virtual clock passes their due time,
// and Math.random is reseeded per frame (mulberry32) so stochastic code is byte-identical across
// runs and render orders. Installed once in boot(); __vt.set(n, fps) runs before every
// renderFrame(n). (The another engine VIRTUAL_TIME_SHIM idea, adapted to the boot() contract.)
export function installVirtualClock() {
  if (typeof window === 'undefined' || window.__vt) return window?.__vt;
  const vt = { ms: 0, frame: 0 };
  // the renderer needs REAL frame callbacks to await paint before screenshots — keep a handle
  // to the native rAF before we virtualize it for scene code.
  window.__realRaf = window.requestAnimationFrame.bind(window);
  // a REAL timer too — scene code sees a virtualized setTimeout (fires only on __vt.set), but the
  // seam bake needs a wall-clock fallback to time-bound async work during boot (old --headless
  // starves rAF before first paint, so nothing that awaits a real frame can be relied on there).
  window.__realTimeout = window.setTimeout.bind(window);
  const nativeRaf = window.requestAnimationFrame.bind(window);
  const nativeCancelRaf = window.cancelAnimationFrame.bind(window);
  const nativeSetTimeout = window.setTimeout.bind(window);
  const nativeSetInterval = window.setInterval.bind(window);
  const nativeClear = window.clearTimeout.bind(window);
  const RealDate = Date;
  const rafQ = new Map(); let rafId = 0;
  const timers = new Map(); let timerId = 0;
  // Date / performance.now / Math.random are virtualized IMMEDIATELY: the seam bake renders frames at
  // build time and MUST see seeded, frame-pure time+randomness so every worker bakes identical
  // textures. These three never affect chromedp's rAF-driven readiness Poll, so it is safe to swap
  // them up front.
  window.Date = class extends RealDate {
    constructor(...a) { if (a.length) super(...a); else super(vt.ms); }
    static now() { return vt.ms; }
  };
  performance.now = () => vt.ms;
  let rnd = 0;
  Math.random = () => { rnd = (rnd + 0x6d2b79f5) | 0; let t = Math.imul(rnd ^ (rnd >>> 15), 1 | rnd); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  // Timers (rAF / setTimeout / setInterval) are virtualized LAZILY, on the first real render. chromedp
  // waits for window.__engineReady in "raf" polling mode — it re-checks inside requestAnimationFrame.
  // If rAF is virtualized during boot (queued, flushed only on __vt.set), that Poll starves and the
  // render deadlocks whenever readiness is delayed (e.g. by the awaited seam bake). So page timers stay
  // NATIVE through boot+bake — Poll ticks, readiness is observed — and only flip to virtual when the
  // render loop actually begins, where scene rAF/timer code must be frame-pure. (MISTAKES: seam bake.)
  let timersVirtual = false;
  const virtualizeTimers = () => {
    if (timersVirtual) return; timersVirtual = true;
    window.requestAnimationFrame = (cb) => { rafQ.set(++rafId, cb); return rafId; };
    window.cancelAnimationFrame = (id) => { rafQ.delete(id); };
    window.setTimeout = (cb, delay = 0, ...a) => { if (typeof cb !== 'function') return 0; timers.set(++timerId, { at: vt.ms + Number(delay || 0), cb, a }); return timerId; };
    window.setInterval = (cb, every = 1e9, ...a) => window.setTimeout(cb, every, ...a); // one-shot per pass — enough for chrome spinners
    window.clearTimeout = window.clearInterval = (id) => { timers.delete(id); };
  };
  window.__vt = {
    // the RENDER path: virtualize timers (idempotent) then advance the clock and flush the queues.
    set(frame, fps) {
      virtualizeTimers();
      vt.frame = frame; vt.ms = (frame / fps) * 1000;
      rnd = (frame * 2654435761) | 0; // reseed: same frame → same random sequence
      for (const [id, tm] of [...timers]) if (tm.at <= vt.ms) { timers.delete(id); tm.cb(...tm.a); }
      const q = [...rafQ.values()]; rafQ.clear(); for (const cb of q) cb(vt.ms);
    },
    // the BAKE path: advance frame time + reseed RNG ONLY, WITHOUT virtualizing timers — so the
    // readiness Poll's native rAF keeps ticking while the bake runs. No timer/rAF flush is needed:
    // renderFrame is pure in the frame it is given and the bake never awaits a scene timer.
    setBake(frame, fps) {
      vt.frame = frame; vt.ms = (frame / fps) * 1000;
      rnd = (frame * 2654435761) | 0;
    },
    now: () => vt.ms,
    nativeRaf, nativeCancelRaf, nativeSetTimeout, nativeSetInterval, nativeClear,
  };
  return window.__vt;
}

// boot a scene: load fonts, fetch the data param, build the scene, expose window.__engine.
//   build(data, fps, theme) -> { fps, duration, stings, sfx, renderFrame(n) }
// Film grain is applied as a post-process at encode time (ffmpeg), not here — the CSS/canvas
// approach never composited in headless Chrome, so it was removed.
export async function boot(build) {
  const params = new URLSearchParams(location.search);
  const dataUrl = params.get('data');
  const fps = Number(params.get('fps')) || FPS;
  try {
    try {
      // Load every face the CSS declares. This list used to be hardcoded, which meant a newly
      // vendored family rendered as a generic until someone remembered to add it here — that is
      // exactly how Geist, Anybody and Manrope each shipped wrong. It is now DERIVED from the
      // @font-face rules, so vendoring a font is the only step. See core/fonts.js.
      await loadRegistered();
    } catch (e) {}
    if (!dataUrl) throw new Error('no ?data= in the scene URL — nothing names the JSON to render');
    const data = await fetchJson(dataUrl, 'scene data');
    // validate data + inline theme against the format's schema BEFORE building/rendering — a bad
    // JSON fails here with a readable message instead of a broken video (or a wasted render).
    if (data.module) {
      try {
        const schema = await fetchJson(`/formats/${data.module}/schema.json`, 'schema');
        const errors = validateAll(schema, data);
        if (errors.length) throw new Error(`invalid data for "${data.module}":\n  - ${errors.join('\n  - ')}`);
      } catch (e) {
        if (e instanceof Error && e.message.startsWith('invalid data')) throw e; // real validation error
        // schema missing/unparseable → skip validation (don't block on tooling gaps)
      }
    }
    // canvas SIZE by aspect. Priority: ?aspect= URL param (multi-output render) > data.aspect >
    // orientation fallback (the historic 16:9 / 9:16 defaults). The meta dims flow to the Go renderer,
    // which sizes its screenshot to them — so one source renders at any aspect with no engine change.
    const landscape = data.orientation === 'landscape' || data.orient === 'landscape';
    const aspectKey = params.get('aspect') || data.aspect || (landscape ? '16:9' : '9:16');
    // ONE FRAME OBJECT, built once, pre-first-frame: size, ratio, destination and the safe box in a
    // single value that everything downstream RECEIVES. Nothing computes the frame twice — this used
    // to be a sceneDims() call here and a safeArea() call thirty lines below, which is the shape that
    // let the audit overlay and resolveCoords disagree about where the bottom edge was.
    const frame = frameOf(data, aspectKey);
    const { W: width, H: height, safe } = frame;
    document.documentElement.dataset.orient = width > height ? 'landscape' : 'portrait';
    document.documentElement.dataset.aspect = aspectKey;
    // The canvas is set HERE, from the aspect we just resolved, never inferred from data-orient. It used
    // to come only from tokens.css, which keys on portrait/landscape — a binary that cannot describe five
    // ratios. So 1:1 and 4:5 got a 1080x1920 stage and 4:3 got a 1920x1080 one: the stage was not the
    // frame, it was a standard stage with the overflow cropped off. Anything anchored to the stage rather
    // than to a layer (a background, the .hs-cap bar at bottom:300px) landed outside the visible frame.
    const rootStyle = document.documentElement.style;
    rootStyle.setProperty('--vw', width + 'px');
    rootStyle.setProperty('--vh', height + 'px');
    // ONE safe area, the frame object's own, written to CSS so the ?debug=safe overlay draws the SAME box
    // the audit checks and resolveCoords places against. `destination` names the chrome (a phone feed
    // paints over the frame; a website does not) and defaults to `web`, so a tall canvas no longer
    // inherits TikTok's caption strip merely for being tall.
    rootStyle.setProperty('--safe-top', safe.y0 + 'px');
    rootStyle.setProperty('--safe-bottom', (height - safe.y1) + 'px');
    rootStyle.setProperty('--safe-left', safe.x0 + 'px');
    rootStyle.setProperty('--safe-right', (width - safe.x1) + 'px');
    if (params.get('alpha')) document.documentElement.classList.add('alpha'); // transparent overlay export
    // PER-ASPECT OVERRIDES. Some beats genuinely need a different COMPOSITION at 9:16 than at 16:9, not
    // the same one re-solved: a two-column split has no portrait equivalent, it becomes a stack. Until
    // now there was no way to say so, so "any aspect" held only while the author hand-tuned one ratio
    // and hoped. `at` is a map of aspect key -> partial layer props, merged over the layer for THIS
    // canvas only. Applied BEFORE resolveCoords so an overridden w/h/x/y resolves like any other.
    const applyAt = (ls) => { for (const L of ls || []) {
      if (!L || typeof L !== 'object') continue;
      if (L.aspects && L.aspects[aspectKey]) Object.assign(L, L.aspects[aspectKey]);
      if (L.children) applyAt(L.children);
    } };
    applyAt(data.layers);
    // `cameraMove` sugar → real `camera` keys BEFORE the per-aspect override pass, so an authored move's
    // keys can be overridden per canvas like any hand-written one.
    bakeCameraMove(data, frame);
    if (data.camera) for (const k of data.camera) if (k && k.aspects && k.aspects[aspectKey]) Object.assign(k, k.aspects[aspectKey]);
    // `?bounds` turns on the settled-off-frame REPORT inside resolveCoords. Read before it runs, and it
    // only prints: nothing about a render changes, so renderFrame(n) stays a pure function of n.
    if (params.get('bounds') != null) globalThis.__FRAME_BOUNDS_CHECK = true;
    resolveCoords(data, width, height, safe, frame); // relative coords (%, center, edge, pin) → px for THIS canvas
    const theme = await resolveTheme(data.theme); // taste: palette/gradient/fonts/motion
    produceBaseline(data, theme, frame); // FORCE the produced baseline (living bg · camera · sceneUnits) into any
    // scene that didn't specify it — absent-only, theme-aware, additive (never rewrites an authored layer),
    // `"produced":false` opts out. Pure: mutates data once, pre-first-frame, so renderFrame stays deterministic.
    // Nothing downstream reads `cameraMove` (renderFrame reads data.camera). If one survives this far it
    // is a field written and then ignored — the failure this whole path exists to make impossible.
    if (data.cameraMove) throw new Error('cameraMove survived produceBaseline — it would render as nothing');
    applyTheme(theme); // once, pre-first-frame — pure (identical every frame)
    // load the fonts the THEME actually declares (not just the static list above) at every weight a
    // scene might use — so a brand's face is never silently swapped for the generic fallback. This is
    // the "load what you use" rule (how another engine ties each font to a render-blocking handle).
    try {
      const fams = [...new Set(Object.values(theme.type || {}))].filter(Boolean);
      await Promise.all(fams.flatMap((fam) => [400, 500, 600, 700, 800].map((w) => document.fonts.load(`${w} 100px '${fam}'`))));
      // ransom stamps its OWN faces (incl. weight 900 + italics) onto glyphs after build, so the theme's
      // type map never lists them; without loading them here the first frame races the font download and
      // the note renders non-deterministically. Same detect-in-the-JSON idiom as the lazy three.js load.
      if (JSON.stringify(data).includes('"ransom"')) {
        // Load the NORMAL file for every face unconditionally: an italic face whose @font-face is
        // normal-only (Fraunces) is painted as a synthesised oblique of the normal file, so THAT is
        // what must be ready — awaiting only the italic variant matches nothing and leaves the real
        // font racing. Where a true italic file exists (Instrument Serif) load it too. allSettled so
        // one unmatched style never aborts the batch.
        await Promise.allSettled(RANSOM_FACES.flatMap((f) => {
          const loads = [document.fonts.load(`${f.weight} 100px '${f.family}'`)];
          if (f.italic) loads.push(document.fonts.load(`italic ${f.weight} 100px '${f.family}'`));
          return loads;
        }));
      }
      await document.fonts.ready;
    } catch (e) {}
    // The awaited readiness phase: one preloader per asset kind (core/preload.js), each populating a
    // static window.__* table BEFORE the virtual clock, so renderFrame(n) never touches async and stays
    // pure in n. Order preserved from when these were inlined here (spectrum → images → three → canvasFx
    // → components → clips → lottie). three, html and images throw loudly if what they need is absent —
    // a missing runtime, a missing fragment or a repo-local file that 404s leaves a hole nothing can
    // recover — the rest degrade quietly. Images name the write site and the path (preloadImages above);
    // a REMOTE image stays soft on purpose, since a dead CDN is not the author's mistake.
    await preloadSpectrum(data);
    await preloadImages(data); // web/local images ready before any frame is captured
    await preloadVideos(data); // and footage decoded to its first frame, so the first seek has a source
    await preloadThree(data);
    await preloadCobe(data);
    await preloadCanvasFx(data);
    await preloadComponents(data);
    await preloadHtml(data);
    await preloadEmbeddedImages(); // the <img>s inside what those two just fetched
    await preloadClips(data);
    await preloadLottie(data);
    await preloadGsap(data);
    await preloadRansomSprites(data);
    const vclock = installVirtualClock(); // before build(): scene closures see only virtual time
    // `safe` rides along so the scene view can hand it to a layer without a second call to safeArea:
    // the safe box is a function of destination as well as size, and two callers computing it is how
    // the audit overlay and resolveCoords once disagreed about where the bottom edge was. That
    // instinct is now the law, and `frame` below is the whole of it in one value.
    // The frame rides along WHOLE, beside the width/height/safe keys the view already reads. That is
    // what lets createKit hand every layer primitive a frame without a second safeArea() call and
    // without a signature change at any of the call sites.
    const scene = build(data, fps, theme, { width, height, aspect: aspectKey, safe, frame });
    // SEAM D: rasterise the beats either side of every seam into static textures ONCE, before the
    // render loop. Awaited here (async raster is fine at build); renderFrame then only samples them,
    // so it stays pure in n. A scene with no `seams` returns immediately — zero cost, zero DOM change.
    if (typeof scene.bakeSeams === 'function') {
      try { await scene.bakeSeams(); } catch (e) { console.warn('seam bake:', e); }
    }
    const totalFrames = Math.round(scene.duration * fps);
    if (params.get('debug') === 'safe') document.querySelector('.stage')?.classList.add('debug-safe');
    window.__engine = {
      meta: { fps, duration: scene.duration, totalFrames, width, height, stings: scene.stings || [], sfx: scene.sfx || [], bridges: scene.bridges || [], segments: scene.segments || [] },
      renderFrame: (n) => { vclock.set(n, fps); scene.renderFrame(n); },
      // Font audit is a FUNCTION, not a value: it inspects the families the DOM actually asks for,
      // so it must run against a rendered frame (layers that are not up yet declare nothing).
      auditFonts: () => auditFonts(document.querySelector('.stage')),
    };
    // frameSig(n): cheap content signature for the renderer's static-frame dedup — covers every
    // per-frame write (inline styles/text/attrs via innerHTML) plus canvas pixels (downsampled
    // through a 24×14 probe; drawImage works for 2d AND webgl-with-preserveDrawingBuffer).
    // Unreadable canvases poison the hash with the frame number → those frames never dedup.
    {
      const probe = document.createElement('canvas'); probe.width = 24; probe.height = 14;
      const pctx = probe.getContext('2d', { willReadFrequently: true });
      const fnv = (h, s) => { for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } return h; };
      window.__engine.frameSig = (n) => {
        window.__engine.renderFrame(n);
        let h = fnv(2166136261, document.body.innerHTML);
        for (const cv of document.querySelectorAll('canvas')) {
          if (!cv.width || cv.style.display === 'none') continue;
          // visible 2D canvases repaint time-varying fx (grain/drift) BELOW probe resolution —
          // proven by an anchor-verification failure. Never dedup frames where one is live.
          if (cv.getContext('2d')) { h = fnv(h, 'live2d:' + n); continue; }
          try { // webgl overlays (shader stings) are keyed draws — sampling them is sound
            pctx.clearRect(0, 0, 24, 14); pctx.drawImage(cv, 0, 0, 24, 14);
            const d = pctx.getImageData(0, 0, 24, 14).data;
            let acc = '';
            for (let i = 0; i < d.length; i += 8) acc += d[i] + ',' + d[i + 3] + ';';
            h = fnv(h, acc);
          } catch (e) { h = fnv(h, 'opaque-canvas:' + n); }
        }
        return h.toString(36);
      };
    }
    // Signal readiness BEFORE the warm first frame. renderFrame() is what first virtualizes the page
    // timers (via the clock), and chromedp observes __engineReady in rAF-polling mode — so readiness
    // must be visible while rAF is still native. The warm renderFrame(0) then flips timers to virtual;
    // the Poll's already-scheduled native rAF callback still fires and catches the flag.
    window.__engineReady = true;
    window.__engine.renderFrame(0);
  } catch (e) {
    window.__engineError = String(e && e.stack ? e.stack : e);
    document.title = 'ENGINE_ERROR';
  }
}
