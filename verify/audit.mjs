// verify/audit.mjs, the layout audit: catches what eyes catch but checklists miss.
// Renders each format's sample headless across sampled frames and flags, on [data-layer="critical"]:
//   • overlap: two TEXT inks intersect (any size, not just critical)  (HARD fail)
//   • overflow: text clipped (scrollW/H > clientW/H)    (HARD fail)
//   • safe-zone: element outside the SAFE box            (HARD fail)
//   • caption-band: content inside the strip a burnt-in caption will be painted into, on a film that
//                 declares captions (core/safe.js captionBand)     (warn)
//   • contrast: text/emphasis vs bg below WCAG, incl. <b>/<em> --em spans & ≈-same-colour
//                 (blue-on-blue); widened to any ≥60px headline text  (HARD on critical, else warn)
//   • buried: >40% of a ≥60px headline sits under an opaque layer  (HARD fail)
//   • thin-hero: a LANDSCAPE hero line's ink fills <55% of frame width, and nothing else on the
//                 frame reaches out past it (a split frame is exempt)     (warn)
//   • tight: sibling boxes closer than MIN_GAP px    (warn)
// Writes an annotated screenshot of the worst frame per format to /tmp/audit/<format>.png.
//   node verify/audit.mjs [format ...]      (default: all)   ·   make audit
//   node verify/audit.mjs <scene.json> --hero    thin-hero alone, no screenshots, exit 0. This is the
//     slice `author-check` runs BEFORE the render under TASTE=1, so a hero set at web scale is caught
//     while it is still cheap to fix. Same frames and same numbers as the full run, proven on three
//     scenes; it just skips the contrast pictures and the overlay. 1.44s vs 4.60s on argus-launch.
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
// <style> body as glyphs (docs/MISTAKES.md #222/#217); this file went on doing exactly that when it
// labelled a finding straight off the authored string. Same rule, both sides of the browser boundary.
import { snippet } from '../scripts/lib/text.mjs';
import { gateFindings } from '../scripts/lib/findings.mjs';
import { lowerScene } from '../core/transitions/lower.js';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const formatsDir = path.join(repoRoot, 'formats');
const OUT = '/tmp/audit';
// Do NOT wipe the directory: two authors auditing at once would delete each other's overlay, and one
// author auditing a second scene would lose the first. Each run overwrites only its own file.
fs.mkdirSync(OUT, { recursive: true });

const MIN_GAP = 8;                                     // px; tighter than this between siblings = warn (cramped)
const SAMPLES = 14;                                    // frames sampled across the timeline


const argv = process.argv.slice(2);
// --hero: the PRE-RENDER slice of this audit. `thin-hero` was reachable only through `make audit`, which
// is a post-render step, so the finding arrived after the mp4 was paid for. The measurement itself needs
// a real page (it reads INK width, and a check on the declared `w` would call the library healthy and
// see nothing, which is why there is no static approximation of it). So the page is what moves earlier,
// not the rule: same browser, same frames, same in-page function, with the contrast screenshots and the
// overlay shot skipped, thin-hero the only finding reported, and exit 0 always because it is a warning.
// Everything else about this file is untouched when the flag is absent.
const heroOnly = argv.includes('--hero');
if (heroOnly) argv.splice(argv.indexOf('--hero'), 1);
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

// The canvas this audit runs at comes from core/safe.js, alongside the safe box it feeds, same
// reason the safe box lives there. An explicit --aspect wins; else the scene's own `aspect`.
const dimsFor = (key, cfg) => sceneDims(cfg, key);

// The safe box comes from core/safe.js: the SAME function boot.js places against and writes to
// --safe-* for the debug overlay. This file used to carry its own tables (a portrait box, a landscape
// box, and a proportional fallback for everything else), which is how the checker ended up rejecting
// content the engine's own `pin:"bottom"` had just placed. A gate that disagrees with the thing it
// gates is not a gate. The chrome depends on where the video is going, so the scene's `destination`
// decides it; `web` (margin only) is the default.
const safeFor = (vw, vh, cfg) => safeArea(vw, vh, cfg.destination || 'web');

