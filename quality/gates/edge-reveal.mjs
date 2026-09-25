// quality/gates/edge-reveal.mjs: the sampler for the `edge-reveal` finding, ONE owner for "does a
// full-bleed layer stop covering the frame while it is on screen".
//
// WHY A DOM HIT-TEST, NOT MORE PROJECTION MATH. core/tracks/overscan.js already carries the real
// projection math (coverScale/isFullBleedPlane) and core/tracks/motion.js already applies it every
// frame a layer keys 3D. Re-deriving "is this pixel covered" from the same corner-projection formula a
// second time is exactly the two-owners-of-one-fact shape AGENTS.md warns about, and it would still
// miss the cases overscan does not gate on: a flat camera `s` below 1 (no `has3D`), and a border-radius
// clip (no projection at all). `document.elementsFromPoint` asks the browser the one question that
// covers all three causes at once, using the SAME transform/clip stack the render actually painted:
// is ANYTHING opaque and meant-to-be-the-background under this pixel. So this file owns SAMPLING; the
// cause named in a finding is read back off the state (camera transform, layer transform, radius), not
// computed a second time.
//
// "MEANT TO FILL THE FRAME" = core/tracks/overscan.js's own `isFullBleedPlane`, evaluated against each
// layer's AT-REST (untransformed) box, so a card that never claimed to be the background is untouched.
// The at-rest box is read as the cumulative CSS *layout* box (offsetLeft/Top/Width/Height walked up the
// offsetParent chain): `transform` never touches those, whatever the layer's own motion track does to
// it, so this is the same "before any tilt" box overscan.js's own header describes.
import fs from 'node:fs';
import path from 'node:path';
import { serveRepo, launchPage, waitForEngine, bootPathFor, REPO_ROOT } from '../../harness/lib/render-harness.mjs';

const RATE_S = 0.1;      // 10fps of FILM time, the sampling rate the doctrine asked for
const INSET_PX = 2;      // how far in from each edge a border sample point sits
const OPAQUE_MIN = 0.85; // a candidate below this cumulative opacity cannot be relied on to cover another

// The in-page probe. Runs once per sampled frame, after renderFrame(n) has settled the DOM. No modules,
// no closures over the outer scope: page.evaluate serialises this to a string and runs it cold in the
// page, so everything it needs is passed in as an argument.
/* eslint-disable no-undef */
function pageProbe(W, H, inset, opaqueMin) {
  function cumulativeOpacity(el) {
    let o = 1, n = el;
    while (n && n.nodeType === 1) {
      const cs = getComputedStyle(n);
      if (cs.visibility === 'hidden' || cs.display === 'none') return 0;
      const op = parseFloat(cs.opacity);
      if (!Number.isNaN(op)) o *= op;
      n = n.parentElement;
    }
    return o;
  }
  function cumulativeOffset(el) {
    let x = 0, y = 0, n = el;
    while (n) { x += n.offsetLeft || 0; y += n.offsetTop || 0; n = n.offsetParent; }
    return { x, y };
  }
  // localScale(cssTransform): the transform's own x-axis scale, from matrix()/matrix3d()/'none'. A
  // page.evaluate function runs cold in the browser with no closure over this module's own
  // matrixScale export, so this is a second, deliberately tiny copy of the same one-line formula.
  function localScale(cssTransform) {
    if (!cssTransform || cssTransform === 'none') return 1;
    const m = cssTransform.match(/matrix(3d)?\(([^)]+)\)/);
    if (!m) return 1;
    const v = m[2].split(',').map(Number);
    return m[1] ? Math.hypot(v[0], v[1], v[2]) : Math.hypot(v[0], v[1]);
  }
  // canvasCoversPoint(p): does the engine's own painted background (`$('cv')`, core/backgrounds/
  // presets.js) have an opaque pixel at this point? Asked pixel-for-pixel rather than assumed, since
  // not every preset paints edge-to-edge.
  function canvasCoversPoint(p, stack) {
    const cv = document.getElementById('cv');
    if (!cv || !stack.includes(cv)) return false;
    const sx = cv.width / cv.clientWidth, sy = cv.height / cv.clientHeight;
    const ctx = cv.getContext('2d');
    const px = ctx && ctx.getImageData(Math.min(cv.width - 1, Math.floor(p.x * sx)), Math.min(cv.height - 1, Math.floor(p.y * sy)), 1, 1).data;
    return !!px && px[3] > 250;
  }
  const els = Array.from(document.querySelectorAll('.hs-layer'));
  const layers = els.map((el, idx) => {
    const { x, y } = cumulativeOffset(el);
    const w = el.offsetWidth, h = el.offsetHeight;
    const fullBleed = w > 0 && h > 0 && x <= 0.5 && y <= 0.5 && x + w >= W - 0.5 && y + h >= H - 0.5;
    return { idx, id: el.dataset.id || el.id || null, el, fullBleed, opacity: cumulativeOpacity(el) };
  });
  // FULLY ENTERED, not merely on screen. A layer mid first-frame-clip entrance (opacity ramping, or its
  // resolved box still mid-transition) is not yet claiming the frame; testing it there is testing the
  // entrance, not the beat. Gate on the same opaqueMin used to judge "does THIS cover another point": a
  // layer below it is not yet a candidate ground either.
  const candidates = layers.filter((L) => L.fullBleed && L.opacity > opaqueMin);
  if (!candidates.length) return { gaps: [], camTf: null, states: [] };

  // 16-ish points along the four borders, 2px inset, corners included (where a border-radius clip
  // shows first).
  const xs = [inset, W / 3, (2 * W) / 3, W - inset];
  const ys = [inset, H / 3, (2 * H) / 3, H - inset];
  const pts = [];
  for (const x of xs) { pts.push({ x, y: inset, border: 'top' }); pts.push({ x, y: H - inset, border: 'bottom' }); }
  for (const y of ys) { pts.push({ x: inset, y, border: 'left' }); pts.push({ x: W - inset, y, border: 'right' }); }

  const gaps = [];
  for (const L of candidates) {
    for (const p of pts) {
      const stack = document.elementsFromPoint(p.x, p.y);
      if (stack.includes(L.el)) continue; // this layer itself still covers the point
      const coveredByOther = candidates.some((M) => M !== L && M.opacity > opaqueMin && stack.includes(M.el));
      if (coveredByOther) continue;
      // A layer DELIBERATELY authored down to a floating-panel size (a scale track that never comes
      // back near 1, vawe-flow-2's own "terminal on paper" beat) reveals a real, painted background
      // canvas, not a hole -- excuse it there. A layer whose OWN scale stayed near 1 (the reveal came
      // from the camera, or a tilt/radius clip) gets no such excuse: it was never told to shrink, so an
      // opaque bg behind it is still the defect this check exists to name.
      const ownNearFull = localScale(getComputedStyle(L.el).transform) >= 0.95;
      if (!ownNearFull && canvasCoversPoint(p, stack)) continue;
      gaps.push({ idx: L.idx, id: L.id, border: p.border });
    }
  }
  const cam = document.getElementById('cam');
  const states = candidates.map((L) => ({
    idx: L.idx, id: L.id,
    transform: getComputedStyle(L.el).transform,
    borderRadius: getComputedStyle(L.el).borderRadius,
  }));
  return { gaps, camTf: cam ? getComputedStyle(cam).transform : null, states };
}
/* eslint-enable no-undef */

