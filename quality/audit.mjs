// quality/audit.mjs, the layout audit: catches what eyes catch but checklists miss.
// Renders each format's sample headless across sampled frames and flags, on [data-layer="critical"]:
//   • overlap: two TEXT inks intersect (any size, not just critical)  (HARD fail)
//   • overflow: text clipped (scrollW/H > clientW/H)    (HARD fail)
//   • safe-zone: element outside the SAFE box            (HARD fail)
//   • caption-band: content inside the strip a burnt-in caption will be painted into, on a film that
//                 declares captions (core/layout/safe.js captionBand)     (warn)
//   • contrast: text/emphasis vs bg below WCAG, incl. <b>/<em> --em spans & ≈-same-colour
//                 (blue-on-blue); widened to any ≥60px headline text  (HARD on critical, else warn)
//   • buried: >40% of a ≥60px headline sits under an opaque layer  (HARD fail)
//   • tight: sibling boxes closer than MIN_GAP px    (warn)
// Writes an annotated screenshot of the worst frame per format to /tmp/audit/<format>.png.
//   node quality/audit.mjs [format ...]      (default: all)   ·   make audit
//
// --aspect 16:9,9:16,1:1,4:5 (or `all`) audits the SAME canvas list the renderer would ship, mirroring
// `bin/vawe --aspect a,b,c`. This exists because a scene renders "fine" at every aspect and can be wrong
// at all but one: layout is solved per ratio by hand, so absolute coords tuned to 1920 silently overflow
// 1080. Auditing one aspect while the CLI ships four is a gate that agrees with itself and not with the
// output. Default stays the scene's own aspect, so a single-aspect scene costs nothing.
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer';
import { safeArea, captionBand, captionSkin, nativeAspect, DESTINATION_NAMES, ASPECTS, sceneDims } from '../core/layout/safe.js';
import { layoutErrors } from '../core/validate/validate.mjs';
// The renderer's own placement resolver, called rather than re-implemented. See capBandFor below.
import { resolveCoords } from '../core/engine/boot.js';
// The SOURCE-side twin of the in-page `inkText()` below. That helper already refuses to read a
// <style> body as glyphs (engine-doctrine/MISTAKES.md #222/#217); this file went on doing exactly that when it
// labelled a finding straight off the authored string. Same rule, both sides of the browser boundary.
import { snippet } from '../harness/lib/text.mjs';
import { gateFindings } from '../harness/lib/findings.mjs';
import { loadScene } from '../core/engine/expand.js';
import { bootPathFor } from '../harness/lib/render-harness.mjs';
import { adaptFinding } from '../harness/lib/safeguards.mjs';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const formatsDir = path.join(repoRoot, 'films');
const OUT = '/tmp/audit';
// Do NOT wipe the directory: two authors auditing at once would delete each other's overlay, and one
// author auditing a second scene would lose the first. Each run overwrites only its own file.
fs.mkdirSync(OUT, { recursive: true });

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
if (badAspect) { console.error(`unknown aspect "${badAspect}", known: ${Object.keys(ASPECTS).join(', ')}, or "all"`); process.exit(2); }

const modules = argv.length ? argv
  : fs.readdirSync(formatsDir).filter((d) => fs.existsSync(path.join(formatsDir, d, 'scene.html')));

// The canvas this audit runs at comes from core/layout/safe.js, alongside the safe box it feeds, same
// reason the safe box lives there. An explicit --aspect wins; else the scene's own `aspect`.
const dimsFor = (key, cfg) => sceneDims(cfg, key);

// The safe box comes from core/layout/safe.js, the same function boot.js places against and writes
// to --safe-* for the overlay, so this gate can never disagree with the thing it gates. `destination`
// (default `web`) decides the chrome, since that depends on where the video is going.
const safeFor = (vw, vh, cfg) => safeArea(vw, vh, cfg.destination || 'web');

// Null for a film that declares no captions: held always, it fired on 69 of 103 shipped scenes,
// a report about the library rather than a gate (engine-doctrine/MISTAKES.md #413). Held for the
// whole runtime, not only inside a caption window, since the strip is a layout commitment made once.
// 8px tolerance, the same hairline MIN_GAP calls "touching".
const CAP_TOL = 8;
const capBandFor = (vw, vh, cfg) => {
  if (!Array.isArray(cfg.captions) || !cfg.captions.length) return null;
  // A caption's placement lives in the layer grammar, not the skin alone. `pin` and the edge
  // keywords are still strings at this point, so resolve a COPY through the renderer's own
  // resolveCoords rather than re-reading the grammar here, which is what would drift.
  const caps = JSON.parse(JSON.stringify(cfg.captions));
  resolveCoords({ layers: [], captions: caps, captionStyle: cfg.captionStyle, captionMode: cfg.captionMode },
    vw, vh, safeFor(vw, vh, cfg));
  const b = captionBand(vw, vh, cfg.destination || 'web', captionSkin(cfg), caps);
  return { ...b, tol: CAP_TOL };
};

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

// ── THE PAGE SIDE ────────────────────────────────────────────────────────────────────────────
// Runs INSIDE the browser, never in node. Puppeteer ships a function by stringifying it, so a page
// function cannot close over this module's scope; PAGE_FNS below concatenates these declarations into
// one page-side scope so they reach each other by name.
//
// The frame's evidence is collected ONCE (`frameContext`), then every check reads it. Findings print
// in push order and de-dup to the FIRST occurrence, so `auditFrame`'s check order is the output order.