// The caption keep-out, or null for a film that declares no captions. CAPTIONED FILMS ONLY, and that
// is a decision rather than an oversight: the reference system holds its band even with captions
// disabled, and held always here it fires on 69 of 103 shipped scenes. A finding two films in three
// carry is a report about the library, not a gate, and authors learn to ignore it. Measured both ways
// before choosing (docs/MISTAKES.md #413).
// Held for the whole runtime, not only inside a caption window: the strip is a layout commitment the
// author makes once, and this file samples 14 frames plus layer midpoints, so a window-scoped rule
// would be a check that only sometimes looks.
// A tolerance of 8px, the same hairline MIN_GAP already calls "touching", so a descender box grazing
// the top of the band is not reported as a collision.
const CAP_TOL = 8;
const capBandFor = (vw, vh, cfg) => {
  if (!Array.isArray(cfg.captions) || !cfg.captions.length) return null;
  // A caption can now say WHERE it sits, in the layer placement grammar, so the strip is no longer a
  // property of the skin alone. `pin` and the edge keywords are still strings at this point (the
  // renderer resolves them at boot, in the browser), so resolve a COPY through the same function the
  // renderer uses. Reading the grammar a second time here is what would drift; calling it cannot.
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
// Everything from here down to `PAGE_SRC` runs INSIDE the browser and never in node. Puppeteer ships
// a function by STRINGIFYING it, so a page function cannot close over this module's scope: the source
// crosses the boundary, the environment does not. That is the whole reason this used to be one
// 900-line function: a nested helper was the only kind of helper that survived the trip. The bundle
// below concatenates these declarations into one page-side scope instead, so they reach each other by
// name exactly as nested ones did, and each check is a function with one job.
//
// The frame's evidence is collected ONCE (`frameContext`), then every check reads it. Order of the
// checks is part of the output: findings are printed in push order and de-duped to the FIRST
// occurrence, so the list in `auditFrame` is the order the original function pushed in.

const vis = (el) => { for (let p = el; p && p !== document.body; p = p.parentElement) { const s = getComputedStyle(p); if (s.visibility === 'hidden' || +s.opacity <= 0.05) return false; } return true; };
// effOpacity: the product of every opacity down the paint tree, which is what the VIEWER sees.
// A judgement about how something LOOKS is only a judgement once the thing has ARRIVED. The
// weak-headline check knew this and said so ("mid-fade is motion, not a verdict"), but it read the
// element's OWN opacity, and in a captured component or any grouped beat the fade lives on an
// ANCESTOR, so the guard never fired where it mattered. The contrast check 80 lines above it had no
// guard at all and graded anything over 5% opacity, so a whole browser mockup 0.067s into its
// entrance was reported as a contrast defect and the "fix" would have been to recolour a correct
// frame. A gate that measures the wrong thing does not merely miss defects, it manufactures them.
// docs/MISTAKES.md #390.
const effOpacity = (el) => { let a = 1; for (let p = el; p && p !== document.body; p = p.parentElement) a *= (+getComputedStyle(p).opacity || 0); return a; };
const arrived = (el) => { const ARRIVED = 0.85; return effOpacity(el) >= ARRIVED; };
// OVERLAP looked only at [data-layer="critical"], text >=60px, so a headline that WRAPPED onto a
// second line and landed on the small mono caption beneath it was never compared with it. Measured
// on the reproduction: the headline occupied y 400-681 and the caption sat at 500-525, entirely
// inside it, and the audit said 0 hard (docs/MISTAKES.md #78).
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
// `data-ink="off"`: TEXT THAT IS IN THE DOM ON PURPOSE AND IS NEVER ON SCREEN. `wordSlot`
// (core/fx/word-slot.js) stacks every candidate word in ONE grid cell, because that is what sizes the
// slot to the widest of them, and shows one at a time. So `textContent` read
// "docsdashboardschangelogs": a string no frame ever paints, and contrast, weak-headline and
// clipped-text each graded a film against it. Same rule as the `style, script` reject beside it and
// the same lesson as #214: what is in the DOM is not what is painted.
//
// IT IS A SELECTOR TEST, NOT A COMPUTED-STYLE ONE, and that is deliberate. The general rule ("skip
// any text whose ancestors are invisible") needs getComputedStyle on every text node's whole chain,
// and measured across the library that forced a style resolution which changed what ONE shipped scene
// had in its DOM by the time the clipped-text loop ran (`ab-skill-shotcode` f109 went from 1 hard to
// 2, reproducibly, with no string having changed). A gate change that perturbs a scene it was not
// aimed at is a regression until proven otherwise, and it was not proven. An attribute nothing else
// in the library sets cannot perturb anything. The general rule is still worth having; it is logged
// as an open gap rather than shipped half-cleared.
const inkText = (el) => {
  let out = '';
  const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, {
    acceptNode: (n) => (n.parentElement && n.parentElement.closest('style, script, [data-ink="off"]'))
      ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT,
  });
  while (w.nextNode()) out += w.currentNode.nodeValue;
  return out;
};
// A MASK IS NOT A MISFIT. `scrollWidth > clientWidth` says the content is BIGGER than the box; every
// check below then reports that as "the box is cutting the content", which is one reading of two.
// The other is a WINDOW: an `overflow:hidden` box with an out-of-flow child deliberately parked or
// slid past its edge, which is how every reveal, tab strip, marquee and carousel is built. The
// `tabBar.switch` block is exactly that, a 158px window over a 488px strip translated by `var(--p)`
//, and it HARD-FAILED clipped-text on every frame where the strip happened to sit at translate 0,
// reporting "329px too narrow for the glyphs" about a mask doing its job.
// The two cases are told apart structurally, not by size: the defect (#35, a riseClip mask shorter
// than the descenders; #43, a component whose captured box is too small) is IN-FLOW content that did
// not fit. A child taken OUT of flow was placed at a coordinate by whoever wrote it, so the box never
// tried to fit it and clipping it is the intent. Known ceiling, stated rather than hidden: a card
// that absolutely-positions real copy off its own edge is now unreported here. The layer-level
// safe-zone and overflow checks still see the layer itself.
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
// What the safe check must measure is what the VIEWER can see. A text layer given a `w` (which it
// needs, since pin centres a box) paints nothing but glyphs: the container is invisible slack, and
// centred text leaves half that slack on each side. Measuring the container flags empty air as
// off-frame and pushes the author to shrink `w` until the BOX fits, which is tuning a number against
// the tightest ratio, not fixing a layout. So when a layer paints no box of its own (no background,
// border, or shadow), measure the ink instead, a Range over its contents hugs the real line boxes.
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
// THE INK MAY ONLY EVER SHRINK THE BORDER BOX. This clamp is the whole contract of an ink rect:
// ink exists to stop measuring empty space, so a rect it returns that is BIGGER than, or somewhere
// else entirely from, the element's own box is not ink, it is a broken measurement, and the honest
// answer there is the border box. It used to live at ONE call site (the safe-zone walk), where #211
// added it after an unclamped svg bound turned showcase-cuts from 0 hard failures into 7. `buried`
// read the same helper unclamped and inherited the identical bug (docs/MISTAKES.md #217/#214/#216/
// #217 are all this shape: a rule fixed at a call site while another consumer kept reading it raw).
// So the clamp is now part of inkRect and every consumer gets it.
//
// What it catches here: getScreenCTM() is NOT composed through a 3D rig. The engine promotes #cam to
// `perspective` + `preserve-3d` for any camera z/tilt move, and from then on an inline <svg> inside a
// layer reports a screen CTM that is neither the layer's scale nor its position, playhead's tick svg
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
// The safe box governs LEGIBLE CONTENT, text the viewer must read, imagery they must recognise.
// Decoration (gradient blobs, glows, hairline rules) routinely bleeds off-frame BY DESIGN, so a
// layer only earns the safe check when it carries a text node or an image. Text inside a decorative
// container is still reached: the walker descends, and child text layers are their own .hs-layer.
// Uses inkText for the same reason clipped-text and overlap do: a hand-authored `html` layer carries
// its CSS inline, and counting that source as "content" made every frosted pane earn a safe-zone check
// it should never have been given, reported against a fragment of its own stylesheet. Third consumer of
// this bug (docs/MISTAKES.md #220, #222); the rule now lives in one place and all of them read it.
const carriesContent = (el) => !!el.querySelector('img, svg') || !!inkText(el).trim();
// Only measured while the word is AT REST. A transformed descendant contributes to its ancestor's
// scrollable overflow, so mid-rise every masked word reports a huge scrollHeight, which is the
// effect working, not a defect. (Assuming otherwise produced a confident false positive on the
// very fix that removed the real clipping, which is the whole reason gates get mutation-tested.)
const atRest = (host) => {
  const kid = host.firstElementChild;
  if (!kid) return true;
  const tf = getComputedStyle(kid).transform;
  return tf === 'none' || tf === 'matrix(1, 0, 0, 1, 0, 0)';
};
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
// parse: rgb()/rgba() AND color(srgb r g b / a). The second form is what Chromium returns as the
// COMPUTED value of any color-mix(), and the blocks library mixes colours everywhere (accentSoft
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
const boxOf = (r) => ({ x: r.left, y: r.top, w: r.width ?? (r.right - r.left), h: r.height ?? (r.bottom - r.top) });

