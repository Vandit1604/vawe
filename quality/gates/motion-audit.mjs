// quality/gates/motion-audit.mjs: check ANIMATION OVER TIME without rendering video. Renders every frame
// headless (no encode, no screenshots), builds a per-element time series ({effective opacity, position,
// text}) for every timed layer (selected on `[data-start]`, see the note above `captureSeries`), and
// asserts the motion contract per segment:
//
//   FAIL  (i)   final hold. The LAST frame of the video is not faded (per-shot: see MISTAKES #425)
//   FAIL  (ii)  reveal monotonic. A reveal's opacity DIPS and comes back (a layer's own exit is not a dip)
//   FAIL  (iii) settle before exit, payoffs reach steady state ≥0.5s before the exit transition
//   WARN  (iv)  count-up sane. A counter reverses BOTH ways (it is `add('WARN', …)`; this line said FAIL)
//   FAIL  (v)   typing completes, typewriter text reaches its full length before the exit
//   WARN  (vi)  frozen span. Nothing tracked changes for >15% of the runtime (capped 0.6-2s)
//   WARN  (vii) velocity spike, >80px/frame jumps outside segment boundaries
//   WARN  (xi)  degenerate. An element laid out for its whole life that never has a box
//   WARN  (xii) invisible. An element boxed for its whole life that never reaches 1% opacity
//
// (xi)/(xii) are per ELEMENT, not per frame: `dead-air` in beat-check asks whether a FRAME is empty and
// passes a frame full of content, so a layer that animates from first breath to last while contributing
// nothing to any frame has never had a reader.
//
// Exemptions are declarative: elements (or ancestors) with data-motion="loop" (carets, spinners,
// pulsing chrome) are skipped by (ii)/(iii). SHOT WINDOWS come from the film's own cuts and seams via
// core/timeline/junctions.js `shotWindows`. A film that cuts nowhere is one shot, which is a true answer and not
// a fallback. They used to come from `meta.segments`, a field no scene has ever set, which disabled the
// whole FAIL tier for the life of the gate (engine-doctrine/MISTAKES.md #472).
//
// TIER: MOTION_TIER=enforce makes the FAIL tier block. It reports by default, because it fires on 53 of
// the 127 buildable scenes in this library and a rule waived by reflex has already been repealed.
//
//   node quality/gates/motion-audit.mjs [format ...] [--stride N] [--data path.json] [--json]
//   make motion [M=<format>] [STRIDE=2]
//
// --trace: an INSTRUMENT, not a check (no pass/fail, always exits 0). An agent cannot watch a video, it
// reads frames, and the series this file already builds to run the nine checks above was thrown away
// after scoring them. --trace keeps it: per layer, when it moves vs holds, its peak position velocity
// and peak area-change (a scale pulse moves no pixel and still shows here), when each peak lands, and
// whether its motion is monotonic (one direction) or oscillating. Sampled, not rendered whole: default
// stride auto-scales to ~200 samples over the film so a trace costs seconds. See engine-doctrine/CRAFT/MOTION-TRACE.md.
//
//   node quality/gates/motion-audit.mjs scene --data formats/scene/x.json --trace [--stride N] [--json]
//   make motion-trace M=scene D=formats/scene/x.json
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer';
import { sceneDims } from '../../core/layout/safe.js';
import { junctionTable, marksOf, shotWindows } from '../../core/timeline/junctions.js';
import { loadScene } from '../../core/engine/expand.js';
import { serveRepo, waitForEngine } from '../../harness/lib/render-harness.mjs';
// This gate already owns a rich --json payload (a whole report object, not a flat finding list), the
// exact engine-doctrine/MISTAKES.md #401 case findings.mjs was built to name. `emitJson` is the one door that lets
// it keep that payload verbatim while still routing through the shared module (harness/lib/findings.mjs,
// engine-doctrine/CRAFT/COMMAND-OUTPUT.md): it writes to the real stdout captured before any --json redirect, so it
// cannot become a second writer on the same stream.
import { emitJson } from '../../harness/lib/findings.mjs';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const args = process.argv.slice(2);
const flag = (name) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : null; };
const STRIDE = Math.max(1, parseInt(flag('--stride') || '1', 10));
const DATA = flag('--data');
const DATA_LIST = DATA ? DATA.split(',').filter(Boolean) : [null];
const JSON_OUT = args.includes('--json');
const TRACE = args.includes('--trace');
const TRACE_TARGET_SAMPLES = 200; // stride auto-scales to land near this many samples, unless --stride is given
let formats = args.filter((a, i) => !a.startsWith('--') && args[i - 1] !== '--stride' && args[i - 1] !== '--data');
if (!formats.length) formats = fs.readdirSync(path.join(repoRoot, 'formats')).filter((f) => fs.existsSync(path.join(repoRoot, 'formats', f, 'sample.json'))).sort();

const FPS = 30;
const HOLDW = 0.5;              // settle window: payoffs must be steady for this long before the exit
// The FAIL tier has never once been enforced (see the windows block in audit()), so turning it on is a
// severity change across the whole library and not a side effect of fixing the windows. `report` names
// every finding at the tier the clause asked for (`would`) and blocks on none; `enforce` blocks.
const FAIL_LEVEL = (process.env.MOTION_TIER || 'report') === 'enforce' ? 'FAIL' : 'WARN';
// `cam` is the CAMERA RIG (formats/scene/scene.html:13), and it was missing from this list. Two
// consequences, both measured: a camera move made the rig itself report as unsettled content, and the
// rig's textContent is every word in the film, so any text changing anywhere read as "cam text still
// changing". It belongs here beside `stage` and `root`, which it has always been a sibling of.
const INFRA = new Set(['cv', 'root', 'cam', 'dip', 'grain', 'stage', 'ripple', 'cursor', 'brand', 'vig']); // chrome, not content

const { server, port } = await serveRepo();
const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--hide-scrollbars', '--force-device-scale-factor=1'] });

// parse "$1,247", "2.5M", "412ms", "88%" → number (for count-up monotonicity)
const parseNum = (t) => {
  const m = /-?\$?\s*([\d,]+(?:\.\d+)?)\s*([KMB])?/.exec(t || '');
  if (!m) return null;
  const v = parseFloat(m[1].replace(/,/g, ''));
  return v * ({ K: 1e3, M: 1e6, B: 1e9 }[m[2]] || 1);
};