const vis = (el) => { for (let p = el; p && p !== document.body; p = p.parentElement) { const s = getComputedStyle(p); if (s.visibility === 'hidden' || +s.opacity <= 0.05) return false; } return true; };
// The product of every opacity down the paint tree, what the VIEWER sees: a fade often lives on an
// ANCESTOR (a captured component, a grouped beat), so reading only the element's own opacity let a
// mockup 0.067s into its entrance grade as a contrast defect (engine-doctrine/MISTAKES.md #390).
const effOpacity = (el) => { let a = 1; for (let p = el; p && p !== document.body; p = p.parentElement) a *= (+getComputedStyle(p).opacity || 0); return a; };
const arrived = (el) => { const ARRIVED = 0.85; return effOpacity(el) >= ARRIVED; };
// Compares every visible TEXT layer, not just `critical`: scoping to critical missed a wrapped
// headline landing on a small caption beneath it (engine-doctrine/MISTAKES.md #78). Two TEXT boxes
// overlapping is a defect; text over a SHAPE is design (a chip on a rect, a label on a card).
// Reads inkText, not textContent: textContent includes inline <style>/<script> source, so a
// hand-authored `html` layer's CSS false-collided with labels placed on top of it.
// `paintsOwnBox` walks descendants because the paint is often one or two levels down: an `html`
// layer's background usually lives on an inner div, not the layer element itself.
const paintsOwnBox = (el) => {
  const box = el.getBoundingClientRect();
  if (!(box.width > 1 && box.height > 1)) return false;
  const painted = (n) => {
    const s = getComputedStyle(n), bg = s.backgroundColor || '';
    const opaque = !(bg === 'transparent' || /rgba\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*,\s*0\s*\)/.test(bg));
    return opaque || s.backgroundImage !== 'none';
  };
  if (painted(el)) return true;
  for (const n of el.querySelectorAll('*')) {
    const b = n.getBoundingClientRect();
    if (b.width * b.height >= box.width * box.height * 0.85 && painted(n)) return true;
  }
  return false;
};
// `data-ink="off"`: text in the DOM on purpose and never on screen. `wordSlot` (core/fx/word-slot.js)
// stacks every candidate word in one grid cell to size the slot, and shows one at a time, so
// textContent read every stacked word as one string no frame ever paints (MISTAKES #214).
// A selector test, not computed-style, deliberately: a computed-style walk perturbed
// `ab-skill-shotcode` f109's own DOM (1 hard finding to 2) with no string changed.
const inkText = (el) => {
  let out = '';
  const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, {
    acceptNode: (n) => (n.parentElement && n.parentElement.closest('style, script, [data-ink="off"]'))
      ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT,
  });
  while (w.nextNode()) out += w.currentNode.nodeValue;
  return out;
};
// A mask is not a misfit: `scrollWidth > clientWidth` also describes a deliberate `overflow:hidden`
// WINDOW over content parked or slid past its edge (every reveal, tab strip, marquee, carousel).
// Told apart structurally: in-flow content that doesn't fit is the defect (#35, #43); a child taken
// OUT of flow was positioned there on purpose, so clipping it is the intent. Known ceiling: a card
// that absolutely-positions real copy off its own edge goes unreported here; layer-level safe-zone
// and overflow still see the layer itself.
const maskedByDesign = (el) => {
  const r = el.getBoundingClientRect();
  for (const n of el.querySelectorAll('*')) {
    const pos = getComputedStyle(n).position;
    if (pos !== 'absolute' && pos !== 'fixed') continue;
    const b = n.getBoundingClientRect();
    if (b.width < 1 || b.height < 1) continue;
    if (b.right > r.right + 1 || b.bottom > r.bottom + 1 || b.left < r.left - 1 || b.top < r.top - 1) return true;
  }
  return false;
};
// The safe check must measure what the VIEWER sees: a centred text layer's `w` is wrapping width,
// mostly invisible slack, and measuring the container flags empty air as off-frame. A layer with no
// background, border or shadow is measured by its ink (a Range over its contents) instead; anything
// that paints a box (cards, rects, images) keeps its border box, since there the box IS visible.
const paintsBox = (s) => {
  const bg = s.backgroundColor || '';
  const opaqueBg = !(bg === 'transparent' || /rgba\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*,\s*0\s*\)/.test(bg));
  return opaqueBg || s.backgroundImage !== 'none' || s.boxShadow !== 'none' ||
    parseFloat(s.borderTopWidth) > 0 || parseFloat(s.borderLeftWidth) > 0 ||
    parseFloat(s.borderRightWidth) > 0 || parseFloat(s.borderBottomWidth) > 0;
};
// An inline <svg>'s ink is usually inscribed well inside its box (a 370-radius ring in a 1000-unit
// viewBox leaves 244 units of empty square per side, and that empty square still rotates), so
// measuring the box failed a ring nowhere near the frame edge. getBBox() gives the drawn geometry's
// AABB in user units; getScreenCTM() carries the viewBox scale AND the layer's rotation, so
// transforming its corners gives the true screen AABB of the ink, and can only ever relax a finding.
// A rotated curve still over-bounds by its box (a semicircle stopping 255px from the top measured
// 139px above it), so sample the outline instead: SVGGeometryElement's getTotalLength/getPointAtLength,
// a fixed 96-sample count for determinism, stroke width added back at half its scaled width.
const shapeInk = (g) => {
  const SAMPLES_PER_PATH = 96;
  const m = g.getScreenCTM();
  if (!m || typeof g.getPointAtLength !== 'function') return null;
  let len; try { len = g.getTotalLength(); } catch { return null; }
  if (!Number.isFinite(len) || len <= 0) return null;
  const xs = [], ys = [];
  for (let i = 0; i <= SAMPLES_PER_PATH; i++) {
    let pt; try { pt = g.getPointAtLength((len * i) / SAMPLES_PER_PATH); } catch { return null; }
    xs.push(m.a * pt.x + m.c * pt.y + m.e);
    ys.push(m.b * pt.x + m.d * pt.y + m.f);
  }
  // half the stroke sticks out past the centreline, scaled the same way the geometry is
  const scale = Math.sqrt(Math.abs(m.a * m.d - m.b * m.c)) || 1;
  const sw = (parseFloat(getComputedStyle(g).strokeWidth) || 0) / 2 * scale;
  return { left: Math.min(...xs) - sw, right: Math.max(...xs) + sw,
    top: Math.min(...ys) - sw, bottom: Math.max(...ys) + sw };
};
const svgInk = (svg) => {
  const DRAWABLE = 'path, circle, ellipse, rect, line, polyline, polygon';
  const shapes = [...svg.querySelectorAll(DRAWABLE)].map(shapeInk).filter(Boolean)
    .filter((r) => Number.isFinite(r.left) && Number.isFinite(r.top));
  // text/image inside an svg have no outline to sample; fall back to the box for those
  const others = [...svg.querySelectorAll('text, image, use')].map((g) => g.getBoundingClientRect())
    .filter((r) => r.width > 0 && r.height > 0);
  const all = [...shapes, ...others];
  if (!all.length) return null;
  const left = Math.min(...all.map((r) => r.left)), right = Math.max(...all.map((r) => r.right));
  const top = Math.min(...all.map((r) => r.top)), bottom = Math.max(...all.map((r) => r.bottom));
  return { left, top, right, bottom, width: right - left, height: bottom - top, geometry: true };
};
// The ink may only ever shrink the border box: a rect bigger than, or elsewhere from, the element's
// own box is a broken measurement, not ink. Lives in inkRect so every consumer gets the clamp; it
// used to sit at one call site only, and `buried` read the helper unclamped and inherited the same
// bug (engine-doctrine/MISTAKES.md #211/#214/#216/#217).
//
// What it catches: getScreenCTM() is not composed through a 3D rig. Once the engine promotes #cam to
// `preserve-3d` for a camera z/tilt move, an inline <svg>'s screen CTM maps to neither the layer's
// scale nor its position (measured: playhead's tick svg at (408,898,288x73) mapped to
// (150,341,123x29)), and unclamped `buried` sampled a region the layer does not occupy.
const clampToBox = (r, el) => {
  const b = el.getBoundingClientRect();
  const left = Math.max(r.left, b.left), right = Math.min(r.right, b.right);
  const top = Math.max(r.top, b.top), bottom = Math.min(r.bottom, b.bottom);
  return (right > left && bottom > top)
    ? { left, top, right, bottom, width: right - left, height: bottom - top, geometry: r.geometry }
    : { left: b.left, top: b.top, right: b.right, bottom: b.bottom, width: b.width, height: b.height, geometry: r.geometry };
};
// True when `el` carries a real word outside any <svg> it contains. Distinguishes a pure icon layer
// (svg IS the whole layer) from a layer that places an icon beside its own caption or headline.
const hasTextOutsideSvg = (el) => {
  const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, {
    acceptNode: (n) => (n.parentElement && n.parentElement.closest('style, script, svg, [data-ink="off"]'))
      ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT,
  });
  while (w.nextNode()) if (w.currentNode.nodeValue.trim()) return true;
  return false;
};
const inkRect = (el) => {
  if (el.querySelector('img')) return null;            // raster: the element box IS the ink
  const svgs = [...el.querySelectorAll('svg')];
  // The svg-only path reads path geometry, not layout, so it knows nothing about a sibling caption or
  // headline sharing the layer. Only taken when the svg IS the ink, no other real text in the layer;
  // otherwise fall through and measure everything together below.
  if (svgs.length && !hasTextOutsideSvg(el)) {
    const rects = svgs.map(svgInk).filter(Boolean);
    if (!rects.length) return null;
    const left = Math.min(...rects.map((r) => r.left)), right = Math.max(...rects.map((r) => r.right));
    const top = Math.min(...rects.map((r) => r.top)), bottom = Math.max(...rects.map((r) => r.bottom));
    // width/height are not decorative: downstream checks (buried, tight) read them and feed the
    // centre to elementsFromPoint, which throws on a non-finite value.
    if (![left, top, right, bottom].every(Number.isFinite)) return null;
    return clampToBox({ left, top, right, bottom, width: right - left, height: bottom - top, geometry: true }, el);
  }
  const b = rangeInk(el);
  return b ? clampToBox(b, el) : null;
};
const rangeInk = (el) => {
  const r = document.createRange();
  r.selectNodeContents(el);
  const b = r.getBoundingClientRect();
  return (b.width > 1 && b.height > 1) ? b : null;
};
// The Range already reports where a transformed descendant (a bounced word, a per-character kinetic
// track) actually painted, since Range.getBoundingClientRect() reads real screen geometry, transform
// and all. `inkRect`'s clampToBox then pulls that back inside the LAYER's own untransformed layout
// box, which is right for the off-safe-margin check (#242: protects it from a 3D-rig mismeasurement)
// but wrong for a frame-edge crop check, which must answer "where did the ink really land". Text
// bouncing past its own container and off the canvas measured as safely inside the container's box
// (MISTAKES: two shipped films clipped "BOUNCE" against the right edge and a left-aligned label at
// x=0, neither caught). svg and raster layers keep the existing clamped path; only unclamped for the
// plain-text case this bug was in.
const textInkRaw = (el) => (el.querySelector('img, svg') ? null : rangeInk(el));
// The safe box governs LEGIBLE CONTENT; decoration (gradient blobs, glows, hairline rules) bleeds
// off-frame by design, so a layer only earns the safe check when it carries a text node or an image.
// Uses inkText, not textContent, for the same reason clipped-text and overlap do: a hand-authored
// `html` layer's inline CSS is not content (engine-doctrine/MISTAKES.md #220, #222).
const carriesContent = (el) => !!el.querySelector('img, svg') || !!inkText(el).trim();
// Only measured while the word is AT REST: a transformed descendant contributes to its ancestor's
// scrollable overflow, so mid-rise every masked word reports a huge scrollHeight, the effect working
// rather than a defect.
const atRest = (host) => {
  const kid = host.firstElementChild;
  if (!kid) return true;
  const tf = getComputedStyle(kid).transform;
  return tf === 'none' || tf === 'matrix(1, 0, 0, 1, 0, 0)';
};
// An HTML box answers "does this paint something solid" with `background-color`; an SVG shape
// answers with `fill`, and asking it the HTML question returns transparent.
const opaqueAt = (node) => {
  const s2 = getComputedStyle(node);
  const m = /rgba?\(([^)]+)\)/.exec((node.ownerSVGElement ? s2.fill : s2.backgroundColor) || '');
  if (!m) return false;
  const parts = m[1].split(',');
  let a = parts[3] !== undefined ? parseFloat(parts[3]) : 1;
  if (node.ownerSVGElement) a *= parseFloat(s2.fillOpacity || '1');
  // opacity is inherited down the paint tree, so a faded <g> makes its children see-through too
  for (let p = node; p && p !== document.body; p = p.parentElement) a *= (+getComputedStyle(p).opacity || 0);
  return a > 0.85;
};
// Parses rgb()/rgba() and color(srgb r g b / a), the second being Chromium's computed value for any
// color-mix(); treating an unparseable colour as transparent measured a white-on-cobalt artwork
// square as white-on-white 1.0:1.
const parse = (c) => {
  let m = c && c.match(/rgba?\(([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:[,\s/]+([\d.]+))?\)/);
  if (m) return [+m[1], +m[2], +m[3], m[4] === undefined ? 1 : +m[4]];
  m = c && c.match(/color\(srgb\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)(?:\s*\/\s*([\d.]+))?\)/);
  if (m) return [Math.round(+m[1] * 255), Math.round(+m[2] * 255), Math.round(+m[3] * 255), m[4] === undefined ? 1 : +m[4]];
  return null;
};
const boxOf = (r) => ({ x: r.left, y: r.top, w: r.width ?? (r.right - r.left), h: r.height ?? (r.bottom - r.top) });