// ── THE FRAME'S EVIDENCE, COLLECTED ONCE ─────────────────────────────────────────────────────
// Every check below reads this and measures nothing twice. `travelling` steps the render three frames
// either side and back, so building it once per frame is not a tidiness point: it is the difference
// between six extra renders and sixty.
function frameContext(n, SAFE, MIN_GAP, CUTS, OVERLAYS, CAPBAND) {
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
    // check reported them as a collision, a finding about the JSON, not about the film. Reproduced
    // with a 1200px-wide layer reading "Hi": a hard `overlap 400x50px` against a neighbour 700px away.
    // The ink rect is clamped inside the border box (see clampToBox), so this can only ever SHRINK a
    // measured box and therefore can only ever remove a finding, never invent one.
    const ink = !paintsBox(s) && inkRect(el);
    const b1 = ink || b0;
    // A text element's BOX includes line-height leading; its INK does not. `statBig` tucks its label
    // under the number's box on purpose and the two never touch visually, comparing raw boxes called
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
  // A layer mid enter-animation (or a moving `out` exit) is intentionally off-position, so its box
  // isn't a real safe-zone breach, only flag safe when the layer is at rest. Default exits fade in
  // place (no movement), so those still get checked. Timing comes from the render's data-* attrs.
  const FPS = (window.__engine && window.__engine.meta && window.__engine.meta.fps) || 30;
  const tNow = n / FPS;
  // A SCENE CUT displaces the whole camera for the length of its window, so during one every layer
  // is legitimately off its mark, including outside the safe box. midMove() understands per-layer
  // entrances but knew nothing about cuts, because until recently the cuts array rendered nothing at
  // all (MISTAKES #29); the moment it did, a cut mid-flight read as 15 safe-zone violations.
  const inCut = (CUTS || []).some((c) => Math.abs(tNow - c.t) < c.half + 0.02);
  // A ROTATED STAGE invalidates every axis-aligned box on the frame. The moment a camera keys `rx`,
  // `ry` or `roll` (or a layer tilts), the engine promotes #cam into a preserve-3d rig, and from then
  // on getBoundingClientRect returns the AABB of a PROJECTED QUAD, not the shape. A 700px hairline
  // rolled 3 degrees reports a box 80px tall; two file lines sitting a comfortable 88px apart report
  // boxes that intersect. Neither is on screen, the ink never touches, but the overlap/tight pair
  // loop compares those AABBs and calls it a collision. So it manufactures findings on exactly the
  // frames a film is doing its most deliberate camera work, and the only way to clear one is to
  // spread the layout until the OVER-BOUNDS stop touching, which makes the film worse to satisfy a
  // measurement that was never about the film (CLAUDE.md: suspect the gate).
  //
  // Read the rig itself rather than re-deriving it from the JSON: a top-level `tilt` builds the rig with
  // no camera keys at all, so the keyframes are not evidence of what the stage is doing.
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
  // UN-CAMERA. The SAFE box is a margin in SCENE coordinates: `core/layout/safe.js` states the invariant that
  // placement and checking read the same function, so `pin:"top"` resolves to the safe box's own edge and
  // an edge pin can never fail. getBoundingClientRect reads a box AFTER the camera transform, so a zoom
  // carries edge-pinned content out of the safe box with nothing wrong in the film. That is not a corner
  // case here: `core/engine/produce.js` injects a 1 -> 1.06 slowPush into every scene that declares no camera,
  // 1.06 consumes exactly the 0.06 MARGIN, and 90 of 147 scenes take the injection. Measured on the
  // library: of 14 scenes that gained a safe finding, 10 lost it again the moment the injected push was
  // replaced by a static camera. Those ten were correct authoring reported as a defect.
  //
  // Read the camera off the rendered frame rather than parsing its matrix. `#cam` is `inset: 0`
  // (core/scene.css), so its own rect IS the transformed frame: the scale is that rect over the viewport
  // and the offset is its origin. At rest the rect is the viewport, so this is exactly identity and no
  // still film changes. Perspective zoom composes into the same rect, which matrix parsing does not.
  const CX = window.innerWidth / 2, CY = window.innerHeight / 2;
  const camScale = (() => {
    const cam = document.getElementById('cam');
    const b = cam && cam.getBoundingClientRect();
    if (!b || b.width < 1 || b.height < 1) return null;
    const sx = b.width / window.innerWidth, sy = b.height / window.innerHeight;
    return (Math.abs(sx - 1) < 0.001 && Math.abs(sy - 1) < 0.001) ? null : { sx, sy };
  })();
  // TRAVELLING. midMove knew only about the enter/exit RAMPS, because those are the only timings the
  // DOM records. A layer carrying a hand-keyed `motion` track leaves no trace on its element at all, so
  // a layer crossing the frame on a keyed track read as SETTLED and every frame of its journey was
  // graded as if it were parked, a prompt panel keyed `y: 0 → -572` on its way off the top reported
  // as content leaving the safe area, which is the shot the film is there to show. Six of the eight
  // scenes that failed a frame-bounds measurement failed for exactly this.
  //
  // Do not re-derive it from the JSON. The scene file cannot be mapped onto the DOM here: `sceneUnits`
  // reparents top-level layers into per-beat wrappers, so document order is not authoring order, and no
  // layer element carries its authored id. ASK THE RENDER instead, renderFrame(n) is pure in n
  // (core/boot.js), so stepping to the next frame, measuring, and stepping back leaves the page exactly
  // where it was. One definition of "moving", covering `motion`, motionPath, gsap and ken alike: the box
  // is not where it is 0.1s either side of here.
  //
  // The window is 0.1s and not one frame, and that is the whole difference between this working and not.
  // A keyed track is a chain of eased segments, and the lead-in of one is arbitrarily slow: higgsfield's
  // button opens `x: 1132 → 1102` over 0.45s, so at the third frame of a 700px journey across the frame
  // it is moving 0.07px per frame and a per-frame test calls it parked. Asking where it is 3 frames out
  // asks the question the check actually needs, is this box where it is going to stay, instead of the
  // instantaneous velocity, which is a property of the easing and not of the shot.
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
  // A STING and a SEAM paint a full-frame generative overlay ON TOP of everything (core/stings.js,
  // core/seams.js). Nothing under one can be graded, and the frame list SAMPLES sting times on
  // purpose, so the composited pixel under a headline mid-burn is the burn. cuts-demo's "sting:
  // burn" measured 1.1:1 against #080301 and the frame is a wall of fire: true about the pixel,
  // false about the film. The same shape as #376's opening finding, a verdict passed on a frame
  // that is motion, not design, so it gets the same answer: do not judge.
  const inOverlay = (OVERLAYS || []).some((o) => Math.abs(tNow - o.t) < o.half + 0.02);
  // Same identity rule the safe-zone walk uses: a layer's index in document order. Labelling a buried
  // headline by its ink's y (the only identity it had) made ONE bug report as four, because a headline
  // that drifts a pixel between sampled frames gets a different label on each of them and the de-dup
  // downstream keys on the label.
  const layerIdx = new Map([...document.querySelectorAll('.hs-layer')].map((e, i) => [e, i]));
  return { SAFE, MIN_GAP, CAPBAND, info, tNow, inCut, stageRotated, CX, CY, camScale, travelling,
    inOverlay, layerIdx, FW: window.innerWidth, FH: window.innerHeight };
}

// Undo the ZOOM ONLY, about the centre of the VIEWPORT. The camera's translation is not undone and must
// not be: a travelling shot parks the stage at a station, and at that station the screen box is exactly
// what the viewer sees and exactly what the safe box is asking about. linear-journey pans across a
// 5500px stage, so mapping its boxes back to stage coordinates asked whether content 4100px along a
// canvas is inside a 1920px frame, and reported sixteen findings about layers that were centred on
// screen. Scale is the only part of a camera that consumes the margin, so scale is the only part undone.
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

// Safe-zone + overflow on EVERY top-level layer, not just [data-layer=critical]: content that runs
// off-frame or gets clipped is always a bug regardless of the layer's role (a corner watermark counts).
// Overlap/tight stay critical-scoped below, because layered overlaps are frequently intentional.
//
// One walk, three findings, and they stay in one function because the ORDER they are pushed in is part
// of the output: findings print in push order, so splitting the walk into three would re-sort every
// report this gate has ever written.
//
// `li` = the layer's index in document order. It is the only STABLE per-element identity available:
// the walk below is over every .hs-layer whether visible or not, so an index means the same element
// on every frame. The id/class label alone is not an identity, every text layer is `hs-text`, and
// de-duping on it collapsed N distinct off-frame layers into one reported failure.
function checkLayerBounds(ctx) {
  const { CAPBAND, FW, FH, stageRotated } = ctx;
  const issues = [];
  [...document.querySelectorAll('.hs-layer')].forEach((el, li) => {
    if (!vis(el)) return;
    // `critical: false`, the author's explicit "this layer is not legible content, do not judge its
    // edges". It already suppressed the critical-scoped checks below; it was silently inert here, which
    // is the whole reason a frame-wide field had no way to declare itself. Opt-out only: it can remove a
    // finding and never add one, so no scene can newly fail because of this line.
    if (el.dataset && el.dataset.audit === 'off') return;
    const b = el.getBoundingClientRect();
    if (b.width <= 1 || b.height <= 1) return;
    if (b.width >= FW * 0.9 && b.height >= FH * 0.9) return; // full-bleed backdrop, meant to bleed
    const s = getComputedStyle(el);
    const id = el.id || (typeof el.className === 'string' ? (el.className.split(' ').filter((c) => c !== 'hs-layer')[0] || 'layer') : el.tagName);
    const t = inkText(el).trim().slice(0, 18);   // a label, and a stylesheet is not what the viewer reads
    const of = overflowFinding(el, s, id, li, t);
    if (of) issues.push(of);
    // Measure the INK on BOTH axes. The border box is the size the author DECLARED; on a `group`, an
    // `html` layer or a component that size is `h` verbatim, and nothing need be painted in it. A group
    // declaring h:400 around a 30px label reported its extent as 400px tall and hard-failed safe-zone on
    // 360px of empty air (reproduced: `[safe] hs-group "small", (200,800,266,1200)`).
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
    // A ROTATED stage is skipped here for the reason the overlap pair is skipped (see stageRotated):
    // once #cam is a preserve-3d rig, every box read here is the AABB of a PROJECTED QUAD, so it is an
    // OVER-bound, strictly larger than the shape on screen, and the safe check is the one rule an
    // over-bound can only ever push into failing. A film settled at a tilted pose therefore reported its
    // whole cast as leaving the frame, and the only way to clear it was to shrink a correct composition.
    // The comment at stageRotated used to claim safe was safe to leave running; it was not.
    //
    // A pure SCALE or TRANSLATE is deliberately NOT exempted. There the rect is exact, a 1600px pill on
    // a stage settled at s=1.24 really is 1984px wide and really does have both ends cut off. That is a
    // defect the audit should keep reporting, not a projection artefact.
    //
    // Two spaces, two questions. The SAFE box is asked in SCENE space, because it is the margin the
    // author placed against (see unCam). The FRAME is asked on SCREEN, because a box past the frame edge
    // is genuinely cropped whatever put it there, that is the 1600px pill on a stage settled at s=1.24,
    // which really is 1984px wide and really does lose both ends. The frame is strictly outside the safe
    // box, so this second clause can only ever fire where the first shape already did.
    // Both remaining rules ask the same question of the same subject: is this SETTLED, LEGIBLE content
    // on a stage whose boxes can be trusted. Asked once, so the two rules cannot drift apart.
    if (stageRotated || midMove(el, ctx) || !carriesContent(el)) return;
    const sf = safeFinding(sb, ctx, id, li, t);
    if (sf) issues.push(sf);
    const cf = captionBandFinding(sb, CAPBAND, id, li, t);
    if (cf) issues.push(cf);
  });
  return issues;
}

