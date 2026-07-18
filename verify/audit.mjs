// verify/audit.mjs — layout audit: catches what eyes catch but checklists miss.
// Renders each format's sample headless across sampled frames and flags, on [data-layer="critical"]:
//   • overlap   — two critical boxes intersect            (HARD fail)
//   • overflow  — text clipped (scrollW/H > clientW/H)    (HARD fail)
//   • safe-zone — element outside the SAFE box            (HARD fail)
//   • contrast  — text/emphasis vs bg below WCAG, incl. <b>/<em> --em spans & ≈-same-colour
//                 (blue-on-blue); widened to any ≥60px headline text  (HARD on critical, else warn)
//   • tight     — sibling boxes closer than MIN_GAP px    (warn)
// Writes an annotated screenshot of the worst frame per format to /tmp/audit/<format>.png.
//   node verify/audit.mjs [format ...]      (default: all)   ·   make audit
//
// --aspect 16:9,9:16,1:1,4:5 (or `all`) audits the SAME canvas list the renderer would ship, mirroring
// `bin/vawe --aspect a,b,c`. This exists because a scene renders "fine" at every aspect and can be wrong
// at all but one: layout is solved per ratio by hand, so absolute coords tuned to 1920 silently overflow
// 1080. Auditing one aspect while the CLI ships four is a gate that agrees with itself and not with the
// output. Default stays the scene's own aspect, so a single-aspect scene costs nothing.
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer';
import { safeArea, nativeAspect, DESTINATION_NAMES, ASPECTS } from '../core/safe.js';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const formatsDir = path.join(repoRoot, 'formats');
const OUT = '/tmp/audit';
fs.rmSync(OUT, { recursive: true, force: true }); fs.mkdirSync(OUT, { recursive: true });

const MIN_GAP = 8;                                     // px; tighter than this between siblings = warn (cramped)
const SAMPLES = 14;                                    // frames sampled across the timeline


const argv = process.argv.slice(2);
const aspectAt = argv.findIndex((a) => a === '--aspect' || a.startsWith('--aspect='));
let aspectArg = '';
if (aspectAt !== -1) {
  const flag = argv[aspectAt];
  aspectArg = flag.includes('=') ? flag.slice(flag.indexOf('=') + 1) : (argv[aspectAt + 1] || '');
  argv.splice(aspectAt, flag.includes('=') ? 1 : 2);
}
// '' = audit whatever the scene itself declares (the default, and the back-compatible behaviour).
const askedAspects = aspectArg === 'all' ? Object.keys(ASPECTS)
  : aspectArg ? aspectArg.split(',').map((s) => s.trim()).filter(Boolean) : [''];
const badAspect = askedAspects.find((a) => a && !ASPECTS[a]);
if (badAspect) { console.error(`unknown aspect "${badAspect}" — known: ${Object.keys(ASPECTS).join(', ')}, or "all"`); process.exit(2); }

const modules = argv.length ? argv
  : fs.readdirSync(formatsDir).filter((d) => fs.existsSync(path.join(formatsDir, d, 'scene.html')));

// dimsFor(key, cfg): the canvas this audit runs at. An explicit --aspect wins; else the scene's own
// `aspect` field; else `orientation`; else portrait. A ratio the ASPECTS table doesn't name is still
// honoured (a scene may carry any "w:h"), sized to fit the long edge at 1920.
function dimsFor(key, cfg) {
  const named = key || (typeof cfg.aspect === 'string' ? cfg.aspect : '');
  if (named && ASPECTS[named]) return ASPECTS[named];
  const asp = named.includes(':') ? named.split(':').map(Number) : null;
  if (asp && asp[0] && asp[1]) {
    const [aw, ah] = asp;
    if (aw === ah) return [1080, 1080];
    return aw > ah ? [1920, Math.round(1920 * ah / aw)] : [Math.round(1920 * aw / ah), 1920];
  }
  return cfg.orientation === 'landscape' ? [1920, 1080] : [1080, 1920];
}

// The safe box comes from core/safe.js — the SAME function boot.js places against and writes to
// --safe-* for the debug overlay. This file used to carry its own tables (a portrait box, a landscape
// box, and a proportional fallback for everything else), which is how the checker ended up rejecting
// content the engine's own `pin:"bottom"` had just placed. A gate that disagrees with the thing it
// gates is not a gate. The chrome depends on where the video is going, so the scene's `destination`
// decides it; `web` (margin only) is the default.
const safeFor = (vw, vh, cfg) => safeArea(vw, vh, cfg.destination || 'web');

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.woff2': 'font/woff2', '.css': 'text/css',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.mp4': 'video/mp4' };
function startServer() {
  const s = http.createServer((req, res) => {
    const p = path.join(repoRoot, decodeURIComponent(req.url.split('?')[0]).replace(/^\/+/, ''));
    if (!p.startsWith(repoRoot) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); return res.end(); }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(p)] || 'application/octet-stream' });
    fs.createReadStream(p).pipe(res);
  });
  return new Promise((r) => s.listen(0, '127.0.0.1', () => r(s)));
}