// ---- capture: per-element time series across every (strided) frame ----
// Renders every strided frame and records, per tracked element, one row of {centre x, centre y,
// effective opacity, text length, text head, descendant-transform hash, rig hash} plus the life
// tallies (xi)/(xii) need. Everything below this line runs INSIDE the page.
//
// SELECTOR: `[data-start]`, not `[id], [data-layer="critical"]`. An authored layer's `id` (scene JSON
// `L.id`) is used all over the JS side (geometry maps, `becomes`, error messages) but is NEVER written
// to the DOM: `formats/scene/scene.js` keeps a separate geometry object (`g.id = L.id`, scene.js:922)
// and never sets `el.id`. So `[id]` matched only the four hand-authored ids in scene.html's static
// markup (stage/root/cv/cam) plus whatever a browser default happens to be, never an authored layer.
// `[data-layer="critical"]` only catches text layers ≥60px that default (or opt) into the layout
// audit, which is why exactly two elements showed up on an 8-layer film: both were big text. Every
// OTHER layer, top-level or nested in a group, is invisible to the old selector regardless of size,
// motion or role. `[data-start]` is the one attribute every layer actually gets, unconditionally:
// `setLayerTiming` stamps it on every top-level layer (scene.js:585) and `addGroupChild` stamps it on
// every nested one (core/layers/util.js:589); it is also the exact selector the engine's own clip
// driver uses to find "every timed element" (core/timeline/clips.js:213). Selecting on it is not a
// wider net, it is the real one: an element the engine itself does not consider timed is correctly
// left untracked (chrome markup, SVG defs, decoration overlays never get a `data-start`).
const captureSeries = (page, total, stride, idsByIdx) => page.evaluate(async (total, stride, idsByIdx) => {
  const els = [...document.querySelectorAll('[data-start]')];
  // A human name for a layer the report can print. `el.id` is kept first in case a future core change
  // ever does write it; `idsByIdx` recovers the AUTHORED id for a top-level layer via `data-idx`
  // (scene.js:584), the one back-reference from DOM to JSON that already exists. A nested group child
  // has neither, so it falls back to its own text (what an author would recognise it by) and, failing
  // that, to class+index.
  // `textContent` walks INTO a `<style>` child too (an `html` layer's scoped CSS reads as its own
  // name otherwise: "@scope { .kit-card{backg…"), so the label is read off a clone with style/script
  // stripped rather than the live element.
  const labelText = (el) => {
    let node = el;
    if (el.querySelector('style, script')) {
      node = el.cloneNode(true);
      node.querySelectorAll('style, script').forEach((n) => n.remove());
    }
    return (node.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 24);
  };
  const keys = els.map((el, i) => {
    const idx = el.dataset.idx;
    const authoredId = idx != null ? idsByIdx[+idx] : null;
    return el.id || authoredId || labelText(el) || ((typeof el.className === 'string' ? el.className.split(' ')[0] : el.tagName) + '#' + i);
  });
  const chains = els.map((el) => { const c = [el]; let p = el.parentElement; while (p && p !== document.body) { c.push(p); p = p.parentElement; } return c; });
  const loop = els.map((el) => !!el.closest('[data-motion]')); // any data-motion (loop/swap/…) opts out of motion checks
  // Markup that is not meant to paint: the SVG filter-definition host (core/looks/filters.js stamps it
  // aria-hidden, 0x0), anything inside <defs>, and script/style/template. It is boxless by design, so
  // asking whether it ever had a box is asking the wrong question of it.
  const nonVisual = els.map((el) => el.getAttribute('aria-hidden') === 'true'
    || !!el.closest('defs') || ['STYLE', 'SCRIPT', 'TEMPLATE', 'DEFS'].includes(el.tagName));

  const hash = (s, h) => { for (let c = 0; c < s.length; c++) h = (h * 31 + s.charCodeAt(c)) | 0; return h; };
  // `rig` hashes the transform of the CAMERA and the cut wrapper above this element, never the
  // element's own, and never a `group`'s, whose motion really is the layer's motion. A layer
  // standing perfectly still inside a travelling frame measures as travelling, because a
  // bounding rect is read in screen space. This is the one field that can tell those apart.
  const isRig = (node) => node.id === 'cam' || node.classList?.contains('hs-beat') || node.classList?.contains('stage');
  // one walk up the ancestor chain: effective opacity, whether anything hides this element, and the rig.
  const chainState = (chain) => {
    let eop = 1, hidden = false, rig = 0;
    for (const node of chain) {
      const s = getComputedStyle(node);
      if (s.display === 'none' || s.visibility === 'hidden') { hidden = true; break; }
      eop *= +s.opacity;
      if (isRig(node) && s.transform && s.transform !== 'none') rig = hash(s.transform, rig);
    }
    return { eop, hidden, rig };
  };
  // A wrapper whose own rect collapses is not boxless if something inside it occupies space: a
  // `morph` text layer measures 780x0 while its glyphs paint. The pixels are on screen, and the
  // question this tally exists to answer is whether ANY were. The descendant walk only runs on
  // the rare frame where the element's own rect is degenerate, so it costs nothing in the common case.
  const boxedNow = (el, b) => {
    if (b.width >= 1 && b.height >= 1) return true;
    for (const kid of el.querySelectorAll('*')) { const kb = kid.getBoundingClientRect(); if (kb.width >= 1 && kb.height >= 1) return true; }
    return false;
  };
  // A layer can be busy inside its own box: an svg whose bars scale on var(--t) animates hard while
  // its bounding rect, opacity and text all sit perfectly still. Measuring only the outside made
  // `cadence`'s waveform read as frozen through the exact seconds it was drawing itself on. So a
  // cheap fingerprint of descendant transforms rides along, capped so a 90-layer film stays cheap.
  // `drawOn` (core/motion/parts.js:40) animates an SVG stroke by setting `strokeDashoffset` on the
  // element itself, never a `transform`. A film built on it (post-trailhead's 7s route draw) measured
  // as fully held here until this line was added: folding the inline dash-offset into the same
  // fingerprint costs nothing extra, since the walk already visits every descendant.
  const kidSig = (el) => {
    // `drawOn`'s own target IS the tracked element half the time (an `id`'d `<path>`), so its own
    // dash-offset has to be read here too: `querySelectorAll('*')` below walks DESCENDANTS only.
    let sig = el.style && el.style.strokeDashoffset ? hash('d:' + el.style.strokeDashoffset, 0) : 0;
    let seen = 0;
    for (const kid of el.querySelectorAll('*')) {
      if (seen++ >= 24) break;
      const tr = getComputedStyle(kid).transform;
      if (tr && tr !== 'none') sig = hash(tr, sig);
      const dash = kid.style && kid.style.strokeDashoffset;
      if (dash) sig = hash('d:' + dash, sig);
    }
    return sig;
  };

  // life tallies, alongside the per-frame rows: how many sampled frames this element was laid out for,
  // had a real box for, and was above 1% opacity for. The rows answer "what happened at 4.2s"; these
  // answer "was this element ever anything", which no per-frame check can ask.
  const out = { keys, loop, nonVisual, frames: [], rows: keys.map(() => []), live: keys.map(() => 0), box: keys.map(() => 0), zero: keys.map(() => 0), seen: keys.map(() => 0) };
  for (let f = 0; f < total; f += stride) {
    window.__engine.renderFrame(f);
    out.frames.push(f);
    els.forEach((el, i) => {
      const b = el.getBoundingClientRect();
      const laidOut = el.getClientRects().length > 0;
      const { eop, hidden, rig } = laidOut ? chainState(chains[i]) : { eop: 1, hidden: false, rig: 0 };
      if (laidOut && !hidden && !nonVisual[i]) {
        out.live[i]++;
        if (boxedNow(el, b)) out.box[i]++; else out.zero[i]++;
        if (eop >= 0.01) out.seen[i]++;
      }
      if (!laidOut || hidden || (b.width < 1 && b.height < 1)) { out.rows[i].push(null); return; }
      const t = (el.textContent || '').trim();
      // area rides along at index 7 for --trace: a scale pulse (a wind-up, a punch-in) moves no pixel
      // of the centre and would be invisible to every position-based check above it.
      out.rows[i].push([Math.round((b.left + b.width / 2) * 10) / 10, Math.round((b.top + b.height / 2) * 10) / 10, Math.round(eop * 1000) / 1000, t.length, t.slice(0, 32), kidSig(el), rig, Math.round(b.width * b.height)]);
    });
  }
  return out;
}, total, stride, idsByIdx);