// An image layer's box exists in order to clip: `object-fit: cover` already overscans, and `ken`
// overscans further on purpose, that overscan IS the Ken-Burns move. Measuring it as "content
// clipped" fired on every ken layer in the repo (gradient-showcase failed its own audit for this),
// which teaches authors the gate is noise. The rule is about clipped TEXT; keep it there.
function overflowFinding(el, s, id, li, t) {
  const clipsByDesign = el.classList.contains('hs-img-wrap');
  if (clipsByDesign) return null;
  const spills = (s.overflowX !== 'visible' && el.scrollWidth > el.clientWidth + 1)
    || (s.overflowY !== 'visible' && el.scrollHeight > el.clientHeight + 1);
  if (!spills || maskedByDesign(el)) return null;
  return { kind: 'overflow', a: id, li, t, detail: `content ${el.scrollWidth}x${el.scrollHeight} clipped to ${el.clientWidth}x${el.clientHeight}` };
}

// Two spaces, two questions. The SAFE box is asked in SCENE space, because it is the margin the
// author placed against (see unCam). The FRAME is asked on SCREEN, because a box past the frame edge
// is genuinely cropped whatever put it there, that is the 1600px pill on a stage settled at s=1.24,
// which really is 1984px wide and really does lose both ends. The frame is strictly outside the safe
// box, so this second clause can only ever fire where the first shape already did.
//
// BOTH spaces have to agree, and each one is guarding against a different lie. On screen alone, the
// injected 1.06 push carries correctly placed content out of a margin the author placed it inside.
// Un-scaled alone, a camera that zooms OUT hands the frame extra room the film really has, and taking
// it back reports a layer sitting comfortably inside (gh-wrapped holds s=0.98 through its second beat).
// Agreeing means the layer is outside the margin as authored AND outside it as delivered.
function safeFinding(sb, ctx, id, li, t) {
  const { SAFE, FW, FH } = ctx;
  // OFF CAMERA IS NOT OFF SAFE. This rule asks two things: is content sitting outside the margin, and
  // is it CROSSING the frame edge. A box that does not touch the frame at all is doing neither. It is
  // somewhere else in the world, which is precisely what a film with a travelling camera is made of:
  // five stations laid out in stage coordinates, four of them off screen at any instant by design.
  // Judging those reported seven HARD failures about layers nobody could see, on a film whose visible
  // frames were clean. The comment above is right that there must be no frame-wide camera exemption
  // (it switched this rule off for 90 of 147 scenes); this is the opposite of that, decided per BOX
  // from the render, and it can only ever drop a finding about content that is not in the picture.
  if (sb.right <= 0 || sb.left >= FW || sb.bottom <= 0 || sb.top >= FH) return null;
  const cb = unCam(sb, ctx);
  const outside = (r) => r.left < SAFE.x0 - 1 || r.right > SAFE.x1 + 1 || r.top < SAFE.y0 - 1 || r.bottom > SAFE.y1 + 1;
  const offSafe = outside(sb) && outside(cb);
  const cropped = sb.left < -1 || sb.right > FW + 1 || sb.top < -1 || sb.bottom > FH + 1;
  if (!(offSafe || cropped)) return null;
  return { kind: 'safe', a: id, li, t, detail: `(${cb.left | 0},${cb.top | 0},${cb.right | 0},${cb.bottom | 0})${cropped ? ', cropped by the frame edge' : ''}` };
}

// CAPTION BAND. The safe box says where content may live; it says nothing about the strip a
// burnt-in caption is about to be painted into, so a headline could land squarely on the caption
// and every rule above stayed green. Same subject and same measurement as the safe walk, settled
// content, ink box, an image or real text, over a band core/safe.js derives from the same
// destination numbers the caption itself is placed against.
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
    // COLLAPSED image = the layer is on screen but occupies no space, so it renders as nothing. The
    // old `b.height > 1` guard SKIPPED exactly this case, which is how a width-only image layer could
    // silently vanish when cover-fit forced height:100% on a wrapper with no height (MISTAKES #19).
    // Measure the LAYOUT box (offsetWidth/Height), not the painted rect: an image mid-`scale` entry
    // legitimately has a ~0 painted rect, but its layout box is still full size.
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
    // Measure the element that actually HOLDS the text (an element with a direct text node), not the
    // layer wrapper. An `html` layer nests its content in a child styled at its own size, so the
    // wrapper's inherited 16px default is not what the viewer sees, walk to the real text holders.
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

// CLIPPED GLYPHS. The overflow rule above only inspects top-level/critical layers, so a mask NESTED
// inside a text layer was invisible to it: `riseClip` wraps every word in overflow:hidden, and
// .hs-text's 1.04 line-height is tighter than any real font's descender depth, so 13px was sliced
// off every word at 76px and shipped as flat-bottomed g/y/p (MISTAKES #35).
function checkClippedText() {
  const issues = [];
  for (const el of document.querySelectorAll('.hs-text *, .hs-cap *')) {
    const cs = getComputedStyle(el);
    if (cs.overflow !== 'hidden' && cs.overflowY !== 'hidden') continue;
    if (el.querySelector('img, canvas, svg, video')) continue;      // media clips on purpose
    // <style> SOURCE IS NOT GLYPHS. A hand-authored `html` layer carries its CSS inline, and reading
    // that source as text made the audit report a frosted pane as "287px of clipped descenders" whose
    // supposed content was `.g{position:rela`. Nothing was clipped; nothing was even text. This is the
    // same mistake as docs/MISTAKES.md #220, which fixed it for the overlap check and missed this one,
    // so the rule is now shared rather than repeated: only RENDERED text counts.
    const txt = inkText(el).trim();
    if (!txt || !vis(el) || !atRest(el) || maskedByDesign(el)) continue;
    const dy = el.scrollHeight - el.clientHeight, dx = el.scrollWidth - el.clientWidth;
    if (dy > 1 || dx > 1) issues.push({ kind: 'clipped-text', a: txt.slice(0, 16),
      detail: `mask is ${dy > 1 ? `${dy}px too short` : `${dx}px too narrow`} for the glyphs, descenders/edges are being cut` });
  }
  return issues;
}

// A captured component is sized to the box the capture MEASURED. If the re-rendered content does not
// fit that box, .hs-comp's overflow:hidden trims it and the result reads as a screenshot cropped at
// the edge, the loudest possible "this is broken" signal, delivered silently. clipped-text guards
// the same failure one level down, but it only walks .hs-text: a component is a foreign DOM subtree
// and no rule looked at it at all, so a card lost its bottom 24px for as long as it shipped (#43).
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

