// Licensed under the Apache License 2.0: see LICENSE at the repository root.
// core/boot.js. The scene RUNTIME lifted out of core/motion.js: theme resolution + CSS apply,
// the deterministic virtual clock, image/component preload, and boot() (fetch data → validate →
// build → expose window.__engine). Imports pure helpers from ./motion.js. DOM/fetch live here only.
import { FPS } from '../motion/motion.js';
import { bakeResamples } from '../resample/index.js';
import { glLive } from './webgl.js';
import '../layers/frame-settle.js'; // installs window.__frameSettle, the capture's async barrier
import { canvasKind } from '../canvas/kind.js'; // records each canvas's context kind at creation
import { themeErrors, resolveLook, REQUIRED, ON_INK_MIN, ON_INK, WARN_DEFAULT } from '../registry/theme-contract.js';
import { isLightBg, parseColor, colorAlpha, contrastRatio, ensureContrast } from '../color/engine.js';
import { expandTheme, isTokenFile } from '../theme/roles.js';
import { resolveTokens } from '../theme/tokens.js';
import { resolveTokenRefs } from '../theme/refs.js';
import { validateAll } from '../validate/validate.mjs';
import { produceBaseline, bakeCameraMove, bakeCursorCarry, bakeDepth, bakeFocus, bakeTextSizeRoles } from './produce.js';

// Every layer at every depth, for the survived-sugar check below. Local because it is two lines and
// exists only to prove a bake ran; the render's own walks are elsewhere and read more than the type.
const flatDepth = (ls) => (ls || []).flatMap((L) => (L && typeof L === 'object')
  ? [L, ...flatDepth(L.children), ...flatDepth(L.layers)] : []);
import { assertKeyHandles } from '../timeline/sequence.js';
import { bakeTimeRemap } from '../timeline/time.js';
import { loadBeatGrid } from '../beats/index.js';
import { safeArea, PLACEMENT, COMPOSITION_MARGIN, CAPTION_SKINS, CAPTION_LINES, captionSkin, frameOf, reportBounds, boundsCheckOn } from '../layout/safe.js';
import { loadRegistered, auditFonts, assertFamilies } from './fonts.js';
import { preloadEmbeddedImages, preloadSpectrum, preloadThree, preloadCobe, preloadCanvasFx, preloadComponents, preloadHtml, preloadClips, preloadLottie, preloadGsap, preloadRansomSprites, fetchJson } from './preload.js';
import { RANSOM_FACES } from '../type/ransom.js';
import { srcUrl } from './src-url.js';

const isObj = (o) => o && typeof o === 'object' && !Array.isArray(o);