// ---- windows: the film's OWN JOINTS ----
// This used to read `meta.segments`, and NO SCENE HAS EVER SET IT: core/engine/boot.js read
// `scene.segments || []`, formats/scene never returns the key, and there is exactly one format. So
// every segment-scoped FAIL was rewritten to WARN before a reader saw it and the run printed a tick.
// `segments` was never a missing declaration: it was a SECOND way to say what `cuts` already says,
// and the film's cuts and seams are the joints, so core/timeline/junctions.js owns the reading of them
// (engine-doctrine/MISTAKES.md #165, #372: one fact, one owner). A film with no cuts is genuinely one shot.
// Lowered first: a scene written with the unified `transitions` surface has no `cuts` key yet.
function shotWindowsOf(data, total) {
  const lowered = loadScene(structuredClone(data));
  const table = junctionTable(marksOf(lowered));
  // The transition duration belongs to the joint that ENDS a shot: `visEnd` is where the exit begins,
  // so a 0.8s cut and a 0.2s cut do not end their shot at the same frame.
  const jointDur = new Map();
  for (const m of [...(lowered.cuts || []), ...(lowered.seams || [])])
    if (Number.isFinite(+m?.t)) jointDur.set(+(+m.t).toFixed(3), +m.dur > 0 ? +m.dur : 0.4);
  const shots = shotWindows(table, total / FPS);
  const windowSource = shots.length > 1
    ? `${shots.length} shots from the film's own cuts/seams (core/timeline/junctions.js)`
    : 'one shot, this film declares no cuts or seams';
  const windows = shots.map((s, i) => {
    const isLast = i === shots.length - 1;
    const trans = isLast ? 0 : (jointDur.get(+s.end.toFixed(3)) ?? 0.4);
    const start = Math.round(s.start * FPS);
    const end = Math.min(Math.round(s.end * FPS), total);                     // exclusive
    const visEnd = isLast ? end : end - Math.round(trans * FPS);              // content window ends; exit starts
    return { name: shots.length > 1 ? 'shot' + i : 'all', trans, i, start, end, visEnd, isLast };
  });
  return { windows, windowSource };
}

// the sample nearest at or after frame `f` (the last one when the film has already ended)
const sampleAt = (series, F, i, f) => { const idx = F.findIndex((x) => x >= f); return series.rows[i][idx < 0 ? F.length - 1 : idx]; };

// ---- ONE CLAUSE, ONE FUNCTION ---------------------------------------------------------------------
// Each of these takes one element's row of samples and answers one question. `elementFindings` below
// asks them in turn; nothing here knows about severities, windows or the report.

// A LAYER'S OWN EXIT IS A FADE TOO, and (ii) could not tell it from the defect it hunts. Its only
// exclusion was the SEGMENT's transition window, so every ordinary layer leaving mid-shot read as
// a mid-scene fade. Two of them on formats/scene/sample.json, the canonical clean scene. The
// window was never the missing piece: this clause is scoped to a LAYER'S LIFE, not to a shot.
// An exit is a TERMINAL DESCENT: from some frame on the opacity never rises again and the element
// does reach nothing. A dip comes back, and a dip is the bug. Scanning back from the end of the
// FULL window (not visEnd) because an exit ramp legitimately finishes inside the transition.
function exitFrameOf(row, lo, hiFull) {
  let exitFrom = hiFull, gone = false, later = null;
  for (let j = hiFull - 1; j >= lo; j--) {
    const v = row[j], o = v ? v[2] : null;
    if (o === null || o <= 0.05) { gone = true; later = 0; exitFrom = j; continue; }
    if (!gone) break;                        // it never reaches nothing: nothing here is an exit
    if (later !== null && o < later - 1e-9) break;  // rose going forward, the descent starts later
    later = o; exitFrom = j;
  }
  return gone ? exitFrom : hiFull;
}