// VERTICAL MASS. Nothing measured where a beat's content SITS in the frame, so a composition with
// everything crammed in the top 60% and a dead bottom third passed every check, six of twelve
// beats across two showcase films did exactly that, and all six passed safe-zone (MISTAKES #77).
// Safe-zone answers "is it inside the frame"; this answers "does it USE the frame". Warn tier: a
// deliberately top-weighted beat is a real choice, so this reports and never blocks.
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

// A CROSS-DISSOLVE is two layers deliberately sharing the same box while one fades out and the
// other fades in. That is the standard way to morph a headline between two states, and reading it
// as a collision would make dissolves unusable, the gate would forbid a technique the engine
// ships. Only exempt a genuine hand-off: both partly transparent, one exiting while the other
// enters. Two solid overlapping layers are still a hard fail.
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
// OCCLUSION. A card floating over a board overlaps the text beneath it by box and hides it by
// paint: that is a layered composition, not a collision. Sample the centre of the intersection:
// if an opaque surface is painted above the lower of the two, the lower one cannot be SEEN, so
// there is nothing to report. Same reasoning as the filled-chip case in the headline rule (#44).
const occluded = (A, B, ox, oy) => {
  const cx = Math.max(A.x, B.x) + ox / 2, cy = Math.max(A.y, B.y) + oy / 2;
  const stack = document.elementsFromPoint(cx, cy);
  // The element and its descendants are its paint; its ANCESTORS are not. Ancestors sit in the
  // stack at every point on the frame, so `e.contains(el)` made this index the depth of the whole
  // page rather than the depth of the layer, and the scan below then walked every intervening
  // ancestor looking for an opaque background, which a full-bleed backdrop always provides. The
  // occlusion escape therefore fired far more often than it was written to. Same misread as the
  // `mine` index in `buried` below; fixed in both, because the rule is one rule.
  const at = (el) => stack.findIndex((e) => e === el || el.contains(e));
  const ia = at(A.el), ib = at(B.el);
  let hidden = ia < 0 || ib < 0;                    // one is not even painted at that point
  for (let k = 0; !hidden && k < Math.max(ia, ib); k++) {
    // a local alpha test rather than `parse`. It began as a scoping accident (`parse` was declared
    // further down the one big function, so calling it here was a temporal-dead-zone error that threw
    // on every scene) and it stays because the two are NOT equivalent: `parse` also reads
    // `color(srgb …)`, so adopting it here would silently widen what counts as an opaque cover.
    const bgc = getComputedStyle(stack[k]).backgroundColor || '';
    const m = /rgba?\(([^)]+)\)/.exec(bgc);
    const alpha = m ? (m[1].split(',')[3] !== undefined ? parseFloat(m[1].split(',')[3]) : 1) : 0;
    if (alpha > 0.85) hidden = true;
  }
  return hidden;
};
// Skipped wholesale on a rotated stage: see stageRotated above. Only these two rules are dropped, 
// they are the pair that reads an intersection OF TWO BOXES, and a projected quad's AABB carries no
// information about whether two shapes intersect. `safe` and `caption-band` are skipped for the same
// reason at their own call sites; this line used to say they were fine to leave running, on the
// grounds that "an over-bound only ever fails safe", which is the failure, not the reassurance.
// clipped/contrast still run: neither reads a rect against the frame.
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
    // A layer mid-entrance is intentionally off-position, so a transient intersection while it travels
    // is motion, not a collision, the safe-zone check has always exempted moving layers and overlap
    // now needs the same exemption, because widening it past `critical` made those transients visible.
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
// measured 46% of the headline covered and sampled as exactly 40%, one point under its own bar.
function coverSample(el, r, FW, FH) {
  let covered = 0, total = 0;
  for (let gy = 0; gy < 9; gy++) for (let gx = 0; gx < 9; gx++) {
    const px = r.left + r.width * (gx + 0.5) / 9, py = r.top + r.height * (gy + 0.5) / 9;
    if (px < 0 || py < 0 || px >= FW || py >= FH) continue;
    const stack = document.elementsFromPoint(px, py);
    // "Is this MY paint?" is answered by the element and its descendants only. `e.contains(el)` also
    // matched every ANCESTOR, #cam, .hs-stage, body, and those are in the stack at every point on
    // the frame, so the guard below could never fire and the escape hatch it documents was dead code
    // for as long as the check existed. That is what let a mis-measured rect (see clampToBox) sample
    // 81 points of empty canvas and still call all 81 "the headline".
    const mine = stack.findIndex((e) => e === el || el.contains(e));
    if (mine < 0) continue;                        // not painted here at all: outside the ink, not buried
    total++;
    for (let k = 0; k < mine; k++) if (opaqueAt(stack[k])) { covered++; break; }
  }
  return { covered, total };
}

// THIN HERO. The reference standard is a hero line filling 60-80% of frame width, and our landscape
// films sit at a 40.4% median ink with 82.9% of sampled frames under the floor (1090 samples, 88
// scenes). The cause is doctrine, not accident: TYPOGRAPHY.md and LAYOUT.md both applied Butterick's
// 45-75 character measure to display type, and a six-word hook at 66 characters lands near 45% of
// 1920 by construction. Both docs now exempt display type; this reports the frames still short.
//
// Measure the INK, never the declared box. The box is already about right (70% median) and the glyphs
// fill only 67.5% of it, so a check on `w` would call the library healthy and see nothing.
//
// WARN ONLY, and it must stay that way. Four landscape films in five trip this, and a gate that
// blocks four in five is a gate everyone waives; a rule waived by reflex has already been repealed.
function checkThinHero(ctx) {
  const { FW, FH, layerIdx } = ctx;
  if (!(FW > FH)) return [];
  const issues = [];
  const hero = findHero(ctx);
  // 55, not the 60 floor itself: a frame a hair under the floor is a judgement call, and a warn that
  // fires there says nothing an author can act on. Below 55 the type is web-sized, not marginal.
  const HERO_FILL_MIN = 0.55;
  const { spanL, spanR } = contentSpan(hero, FW, FH);
  const composed = (spanR - spanL) / FW >= 0.6;
  if (hero && !composed && hero.w / FW < HERO_FILL_MIN)
    issues.push({ kind: 'thin-hero', a: hero.el.id || `hero@${hero.px | 0}px`, li: layerIdx.get(hero.el.closest('.hs-layer')),
      t: hero.t.slice(0, 18),
      detail: `hero ink is ${Math.round(hero.w / FW * 100)}% of frame width, want 60-80%. Set it at video scale, not web scale.` });
  return issues;
}

// The hero is the largest type on the frame; a supporting line under it is not this rule's
// subject, and reporting both would make one thin beat read as two findings.
function findHero(ctx) {
  let hero = null;
  for (const el of document.querySelectorAll('[data-layer="critical"]')) {
    if (!vis(el) || midMove(el, ctx) || !arrived(el)) continue;
    const s = getComputedStyle(el);
    if (paintsBox(s)) continue;                    // a chip or card sets its own width; the box IS the design there
    const txt = inkText(el).trim();
    // A short payoff is exempt on purpose. "2.5B" cannot reach 60% of the frame without type nobody
    // would set, so demanding it would make the film worse to move a number (CLAUDE.md: suspect the
    // gate). The rule is about a HOOK LINE that was set at web size, and a hook has words in it.
    if (txt.length < 12) continue;
    const r = inkRect(el);
    if (!r || r.width < 4) continue;
    const px = parseFloat(s.fontSize) || 0;
    if (!hero || px > hero.px || (px === hero.px && r.width > hero.w)) hero = { el, px, w: r.width, left: r.left, t: txt };
  }
  return hero;
}

