// verify/audit.mjs — layout audit: catches what eyes catch but checklists miss.
// Renders each format's sample headless across sampled frames and flags, on [data-layer="critical"]:
//   • overlap   — two TEXT inks intersect (any size, not just critical)  (HARD fail)
//   • overflow  — text clipped (scrollW/H > clientW/H)    (HARD fail)
//   • safe-zone — element outside the SAFE box            (HARD fail)
//   • contrast  — text/emphasis vs bg below WCAG, incl. <b>/<em> --em spans & ≈-same-colour
//                 (blue-on-blue); widened to any ≥60px headline text  (HARD on critical, else warn)
//   • buried    — >40% of a ≥60px headline sits under an opaque layer  (HARD fail)
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
import { safeArea, nativeAspect, DESTINATION_NAMES, ASPECTS, sceneDims } from '../core/safe.js';
import { layoutErrors } from '../core/validate.mjs';
// The SOURCE-side twin of the in-page `inkText()` below. That helper already refuses to read a
// <style> body as glyphs (docs/MISTAKES.md #216/#217); this file went on doing exactly that when it
// labelled a finding straight off the authored string. Same rule, both sides of the browser boundary.
import { snippet } from '../scripts/lib/text.mjs';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const formatsDir = path.join(repoRoot, 'formats');
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
if (badAspect) { console.error(`unknown aspect "${badAspect}" — known: ${Object.keys(ASPECTS).join(', ')}, or "all"`); process.exit(2); }

const modules = argv.length ? argv
  : fs.readdirSync(formatsDir).filter((d) => fs.existsSync(path.join(formatsDir, d, 'scene.html')));