// One walk over the window's samples, for the three things a step-to-step comparison can see: the
// deepest opacity drop before the exit (ii), the numbers a counter passed through (iv), and every
// position jump (vii).
function scanSteps(row, F, w, lo, hi, exitFrom) {
  let prev = null, prevF = -1, maxDrop = 0, dropAt = 0;
  const nums = [], jumps = [];
  for (let j = lo; j < hi; j++) {
    const v = row[j]; const f = F[j];
    if (v) { const n = parseNum(v[4]); if (n !== null && v[3] < 24) nums.push(n); }
    if (v && prev && prevF === F[j - 1]) {
      const dop = prev[2] - v[2];
      if (dop > maxDrop && f - w.start > w.trans * FPS && j < exitFrom) { maxDrop = dop; dropAt = f; }
      const dx = Math.abs(v[0] - prev[0]), dy = Math.abs(v[1] - prev[1]);
      if ((dx > 80 || dy > 80) && f - w.start > 2 && w.end - f > 2) jumps.push({ f, px: Math.max(dx, dy) });
    }
    prev = v; prevF = f;
  }
  return { maxDrop, dropAt, nums, jumps };
}

// (viii) SHIMMER: sustained sub-pixel motion on settled text reads as "shaking glyphs":
// slow camera scales and coarse rounding move text 0.05–1.5px EVERY frame with little net
// travel. Flag any ≥1s span where ≥80% of steps are tiny but nonzero and net travel < 4px.
function shimmerStart(row, F, lo, hi) {
  const winN = Math.max(4, Math.round(FPS / STRIDE));  // ~1s of samples
  const pts = [];
  for (let j = lo; j < hi; j++) { const v = row[j]; pts.push(v ? [v[0], v[1]] : null); }
  for (let s0 = 0; s0 + winN < pts.length; s0 += Math.max(2, winN >> 1)) {
    let tiny = 0, total = 0;
    for (let j = s0 + 1; j <= s0 + winN; j++) {
      if (!pts[j] || !pts[j - 1]) { total = 0; break; }
      const d = Math.abs(pts[j][0] - pts[j - 1][0]) + Math.abs(pts[j][1] - pts[j - 1][1]);
      total++;
      if (d > 0.04 && d < 1.5) tiny++;
    }
    if (total >= winN - 1 && tiny / total >= 0.8) {
      const net = Math.abs(pts[s0 + winN][0] - pts[s0][0]) + Math.abs(pts[s0 + winN][1] - pts[s0][1]);
      if (net < 4) return F[lo + s0];
    }
  }
  return null;
}

// (iv) count-up sanity. A counter must be monotone (up OR down: timers count down,
// data-tracking values may dip legitimately → only flag when it reverses BOTH ways)
function countupReversal(nums) {
  if (new Set(nums).size < 3) return null;
  const range = Math.max(...nums) - Math.min(...nums), eps = Math.max(range * 0.01, 0.001);
  let up = false, down = false, at = null;
  for (let j = 1; j < nums.length; j++) { if (nums[j] > nums[j - 1] + eps) up = true; if (nums[j] < nums[j - 1] - eps) { down = true; if (up) at = `${nums[j - 1]} → ${nums[j]}`; } }
  return up && down && at ? at : null;
}

// (v) typewriter completes: text reaches its max length before the exit.
// Only a MONOTONE-growing text is a typewriter; count-ups wobble in length ("999,999" → "1.2M").
function typingIncomplete(row, lo, hi, maxTl, endV) {
  if (!(maxTl >= 8 && endV && maxTl - endV[3] > 0)) return false;
  const grew = row.slice(lo, hi).filter(Boolean).map((v) => v[3]);
  const monotone = grew.every((v, j) => j === 0 || v >= grew[j - 1]);
  return monotone && grew.length > 2 && grew[grew.length - 1] < maxTl && grew[grew.length - 1] - grew[0] >= 8;
}

// (iii) settle before exit: steady over the last HOLDW s of the content window
function settleBreak(row, F, sIdx0, hi) {
  let pv = null, pf = -1;
  for (let j = sIdx0; j < hi; j++) {
    const v = row[j];
    if (!v) { pv = null; continue; }
    if (pv && pf === F[j - 1]) {
      let why = '';
      // Where the rig moved between these two samples, the frame travelled and the layer's screen
      // position moved with it. (iii) asks whether the LAYER settled, and that question has no
      // answer here, so it is not asked. Opacity and text are unaffected by the camera and still are.
      if (v[6] !== pv[6]) { /* the world moved: this step says nothing about the layer's pose */ }
      else if (Math.abs(v[0] - pv[0]) > 0.7 || Math.abs(v[1] - pv[1]) > 0.7) why = `still moving (Δ${Math.max(Math.abs(v[0] - pv[0]), Math.abs(v[1] - pv[1])).toFixed(1)}px/f)`;
      else if (Math.abs(v[2] - pv[2]) > 0.02) why = `opacity still changing (Δ${Math.abs(v[2] - pv[2]).toFixed(3)}/f)`;
      else if (v[3] !== pv[3]) why = 'text still changing';
      if (why) return { why, f: F[j] };
    }
    pv = v; pf = F[j];
  }
  return null;
}