// A SPLIT FRAME is not a thin hero. LAYOUT.md §6 calls "headline left, artifact right" the workhorse
// archetype and §0 asks for two focal points, so in a split the hero owns a column by design and
// stretching it to 60% of the FRAME would drive it into the artifact. Found by rendering the first
// findings and looking: argus-launch f173 sets its hook against a live dashboard, reads well, and was
// reported at 37%. So the subject is the frame's whole content extent: if the hero plus the other
// content beside it already spans the frame, the frame is composed and this rule has nothing to say.
function contentSpan(hero, FW, FH) {
  let spanL = Infinity, spanR = -Infinity;
  if (!hero) return { spanL, spanR };
  spanL = hero.left; spanR = hero.left + hero.w;
  const MIN_AREA = FW * FH * 0.015;              // ignore specks; a hairline or a corner tick is not a focal point
  for (const el of document.querySelectorAll('.hs-layer')) {
    if (el.contains(hero.el) || hero.el.contains(el)) continue;
    if (!vis(el) || !arrived(el) || !carriesContent(el)) continue;
    const b = el.getBoundingClientRect();
    if (b.width * b.height < MIN_AREA) continue;
    // Clamp to the canvas: a decorative field that bleeds off both edges is not evidence that the
    // frame is composed, and unclamped it would silence this rule on every scene that has one.
    spanL = Math.min(spanL, Math.max(b.left, 0)); spanR = Math.max(spanR, Math.min(b.right, FW));
  }
  return { spanL, spanR };
}

// ── CONTRAST: COLLECT PROBES, THEN HIDE THE GLYPHS (docs/MISTAKES.md #390) ────────────────────
// No rule below decides anything. Each one names its SUBJECT, the ink box, the declared ink
// colour, the size, the structural flags, and the caller measures the backdrop from the
// composited frame with every subject's own paint hidden. The WCAG arithmetic, the size-aware
// bars and the -soft tiering are unchanged and live in `contrastFindings` at the bottom of this
// file, next to the pixels.
//
// What went away, and why it had to. `bgFor` SEARCHED the DOM for something that ought to be
// behind the text: ancestors first, then `elementsFromPoint`, then the bg canvas, then the body.
// Every ordering of that walk is wrong for some real film, and three of them were measured:
// an absolutely positioned mockup paints its button fill as a SIBLING of the label, so the
// ancestor walk found the white panel behind both and called a legible white-on-orange button
// 1.0:1; probing first walked a label out of its own white card; `elementsFromPoint` is
// HIT-TESTING, so the `pointer-events:none` bg canvas never appears in it; and stopping at the
// canvas fails whenever a hand-authored `html` backdrop hides the canvas outright. The search has
// no correct order because the question is not a DOM question. The composited pixel is.

// Contrast (WCAG AA, size-aware) on EVERY rendered text element, not just [data-layer=critical].
// Muted labels and captions are exactly where low-contrast gray-on-white slips through, so check any
// element that carries its own text node. A video is usually watched scaled DOWN (not fullscreen), so
// the WCAG large-text allowance only applies to genuinely big type (>=48px in-frame); everything else
// must clear the 4.5:1 normal-text bar to stay legible at half-size.
function collectTextProbes(probe) {
  for (const el of document.querySelectorAll('body *')) {
    if (el.closest('script, style, noscript, svg')) continue;
    if (![...el.childNodes].some((nd) => nd.nodeType === 3 && nd.nodeValue.trim())) continue; // only elements with DIRECT text
    if (!vis(el)) continue;
    const b = el.getBoundingClientRect();
    if (b.width < 2 || b.height < 2) continue;
    if (el.closest('[data-logotype]')) continue; // WCAG 1.4.3 logotype exemption, declared per layer
    // Only ARRIVED text is graded: mid-entrance the element composites toward the backdrop, so the
    // measured ratio is a fact about the ramp and not about the design (#376).
    if (!arrived(el)) continue;
    const cs = getComputedStyle(el);
    const fg = parse(cs.color);
    if (!fg || fg[3] < 0.5) continue;
    // Read the backdrop UNDER THE GLYPHS, so the ink box and not the declared box. `pin` centres a
    // box, so a placed text layer must have a `w`; with `align:"left"` the glyphs sit against one
    // edge and the rest of that box is empty slack that may be over an entirely different surface.
    const pb = (!paintsBox(cs) && inkRect(el)) || b;
    probe(el, boxOf(pb), { rule: 'text', px: parseFloat(cs.fontSize) || 0, fg,
      a: el.id || (typeof el.className === 'string' ? el.className.split(' ')[0] : el.tagName),
      t: inkText(el).trim().slice(0, 18) });
  }
}