// ── THE FRAME'S EVIDENCE, COLLECTED ONCE ─────────────────────────────────────────────────────
// Every check below reads this and measures nothing twice: `travelling` steps the render three
// frames either side and back, so building it once per frame is six extra renders, not sixty.
function frameContext(n, SAFE, MIN_GAP, CUTS, OVERLAYS, CAPBAND) {
  const els = [...document.querySelectorAll('[data-layer="critical"], .hs-layer.hs-text')].filter((el) => {
    if (!inkText(el).trim()) return false;   // shapes and empty wrappers are not the subject
    // A layer that paints its own background is a SURFACE: text over a shape is design, not collision.
    // `html` layers are classed hs-text, so a hand-authored card counted as a text box and collided
    // with every row placed on it.
    if (el.classList.contains('hs-layer') && paintsOwnBox(el)) return false;
    const b = el.getBoundingClientRect(); return b.width > 1 && b.height > 1 && vis(el);
  });
  const info = els.map((el) => {
    const b0 = el.getBoundingClientRect(), s = getComputedStyle(el);
    // Measure the glyphs, not the declared box: `pin` centres text against a `w` that is wrapping
    // width, mostly empty slack with `align:"left"`. Two layers overlapping only over that slack are
    // not touching on screen (reproduced: a 1200px-wide "Hi" hard-`overlap`ped a neighbour 700px away).
    const ink = !paintsBox(s) && inkRect(el);
    const b1 = ink || b0;
    // A text element's box includes line-height leading; its ink does not. Inset each text box by
    // ~16% of its font size top and bottom, about the gap between the em box and the ink, so the
    // check compares what is SEEN (`statBig` tucks a label under a number and the two never touch).
    const fs = parseFloat(s.fontSize) || 0;
    const inset = el.classList.contains('hs-text') ? fs * 0.16 : 0;
    const b = { left: b1.left, right: b1.right, top: b1.top + inset, bottom: b1.bottom - inset };
    // overflow only CLIPS (a real bug) when overflow isn't 'visible'; tight line-heights spill
    // visibly and harmlessly, so don't flag those.
    const clipX = s.overflowX !== 'visible', clipY = s.overflowY !== 'visible';
    return { el, id: el.id || (typeof el.className === 'string' ? el.className.split(' ')[0] : el.tagName), t: inkText(el).trim().slice(0, 18),
      x: b.left, y: b.top, r: b.right, btm: b.bottom, clip: (clipX && el.scrollWidth > el.clientWidth + 1) || (clipY && el.scrollHeight > el.clientHeight + 1),
      sw: el.scrollWidth, cw: el.clientWidth, sh: el.scrollHeight, ch: el.clientHeight };
  });
  // A layer mid enter-animation, or a moving `out` exit, is intentionally off-position, so only flag
  // safe when the layer is at rest. Default exits fade in place, so those still get checked.
  const FPS = (window.__engine && window.__engine.meta && window.__engine.meta.fps) || 30;
  const tNow = n / FPS;
  // A SCENE CUT displaces the whole camera for its window, so every layer is legitimately off its
  // mark then. midMove() understood per-layer entrances but not cuts, once the cuts array started
  // rendering a cut mid-flight read as 15 safe-zone violations (MISTAKES #29).
  const inCut = (CUTS || []).some((c) => Math.abs(tNow - c.t) < c.half + 0.02);
  // A rotated stage invalidates every axis-aligned box: once the engine promotes #cam into a
  // preserve-3d rig, getBoundingClientRect returns the AABB of a projected quad, not the shape (a
  // 700px hairline rolled 3 degrees reports a box 80px tall). Read the rig itself, not the JSON: a
  // top-level `tilt` builds it with no camera keys. The matrix's off-diagonal terms are the rotation;
  // a pure translate/scale leaves them zero, so a flat film is unaffected.
  const stageRotated = (() => {
    const cam = document.getElementById('cam');
    if (!cam) return false;
    const m = getComputedStyle(cam).transform || 'none';
    if (!m.startsWith('matrix3d(')) return false;                 // matrix(...) is 2D: no projection
    const v = m.slice(9, -1).split(',').map(Number);
    if (v.length !== 16 || v.some((k) => !Number.isFinite(k))) return false;
    // m12 m21 (roll) · m13 m31 (yaw) · m23 m32 (pitch), in column-major CSS order
    return [v[1], v[4], v[2], v[8], v[6], v[9]].some((k) => Math.abs(k) > 0.001);
  })();
  // The SAFE box is a margin in SCENE coordinates, but getBoundingClientRect reads a box AFTER the
  // camera transform, so a zoom carries edge-pinned content out of the safe box with nothing wrong in
  // the film. Not a corner case: `core/engine/produce.js` injects a 1->1.06 slowPush into every scene
  // with no camera (90 of 147 scenes), and of 14 scenes that gained a safe finding, 10 lost it again
  // once the injected push was replaced by a static camera.
  //
  // Read the camera off the rendered frame rather than parsing its matrix: `#cam` is `inset: 0`
  // (core/scene.css), so its own rect IS the transformed frame, exactly identity at rest, and
  // perspective zoom composes into the same rect where matrix parsing would not catch it.
  const CX = window.innerWidth / 2, CY = window.innerHeight / 2;
  const camScale = (() => {
    const cam = document.getElementById('cam');
    const b = cam && cam.getBoundingClientRect();
    if (!b || b.width < 1 || b.height < 1) return null;
    const sx = b.width / window.innerWidth, sy = b.height / window.innerHeight;
    return (Math.abs(sx - 1) < 0.001 && Math.abs(sy - 1) < 0.001) ? null : { sx, sy };
  })();
  // midMove only knows the enter/exit ramps the DOM records; a hand-keyed `motion` track leaves no
  // trace on the element, so a layer crossing the frame read as SETTLED (six of eight frame-bounds
  // failures were this). Do not re-derive from the JSON: `sceneUnits` reparents layers into per-beat
  // wrappers, so document order is not authoring order. Ask the render instead: renderFrame(n) is pure
  // in n (core/engine/boot.js), so stepping ahead, measuring, and stepping back is side-effect free.
  //
  // The window is 0.1s, not one frame, because a keyed track's lead-in can be arbitrarily slow
  // (higgsfield's button moves 0.07px/frame at 0.45s in): asking where a box is 3 frames out asks
  // whether it is going to stay, instead of reading instantaneous velocity, a property of the easing.
  const travelling = (() => {
    const MOVE_PX = 3;    // >3px across 0.1s ≈ >30px/s, travel, not an ambient hold
    const MOVE_F = 3;
    const els = [...document.querySelectorAll('.hs-layer')];
    const box = (e) => { const b = e.getBoundingClientRect(); return [b.left, b.top, b.right, b.bottom]; };
    const now = els.map(box);
    const total = (window.__engine.meta && window.__engine.meta.totalFrames) || 0;
    const moved = new WeakSet();
    for (const f of [n - MOVE_F, n + MOVE_F]) {
      if (f < 0 || f >= total) continue;
      window.__engine.renderFrame(f);
      const then = els.map(box);
      els.forEach((e, i) => { if (now[i].some((v, k) => Math.abs(v - then[i][k]) > MOVE_PX)) moved.add(e); });
    }
    window.__engine.renderFrame(n);
    return (e) => moved.has(e);
  })();
  // A sting or seam paints a full-frame generative overlay on top of everything (core/stings/index.js,
  // core/timeline/seams.js); nothing under one can be graded (cuts-demo's "sting: burn" measured
  // 1.1:1 against #080301, true about the pixel, false about the film).
  const inOverlay = (OVERLAYS || []).some((o) => Math.abs(tNow - o.t) < o.half + 0.02);
  // Same identity rule the safe-zone walk uses: a layer's index in document order. Labelling by ink y
  // instead made one bug report as four, since a drifting headline gets a different label per frame.
  const layerIdx = new Map([...document.querySelectorAll('.hs-layer')].map((e, i) => [e, i]));
  return { SAFE, MIN_GAP, CAPBAND, info, tNow, inCut, stageRotated, CX, CY, camScale, travelling,
    inOverlay, layerIdx, FW: window.innerWidth, FH: window.innerHeight };
}

// Undoes the ZOOM only, about the viewport centre; the camera's translation must stay, since a
// travelling shot parks the stage at a station and the screen box there is what the viewer sees.
// linear-journey pans across a 5500px stage, and undoing the translation too reported sixteen
// findings about layers that were centred on screen.
const unCam = (b, ctx) => ctx.camScale
  ? { left: ctx.CX + (b.left - ctx.CX) / ctx.camScale.sx, right: ctx.CX + (b.right - ctx.CX) / ctx.camScale.sx,
      top: ctx.CY + (b.top - ctx.CY) / ctx.camScale.sy, bottom: ctx.CY + (b.bottom - ctx.CY) / ctx.camScale.sy }
  : b;
const midMove = (el, ctx) => {
  if (ctx.inCut) return true;
  if (!el || !el.dataset) return false;
  if (ctx.travelling(el)) return true;                                               // mid-journey on a keyed track
  const st = parseFloat(el.dataset.start) || 0;
  const en = el.dataset.enter != null ? parseFloat(el.dataset.enter) : 0.45;
  const du = el.dataset.duration != null ? parseFloat(el.dataset.duration) : Infinity;
  const exD = el.dataset.exitDur != null ? parseFloat(el.dataset.exitDur) : 0.4;
  if (ctx.tNow < st + en + 0.06) return true;                                        // entering: moves in
  if (el.dataset.out && du !== Infinity && ctx.tNow > st + du - exD - 0.06) return true; // moving exit only
  return false;
};

// Safe-zone + overflow on EVERY top-level layer, not just [data-layer=critical]: off-frame or
// clipped content is always a bug regardless of the layer's role. Overlap/tight stay critical-scoped,
// since layered overlaps are frequently intentional.
//
// One walk, three findings, kept in one function because push order is the output order.
//
// `li` is the layer's index in document order, the only stable per-element identity: the label alone
// is not one (every text layer is `hs-text`), and de-duping on it collapsed distinct layers together.
function checkLayerBounds(ctx) {
  const { CAPBAND, FW, FH, stageRotated } = ctx;
  const issues = [];
  [...document.querySelectorAll('.hs-layer')].forEach((el, li) => {
    if (!vis(el)) return;
    // `data-audit=off`: the author's explicit "not legible content, do not judge its edges".
    // Opt-out only, so no scene can newly fail because of this line.
    if (el.dataset && el.dataset.audit === 'off') return;
    const b = el.getBoundingClientRect();
    if (b.width <= 1 || b.height <= 1) return;
    if (b.width >= FW * 0.9 && b.height >= FH * 0.9) return; // full-bleed backdrop, meant to bleed
    const s = getComputedStyle(el);
    const id = el.id || (typeof el.className === 'string' ? (el.className.split(' ').filter((c) => c !== 'hs-layer')[0] || 'layer') : el.tagName);
    const t = inkText(el).trim().slice(0, 18);   // a label, and a stylesheet is not what the viewer reads
    const of = overflowFinding(el, s, id, li, t);
    if (of) issues.push(of);
    // Measure the ink on both axes: the border box is the size the author DECLARED, so a `group`
    // declaring h:400 around a 30px label hard-failed safe-zone on 360px of empty air (reproduced:
    // `[safe] hs-group "small", (200,800,266,1200)`). Ink is a subset of the box on both axes since
    // #242 moved `clampToBox` inside `inkRect`, so this can only shrink a measured extent.
    const ink = !paintsBox(s) && inkRect(el);
    const sb = ink || b;
    // Skipped on a rotated stage (see stageRotated): once #cam is a preserve-3d rig, every box here
    // is an over-bound the safe check can only ever fail. A pure SCALE or TRANSLATE is NOT exempted;
    // there the rect is exact and a genuinely cropped pill (a 1600px pill at s=1.24 really is 1984px
    // wide) should keep failing. The SAFE box is asked in SCENE space (the margin the author placed
    // against, see unCam); the FRAME is asked on SCREEN, since a box past the frame edge is genuinely
    // cropped whatever put it there.
    if (stageRotated || midMove(el, ctx) || !carriesContent(el)) return;
    const rawInk = !paintsBox(s) && textInkRaw(el);
    const sf = safeFinding(sb, ctx, id, li, t, rawInk || null);
    if (sf) issues.push(sf);
    const cf = captionBandFinding(sb, CAPBAND, id, li, t);
    if (cf) issues.push(cf);
  });
  return issues;
}

// An image layer's box exists to clip: `ken`'s overscan IS the Ken-Burns move, and measuring it as
// "content clipped" fired on every ken layer in the repo (gradient-showcase). The rule is about
// clipped TEXT; keep it there.
function overflowFinding(el, s, id, li, t) {
  const clipsByDesign = el.classList.contains('hs-img-wrap');
  if (clipsByDesign) return null;
  const spills = (s.overflowX !== 'visible' && el.scrollWidth > el.clientWidth + 1)
    || (s.overflowY !== 'visible' && el.scrollHeight > el.clientHeight + 1);
  if (!spills || maskedByDesign(el)) return null;
  // `pct`: how far the box overflows on its worst axis, relative to that axis's own size. A
  // sub-pixel rounding difference can read as "overflow" with nothing actually clipped;
  // harness/lib/safeguards.mjs reads this to tell that apart from a real spill.
  const pctW = el.clientWidth ? (el.scrollWidth - el.clientWidth) / el.clientWidth : 0;
  const pctH = el.clientHeight ? (el.scrollHeight - el.clientHeight) / el.clientHeight : 0;
  return { kind: 'overflow', a: id, li, t, pct: Math.max(pctW, pctH),
    detail: `content ${el.scrollWidth}x${el.scrollHeight} clipped to ${el.clientWidth}x${el.clientHeight}` };
}

// The SAFE box is asked in SCENE space (the margin the author placed against, see unCam); the FRAME
// is asked on SCREEN, since a box past the frame edge is genuinely cropped whatever put it there.
//
// Both spaces must agree: on screen alone, the injected 1.06 push carries correctly placed content
// out of its margin; un-scaled alone, a camera zoomed OUT (gh-wrapped holds s=0.98) reports a layer
// sitting comfortably inside as outside. Agreeing means outside the margin as authored AND delivered.
function safeFinding(sb, ctx, id, li, t, rawInk) {
  const { SAFE, FW, FH } = ctx;
  // Off camera is not off safe: a box that does not touch the frame at all is neither outside the
  // margin nor crossing the edge, it is elsewhere in the world (a travelling camera's other stations).
  // Judging those reported seven HARD failures about layers nobody could see. Decided per box from the
  // render, unlike a frame-wide camera exemption, so it can only ever drop a finding about content
  // that is not in the picture.
  if (sb.right <= 0 || sb.left >= FW || sb.bottom <= 0 || sb.top >= FH) return null;
  const cb = unCam(sb, ctx);
  const outside = (r) => r.left < SAFE.x0 - 1 || r.right > SAFE.x1 + 1 || r.top < SAFE.y0 - 1 || r.bottom > SAFE.y1 + 1;
  const offSafe = outside(sb) && outside(cb);
  // Crop reads the UNCLAMPED ink when one was measured (rawInk, a Range over the actual text): the
  // layer's own box (sb) is what clampToBox pulled the ink back inside, so a word transformed past
  // its container by the camera or its own motion track would never register here otherwise.
  const crop = rawInk || sb;
  const cropped = crop.left < -1 || crop.right > FW + 1 || crop.top < -1 || crop.bottom > FH + 1;
  if (!(offSafe || cropped)) return null;
  return { kind: 'safe', a: id, li, t, detail: `(${cb.left | 0},${cb.top | 0},${cb.right | 0},${cb.bottom | 0})${cropped ? ', cropped by the frame edge' : ''}` };
}