// matrixScale(cssTransform) -> the transform's own x-axis scale, from matrix()/matrix3d()/'none'.
// Only ever asked of a layer or the camera's OWN transform, so this reads exactly what CSS painted,
// never a re-derivation of the authored `scale` track (which overscan already multiplies by its
// overscan factor before this ever runs).
export function matrixScale(cssTransform) {
  if (!cssTransform || cssTransform === 'none') return 1;
  const nums = cssTransform.match(/matrix(3d)?\(([^)]+)\)/);
  if (!nums) return 1;
  const vals = nums[2].split(',').map(Number);
  return nums[1] ? Math.hypot(vals[0], vals[1], vals[2]) : Math.hypot(vals[0], vals[1]);
}

const hasRadius = (r) => typeof r === 'string' && r.split(' ').some((v) => parseFloat(v) > 0.5);

// causeOf: read the worst frame's state and name ONE likely cause, in the priority the real cases in
// engine-doctrine/MISTAKES.md #626 and this doc's own header list them: a clip beats a scale, a scale beats a
// generic camera read, because a clip or an own-scale is the more specific, more certain answer.
export function causeOf(state, camTf) {
  if (!state) return 'gap detected; no per-frame layer state captured, inspect the frame by hand';
  if (hasRadius(state.borderRadius)) return `border-radius (${state.borderRadius}) clips this full-bleed layer's own corner`;
  const s = matrixScale(state.transform);
  if (s < 0.999) return `the layer itself is scaled to ${s.toFixed(3)}x at this instant`;
  if (/matrix3d/.test(state.transform || '')) return 'the layer is tilted/standing off the picture plane under perspective (check `overscan: false` or a missed 3D key)';
  const camS = matrixScale(camTf);
  if (camS < 0.999) return `the camera is at scale ${camS.toFixed(3)}x (zoomed out below 1) at this instant`;
  if (/matrix3d/.test(camTf || '')) return 'the camera rig is tilted or pulled back under perspective at this instant';
  return 'gap detected; cause not automatically classified, inspect the frame';
}