// runs in-page: render frame n, measure every visible [data-layer=critical] box, return issues.
function auditFrameFn(n, SAFE, MIN_GAP) {
  window.__engine.renderFrame(n);
  const vis = (el) => { for (let p = el; p && p !== document.body; p = p.parentElement) { const s = getComputedStyle(p); if (s.visibility === 'hidden' || +s.opacity <= 0.05) return false; } return true; };
  const els = [...document.querySelectorAll('[data-layer="critical"]')].filter((el) => {
    const b = el.getBoundingClientRect(); return b.width > 1 && b.height > 1 && vis(el);
  });
  const info = els.map((el) => {
    const b = el.getBoundingClientRect(), s = getComputedStyle(el);
    // overflow only CLIPS (a real bug) when overflow isn't 'visible'; tight line-heights spill
    // visibly and harmlessly, so don't flag those.
    const clipX = s.overflowX !== 'visible', clipY = s.overflowY !== 'visible';
    return { el, id: el.id || (typeof el.className === 'string' ? el.className.split(' ')[0] : el.tagName), t: (el.textContent || '').trim().slice(0, 18),
      x: b.left, y: b.top, r: b.right, btm: b.bottom, clip: (clipX && el.scrollWidth > el.clientWidth + 1) || (clipY && el.scrollHeight > el.clientHeight + 1),
      sw: el.scrollWidth, cw: el.clientWidth, sh: el.scrollHeight, ch: el.clientHeight };
  });
  const issues = [];
  // A layer mid enter-animation (or a moving `out` exit) is intentionally off-position, so its box
  // isn't a real safe-zone breach — only flag safe when the layer is at rest. Default exits fade in
  // place (no movement), so those still get checked. Timing comes from the render's data-* attrs.
  const FPS = (window.__engine && window.__engine.meta && window.__engine.meta.fps) || 30;
  const tNow = n / FPS;
  const midMove = (el) => {
    if (!el || !el.dataset) return false;
    const st = parseFloat(el.dataset.start) || 0;
    const en = el.dataset.enter != null ? parseFloat(el.dataset.enter) : 0.45;
    const du = el.dataset.duration != null ? parseFloat(el.dataset.duration) : Infinity;
    const exD = el.dataset.exitDur != null ? parseFloat(el.dataset.exitDur) : 0.4;
    if (tNow < st + en + 0.06) return true;                                            // entering: moves in
    if (el.dataset.out && du !== Infinity && tNow > st + du - exD - 0.06) return true; // moving exit only
    return false;
  };
  // Safe-zone + overflow on EVERY top-level layer, not just [data-layer=critical]: content that runs
  // off-frame or gets clipped is always a bug regardless of the layer's role (a corner watermark counts).
  // Overlap/tight stay critical-scoped below, because layered overlaps are frequently intentional.
  //
  // The safe box governs LEGIBLE CONTENT — text the viewer must read, imagery they must recognise.
  // Decoration (gradient blobs, glows, hairline rules) routinely bleeds off-frame BY DESIGN, so a
  // layer only earns the safe check when it carries a text node or an image. Text inside a decorative
  // container is still reached: the walker descends, and child text layers are their own .hs-layer.
  const carriesContent = (el) => {
    if (el.querySelector('img, svg')) return true;
    const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    while (w.nextNode()) if (w.currentNode.nodeValue.trim()) return true;
    return false;
  };
  // What the safe check must measure is what the VIEWER can see. A text layer given a `w` (which it
  // needs, since pin centres a box) paints nothing but glyphs: the container is invisible slack, and
  // centred text leaves half that slack on each side. Measuring the container flags empty air as
  // off-frame and pushes the author to shrink `w` until the BOX fits, which is tuning a number against
  // the tightest ratio, not fixing a layout. So when a layer paints no box of its own (no background,
  // border, or shadow), measure the ink instead — a Range over its contents hugs the real line boxes.
  // Anything that paints (cards, rects, images) keeps its border box, because there the box IS visible.
  const paintsBox = (s) => {
    const bg = s.backgroundColor || '';
    const opaqueBg = !(bg === 'transparent' || /rgba\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*,\s*0\s*\)/.test(bg));
    return opaqueBg || s.backgroundImage !== 'none' || s.boxShadow !== 'none' ||
      parseFloat(s.borderTopWidth) > 0 || parseFloat(s.borderLeftWidth) > 0 ||
      parseFloat(s.borderRightWidth) > 0 || parseFloat(s.borderBottomWidth) > 0;
  };
  const inkRect = (el) => {
    if (el.querySelector('img, svg')) return null;      // replaced content: the element box IS the ink
    const r = document.createRange();
    r.selectNodeContents(el);
    const b = r.getBoundingClientRect();
    return (b.width > 1 && b.height > 1) ? b : null;
  };
  const FW = window.innerWidth, FH = window.innerHeight;
  // `li` = the layer's index in document order. It is the only STABLE per-element identity available:
  // the walk below is over every .hs-layer whether visible or not, so an index means the same element
  // on every frame. The id/class label alone is not an identity — every text layer is `hs-text` — and
  // de-duping on it collapsed N distinct off-frame layers into one reported failure.
  [...document.querySelectorAll('.hs-layer')].forEach((el, li) => {
    if (!vis(el)) return;
    const b = el.getBoundingClientRect();
    if (b.width <= 1 || b.height <= 1) return;
    if (b.width >= FW * 0.9 && b.height >= FH * 0.9) return; // full-bleed backdrop — meant to bleed
    const s = getComputedStyle(el);
    const id = el.id || (typeof el.className === 'string' ? (el.className.split(' ').filter((c) => c !== 'hs-layer')[0] || 'layer') : el.tagName);
    const t = (el.textContent || '').trim().slice(0, 18);
    if ((s.overflowX !== 'visible' && el.scrollWidth > el.clientWidth + 1) || (s.overflowY !== 'visible' && el.scrollHeight > el.clientHeight + 1))
      issues.push({ kind: 'overflow', a: id, li, t, detail: `content ${el.scrollWidth}x${el.scrollHeight} clipped to ${el.clientWidth}x${el.clientHeight}` });
    // Measure what's visible, per axis, because the two axes lie in opposite directions:
    //   HORIZONTAL — use the ink. A centred text layer needs a `w` (pin centres a box), and that `w` is
    //     mostly empty slack; measuring the container flags empty air as off-frame.
    //   VERTICAL — use the border box. The box already hugs the text, whereas the ink is a LINE box and
    //     includes the font's full ascent/descent: with .hs-text's line-height 1.04 (tighter than the
    //     font's natural metrics) the ink overhangs the box by ~4px at size 30, scaling with size. That
    //     overhang is half-leading, not glyphs, so measuring it would fail a layer sitting exactly on
    //     the safe line for content the viewer cannot see.
    const ink = !paintsBox(s) && inkRect(el);
    const sb = ink ? { left: ink.left, right: ink.right, top: b.top, bottom: b.bottom } : b;
    if (!midMove(el) && carriesContent(el) && (sb.left < SAFE.x0 - 1 || sb.right > SAFE.x1 + 1 || sb.top < SAFE.y0 - 1 || sb.bottom > SAFE.y1 + 1))
      issues.push({ kind: 'safe', a: id, li, t, detail: `(${sb.left | 0},${sb.top | 0},${sb.right | 0},${sb.bottom | 0})` });
  });
  // image legibility floor: a standalone logo/image layer must not be smaller than ~5% of the frame
  // height (a 44px logo in a 1080p frame is unreadable). Frame-relative, so it scales to any orientation.
  const MIN_IMG = window.innerHeight * 0.05;
  for (const im of document.querySelectorAll('.hs-img-wrap > img')) {
    if (!vis(im)) continue;
    const b = im.getBoundingClientRect();
    // COLLAPSED image = the layer is on screen but occupies no space, so it renders as nothing. The
    // old `b.height > 1` guard SKIPPED exactly this case, which is how a width-only image layer could
    // silently vanish when cover-fit forced height:100% on a wrapper with no height (MISTAKES #19).
    // Measure the LAYOUT box (offsetWidth/Height), not the painted rect: an image mid-`scale` entry
    // legitimately has a ~0 painted rect, but its layout box is still full size.
    if (im.offsetHeight < 1 || im.offsetWidth < 1) {
      issues.push({ kind: 'collapsed-image', a: (im.getAttribute('src') || 'img').split('/').pop(), detail: `lays out ${im.offsetWidth}x${im.offsetHeight} — visible but occupies no space, renders as nothing` });
      continue;
    }
    if (b.height > 1 && b.height < MIN_IMG) issues.push({ kind: 'tiny-image', a: (im.getAttribute('src') || 'img').split('/').pop(), detail: `${b.height | 0}px tall < ${MIN_IMG | 0}px floor (5% frame h) — logos read at ~7%` });
  }
  // text legibility floor: a text layer rendered below ~1.3% of frame height is unreadable at video
  // distance. Frame-relative so it scales to portrait/landscape.
  const MIN_TXT = window.innerHeight * 0.013;
  for (const tx of document.querySelectorAll('.hs-text')) {
    if (!vis(tx)) continue;
    // Measure the element that actually HOLDS the text (an element with a direct text node), not the
    // layer wrapper. An `html` layer nests its content in a child styled at its own size, so the
    // wrapper's inherited 16px default is not what the viewer sees — walk to the real text holders.
    const holders = [tx, ...tx.querySelectorAll('*')].filter((el) =>
      [...el.childNodes].some((nd) => nd.nodeType === 3 && nd.nodeValue.trim()));
    for (const el of holders) {
      if (!vis(el)) continue;
      if (el.getBoundingClientRect().width <= 1) continue;
      const fs = parseFloat(getComputedStyle(el).fontSize) || 0;
      const t = (el.textContent || '').trim();
      if (fs && t && fs < MIN_TXT) issues.push({ kind: 'tiny-text', a: t.slice(0, 16), detail: `${fs | 0}px < ${MIN_TXT | 0}px floor (1.3% frame h) — unreadable` });
    }
  }
  // A CROSS-DISSOLVE is two layers deliberately sharing the same box while one fades out and the
  // other fades in. That is the standard way to morph a headline between two states, and reading it
  // as a collision would make dissolves unusable — the gate would forbid a technique the engine
  // ships. Only exempt a genuine hand-off: both partly transparent, one exiting while the other
  // enters. Two solid overlapping layers are still a hard fail.
  const fading = (el) => {
    if (!el || !el.dataset || el.dataset.start == null) return null;
    const st = parseFloat(el.dataset.start) || 0;
    const en = el.dataset.enter != null ? parseFloat(el.dataset.enter) : 0.45;
    const du = el.dataset.duration != null ? parseFloat(el.dataset.duration) : Infinity;
    const exD = el.dataset.exitDur != null ? parseFloat(el.dataset.exitDur) : 0.4;
    if (tNow < st + en) return 'in';
    if (du !== Infinity && tNow > st + du - exD) return 'out';
    return null;
  };
  const crossDissolve = (A, B) => {
    const fa = fading(A.el), fb = fading(B.el);
    if (!fa || !fb || fa === fb) return false;                          // need one in + one out
    const oa = +getComputedStyle(A.el).opacity, ob = +getComputedStyle(B.el).opacity;
    return oa < 0.98 && ob < 0.98;                                      // both mid-blend, neither solid
  };
  for (let i = 0; i < info.length; i++) for (let j = i + 1; j < info.length; j++) {
    const A = info[i], B = info[j];
    if (A.el.contains(B.el) || B.el.contains(A.el)) continue;          // skip nested pairs
    const ox = Math.min(A.r, B.r) - Math.max(A.x, B.x);                // >0 → overlap on X
    const oy = Math.min(A.btm, B.btm) - Math.max(A.y, B.y);            // >0 → overlap on Y
    if (ox > 2 && oy > 2 && crossDissolve(A, B)) continue;             // intentional hand-off
    if (ox > 2 && oy > 2) { issues.push({ kind: 'overlap', a: A.id, b: B.id, detail: `${ox | 0}x${oy | 0}px` }); continue; }
    let gap = Infinity;                                                // gap only meaningful when they share one axis
    if (ox > 0) gap = Math.min(gap, -oy);
    if (oy > 0) gap = Math.min(gap, -ox);
    if (gap !== Infinity && gap >= 0 && gap < MIN_GAP) issues.push({ kind: 'tight', a: A.id, b: B.id, detail: `${gap | 0}px` });
  }
  // contrast (WCAG-ish) on critical TEXT: effective bg = nearest ancestor solid background-color,
  // else sampled from the bg <canvas> under the element's box, else the body/stage color.
  const lum = ([r, g, b]) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
  // parse: rgb()/rgba() AND color(srgb r g b / a). The second form is what Chromium returns as the
  // COMPUTED value of any color-mix() — and the blocks library mixes colours everywhere (accentSoft
  // pills, card tints, artwork squares). Before this, every such backgroundColor failed to parse, the
  // ancestor walk skipped it as if transparent, and the probe fell through to the white card behind:
  // a white-on-cobalt artwork square measured as white-on-white 1.0:1. Unparseable is not the same as
  // transparent, and treating it that way made the whole color-mix surface of the repo unmeasurable.
  const parse = (c) => {
    let m = c && c.match(/rgba?\(([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:[,\s/]+([\d.]+))?\)/);
    if (m) return [+m[1], +m[2], +m[3], m[4] === undefined ? 1 : +m[4]];
    m = c && c.match(/color\(srgb\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)(?:\s*\/\s*([\d.]+))?\)/);
    if (m) return [Math.round(+m[1] * 255), Math.round(+m[2] * 255), Math.round(+m[3] * 255), m[4] === undefined ? 1 : +m[4]];
    return null;
  };
  const cratio = (a, b) => { const [hi, lo] = lum(a) > lum(b) ? [lum(a), lum(b)] : [lum(b), lum(a)]; return (hi + 0.05) / (lo + 0.05); };
  const cv = document.querySelector('canvas#cv'); // ONLY the bg canvas convention — grain/fx canvases are decoration, not backdrop
  const cvCtx = cv ? cv.getContext('2d') : null; // webgl canvases return null here — safely skipped
  const bgFor = (el, bx) => {
    for (let p = el; p; p = p.parentElement) {
      if (cv && p.contains(cv)) break; // this ancestor's bg sits BEHIND the bg canvas — not the backdrop
      const c = parse(getComputedStyle(p).backgroundColor);
      if (c && c[3] > 0.85) return [c[0], c[1], c[2]];
    }
    // flat-layer scenes (scene): the visual backdrop may be a SIBLING rect OR a full-bleed image
    // (a photographic hero), not an ancestor — probe the actual paint stack under the element's centre.
    const bgProbe = document.createElement('canvas'); bgProbe.width = bgProbe.height = 20;
    const bpc = bgProbe.getContext('2d', { willReadFrequently: true });
    for (const p of document.elementsFromPoint(bx.x + bx.w / 2, bx.y + bx.h / 2)) {
      if (p === el || el.contains(p) || p.contains(el)) continue;
      const c = parse(getComputedStyle(p).backgroundColor);
      if (c && c[3] > 0.85) return [c[0], c[1], c[2]];
      // a covering <img> (sky/photo backdrop): its opaque-pixel average IS the effective bg colour,
      // so white/emphasis text over a photo isn't false-flagged as invisible-on-the-canvas-behind-it.
      const im = p.tagName === 'IMG' ? p : (p.querySelector && p.querySelector('img'));
      if (im && im.complete && im.naturalWidth) {
        try {
          bpc.clearRect(0, 0, 20, 20); bpc.drawImage(im, 0, 0, 20, 20);
          const d = bpc.getImageData(0, 0, 20, 20).data;
          let r = 0, g = 0, b = 0, k = 0;
          for (let i = 0; i < d.length; i += 4) if (d[i + 3] > 40) { r += d[i]; g += d[i + 1]; b += d[i + 2]; k++; }
          if (k > 20) return [r / k, g / k, b / k];
        } catch (e) {} // cross-origin taint → fall through
      }
    }
    if (cvCtx) {
      const pts = [[bx.x + bx.w / 2, bx.y + bx.h / 2], [bx.x + 6, bx.y + 6], [bx.x + bx.w - 6, bx.y + 6], [bx.x + 6, bx.y + bx.h - 6], [bx.x + bx.w - 6, bx.y + bx.h - 6]];
      let r = 0, g = 0, b = 0, k = 0;
      for (const [px, py] of pts) {
        const sx = Math.max(0, Math.min(cv.width - 1, px | 0)), sy = Math.max(0, Math.min(cv.height - 1, py | 0));
        const d = cvCtx.getImageData(sx, sy, 1, 1).data;
        if (d[3] > 10) { r += d[0]; g += d[1]; b += d[2]; k++; }
      }
      if (k) return [r / k, g / k, b / k];
    }
    const st = parse(getComputedStyle(document.body).backgroundColor);
    if (st && st[3] > 0.85) return [st[0], st[1], st[2]];
    return null; // gradient/image backdrops: no confident color → don't guess, don't flag
  };
  // Contrast (WCAG AA, size-aware) on EVERY rendered text element, not just [data-layer=critical].
  // Muted labels and captions are exactly where low-contrast gray-on-white slips through, so check any
  // element that carries its own text node. A video is usually watched scaled DOWN (not fullscreen), so
  // the WCAG large-text allowance only applies to genuinely big type (>=48px in-frame); everything else
  // must clear the 4.5:1 normal-text bar to stay legible at half-size.
  for (const el of document.querySelectorAll('body *')) {
    if (el.closest('script, style, noscript, svg')) continue;
    if (![...el.childNodes].some((nd) => nd.nodeType === 3 && nd.nodeValue.trim())) continue; // only elements with DIRECT text
    if (!vis(el)) continue;
    const b = el.getBoundingClientRect();
    if (b.width < 2 || b.height < 2) continue;
    const fg = parse(getComputedStyle(el).color);
    if (!fg || fg[3] < 0.5) continue;
    const bg = bgFor(el, { x: b.left, y: b.top, w: b.width, h: b.height });
    if (!bg) continue;
    const rt = cratio([fg[0], fg[1], fg[2]], bg);
    const px = parseFloat(getComputedStyle(el).fontSize) || 0;
    const large = px >= 48;            // large display type gets the WCAG large-text bar
    const want = large ? 3.0 : 4.5;    // WCAG AA pass bar: 4.5 normal, 3.0 large
    const hardBar = large ? 2.5 : 3.0; // below this the text is unreadable -> hard fail (else soft-warn)
    if (rt < want) {
      const id = el.id || (typeof el.className === 'string' ? el.className.split(' ')[0] : el.tagName);
      issues.push({ kind: rt < hardBar ? 'contrast' : 'contrast-soft', a: id, t: (el.textContent || '').trim().slice(0, 18), detail: `${px | 0}px ${rt.toFixed(1)}:1 (want ${want}:1)` });
    }
  }
  // EMPHASIS + WIDE contrast: the loop above reads each layer's TOP-level colour only. A layer's
  // <b>/<em> spans carry their OWN colour (--em) — an accent <b> on an accent bg vanishes (the
  // blue-on-blue bug the old audit missed). Also widen past [data-layer=critical] to ANY headline-
  // scale text (≥60px), soft-tier when the layer isn't critical so existing videos don't newly HARD-fail.
  const near = (a, b) => Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) + Math.abs(a[2] - b[2]) < 60; // ≈ same colour = invisible
  const checkSpan = (span, critical, label) => {
    const t = (span.textContent || '').trim(); if (!t || !vis(span)) return;
    const b = span.getBoundingClientRect(); if (b.width < 2 || b.height < 2) return;
    if ((parseFloat(getComputedStyle(span).fontSize) || 0) < 40) return; // ignore small captions/labels
    const fg = parse(getComputedStyle(span).color); if (!fg || fg[3] < 0.5) return;
    const bg = bgFor(span, { x: b.left, y: b.top, w: b.width, h: b.height }); if (!bg) return;
    const rt = cratio([fg[0], fg[1], fg[2]], bg), invisible = near([fg[0], fg[1], fg[2]], bg);
    if (rt >= 3.5 && !invisible) return;
    const hard = critical && (invisible || rt < 2.5);
    issues.push({ kind: hard ? 'contrast' : 'contrast-soft', a: label, t: t.slice(0, 18),
      detail: invisible ? `${label} ≈ bg colour (invisible)` : `${label} ${parseFloat(getComputedStyle(span).fontSize) | 0}px at ${rt.toFixed(1)}:1` });
  };
  for (const tx of document.querySelectorAll('.hs-text')) {
    if (!vis(tx)) continue;
    const critical = tx.getAttribute('data-layer') === 'critical' || !!tx.closest('[data-layer="critical"]');
    for (const em of tx.querySelectorAll('b, em')) checkSpan(em, critical, em.tagName.toLowerCase()); // <b>/<em> always: they carry --em
    const px = parseFloat(getComputedStyle(tx).fontSize) || 0; // the whole layer only when headline-scale AND not already checked as critical above
    if (px >= 60 && !critical && [...tx.childNodes].some((nd) => nd.nodeType === 3 && nd.nodeValue.trim())) checkSpan(tx, false, 'text');
  }
  // HEADLINE DOMINANCE: the largest visible text on a frame is the headline — legibility (4.5:1)
  // is not enough for display type; below 7:1 it reads washed-out ("gray heading" bug class).
  {
    const texts = info.filter((e) => [...e.el.childNodes].some((nd) => nd.nodeType === 3 && nd.nodeValue.trim()));
    let top = null, topPx = 0;
    for (const e of texts) { const px = parseFloat(getComputedStyle(e.el).fontSize) || 0; if (px > topPx) { topPx = px; top = e; } }
    if (top && topPx >= 56 && +getComputedStyle(top.el).opacity >= 0.85) { // judge only ARRIVED headlines (mid-fade is motion, not a verdict)
      const fg = parse(getComputedStyle(top.el).color);
      const bg = fg && fg[3] >= 0.85 && bgFor(top.el, { x: top.x, y: top.y, w: top.r - top.x, h: top.btm - top.y });
      if (fg && bg) {
        const rt = cratio([fg[0], fg[1], fg[2]], bg);
        if (rt < 7) issues.push({ kind: rt < 3.5 ? 'weak-headline' : 'weak-headline-soft', a: top.id, t: top.t, detail: `headline ${topPx | 0}px at ${rt.toFixed(1)}:1 (want ≥7:1)` });
      }
    }
  }
  // IMAGE contrast: a critical logo/icon can vanish into a same-hue backdrop (orange-on-orange) —
  // average the image's opaque pixels and hold them to the WCAG non-text bar (3:1; hard < 1.7).
  const imgProbe = document.createElement('canvas'); imgProbe.width = imgProbe.height = 24;
  const ipc = imgProbe.getContext('2d', { willReadFrequently: true });
  for (const e of info) {
    const im = e.el.tagName === 'IMG' ? e.el : ((e.el.children.length === 1 || !e.el.textContent.trim()) ? e.el.querySelector('img') : null);
    if (!im || !im.complete || !im.naturalWidth) continue;
    let avg;
    try {
      ipc.clearRect(0, 0, 24, 24); ipc.drawImage(im, 0, 0, 24, 24);
      const d = ipc.getImageData(0, 0, 24, 24).data;
      let r = 0, g = 0, b = 0, k = 0;
      for (let i = 0; i < d.length; i += 4) if (d[i + 3] > 40) { r += d[i]; g += d[i + 1]; b += d[i + 2]; k++; }
      if (k < 20) continue; // nearly empty raster — nothing to judge
      avg = [r / k, g / k, b / k];
    } catch { continue; } // cross-origin taint → skip, never guess
    const bg = bgFor(im === e.el ? e.el : e.el, { x: e.x, y: e.y, w: e.r - e.x, h: e.btm - e.y });
    if (!bg) continue;
    const rt = cratio(avg, bg);
    if (rt < 3) issues.push({ kind: rt < 1.7 ? 'contrast' : 'contrast-soft', a: e.id || 'img', t: (im.getAttribute('src') || '').split('/').pop().slice(0, 18), detail: `image vs bg ${rt.toFixed(1)}:1` });
  }
  return { issues, count: info.length };
}