// ---- tiny hex utils for deriving palette vars the theme didn't declare (e.g. --card) ----
const hexToRgb = (h) => { let s = String(h).replace('#', ''); if (s.length === 3) s = s.split('').map((c) => c + c).join(''); const n = parseInt(s, 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
const rgbToHex = (a) => '#' + a.map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
const mixHex = (a, b, t) => { try { const A = hexToRgb(a), B = hexToRgb(b); return rgbToHex(A.map((v, i) => v + (B[i] - v) * t)); } catch { return a; } };
// deriveCard: a raised CARD surface. Lighten the theme's surface toward white on light themes, lift it
// gently on dark, so elevated block cards read correctly on any brand that didn't declare palette.card.
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

// keywords place a layer of `size` on a canvas line. TWO different lines, on purpose:
//   • EDGES (left/right/top/bottom) resolve against the SAFE BOX, so an edge pin can never produce a
//     safe-zone failure.
//   • CENTRE / OPTICAL / THIRDS resolve against the CANVAS, because centred means centred; the safe
//     box is deliberately asymmetric on a phone feed and centring in it would push a hero off-centre.
// `size` is the layer's declared extent on this axis, 0 when unset. `est` is the same thing with a
// text-height fallback, used ONLY by the far edges (right/bottom): with size 0 they would place the
// layer's near edge on the far safe line and hang the whole layer outside it.
function coordKeyword(v, dim, size, lo, hi, est) {
  return v === 'center' ? (dim - size) / 2
    : v === 'optical' ? dim * 0.46 - size / 2
    : v === 'third1' ? dim / 3 - size / 2
    : v === 'third2' ? (2 * dim) / 3 - size / 2
    : (v === 'left' || v === 'top') ? lo
    : (v === 'right' || v === 'bottom') ? hi - est
    // roughly two-thirds down the safe box: PLACEMENT's "text-band", the y half of `pin:"text-band"`.
    : v === 'text-band' ? lo + 0.63 * (hi - lo)
    // the composition column's left edge: COMPOSITION_MARGIN of the canvas width, never inside the
    // safe box's own bleed/chrome inset (`lo`).
    : v === 'stage-left' ? Math.max(lo, dim * COMPOSITION_MARGIN)
    : null;
}

function resolveCoord(v, dim, size, lo, hi, est = size) {
  if (typeof v !== 'string') return v;
  const s = v.trim();
  const k = coordKeyword(s, dim, size, lo, hi, est); if (k != null) return Math.round(k);
  const m = s.match(/^(-?[\d.]+)%\s*([+-]\s*[\d.]+)?$/);
  if (m) return Math.round((parseFloat(m[1]) / 100) * dim + (m[2] ? parseFloat(m[2].replace(/\s+/g, '')) : 0));
  const n = parseFloat(s); return isNaN(n) ? v : n;
}

// Children were never walked, so `pin`, `col`, `gutter` and string coords ("50%", "center") were
// inert inside a group (MISTAKES #70). `applyAt` already recurses; this did not.
function flattenLayers(ls) {
  const out = [];
  (function walk(list) { for (const L of list || []) { if (!isObj(L)) continue; out.push(L); if (L.children) walk(L.children); } })(ls);
  return out;
}

function applyLayerPin(L, PIN, W, safe) {
  if (!(L.pin && PIN[L.pin])) return;
  const [px, py, wFrac] = PIN[L.pin];
  if (px != null && L.x == null) L.x = px;
  if (py != null && L.y == null) L.y = py;
  // `stage`'s width nobody has to hand-type: a fraction of the safe box for a generic edge pin, or
  // (for `stage-left`) the composition margin's own right edge, mirrored off the CANVAS but never
  // past the safe box's own bound: a destination with an asymmetric chrome rail (tiktok's right rail
  // eats more than the left) must clamp the right edge to `safe.x1`, or the column overruns the rail
  // by exactly the asymmetry `Math.max(safe.x0, …)` alone cannot see. Applied only when the layer
  // declares none of its own.
  if (wFrac != null && L.w == null) {
    L.w = px === 'stage-left'
      ? Math.round(Math.min(safe.x1, W - W * COMPOSITION_MARGIN) - Math.max(safe.x0, W * COMPOSITION_MARGIN))
      : Math.round(wFrac * (safe.x1 - safe.x0));
  }
}

// 12-col grid: col "3" (one column) or "2-7" (a span) → x + w from a gutter grid (col overrides pin-x).
// The grid spans the SAFE box, not the canvas: a column layout under a platform's rail is not a layout.
function applyLayerCol(L, safe, inset) {
  if (L.col == null) return;
  const cols = L.cols || 12, g = L.gutter ?? Math.round(inset * 0.5);
  const gridW = safe.x1 - safe.x0;
  const colW = (gridW - (cols - 1) * g) / cols;
  const mm = String(L.col).match(/^(\d+)(?:-(\d+))?$/);
  if (!mm) return;
  const c1 = +mm[1], c2 = mm[2] ? +mm[2] : c1;
  L.x = Math.round(safe.x0 + (c1 - 1) * (colW + g));
  L.w = Math.round((c2 - c1 + 1) * colW + (c2 - c1) * g);
}

function resolveLayerCoords(data, W, H, safe, inset, PIN) {
  for (const L of flattenLayers(data.layers)) {
    applyLayerPin(L, PIN, W, safe);
    applyLayerCol(L, safe, inset);
    if (typeof L.w === 'string') L.w = resolveCoord(L.w, W, 0, safe.x0, safe.x1);
    if (typeof L.h === 'string') L.h = resolveCoord(L.h, H, 0, safe.y0, safe.y1);
    const w = typeof L.w === 'number' ? L.w : 0, h = typeof L.h === 'number' ? L.h : 0;
    // A text layer rarely declares `h`, so estimate it from the font size for the bottom edge; there
    // is deliberately no equivalent for width (a string's rendered width cannot be known before layout).
    const hEst = h || (L.type === 'text' && L.size ? L.size * 1.2 : h);
    if (L.x != null) L.x = resolveCoord(L.x, W, w, safe.x0, safe.x1);
    if (L.y != null) L.y = resolveCoord(L.y, H, h, safe.y0, safe.y1, hEst);
  }
}

// CAPTIONS PLACE WITH THE SAME GRAMMAR AS LAYERS: the same `pin` table, the same edge keywords, the
// same "50%" strings and the same safe box, rather than a second placement grammar for one job.
// A PIN MOVES THE CAPTION VERTICALLY AND, WITHOUT A WIDTH, ONLY VERTICALLY: a caption declares no
// width by default (scene.css pins both edges), so the x-keyword waits for a `w` to centre against.
function resolveCaptionCoords(data, W, H, safe, PIN) {
  const capDefaults = CAPTION_SKINS[captionSkin(data)];
  for (const C of data.captions || []) {
    if (!isObj(C)) continue;
    if (C.pin && PIN[C.pin]) {
      const [px, py] = PIN[C.pin];
      if (C.x == null && C.w != null) C.x = px;
      if (C.y == null) C.y = py;
    }
    if (typeof C.w === 'string') C.w = resolveCoord(C.w, W, 0, safe.x0, safe.x1);
    const w = typeof C.w === 'number' ? C.w : 0;
    // A caption never declares a height and its band is two lines by contract (CAPTION_LINES), so
    // `pin:"bottom"` has a real extent to subtract.
    const hEst = CAPTION_LINES * Math.ceil((C.size || capDefaults.fontPx) * 1.05);
    if (C.x != null) C.x = resolveCoord(C.x, W, w, safe.x0, safe.x1);
    if (C.y != null) C.y = resolveCoord(C.y, H, 0, safe.y0, safe.y1, hEst);
  }
}

export function resolveCoords(data, W, H, safe = safeArea(W, H, 'web'), frame = null) {
  // pin → [x-keyword, y-keyword, widthFraction?]. Read from core/layout/safe.js PLACEMENT, the one
  // table core/validate/validate.mjs's degenerate-pin check and films/scene/schema.json's `pin`
  // enum also read now, in place of the three hand-kept copies this used to be.
  const PIN = PLACEMENT;
  resolveLayerCoords(data, W, H, safe, safe.margin, PIN);
  resolveCaptionCoords(data, W, H, safe, PIN);

  // THE BOUNDS CHECK LIVES HERE, at the one funnel where a relative coordinate becomes a pixel. It
  // grades only SETTLED boxes (a layer sliding in from off-frame is a legitimate entrance,
  // engine-doctrine/MISTAKES.md #376), report only (never throws), and TOP-LEVEL LAYERS ONLY: a
  // group child's x/y is relative to its group.
  return boundsCheckOn()
    ? reportBounds((data.layers || []).filter(isObj), frame || { W, H, safe })
    : [];
}

// preloadImages: walk the data JSON for image-like strings (local paths, /…, or http(s)
// URLs, incl. user-supplied web image links) and fully load+decode them BEFORE the scene
// reports ready. Without this the Go renderer can screenshot a frame mid-download → a missing
// image on some frames. onerror also resolves so a dead link falls back (icon()) without hanging.
// A REPO-LOCAL IMAGE THAT 404s IS INVALID INPUT, AND IT THROWS. This used to degrade quietly: the
// frame simply had a hole in it, and the author found out from a preflight script or from looking at
// the render. That is the same failure `htmlSource` refuses one file over (a fragment `src` that never
// loaded), graded differently only because images happened to be preloaded here.
//
// WHAT THROWS: a path INSIDE this repo, `/assets/…`, `assets/…`, `./assets/…`. The author wrote a
// file that is not there, the write site is theirs, and nothing downstream can recover it.
// WHAT STAYS SOFT, deliberately:
//   · an `http(s)` URL: a dead CDN or an offline render is not an author error, and hard-failing a
//     film because a network hiccup ate one logo trades a hole in a frame for no film at all.
//   · a `data:` URI. It cannot 404; if it fails to decode the string itself is the bug and the
//     decoder says so.
//   · anything that is not a repo path. This walk reads EVERY string in the scene, not just image
//     slots, so a text layer reading "hero.png" is picked up too (one shipped film does exactly that,
//     films/scene/ab-skill-shotcode.json). A bare filename is not a path into this repo, so it is
//     never grounds to refuse a film. The shape of the string is what separates the two, and it is
//     the only thing this walk knows.
// Measured across the 147 scenes in films/scene/: zero of them name a repo-local image that is
// absent, so nothing shipped changes.
export async function preloadImages(data) {
  const urls = new Map(); // src → where it was written, for the refusal
  // an image extension (any source) OR an http(s) URL (web logos can be extensionless).
  // NOT bare assets/ or / paths: those also match audio (assets/music.wav) and aren't images.
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
    im.src = srcUrl(src);
  })));
  if (missing.length)
    throw new Error(`${missing.length === 1 ? 'this image was' : 'these images were'} never loaded: `
      + `${missing.map((s) => `${urls.get(s)} → "${s}"`).join(' · ')}. `
      + `Either the file does not exist, or its path is outside the roots the render server allows `
      + `(core/, themes/, films/, assets/, .vawe-data/scenes/, .vawe-data/uploads/). `
      + `Capture or fetch it (\`make assets D=<scene> WRITE=1\`), or drop the layer, a repo path that `
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
    v.src = srcUrl(src);
  })));
}