// EMPHASIS + WIDE contrast: the loop above reads each layer's TOP-level colour only. A layer's
// <b>/<em> spans carry their OWN colour (--em), an accent <b> on an accent bg vanishes (the
// blue-on-blue bug the old audit missed). Also widen past [data-layer=critical] to ANY headline-
// scale text (≥60px), soft-tier when the layer isn't critical so existing videos don't newly HARD-fail.
function collectSpanProbes(probe) {
  const checkSpan = (span, critical, label) => {
    // inkText, not textContent: this `t` is a GATE as well as a label, and `checkSpan` is called with a
    // whole layer when it is headline-scale, a layer that carries only an inline stylesheet would pass
    // the emptiness test on its own CSS source (docs/MISTAKES.md #220/#216/#217, same rule again).
    const t = inkText(span).trim(); if (!t || !vis(span)) return;
    const b = span.getBoundingClientRect(); if (b.width < 2 || b.height < 2) return;
    const cs = getComputedStyle(span);
    const px = parseFloat(cs.fontSize) || 0;
    if (px < 40) return; // ignore small captions/labels
    const fg = parse(cs.color); if (!fg || fg[3] < 0.5) return;
    // The ink box again. An inline <b>/<em> box already hugs its run, but the loop below also hands
    // this whole LAYER when the layer is headline-scale, and a layer's box is the declared `w`.
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

// Did the AUTHOR put an opaque shape behind this text (a chip, a pill, a filled panel), as opposed
// to the text simply sitting on the scene field? That distinction is what separates the two cases
// the headline rule below would otherwise conflate. It is a structural question, not a colour one,
// so it is answered structurally: is there an opaque sibling element in the paint stack under it.
const onOwnFill = (el, bx) => {
  // A layer that paints its OWN fill is a chip too, and the stack walk below could never see one:
  // it skips anything containing the element (`p.contains(el)`), which is right for the scene field
  // behind a component and wrong for the pill a layer draws for itself. tpot's brand-blue chip is
  // ONE div with a background and a white word inside it, so "is there an opaque SIBLING under the
  // glyphs" answered no and a deliberate white-on-brand-blue chip was held to the 7:1 field bar
  // (docs/MISTAKES.md #390, second face). Walk the element and its ancestors up to the layer first.
  // A full-bleed surface is the FIELD, not a chip, so it does not count, but it does not veto the
  // sibling walk either: this loop can only ever return true, so it can only relax a bar.
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
// DISPLAY-TYPE CONTRAST: legibility (4.5:1) is not enough for display type; below 7:1 it reads
// washed-out ("gray heading" bug class).
//
// This used to judge ONE element per frame: the single largest text, found by a running maximum. The
// bar is a fact about how big type reads against a field, so it belongs to every element that is big
// type, and picking a winner meant a headline's verdict was decided by whether it had a bigger
// neighbour. Reproduced with two identical layers: an 80px headline at 3.3:1 is a HARD `weak-headline`
// when it is the largest on the frame and reported by nothing at all when a 90px sibling exists.
// Same paint, same ratio, opposite verdicts. So judge every arrived display-scale text.
function collectHeadlineProbes(ctx, probe) {
  const texts = ctx.info.filter((e) => [...e.el.childNodes].some((nd) => nd.nodeType === 3 && nd.nodeValue.trim()));
  for (const e of texts) {
    const px = parseFloat(getComputedStyle(e.el).fontSize) || 0;
    if (px < 56) continue;
    if (!arrived(e.el)) continue; // judge only ARRIVED headlines (mid-fade is motion, not a verdict)
    const fg = parse(getComputedStyle(e.el).color);
    if (!fg || fg[3] < 0.85) continue;
    const bx = { x: e.x, y: e.y, w: e.r - e.x, h: e.btm - e.y };
    // The 7:1 bar exists for display type on the SCENE FIELD, where a low-saturation tint of the
    // background reads as a washed-out grey heading. Text on a filled chip cannot wash out, it is
    // a deliberate, saturated block, and WCAG judges exactly that case at the large-text bar. Held
    // to 7:1, the gate rejected white on a brand's own button blue, which is a treatment the brand
    // ships on its real site. Same rule, the right bar for the situation (MISTAKES #44).
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
    checkClippedComponent, checkVerticalMass, checkPairs, checkBuried, checkThinHero])
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
  shapeInk, svgInk, clampToBox, inkRect, carriesContent, atRest, opaqueAt, parse, boxOf,
  frameContext, unCam, midMove, checkLayerBounds, overflowFinding, safeFinding, captionBandFinding,
  checkImageFloor, checkTinyText, checkClippedText, checkClippedComponent, checkVerticalMass,
  fading, crossDissolve, occluded, checkPairs, pairFinding, checkBuried, coverSample,
  checkThinHero, findHero, contentSpan, collectTextProbes, collectSpanProbes, onOwnFill,
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
// `pin`/`x` centring keywords resolve against the LAYER'S OWN SIZE (core/boot.js resolveCoords: `center`
// → (W - size)/2). A layer with no `w` has size 0, so `center` means (W-0)/2, the layer's LEFT EDGE
// lands on the centre line and the content runs off to the right. It renders wrong at every aspect, but
// Layout placement (a centring keyword with nothing to centre) is defined ONCE, in core/validate.mjs,
// and imported here. It used to live in this file with its own NEEDS_W/PIN_X tables, a second copy of
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
    // without a resolvable anchor they are silently dropped, authored intent that never renders.
    if ((L.dx != null || L.dy != null) && !L.anchor)
      out.push({ kind: 'dead-offset', a: id, t, detail: `dx/dy are anchor offsets and do nothing without \`anchor\`, the layer renders unshifted` });
  }
  return out;
}

// ── THE COMPOSITED PIXEL UNDER THE GLYPHS (docs/MISTAKES.md #390) ────────────────────────────
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
// core/motion.js uses. It moved here because the pixels are here.
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

// A COMMITTED FILL, decided on the measured pixel rather than on structure. The 7:1 bar is
// there for one defect, named where it is declared: display type that is "a low-saturation
// tint of the background", which reads as a washed-out grey heading. White on a brand's
// saturated orange is the opposite of that, and #44 already made the argument for a chip:
// deliberate, saturated block, WCAG's large-text bar governs. It could only ever say "chip"
// structurally, so a full-bleed brand FIELD, the same treatment, painted larger, was still
// held to 7:1. That never surfaced while the backdrop was searched for, because `bgFor`
// returned null on a hand-authored `html` backdrop and the rule silently skipped; measuring
// the pixel makes it visible, and brew-launch-act1's 400px white "Meet" on brand orange, the
// film this repo holds up as its reference, is the case. Read at f258: plainly legible.
// The ink has to be a NEUTRAL EXTREME for this. A pale-orange heading on orange is the
// washout defect itself and stays at 7:1, which is why this tests the ink and not only the
// field (docs/MISTAKES.md #390, second face).
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

// `contrast-unmeasurable` is HARD on purpose. If the screenshot or the decode fails, the contrast
// rules measured NOTHING that frame, and a gate that goes quiet when it stops working is worse
// than one that fails.
const HARD = new Set(['overlap', 'overflow', 'safe', 'contrast', 'buried', 'weak-headline', 'degenerate-pin', 'collapsed-image', 'clipped-text', 'clipped-component', 'contrast-unmeasurable']);
const server = await startServer();
const port = server.address().port;
const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--hide-scrollbars', '--force-device-scale-factor=1'] });
const rows = [];

for (const spec of modules) {
  // a .json arg audits THAT data file (module read from it); a bare name audits the format's sample
  const isData = spec.endsWith('.json');
  const raw = isData ? spec : `formats/${spec}/sample.json`;
  // Normalise to a repo-RELATIVE path. An absolute arg, which the MCP pipeline passes for a scene
  // under .vawe-data, otherwise broke everything: `path.join(repoRoot, absolute)` concatenates into
  // a garbage path (→ "file not found") and `?data=/${absolute}` sends the browser a doubled path.
  // A relative arg is unchanged. (Bug found by a fresh MCP session auditing every draft.)
  const sample = path.isAbsolute(raw) ? path.relative(repoRoot, raw) : raw;
  const absPath = path.join(repoRoot, sample);
  if (sample.startsWith('..') || !fs.existsSync(absPath)) { rows.push({ m: spec, hard: 1, warn: 0, crit: 0, note: 'file not found' }); continue; }
  // `transitions` is the documented unified surface and lowers to cuts/seams/stings before the engine
  // renders (core/transitions-lower.js). Without this, a film that declares its boundaries the
  // documented way was read as a film with NO boundaries. Idempotent; a no-op for raw `cuts`. #380.
  const cfg = (() => { try { return lowerScene(JSON.parse(fs.readFileSync(absPath, 'utf8'))); } catch { return {}; } })();
  const m = isData ? (cfg.module || spec) : spec;
  // the scene's own waiver list, read the same way every other gate reads it.
  const allow = new Set(Array.isArray(cfg.authoring?.allow) ? cfg.authoring.allow : []);

  // source checks are aspect-independent (they're about the JSON, not a canvas), report them once
  const si = heroOnly ? [] : sourceIssues(cfg);
  if (si.length) rows.push({ m: `${isData ? `${m} · ${path.basename(sample)}` : m}  [source]`,
    hard: si.filter((i) => HARD.has(i.kind)).length, warn: si.filter((i) => !HARD.has(i.kind)).length, crit: 0, items: si });

for (const aspectKey of askedAspects) {
  const page = await browser.newPage();
  // Audit at the video's REAL dimensions. Getting this wrong (auditing a 16:9 scene at portrait
  // 1080x1920) mis-fires safe-zone and the tiny-text floor on every landscape video.
  const [vw, vh] = dimsFor(aspectKey, cfg);
  const safe = safeFor(vw, vh, cfg);
  const capBand = capBandFor(vw, vh, cfg);
  // cut windows the renderer will actually apply (mirrors scene.html: `none` is filtered, `dur` is
  // the TOTAL window split evenly around t)
  const cutWindows = (cfg.cuts || []).filter((c) => c && c.style && c.style !== 'none')
    .map((c) => ({ t: +c.t, half: (c.dur ?? 0.36) / 2 }));
  // Full-frame generative overlays, mirroring what scene.js builds: a sting spans `dur ?? 1.0`
  // centred on t, a seam `dur ?? 0.5`. Contrast is not graded inside one, see `inOverlay`.
  const overlayWindows = [
    ...(cfg.stings || []).filter((s) => s && s.fx && s.fx !== 'none').map((s) => ({ t: +s.t, half: (+(s.dur ?? 1.0)) / 2 })),
    ...(cfg.seams || []).filter((s) => s && s.fx !== 'none').map((s) => ({ t: +s.t, half: (+(s.dur ?? 0.5)) / 2 })),
  ].filter((o) => Number.isFinite(o.t) && o.half > 0);
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
  // Install the page-side audit once per page, not once per frame: the bundle is the whole check
  // suite as source, and shipping it fourteen times would be fourteen parses for one answer.
  await page.evaluate(PAGE_SRC);
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
  // CONTENT-AWARE SAMPLING. Uniform ticks alone have a blind spot exactly the width of a beat: with
  // 14 samples across 25s they sit 1.8s apart, so a card on screen for 1.4s can fall cleanly between
  // two of them and every rule in this file silently skips it. That is not hypothetical, a captured
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
    const { issues, count, probes } = await page.evaluate(
      (a, b, c, d, e, g) => window.__auditFrame(a, b, c, d, e, g), f, safe, MIN_GAP, cutWindows, overlayWindows, capBand);
    critMax = Math.max(critMax, count);
    // The frame with every contrast subject's own paint hidden, the backdrop, composited, as the
    // viewer would see it under the glyphs. Deliberately page.screenshot() and not a cached frame
    // buffer: a cache is keyed on the frame, knows nothing of the DOM mutation just made, and would
    // hand back a picture that predates it (the same trap the reference implementation carries).
    // --hero grades no text, so it needs no picture of the backdrop. The glyph restore still runs: the
    // page function hid them, and leaving them hidden would poison every frame measured after this one.
    if (probes && probes.length && heroOnly) await page.evaluate(restoreHiddenFn);
    else if (probes && probes.length) {
      let shot = null, shotErr = null;
      try { shot = await page.screenshot({ type: 'png', optimizeForSpeed: true }); }
      catch (e) { shotErr = e.message; }
      finally { await page.evaluate(restoreHiddenFn); }
      // AUDIT_BG_FRAME=<n> writes the hidden-glyph frame the contrast rules measured. The whole
      // point of this method is that the evidence is a picture, so leave a way to look at it.
      if (shot && +process.env.AUDIT_BG_FRAME === f) fs.writeFileSync(path.join(OUT, `bg.f${f}.png`), shot);
      let img = null;
      if (shot) { try { img = decodePNG(Buffer.from(shot)); } catch (e) { shotErr = e.message; } }
      if (img) issues.push(...contrastFindings(probes, img, vw, vh));
      else issues.push({ kind: 'contrast-unmeasurable', a: 'contrast', t: '',
        detail: `could not read the frame under the glyphs, so no text was graded: ${shotErr || 'unknown'}` });
    }
    const hard = issues.filter((i) => HARD.has(i.kind)).length;
    if (hard > worst.n) worst = { f, n: hard };
    // NO FRAME-WIDE CAMERA EXEMPTION. A filter used to sit at this line: it read the camera keyframes and
    // dropped every `safe` and `caption-band` finding on any frame between two keys that differ.
    // `core/engine/produce.js` gives a scene that declares no camera a `slowPush` spanning the WHOLE runtime, so
    // it answered "moving" on every frame of 90 of the 147 scenes here, and a rule this file calls a HARD
    // fail was switched off for most of the library. It was also the second owner of a fact the page
    // already holds. The page decides per LAYER, from the render: `travelling` for a box mid-journey,
    // `stageRotated` for a 3D rig whose boxes are over-bounds, `unCam` for the camera's own displacement.
    // Every one of those is measured; this was guessed from JSON, and it was strictly coarser.
    for (const i of issues) all.push({ f, ...i });
  }
  // WAIVERS. Every other gate in this repo honours {"authoring":{"allow":[...]}}; this one did not, so
  // a DELIBERATE composition had no way past it and the only options were to contort the scene or to
  // stop running the audit. ledgerline-neon marks its selected row with a bloom instead of a card, and
  // the row is composited into a gap the wall reserves for it: the boxes overlap by design, the content
  // never does, and with no card there is no opaque surface for the overlap check's own exemption to
  // find. A waived issue is still PRINTED, tagged, and counted separately, so waiving stays visible.
  if (heroOnly) for (let i = all.length - 1; i >= 0; i--) if (all[i].kind !== 'thin-hero') all.splice(i, 1);
  const waived = all.filter((i) => allow.has(i.kind));
  const hard = all.filter((i) => HARD.has(i.kind) && !allow.has(i.kind));
  const warn = all.filter((i) => !HARD.has(i.kind) && !allow.has(i.kind));
  for (const i of waived) i.waived = true;
  // De-dup repeated issues to the first frame they appear on: the SAME element failing on 12 sampled
  // frames is one bug, not twelve. Identity is the layer index (`li`) where we have it, because the
  // label is a class name, `hs-text` for every text layer, so keying on it merged unrelated layers
  // and reported 1 of 4 real off-frame failures. Fall back to label+text for issues that carry no
  // index (the critical-element checks, whose `a`/`b` are already per-element ids).
  const key = (i) => `${i.kind}|${i.li ?? `${i.a}|${i.t || ''}`}|${i.b || ''}`;
  const uniq = (list) => { const seen = new Set(), out = []; for (const i of list) { const k = key(i); if (!seen.has(k)) { seen.add(k); out.push(i); } } return out; };
  const hu = uniq(hard), wu = uniq(warn), vu = uniq(waived);
  const label = `${isData ? `${m} · ${path.basename(sample)}` : m}  [${aspectKey || `${vw}x${vh}`}]`;
  rows.push({ m: label, hard: hu.length, warn: wu.length, waived: vu.length, crit: critMax, items: [...hu, ...wu, ...vu] });

  if (heroOnly) { await page.close(); continue; }   // no overlay: nothing here is worth a picture yet
  await page.evaluate(overlayFn, worst.f, safe);
  // one overlay per audited canvas, the whole point is comparing where the SAME scene breaks per ratio
  // named for the SCENE, not the module: every scene audits as module `scene`, so `scene.png` was one
  // file thirteen films deep and the overlay never belonged to the run that just printed its verdict.
  const shot = `${isData ? path.basename(sample, '.json') : m}${aspectKey ? `.${aspectKey.replace(':', 'x')}` : ''}.png`;
  await page.screenshot({ path: path.join(OUT, shot) });
  await page.close();
}
}
await browser.close(); server.close();