// The safe box says where content may live; it says nothing about the strip a burnt-in caption will
// be painted into, so a headline could land squarely on the caption and every rule above stayed
// green. Same measurement as the safe walk, over a band core/layout/safe.js derives from the same
// destination numbers the caption is placed against.
function captionBandFinding(sb, CAPBAND, id, li, t) {
  if (!CAPBAND) return null;
  const deep = Math.min(sb.bottom, CAPBAND.y1) - Math.max(sb.top, CAPBAND.y0);
  if (!(deep > CAPBAND.tol)) return null;
  return { kind: 'caption-band', a: id, li, t,
    detail: `sits ${deep | 0}px into the caption band (y ${CAPBAND.y0}..${CAPBAND.y1}, ${CAPBAND.skin} skin): the caption will be painted over it` };
}

// image legibility floor: a standalone logo/image layer must not be smaller than ~5% of the frame
// height (a 44px logo in a 1080p frame is unreadable). Frame-relative, so it scales to any orientation.
function checkImageFloor() {
  const issues = [];
  const MIN_IMG = window.innerHeight * 0.05;
  for (const im of document.querySelectorAll('.hs-img-wrap > img')) {
    if (!vis(im)) continue;
    const b = im.getBoundingClientRect();
    // Collapsed image: on screen but occupies no space (MISTAKES #19). Measures the LAYOUT box
    // (offsetWidth/Height), not the painted rect, since an image mid-`scale` entry legitimately has a
    // ~0 painted rect while its layout box stays full size.
    if (im.offsetHeight < 1 || im.offsetWidth < 1) {
      issues.push({ kind: 'collapsed-image', a: (im.getAttribute('src') || 'img').split('/').pop(), detail: `lays out ${im.offsetWidth}x${im.offsetHeight}, visible but occupies no space, renders as nothing` });
      continue;
    }
    if (b.height > 1 && b.height < MIN_IMG) issues.push({ kind: 'tiny-image', a: (im.getAttribute('src') || 'img').split('/').pop(), detail: `${b.height | 0}px tall < ${MIN_IMG | 0}px floor (5% frame h), logos read at ~7%` });
  }
  return issues;
}

// text legibility floor: a text layer rendered below ~1.3% of frame height is unreadable at video
// distance. Frame-relative so it scales to portrait/landscape.
function checkTinyText() {
  const issues = [];
  const MIN_TXT = window.innerHeight * 0.013;
  for (const tx of document.querySelectorAll('.hs-text')) {
    if (!vis(tx)) continue;   // the logotype exemption is CONTRAST-only (WCAG 1.4.3); a mark still has to be big enough to see
    // Measures the element that actually HOLDS the text, not the layer wrapper: an `html` layer nests
    // content in a child styled at its own size, and the wrapper's inherited 16px default isn't seen.
    const holders = [tx, ...tx.querySelectorAll('*')].filter((el) =>
      [...el.childNodes].some((nd) => nd.nodeType === 3 && nd.nodeValue.trim()));
    for (const el of holders) {
      if (!vis(el)) continue;
      if (el.getBoundingClientRect().width <= 1) continue;
      const fs = parseFloat(getComputedStyle(el).fontSize) || 0;
      const t = inkText(el).trim();   // a <style> block has a font-size and would read as tiny text
      if (fs && t && fs < MIN_TXT) issues.push({ kind: 'tiny-text', a: t.slice(0, 16), detail: `${fs | 0}px < ${MIN_TXT | 0}px floor (1.3% frame h), unreadable` });
    }
  }
  return issues;
}

// The overflow rule above only inspects top-level/critical layers, so a mask nested inside a text
// layer was invisible to it: `riseClip`'s overflow:hidden plus .hs-text's tight line-height sliced
// 13px off every word at 76px, shipping flat-bottomed g/y/p (MISTAKES #35).
function checkClippedText() {
  const issues = [];
  for (const el of document.querySelectorAll('.hs-text *, .hs-cap *')) {
    const cs = getComputedStyle(el);
    if (cs.overflow !== 'hidden' && cs.overflowY !== 'hidden') continue;
    if (el.querySelector('img, canvas, svg, video')) continue;      // media clips on purpose
    // <style> source is not glyphs: reading a hand-authored `html` layer's inline CSS as text made
    // the audit report a frosted pane as "287px of clipped descenders" of `.g{position:rela`
    // (engine-doctrine/MISTAKES.md #220). Only RENDERED text counts.
    const txt = inkText(el).trim();
    if (!txt || !vis(el) || !atRest(el) || maskedByDesign(el)) continue;
    const dy = el.scrollHeight - el.clientHeight, dx = el.scrollWidth - el.clientWidth;
    // `ellipsis`: this node ASKED to truncate (text-overflow:ellipsis on overflow:hidden). That is
    // designed truncation, not the mask-too-small bug this check exists to catch, and
    // harness/lib/safeguards.mjs reads this flag to tell the two apart.
    if (dy > 1 || dx > 1) issues.push({ kind: 'clipped-text', a: txt.slice(0, 16),
      ellipsis: cs.textOverflow === 'ellipsis' && cs.overflow === 'hidden',
      detail: `mask is ${dy > 1 ? `${dy}px too short` : `${dx}px too narrow`} for the glyphs, descenders/edges are being cut` });
  }
  return issues;
}

// A captured component is sized to the box the capture measured; if re-rendered content doesn't fit,
// .hs-comp's overflow:hidden trims it silently. clipped-text only walks .hs-text, so a component (a
// foreign DOM subtree) lost its bottom 24px for as long as it shipped with nothing catching it (#43).
function checkClippedComponent() {
  const issues = [];
  for (const el of document.querySelectorAll('.hs-comp')) {
    if (!vis(el) || !atRest(el) || maskedByDesign(el)) continue;
    const dy = el.scrollHeight - el.clientHeight, dx = el.scrollWidth - el.clientWidth;
    if (dy > 1 || dx > 1) issues.push({ kind: 'clipped-component', a: 'component',
      detail: `content needs ${el.scrollWidth}x${el.scrollHeight} but the captured box is ${el.clientWidth}x${el.clientHeight}, ${dy > 1 ? `${dy}px` : `${dx}px`} is being cut off. A margin on the captured root is the usual cause (capture measures a border box).` });
  }
  return issues;
}

// Nothing measured where a beat's content SITS in the frame: six of twelve beats across two
// showcase films crammed everything into the top 60% and passed safe-zone clean (MISTAKES #77).
// Safe-zone answers "is it inside the frame"; this answers "does it USE the frame". Warn tier: a
// deliberately top-weighted beat is a real choice.
function checkVerticalMass(ctx) {
  const issues = [];
  const solid = ctx.info.filter((e) => +getComputedStyle(e.el).opacity > 0.9);
  if (solid.length >= 2) {
    const top = Math.min(...solid.map((e) => e.y)), btm = Math.max(...solid.map((e) => e.btm));
    const H = window.innerHeight;
    const deadBottom = (H - btm) / H, deadTop = top / H;
    // a third of the frame empty at ONE end, while the other end is nearly flush, reads as a beat
    // that ran out rather than one that was composed
    if (deadBottom > 0.33 && deadTop < 0.12) issues.push({ kind: 'top-heavy', a: 'composition',
      detail: `content ends at ${(btm / H * 100) | 0}% of the frame with the bottom ${(deadBottom * 100) | 0}% empty, the beat uses the top and abandons the rest` });
    if (deadTop > 0.33 && deadBottom < 0.12) issues.push({ kind: 'bottom-heavy', a: 'composition',
      detail: `content starts at ${(deadTop * 100) | 0}% down with the top ${(deadTop * 100) | 0}% empty` });
  }
  return issues;
}

// A cross-dissolve is two layers deliberately sharing the same box, one fading out while the other
// fades in, the standard way to morph a headline between two states. Only exempted for a genuine
// hand-off: both partly transparent, one exiting while the other enters.
const fading = (el, tNow) => {
  if (!el || !el.dataset || el.dataset.start == null) return null;
  const st = parseFloat(el.dataset.start) || 0;
  const en = el.dataset.enter != null ? parseFloat(el.dataset.enter) : 0.45;
  const du = el.dataset.duration != null ? parseFloat(el.dataset.duration) : Infinity;
  const exD = el.dataset.exitDur != null ? parseFloat(el.dataset.exitDur) : 0.4;
  if (tNow < st + en) return 'in';
  if (du !== Infinity && tNow > st + du - exD) return 'out';
  return null;
};
const crossDissolve = (A, B, tNow) => {
  const fa = fading(A.el, tNow), fb = fading(B.el, tNow);
  if (!fa || !fb || fa === fb) return false;                          // need one in + one out
  const oa = +getComputedStyle(A.el).opacity, ob = +getComputedStyle(B.el).opacity;
  return oa < 0.98 && ob < 0.98;                                      // both mid-blend, neither solid
};
// A card floating over a board overlaps the text beneath it by box and hides it by paint: a layered
// composition, not a collision. Samples the centre of the intersection; an opaque surface painted
// above the lower of the two means it cannot be SEEN (same reasoning as #44's filled-chip case).
const occluded = (A, B, ox, oy) => {
  const cx = Math.max(A.x, B.x) + ox / 2, cy = Math.max(A.y, B.y) + oy / 2;
  const stack = document.elementsFromPoint(cx, cy);
  // The element and its descendants are its paint; its ANCESTORS are not. `e.contains(el)` instead
  // of `el.contains(e)` matched every ancestor, which a full-bleed backdrop always provides, firing
  // the occlusion escape far more often than intended (same misread as `mine` in `buried` below).
  const at = (el) => stack.findIndex((e) => e === el || el.contains(e));
  const ia = at(A.el), ib = at(B.el);
  let hidden = ia < 0 || ib < 0;                    // one is not even painted at that point
  for (let k = 0; !hidden && k < Math.max(ia, ib); k++) {
    // A local alpha test rather than `parse`: the two are NOT equivalent, `parse` also reads
    // `color(srgb ...)`, and adopting it here would silently widen what counts as an opaque cover.
    const bgc = getComputedStyle(stack[k]).backgroundColor || '';
    const m = /rgba?\(([^)]+)\)/.exec(bgc);
    const alpha = m ? (m[1].split(',')[3] !== undefined ? parseFloat(m[1].split(',')[3]) : 1) : 0;
    if (alpha > 0.85) hidden = true;
  }
  return hidden;
};
// Skipped wholesale on a rotated stage (see stageRotated): a projected quad's AABB carries no
// information about whether two shapes intersect. `safe` and `caption-band` are skipped at their own
// call sites for the same reason; clipped/contrast still run since neither reads a rect against a
// frame.
function checkPairs(ctx) {
  const { info, stageRotated } = ctx;
  const issues = [];
  for (let i = 0; i < info.length && !stageRotated; i++) for (let j = i + 1; j < info.length; j++) {
    const f = pairFinding(info[i], info[j], ctx);
    if (f) issues.push(f);
  }
  return issues;
}