// resolveTheme(spec): spec is "name" (→ fetch themes/name.json) | inline object. REQUIRED.
// No spec or a failed fetch throws; nothing silently substitutes a look.
//
// TOKEN-FILE ADAPTER: every theme on disk is now `tokens` + `roles` (core/theme/tokens.js,
// core/theme/roles.js), not a hand-written `palette`/`type`/`gradient` object. `expandTheme` is the ONE
// place that adapter runs on the render path, so applyTheme/themeErrors below, and every other consumer
// that reads `theme.palette.X`, never has to know the file on disk changed shape at all. A theme still
// written in the retired shape (`isTokenFile` false) throws, naming `migrate-themes.mjs`, the same
// fail-loud posture as everything else in this function.
export async function fetchThemeFile(spec) {
  if (isObj(spec)) return spec;
  if (typeof spec !== 'string' || !spec) throw new Error('data.theme is required (a theme name or an inline theme object), no default look exists');
  const res = await fetch(`/themes/${spec}.json`);
  if (!res.ok) throw new Error(`theme "${spec}" not found (themes/${spec}.json), no default look exists`);
  return res.json();
}

export async function resolveTheme(spec) {
  const raw = await fetchThemeFile(spec);
  return isTokenFile(raw) ? expandTheme(raw, { parseColor, colorAlpha }) : raw;
}

