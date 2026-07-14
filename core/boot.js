// core/boot.js — the scene RUNTIME lifted out of core/motion.js: theme resolution + CSS apply,
// the deterministic virtual clock, image/component preload, and boot() (fetch data → validate →
// build → expose window.__engine). Imports pure helpers from ./motion.js. DOM/fetch live here only.
import { FPS } from './motion.js';
import { themeErrors } from './theme-contract.js';
import { validateAll } from '../scripts/validate.mjs';

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
const ASPECTS = { '16:9': [1920, 1080], '9:16': [1080, 1920], '1:1': [1080, 1080], '4:5': [1080, 1350], '4:3': [1440, 1080] };

// resolveCoords(data, W, H): mutate top-level layer x/y/w/h from relative forms to px. Forms:
//   number            → px (unchanged)
//   "50%" / "50%-40"  → fraction of the canvas dim (± an offset)
//   "center"          → centered given the layer's size
//   "left/right/top/bottom" → anchored to that edge inside a per-aspect safe inset
//   pin: "center|top|bottom|left|right|top-left|…" → shorthand for the x/y edge pair
export function resolveCoords(data, W, H) {
  const inset = Math.round(Math.min(W, H) * 0.06); // platform safe margin
  const kw = (v, dim, size) => v === 'center' ? (dim - size) / 2
    : (v === 'left' || v === 'top') ? inset
    : (v === 'right' || v === 'bottom') ? dim - inset - size : null;
  const num = (v, dim, size) => {
    if (typeof v !== 'string') return v;
    const s = v.trim();
    const k = kw(s, dim, size); if (k != null) return Math.round(k);
    const m = s.match(/^(-?[\d.]+)%\s*([+-]\s*[\d.]+)?$/);
    if (m) return Math.round((parseFloat(m[1]) / 100) * dim + (m[2] ? parseFloat(m[2].replace(/\s+/g, '')) : 0));
    const n = parseFloat(s); return isNaN(n) ? v : n;
  };
  const PIN = { center: ['center', 'center'], top: ['center', 'top'], bottom: ['center', 'bottom'],
    left: ['left', 'center'], right: ['right', 'center'], 'top-left': ['left', 'top'], 'top-right': ['right', 'top'],
    'bottom-left': ['left', 'bottom'], 'bottom-right': ['right', 'bottom'] };
  for (const L of data.layers || []) {
    if (!isObj(L)) continue;
    if (L.pin && PIN[L.pin]) { const [px, py] = PIN[L.pin]; if (L.x == null) L.x = px; if (L.y == null) L.y = py; }
    if (typeof L.w === 'string') L.w = num(L.w, W, 0);
    if (typeof L.h === 'string') L.h = num(L.h, H, 0);
    const w = typeof L.w === 'number' ? L.w : 0, h = typeof L.h === 'number' ? L.h : 0;
    if (L.x != null) L.x = num(L.x, W, w);
    if (L.y != null) L.y = num(L.y, H, h);
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
      // EVERY bundled face must be loaded+decoded here — a face missing from this list falls back to
      // the generic sans (font-display:block), which is the "why does my headline look generic" bug.
      // (Geist was missing → Geist-themed videos silently rendered in Hanken/system sans.)
      const FACES = [
        '400 100px Inter', '600 100px Inter', '700 100px Inter', '800 100px Inter',
        "500 100px 'Space Grotesk'", "700 100px 'Space Grotesk'",
        "400 100px 'Instrument Serif'", "italic 400 100px 'Instrument Serif'",
        "400 100px 'Geist'", "500 100px 'Geist'", "600 100px 'Geist'", "700 100px 'Geist'", "800 100px 'Geist'",
        "400 100px 'Geist Mono'", "600 100px 'Geist Mono'",
        "800 100px 'Plus Jakarta Sans'", "700 100px 'JetBrains Mono'", "400 100px 'Caveat'",
        "400 100px 'Hanken Grotesk'", "700 100px 'Hanken Grotesk'", "800 100px 'Hanken Grotesk'",
      ];
      // also load whatever the theme actually declares, at the weights scenes use, in case it's a face
      // not in the static list above (belt-and-suspenders for future themes).
      await Promise.all(FACES.map((f) => document.fonts.load(f)));
      await document.fonts.ready;
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
    if (params.get('alpha')) document.documentElement.classList.add('alpha'); // transparent overlay export
    resolveCoords(data, width, height); // relative coords (%, center, edge, pin) → px for THIS canvas
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
      if (!window.lottie) await new Promise((res) => { const s = document.createElement('script'); s.src = '/engine/assets/vendor/lottie_light.min.js'; s.onload = res; s.onerror = res; document.head.appendChild(s); });
      for (const p of lottieSrcs) { try { window.__lottie[p] = await (await fetch(p)).json(); } catch (e) {} }
    }
    const vclock = installVirtualClock(); // before build(): scene closures see only virtual time
    const scene = build(data, fps, theme, { width, height, aspect: aspectKey });
    const totalFrames = Math.round(scene.duration * fps);
    if (params.get('debug') === 'safe') document.querySelector('.stage')?.classList.add('debug-safe');
    window.__engine = {
      meta: { fps, duration: scene.duration, totalFrames, width, height, stings: scene.stings || [], sfx: scene.sfx || [], segments: scene.segments || [] },
      renderFrame: (n) => { vclock.set(n, fps); scene.renderFrame(n); },
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