// One pair, one verdict: they collide, they sit too close, or there is nothing to say.
function pairFinding(A, B, ctx) {
  const { MIN_GAP, tNow } = ctx;
  if (A.el.contains(B.el) || B.el.contains(A.el)) return null;         // skip nested pairs
  const ox = Math.min(A.r, B.r) - Math.max(A.x, B.x);                  // >0 → overlap on X
  const oy = Math.min(A.btm, B.btm) - Math.max(A.y, B.y);              // >0 → overlap on Y
  if (ox > 2 && oy > 2) {
    if (crossDissolve(A, B, tNow)) return null;                        // intentional hand-off
    // A layer mid-entrance is intentionally off-position, so a transient intersection while it
    // travels is motion, not a collision. Overlap needs the same exemption safe-zone always had, once
    // widening it past `critical` made those transients visible.
    if (midMove(A.el, ctx) || midMove(B.el, ctx)) return null;
    if (occluded(A, B, ox, oy)) return null;
    return { kind: 'overlap', a: A.id, b: B.id, detail: `${ox | 0}x${oy | 0}px` };
  }
  let gap = Infinity;                                                  // gap only meaningful when they share one axis
  if (ox > 0) gap = Math.min(gap, -oy);
  if (oy > 0) gap = Math.min(gap, -ox);
  if (gap !== Infinity && gap >= 0 && gap < MIN_GAP) return { kind: 'tight', a: A.id, b: B.id, detail: `${gap | 0}px` };
  return null;
}

// The pair loop above forgives an overlap once an opaque surface paints over the lower layer, but
// for the film's own headline that assumption is backwards: blind judges called a title unreadable
// on a scene the pair loop passed clean, since the covering `html` layer matched no selector `info`
// reads. Asked directly and per-layer instead, scoped to `critical` (>=60px display text): how much
// of this text is under paint.
function checkBuried(ctx) {
  const { FW, FH, layerIdx } = ctx;
  const OCCLUDE_MAX = 0.4;
  const issues = [];
  for (const el of document.querySelectorAll('[data-layer="critical"]')) {
    if (!vis(el) || midMove(el, ctx)) continue;
    const r = inkRect(el) || el.getBoundingClientRect();
    if (r.width < 4 || r.height < 4) continue;
    const { covered, total } = coverSample(el, r, FW, FH);
    if (total && covered / total > OCCLUDE_MAX)
      // a ransom/sprite headline has no textContent and no id, so neither can name it; the ink's top
      // edge can, and it keeps two headlines in one film from de-duping into a single reported finding
      issues.push({ kind: 'buried', a: el.id || `headline@y${r.top | 0}`, li: layerIdx.get(el.closest('.hs-layer')),
        t: inkText(el).trim().slice(0, 18),
        detail: `${Math.round(covered / total * 100)}% of this headline sits under an opaque layer` });
  }
  return issues;
}

// 9x9, not 9x5: a coarse grid quantises the answer to fifths, and the case this check exists for
// measured 46% of the headline covered, sampled as exactly 40%, one point under its own bar.
function coverSample(el, r, FW, FH) {
  let covered = 0, total = 0;
  for (let gy = 0; gy < 9; gy++) for (let gx = 0; gx < 9; gx++) {
    const px = r.left + r.width * (gx + 0.5) / 9, py = r.top + r.height * (gy + 0.5) / 9;
    if (px < 0 || py < 0 || px >= FW || py >= FH) continue;
    const stack = document.elementsFromPoint(px, py);
    // "Is this MY paint?" is answered by the element and its descendants only; `e.contains(el)` also
    // matched every ancestor (#cam, .hs-stage, body), which let a mis-measured rect (see clampToBox)
    // sample 81 points of empty canvas and still call all 81 "the headline".
    const mine = stack.findIndex((e) => e === el || el.contains(e));
    if (mine < 0) continue;                        // not painted here at all: outside the ink, not buried
    total++;
    for (let k = 0; k < mine; k++) if (opaqueAt(stack[k])) { covered++; break; }
  }
  return { covered, total };
}


// ── CONTRAST: COLLECT PROBES, THEN HIDE THE GLYPHS (engine-doctrine/MISTAKES.md #390) ────────────
// Each rule below names its SUBJECT (ink box, declared ink colour, size, structural flags); the
// caller measures the backdrop from the composited frame with the subject's own paint hidden.
//
// The old `bgFor` searched the DOM for something behind the text (ancestors, then
// elementsFromPoint, then the bg canvas, then body), and every ordering was wrong for some real
// film: a sibling button fill measured 1.0:1 through the ancestor walk, elementsFromPoint's
// hit-testing never sees a `pointer-events:none` bg canvas, and stopping at the canvas misses a
// hand-authored `html` backdrop. The question is not a DOM question; the composited pixel is.

// Contrast (WCAG AA, size-aware) on EVERY rendered text element, not just [data-layer=critical]:
// muted labels and captions are where low-contrast gray-on-white slips through. A video is usually
// watched scaled down, so the WCAG large-text allowance only applies to genuinely big type (>=48px).
function collectTextProbes(probe) {
  for (const el of document.querySelectorAll('body *')) {
    if (el.closest('script, style, noscript, svg')) continue;
    if (![...el.childNodes].some((nd) => nd.nodeType === 3 && nd.nodeValue.trim())) continue; // only elements with DIRECT text
    if (!vis(el)) continue;
    const b = el.getBoundingClientRect();
    if (b.width < 2 || b.height < 2) continue;
    if (el.closest('[data-logotype]')) continue; // WCAG 1.4.3 logotype exemption, declared per layer
    // Only ARRIVED text is graded: mid-entrance the measured ratio is a fact about the fade ramp,
    // not the design (#376).
    if (!arrived(el)) continue;
    const cs = getComputedStyle(el);
    const fg = parse(cs.color);
    if (!fg || fg[3] < 0.5) continue;
    // Reads the backdrop under the glyphs (the ink box), not the declared box: with `align:"left"`
    // the glyphs sit against one edge and the rest of the box may be over a different surface.
    const pb = (!paintsBox(cs) && inkRect(el)) || b;
    probe(el, boxOf(pb), { rule: 'text', px: parseFloat(cs.fontSize) || 0, fg,
      a: el.id || (typeof el.className === 'string' ? el.className.split(' ')[0] : el.tagName),
      t: inkText(el).trim().slice(0, 18) });
  }
}

// The loop above reads each layer's top-level colour only, so a <b>/<em> span's own colour (--em)
// went unchecked (an accent <b> on an accent bg, the blue-on-blue bug). Soft-tier when the layer
// isn't critical so existing videos don't newly hard-fail.
function collectSpanProbes(probe) {
  const checkSpan = (span, critical, label) => {
    // inkText, not textContent: `t` is a GATE as well as a label, and a layer with only an inline
    // stylesheet would otherwise pass the emptiness test on its own CSS source (MISTAKES #220/#216/#217).
    const t = inkText(span).trim(); if (!t || !vis(span)) return;
    const b = span.getBoundingClientRect(); if (b.width < 2 || b.height < 2) return;
    const cs = getComputedStyle(span);
    const px = parseFloat(cs.fontSize) || 0;
    if (px < 40) return; // ignore small captions/labels
    const fg = parse(cs.color); if (!fg || fg[3] < 0.5) return;
    // The ink box again: an inline <b>/<em> box already hugs its run, but a headline-scale layer's
    // box is the declared `w`.
    const pb = (!paintsBox(cs) && inkRect(span)) || b;
    probe(span, boxOf(pb), { rule: 'span', a: label, label, critical, t: t.slice(0, 18), fg, px });
  };
  for (const tx of document.querySelectorAll('.hs-text')) {
    if (!vis(tx) || tx.closest('[data-logotype]')) continue; // WCAG 1.4.3 logotype exemption
    const critical = tx.getAttribute('data-layer') === 'critical' || !!tx.closest('[data-layer="critical"]');
    for (const em of tx.querySelectorAll('b, em')) checkSpan(em, critical, em.tagName.toLowerCase()); // <b>/<em> always: they carry --em
    const px = parseFloat(getComputedStyle(tx).fontSize) || 0; // the whole layer only when headline-scale AND not already checked as critical above
    if (px >= 60 && !critical && [...tx.childNodes].some((nd) => nd.nodeType === 3 && nd.nodeValue.trim())) checkSpan(tx, false, 'text');
  }
}

// Did the author put an opaque shape behind this text (a chip, a pill, a filled panel), versus the
// text sitting on the scene field? Answered structurally: is there an opaque sibling in the paint
// stack under it.
const onOwnFill = (el, bx) => {
  // A layer that paints its OWN fill is a chip too, and the sibling-only stack walk below could
  // never see one: tpot's brand-blue chip is one div with a background and a white word inside it,
  // so "is there an opaque sibling" answered no and a deliberate chip was held to the 7:1 field bar
  // (MISTAKES #390). Walk the element and its ancestors up to the layer first. A full-bleed surface
  // is the FIELD, not a chip, and does not count, but this loop can only ever relax a bar.
  const stop = el.closest('.hs-layer');
  for (let p = el; p; p = p.parentElement) {
    const c = parse(getComputedStyle(p).backgroundColor);
    if (c && c[3] > 0.85 && arrived(p)) {
      const pb = p.getBoundingClientRect();
      if (pb.width < window.innerWidth * 0.9 || pb.height < window.innerHeight * 0.9) return true;
    }
    if (p === stop) break;
  }
  for (const p of document.elementsFromPoint(bx.x + bx.w / 2, bx.y + bx.h / 2)) {
    if (p === el || el.contains(p) || p.contains(el)) continue;
    const c = parse(getComputedStyle(p).backgroundColor);
    if (c && c[3] > 0.85) return true;
    if (p.tagName === 'IMG' || (p.querySelector && p.querySelector('img'))) return false; // a photo backdrop is a field, not a chip
  }
  return false;
};
// Legibility (4.5:1) is not enough for display type; below 7:1 it reads washed-out ("gray heading").
// Judges every arrived display-scale text, not just the single largest: picking one winner per frame
// meant an identical 80px headline at 3.3:1 hard-failed only when it had no bigger sibling.
function collectHeadlineProbes(ctx, probe) {
  const texts = ctx.info.filter((e) => [...e.el.childNodes].some((nd) => nd.nodeType === 3 && nd.nodeValue.trim()));
  for (const e of texts) {
    const px = parseFloat(getComputedStyle(e.el).fontSize) || 0;
    if (px < 56) continue;
    if (!arrived(e.el)) continue; // judge only ARRIVED headlines (mid-fade is motion, not a verdict)
    const fg = parse(getComputedStyle(e.el).color);
    if (!fg || fg[3] < 0.85) continue;
    const bx = { x: e.x, y: e.y, w: e.r - e.x, h: e.btm - e.y };
    // The 7:1 bar exists for display type on the SCENE FIELD, where a low-saturation tint reads
    // washed-out. Text on a filled chip cannot wash out, so it is judged at the large-text bar
    // instead: held to 7:1, the gate rejected white on a brand's own button blue (MISTAKES #44).
    probe(e.el, bx, { rule: 'headline', a: e.id, t: e.t, fg, px, chip: onOwnFill(e.el, bx) });
  }
}

