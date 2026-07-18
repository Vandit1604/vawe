// Vawe Company License 1.0 — see LICENSE at the repository root.
// core/boot.js — the scene RUNTIME lifted out of core/motion.js: theme resolution + CSS apply,
// the deterministic virtual clock, image/component preload, and boot() (fetch data → validate →
// build → expose window.__engine). Imports pure helpers from ./motion.js. DOM/fetch live here only.
import { FPS } from './motion.js';
import { themeErrors } from './theme-contract.js';
import { validateAll } from './validate.mjs';
import { safeArea, ASPECTS } from './safe.js';
import { bakeCanvasFx, canvasFxKey } from './canvas-fx.js';
import { loadRegistered, auditFonts } from './fonts.js';

const isObj = (o) => o && typeof o === 'object' && !Array.isArray(o);

// ---- tiny hex utils for deriving palette vars the theme didn't declare (e.g. --card) ----
const hexToRgb = (h) => { let s = String(h).replace('#', ''); if (s.length === 3) s = s.split('').map((c) => c + c).join(''); const n = parseInt(s, 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
const rgbToHex = (a) => '#' + a.map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
const mixHex = (a, b, t) => { try { const A = hexToRgb(a), B = hexToRgb(b); return rgbToHex(A.map((v, i) => v + (B[i] - v) * t)); } catch { return a; } };
const luma = (h) => { try { const [r, g, b] = hexToRgb(h).map((v) => v / 255); return 0.2126 * r + 0.7152 * g + 0.0722 * b; } catch { return 1; } };
// deriveCard: a raised CARD surface. Lighten the theme's surface toward white on light themes, lift it
// gently on dark — so elevated block cards read correctly on any brand that didn't declare palette.card.
const deriveCard = (P) => { const base = P.surface || P.bg || '#ffffff'; return mixHex(base, '#ffffff', luma(P.bg || base) > 0.55 ? 0.55 : 0.1); };

// ---- multi-aspect: canvas sizes + a pure relative-coordinate resolver ----
// One source renders at any platform ratio. Absolute px coords pass through unchanged (back-compat);
// relative coords resolve against THIS canvas's W,H so the SAME layer lands right in every aspect.

// resolveCoords(data, W, H): mutate top-level layer x/y/w/h from relative forms to px. Forms:
//   number            → px (unchanged)
//   "50%" / "50%-40"  → fraction of the canvas dim (± an offset)
//   "center"          → centered given the layer's size
//   "left/right/top/bottom" → anchored to that edge inside a per-aspect safe inset
//   pin: "center|top|bottom|left|right|top-left|…" → shorthand for the x/y edge pair
export function resolveCoords(data, W, H, safe = safeArea(W, H, 'web')) {
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
  for (const L of data.layers || []) {
    if (!isObj(L)) continue;
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
}

// preloadImages: walk the data JSON for image-like strings (local paths, /…, or http(s)
// URLs — incl. user-supplied web image links) and fully load+decode them BEFORE the scene
// reports ready. Without this the Go renderer can screenshot a frame mid-download → a missing
// image on some frames. onerror also resolves so a dead link falls back (icon()) without hanging.
async function preloadImages(data) {
  const urls = new Set();
  // an image extension (any source) OR an http(s) URL (web logos can be extensionless).
  // NOT bare assets/ or / paths — those also match audio (assets/music.wav) and aren't images.
  const isImg = (v) => typeof v === 'string' &&
    (/\.(svg|png|jpe?g|webp|gif)$/i.test(v) || /^https?:\/\/\S+$/.test(v));
  const walk = (o) => {
    if (Array.isArray(o)) o.forEach(walk);
    else if (o && typeof o === 'object') Object.values(o).forEach(walk);
    else if (isImg(o)) urls.add(o);
  };
  walk(data);
  await Promise.all([...urls].map((src) => new Promise((res) => {
    const im = new Image();
    im.onload = () => (im.decode ? im.decode().then(res, res) : res());
    im.onerror = () => res();
    im.src = src;
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
  const RealDate = Date;
  const rafQ = new Map(); let rafId = 0;
  const timers = new Map(); let timerId = 0;
  window.Date = class extends RealDate {
    constructor(...a) { if (a.length) super(...a); else super(vt.ms); }
    static now() { return vt.ms; }
  };
  performance.now = () => vt.ms;
  window.requestAnimationFrame = (cb) => { rafQ.set(++rafId, cb); return rafId; };
  window.cancelAnimationFrame = (id) => { rafQ.delete(id); };
  window.setTimeout = (cb, delay = 0, ...a) => { if (typeof cb !== 'function') return 0; timers.set(++timerId, { at: vt.ms + Number(delay || 0), cb, a }); return timerId; };
  window.setInterval = (cb, every = 1e9, ...a) => window.setTimeout(cb, every, ...a); // one-shot per pass — enough for chrome spinners
  window.clearTimeout = window.clearInterval = (id) => { timers.delete(id); };
  let rnd = 0;
  Math.random = () => { rnd = (rnd + 0x6d2b79f5) | 0; let t = Math.imul(rnd ^ (rnd >>> 15), 1 | rnd); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  window.__vt = {
    set(frame, fps) {
      vt.frame = frame; vt.ms = (frame / fps) * 1000;
      rnd = (frame * 2654435761) | 0; // reseed: same frame → same random sequence
      for (const [id, tm] of [...timers]) if (tm.at <= vt.ms) { timers.delete(id); tm.cb(...tm.a); }
      const q = [...rafQ.values()]; rafQ.clear(); for (const cb of q) cb(vt.ms);
    },
    now: () => vt.ms,
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
    const data = await (await fetch(dataUrl)).json();
    // validate data + inline theme against the format's schema BEFORE building/rendering — a bad
    // JSON fails here with a readable message instead of a broken video (or a wasted render).
    if (data.module) {
      try {
        const schema = await (await fetch(`/formats/${data.module}/schema.json`)).json();
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
    const [width, height] = ASPECTS[aspectKey] || (landscape ? [1920, 1080] : [1080, 1920]);
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
    // ONE safe area, from core/safe.js, written to CSS so the ?debug=safe overlay draws the SAME box the
    // audit checks and resolveCoords places against. `destination` names the chrome (a phone feed paints
    // over the frame; a website does not) and defaults to `web`, so a tall canvas no longer inherits
    // TikTok's caption strip merely for being tall.
    const safe = safeArea(width, height, data.destination || 'web');
    rootStyle.setProperty('--safe-top', safe.y0 + 'px');
    rootStyle.setProperty('--safe-bottom', (height - safe.y1) + 'px');
    rootStyle.setProperty('--safe-left', safe.x0 + 'px');
    rootStyle.setProperty('--safe-right', (width - safe.x1) + 'px');
    if (params.get('alpha')) document.documentElement.classList.add('alpha'); // transparent overlay export
    resolveCoords(data, width, height, safe); // relative coords (%, center, edge, pin) → px for THIS canvas
    const theme = await resolveTheme(data.theme); // taste: palette/gradient/fonts/motion
    applyTheme(theme); // once, pre-first-frame — pure (identical every frame)
    // load the fonts the THEME actually declares (not just the static list above) at every weight a
    // scene might use — so a brand's face is never silently swapped for the generic fallback. This is
    // the "load what you use" rule (how another engine ties each font to a render-blocking handle).
    try {
      const fams = [...new Set(Object.values(theme.type || {}))].filter(Boolean);
      await Promise.all(fams.flatMap((fam) => [400, 500, 600, 700, 800].map((w) => document.fonts.load(`${w} 100px '${fam}'`))));
      await document.fonts.ready;
    } catch (e) {}
    await preloadImages(data); // web/local images ready before any frame is captured
    // Tier-2 CANVAS FX: bake each image with a `canvasFx` (halftone/dither/mosaic/…) ONCE here, in the
    // awaited readiness phase, into a static PNG data-URL. image.js then swaps the <img> src to it, so
    // the pixels are static at frame time → renderFrame(n) stays byte-identical (probe/snap prove it).
    window.__canvasFx = {};
    const cfxJobs = [];
    (function scan(o) { if (Array.isArray(o)) o.forEach(scan); else if (o && typeof o === 'object') { if (o.type === 'image' && o.canvasFx && typeof o.src === 'string') cfxJobs.push({ src: o.src, spec: o.canvasFx }); Object.values(o).forEach(scan); } })(data);
    for (const job of cfxJobs) {
      const key = canvasFxKey(job.src, job.spec);
      if (window.__canvasFx[key]) continue;
      try {
        const img = await new Promise((res, rej) => { const im = new Image(); im.crossOrigin = 'anonymous'; im.onload = () => (im.decode ? im.decode().then(() => res(im), () => res(im)) : res(im)); im.onerror = rej; im.src = job.src; });
        const url = bakeCanvasFx(img, job.spec);
        if (url) window.__canvasFx[key] = url;
      } catch (e) { /* missing/tainted source → image.js falls back to the raw <img> */ }
    }
    // preload captured components (real UI lifted off a site by scripts/capture-component.mjs) so a
    // `component` scene can inject real HTML synchronously. Any string like /…/components/x.json.
    window.__components = {};
    const compPaths = new Set();
    (function scan(o) { if (Array.isArray(o)) o.forEach(scan); else if (o && typeof o === 'object') Object.values(o).forEach(scan); else if (typeof o === 'string' && /\/(components|scenes)\/[^/]+\.json$/.test(o)) compPaths.add(o); })(data);
    for (const p of compPaths) { try { window.__components[p] = await (await fetch(p)).json(); } catch (e) {} }
    // preload generated CLIPS (scripts/gen-clip.mjs): any "/…/manifest.json" string is a frame-sequence
    // manifest {fps,w,h,frames:[url]}. Decode EVERY frame up front so the `clip` layer can swap an <img>
    // src per renderFrame(n) with zero async — deterministic playback of a generated/any video.
    window.__clips = {};
    const clipPaths = new Set();
    (function scan(o) { if (Array.isArray(o)) o.forEach(scan); else if (o && typeof o === 'object') Object.values(o).forEach(scan); else if (typeof o === 'string' && /\/manifest\.json$/.test(o)) clipPaths.add(o); })(data);
    for (const p of clipPaths) {
      try {
        const man = await (await fetch(p)).json();
        window.__clips[p] = man;
        await Promise.all((man.frames || []).map((src) => new Promise((res) => { const im = new Image(); im.onload = () => (im.decode ? im.decode().then(res, res) : res()); im.onerror = () => res(); im.src = src; })));
      } catch (e) {}
    }
    // preload LOTTIE animation data (After Effects / Bodymovin JSON). A `lottie` layer references its
    // src; fetch each once so build() can init the runtime synchronously and seek it per frame.
    window.__lottie = {};
    const lottieSrcs = new Set();
    (function scan(o) { if (Array.isArray(o)) o.forEach(scan); else if (o && typeof o === 'object') { if (o.type === 'lottie' && typeof o.src === 'string') lottieSrcs.add(o.src); Object.values(o).forEach(scan); } })(data);
    if (lottieSrcs.size) {
      // load the runtime ONLY when a scene uses it (no 168KB parse tax on text-only renders). Before the
      // virtual clock so no rAF is captured at load; onerror resolves so a missing lib degrades, not hangs.
      if (!window.lottie) await new Promise((res) => { const s = document.createElement('script'); s.src = '/assets/vendor/lottie_light.min.js'; s.onload = res; s.onerror = res; document.head.appendChild(s); });
      for (const p of lottieSrcs) { try { window.__lottie[p] = await (await fetch(p)).json(); } catch (e) {} }
    }
    const vclock = installVirtualClock(); // before build(): scene closures see only virtual time
    const scene = build(data, fps, theme, { width, height, aspect: aspectKey });
    const totalFrames = Math.round(scene.duration * fps);
    if (params.get('debug') === 'safe') document.querySelector('.stage')?.classList.add('debug-safe');
    window.__engine = {
      meta: { fps, duration: scene.duration, totalFrames, width, height, stings: scene.stings || [], sfx: scene.sfx || [], segments: scene.segments || [] },
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
    window.__engine.renderFrame(0);
    window.__engineReady = true;
  } catch (e) {
    window.__engineError = String(e && e.stack ? e.stack : e);
    document.title = 'ENGINE_ERROR';
  }
}