// resolveThemeTokenValues(spec): the SAME token-file fetch resolveTheme does, but returning the raw
// resolved token map (not the legacy palette/type/gradient adapter), for scene JSON `"{path}"`
// references (core/theme/refs.js). Themes not written as a token file resolve no tokens: an old-shape
// scene using a `{ref}` string would have thrown the same "not a colour" error before this existed, so
// nothing regresses for it.
export async function resolveThemeTokenValues(spec) {
  let raw;
  if (typeof spec === 'string' && spec) {
    const res = await fetch(`/themes/${spec}.json`);
    if (!res.ok) return new Map();
    raw = await res.json();
  } else if (isObj(spec)) {
    raw = spec;
  } else {
    return new Map();
  }
  if (!isTokenFile(raw)) return new Map();
  return resolveTokens(raw.tokens || {}, { parseColor, colorAlpha }).values;
}

// applyTheme(theme, target): assert the contract, then write the palette/gradient/font vars onto
// `target`, :root by default. A host page that is not a scene (the site's playground) passes its
// own element so the theme cannot repaint the page it is embedded in.
// The ONLY writer of look CSS: tokens.css carries fonts + geometry, never colors or type choices.
export function applyTheme(theme, target = document.documentElement) {
  const missing = themeErrors(theme, { parseColor, contrastRatio });
  if (missing.length) throw new Error(`theme "${theme?.name || 'inline'}" incomplete, missing ${missing.join(', ')}`);
  const root = target.style;
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
  set('--warn', P.warn || WARN_DEFAULT);
  set('--accent', P.accent); set('--accent-dim', P.accentDim); set('--accent-glow', P.accentGlow);
  // WHAT COLOUR READS *ON* A FILL. Nothing could answer that, so every block that filled a surface
  // with a theme colour guessed, and they all guessed white: pricingCard's featured CTA is white on
  // higgsfield's acid lime at 1.16:1, and a checklist tick was white on `--up` at 1.25:1 there and
  // 2.50:1 on linear. `onColor()` in blocks/kit.mjs cannot help, it grades a literal hex, and a block
  // only ever holds `var(--accent)` or `var(--up)`, a string that becomes a colour in the browser long
  // after the factory returned. The theme is the one place these ARE values, so the decision is made
  // here, once per fill, and every consumer receives it.
  // NOT the theme's own `ink`: `ink` is the primary text colour, which on a dark theme is nearly WHITE
  // (higgsfield ships #f4f5f0), so white-vs-ink leaves 11 of 38 themes below 4.5:1 with both candidates
  // light, and on the amber `--warn` it measures 1.87:1 on higgsfield, which is what `badge` shipped.
  // White vs black, winner takes it, clears all 152 theme x fill pairs with a floor of 4.69:1 (white
  // alone fails 112 of them, black alone a different 40). White preferred wherever it already reads.
  // Defaulted rather than required, exactly as `--warn` above: a theme with an opinion declares
  // `palette.onAccent` / `onUp` / `onDown` / `onWarn`, and theme-contract.js refuses that opinion if it
  // cannot be read. The four are enumerated in ON_INK there, so this loop and the validator agree by
  // construction rather than by two lists somebody keeps in step.
  for (const { on, fill, cssVar, fallback } of ON_INK) {
    const ground = Object.hasOwn(P, fill) ? P[fill] : fallback;   // `fill` is contract-checked at import
    const override = P[on];                                       // graded by themeErrors above, so it reads
    set(cssVar, override || ensureContrast('#ffffff', ground, { min: ON_INK_MIN, light: '#ffffff', dark: '#000000' }));
  }
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
// renderFrame(n). (A virtual-time-shim pattern, adapted to the boot() contract.)
export function installVirtualClock() {
  if (typeof window === 'undefined' || window.__vt) return window?.__vt;
  const vt = { ms: 0, frame: 0 };
  // the renderer needs REAL frame callbacks to await paint before screenshots, keep a handle
  // to the native rAF before we virtualize it for scene code.
  window.__realRaf = window.requestAnimationFrame.bind(window);
  // a REAL timer too: scene code sees a virtualized setTimeout (fires only on __vt.set), but the
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
  // waits for window.__engineReady in "raf" polling mode. It re-checks inside requestAnimationFrame.
  // If rAF is virtualized during boot (queued, flushed only on __vt.set), that Poll starves and the
  // render deadlocks whenever readiness is delayed (e.g. by the awaited seam bake). So page timers stay
  // NATIVE through boot+bake (Poll ticks, readiness is observed) and only flip to virtual when the
  // render loop actually begins, where scene rAF/timer code must be frame-pure. (MISTAKES: seam bake.)
  let timersVirtual = false;
  const virtualizeTimers = () => {
    if (timersVirtual) return; timersVirtual = true;
    window.requestAnimationFrame = (cb) => { rafQ.set(++rafId, cb); return rafId; };
    window.cancelAnimationFrame = (id) => { rafQ.delete(id); };
    window.setTimeout = (cb, delay = 0, ...a) => { if (typeof cb !== 'function') return 0; timers.set(++timerId, { at: vt.ms + Number(delay || 0), cb, a }); return timerId; };
    window.setInterval = (cb, every = 1e9, ...a) => window.setTimeout(cb, every, ...a); // one-shot per pass, enough for chrome spinners
    window.clearTimeout = window.clearInterval = (id) => { timers.delete(id); };
  };
  window.__vt = {
    // the RENDER path: virtualize timers (idempotent) then advance the clock and flush the queues.
    set(frame, fps) {
      virtualizeTimers();
      vt.frame = frame; vt.ms = (frame / fps) * 1000;
      rnd = (frame * 2654435761) | 0; // reseed: same frame → same random sequence
      // timers is mutated (delete) mid-loop, so the snapshot is required, not a style choice.
      // oxlint-disable-next-line unicorn/no-useless-spread
      for (const [id, tm] of [...timers]) if (tm.at <= vt.ms) { timers.delete(id); tm.cb(...tm.a); }
      const q = [...rafQ.values()]; rafQ.clear(); for (const cb of q) cb(vt.ms);
    },
    // the BAKE path: advance frame time + reseed RNG ONLY, WITHOUT virtualizing timers, so the
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
// Film grain is applied as a post-process at encode time (ffmpeg), not here, the CSS/canvas
// approach never composited in headless Chrome, so it was removed.
// Load every face the CSS declares, derived from the @font-face rules (core/fonts.js) rather than a
// hand-kept list, so vendoring a font is the only step.
async function loadRegisteredFontsBestEffort() {
  try { await loadRegistered(); } catch { /* best-effort */ }
}

// Validates data + inline theme against the format's schema BEFORE building/rendering. A schema
// that is missing or unparseable skips validation (a tooling gap, not a data error); a real
// validation error re-throws.
async function validateSceneData(data) {
  if (!data.module) return;
  try {
    const schema = await fetchJson(`/films/${data.module}/schema.json`, 'schema');
    const errors = validateAll(schema, data);
    if (errors.length) throw new Error(`invalid data for "${data.module}":\n  - ${errors.join('\n  - ')}`);
  } catch (e) {
    if (e instanceof Error && e.message.startsWith('invalid data')) throw e;
  }
}

// PER-ASPECT OVERRIDES: `aspects` is a map of aspect key -> partial layer props, merged over the
// layer for THIS canvas only, applied before resolveCoords so an overridden w/h/x/y resolves like
// any other.
function applyAspectOverrides(ls, aspectKey) {
  for (const L of ls || []) {
    if (!L || typeof L !== 'object') continue;
    if (L.aspects && L.aspects[aspectKey]) Object.assign(L, L.aspects[aspectKey]);
    if (L.children) applyAspectOverrides(L.children, aspectKey);
  }
}

// `?nobg=1` swaps the backdrop for a flat plain/dark ground so a film's motion can be measured with
// the ground removed, without a second scene file (which would change the tone the layers were
// authored against).
function applyNobgParam(data, params) {
  if (params.get('nobg') == null) return;
  const tone = (Array.isArray(data.bg) ? data.bg[0] : data.bg)?.tone;
  const dark = tone === 'dark' || /dark|deep|ink/.test(String((Array.isArray(data.bg) ? data.bg[0] : data.bg)?.preset || ''));
  data.bg = [{ preset: dark ? 'dark' : 'plain' }];
}

// ONE FRAME OBJECT, built once, pre-first-frame: size, ratio, destination and the safe box in a
// single value everything downstream receives, so the audit overlay and resolveCoords can never
// disagree about where the bottom edge is (they used to be two separate calls).
function resolveRenderFrame(data, params) {
  const landscape = data.orientation === 'landscape' || data.orient === 'landscape';
  const aspectKey = params.get('aspect') || data.aspect || (landscape ? '16:9' : '9:16');
  const frame = frameOf(data, aspectKey);
  const { W: width, H: height, safe } = frame;
  document.documentElement.dataset.orient = width > height ? 'landscape' : 'portrait';
  document.documentElement.dataset.aspect = aspectKey;
  const rootStyle = document.documentElement.style;
  rootStyle.setProperty('--vw', width + 'px');
  rootStyle.setProperty('--vh', height + 'px');
  rootStyle.setProperty('--safe-top', safe.y0 + 'px');
  rootStyle.setProperty('--safe-bottom', (height - safe.y1) + 'px');
  rootStyle.setProperty('--safe-left', safe.x0 + 'px');
  rootStyle.setProperty('--safe-right', (width - safe.x1) + 'px');
  if (params.get('alpha')) document.documentElement.classList.add('alpha'); // transparent overlay export
  applyAspectOverrides(data.layers, aspectKey);
  // `cameraMove` sugar → real `camera` keys BEFORE the per-aspect override pass, so an authored
  // move's keys can be overridden per canvas like any hand-written one.
  bakeCameraMove(data, frame);
  if (data.camera) for (const k of data.camera) if (k && k.aspects && k.aspects[aspectKey]) Object.assign(k, k.aspects[aspectKey]);
  bakeCursorCarry(data); // `carry` sugar on a `cursor` layer → a real `follow` on the dragged layer
  applyNobgParam(data, params);
  if (params.get('bounds') != null) globalThis.__FRAME_BOUNDS_CHECK = true;
  return { frame, width, height, safe, aspectKey };
}

function bakeTimeRemaps(data) {
  // `timeRemap` resolves ONCE, here, rather than per frame inside layerTime: a bad key list names
  // its layer at boot, and remapAt runs the same handle solver a motion track gets.
  for (const L of flatDepth(data.layers)) {
    if (L.timeRemap == null) continue;
    bakeTimeRemap(L);
    assertKeyHandles(L.timeRemap, `layer "${L.id || L.type || '?'}" timeRemap`);
  }
}

function checkNoSurvivingDepth(data) {
  for (const L of flatDepth(data.layers)) if (L.depth != null)
    throw new Error(`\`depth\` survived bakeDepth on a ${L.type || 'text'} layer, it would render as nothing`);
}

// Theme, token refs, look and every produce-time bake, in the order resolveCoords and
// produceBaseline need them (theme before resolveCoords, camera baked before depth/focus).
async function resolveThemeAndBake(data, frame, width, height, safe) {
  const rawTheme = await fetchThemeFile(data.theme);
  const theme = await resolveTheme(rawTheme); // taste: palette/gradient/fonts/motion
  const tokenValues = await resolveThemeTokenValues(rawTheme);
  Object.assign(data, resolveTokenRefs(data, tokenValues));
  const look = resolveLook(theme, { isLightBg, portrait: height > width }); // the whole-film default (engine-doctrine/CRAFT/THEME-LOOK.md)
  bakeTextSizeRoles(data, look);
  resolveCoords(data, width, height, safe, frame); // relative coords (%, center, edge, pin) → px
  produceBaseline(data, theme, frame, look);
  if (data.cameraMove) throw new Error('cameraMove survived produceBaseline, it would render as nothing');
  bakeDepth(data);
  bakeFocus(data);
  assertKeyHandles(data.camera, 'camera');
  bakeTimeRemaps(data);
  checkNoSurvivingDepth(data);
  applyTheme(theme); // once, pre-first-frame: pure (identical every frame)
  return theme;
}

// The fonts the THEME actually declares, at every weight a scene might use, so a brand's face is
// never silently swapped for the generic fallback. Best-effort: assertFamilies below is the real
// check, since document.fonts.load() does not refuse a face it cannot fetch.
async function loadThemeFonts(theme, data) {
  try {
    const fams = [...new Set(Object.values(theme.type || {}))].filter(Boolean);
    await Promise.all(fams.flatMap((fam) => [400, 500, 600, 700, 800].map((w) => document.fonts.load(`${w} 100px '${fam}'`))));
    // ransom stamps its own faces onto glyphs after build, so the theme's type map never lists them.
    if (JSON.stringify(data).includes('"ransom"')) {
      await Promise.allSettled(RANSOM_FACES.flatMap((f) => {
        const loads = [document.fonts.load(`${f.weight} 100px '${f.family}'`)];
        if (f.italic) loads.push(document.fonts.load(`italic ${f.weight} 100px '${f.family}'`));
        return loads;
      }));
    }
    await document.fonts.ready;
    // Two real rAFs: document.fonts.ready can fulfil a tick before the compositor has actually
    // rasterized the face, which intermittently measures the fallback for a font that really loaded.
    await new Promise((r) => requestAnimationFrame(r));
    await new Promise((r) => requestAnimationFrame(r));
  } catch { /* best-effort */ }
  assertFamilies(REQUIRED.type.map((k) => (theme.type || {})[k]), `theme "${theme?.name || 'inline'}"`);
}

// One preloader per asset kind (core/preload.js), each populating a static window.__* table before
// the virtual clock so renderFrame(n) never touches async. three/html/images throw loudly on a
// missing runtime, fragment or repo-local 404; the rest degrade quietly.
async function preloadAllAssets(data) {
  await preloadSpectrum(data);
  await preloadImages(data);
  await preloadVideos(data);
  await preloadThree(data);
  await preloadCobe(data);
  await preloadCanvasFx(data);
  await preloadComponents(data);
  await preloadHtml(data);
  await preloadEmbeddedImages();
  await preloadClips(data);
  await preloadLottie(data);
  await preloadGsap(data);
  await preloadRansomSprites(data);
}

// SEAM D + RESAMPLE BAKE: rasterise the beats either side of every seam, and any resample target
// with no raster of its own, into static textures ONCE before the render loop. Resamples bake first
// because bakeSeams drives renderFrame itself and would leave the DOM on an arbitrary frame.
async function bakeSceneSeams(scene) {
  await bakeResamples();
  if (typeof scene.bakeSeams === 'function') {
    try { await scene.bakeSeams(); } catch (e) { console.warn('seam bake:', e); }
  }
}

function wireEngine(scene, fps, width, height, vclock, data) {
  const totalFrames = Math.round(scene.duration * fps);
  window.__engine = {
    meta: { fps, duration: scene.duration, totalFrames, width, height, stings: scene.stings || [], sfx: scene.sfx || [], bridges: scene.bridges || [], beatSync: scene.beatSync || '' },
    // the SAME object build()'s closures read every frame, so a dev tool can mutate a layer's
    // motion/vars in place (studio/ui/studio.js:offsetAt already assumed this) and reseek with no
    // reload. renderFrame(n) stays pure in n: a real render never mutates this, only local tooling does.
    data,
    renderFrame: (n) => { vclock.set(n, fps); scene.renderFrame(n); },
    auditFonts: () => auditFonts(document.querySelector('.stage')),
  };
}

// frameSig(n): cheap content signature for the renderer's static-frame dedup: every per-frame DOM
// write plus canvas pixels, downsampled through a 24x14 probe. A LIVE 2D canvas (grain/drift below
// probe resolution) never dedups; canvasKind, never getContext, which would itself create a context
// on the meta tab and rasterize it differently from every worker (engine-doctrine/MISTAKES.md #507).
function installFrameSig() {
  const probe = document.createElement('canvas'); probe.width = 24; probe.height = 14;
  const pctx = probe.getContext('2d', { willReadFrequently: true });
  const fnv = (h, s) => { for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } return h; };
  window.__engine.frameSig = (n) => {
    window.__engine.renderFrame(n);
    let h = fnv(2166136261, document.body.innerHTML);
    for (const cv of document.querySelectorAll('canvas')) {
      if (!cv.width || cv.style.display === 'none') continue;
      const kind = canvasKind(cv);
      if (!kind) continue;
      if (kind === '2d') { h = fnv(h, 'live2d:' + n); continue; }
      try {
        pctx.clearRect(0, 0, 24, 14); pctx.drawImage(cv, 0, 0, 24, 14);
        const d = pctx.getImageData(0, 0, 24, 14).data;
        let acc = '';
        for (let i = 0; i < d.length; i += 8) acc += d[i] + ',' + d[i + 3] + ';';
        h = fnv(h, acc);
      } catch { h = fnv(h, 'opaque-canvas:' + n); }
    }
    return h.toString(36);
  };
}

// A LOST CONTEXT IS THE CAP ARRIVING BY THE OTHER DOOR: past ~16 concurrent WebGL contexts some
// drivers drop an OLDER one rather than refuse a new one, exit 0, no error. Checked here, before
// readiness goes up, and named rather than recovered: recovery would make a frame depend on when
// the loss happened, which renderFrame(n) forbids.
function checkWebglLive() {
  const { live, lost } = glLive();
  if (lost) throw new Error(`${lost} of ${live} WebGL contexts were lost before the first frame. `
    + `Browsers cap concurrent contexts at roughly 16 and some drivers drop an OLDER one rather `
    + `than refuse a new one, so those layers would render BLANK with no error. Use fewer `
    + `WebGL-backed layers at once (shader · paint · raymarch · three · globe · sting · seam · a `
    + `resampled layer takes one each), or split the beats so they do not co-exist.`);
}

export async function boot(build) {
  const params = new URLSearchParams(location.search);
  const dataUrl = params.get('data');
  const fps = Number(params.get('fps')) || FPS;
  try {
    await loadRegisteredFontsBestEffort();
    if (!dataUrl) throw new Error('no ?data= in the scene URL, nothing names the JSON to render');
    const data = await fetchJson(dataUrl, 'scene data');
    await validateSceneData(data);
    const { frame, width, height, safe, aspectKey } = resolveRenderFrame(data, params);
    const theme = await resolveThemeAndBake(data, frame, width, height, safe);
    await loadThemeFonts(theme, data);
    await preloadAllAssets(data);
    // The beat grid the scene names, fetched ONCE here (I/O belongs at boot, never in a frame).
    const beats = await loadBeatGrid(data, fetchJson);
    const vclock = installVirtualClock(); // before build(): scene closures see only virtual time
    const scene = build(data, fps, theme, { width, height, aspect: aspectKey, safe, frame, beats });
    await bakeSceneSeams(scene);
    if (params.get('debug') === 'safe') document.querySelector('.stage')?.classList.add('debug-safe');
    wireEngine(scene, fps, width, height, vclock, data);
    installFrameSig();
    checkWebglLive();
    // Signal readiness BEFORE the warm first frame: renderFrame() first virtualizes the page timers,
    // and chromedp observes __engineReady in rAF-polling mode while rAF is still native.
    window.__engineReady = true;
    window.__engine.renderFrame(0);
  } catch (e) {
    window.__engineError = String(e && e.stack ? e.stack : e);
    document.title = 'ENGINE_ERROR';
  }
}