// IMAGE contrast: a critical logo/icon can vanish into a same-hue backdrop (orange-on-orange), 
// average the image's opaque pixels and hold them to the WCAG non-text bar (3:1; hard < 1.7).
function collectImageProbes(ctx, probe) {
  const imgProbe = document.createElement('canvas'); imgProbe.width = imgProbe.height = 24;
  const ipc = imgProbe.getContext('2d', { willReadFrequently: true });
  for (const e of ctx.info) {
    // inkText again: a wrapper holding only a stylesheet is empty as far as the viewer is concerned
    const im = e.el.tagName === 'IMG' ? e.el : ((e.el.children.length === 1 || !inkText(e.el).trim()) ? e.el.querySelector('img') : null);
    if (!im || !im.complete || !im.naturalWidth) continue;
    let avg;
    try {
      ipc.clearRect(0, 0, 24, 24); ipc.drawImage(im, 0, 0, 24, 24);
      const d = ipc.getImageData(0, 0, 24, 24).data;
      let r = 0, g = 0, b = 0, k = 0;
      for (let i = 0; i < d.length; i += 4) if (d[i + 3] > 40) { r += d[i]; g += d[i + 1]; b += d[i + 2]; k++; }
      if (k < 20) continue; // nearly empty raster, nothing to judge
      avg = [r / k, g / k, b / k];
    } catch { continue; } // cross-origin taint → skip, never guess
    // The backdrop wanted is the LAYER's, whether the raster is the layer itself or a child <img>,
    // and the raster is what has to come off the frame for that backdrop to be visible at all.
    probe(im, { x: e.x, y: e.y, w: e.r - e.x, h: e.btm - e.y }, { rule: 'image', avg,
      a: e.id || 'img', t: (im.getAttribute('src') || '').split('/').pop().slice(0, 18) });
  }
}

// A probe is a SUBJECT plus the box its backdrop will be read from. `hide` is the element whose
// own paint has to come off before the screenshot, the text holder itself, or the raster for an
// image probe. Same element can be probed twice (a headline is both `text` and `headline`); the
// hide list de-dups, because hiding twice would capture the already-transparent inline style as
// the value to restore and leave the frame permanently blank.
function collectProbes(ctx) {
  const probes = [], hideList = [];
  const probe = (hide, box, p) => { if (ctx.inOverlay) return; probes.push({ box, ...p }); if (hide) hideList.push(hide); };
  collectTextProbes(probe);
  collectSpanProbes(probe);
  collectHeadlineProbes(ctx, probe);
  collectImageProbes(ctx, probe);
  return { probes, hideList };
}

// HIDE EVERY SUBJECT'S OWN PAINT. Layout-neutral, and `transition:none` alongside it so the hide
// is atomic: a transition on `color` would animate it and the screenshot taken immediately after
// would catch a half-transparent glyph, contaminating the very sample it was taken for.
// `-webkit-text-fill-color` is set as well as `color` because it WINS over it, and gradient-filled
// display type sets exactly that.
function hideProbeSubjects(hideList) {
  const store = [], already = new Set();
  window.__auditHidden = store;
  for (const el of hideList) {
    if (already.has(el)) continue;
    already.add(el);
    const rec = { el, props: [] };
    const set = (prop, val) => {
      rec.props.push([prop, el.style.getPropertyValue(prop), el.style.getPropertyPriority(prop)]);
      el.style.setProperty(prop, val, 'important');
    };
    set('transition', 'none');
    if (el.tagName === 'IMG') set('opacity', '0');
    else {
      set('color', 'transparent');
      set('-webkit-text-fill-color', 'transparent');
      set('-webkit-text-stroke-color', 'transparent');
      // A text-shadow is the TEXT's paint, not the backdrop's, and here it is often the ink colour
      // itself: `core/type/ransom.js` sets `0 0 4px <ink>, 0 0 9px <ink>` as a neon glow. Left standing,
      // a transparent glyph still smears its own colour across the box the backdrop is read from,
      // and the ratio collapses toward 1:1, the old bug's shape, in a new place. Chromium paints a
      // text-shadow even for transparent text, so it has to come off explicitly.
      set('text-shadow', 'none');
      if (el.ownerSVGElement) set('fill', 'transparent');
    }
    store.push(rec);
  }
}

// runs in-page: render frame n, measure every visible [data-layer=critical] box, return issues.
// THE ORDER OF THIS LIST IS OUTPUT. Findings print in push order and de-dup to the first occurrence,
// so re-sorting the checks re-sorts every report this gate writes.
function auditFrame(n, SAFE, MIN_GAP, CUTS, OVERLAYS, CAPBAND) {
  window.__engine.renderFrame(n);
  const ctx = frameContext(n, SAFE, MIN_GAP, CUTS, OVERLAYS, CAPBAND);
  const issues = [];
  for (const check of [checkLayerBounds, checkImageFloor, checkTinyText, checkClippedText,
    checkClippedComponent, checkVerticalMass, checkPairs, checkBuried])
    issues.push(...check(ctx));
  const { probes, hideList } = collectProbes(ctx);
  hideProbeSubjects(hideList);
  return { issues, count: ctx.info.length, probes };
}


// Undo the hide above. Always called, in a finally: leaving the frame with its text transparent
// would poison the overlay screenshot and every later frame on the same page.
function restoreHiddenFn() {
  const store = window.__auditHidden;
  if (!store) return;
  for (const rec of store) for (const [prop, val, pri] of rec.props) {
    if (val) rec.el.style.setProperty(prop, val, pri); else rec.el.style.removeProperty(prop);
  }
  window.__auditHidden = null;
}

// THE BUNDLE. Puppeteer ships a function to the page by STRINGIFYING it, so a page function can
// reach a helper only if the helper's source travels too. Everything above is concatenated into ONE
// page-side scope here and installed once per page; from inside that scope the checks call each
// other by name exactly as nested functions did, which is what lets them be separate functions at
// all. Insertion order is the order below, so the bundle is byte-identical run to run.
const PAGE_FNS = { vis, effOpacity, arrived, paintsOwnBox, inkText, maskedByDesign, paintsBox,
  shapeInk, svgInk, hasTextOutsideSvg, clampToBox, rangeInk, textInkRaw, inkRect, carriesContent, atRest, opaqueAt, parse, boxOf,
  frameContext, unCam, midMove, checkLayerBounds, overflowFinding, safeFinding, captionBandFinding,
  checkImageFloor, checkTinyText, checkClippedText, checkClippedComponent, checkVerticalMass,
  fading, crossDissolve, occluded, checkPairs, pairFinding, checkBuried, coverSample,
  collectTextProbes, collectSpanProbes, onOwnFill,
  collectHeadlineProbes, collectImageProbes, collectProbes, hideProbeSubjects, auditFrame };
const PAGE_SRC = `(() => {\n${Object.entries(PAGE_FNS).map(([k, f]) => `const ${k} = ${f};`).join('\n')}\n`
  + 'window.__auditFrame = auditFrame;\n})()';


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
// `pin`/`x` centring keywords resolve against the LAYER'S OWN SIZE (core/engine/boot.js resolveCoords: `center`
// → (W - size)/2). A layer with no `w` has size 0, so `center` means (W-0)/2, the layer's LEFT EDGE
// lands on the centre line and the content runs off to the right. It renders wrong at every aspect, but
// Layout placement (a centring keyword with nothing to centre) is defined ONCE, in core/validate/validate.mjs,
// and imported here. It used to live in this file with its own NEEDS_W/PIN_X tables, a second copy of
// a rule the engine also needs, which is the exact shape of the bug that gave the repo four safe boxes
// and eight canvas-size derivations (engine-doctrine/MISTAKES.md #46). The validator is the owner; the audit
// reports the same finding so a render surfaces it too.
function sourceIssues(cfg) {
  const out = layoutErrors(cfg).map((detail) => ({ kind: 'degenerate-pin', a: 'layout', t: '', detail }));
  for (const L of cfg.layers || []) {
    if (!L || typeof L !== 'object') continue;
    const id = L.id || L.type || 'layer';
    const t = snippet(L.text, 18);
    // dx/dy are read only inside scene.html's anchor pass (`const T = L.anchor && byId[L.anchor]`), so
    // without a resolvable anchor they are silently dropped, authored intent that never renders.
    if ((L.dx != null || L.dy != null) && !L.anchor)
      out.push({ kind: 'dead-offset', a: id, t, detail: `dx/dy are anchor offsets and do nothing without \`anchor\`, the layer renders unshifted` });
  }
  return out;
}

// ── THE COMPOSITED PIXEL UNDER THE GLYPHS (engine-doctrine/MISTAKES.md #390) ────────────────────────────
// The page function above names each contrast SUBJECT and takes its own paint off the frame. What
// follows measures the backdrop that reveals, which is the thing a viewer actually sees: no DOM
// search, no paint-order guess, no `pointer-events` trap, and no way for a `pointer-events:none`
// canvas or a hidden-canvas hand-authored backdrop to be missed. The effective-opacity guard on
// anything counted as a backdrop is not repeated here because it cannot be needed: a transparent
// element contributes nothing to a composited pixel, which is what "effective opacity" was an
// estimate OF. The guard on the TEXT stays, in the page function, where the ink colour is read.

// A PNG decoder, because a screenshot has to become numbers and this repo ships no image library.
// Chromium emits 8-bit non-interlaced PNG. Anything else THROWS rather than guessing, and the
// caller turns that throw into a loud finding: a contrast check that silently measures nothing is
// exactly the failure this entry is about.
function decodePNG(buf) {
  if (buf.length < 8 || buf.readUInt32BE(0) !== 0x89504e47) throw new Error('not a PNG');
  let pos = 8, w = 0, h = 0, depth = 0, ctype = 0, interlace = 0, palette = null;
  const idat = [];
  while (pos + 8 <= buf.length) {
    const len = buf.readUInt32BE(pos);
    const type = buf.toString('latin1', pos + 4, pos + 8);
    const data = buf.subarray(pos + 8, pos + 8 + len);
    if (type === 'IHDR') { w = data.readUInt32BE(0); h = data.readUInt32BE(4); depth = data[8]; ctype = data[9]; interlace = data[12]; }
    else if (type === 'IDAT') idat.push(data);
    else if (type === 'PLTE') palette = data;
    else if (type === 'IEND') break;
    pos += 12 + len;
  }
  const CH = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 };
  if (depth !== 8 || interlace !== 0 || !CH[ctype]) throw new Error(`unsupported PNG (depth ${depth}, colour type ${ctype}, interlace ${interlace})`);
  const ch = CH[ctype], stride = w * ch;
  const raw = zlib.inflateSync(Buffer.concat(idat));
  const out = Buffer.alloc(h * stride);
  let p = 0;
  for (let y = 0; y < h; y++) {
    const ft = raw[p++];
    const line = raw.subarray(p, p + stride); p += stride;
    const cur = out.subarray(y * stride, (y + 1) * stride);
    const prev = y ? out.subarray((y - 1) * stride, y * stride) : null;
    for (let i = 0; i < stride; i++) {
      const a = i >= ch ? cur[i - ch] : 0;
      const b = prev ? prev[i] : 0;
      const c = (prev && i >= ch) ? prev[i - ch] : 0;
      let v = line[i];
      if (ft === 1) v = (v + a) & 255;
      else if (ft === 2) v = (v + b) & 255;
      else if (ft === 3) v = (v + ((a + b) >> 1)) & 255;
      else if (ft === 4) {
        const pa = Math.abs(b - c), pb = Math.abs(a - c), pc = Math.abs(a + b - 2 * c);
        v = (v + (pa <= pb && pa <= pc ? a : pb <= pc ? b : c)) & 255;
      } else if (ft !== 0) throw new Error(`bad PNG filter ${ft}`);
      cur[i] = v;
    }
  }
  return { width: w, height: h, ch, ctype, palette, data: out };
}