// re-render the worst frame and draw an overlay (safe box + offending element outlines), for the screenshot.
function overlayFn(n, SAFE) {
  window.__engine.renderFrame(n);
  const o = document.createElement('div');
  o.style.cssText = 'position:absolute;inset:0;z-index:99999;pointer-events:none';
  o.innerHTML = `<div style="position:absolute;left:${SAFE.x0}px;top:${SAFE.y0}px;width:${SAFE.x1 - SAFE.x0}px;height:${SAFE.y1 - SAFE.y0}px;border:2px solid rgba(120,240,60,.6)"></div>`;
  document.body.appendChild(o);
  const seen = new Set();
  for (const el of document.querySelectorAll('[data-layer="critical"]')) {
    const b = el.getBoundingClientRect(); if (b.width < 2 || b.height < 2) continue;
    const d = document.createElement('div');
    d.style.cssText = `position:absolute;left:${b.left}px;top:${b.top}px;width:${b.width}px;height:${b.height}px;border:2px solid rgba(255,70,110,.9);box-sizing:border-box`;
    o.appendChild(d); seen.add(el);
  }
}

// Some layout bugs live in the SOURCE and are invisible to any single rendered frame, so they must be
// caught by name rather than hoped to trip a measurement.
//
// `pin`/`x` centring keywords resolve against the LAYER'S OWN SIZE (core/boot.js resolveCoords: `center`
// → (W - size)/2). A layer with no `w` has size 0, so `center` means (W-0)/2 — the layer's LEFT EDGE
// lands on the centre line and the content runs off to the right. It renders wrong at every aspect, but
// only fails the safe check where the ink happens to spill past the box, so a wide canvas hides it
// completely. showcase-aspect.json shipped exactly this and passed at its own 16:9 for months.
// `right`/`third2` are degenerate the same way and land further off-frame.
const NEEDS_W = new Set(['center', 'optical', 'third1', 'third2', 'right']);
// pin → the x-keyword it implies (core/boot.js PIN). Only the x axis is checked: a missing `h` skews y
// by half a line, which is a real but survivable offset, whereas a missing `w` throws content off-frame.
const PIN_X = { center: 'center', top: 'center', bottom: 'center', left: 'left', right: 'right',
  'top-left': 'left', 'top-right': 'right', 'bottom-left': 'left', 'bottom-right': 'right',
  'thirds-tl': 'third1', 'thirds-tr': 'third2', 'thirds-bl': 'third1', 'thirds-br': 'third2',
  'thirds-t': 'center', 'thirds-b': 'center', 'thirds-l': 'third1', 'thirds-r': 'third2' };