// --hero prints its own short report and exits 0. It is ONE warning out of this file's 18 kinds, so
// printing the full LAYOUT AUDIT banner under it would claim a sweep that did not happen.
if (heroOnly) {
  const items = rows.flatMap((r) => (r.items || []).map((i) => ({ ...i, m: r.m })));
  // A scene that never loaded measured NOTHING, and a tick over it would be the worst outcome this
  // whole change could have: the finding moved earlier only to become a false green.
  for (const r of rows.filter((x) => x.note)) console.log(`  ! ${r.m}: ${r.note}. Hero fill was NOT measured.`);
  if (!items.length && !rows.some((r) => r.note)) {
    console.log(`  ✓ hero fill: no landscape frame sampled sets its hero line at web scale.`);
  } else {
    // Only the --hero branch speaks records so far, because it is the only part of this file
    // author-check consumes before the render exists. The record is the finding and the line is
    // rendered from it, so the aggregator reads `code` instead of re-reading the sentence
    // (docs/MISTAKES.md #401). The rest of this file still prints `{kind}` rows post-render.
    // The glyph is fixed rather than derived: a waived thin-hero has always printed `~ … (waived)`,
    // never the `○` the shared renderer would reach for, and this change may not move the line.
    const F = gateFindings({ indent: '  ',
      line: (r) => `  ~ [${r.code}]${r.waived ? ' (waived)' : ''} ${r.summary}` });
    for (const i of items) F.warn('thin-hero', `${i.m} f${i.f} ${i.a}${i.t ? ` "${i.t}"` : ''}, ${i.detail}`,
      { at: { frame: i.f }, ...(i.waived ? { waived: true } : {}) });
    F.emit();
  }
  console.log(`  (hero fill only: 1 of the 19 finding kinds in this file. Every contrast, overlap, clipping`);
  console.log(`   and safe-zone check still runs post-render, under \`make audit\`.)`);
  process.exit(0);
}
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
    console.log(`    ${i.waived ? '○' : ' '}[${i.kind}]${i.waived ? ' (waived)' : ''} ${i.f == null ? '' : `f${i.f} `}${who}, ${i.detail}`);
  }
}
console.log(`\noverlays in ${OUT}/ (one PNG per audited scene)`);
console.log(`${hardTotal ? '✗ ' + hardTotal + ' HARD issue(s)' : '✓ no hard issues'}${warnTotal ? ` · ${warnTotal} warning(s)` : ''}`);
process.exit(hardTotal ? 1 : 0);