const pixelAt = (img, x, y) => {
  const i = (y * img.width + x) * img.ch, d = img.data;
  if (img.ctype === 3) { const k = d[i] * 3; return [img.palette[k], img.palette[k + 1], img.palette[k + 2]]; }
  if (img.ch <= 2) return [d[i], d[i], d[i]];
  return [d[i], d[i + 1], d[i + 2]];
};
const median = (a) => { a.sort((x, y) => x - y); return a[a.length >> 1]; };

// The MEDIAN over a bounded 12x6 grid inside the subject's own ink box, inset a pixel to dodge
// anti-aliased edges. Median, not mean, and a grid, not one point: one stray pixel must not decide
// a verdict, and a mean across the seam of two panels invents a colour that is on the frame
// nowhere. Bounded, so a full-width caption bar costs the same as a word.
function sampleBg(img, box, sx, sy) {
  const x0 = Math.max(0, Math.round(box.x * sx) + 1), x1 = Math.min(img.width - 1, Math.round((box.x + box.w) * sx) - 1);
  const y0 = Math.max(0, Math.round(box.y * sy) + 1), y1 = Math.min(img.height - 1, Math.round((box.y + box.h) * sy) - 1);
  if (x1 <= x0 || y1 <= y0) return null;
  const stepX = Math.max(1, Math.floor((x1 - x0) / 12)), stepY = Math.max(1, Math.floor((y1 - y0) / 6));
  const r = [], g = [], b = [];
  for (let y = y0; y <= y1; y += stepY) for (let x = x0; x <= x1; x += stepX) {
    const px = pixelAt(img, x, y); r.push(px[0]); g.push(px[1]); b.push(px[2]);
  }
  return r.length ? [median(r), median(g), median(b)] : null;
}

// WCAG arithmetic, unchanged from the in-page version it replaces, same relative-luminance curve
// core/motion/motion.js uses. It moved here because the pixels are here.
const relLum = ([r, g, b]) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
const cratio = (a, b) => { const [hi, lo] = relLum(a) > relLum(b) ? [relLum(a), relLum(b)] : [relLum(b), relLum(a)]; return (hi + 0.05) / (lo + 0.05); };
const nearColour = (a, b) => Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) + Math.abs(a[2] - b[2]) < 60; // ≈ same colour = invisible
const hex = (c) => '#' + c.map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
const rgbToHsl = ([r, g, b]) => {
  r /= 255; g /= 255; b /= 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2;
  if (mx === mn) return [0, 0, l];
  const d = mx - mn, s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
  const h = mx === r ? ((g - b) / d + (g < b ? 6 : 0)) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [h / 6, s, l];
};
const hslToRgb = (h, s, l) => {
  if (s === 0) return [l * 255, l * 255, l * 255];
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q;
  const k = (t) => { t = (t + 1) % 1; return t < 1 / 6 ? p + (q - p) * 6 * t : t < 1 / 2 ? q : t < 2 / 3 ? p + (q - p) * (2 / 3 - t) * 6 : p; };
  return [k(h + 1 / 3) * 255, k(h) * 255, k(h - 1 / 3) * 255];
};

// A WCAG failure that names the passing colour gets fixed; one that only reports a ratio gets
// waived. So every finding carries the nearest ink that would PASS: same hue, same saturation,
// lightness walked the shortest distance in whichever direction reaches the bar. When no ink
// clears it, a 7:1 bar on a mid-tone backdrop is unreachable from any colour, it says so, which
// is the more useful answer, because then the thing to change is the BACKDROP.
function suggestColour(fg, bg, want) {
  const [h, s, l] = rgbToHsl(fg);
  let best = null;
  for (const dir of [-1, 1]) {
    for (let k = 1; k <= 100; k++) {
      const nl = Math.max(0, Math.min(1, l + dir * k / 100));
      const c = hslToRgb(h, s, nl);
      if (cratio(c, bg) >= want) { if (!best || k < best.k) best = { k, c }; break; }
      if (nl === 0 || nl === 1) break;
    }
  }
  if (best) return { hex: hex(best.c), ratio: cratio(best.c, bg), reachable: true };
  const black = cratio([0, 0, 0], bg), white = cratio([255, 255, 255], bg);
  const c = black >= white ? [0, 0, 0] : [255, 255, 255];
  return { hex: hex(c), ratio: Math.max(black, white), reachable: false };
}
const withFix = (detail, ink, bg, want) => {
  const s = suggestColour(ink, bg, want);
  return {
    detail: `${detail} on ${hex(bg)} → ${s.reachable ? `try ${s.hex} (${s.ratio.toFixed(1)}:1)`
      : `no ink clears ${want}:1 on this backdrop, ${s.hex} is the best at ${s.ratio.toFixed(1)}:1, change the backdrop`}`,
    suggested: s.hex,
  };
};

// The four contrast rules. Their bars, their hard/soft tiering and their wording are unchanged;
// only the backdrop is measured rather than searched for. One rule per function, and the dispatcher
// below owns nothing but the backdrop sample and the ratio.
const imageContrast = (p, ink, bg, rt) => rt < 3
  ? { kind: rt < 1.7 ? 'contrast' : 'contrast-soft', a: p.a, t: p.t,
      ...withFix(`image vs bg ${rt.toFixed(1)}:1`, ink, bg, 3) }
  : null;

const textContrast = (p, ink, bg, rt) => {
  const large = p.px >= 48;              // large display type gets the WCAG large-text bar
  const want = large ? 3.0 : 4.5;        // WCAG AA pass bar: 4.5 normal, 3.0 large
  const hardBar = large ? 2.5 : 3.0;     // below this the text is unreadable -> hard fail (else soft-warn)
  if (rt >= want) return null;
  return { kind: rt < hardBar ? 'contrast' : 'contrast-soft', a: p.a, t: p.t,
    ...withFix(`${p.px | 0}px ${rt.toFixed(1)}:1 (want ${want}:1)`, ink, bg, want) };
};

const spanContrast = (p, ink, bg, rt) => {
  const invisible = nearColour(ink, bg);
  if (rt >= 3.5 && !invisible) return null;
  const hard = p.critical && (invisible || rt < 2.5);
  return { kind: hard ? 'contrast' : 'contrast-soft', a: p.a, t: p.t,
    ...withFix(invisible ? `${p.label} ≈ bg colour (invisible)` : `${p.label} ${p.px | 0}px at ${rt.toFixed(1)}:1`, ink, bg, 3.5) };
};

// A committed fill, decided on the measured pixel rather than structure: a full-bleed brand FIELD,
// the same saturated treatment as a chip, was still held to 7:1 because "chip" could only ever be
// said structurally (brew-launch-act1's 400px white "Meet" on brand orange, f258, plainly legible).
// The ink must be a NEUTRAL EXTREME: a pale-orange heading on orange is the washout defect itself and
// stays at 7:1 (engine-doctrine/MISTAKES.md #390).
const headlineContrast = (p, ink, bg, rt) => {
  const bgSat = rgbToHsl(bg)[1];
  const [, inkSat, inkL] = rgbToHsl(ink);
  const committed = bgSat >= 0.35 && inkSat <= 0.15 && (inkL >= 0.85 || inkL <= 0.15);
  const bar = (p.chip || committed) ? 3 : 7;
  const filled = p.chip || committed;
  if (rt >= bar) return null;
  return { kind: rt < (filled ? 2.5 : 3.5) ? 'weak-headline' : 'weak-headline-soft', a: p.a, t: p.t,
    ...withFix(`headline ${p.px | 0}px at ${rt.toFixed(1)}:1 (want ≥${bar}:1${filled ? `, large text on a ${p.chip ? 'filled chip' : 'saturated field'}` : ''})`, ink, bg, bar) };
};

function contrastFindings(probes, img, vw, vh) {
  const sx = img.width / vw, sy = img.height / vh;
  const out = [];
  for (const p of probes) {
    const bg = sampleBg(img, p.box, sx, sy);
    if (!bg) continue;                       // box off-frame: safe-zone owns that failure, not this one
    const ink = p.rule === 'image' ? p.avg : [p.fg[0], p.fg[1], p.fg[2]];
    const rt = cratio(ink, bg);
    const f = p.rule === 'image' ? imageContrast(p, ink, bg, rt)
      : p.rule === 'text' ? textContrast(p, ink, bg, rt)
      : p.rule === 'span' ? spanContrast(p, ink, bg, rt)
      : p.rule === 'headline' ? headlineContrast(p, ink, bg, rt) : null;
    if (f) out.push(f);
  }
  return out;
}

// `contrast-unmeasurable` is HARD on purpose: a gate that goes quiet when it stops working is
// worse than one that fails.
const HARD = new Set(['overlap', 'overflow', 'safe', 'contrast', 'buried', 'weak-headline', 'degenerate-pin', 'collapsed-image', 'clipped-text', 'clipped-component', 'contrast-unmeasurable']);
const server = await startServer();
const port = server.address().port;
const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--hide-scrollbars', '--force-device-scale-factor=1'] });
const rows = [];
const bootScratch = []; // expanded-sugar scratch files this run wrote, cleaned up at the end