// Every clause that is scoped to ONE element inside ONE window, in the order the report reads them.
function elementFindings(series, F, w, i, lastVisF) {
  const row = series.rows[i];
  const idx0 = F.findIndex((f) => f >= w.start), idx1 = F.findIndex((f) => f >= w.visEnd), idx2 = F.findIndex((f) => f >= w.end);
  const lo = idx0 < 0 ? F.length : idx0, hi = idx1 < 0 ? F.length : idx1, hiFull = idx2 < 0 ? F.length : idx2;
  // typewriter length over the FULL segment: typing that spills into the exit window is the bug
  let maxTl = 0;
  for (let j = lo; j < hiFull; j++) { const v = row[j]; if (v) maxTl = Math.max(maxTl, v[3]); }

  const out = [];
  const { maxDrop, dropAt, nums, jumps } = scanSteps(row, F, w, lo, hi, exitFrameOf(row, lo, hiFull));
  for (const j of jumps) out.push(['WARN', 'vii:jump', `${j.px.toFixed(0)}px jump at ${(j.f / FPS).toFixed(2)}s`]);
  const shimmerF = shimmerStart(row, F, lo, hi);
  if (shimmerF !== null) out.push(['WARN', 'viii:shimmer', `sub-pixel motion every frame ~${(shimmerF / FPS).toFixed(1)}s (slow camera scale or coarse rounding), text shakes`]);
  // (ii) reveal monotonicity: opacity must not visibly dip mid-scene
  if (maxDrop > 0.15) out.push(['FAIL', 'ii:monotonic', `opacity drops ${maxDrop.toFixed(2)} at ${(dropAt / FPS).toFixed(2)}s (mid-scene fade)`]);
  const reversal = countupReversal(nums);
  if (reversal) out.push(['WARN', 'iv:countup', `counter reverses direction (${reversal}), overshoot or wrong easing?`]);
  const endV = sampleAt(series, F, i, lastVisF);
  if (typingIncomplete(row, lo, hi, maxTl, endV)) out.push(['FAIL', 'v:typing', `text ends at ${endV[3]}/${maxTl} chars before the exit`]);
  const sIdx0 = F.findIndex((f) => f >= w.visEnd - Math.round(HOLDW * FPS));
  const unsettled = sIdx0 >= 0 ? settleBreak(row, F, sIdx0, hi) : null;
  if (unsettled) out.push(['FAIL', 'iii:settle', `${unsettled.why} at ${(unsettled.f / FPS).toFixed(2)}s. Payoff not settled ${HOLDW}s before exit`]);
  return out;
}

// (vi) frozen span: nothing tracked changes for >2s inside the content window
function frozenSpans(series, K, content, F, w, TOTAL_SEC) {
  // The window's own frame indices, derived here rather than at the call site: the caller already
  // hands over `w`, and computing lo/hi outside made this the only clause needing seven arguments.
  const idx0 = F.findIndex((f) => f >= w.start), idx1 = F.findIndex((f) => f >= w.visEnd);
  const lo = idx0 < 0 ? F.length : idx0, hi = idx1 < 0 ? F.length : idx1;
  const stepMoved = (j) => {
    for (let i = 0; i < K.length; i++) {
      if (!content[i]) continue;
      const a = series.rows[i][j - 1], b = series.rows[i][j];
      if (!!a !== !!b) return true;
      if (a && b && (Math.abs(a[0] - b[0]) > 0.3 || Math.abs(a[1] - b[1]) > 0.3 || Math.abs(a[2] - b[2]) > 0.005 || a[3] !== b[3] || a[5] !== b[5])) return true;
    }
    return false;
  };
  const spans = [];
  let lastChange = lo;
  for (let j = lo + 1; j < hi; j++) {
    if (stepMoved(j)) lastChange = j;
    // A flat 2s misses the whole short-film end of the library, and "how long is too long to be still"
    // is a fraction of the runtime, not an absolute. `cadence` held a perfectly frozen frame for 0.9s
    // out of 5s (a fifth of the film) and sat under this threshold while `beat-check` called the
    // span covered because the layers were still present. A short dead tail fell between the two
    // gates, and only a person watching found it (engine-doctrine/MISTAKES.md #202, #206).
    else if (F[j] - F[lastChange] > Math.min(2, Math.max(0.6, TOTAL_SEC * 0.15)) * FPS) { spans.push({ from: F[lastChange], to: F[j] }); lastChange = j; }
  }
  return spans;
}

// (ix) rhythm data: per-element entry duration in this window = first frame opacity >= 0.9
function entryDurations(series, K, content, F, w) {
  const out = [];
  K.forEach((k, i) => {
    if (!content[i]) return;
    const lo = F.findIndex((f) => f >= w.start);
    if (lo < 0) return;
    for (let jj = lo; jj < F.length && F[jj] <= w.visEnd; jj++) {
      const v = series.rows[i][jj];
      if (v && v[2] >= 0.9) { const d = (F[jj] - w.start) / FPS; if (d <= 2 && d > 0) out.push(+d.toFixed(2)); break; }
    }
  });
  return out;
}

// global final frame (whole video must not end faded)
function finalHoldFinding(series, K, content, F) {
  let gMax = 0, gAny = false;
  K.forEach((k, i) => { if (!content[i]) return; const v = series.rows[i][F.length - 1]; if (v) { gAny = true; gMax = Math.max(gMax, v[2]); } });
  if (!(gAny && gMax < 0.9)) return null;
  return { level: 'FAIL', check: 'i:final-hold', seg: '(video)', key: '', msg: `final frame max content opacity ${gMax.toFixed(2)} < 0.9, the video ends faded out` };
}

// (xi)/(xii) per-ELEMENT life. Judged over the whole render, not inside a segment window: an element
// that is on the timeline start to finish and never lands a pixel is invisible to every frame-level
// check, because every frame it spoils is full of other content.
function lifeFindings(series, K, content) {
  const out = [];
  K.forEach((k, i) => {
    if (!content[i]) return;
    if (series.live[i] === 0) return;                     // never laid out at all, it has no life to judge
    if (series.box[i] === 0 && series.zero[i] > 0)
      out.push({ level: 'WARN', check: 'xi:degenerate', seg: '(video)', key: k, msg: `laid out for all ${series.live[i]} sampled frame(s) of its life and never has both a width and a height. It animates with no box` });
    else if (series.box[i] > 0 && series.seen[i] === 0)
      out.push({ level: 'WARN', check: 'xii:invisible', seg: '(video)', key: k, msg: `boxed for ${series.box[i]} sampled frame(s) and never once reaches 1% opacity. It animates its whole life and is never seen` });
  });
  return out;
}

// (ix) rhythm monotony: timing is a voice, not a constant (MOTION-CRAFT rule 1)
function rhythmFinding(ENTRIES) {
  if (ENTRIES.length < 8) return null;
  const buckets = {};
  for (const e of ENTRIES) { const bk = (Math.round(e / 0.1) * 0.1).toFixed(1); buckets[bk] = (buckets[bk] || 0) + 1; }
  const top = Object.entries(buckets).sort((x, y) => y[1] - x[1])[0];
  if (top[1] / ENTRIES.length <= 0.8) return null;
  return { level: 'WARN', check: 'ix:rhythm', seg: '(video)', key: '', msg: top[1] + '/' + ENTRIES.length + ' entrances land in the same ~' + top[0] + 's bucket. Uniform rhythm reads monotone; vary enterDur/stagger per beat' };
}