// The canvas this audit runs at comes from core/safe.js, alongside the safe box it feeds — same
// reason the safe box lives there. An explicit --aspect wins; else the scene's own `aspect`.
const dimsFor = (key, cfg) => sceneDims(cfg, key);

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
function auditFrameFn(n, SAFE, MIN_GAP, CUTS) {
  window.__engine.renderFrame(n);
  const vis = (el) => { for (let p = el; p && p !== document.body; p = p.parentElement) { const s = getComputedStyle(p); if (s.visibility === 'hidden' || +s.opacity <= 0.05) return false; } return true; };
  // effOpacity — the product of every opacity down the paint tree, which is what the VIEWER sees.
  // A judgement about how something LOOKS is only a judgement once the thing has ARRIVED. The
  // weak-headline check knew this and said so ("mid-fade is motion, not a verdict"), but it read the
  // element's OWN opacity, and in a captured component or any grouped beat the fade lives on an
  // ANCESTOR, so the guard never fired where it mattered. The contrast check 80 lines above it had no
  // guard at all and graded anything over 5% opacity, so a whole browser mockup 0.067s into its
  // entrance was reported as a contrast defect and the "fix" would have been to recolour a correct
  // frame. A gate that measures the wrong thing does not merely miss defects, it manufactures them.
  // docs/MISTAKES.md #376.
  const effOpacity = (el) => { let a = 1; for (let p = el; p && p !== document.body; p = p.parentElement) a *= (+getComputedStyle(p).opacity || 0); return a; };
  const ARRIVED = 0.85;
  // OVERLAP looked only at [data-layer="critical"] — text >=60px — so a headline that WRAPPED onto a
  // second line and landed on the small mono caption beneath it was never compared with it. Measured
  // on the reproduction: the headline occupied y 400-681 and the caption sat at 500-525, entirely
  // inside it, and the audit said 0 hard (docs/MISTAKES.md #77).
  // The rule that holds: two TEXT boxes overlapping is a defect; text over a SHAPE is design (a chip
  // on a rect, a label on a card). So the set is every visible text layer, not every critical one.
  // textContent INCLUDES <style> and <script> source. A hand-authored `html` layer carries its CSS inline,
  // so a card with a stylesheet in it registered as a text layer whose "text" was the stylesheet, and then
  // collided with every label deliberately placed on top of it. The layer is a surface, not a text box.
  // Only rendered text counts, so read the ink, not the source.
  // The paint is often one or two levels DOWN: an `html` layer renders as
  // .hs-layer > .hs-html > <the author's card>, and the background lives on the innermost div. Testing
  // only the layer element returned transparent every time, which is why the card kept counting as a
  // text box. So look for any descendant that fills the layer and paints.
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
  const inkText = (el) => {
    let out = '';
    const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, {
      acceptNode: (n) => (n.parentElement && n.parentElement.closest('style, script'))
        ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT,
    });
    while (w.nextNode()) out += w.currentNode.nodeValue;
    return out;
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
  // An inline <svg>'s ink is whatever its paths actually draw, and that is usually INSCRIBED in the
  // element box rather than filling it. A ring of radius 370 in a 1000-unit viewBox leaves 244 units of
  // empty square on every side, and empty square still rotates: turn the layer 45 degrees and its border
  // box sweeps a 1414px diagonal while nothing visible moves at all. That failed a ring which never came
  // near the frame edge, and the only way to satisfy it was to shrink the ring until the design was worse.
  // getBBox() is the union of the drawn geometry in user units; getScreenCTM() carries the viewBox scale
  // AND the layer's rotation, so transforming its four corners gives the true screen AABB of the ink.
  // Ink is a subset of the box, so this can only relax a finding, never invent one. <img> keeps the old
  // rule: for a raster the box really is the ink.
  // A rotated curve has no cheap tight bound. getBBox() gives the shape's own AABB in user units, and
  // both getScreenCTM() math and getBoundingClientRect() then return the AABB of that RECTANGLE once
  // rotated, which over-bounds badly: a semicircle whose ink stops 255px from the top measured as 139px
  // ABOVE it, a 394px error, purely from the empty corners of a box that is not the shape.
  // So sample the outline. SVGGeometryElement exposes getTotalLength/getPointAtLength for every shape
  // we draw, the sampling is fixed-count (no clock, no randomness) so the audit stays deterministic, and
  // the stroke is added back as half its scaled width. 96 samples holds a 1000px arc to well under a
  // pixel, which is far finer than a safe-zone bound needs.
  const SAMPLES_PER_PATH = 96;
  const shapeInk = (g) => {
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
  const DRAWABLE = 'path, circle, ellipse, rect, line, polyline, polygon';
  const svgInk = (svg) => {
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
  // THE INK MAY ONLY EVER SHRINK THE BORDER BOX. This clamp is the whole contract of an ink rect:
  // ink exists to stop measuring empty space, so a rect it returns that is BIGGER than — or somewhere
  // else entirely from — the element's own box is not ink, it is a broken measurement, and the honest
  // answer there is the border box. It used to live at ONE call site (the safe-zone walk), where #211
  // added it after an unclamped svg bound turned showcase-cuts from 0 hard failures into 7. `buried`
  // read the same helper unclamped and inherited the identical bug (docs/MISTAKES.md #211/#214/#216/
  // #217 are all this shape: a rule fixed at a call site while another consumer kept reading it raw).
  // So the clamp is now part of inkRect and every consumer gets it.
  //
  // What it catches here: getScreenCTM() is NOT composed through a 3D rig. The engine promotes #cam to
  // `perspective` + `preserve-3d` for any camera z/tilt move, and from then on an inline <svg> inside a
  // layer reports a screen CTM that is neither the layer's scale nor its position — playhead's tick svg
  // sits at (408,898,288x73) and its CTM maps the same paths to (150,341,123x29), a rect on the far side
  // of the frame. Unclamped, `buried` then sampled 81 points over a region the layer does not occupy,
  // found the white card that really is painted there, and reported the headline 100% buried.
  const clampToBox = (r, el) => {
    const b = el.getBoundingClientRect();
    const left = Math.max(r.left, b.left), right = Math.min(r.right, b.right);
    const top = Math.max(r.top, b.top), bottom = Math.min(r.bottom, b.bottom);
    return (right > left && bottom > top)
      ? { left, top, right, bottom, width: right - left, height: bottom - top, geometry: r.geometry }
      : { left: b.left, top: b.top, right: b.right, bottom: b.bottom, width: b.width, height: b.height, geometry: r.geometry };
  };
  const inkRect = (el) => {
    if (el.querySelector('img')) return null;            // raster: the element box IS the ink
    const svgs = [...el.querySelectorAll('svg')];
    if (svgs.length) {
      const rects = svgs.map(svgInk).filter(Boolean);
      if (!rects.length) return null;
      const left = Math.min(...rects.map((r) => r.left)), right = Math.max(...rects.map((r) => r.right));
      const top = Math.min(...rects.map((r) => r.top)), bottom = Math.max(...rects.map((r) => r.bottom));
      // width/height are NOT decorative: downstream checks (buried, tight) read them and feed the centre
      // to elementsFromPoint, which throws on a non-finite value. A DOMRect carries them; a bare literal
      // standing in for one has to as well.
      if (![left, top, right, bottom].every(Number.isFinite)) return null;
      return clampToBox({ left, top, right, bottom, width: right - left, height: bottom - top, geometry: true }, el);
    }
    const r = document.createRange();
    r.selectNodeContents(el);
    const b = r.getBoundingClientRect();
    return (b.width > 1 && b.height > 1) ? clampToBox(b, el) : null;
  };
  const els = [...document.querySelectorAll('[data-layer="critical"], .hs-layer.hs-text')].filter((el) => {
    if (!inkText(el).trim()) return false;   // shapes and empty wrappers are not the subject
    // A layer that paints its own background is a SURFACE, and this check's own rule is that text over a
    // shape is design, not collision: a chip on a rect, a label on a card. `html` layers are classed
    // hs-text, so a hand-authored card counted as a text box the size of the whole card and collided with
    // every row deliberately placed on it. Compare the labels to each other, not to the thing they sit on.
    if (el.classList.contains('hs-layer') && paintsOwnBox(el)) return false;
    const b = el.getBoundingClientRect(); return b.width > 1 && b.height > 1 && vis(el);
  });
  const info = els.map((el) => {
    const b0 = el.getBoundingClientRect(), s = getComputedStyle(el);
    // MEASURE THE GLYPHS, NOT THE BOX THE AUTHOR ASKED FOR. `pin` centres a box, so a centred text
    // layer MUST declare a `w`, and that `w` is a wrapping width: the glyphs that land inside it are
    // usually far narrower and, with `align:"left"`, sit against one edge with the rest empty. Two
    // layers whose declared boxes intersect over that empty slack are not touching on screen, and the
    // check reported them as a collision — a finding about the JSON, not about the film. Reproduced
    // with a 1200px-wide layer reading "Hi": a hard `overlap 400x50px` against a neighbour 700px away.
    // The ink rect is clamped inside the border box (see clampToBox), so this can only ever SHRINK a
    // measured box and therefore can only ever remove a finding, never invent one.
    const ink = !paintsBox(s) && inkRect(el);
    const b1 = ink || b0;
    // A text element's BOX includes line-height leading; its INK does not. `statBig` tucks its label
    // under the number's box on purpose and the two never touch visually — comparing raw boxes called
    // that a collision. Inset each text box by ~16% of its font size top and bottom, which is about
    // the gap between the em box and the cap-to-descender ink, so the check compares what is SEEN.
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
  const issues = [];
  // A layer mid enter-animation (or a moving `out` exit) is intentionally off-position, so its box
  // isn't a real safe-zone breach — only flag safe when the layer is at rest. Default exits fade in
  // place (no movement), so those still get checked. Timing comes from the render's data-* attrs.
  const FPS = (window.__engine && window.__engine.meta && window.__engine.meta.fps) || 30;
  const tNow = n / FPS;
  // A SCENE CUT displaces the whole camera for the length of its window, so during one every layer
  // is legitimately off its mark — including outside the safe box. midMove() understands per-layer
  // entrances but knew nothing about cuts, because until recently the cuts array rendered nothing at
  // all (MISTAKES #29); the moment it did, a cut mid-flight read as 15 safe-zone violations.
  const inCut = (CUTS || []).some((c) => Math.abs(tNow - c.t) < c.half + 0.02);
  // A ROTATED STAGE invalidates every axis-aligned box on the frame. The moment a camera keys `rx`,
  // `ry` or `roll` (or a layer tilts), the engine promotes #cam into a preserve-3d rig, and from then
  // on getBoundingClientRect returns the AABB of a PROJECTED QUAD, not the shape. A 700px hairline
  // rolled 3 degrees reports a box 80px tall; two file lines sitting a comfortable 88px apart report
  // boxes that intersect. Neither is on screen — the ink never touches — but the overlap/tight pair
  // loop compares those AABBs and calls it a collision. So it manufactures findings on exactly the
  // frames a film is doing its most deliberate camera work, and the only way to clear one is to
  // spread the layout until the OVER-BOUNDS stop touching, which makes the film worse to satisfy a
  // measurement that was never about the film (CLAUDE.md: suspect the gate).
  //
  // Read the rig itself rather than re-deriving it from the JSON: `camMoving` upstream tests x/y/s and
  // is blind to a roll-only move, and a top-level `tilt` builds the rig with no camera keys at all.
  // The off-diagonal terms of the matrix are the rotation; a pure translate/scale leaves them zero and
  // this stays false, so a flat film is checked exactly as before.
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
  const midMove = (el) => {
    if (inCut) return true;
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
  // Uses inkText for the same reason clipped-text and overlap do: a hand-authored `html` layer carries
  // its CSS inline, and counting that source as "content" made every frosted pane earn a safe-zone check
  // it should never have been given, reported against a fragment of its own stylesheet. Third consumer of
  // this bug (docs/MISTAKES.md #214, #216); the rule now lives in one place and all of them read it.
  const carriesContent = (el) => !!el.querySelector('img, svg') || !!inkText(el).trim();
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
    const t = inkText(el).trim().slice(0, 18);   // a label, and a stylesheet is not what the viewer reads
    // An image layer's box exists in order to clip: `object-fit: cover` already overscans, and `ken`
    // overscans further on purpose — that overscan IS the Ken-Burns move. Measuring it as "content
    // clipped" fired on every ken layer in the repo (gradient-showcase failed its own audit for this),
    // which teaches authors the gate is noise. The rule is about clipped TEXT; keep it there.
    const clipsByDesign = el.classList.contains('hs-img-wrap');
    if (!clipsByDesign && ((s.overflowX !== 'visible' && el.scrollWidth > el.clientWidth + 1) || (s.overflowY !== 'visible' && el.scrollHeight > el.clientHeight + 1)))
      issues.push({ kind: 'overflow', a: id, li, t, detail: `content ${el.scrollWidth}x${el.scrollHeight} clipped to ${el.clientWidth}x${el.clientHeight}` });
    // Measure the INK on BOTH axes. The border box is the size the author DECLARED; on a `group`, an
    // `html` layer or a component that size is `h` verbatim, and nothing need be painted in it. A group
    // declaring h:400 around a 30px label reported its extent as 400px tall and hard-failed safe-zone on
    // 360px of empty air (reproduced: `[safe] hs-group "small" — (200,800,266,1200)`).
    //
    // The axes used to be split, and the reason has expired. Vertical took the box because a text ink is
    // a LINE box that can overhang the border box by the font's half-leading, so measuring it would fail
    // a layer sitting exactly on the safe line for something the viewer cannot see. That overhang is now
    // impossible: #242 moved `clampToBox` inside `inkRect`, so an ink rect is always a SUBSET of the
    // border box. The clamp made the split obsolete and left it standing, which is the only thing still
    // reporting a declared height as a measurement.
    //
    // Ink ⊆ box on both axes, so this can only shrink a measured extent, and shrinking can only remove
    // a safe finding, never add one.
    const ink = !paintsBox(s) && inkRect(el);
    const sb = ink || b;
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
    if (!vis(tx)) continue;   // the logotype exemption is CONTRAST-only (WCAG 1.4.3); a mark still has to be big enough to see
    // Measure the element that actually HOLDS the text (an element with a direct text node), not the
    // layer wrapper. An `html` layer nests its content in a child styled at its own size, so the
    // wrapper's inherited 16px default is not what the viewer sees — walk to the real text holders.
    const holders = [tx, ...tx.querySelectorAll('*')].filter((el) =>
      [...el.childNodes].some((nd) => nd.nodeType === 3 && nd.nodeValue.trim()));
    for (const el of holders) {
      if (!vis(el)) continue;
      if (el.getBoundingClientRect().width <= 1) continue;
      const fs = parseFloat(getComputedStyle(el).fontSize) || 0;
      const t = inkText(el).trim();   // a <style> block has a font-size and would read as tiny text
      if (fs && t && fs < MIN_TXT) issues.push({ kind: 'tiny-text', a: t.slice(0, 16), detail: `${fs | 0}px < ${MIN_TXT | 0}px floor (1.3% frame h) — unreadable` });
    }
  }
  // CLIPPED GLYPHS. The overflow rule above only inspects top-level/critical layers, so a mask NESTED
  // inside a text layer was invisible to it: `riseClip` wraps every word in overflow:hidden, and
  // .hs-text's 1.04 line-height is tighter than any real font's descender depth, so 13px was sliced
  // off every word at 76px and shipped as flat-bottomed g/y/p (MISTAKES #35).
  // Only measured while the word is AT REST. A transformed descendant contributes to its ancestor's
  // scrollable overflow, so mid-rise every masked word reports a huge scrollHeight — which is the
  // effect working, not a defect. (Assuming otherwise produced a confident false positive on the
  // very fix that removed the real clipping, which is the whole reason gates get mutation-tested.)
  const atRest = (host) => {
    const kid = host.firstElementChild;
    if (!kid) return true;
    const tf = getComputedStyle(kid).transform;
    return tf === 'none' || tf === 'matrix(1, 0, 0, 1, 0, 0)';
  };
  for (const el of document.querySelectorAll('.hs-text *, .hs-cap *')) {
    const cs = getComputedStyle(el);
    if (cs.overflow !== 'hidden' && cs.overflowY !== 'hidden') continue;
    if (el.querySelector('img, canvas, svg, video')) continue;      // media clips on purpose
    // <style> SOURCE IS NOT GLYPHS. A hand-authored `html` layer carries its CSS inline, and reading
    // that source as text made the audit report a frosted pane as "287px of clipped descenders" whose
    // supposed content was `.g{position:rela`. Nothing was clipped; nothing was even text. This is the
    // same mistake as docs/MISTAKES.md #214, which fixed it for the overlap check and missed this one,
    // so the rule is now shared rather than repeated: only RENDERED text counts.
    const txt = inkText(el).trim();
    if (!txt || !vis(el) || !atRest(el)) continue;
    const dy = el.scrollHeight - el.clientHeight, dx = el.scrollWidth - el.clientWidth;
    if (dy > 1 || dx > 1) issues.push({ kind: 'clipped-text', a: txt.slice(0, 16),
      detail: `mask is ${dy > 1 ? `${dy}px too short` : `${dx}px too narrow`} for the glyphs — descenders/edges are being cut` });
  }
  // A captured component is sized to the box the capture MEASURED. If the re-rendered content does not
  // fit that box, .hs-comp's overflow:hidden trims it and the result reads as a screenshot cropped at
  // the edge — the loudest possible "this is broken" signal, delivered silently. clipped-text guards
  // the same failure one level down, but it only walks .hs-text: a component is a foreign DOM subtree
  // and no rule looked at it at all, so a card lost its bottom 24px for as long as it shipped (#43).
  for (const el of document.querySelectorAll('.hs-comp')) {
    if (!vis(el) || !atRest(el)) continue;
    const dy = el.scrollHeight - el.clientHeight, dx = el.scrollWidth - el.clientWidth;
    if (dy > 1 || dx > 1) issues.push({ kind: 'clipped-component', a: 'component',
      detail: `content needs ${el.scrollWidth}x${el.scrollHeight} but the captured box is ${el.clientWidth}x${el.clientHeight} — ${dy > 1 ? `${dy}px` : `${dx}px`} is being cut off. A margin on the captured root is the usual cause (capture measures a border box).` });
  }
  // VERTICAL MASS. Nothing measured where a beat's content SITS in the frame, so a composition with
  // everything crammed in the top 60% and a dead bottom third passed every check — six of twelve
  // beats across two showcase films did exactly that, and all six passed safe-zone (MISTAKES #77).
  // Safe-zone answers "is it inside the frame"; this answers "does it USE the frame". Warn tier: a
  // deliberately top-weighted beat is a real choice, so this reports and never blocks.
  {
    const solid = info.filter((e) => +getComputedStyle(e.el).opacity > 0.9);
    if (solid.length >= 2) {
      const top = Math.min(...solid.map((e) => e.y)), btm = Math.max(...solid.map((e) => e.btm));
      const H = window.innerHeight;
      const deadBottom = (H - btm) / H, deadTop = top / H;
      // a third of the frame empty at ONE end, while the other end is nearly flush, reads as a beat
      // that ran out rather than one that was composed
      if (deadBottom > 0.33 && deadTop < 0.12) issues.push({ kind: 'top-heavy', a: 'composition',
        detail: `content ends at ${(btm / H * 100) | 0}% of the frame with the bottom ${(deadBottom * 100) | 0}% empty — the beat uses the top and abandons the rest` });
      if (deadTop > 0.33 && deadBottom < 0.12) issues.push({ kind: 'bottom-heavy', a: 'composition',
        detail: `content starts at ${(deadTop * 100) | 0}% down with the top ${(deadTop * 100) | 0}% empty` });
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
  // Skipped wholesale on a rotated stage: see stageRotated above. Only these two rules are dropped —
  // they are the pair that reads an intersection OF TWO BOXES, and a projected quad's AABB carries no
  // information about whether two shapes intersect. safe/clipped/contrast still run: they ask about
  // one box against the frame, where an over-bound only ever fails safe.
  for (let i = 0; i < info.length && !stageRotated; i++) for (let j = i + 1; j < info.length; j++) {
    const A = info[i], B = info[j];
    if (A.el.contains(B.el) || B.el.contains(A.el)) continue;          // skip nested pairs
    const ox = Math.min(A.r, B.r) - Math.max(A.x, B.x);                // >0 → overlap on X
    const oy = Math.min(A.btm, B.btm) - Math.max(A.y, B.y);            // >0 → overlap on Y
    if (ox > 2 && oy > 2 && crossDissolve(A, B)) continue;             // intentional hand-off
    // A layer mid-entrance is intentionally off-position, so a transient intersection while it travels
    // is motion, not a collision — the safe-zone check has always exempted moving layers and overlap
    // now needs the same exemption, because widening it past `critical` made those transients visible.
    if (ox > 2 && oy > 2 && (midMove(A.el) || midMove(B.el))) continue;
    // OCCLUSION. A card floating over a board overlaps the text beneath it by box and hides it by
    // paint — that is a layered composition, not a collision. Sample the centre of the intersection:
    // if an opaque surface is painted above the lower of the two, the lower one cannot be SEEN, so
    // there is nothing to report. Same reasoning as the filled-chip case in the headline rule (#44).
    if (ox > 2 && oy > 2) {
      const cx = Math.max(A.x, B.x) + ox / 2, cy = Math.max(A.y, B.y) + oy / 2;
      const stack = document.elementsFromPoint(cx, cy);
      // The element and its descendants are its paint; its ANCESTORS are not. Ancestors sit in the
      // stack at every point on the frame, so `e.contains(el)` made this index the depth of the whole
      // page rather than the depth of the layer, and the scan below then walked every intervening
      // ancestor looking for an opaque background — which a full-bleed backdrop always provides. The
      // occlusion escape therefore fired far more often than it was written to. Same misread as the
      // `mine` index in `buried` below; fixed in both, because the rule is one rule.
      const at = (el) => stack.findIndex((e) => e === el || el.contains(e));
      const ia = at(A.el), ib = at(B.el);
      let hidden = ia < 0 || ib < 0;                    // one is not even painted at that point
      for (let k = 0; !hidden && k < Math.max(ia, ib); k++) {
        // a local alpha test: `parse` is declared further down this function, so using it here is a
        // temporal-dead-zone error (which threw on every scene and made a blast-radius sweep read as
        // "clean" because a stack trace contains no findings).
        const bgc = getComputedStyle(stack[k]).backgroundColor || '';
        const m = /rgba?\(([^)]+)\)/.exec(bgc);
        const alpha = m ? (m[1].split(',')[3] !== undefined ? parseFloat(m[1].split(',')[3]) : 1) : 0;
        if (alpha > 0.85) hidden = true;
      }
      if (hidden) continue;
    }
    if (ox > 2 && oy > 2) { issues.push({ kind: 'overlap', a: A.id, b: B.id, detail: `${ox | 0}x${oy | 0}px` }); continue; }
    let gap = Infinity;                                                // gap only meaningful when they share one axis
    if (ox > 0) gap = Math.min(gap, -oy);
    if (oy > 0) gap = Math.min(gap, -ox);
    if (gap !== Infinity && gap >= 0 && gap < MIN_GAP) issues.push({ kind: 'tight', a: A.id, b: B.id, detail: `${gap | 0}px` });
  }
  // BURIED. The pair loop above forgives an overlap the moment an opaque surface is painted on top of
  // the lower layer: a card over a board is a layered composition, not a collision. That forgiveness
  // assumes anything you cannot see was meant to be hidden, and for the film's own headline the
  // assumption is exactly backwards. Three blind judges independently called a title unreadable on a
  // scene this audit passed clean: the thing covering it was an `html` layer, which neither selector
  // feeding `info` matches, and even inside the pair loop the opaque-surface escape would have
  // swallowed it. Two holes, one symptom.
  //
  // So ask the question directly and per-layer rather than per-pair, which also makes the answer
  // independent of what type the covering layer happens to be: how much of this text is under paint?
  // Scoped to `critical` (>=60px display text) because that is the copy the viewer MUST read, and no
  // composition deliberately buries two fifths of its own headline.
  // "Does this element paint something solid?" An HTML box answers with `background-color`; an SVG
  // shape answers with `fill`, and asking it the HTML question returns transparent. That single blind
  // spot is why an inline <svg> could sit on a headline and measure as thin air.
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
  const OCCLUDE_MAX = 0.4;
  // Same identity rule the safe-zone walk uses: a layer's index in document order. Labelling a buried
  // headline by its ink's y (the only identity it had) made ONE bug report as four, because a headline
  // that drifts a pixel between sampled frames gets a different label on each of them and the de-dup
  // downstream keys on the label.
  const layerIdx = new Map([...document.querySelectorAll('.hs-layer')].map((e, i) => [e, i]));
  for (const el of document.querySelectorAll('[data-layer="critical"]')) {
    if (!vis(el) || midMove(el)) continue;
    const r = inkRect(el) || el.getBoundingClientRect();
    if (r.width < 4 || r.height < 4) continue;
    // 9x9, not 9x5: a coarse grid quantises the answer to fifths, and the case this check exists for
    // measured 46% of the headline covered and sampled as exactly 40%, one point under its own bar.
    let covered = 0, total = 0;
    for (let gy = 0; gy < 9; gy++) for (let gx = 0; gx < 9; gx++) {
      const px = r.left + r.width * (gx + 0.5) / 9, py = r.top + r.height * (gy + 0.5) / 9;
      if (px < 0 || py < 0 || px >= FW || py >= FH) continue;
      const stack = document.elementsFromPoint(px, py);
      // "Is this MY paint?" is answered by the element and its descendants only. `e.contains(el)` also
      // matched every ANCESTOR — #cam, .hs-stage, body — and those are in the stack at every point on
      // the frame, so the guard below could never fire and the escape hatch it documents was dead code
      // for as long as the check existed. That is what let a mis-measured rect (see clampToBox) sample
      // 81 points of empty canvas and still call all 81 "the headline".
      const mine = stack.findIndex((e) => e === el || el.contains(e));
      if (mine < 0) continue;                        // not painted here at all: outside the ink, not buried
      total++;
      for (let k = 0; k < mine; k++) if (opaqueAt(stack[k])) { covered++; break; }
    }
    if (total && covered / total > OCCLUDE_MAX)
      // a ransom/sprite headline has no textContent and no id, so neither can name it; the ink's top
      // edge can, and it keeps two headlines in one film from de-duping into a single reported finding
      issues.push({ kind: 'buried', a: el.id || `headline@y${r.top | 0}`, li: layerIdx.get(el.closest('.hs-layer')),
        t: inkText(el).trim().slice(0, 18),
        detail: `${Math.round(covered / total * 100)}% of this headline sits under an opaque layer` });
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
      // elementsFromPoint reports hit-testable GEOMETRY, which includes a box that is fully
      // TRANSPARENT. A beat that cross-fades between two full-bleed panels keeps both in the tree with
      // one at opacity 0, and counting the invisible one as the backdrop reports dark-on-dark for text
      // that is plainly dark-on-white. The colour's own alpha was already required to be opaque; the
      // ELEMENT's effective opacity has to be too, and for the same reason (#376).
      if (effOpacity(p) < ARRIVED) continue;
      const c = parse(getComputedStyle(p).backgroundColor);
      if (c && c[3] > 0.85) return [c[0], c[1], c[2]];
      // a covering <img> (sky/photo backdrop): its opaque-pixel average IS the effective bg colour,
      // so white/emphasis text over a photo isn't false-flagged as invisible-on-the-canvas-behind-it.
      // A <canvas> counts for exactly the same reason and was not handled: the `shader` and `paint`
      // layers both paint into one, so every headline over a generated backdrop measured 1.0:1 against
      // a backdrop the gate could not see. drawImage (not getContext('2d')) so a WebGL canvas works too.
      const cvEl = p.tagName === 'CANVAS' ? p : (p.querySelector && p.querySelector('canvas'));
      if (cvEl && cvEl.width && cvEl.height) {
        try {
          bpc.clearRect(0, 0, 20, 20); bpc.drawImage(cvEl, 0, 0, 20, 20);
          const d = bpc.getImageData(0, 0, 20, 20).data;
          let r = 0, g = 0, b = 0, k = 0;
          for (let i = 0; i < d.length; i += 4) if (d[i + 3] > 40) { r += d[i]; g += d[i + 1]; b += d[i + 2]; k++; }
          // Only a canvas that actually COVERS counts as the backdrop. A `waves` layer is a few
          // translucent lines over a transparent field, so averaging its handful of opaque pixels
          // reported "the backdrop is blue" when the backdrop is the white scene behind it. Require
          // most of the sample to be opaque; otherwise fall through to whatever is really behind.
          if (k >= 280) return [r / k, g / k, b / k];   // 280/400 ≈ 70% coverage
        } catch { /* tainted → fall through */ }
      }
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
    if (el.closest('[data-logotype]')) continue; // WCAG 1.4.3 logotype exemption, declared per layer
    // Only ARRIVED text is graded: mid-entrance the element composites toward the backdrop, so the
    // measured ratio is a fact about the ramp and not about the design (#376).
    if (effOpacity(el) < ARRIVED) continue;
    const fg = parse(getComputedStyle(el).color);
    if (!fg || fg[3] < 0.5) continue;
    // Sample the backdrop UNDER THE GLYPHS. `bgFor` probes the centre of the box it is handed, and a
    // text layer's box is a declared `w` (pin centres a box, so a placed layer must have one). With
    // `align:"left"` the glyphs sit against one edge and the box centre is empty slack that may be over
    // an entirely different surface — so the ratio came out against a backdrop the text is not on.
    const pb = (!paintsBox(getComputedStyle(el)) && inkRect(el)) || b;
    const bg = bgFor(el, { x: pb.left, y: pb.top, w: pb.width ?? (pb.right - pb.left), h: pb.height ?? (pb.bottom - pb.top) });
    if (!bg) continue;
    const rt = cratio([fg[0], fg[1], fg[2]], bg);
    const px = parseFloat(getComputedStyle(el).fontSize) || 0;
    const large = px >= 48;            // large display type gets the WCAG large-text bar
    const want = large ? 3.0 : 4.5;    // WCAG AA pass bar: 4.5 normal, 3.0 large
    const hardBar = large ? 2.5 : 3.0; // below this the text is unreadable -> hard fail (else soft-warn)
    if (rt < want) {
      const id = el.id || (typeof el.className === 'string' ? el.className.split(' ')[0] : el.tagName);
      issues.push({ kind: rt < hardBar ? 'contrast' : 'contrast-soft', a: id, t: inkText(el).trim().slice(0, 18), detail: `${px | 0}px ${rt.toFixed(1)}:1 (want ${want}:1)` });
    }
  }
  // EMPHASIS + WIDE contrast: the loop above reads each layer's TOP-level colour only. A layer's
  // <b>/<em> spans carry their OWN colour (--em) — an accent <b> on an accent bg vanishes (the
  // blue-on-blue bug the old audit missed). Also widen past [data-layer=critical] to ANY headline-
  // scale text (≥60px), soft-tier when the layer isn't critical so existing videos don't newly HARD-fail.
  const near = (a, b) => Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) + Math.abs(a[2] - b[2]) < 60; // ≈ same colour = invisible
  const checkSpan = (span, critical, label) => {
    // inkText, not textContent: this `t` is a GATE as well as a label, and `checkSpan` is called with a
    // whole layer when it is headline-scale — a layer that carries only an inline stylesheet would pass
    // the emptiness test on its own CSS source (docs/MISTAKES.md #214/#216/#217, same rule again).
    const t = inkText(span).trim(); if (!t || !vis(span)) return;
    const b = span.getBoundingClientRect(); if (b.width < 2 || b.height < 2) return;
    if ((parseFloat(getComputedStyle(span).fontSize) || 0) < 40) return; // ignore small captions/labels
    const fg = parse(getComputedStyle(span).color); if (!fg || fg[3] < 0.5) return;
    // Sample the backdrop under the GLYPHS. An inline <b>/<em> box already hugs its run, but the loop
    // below also hands this whole LAYER when the layer is headline-scale, and a layer's box is the
    // declared `w` — mostly empty slack that can sit over a different surface entirely.
    const pb = (!paintsBox(getComputedStyle(span)) && inkRect(span)) || b;
    const bg = bgFor(span, { x: pb.left, y: pb.top, w: pb.width ?? (pb.right - pb.left), h: pb.height ?? (pb.bottom - pb.top) }); if (!bg) return;
    const rt = cratio([fg[0], fg[1], fg[2]], bg), invisible = near([fg[0], fg[1], fg[2]], bg);
    if (rt >= 3.5 && !invisible) return;
    const hard = critical && (invisible || rt < 2.5);
    issues.push({ kind: hard ? 'contrast' : 'contrast-soft', a: label, t: t.slice(0, 18),
      detail: invisible ? `${label} ≈ bg colour (invisible)` : `${label} ${parseFloat(getComputedStyle(span).fontSize) | 0}px at ${rt.toFixed(1)}:1` });
  };
  for (const tx of document.querySelectorAll('.hs-text')) {
    if (!vis(tx) || tx.closest('[data-logotype]')) continue; // WCAG 1.4.3 logotype exemption
    const critical = tx.getAttribute('data-layer') === 'critical' || !!tx.closest('[data-layer="critical"]');
    for (const em of tx.querySelectorAll('b, em')) checkSpan(em, critical, em.tagName.toLowerCase()); // <b>/<em> always: they carry --em
    const px = parseFloat(getComputedStyle(tx).fontSize) || 0; // the whole layer only when headline-scale AND not already checked as critical above
    if (px >= 60 && !critical && [...tx.childNodes].some((nd) => nd.nodeType === 3 && nd.nodeValue.trim())) checkSpan(tx, false, 'text');
  }
  // Did the AUTHOR put an opaque shape behind this text (a chip, a pill, a filled panel), as opposed
  // to the text simply sitting on the scene field? That distinction is what separates the two cases
  // the headline rule below would otherwise conflate. It is a structural question, not a colour one,
  // so it is answered structurally: is there an opaque sibling element in the paint stack under it.
  const onOwnFill = (el, bx) => {
    for (const p of document.elementsFromPoint(bx.x + bx.w / 2, bx.y + bx.h / 2)) {
      if (p === el || el.contains(p) || p.contains(el)) continue;
      const c = parse(getComputedStyle(p).backgroundColor);
      if (c && c[3] > 0.85) return true;
      if (p.tagName === 'IMG' || (p.querySelector && p.querySelector('img'))) return false; // a photo backdrop is a field, not a chip
    }
    return false;
  };
  // DISPLAY-TYPE CONTRAST: legibility (4.5:1) is not enough for display type; below 7:1 it reads
  // washed-out ("gray heading" bug class).
  //
  // This used to judge ONE element per frame: the single largest text, found by a running maximum. The
  // bar is a fact about how big type reads against a field, so it belongs to every element that is big
  // type, and picking a winner meant a headline's verdict was decided by whether it had a bigger
  // neighbour. Reproduced with two identical layers: an 80px headline at 3.3:1 is a HARD `weak-headline`
  // when it is the largest on the frame and reported by nothing at all when a 90px sibling exists.
  // Same paint, same ratio, opposite verdicts. So judge every arrived display-scale text.
  {
    const texts = info.filter((e) => [...e.el.childNodes].some((nd) => nd.nodeType === 3 && nd.nodeValue.trim()));
    for (const e of texts) {
      const px = parseFloat(getComputedStyle(e.el).fontSize) || 0;
      if (px < 56) continue;
      if (effOpacity(e.el) < ARRIVED) continue; // judge only ARRIVED headlines (mid-fade is motion, not a verdict)
      const fg = parse(getComputedStyle(e.el).color);
      if (!fg || fg[3] < 0.85) continue;
      const bx = { x: e.x, y: e.y, w: e.r - e.x, h: e.btm - e.y };
      const bg = bgFor(e.el, bx);
      if (!bg) continue;
      const rt = cratio([fg[0], fg[1], fg[2]], bg);
      // The 7:1 bar exists for display type on the SCENE FIELD, where a low-saturation tint of the
      // background reads as a washed-out grey heading. Text on a filled chip cannot wash out — it is
      // a deliberate, saturated block, and WCAG judges exactly that case at the large-text bar. Held
      // to 7:1, the gate rejected white on a brand's own button blue, which is a treatment the brand
      // ships on its real site. Same rule, the right bar for the situation (MISTAKES #44).
      const chip = onOwnFill(e.el, bx);
      const bar = chip ? 3 : 7;
      if (rt < bar) issues.push({ kind: rt < (chip ? 2.5 : 3.5) ? 'weak-headline' : 'weak-headline-soft', a: e.id, t: e.t,
        detail: `headline ${px | 0}px at ${rt.toFixed(1)}:1 (want ≥${bar}:1${chip ? ', large text on a filled chip' : ''})` });
    }
  }
  // IMAGE contrast: a critical logo/icon can vanish into a same-hue backdrop (orange-on-orange) —
  // average the image's opaque pixels and hold them to the WCAG non-text bar (3:1; hard < 1.7).
  const imgProbe = document.createElement('canvas'); imgProbe.width = imgProbe.height = 24;
  const ipc = imgProbe.getContext('2d', { willReadFrequently: true });
  for (const e of info) {
    // inkText again: a wrapper holding only a stylesheet is empty as far as the viewer is concerned
    const im = e.el.tagName === 'IMG' ? e.el : ((e.el.children.length === 1 || !inkText(e.el).trim()) ? e.el.querySelector('img') : null);
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
    // the backdrop wanted is the LAYER's, whether the raster is the layer itself or a child <img>.
    // This was written as `im === e.el ? e.el : e.el`, a ternary with identical arms — correct output,
    // but it reads as though it decides something. Found by `make dead-branch` on its first run.
    const bg = bgFor(e.el, { x: e.x, y: e.y, w: e.r - e.x, h: e.btm - e.y });
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
// Layout placement (a centring keyword with nothing to centre) is defined ONCE, in core/validate.mjs,
// and imported here. It used to live in this file with its own NEEDS_W/PIN_X tables — a second copy of
// a rule the engine also needs, which is the exact shape of the bug that gave the repo four safe boxes
// and eight canvas-size derivations (docs/MISTAKES.md #46). The validator is the owner; the audit
// reports the same finding so a render surfaces it too.
function sourceIssues(cfg) {
  const out = layoutErrors(cfg).map((detail) => ({ kind: 'degenerate-pin', a: 'layout', t: '', detail }));
  for (const L of cfg.layers || []) {
    if (!L || typeof L !== 'object') continue;
    const id = L.id || L.type || 'layer';
    const t = snippet(L.text, 18);
    // dx/dy are read only inside scene.html's anchor pass (`const T = L.anchor && byId[L.anchor]`), so
    // without a resolvable anchor they are silently dropped — authored intent that never renders.
    if ((L.dx != null || L.dy != null) && !L.anchor)
      out.push({ kind: 'dead-offset', a: id, t, detail: `dx/dy are anchor offsets and do nothing without \`anchor\` — the layer renders unshifted` });
  }
  return out;
}

const HARD = new Set(['overlap', 'overflow', 'safe', 'contrast', 'buried', 'weak-headline', 'degenerate-pin', 'collapsed-image', 'clipped-text', 'clipped-component']);
const server = await startServer();
const port = server.address().port;
const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--hide-scrollbars', '--force-device-scale-factor=1'] });
const rows = [];

for (const spec of modules) {
  // a .json arg audits THAT data file (module read from it); a bare name audits the format's sample
  const isData = spec.endsWith('.json');
  const raw = isData ? spec : `formats/${spec}/sample.json`;
  // Normalise to a repo-RELATIVE path. An absolute arg — which the MCP pipeline passes for a scene
  // under .vawe-data — otherwise broke everything: `path.join(repoRoot, absolute)` concatenates into
  // a garbage path (→ "file not found") and `?data=/${absolute}` sends the browser a doubled path.
  // A relative arg is unchanged. (Bug found by a fresh MCP session auditing every draft.)
  const sample = path.isAbsolute(raw) ? path.relative(repoRoot, raw) : raw;
  const absPath = path.join(repoRoot, sample);
  if (sample.startsWith('..') || !fs.existsSync(absPath)) { rows.push({ m: spec, hard: 1, warn: 0, crit: 0, note: 'file not found' }); continue; }
  const cfg = (() => { try { return JSON.parse(fs.readFileSync(absPath, 'utf8')); } catch { return {}; } })();
  const m = isData ? (cfg.module || spec) : spec;
  // the scene's own waiver list, read the same way every other gate reads it.
  const allow = new Set(Array.isArray(cfg.authoring?.allow) ? cfg.authoring.allow : []);

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
  // cut windows the renderer will actually apply (mirrors scene.html: `none` is filtered, `dur` is
  // the TOTAL window split evenly around t)
  const cutWindows = (cfg.cuts || []).filter((c) => c && c.style && c.style !== 'none')
    .map((c) => ({ t: +c.t, half: (c.dur ?? 0.36) / 2 }));
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
  // a MOVING camera (data.camera keyframes with changing position OR orientation) is cinematography:
  // elements crossing the frame edge mid-travel are not safe-zone breaches. Overlap/contrast still
  // checked everywhere (overlap has its own rotated-stage escape in the page function).
  // `rx`/`ry`/`roll` count as movement for the same reason x/y/s do, and more so: a rotation puts the
  // stage on the 3D rig, where every box the audit reads is the AABB of a projected quad and therefore
  // an OVER-bound. Testing only x/y/s meant a roll-only or orbit move was read as a still frame and
  // its inflated boxes were reported as content leaving the safe area.
  const CAM_KEYS = [['x', 0], ['y', 0], ['s', 1], ['rx', 0], ['ry', 0], ['roll', 0], ['p', null]];
  let camMoving = () => false;
  try {
    const kf = JSON.parse(fs.readFileSync(absPath, 'utf8')).camera || [];
    const moves = kf.slice(1).map((b, i) => ({ a: kf[i], b }))
      .filter(({ a, b }) => CAM_KEYS.some(([k, d]) => (a[k] ?? d) !== (b[k] ?? d)));
    if (moves.length) camMoving = (f) => moves.some(({ a, b }) => f / fps > a.t - 0.05 && f / fps < b.t + 0.05);
  } catch {}
  // CONTENT-AWARE SAMPLING. Uniform ticks alone have a blind spot exactly the width of a beat: with
  // 14 samples across 25s they sit 1.8s apart, so a card on screen for 1.4s can fall cleanly between
  // two of them and every rule in this file silently skips it. That is not hypothetical — a captured
  // component shipped visibly cropped while the audit reported green, because frames 187 and 240
  // straddled its 190-232 window (MISTAKES #45). So: also sample the RESTING MIDPOINT of every layer,
  // which is the one frame where that layer is guaranteed on screen and done animating.
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
    const { issues, count } = await page.evaluate(auditFrameFn, f, safe, MIN_GAP, cutWindows);
    critMax = Math.max(critMax, count);
    const hard = issues.filter((i) => HARD.has(i.kind)).length;
    if (hard > worst.n) worst = { f, n: hard };
    for (const i of issues) { if (i.kind === 'safe' && camMoving(f)) continue; all.push({ f, ...i }); }
  }
  // WAIVERS. Every other gate in this repo honours {"authoring":{"allow":[...]}}; this one did not, so
  // a DELIBERATE composition had no way past it and the only options were to contort the scene or to
  // stop running the audit. ledgerline-neon marks its selected row with a bloom instead of a card, and
  // the row is composited into a gap the wall reserves for it: the boxes overlap by design, the content
  // never does, and with no card there is no opaque surface for the overlap check's own exemption to
  // find. A waived issue is still PRINTED, tagged, and counted separately, so waiving stays visible.
  const waived = all.filter((i) => allow.has(i.kind));
  const hard = all.filter((i) => HARD.has(i.kind) && !allow.has(i.kind));
  const warn = all.filter((i) => !HARD.has(i.kind) && !allow.has(i.kind));
  for (const i of waived) i.waived = true;
  // De-dup repeated issues to the first frame they appear on: the SAME element failing on 12 sampled
  // frames is one bug, not twelve. Identity is the layer index (`li`) where we have it, because the
  // label is a class name — `hs-text` for every text layer — so keying on it merged unrelated layers
  // and reported 1 of 4 real off-frame failures. Fall back to label+text for issues that carry no
  // index (the critical-element checks, whose `a`/`b` are already per-element ids).
  const key = (i) => `${i.kind}|${i.li ?? `${i.a}|${i.t || ''}`}|${i.b || ''}`;
  const uniq = (list) => { const seen = new Set(), out = []; for (const i of list) { const k = key(i); if (!seen.has(k)) { seen.add(k); out.push(i); } } return out; };
  const hu = uniq(hard), wu = uniq(warn), vu = uniq(waived);
  const label = `${isData ? `${m} · ${path.basename(sample)}` : m}  [${aspectKey || `${vw}x${vh}`}]`;
  rows.push({ m: label, hard: hu.length, warn: wu.length, waived: vu.length, crit: critMax, items: [...hu, ...wu, ...vu] });

  await page.evaluate(overlayFn, worst.f, safe);
  // one overlay per audited canvas — the whole point is comparing where the SAME scene breaks per ratio
  // named for the SCENE, not the module: every scene audits as module `scene`, so `scene.png` was one
  // file thirteen films deep and the overlay never belonged to the run that just printed its verdict.
  const shot = `${isData ? path.basename(sample, '.json') : m}${aspectKey ? `.${aspectKey.replace(':', 'x')}` : ''}.png`;
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
  console.log(`\n${tag}  ${r.m}  (${r.crit ?? 0} critical elems · ${r.hard} hard · ${r.warn || 0} warn${r.waived ? ` · ${r.waived} waived` : ''})`);
  if (r.note) console.log(`    ${r.note}`);
  for (const i of (r.items || [])) {
    const who = i.b ? `${i.a} ✕ ${i.b}` : `${i.a}${i.t ? ` "${i.t}"` : ''}`;
    // a waived issue still prints. A gate that goes silent when waived teaches you to waive.
    console.log(`    ${i.waived ? '○' : ' '}[${i.kind}]${i.waived ? ' (waived)' : ''} ${i.f == null ? '' : `f${i.f} `}${who} — ${i.detail}`);
  }
}
console.log(`\noverlays in ${OUT}/ (one PNG per audited scene)`);
console.log(`${hardTotal ? '✗ ' + hardTotal + ' HARD issue(s)' : '✓ no hard issues'}${warnTotal ? ` · ${warnTotal} warning(s)` : ''}`);
process.exit(hardTotal ? 1 : 0);