/**
 * sampleEdgeReveal(scenePath, {rate}) -> [{idx,id,border,frames:[{t,frame,cause}]}]
 * Raw per-(layer,border) hit list, one entry per sampled frame the gap was seen at. Callers merge
 * consecutive frames into ranges; kept apart from that so a test can assert on individual samples.
 */
export async function sampleEdgeReveal(scenePath, { rate = RATE_S } = {}) {
  const { sceneDims } = await import('../../core/layout/safe.js');
  const abs = path.resolve(REPO_ROOT, scenePath);
  const raw = fs.readFileSync(abs, 'utf8');
  const cfg = JSON.parse(raw);
  const rel = path.relative(REPO_ROOT, abs);
  // AGENTS.md: exactly one module, `scene`; the engine shell that boots it always sits at
  // films/scene/scene.html, whatever directory the scene JSON itself is served from (a real film
  // under films/scene/, or a test fixture elsewhere in the repo).
  const m = 'scene';
  const [vw, vh] = sceneDims(cfg, '');

  const { close: closeServer, port } = await serveRepo({});
  const { page, close: closePage } = await launchPage({ width: vw, height: vh });
  const hits = new Map(); // key `${idx}:${id}:${border}` -> {idx,id,border,frames:[]}
  try {
    const bootRel = bootPathFor(REPO_ROOT, raw, cfg, rel);
    await page.goto(`http://127.0.0.1:${port}/films/${m}/scene.html?data=/${bootRel}&fps=30`, { waitUntil: 'load' });
    const err = await waitForEngine(page, { throwOnTimeout: false });
    if (err) throw new Error(`scene did not load: ${err}`);
    const meta = await page.evaluate(() => window.__engine.meta);
    const fps = meta.fps || 30, total = meta.totalFrames, duration = total / fps;

    for (let t = 0; t < duration; t += rate) {
      const tr = +t.toFixed(3);
      const frame = Math.min(total - 1, Math.max(0, Math.round(tr * fps)));
      await page.evaluate((n) => window.__engine.renderFrame(n), frame);
      const { gaps, camTf, states } = await page.evaluate(pageProbe, vw, vh, INSET_PX, OPAQUE_MIN);
      const byIdx = new Map(states.map((s) => [s.idx, s]));
      for (const g of gaps) {
        const key = `${g.idx}:${g.id ?? ''}:${g.border}`;
        if (!hits.has(key)) hits.set(key, { idx: g.idx, id: g.id, border: g.border, frames: [] });
        hits.get(key).frames.push({ t: tr, frame, cause: causeOf(byIdx.get(g.idx), camTf) });
      }
    }
  } finally {
    await closePage();
    closeServer();
  }
  return [...hits.values()];
}

/**
 * toRanges(hits, rate) -> one finding-shaped record per (layer,border) time RANGE, merging frames no
 * more than 1.5x the sample rate apart. `cause` is read off the WORST frame, the one whose layer scale
 * (or camera scale) is furthest under 1, since that is the frame where the gap is widest and the
 * explanation is least ambiguous.
 */
export function toRanges(hits, rate = RATE_S) {
  const out = [];
  for (const h of hits) {
    // DEDUPE BY TIME. A border carries several sample POINTS (top/bottom span W/3 steps); more than one
    // failing at the same instant is still one failing SAMPLE, not extra persistence, or a border that
    // fails wide (many points) would out-count one that fails narrow (one point) for no temporal reason.
    const byT = new Map();
    for (const f of h.frames) if (!byT.has(f.t)) byT.set(f.t, f);
    const frames = [...byT.values()].sort((a, b) => a.t - b.t);
    let run = [];
    const flush = () => {
      // ONE OR TWO samples is not a reveal a viewer sees, and it is exactly the shape of a false
      // positive at an entrance boundary: vawe-flow-2's card-a sampled at the tick just before its
      // resolved clip window opens reads as "not yet covering" for a single 0.1s tick, then the layer
      // is live and correct for the rest of its life (`make probe-frame` confirmed it full-bleed at
      // scale 1 one tick later). Three consecutive samples (>=0.2s of persisted gap) is the floor for
      // "this is a hold a viewer sees", not a boundary artifact.
      if (run.length < 3) { run = []; return; }
      // the "worst" frame: the one whose cause string carries the smallest scale number, else the first.
      const scored = run.map((f) => {
        const m = f.cause.match(/(\d+\.\d+)x/);
        return { f, s: m ? parseFloat(m[1]) : 1 };
      }).sort((a, b) => a.s - b.s);
      const worst = scored[0].f;
      out.push({
        idx: h.idx, id: h.id, border: h.border,
        t0: run[0].t, t1: run[run.length - 1].t + rate,
        cause: worst.cause,
      });
      run = [];
    };
    for (const f of frames) {
      if (run.length && f.t - run[run.length - 1].t > rate * 1.5) flush();
      run.push(f);
    }
    flush();
  }
  return out;
}