// (x) preset monotony: one entrance device for the whole film = the "all text just rises" failure.
// Static read of the data (the preset isn't visible in frames). MOTION-CRAFT: one device per scene role.
function presetFinding(data) {
  const presets = (data.layers || []).filter((L) => L.split).map((L) => L.preset || 'up');
  if (presets.length < 5) return null;
  const cnt = {}; for (const p of presets) cnt[p] = (cnt[p] || 0) + 1;
  const top = Object.entries(cnt).sort((a, b) => b[1] - a[1])[0];
  if (top[1] / presets.length <= 0.7) return null;
  return { level: 'WARN', check: 'x:preset', seg: '(video)', key: '', msg: top[1] + '/' + presets.length + ' kinetic text layers use preset "' + top[0] + '". Vary the entrance device per scene (decode/riseClip/tilt/stretch/…), not one global reveal' };
}

// Shared by audit() and traceOf(): load the scene, wait for the engine, hand back an open page plus
// its data/meta. One door for both readers so a change to how a page is opened (a query param, a wait
// condition) cannot drift between the check and the instrument.
async function loadPage(format, dataArg) {
  const dataPath = dataArg || `formats/${format}/sample.json`;
  const dataName = dataPath.split('/').pop();
  const data = JSON.parse(fs.readFileSync(path.join(repoRoot, dataPath), 'utf8'));
  const [VW, VH] = sceneDims(data);
  const page = await browser.newPage();
  await page.setViewport({ width: VW, height: VH, deviceScaleFactor: 1 });
  await page.goto(`http://127.0.0.1:${port}/formats/${format}/scene.html?data=/${dataPath}&fps=${FPS}`, { waitUntil: 'load' });
  const err = await waitForEngine(page);
  if (err) { await page.close(); return { dataName, error: String(err) }; }
  const meta = await page.evaluate(() => window.__engine.meta);
  return { page, data, dataName, meta };
}

// top-level layers only carry `data-idx` (nested group children get none, see captureSeries above):
// this recovers the authored `id` for those by the same index the DOM already exposes.
const idsByIdxOf = (data) => (data.layers || []).map((L) => (L && L.id) || null);

async function audit(format, dataArg) {
  const opened = await loadPage(format, dataArg);
  if (opened.error) return { format, data: opened.dataName, error: opened.error, findings: [] };
  const { page, data, dataName, meta } = opened;
  const total = meta.totalFrames;
  const TOTAL_SEC = total / FPS;   // runtime in seconds, the frozen-span budget scales with it

  const series = await captureSeries(page, total, STRIDE, idsByIdxOf(data));
  await page.close();

  const { windows, windowSource } = shotWindowsOf(data, total);

  // ---- checks ----
  const F = series.frames;
  const findings = [];
  // No downgrade any more. The windows above come from joints the film actually declares, so a
  // FAIL-tier clause fired against one is adjudicable and says what it means. TIER is a separate
  // decision, argued from the census rather than from the window: see MOTION_TIER at the top.
  const add = (level, check, seg, key, msg) => findings.push({ level: level === 'FAIL' ? FAIL_LEVEL : level, would: level, check, seg: seg?.name, key, msg });
  const K = series.keys, LOOP = series.loop;
  const content = K.map((k, i) => !INFRA.has(k) && !LOOP[i]);

  const ENTRIES = []; // (ix) entry durations across the whole video
  for (const w of windows) {
    if (w.visEnd - w.start < FPS * 0.8) continue; // too short to judge
    const lastVisF = w.visEnd - 1 - ((w.visEnd - 1 - F[0]) % STRIDE || 0);

    // Does the gate see ANYTHING in this shot? The finding that used to hang off this tally is gone:
    let any = false;
    K.forEach((k, i) => { if (!content[i]) return; if (sampleAt(series, F, i, lastVisF)) any = true; });
    // PER-SHOT (i) IS GONE, and it is the one clause this pass found to be measuring the wrong thing.
    // It asks "does this shot end faded" and can only see `[id], [data-layer="critical"]`, which is not
    // the frame: a `group` or an `html` mock carries the picture while the tracked layers of that shot
    // sit at zero. Checked by eye against the render, tpot-launch 13.50s and vawe-intro 7.90s are both
    // full, solid frames and both were reported as ending faded. Whether a FRAME has anything in it is
    // measured against PIXELS, and beat-check's `dead-air` already does that. The whole-video variant
    // below survives because at the end of a film "every tracked layer is gone" and "the frame is empty"
    // stop being different claims: brew-launch-act1, tpot-launch, example-kinetic-type and _catalog-2
    // were all checked against the render and all four end on an empty frame.
    // `[data-start]` now tracks every timed layer unconditionally, so "no tracked content elements"
    // means the shot's window is genuinely empty, not that a layer opted out of being seen.
    if (!any) add('WARN', 'coverage', w, '', 'no tracked content elements in this shot window');

    ENTRIES.push(...entryDurations(series, K, content, F, w));

    K.forEach((k, i) => {
      if (!content[i]) return;
      for (const [level, check, msg] of elementFindings(series, F, w, i, lastVisF)) add(level, check, w, k, msg);
    });

    // (vi) frozen span: nothing tracked changes for >2s inside the content window
    for (const s of frozenSpans(series, K, content, F, w, TOTAL_SEC))
      add('WARN', 'vi:frozen', w, '', `nothing moves ${(s.from / FPS).toFixed(1)}s → ${(s.to / FPS).toFixed(1)}s (${((s.to - s.from) / FPS / TOTAL_SEC * 100).toFixed(0)}% of a ${TOTAL_SEC.toFixed(1)}s film)`);
  }

  // The whole-video clauses. `i:final-hold` goes to the FRONT: it is the verdict on the film, not on
  // one of its shots, and it was written to be read first.
  const held = finalHoldFinding(series, K, content, F);
  if (held) findings.unshift(held);
  findings.push(...lifeFindings(series, K, content));
  const rhythm = rhythmFinding(ENTRIES);
  if (rhythm) findings.push(rhythm);
  const preset = presetFinding(data);
  if (preset) findings.push(preset);

  return { format, data: dataName, total, segments: windows.length, findings, windowSource };
}