function sourceIssues(cfg) {
  const out = [];
  for (const L of cfg.layers || []) {
    if (!L || typeof L !== 'object') continue;
    const id = L.id || L.type || 'layer';
    const t = String(L.text ?? '').replace(/<[^>]+>/g, '').trim().slice(0, 18);
    const xkw = L.x != null ? (typeof L.x === 'string' ? L.x : null) : (L.pin ? PIN_X[L.pin] : null);
    // `anchor` overwrites x downstream (scene.html), and `col` sets both x and w, so neither is affected.
    if (xkw && NEEDS_W.has(xkw) && L.w == null && L.col == null && !L.anchor)
      out.push({ kind: 'degenerate-pin', a: id, t,
        detail: `${L.pin ? `pin:"${L.pin}"` : `x:"${L.x}"`} positions a box of width w, but w is unset (=0) — the layer's left edge lands on the ${xkw} line instead of the layer centring on it. Set w (e.g. "88%") + align.` });
    // dx/dy are read only inside scene.html's anchor pass (`const T = L.anchor && byId[L.anchor]`), so
    // without a resolvable anchor they are silently dropped — authored intent that never renders.
    if ((L.dx != null || L.dy != null) && !L.anchor)
      out.push({ kind: 'dead-offset', a: id, t, detail: `dx/dy are anchor offsets and do nothing without \`anchor\` — the layer renders unshifted` });
  }
  return out;
}