for (const spec of modules) {
  // a .json arg audits that data file (module read from it); a bare name audits the format's sample
  const isData = spec.endsWith('.json');
  const raw = isData ? spec : `films/${spec}/sample.json`;
  // Normalise to a repo-relative path: an absolute arg (the MCP pipeline passes one for a scene
  // under .vawe-data) otherwise concatenates into a garbage path via `path.join(repoRoot, absolute)`.
  const sample = path.isAbsolute(raw) ? path.relative(repoRoot, raw) : raw;
  const absPath = path.join(repoRoot, sample);
  if (sample.startsWith('..') || !fs.existsSync(absPath)) { rows.push({ m: spec, hard: 1, warn: 0, crit: 0, note: 'file not found' }); continue; }
  // `transitions` lowers to cuts/seams/stings before the engine renders (core/transitions/lower.js);
  // without it a film using the documented surface read as having no boundaries at all. #380.
  const cfg = (() => { try { return loadScene(JSON.parse(fs.readFileSync(absPath, 'utf8'))); } catch { return {}; } })();
  const m = isData ? (cfg.module || spec) : spec;
  // the scene's own waiver list, read the same way every other gate reads it.
  const allow = new Set(Array.isArray(cfg.authoring?.allow) ? cfg.authoring.allow : []);

  // The page boots off `sample` as a file, not off `cfg`: a scene carrying block/beat/comp sugar
  // would 404 the browser's `films/scene/scene.js` at the raw layer type, since that page never
  // imports core/engine/expand.js. `bootPathFor` writes the already-expanded `cfg` to a scratch file
  // instead; a no-op for a scene with no sugar.
  const bootSample = bootPathFor(repoRoot, fs.readFileSync(absPath, 'utf8'), cfg, sample);
  if (bootSample !== sample) bootScratch.push(path.join(repoRoot, bootSample));

  // source checks are aspect-independent (they're about the JSON, not a canvas), report them once
  const si = sourceIssues(cfg);
  if (si.length) rows.push({ m: `${isData ? `${m} · ${path.basename(sample)}` : m}  [source]`,
    hard: si.filter((i) => HARD.has(i.kind)).length, warn: si.filter((i) => !HARD.has(i.kind)).length, crit: 0, items: si });

for (const aspectKey of askedAspects) {
  const page = await browser.newPage();
  // Audits at the video's real dimensions: a 16:9 scene audited at portrait 1080x1920 mis-fires
  // safe-zone and the tiny-text floor.
  const [vw, vh] = dimsFor(aspectKey, cfg);
  const safe = safeFor(vw, vh, cfg);
  const capBand = capBandFor(vw, vh, cfg);
  // cut windows the renderer will actually apply (mirrors scene.html: `none` filtered, `dur` is the
  // total window split evenly around t)
  const cutWindows = (cfg.cuts || []).filter((c) => c && c.style && c.style !== 'none')
    .map((c) => ({ t: +c.t, half: (c.dur ?? 0.36) / 2 }));
  // Full-frame generative overlays, mirroring scene.js: a sting spans `dur ?? 1.0` centred on t, a
  // seam `dur ?? 0.5`; contrast is not graded inside one, see `inOverlay`.
  const overlayWindows = [
    ...(cfg.stings || []).filter((s) => s && s.fx && s.fx !== 'none').map((s) => ({ t: +s.t, half: (+(s.dur ?? 1.0)) / 2 })),
    ...(cfg.seams || []).filter((s) => s && s.fx !== 'none').map((s) => ({ t: +s.t, half: (+(s.dur ?? 0.5)) / 2 })),
  ].filter((o) => Number.isFinite(o.t) && o.half > 0);
  await page.setViewport({ width: vw, height: vh, deviceScaleFactor: 1 });
  // ?aspect= is the same knob internal/scene/scene.go passes when rendering, so the audit measures
  // the canvas the CLI would actually ship.
  const q = aspectKey ? `&aspect=${encodeURIComponent(aspectKey)}` : '';
  await page.goto(`http://127.0.0.1:${port}/films/${m}/scene.html?data=/${bootSample}&fps=30${q}`, { waitUntil: 'load' });
  await page.waitForFunction('window.__engineReady === true || window.__engineError', { timeout: 30000 });
  // A scene that refuses to boot is the loudest possible failure: reading __engine.meta
  // unconditionally used to throw here, killing the whole `make audit` sweep on one broken scene.
  const engErr = await page.evaluate(() => window.__engineError && String(window.__engineError));
  if (engErr || !(await page.evaluate(() => !!(window.__engine && window.__engine.meta)))) {
    rows.push({ m: `${isData ? `${m} · ${path.basename(sample)}` : m}  [${aspectKey || `${vw}x${vh}`}]`,
      hard: 1, warn: 0, crit: 0, note: `scene did not load: ${(engErr || 'engine never became ready').split('\n')[0]}` });
    await page.close(); continue;
  }
  // Installed once per page, not once per frame: the bundle is the whole check suite as source.
  await page.evaluate(PAGE_SRC);
  const meta = await page.evaluate(() => window.__engine.meta);
  const total = meta.totalFrames, fps = meta.fps || 30;
  // skip frames inside scene transitions (enter/exit motion is intentionally off-position/faded);
  // meta.segments is the format's declared scene windows (formats without it audit every sample)
  let inTransition = () => false;
  if ((meta.segments || []).length) {
    const cuts = []; let acc = 0;
    meta.segments.forEach((s, i) => { acc += s.dur ?? (s.t1 - s.t0); if (i < meta.segments.length - 1) cuts.push({ t: acc, trans: s.transition ?? 0.4 }); });
    inTransition = (f) => cuts.some((c) => Math.abs(f / fps - c.t) < c.trans + 0.05);
  }
  // Uniform ticks alone have a blind spot the width of a beat: 14 samples across 25s sit 1.8s apart,
  // so a card on screen for 1.4s can fall cleanly between two of them (a captured component shipped
  // visibly cropped this way, frames 187/240 straddling its 190-232 window, MISTAKES #45). So also
  // sample the resting midpoint of every layer, the one frame it is guaranteed on screen and settled.
  const layerMids = (() => {
    try {
      const cfg = JSON.parse(fs.readFileSync(absPath, 'utf8'));
      const out = [];
      const walk = (ls) => { for (const L of ls || []) {
        if (!L || typeof L !== 'object') continue;
        const st = +L.start || 0, du = L.duration != null ? +L.duration : (total / fps) - st;
        if (du > 0) out.push(Math.round((st + du / 2) * fps));
        if (L.children) walk(L.children); // a group child rides its parent's window; harmless duplicate
      } };
      walk(cfg.layers);
      return out;
    } catch { return []; }
  })();
  const frames = [...new Set([...(meta.stings || []).map((t) => Math.round(t * fps)),
    ...layerMids,
    ...Array.from({ length: SAMPLES }, (_, i) => Math.round(((i + 0.5) / SAMPLES) * total))])]
    .filter((f) => f >= 0 && f < total && !inTransition(f)).sort((a, b) => a - b);

  const all = [];
  let critMax = 0, worst = { f: frames[0] || 0, n: -1 };
  for (const f of frames) {
    const { issues, count, probes } = await page.evaluate(
      (a, b, c, d, e, g) => window.__auditFrame(a, b, c, d, e, g), f, safe, MIN_GAP, cutWindows, overlayWindows, capBand);
    critMax = Math.max(critMax, count);
    // The frame with every contrast subject's own paint hidden, composited as the viewer would see
    // it under the glyphs. Deliberately page.screenshot(), not a cached frame buffer, which would
    // predate the DOM mutation just made.
    if (probes && probes.length) {
      let shot = null, shotErr = null;
      try { shot = await page.screenshot({ type: 'png', optimizeForSpeed: true }); }
      catch (e) { shotErr = e.message; }
      finally { await page.evaluate(restoreHiddenFn); }
      // AUDIT_BG_FRAME=<n> writes the hidden-glyph frame the contrast rules measured, since the
      // evidence here is a picture.
      if (shot && +process.env.AUDIT_BG_FRAME === f) fs.writeFileSync(path.join(OUT, `bg.f${f}.png`), shot);
      let img = null;
      if (shot) { try { img = decodePNG(Buffer.from(shot)); } catch (e) { shotErr = e.message; } }
      if (img) issues.push(...contrastFindings(probes, img, vw, vh));
      else issues.push({ kind: 'contrast-unmeasurable', a: 'contrast', t: '',
        detail: `could not read the frame under the glyphs, so no text was graded: ${shotErr || 'unknown'}` });
    }
    const hard = issues.filter((i) => HARD.has(i.kind)).length;
    if (hard > worst.n) worst = { f, n: hard };
    // No frame-wide camera exemption: a JSON-keyframe filter here used to answer "moving" for 90 of
    // 147 scenes (every scene with no declared camera gets an injected slowPush), switching off a HARD
    // fail for most of the library. The page decides per LAYER instead, from the render: `travelling`,
    // `stageRotated`, `unCam`.
    // Routes overflow/clipped-text through the adaptive-safeguards registry: it either hands the
    // finding back unchanged, or attaches `.adapted = { verdict, line }` when the film's own numbers
    // already explain it.
    for (const i of issues) all.push({ f, ...adaptFinding(i, { scene: cfg }) });
  }
  // Every other gate in this repo honours {"authoring":{"allow":[...]}}; this one used not to, so a
  // deliberate composition (ledgerline-neon's bloom-marked row, boxes overlapping by design with no
  // opaque surface for the overlap check's exemption) had no way past it. Waived issues still print,
  // tagged and counted separately.
  const waived = all.filter((i) => allow.has(i.kind));
  // An adapted finding (registry verdict `tolerate`/`reclassify`) already had its HARD-ness judged
  // against the film's own numbers, so it reports as a warning with the adaptation's line as detail.
  const hard = all.filter((i) => HARD.has(i.kind) && !allow.has(i.kind) && !i.adapted);
  const warn = all.filter((i) => (!HARD.has(i.kind) || i.adapted) && !allow.has(i.kind));
  for (const i of waived) i.waived = true;
  // De-dups repeated issues to the first frame they appear on: the same element failing on 12
  // sampled frames is one bug. Keyed on layer index (`li`) where we have it, since the label alone
  // (`hs-text` for every text layer) merged unrelated layers, reporting 1 of 4 real off-frame failures.
  const key = (i) => `${i.kind}|${i.li ?? `${i.a}|${i.t || ''}`}|${i.b || ''}`;
  const uniq = (list) => { const seen = new Set(), out = []; for (const i of list) { const k = key(i); if (!seen.has(k)) { seen.add(k); out.push(i); } } return out; };
  const hu = uniq(hard), wu = uniq(warn), vu = uniq(waived);
  const label = `${isData ? `${m} · ${path.basename(sample)}` : m}  [${aspectKey || `${vw}x${vh}`}]`;
  rows.push({ m: label, hard: hu.length, warn: wu.length, waived: vu.length, crit: critMax, items: [...hu, ...wu, ...vu] });

  await page.evaluate(overlayFn, worst.f, safe);
  // Named for the SCENE, not the module: every scene audits as module `scene`, so `scene.png` was
  // one file shared by every film, overwritten by whichever ran last.
  const shot = `${isData ? path.basename(sample, '.json') : m}${aspectKey ? `.${aspectKey.replace(':', 'x')}` : ''}.png`;
  await page.screenshot({ path: path.join(OUT, shot) });
  await page.close();
}
}
await browser.close(); server.close();
for (const f of bootScratch) { try { fs.unlinkSync(f); } catch {} } // scratch boot file: may already be gone

console.log('\n==================== LAYOUT AUDIT ====================');
let hardTotal = 0, warnTotal = 0;
for (const r of rows) {
  hardTotal += r.hard; warnTotal += r.warn || 0;
  const tag = r.hard ? '✗ FAIL' : r.warn ? '~ warn' : '✓ ok';
  console.log(`\n${tag}  ${r.m}  (${r.crit ?? 0} critical elems · ${r.hard} hard · ${r.warn || 0} warn${r.waived ? ` · ${r.waived} waived` : ''})`);
  if (r.note) console.log(`    ${r.note}`);
  for (const i of (r.items || [])) {
    const who = i.b ? `${i.a} ✕ ${i.b}` : `${i.a}${i.t ? ` "${i.t}"` : ''}`;
    // a waived issue still prints: a gate that goes silent when waived teaches you to waive. An
    // adapted finding prints its registry line, to say what changed and why, not to disappear.
    console.log(i.adapted
      ? `    ○ [${i.kind}] ${i.adapted.line}`
      : `    ${i.waived ? '○' : ' '}[${i.kind}]${i.waived ? ' (waived)' : ''} ${i.f == null ? '' : `f${i.f} `}${who}, ${i.detail}`);
  }
}
console.log(`\noverlays in ${OUT}/ (one PNG per audited scene)`);
console.log(`${hardTotal ? '✗ ' + hardTotal + ' HARD issue(s)' : '✓ no hard issues'}${warnTotal ? ` · ${warnTotal} warning(s)` : ''}`);

// Records what was just printed, for the VAWE_FINDINGS_OUT channel (make judge) rather than
// requiring a caller to re-parse the prose above; the exit handler in harness/lib/findings.mjs flushes it.
const F2 = gateFindings();
for (const r of rows) {
  for (const i of (r.items || [])) {
    const who = i.b ? `${i.a} ✕ ${i.b}` : `${i.a}${i.t ? ` "${i.t}"` : ''}`;
    const summary = i.adapted ? `${r.m}: ${i.adapted.line}` : `${r.m}: ${i.f == null ? '' : `f${i.f} `}${who}, ${i.detail}`;
    const extra = { at: { module: r.m, frame: i.f }, ...(i.waived ? { waived: true } : {}), ...(i.adapted ? { adapted: i.adapted.verdict } : {}) };
    (HARD.has(i.kind) && !i.adapted ? F2.fail : F2.warn)(i.kind, summary, extra);
  }
}

process.exit(hardTotal ? 1 : 0);