// ---- --trace: one element's row → when it moved, when it held, its peak, its shape --------------
// One pass over the strided samples. "moved" reuses the same per-step thresholds frozenSpans already
// checks a film against (0.3px position, 0.005 opacity, a text/kidSig change), plus a 1% area-change
// threshold that none of the nine checks above needed: they all ask about a LAYER's fade or position,
// never about a scale pulse that moves no pixel of its own centre.
function layerTrace(row, F, dt) {
  let peakVel = 0, peakVelAt = 0, peakAreaPct = 0, peakAreaAt = 0;
  let netDX = 0, netDY = 0, posPath = 0;   // position: pixels
  let netAreaRel = 0, areaPath = 0;        // area: relative (fraction of the box, scale-free)
  const states = []; // states[k]: the interval (F[k] → F[k+1]) is 'moving' | 'held' | null (a gap)
  for (let j = 1; j < F.length; j++) {
    const a = row[j - 1], b = row[j];
    if (!a || !b) { states.push(null); continue; }
    const dx = b[0] - a[0], dy = b[1] - a[1], dist = Math.hypot(dx, dy);
    netDX += dx; netDY += dy; posPath += dist;
    const vel = dist / dt;
    if (vel > peakVel) { peakVel = vel; peakVelAt = F[j] / FPS; }
    const areaRel = (b[7] - a[7]) / Math.max(a[7], b[7], 1); // signed, relative: scale-free across layers
    netAreaRel += areaRel; areaPath += Math.abs(areaRel);
    if (Math.abs(areaRel) > peakAreaPct) { peakAreaPct = Math.abs(areaRel); peakAreaAt = F[j] / FPS; }
    const moved = dist > 0.3 || Math.abs(b[2] - a[2]) > 0.005 || Math.abs(areaRel) > 0.01 || b[3] !== a[3] || b[5] !== a[5];
    states.push(moved ? 'moving' : 'held');
  }
  // collapse the per-step states into spans, the same shape `frozenSpans` already reports in
  const spans = [];
  let cur = null, start = 0;
  for (let j = 0; j < states.length; j++) {
    if (states[j] !== cur) {
      if (cur !== null) spans.push({ state: cur, from: +(F[start] / FPS).toFixed(2), to: +(F[j] / FPS).toFixed(2) });
      cur = states[j]; start = j;
    }
  }
  if (cur !== null) spans.push({ state: cur, from: +(F[start] / FPS).toFixed(2), to: +(F[states.length] / FPS).toFixed(2) });
  // SHAPE, not just a peak: net travel over total path length. A layer that moves straight from A to B
  // scores near 1; one that wobbles in place scores low. Mirrors study.mjs's peak+curve reasoning
  // (harness/media/study.mjs:306-311): a mean (or one peak number) cannot tell a held-then-launch beat
  // from a steady drift, so the shape rides beside the peak. Judged on POSITION when the layer travels
  // (posPath >= 2px); else on AREA, because a wind-up or a punch-in moves no pixel of its own centre and
  // grow-then-shrink-back is exactly what "oscillating" (net near zero over a real path) already means.
  let shape;
  if (posPath >= 2) shape = Math.hypot(netDX, netDY) / posPath >= 0.6 ? 'monotonic' : 'oscillating';
  else if (areaPath > 0.05) shape = Math.abs(netAreaRel) / areaPath >= 0.6 ? 'monotonic' : 'oscillating';
  else shape = 'held';
  return {
    spans,
    peakVelocity: Math.round(peakVel), peakVelocityAt: +peakVelAt.toFixed(2),
    peakAreaChangePct: +(peakAreaPct * 100).toFixed(1), peakAreaChangeAt: +peakAreaAt.toFixed(2),
    shape,
  };
}

// ---- candidates: a fast stop with nothing trailing it -----------------------------------------------
// The trace already computes, per layer, when it moves, its peak velocity and when the peak lands.
// That is also everything `modifiers[].lag` (core/fx/lag.js, FOLLOW-THROUGH after Dan Ebberts: a layer
// trails another's motion by a frame or three and overruns its stop before settling back) needs to be
// worth naming: a leader that snaps to a hard stop, and no OTHER tracked layer answers it nearby. It is
// used by 0 of 187 films in this library (`morph` by 1, `follow` by 1), which does not mean it belongs
// on any of these three: it means the instrument had never once said where it might.
// A finding that only names the problem changes nothing (harness/live/scene-live.mjs's own argument);
// naming the candidate is the whole point, and naming the caveat beside it is what keeps this honest,
// since the schema's own note is blunt: "wrong on a rigid board: a card that drags reads as jelly."
// This never claims to know a board from a token, so it says both and leaves the call to the author.
const TRAIL_WINDOW = 0.4; // seconds a trailing layer's own motion may start after the leader's stop
function dragCandidates(layers) {
  const movers = layers.filter((L) => L.peakVelocity > 0);
  if (movers.length < 2) return []; // nothing else on screen to compare a leader against
  const maxV = Math.max(...movers.map((L) => L.peakVelocity));
  // "fast" is read relative to THIS film, not one fixed number: a leader is a top mover here, and
  // a 150px/s floor keeps a whole film of gentle easing (where the "fastest" layer still barely moves)
  // from producing a candidate that names nothing worth naming.
  const leaders = movers.filter((L) => L.peakVelocity >= Math.max(150, maxV * 0.5));
  const out = [];
  for (const L of leaders) {
    // the leader's own STOP: the first 'held' span beginning at or after its fastest frame. A layer
    // still moving at the end of the film has nothing to overrun yet, so it is not a candidate.
    const stop = L.spans.find((s) => s.state === 'held' && s.from >= L.peakVelocityAt);
    if (!stop) continue;
    const trailedBy = layers.find((O) => O.key !== L.key
      && (O.spans.some((s) => s.state === 'moving' && s.from >= stop.from && s.from <= stop.from + TRAIL_WINDOW)
        || (O.peakVelocity > 0 && O.peakVelocityAt >= stop.from && O.peakVelocityAt <= stop.from + TRAIL_WINDOW)));
    if (!trailedBy)
      out.push(`"${L.key}" peaks at ${L.peakVelocity}px/s at ${L.peakVelocityAt}s and stops at ${stop.from}s, `
        + `and nothing trails it. Candidate for \`modifiers:[{"lag":"${L.key}"}]\` follow-through `
        + `(core/fx/lag.js, 1-3 frame delay), UNLESS this is a rigid board: a card that drags reads as jelly.`);
  }
  return out;
}