const HARD = new Set(['overlap', 'overflow', 'safe', 'contrast', 'weak-headline', 'degenerate-pin', 'collapsed-image']);
const server = await startServer();
const port = server.address().port;
const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--hide-scrollbars', '--force-device-scale-factor=1'] });
const rows = [];

for (const spec of modules) {
  // a .json arg audits THAT data file (module read from it); a bare name audits the format's sample
  const isData = spec.endsWith('.json');
  const sample = isData ? spec : `formats/${spec}/sample.json`;
  if (!fs.existsSync(path.join(repoRoot, sample))) { rows.push({ m: spec, hard: 1, warn: 0, crit: 0, note: 'file not found' }); continue; }
  const cfg = (() => { try { return JSON.parse(fs.readFileSync(path.join(repoRoot, sample), 'utf8')); } catch { return {}; } })();
  const m = isData ? (cfg.module || spec) : spec;

  // source checks are aspect-independent (they're about the JSON, not a canvas) — report them once
  const si = sourceIssues(cfg);
  if (si.length) rows.push({ m: `${isData ? `${m} · ${path.basename(sample)}` : m}  [source]`,
    hard: si.filter((i) => HARD.has(i.kind)).length, warn: si.filter((i) => !HARD.has(i.kind)).length, crit: 0, items: si });

for (const aspectKey of askedAspects) {
  const page = await browser.newPage();
  // Audit at the video's REAL dimensions. Getting this wrong (auditing a 16:9 scene at portrait
  // 1080x1920) mis-fires safe-zone and the tiny-text floor on every landscape video.
  const [vw, vh] = dimsFor(aspectKey, cfg);
  const safe = safeFor(vw, vh, cfg);
  await page.setViewport({ width: vw, height: vh, deviceScaleFactor: 1 });
  // ?aspect= is the same knob internal/scene/scene.go passes when rendering, so the audit measures the
  // canvas the CLI would actually ship rather than a re-implementation of it.
  const q = aspectKey ? `&aspect=${encodeURIComponent(aspectKey)}` : '';
  await page.goto(`http://127.0.0.1:${port}/formats/${m}/scene.html?data=/${sample}&fps=30${q}`, { waitUntil: 'load' });
  await page.waitForFunction('window.__engineReady === true || window.__engineError', { timeout: 30000 });
  // A scene that refuses to boot is the loudest possible failure, so report it as one. Reading
  // __engine.meta unconditionally threw an uncaught TypeError here, which killed the whole run: one
  // broken scene meant every OTHER scene in a `make audit` sweep went unaudited and unreported, and the
  // gate exited on a stack trace that named puppeteer rather than the scene.
  const engErr = await page.evaluate(() => window.__engineError && String(window.__engineError));
  if (engErr || !(await page.evaluate(() => !!(window.__engine && window.__engine.meta)))) {
    rows.push({ m: `${isData ? `${m} · ${path.basename(sample)}` : m}  [${aspectKey || `${vw}x${vh}`}]`,
      hard: 1, warn: 0, crit: 0, note: `scene did not load: ${(engErr || 'engine never became ready').split('\n')[0]}` });
    await page.close(); continue;
  }
  const meta = await page.evaluate(() => window.__engine.meta);
  const total = meta.totalFrames, fps = meta.fps || 30;
  // skip frames inside scene transitions (enter/exit motion is intentionally off-position/faded);
  // meta.segments = the format's declared scene windows (formats without it audit every sample)
  let inTransition = () => false;
  if ((meta.segments || []).length) {
    const cuts = []; let acc = 0;
    meta.segments.forEach((s, i) => { acc += s.dur ?? (s.t1 - s.t0); if (i < meta.segments.length - 1) cuts.push({ t: acc, trans: s.transition ?? 0.4 }); });
    inTransition = (f) => cuts.some((c) => Math.abs(f / fps - c.t) < c.trans + 0.05);
  }
  // a MOVING camera (data.camera keyframes with changing x/y/s) is cinematography: elements crossing
  // the frame edge mid-travel are not safe-zone breaches. Overlap/contrast still checked everywhere.
  let camMoving = () => false;
  try {
    const kf = JSON.parse(fs.readFileSync(path.join(repoRoot, sample), 'utf8')).camera || [];
    const moves = kf.slice(1).map((b, i) => ({ a: kf[i], b }))
      .filter(({ a, b }) => (a.x ?? 0) !== (b.x ?? 0) || (a.y ?? 0) !== (b.y ?? 0) || (a.s ?? 1) !== (b.s ?? 1));
    if (moves.length) camMoving = (f) => moves.some(({ a, b }) => f / fps > a.t - 0.05 && f / fps < b.t + 0.05);
  } catch {}
  const frames = [...new Set([...(meta.stings || []).map((t) => Math.round(t * fps)),
    ...Array.from({ length: SAMPLES }, (_, i) => Math.round(((i + 0.5) / SAMPLES) * total))])]
    .filter((f) => f >= 0 && f < total && !inTransition(f)).sort((a, b) => a - b);

  const all = [];
  let critMax = 0, worst = { f: frames[0] || 0, n: -1 };
  for (const f of frames) {
    const { issues, count } = await page.evaluate(auditFrameFn, f, safe, MIN_GAP);
    critMax = Math.max(critMax, count);
    const hard = issues.filter((i) => HARD.has(i.kind)).length;
    if (hard > worst.n) worst = { f, n: hard };
    for (const i of issues) { if (i.kind === 'safe' && camMoving(f)) continue; all.push({ f, ...i }); }
  }
  const hard = all.filter((i) => HARD.has(i.kind));
  const warn = all.filter((i) => !HARD.has(i.kind));
  // De-dup repeated issues to the first frame they appear on: the SAME element failing on 12 sampled
  // frames is one bug, not twelve. Identity is the layer index (`li`) where we have it, because the
  // label is a class name — `hs-text` for every text layer — so keying on it merged unrelated layers
  // and reported 1 of 4 real off-frame failures. Fall back to label+text for issues that carry no
  // index (the critical-element checks, whose `a`/`b` are already per-element ids).
  const key = (i) => `${i.kind}|${i.li ?? `${i.a}|${i.t || ''}`}|${i.b || ''}`;
  const uniq = (list) => { const seen = new Set(), out = []; for (const i of list) { const k = key(i); if (!seen.has(k)) { seen.add(k); out.push(i); } } return out; };
  const hu = uniq(hard), wu = uniq(warn);
  const label = `${isData ? `${m} · ${path.basename(sample)}` : m}  [${aspectKey || `${vw}x${vh}`}]`;
  rows.push({ m: label, hard: hu.length, warn: wu.length, crit: critMax, items: [...hu, ...wu] });

  await page.evaluate(overlayFn, worst.f, safe);
  // one overlay per audited canvas — the whole point is comparing where the SAME scene breaks per ratio
  const shot = `${m}${aspectKey ? `.${aspectKey.replace(':', 'x')}` : ''}.png`;
  await page.screenshot({ path: path.join(OUT, shot) });
  await page.close();
}
}
await browser.close(); server.close();

console.log('\n==================== LAYOUT AUDIT ====================');
let hardTotal = 0, warnTotal = 0;
for (const r of rows) {
  hardTotal += r.hard; warnTotal += r.warn || 0;
  const tag = r.hard ? '✗ FAIL' : r.warn ? '~ warn' : '✓ ok';
  console.log(`\n${tag}  ${r.m}  (${r.crit ?? 0} critical elems · ${r.hard} hard · ${r.warn || 0} warn)`);
  if (r.note) console.log(`    ${r.note}`);
  for (const i of (r.items || [])) {
    const who = i.b ? `${i.a} ✕ ${i.b}` : `${i.a}${i.t ? ` "${i.t}"` : ''}`;
    console.log(`    [${i.kind}] ${i.f == null ? '' : `f${i.f} `}${who} — ${i.detail}`);
  }
}
console.log(`\noverlays: ${OUT}/<format>.png`);
console.log(`${hardTotal ? '✗ ' + hardTotal + ' HARD issue(s)' : '✓ no hard issues'}${warnTotal ? ` · ${warnTotal} warning(s)` : ''}`);
process.exit(hardTotal ? 1 : 0);