async function traceOf(format, dataArg) {
  const opened = await loadPage(format, dataArg);
  if (opened.error) return { format, data: opened.dataName, error: opened.error };
  const { page, data, dataName, meta } = opened;
  const total = meta.totalFrames;
  // Auto-scaled stride: a trace an agent will actually run has to cost seconds regardless of the
  // film's length, so the default lands near TRACE_TARGET_SAMPLES samples. --stride overrides it.
  const stride = args.includes('--stride') ? STRIDE : Math.max(1, Math.round(total / TRACE_TARGET_SAMPLES));
  const t0 = Date.now();
  const series = await captureSeries(page, total, stride, idsByIdxOf(data));
  await page.close();
  const renderMs = Date.now() - t0;

  const K = series.keys, LOOP = series.loop;
  const content = K.map((k, i) => !INFRA.has(k) && !LOOP[i]);
  const F = series.frames;
  const dt = stride / FPS;
  const layers = [];
  K.forEach((k, i) => {
    if (!content[i] || series.live[i] === 0) return; // chrome, a loop-exempt layer, or never on screen
    layers.push({ key: k, samples: series.live[i], ...layerTrace(series.rows[i], F, dt) });
  });
  return {
    format, data: dataName, total, fps: FPS, strideFrames: stride,
    sampleIntervalMs: Math.round(dt * 1000), samples: F.length, durationSec: +(total / FPS).toFixed(2),
    renderMs, layers, candidates: dragCandidates(layers),
  };
}

function fmtSpans(spans) {
  const shown = spans.slice(0, 8).map((s) => `${s.state} ${s.from}-${s.to}s`);
  return shown.join(' → ') + (spans.length > 8 ? ` … +${spans.length - 8} more` : '');
}

if (TRACE) {
  const results = [];
  for (const f of formats) for (const d of DATA_LIST) {
    try { results.push(await traceOf(f, d)); }
    catch (e) { results.push({ format: f, data: d, error: String(e && e.message || e) }); }
  }
  await browser.close(); server.close();
  if (JSON_OUT) { emitJson(results); }
  else {
    console.log('==================== MOTION TRACE ====================');
    for (const r of results) {
      if (r.error) { console.log(`✗ err  ${r.format}: ${r.error}`); continue; }
      console.log(`${r.format} · ${r.data}  (${r.durationSec}s · ${r.total} frames · sampled every `
        + `${r.strideFrames} frame(s) = ${r.sampleIntervalMs}ms · ${r.samples} samples · ${r.renderMs}ms to trace)`);
      if (!r.layers.length) console.log('    no tracked content elements (nothing in this scene carries `data-start`)');
      for (const L of r.layers) {
        console.log(`    ${L.key}: ${fmtSpans(L.spans)}`);
        console.log(`        peak ${L.peakVelocity}px/s @${L.peakVelocityAt}s · peak area Δ${L.peakAreaChangePct}% @${L.peakAreaChangeAt}s · shape=${L.shape}`);
      }
      if (r.candidates && r.candidates.length) {
        console.log('    candidates:');
        for (const c of r.candidates) console.log(`      - ${c}`);
      }
    }
    console.log('\nAn instrument, not a gate: no pass/fail, nothing here blocks. Read the spans and the shape.');
  }
  process.exit(0);
}

const results = [];
for (const f of formats) for (const d of DATA_LIST) {
  try { results.push(await audit(f, d)); }
  catch (e) { results.push({ format: f, data: d, error: String(e && e.message || e), findings: [] }); }
}
await browser.close(); server.close();

if (JSON_OUT) { emitJson(results); }
else {
  console.log('==================== MOTION AUDIT ====================');
  for (const r of results) {
    if (r.error) { console.log(`✗ err  ${r.format}: ${r.error}`); continue; }
    const fails = r.findings.filter((x) => x.level === 'FAIL'), warns = r.findings.filter((x) => x.level === 'WARN');
    // name the data file audited: `make motion D=...` used to drop D and silently audit sample.json,
    // and the report gave no way to tell which scene you were reading (MISTAKES #47).
    console.log(`${fails.length ? '✗ FAIL' : warns.length ? '~ warn' : '✓ ok  '}  ${r.format} · ${r.data}  (${r.total} frames · ${r.segments} segments · ${fails.length} fail · ${warns.length} warn)`);
    console.log(`    windows: ${r.windowSource}`);
    if (FAIL_LEVEL === 'WARN') {
      const set = r.findings.filter((x) => x.would === 'FAIL');
      if (set.length) console.log(`      ${set.length} finding(s) below are FAIL-tier clauses, reported not enforced `
        + `(MOTION_TIER=enforce to block): ${[...new Set(set.map((x) => x.check))].join(', ')}`);
    }
    const show = [...fails, ...warns];
    for (const x of show.slice(0, 30)) console.log(`    [${x.level === 'FAIL' ? x.check : x.check + ' · warn'}] ${x.seg || ''}${x.key ? ' "' + x.key + '"' : ''}, ${x.msg}`);
    if (show.length > 30) console.log(`    … +${show.length - 30} more`);
  }
}
const failed = results.some((r) => r.error || r.findings.some((x) => x.level === 'FAIL'));
// Under --json the verdict goes to stderr: stdout is the machine-readable channel, and appending a
// prose line to it made the documented flag emit something no consumer could parse.
const say = JSON_OUT ? console.error : console.log;
if (failed) { say('\n✗ motion audit found hard failures'); process.exit(1); }
// The exit-3 "cannot check" verdict is GONE, and that is the whole point of this change. It existed
// because windows came from `meta.segments`, a field no scene has ever set, so the FAIL tier was scored
// against a guessed window and had to be set aside. Windows now come from the film's own cuts and
// seams, so there is nothing left to be blind about.
say(FAIL_LEVEL === 'FAIL'
  ? '\n✓ motion contract holds across all checked formats'
  : '\n✓ no hard failures, FAIL-tier clauses are REPORTED at this tier, not enforced (MOTION_TIER=enforce)');
process.exit(0);
