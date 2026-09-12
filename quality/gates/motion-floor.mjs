#!/usr/bin/env node
// quality/gates/motion-floor.mjs: DOES THE FILM EVER STOP, and is what fills the gaps real?
//
//   make motion-floor D=formats/scene/<film>.json   ·   node quality/gates/motion-floor.mjs <film> [--json]
//
// WHY THIS AND NOT THE THREE GATES THAT ALREADY TOUCH MOTION. `direction-floor` counts FAMILIES, so a
// film with four families and six dead seconds passes it. `sweep-static` asks whether the WHOLE film is
// frozen; ours was not. `dead-air` (beat-check) asks whether anything is ON SCREEN; something always
// was. None of them can see a hole, and `internal/scene/scene.go:926` says why in its own comment:
// "48 evenly spaced probes measure velocity at 48 random instants, not motion over time".
//
// Measured on formats/scene/together-recreation.json against the film it recreates: the reference has
// ZERO windows below 0.2 across 19.8s and ours had TEN, including one dead stretch of 2.5 seconds.
//
// ── THE PART THAT MATTERS: THIS CANNOT BE SATISFIED BY ADDING AMBIENT MOTION ────────────────────────
// The obvious way to raise a motion score is to switch on `idle`/`breathe`/`drift` everywhere, which
// buys the number and costs the film: it is motion for the metric, not for the viewer. So the gate does
// not measure motion. It measures LOCAL motion, and reports global motion separately.
//
// The split is measured, not asserted. Across the reference and our recreation, 80% of the change in a
// moving window lives in 3.1% and 3.9% of the frame respectively: both films move by REVEALING CONTENT
// in one small region. A breathe or a drift moves every pixel a little, so its change is spread across
// the whole frame and its concentration is an order of magnitude worse. That difference is the whole
// test, and it is why `idle` is invisible to the floor here: adding it raises `global` and leaves
// `local` exactly where it was, which then trips `ambient-padding` instead.
//
// Requires out/<name>.mp4. Missing or stale render: reported, exit 0, the same contract sweep-static
// keeps, because this is a post-render gate and a caller running it pre-render must not be blocked.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { gateFindings } from '../../harness/lib/findings.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

// Sampled at 30fps because that is the rate `harness/media/study.mjs` reads every reference in
// grammar/ at, and `Stillness()` normalises to. A frame difference is a measurement of the GAP between
// frames, so comparing a 60fps sample to a 30fps reference would report us half as alive as we are.
export const SAMPLE_FPS = 30;
// 96x54 keeps the frame's aspect and gives 5184 cells, so 3% of the frame is ~155 of them: enough
// resolution to tell a word arriving from a whole frame drifting. TILE=32 (sweep-static's) leaves 3%
// as 31 cells, which is inside its own noise.
export const GW = 96, GH = 54;
export const WINDOW_S = 0.5;
// A window is DEAD below this. Not a preference: the reference's own quietest window measures 0.42 on
// this scale and its median is 1.33, so a tenth of its median is comfortably under anything it does.
export const DEAD = 0.13;
// 80% of the change inside this share of the frame means "something arrived here". Above it, the change
// is spread and the motion is ambient. Both real films measured 3-4%; 8% is a wide margin around that.
export const LOCAL_SHARE = 0.08;

// A large uniform region sliding rigidly has the SAME share signature as a reveal: its interior matches
// before/after, so only its edges differ, and that edge sliver is a small share of the frame. Measured
// directly (see the self-test): a 60x34-cell block shifted 3 cells scores share=0.032, amount=4.72,
// which is inside the "content" band by the share test alone. The fix is a second, cheaper test that
// runs ONLY when the share test already said "local": search a small range of whole-frame translations
// and see whether one of them explains the changed pixels. A reveal cannot be explained this way because
// the new content did not exist anywhere in the previous frame to be shifted from.
export const SHIFT_RANGE = 8;      // cells; enough for a half-second pan/push at this window size
export const RIGID_EXPLAIN = 0.5;  // a shift must cut the residual on the changed pixels at least this much
const NOISE_FLOOR = 2;             // grayscale levels; ignores encoder/scale noise, not real change
// How much of the frame the moving thing covers. A rigid shift alone does NOT make motion global:
// a card sliding across a static ground is a rigid shift and it is exactly what content motion
// looks like. What separates it from a camera move is EXTENT. Both change only at their edges, so
// the changed-pixel count cannot tell them apart, but their bounding boxes can: a card's swept box
// is a small part of the frame, a whole-frame slide's box is the frame. Measured on the real
// function: a card sliding 3 cells covers 0.11 of the frame, the whole frame sliding covers 0.95.
export const RIGID_EXTENT = 0.5;   // above this share of the frame, a rigid shift is the camera

// ── KINDS OF MOTION, per spatially separate moving region ─────────────────────────────────────────
// The share/extent split above answers ONE question: is this pair's change local or global. A frame
// can carry several DIFFERENT moving things at once (a card sliding while a headline reveals behind
// it), and choreography is about how many kinds are live together, not just whether something moved.
// So the diff mask is split into connected regions first, and each region is classified on its own:
//   camera  - a coherent shift that takes most of the frame with it (extent >= RIGID_EXTENT, explained
//             by one translation)
//   move    - a bounded region explained by one translation (a card, a window, a line travelling)
//   scale   - a bounded region explained by one radial scale about its own centre (growing/shrinking)
//   reveal  - a bounded region a translation and a scale both fail to explain: new pixels that did not
//             exist anywhere nearby to be shifted or scaled from
//   ambient - a large, diffuse region (extent >= RIGID_EXTENT) no rigid motion explains: a breathe, a
//             drift, a wash, spread rather than arrived
// A region is a run of grid cells above NOISE_FLOOR, 4-connected, so a card and a headline reveal on
// opposite sides of the frame are never merged into one "local" blob the way the share test alone sees
// them (share only ever asks "how concentrated is the change", never "how many concentrations").
export const REGION_SHIFT_RANGE = 6;              // cheaper than the whole-frame search; a region is small
export const SCALE_FACTORS = [0.7, 0.8, 0.9, 1.1, 1.2, 1.3, 1.45]; // radial scale probes about a region's own centre

/** Connected components (4-neighbour) of cells where the frame pair actually changed. */
function componentsOf(d, w, h) {
  const n = d.length;
  const visited = new Uint8Array(n);
  const comps = [];
  for (let i = 0; i < n; i++) {
    if (d[i] <= NOISE_FLOOR || visited[i]) continue;
    const stack = [i]; visited[i] = 1;
    const cells = [];
    while (stack.length) {
      const c = stack.pop();
      cells.push(c);
      const y = (c / w) | 0, x = c - y * w;
      if (x > 0 && !visited[c - 1] && d[c - 1] > NOISE_FLOOR) { visited[c - 1] = 1; stack.push(c - 1); }
      if (x < w - 1 && !visited[c + 1] && d[c + 1] > NOISE_FLOOR) { visited[c + 1] = 1; stack.push(c + 1); }
      if (y > 0 && !visited[c - w] && d[c - w] > NOISE_FLOOR) { visited[c - w] = 1; stack.push(c - w); }
      if (y < h - 1 && !visited[c + w] && d[c + w] > NOISE_FLOOR) { visited[c + w] = 1; stack.push(c + w); }
    }
    comps.push(cells);
  }
  return comps;
}

/** Best whole-region translation cost, tested only on this region's own changed pixels. */
function shiftCostOf(cells, a, b, d, w, h, range) {
  let best = Infinity;
  for (let dy = -range; dy <= range; dy++) {
    for (let dx = -range; dx <= range; dx++) {
      if (dx === 0 && dy === 0) continue;
      let sum = 0;
      for (const i of cells) {
        const y = (i / w) | 0, x = i - y * w;
        const sx = x - dx, sy = y - dy;
        sum += (sx >= 0 && sx < w && sy >= 0 && sy < h) ? Math.abs(a[sy * w + sx] - b[i]) : d[i];
      }
      const cost = sum / cells.length;
      if (cost < best) best = cost;
    }
  }
  return best;
}

/** Best radial-scale cost about (cx,cy), tested only on this region's own changed pixels. */
function scaleCostOf(cells, a, b, d, w, h, cx, cy) {
  let best = Infinity;
  for (const s of SCALE_FACTORS) {
    let sum = 0;
    for (const i of cells) {
      const y = (i / w) | 0, x = i - y * w;
      const sx = Math.round(cx + (x - cx) / s), sy = Math.round(cy + (y - cy) / s);
      sum += (sx >= 0 && sx < w && sy >= 0 && sy < h) ? Math.abs(a[sy * w + sx] - b[i]) : d[i];
    }
    const cost = sum / cells.length;
    if (cost < best) best = cost;
  }
  return best;
}

/**
 * classifyRegions(a, b): one entry per spatially separate moving region between two frames,
 * `{ kind, amount, extent }`. `amount` is the region's share of the total changed signal (sums to 1
 * across the returned list), used to weigh which region is primary. Returns `[]` for identical frames.
 */
export function classifyRegions(a, b, { w = GW, h = GH } = {}) {
  const n = a.length;
  const d = new Uint8Array(n);
  let total = 0;
  for (let i = 0; i < n; i++) { const v = Math.abs(a[i] - b[i]); d[i] = v; total += v; }
  if (total < 1) return [];

  // WHOLE-FRAME RIGID TEST FIRST, on every changed pixel together, before splitting into components.
  // A camera move (or a full-bleed layer sliding) can change ONLY its leading and trailing edges,
  // which land as two separate connected components with no changed pixels between them. Classifying
  // components first would score each edge on its own small extent and miss the one thing that
  // actually moved: the whole frame. Same test rigidExplainRatio runs for pairProfile's share flag.
  const allIdx = [];
  for (let i = 0; i < n; i++) if (d[i] > NOISE_FLOOR) allIdx.push(i);
  if (allIdx.length) {
    let gx0 = w, gx1 = -1, gy0 = h, gy1 = -1;
    for (const i of allIdx) {
      const y = (i / w) | 0, x = i - y * w;
      if (x < gx0) gx0 = x; if (x > gx1) gx1 = x;
      if (y < gy0) gy0 = y; if (y > gy1) gy1 = y;
    }
    const globalExtent = ((gx1 - gx0 + 1) * (gy1 - gy0 + 1)) / (w * h);
    if (globalExtent >= RIGID_EXTENT) {
      const globalRatio = shiftCostOf(allIdx, a, b, d, w, h, SHIFT_RANGE) / (total / allIdx.length);
      // cx/cy: a whole-frame move has no single place the eye is pulled to more than another, so its
      // centroid is the frame's own centre rather than a guess at a direction.
      if (globalRatio <= RIGID_EXPLAIN) return [{ kind: 'camera', amount: 1, extent: globalExtent, cx: 0.5, cy: 0.5 }];
    }
  }

  const comps = componentsOf(d, w, h);
  return comps.map((cells) => {
    let x0 = w, x1 = -1, y0 = h, y1 = -1, amount = 0;
    for (const i of cells) {
      const y = (i / w) | 0, x = i - y * w;
      if (x < x0) x0 = x; if (x > x1) x1 = x;
      if (y < y0) y0 = y; if (y > y1) y1 = y;
      amount += d[i];
    }
    const extent = ((x1 - x0 + 1) * (y1 - y0 + 1)) / (w * h);
    const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
    const cost0 = amount / cells.length;
    const shiftRatio = shiftCostOf(cells, a, b, d, w, h, REGION_SHIFT_RANGE) / cost0;
    let kind;
    if (extent >= RIGID_EXTENT) {
      kind = shiftRatio <= RIGID_EXPLAIN ? 'camera' : 'ambient';
    } else if (shiftRatio <= RIGID_EXPLAIN) {
      kind = 'move';
    } else {
      const scaleRatio = scaleCostOf(cells, a, b, d, w, h, cx, cy) / cost0;
      kind = scaleRatio <= RIGID_EXPLAIN ? 'scale' : 'reveal';
    }
    // cx/cy: this region's own centroid, as a FRACTION of the frame (0..1 each axis), so a caller can
    // bucket it into frame thirds without knowing GW/GH. Where the change actually sits, not just how
    // much of it there is, is what `make choreo`'s eye-plan check reads this for.
    return { kind, amount: amount / total, extent, cx: (x0 + x1) / 2 / w, cy: (y0 + y1) / 2 / h };
  });
}

/**
 * primaryRegionAt(frames, {fps, start, end}) -> {cx, cy} in 0..1, the PRIMARY region's amount-weighted
 * mean centroid across a time window, or `null` when nothing changed. "Primary" is the single
 * largest-amount region of each frame pair, the same definition `profile()`'s own `primaryShare`
 * already uses, so "the primary motion" means the same thing wherever this file reports it.
 */
export function primaryRegionAt(frames, { fps = SAMPLE_FPS, start, end } = {}) {
  const i0 = Math.max(0, Math.round(start * fps));
  const i1 = Math.min(frames.length - 1, Math.round(end * fps));
  let sx = 0, sy = 0, sw = 0;
  for (let i = i0; i < i1; i++) {
    const regions = classifyRegions(frames[i], frames[i + 1]);
    if (!regions.length) continue;
    const primary = regions.reduce((m, r) => (r.amount > m.amount ? r : m), regions[0]);
    sx += primary.cx * primary.amount; sy += primary.cy * primary.amount; sw += primary.amount;
  }
  return sw > 0 ? { cx: sx / sw, cy: sy / sw } : null;
}

/** One pass of ffmpeg, the whole film as grayscale cells. One call, not one call per frame. */
export function pullFrames(mp4, { fps = SAMPLE_FPS, w = GW, h = GH } = {}) {
  const r = spawnSync('ffmpeg', ['-v', 'error', '-i', mp4, '-vf', `fps=${fps},scale=${w}:${h},format=gray`,
    '-f', 'rawvideo', '-pix_fmt', 'gray', '-'], { maxBuffer: 1 << 28 });
  const buf = r.stdout;
  if (!buf || buf.length < w * h * 2) return null;
  const n = Math.floor(buf.length / (w * h));
  return Array.from({ length: n }, (_, i) => buf.subarray(i * w * h, (i + 1) * w * h));
}

/**
 * Does a single whole-frame translation explain the pixels that changed? Tested only against the
 * pixels that actually changed (not the whole frame): a flat background matches itself at ANY shift,
 * so scoring the full frame lets an unrelated shift look like a fit for free. Restricting to the
 * changed set removes that: a reveal's new pixels do not exist anywhere in `a`, so no shift helps them
 * and the ratio stays at 1; a rigid slide's edge pixels are exactly `a` read from `dx,dy` away, so the
 * true shift drives the ratio to ~0.
 * Returns the ratio of best-shift residual to the zero-shift residual on that same pixel set (1 = no
 * shift helps, 0 = a shift fully explains it).
 */
export function rigidExplainRatio(a, b, d, total, w, h, range) {
  const idx = [];
  for (let i = 0; i < d.length; i++) if (d[i] > NOISE_FLOOR) idx.push(i);
  if (idx.length === 0) return { ratio: 1, extent: 0 };
  // the bounding box of everything that changed, as a share of the frame
  let x0 = w, x1 = -1, y0 = h, y1 = -1;
  for (const i of idx) {
    const y = (i / w) | 0, x = i - y * w;
    if (x < x0) x0 = x; if (x > x1) x1 = x;
    if (y < y0) y0 = y; if (y > y1) y1 = y;
  }
  const extent = ((x1 - x0 + 1) * (y1 - y0 + 1)) / (w * h);
  const cost0 = total / idx.length;
  let best = cost0;
  for (let dy = -range; dy <= range; dy++) {
    for (let dx = -range; dx <= range; dx++) {
      if (dx === 0 && dy === 0) continue;
      let sum = 0;
      for (const i of idx) {
        const y = (i / w) | 0, x = i - y * w;
        const sx = x - dx, sy = y - dy;
        // out of range: this pixel isn't tested under this shift, so it keeps its own unexplained diff
        sum += (sx >= 0 && sx < w && sy >= 0 && sy < h) ? Math.abs(a[sy * w + sx] - b[i]) : d[i];
      }
      const cost = sum / idx.length;
      if (cost < best) best = cost;
    }
  }
  return { ratio: best / cost0, extent };
}

/**
 * For one consecutive pair: the mean absolute change, and what share of the frame carries 80% of it.
 * Returns { amount, share }. `share` is the locality: small means content arrived, large means drift.
 * A share that looks local is downgraded to global (share forced to 1) when a rigid whole-frame shift
 * explains the change: that is camera or frame motion wearing a reveal's signature.
 */
export function pairProfile(a, b, { w = GW, h = GH } = {}) {
  const n = a.length;
  const d = new Uint8Array(n);
  let total = 0;
  for (let i = 0; i < n; i++) { const v = Math.abs(a[i] - b[i]); d[i] = v; total += v; }
  const amount = total / n;
  if (total < 1) return { amount, share: 1 };
  const sorted = Array.from(d).sort((x, y) => y - x);
  let run = 0, k = 0;
  for (const v of sorted) { run += v; k++; if (run >= total * 0.8) break; }
  const share = k / n;
  if (share <= LOCAL_SHARE) {
    // A rigid shift is only the CAMERA when it takes most of the frame with it. A bounded object
    // travelling across a static ground is also a rigid shift, and it is the thing we are trying to
    // measure, not the thing we are trying to reject.
    const { ratio, extent } = rigidExplainRatio(a, b, d, total, w, h, SHIFT_RANGE);
    if (ratio <= RIGID_EXPLAIN && extent >= RIGID_EXTENT) return { amount, share: 1 };
  }
  return { amount, share };
}

/**
 * Per-window: local motion (content arriving) and global motion (ambience), kept apart, PLUS the kinds
 * of motion live in the window. `kinds` is every kind seen (camera/move/scale/reveal/ambient), ranked
 * by how much of the window's total change each carries; `regionCount` is the mean number of separate
 * moving regions per frame pair; `primaryShare` is the mean share of the change the single biggest
 * region carries, i.e. how much one thing dominates versus several things moving at once.
 */
export function profile(frames, { fps = SAMPLE_FPS, windowS = WINDOW_S } = {}) {
  const per = Math.max(1, Math.round(fps * windowS));
  const out = [];
  for (let w = 0; w + per < frames.length; w += per) {
    let local = 0, global = 0, n = 0;
    const kindTotal = new Map();
    let regionSum = 0, primarySum = 0, pairsWithChange = 0;
    for (let i = w; i < w + per && i + 1 < frames.length; i++) {
      const { amount, share } = pairProfile(frames[i], frames[i + 1]);
      if (share <= LOCAL_SHARE) local += amount; else global += amount;
      n++;
      const regions = classifyRegions(frames[i], frames[i + 1]);
      if (regions.length) {
        regionSum += regions.length;
        pairsWithChange++;
        let maxAmount = 0;
        for (const r of regions) {
          kindTotal.set(r.kind, (kindTotal.get(r.kind) || 0) + r.amount);
          if (r.amount > maxAmount) maxAmount = r.amount;
        }
        primarySum += maxAmount; // r.amount is already a share of that pair's total change
      }
    }
    const kinds = [...kindTotal.entries()].sort((x, y) => y[1] - x[1]).map(([k]) => k);
    out.push({
      t: +(w / fps).toFixed(2), local: +(local / n).toFixed(3), global: +(global / n).toFixed(3),
      kinds, regionCount: pairsWithChange ? +(regionSum / pairsWithChange).toFixed(2) : 0,
      primaryShare: pairsWithChange ? +(primarySum / pairsWithChange).toFixed(2) : 0,
    });
  }
  return out;
}

/**
 * typingWindows(storyboardText) -> [{t0, t1}], one per beat that DECLARES a typed or word/letter-
 * stagger reveal: its own `- motion:` line names a `[data-part="…word…"]`/`…letter…`/`…char…` split
 * unit, or its body mentions `typing` outright (the `L.typing` char-by-char layer). A beat like this
 * can sit under DEAD for a whole window (the reveal is a caret ticking one character at a time, not a
 * block of pixels arriving at once) without the film actually having stopped, so `dead-window` needs
 * to know which windows this is true for BEFORE deciding whether they are really dead.
 */
export function typingWindows(text) {
  const heads = [...text.matchAll(/^##\s*Beat\s+\d+[^\n(]*\(([\d.]+)s-([\d.]+)s\)/gm)];
  const windows = [];
  for (let i = 0; i < heads.length; i++) {
    const m = heads[i];
    const start = m.index + m[0].length;
    const end = i + 1 < heads.length ? heads[i + 1].index : text.length;
    const body = text.slice(start, end);
    const motionLine = /^- motion:\s*(.+)$/m.exec(body);
    const wordSplit = motionLine && /data-part="[^"]*(word|letter|char)[^"]*"/i.test(motionLine[1]);
    if (wordSplit || /\btyping\b/i.test(body)) windows.push({ t0: +m[1], t1: +m[2] });
  }
  return windows;
}

const overlapsAny = (t0, t1, ranges) => ranges.some((r) => t0 < r.t1 && t1 > r.t0);

/**
 * samplePre(scenePath) -> Uint8Array(GW*GH)[], one frame per WINDOW_S seconds, taken from
 * renderFrame(n) through harness/lib/frame-sampler.mjs rather than a decoded out/<film>.mp4. Feeding
 * this straight into profile() with fps=1/WINDOW_S, windowS=WINDOW_S makes each pair of consecutive
 * samples exactly one window's before/after, the coarsest read that still reuses the same local/
 * global classifier the post-render path uses, rather than a second implementation of it.
 */
export async function samplePre(scenePath) {
  const { sampleScene, downsampleGray } = await import('../../harness/lib/frame-sampler.mjs');
  const { samples } = await sampleScene(scenePath, { rate: WINDOW_S, measure: (img) => downsampleGray(img, GW, GH) });
  return samples.map((s) => s.img);
}

// ── the CLI. Guarded, so importing this module for a test does not run the gate and exit. The
// self-test lives INSIDE this guard for the same reason: it used to sit at module scope, so any
// script that imported this file while its own `--self-test` flag was on process.argv ran THIS
// gate's self-test and exited before its own code began. harness/dev/motion-lab.mjs hit exactly
// that and had to hide the flag around the import. A guard that covers only half a file is not
// a guard.
if (import.meta.url === `file://${process.argv[1]}`) {
  if (process.argv.includes('--self-test')) {
    const flat = new Uint8Array(GW * GH).fill(120);
    const drift = Uint8Array.from(flat, (v) => v + 3);                       // every cell moves a little
    const reveal = Uint8Array.from(flat); for (let i = 0; i < 90; i++) reveal[i] = 250;  // one small region
    const d = pairProfile(flat, drift), r = pairProfile(flat, reveal);
    if (!(d.share > LOCAL_SHARE)) { console.error(`a whole-frame drift must NOT read as local (share ${d.share})`); process.exit(1); }
    if (!(r.share <= LOCAL_SHARE)) { console.error(`a small reveal must read as local (share ${r.share})`); process.exit(1); }
    if (!(pairProfile(flat, flat).amount === 0)) { console.error('two identical frames must measure zero'); process.exit(1); }

    // THE CASE THAT FAILED IN A REAL FILM: a full-bleed layer sliding, so the whole picture moves and
    // the canvas edge is exposed. Interior unchanged, only the leading and trailing edges differ, which the
    // share test alone reads as local content. This fixture is deliberately the WHOLE frame and not a large
    // block: a large block is still a design element, and rejecting one would reject the card-travelling
    // case below with it.
    const block = (shiftX) => {
      const f = new Uint8Array(GW * GH).fill(80);
      for (let y = 1; y < GH - 1; y++) for (let x = 1 + shiftX; x < GW - 1 + shiftX; x++) if (x >= 0 && x < GW) f[y * GW + x] = 200;
      return f;
    };
    const slide = pairProfile(block(0), block(3));
    if (!(slide.share > LOCAL_SHARE)) { console.error(`a rigid block slide must NOT read as local content (share ${slide.share})`); process.exit(1); }

    // THE CASE THE FIRST FIX BROKE. A bounded object travelling across a static ground is also a rigid
    // shift, and it is the reference film's core vocabulary: a card sliding in IS content arriving. The
    // first version of the rigid test rejected it along with the camera, which would have taught authors
    // to avoid the one device that works. Extent is what separates them: this card's swept box is a small
    // part of the frame, the block above takes most of it.
    const card = (shiftX) => {
      const f = new Uint8Array(GW * GH).fill(240);
      for (let y = 18; y < 36; y++) for (let x = 30 + shiftX; x < 58 + shiftX; x++) if (x >= 0 && x < GW) f[y * GW + x] = 40;
      return f;
    };
    const travel = pairProfile(card(0), card(3));
    if (!(travel.share <= LOCAL_SHARE)) { console.error(`a bounded object travelling must read as local content (share ${travel.share})`); process.exit(1); }

    // KIND fixtures: one clean case per kind, reusing the frames above where they already fit.
    const kindOf = (a, b) => { const rs = classifyRegions(a, b); return rs.sort((x, y) => y.amount - x.amount)[0]?.kind; };
    if (kindOf(block(0), block(3)) !== 'camera') { console.error(`a whole-frame rigid slide must classify as camera (got ${kindOf(block(0), block(3))})`); process.exit(1); }
    if (kindOf(card(0), card(3)) !== 'move') { console.error(`a bounded object translating must classify as move (got ${kindOf(card(0), card(3))})`); process.exit(1); }
    if (kindOf(flat, reveal) !== 'reveal') { console.error(`a small appearing region must classify as reveal (got ${kindOf(flat, reveal)})`); process.exit(1); }
    if (kindOf(flat, drift) !== 'ambient') { console.error(`a whole-frame low-amplitude drift must classify as ambient (got ${kindOf(flat, drift)})`); process.exit(1); }
    const square = (half) => {
      const f = new Uint8Array(GW * GH).fill(240);
      for (let y = 27 - half; y < 27 + half; y++) for (let x = 48 - half; x < 48 + half; x++) f[y * GW + x] = 40;
      return f;
    };
    if (kindOf(square(6), square(10)) !== 'scale') { console.error(`a region growing about its own centre must classify as scale (got ${kindOf(square(6), square(10))})`); process.exit(1); }

    // primaryRegionAt: the same square-growing-about-its-centre fixture as the `scale` kind above,
    // held for several frames so a window has more than one pair to average across. Its centre sits at
    // grid (48,27) of a 96x54 grid, i.e. (0.5, 0.5): the KNOWN-ANSWER fixture `make choreo`'s eye-plan
    // check is built against, so a beat whose primary motion truly ends centred reads as centred here
    // before that gate ever compares it to a plan.
    const growing = [square(4), square(6), square(8), square(10)];
    const centred = primaryRegionAt(growing, { fps: 1, start: 0, end: 3 });
    if (!centred || Math.abs(centred.cx - 0.5) > 0.05 || Math.abs(centred.cy - 0.5) > 0.05) {
      console.error(`primaryRegionAt must centre a region growing about the frame's own centre (got ${JSON.stringify(centred)})`); process.exit(1);
    }
    // the SAME fixture, this time OFF-CENTRE (near the frame's top-left), so the fixture pair proves
    // the function reads WHERE as well as WHETHER: a beat whose plan says "lands centre" and whose
    // primary motion actually ends top-left must read as MISSED, not as a coincidental pass.
    const cornerSquare = (half) => {
      const f = new Uint8Array(GW * GH).fill(240);
      for (let y = 8 - half; y < 8 + half; y++) for (let x = 12 - half; x < 12 + half; x++) if (x >= 0 && y >= 0) f[y * GW + x] = 40;
      return f;
    };
    const cornerGrowing = [cornerSquare(4), cornerSquare(6), cornerSquare(8)];
    const cornered = primaryRegionAt(cornerGrowing, { fps: 1, start: 0, end: 2 });
    if (!cornered || cornered.cx >= 1 / 3 || cornered.cy >= 1 / 3) {
      console.error(`primaryRegionAt must land a top-left-growing region in the top-left third (got ${JSON.stringify(cornered)})`); process.exit(1);
    }
    // two identical frames: no change, so no primary region at all, never a guessed centroid.
    if (primaryRegionAt([flat, flat], { fps: 1, start: 0, end: 1 }) !== null) {
      console.error('primaryRegionAt must return null when nothing changed, never a guessed centroid'); process.exit(1);
    }

    // typingWindows: a beat whose motion line names a "-word" split unit declares text arrival; a
    // beat with an ordinary fadeUp on a non-split part does not, so a real dead window under IT still
    // fails. Both fixtures below reuse vawe-flow-2's own beat 2/3 shape.
    const sbTyped = `## Beat 2: Install (1.2s-2.7s)\n- motion: [data-part="install-word"]@fadeUp:energy\n`
      + `## Beat 9: Static card (2.7s-4.0s)\n- motion: [data-part="card"]@fadeUp:energy\n`;
    const tw = typingWindows(sbTyped);
    if (tw.length !== 1 || tw[0].t0 !== 1.2 || tw[0].t1 !== 2.7) {
      console.error(`typingWindows must find only the word-split beat's own window, got ${JSON.stringify(tw)}`); process.exit(1);
    }
    if (!overlapsAny(1.5, 2.0, tw)) { console.error('overlapsAny must see a window inside a declared typing range'); process.exit(1); }
    if (overlapsAny(2.8, 3.3, tw)) { console.error('overlapsAny must NOT see a window in the undeclared beat as typing-covered'); process.exit(1); }

    console.log('  ✓ motion-floor self-test: a drift reads global, a reveal reads local, stillness reads zero,');
    console.log('    a whole-frame slide reads global, a bounded object travelling reads local, the five');
    console.log('    kinds (camera/move/scale/reveal/ambient) each classify their own clean fixture,');
    console.log('    primaryRegionAt centres a centred fixture and corners a cornered one, and');
    console.log('    typingWindows finds only the beat that actually declares a word-split reveal');
    process.exit(0);
  }

  const arg = process.argv.slice(2).find((a) => !a.startsWith('--')) || process.env.D;
  if (!arg) { console.error('usage: make motion-floor D=formats/scene/<film>.json [--pre]'); process.exit(2); }
  const base = String(arg).replace(/\.json$/, '');
  const slug = path.basename(base);
  const pre = process.argv.includes('--pre');
  const mp4 = path.join(ROOT, 'out', slug + '.mp4');

  const sbPath = [base + '.storyboard.md', path.join(ROOT, 'formats/scene', slug + '.storyboard.md')]
    .map((f) => path.resolve(ROOT, f)).find((f) => fs.existsSync(f));
  const storyboard = sbPath ? fs.readFileSync(sbPath, 'utf8') : '';
  const typingRanges = typingWindows(storyboard);

  // THE PART THAT CANNOT BE SATISFIED BY A REFERENCE COMPARISON. `--pre` samples renderFrame at
  // WINDOW_S-second centres, which is a coarser clock than the mp4 path's 30fps decode; comparing that
  // against a reference profiled at 30fps would blame a resolution mismatch on the film. So `--pre`
  // answers "does the film ever stop" only, and leaves the floor-below-reference / median-below-
  // reference checks to the mp4 path, exactly as the plan asked.
  let frames, ref = null, refName = null;
  if (pre) {
    frames = await samplePre(base + '.json');
  } else {
    if (!fs.existsSync(mp4)) { console.log(`  motion-floor: no render at out/${slug}.mp4 yet, so there are no pixels to read. Render first.`); process.exit(0); }
    frames = pullFrames(mp4);
    if (!frames) { console.log('  motion-floor: ffmpeg returned no frames; skipped rather than guessed.'); process.exit(0); }
    const m = /^reference\s*:\s*["']?([\w.-]+)/mi.exec(storyboard);
    if (m) {
      refName = m[1];
      const refMp4 = ['refs/' + refName + '.mp4', 'refs/' + refName + '/' + refName + '.mp4']
        .map((f) => path.join(ROOT, f)).find((f) => fs.existsSync(f));
      if (refMp4) { const rf = pullFrames(refMp4); if (rf) ref = profile(rf); }
    }
  }
  const prof = pre ? profile(frames, { fps: 1 / WINDOW_S, windowS: WINDOW_S }) : profile(frames);

  const gf = gateFindings();
  const errs = [], warns = [], adapted = [];
  const fail = (c, m) => { errs.push(m); gf.fail(c, m); };
  const warn = (c, m) => { warns.push(m); gf.warn(c, m); };
  const adapt = (c, m) => { adapted.push(m); gf.note(c, m); };

  // The last window is the outro: a film is allowed to stop at its end, and the reference does.
  const body = prof.slice(0, -2);
  const deadAll = body.filter((w) => w.local < DEAD);
  const localMed = [...body.map((w) => w.local)].sort((a, b) => a - b)[Math.floor(body.length / 2)] || 0;
  const globalMed = [...body.map((w) => w.global)].sort((a, b) => a - b)[Math.floor(body.length / 2)] || 0;

  // A window that reads dead by pixel share is not necessarily a stopped film: a typed line or a
  // word/letter stagger reveals its content a few pixels at a time (one caret-width per tick), which
  // can sit under DEAD for a whole window without the beat having actually stopped. `typingWindows`
  // reads that declaration off the storyboard's own `- motion:` line, so a window is only spared when
  // the PLAN says text is arriving there, never on the gate's own say-so.
  const dead = deadAll.filter((w) => !overlapsAny(w.t, w.t + WINDOW_S, typingRanges));
  const typingDead = deadAll.filter((w) => overlapsAny(w.t, w.t + WINDOW_S, typingRanges));

  if (typingDead.length) {
    adapt('dead-window', `dead-window: ${typingDead.length} window(s) at `
      + `${typingDead.map((w) => w.t + 's').join(', ')} read as no content motion by pixel share, but the `
      + 'storyboard declares a typed/word-stagger reveal there, which arrives a few pixels at a time. '
      + 'Scored as text arrival, not pixels: not a defect.');
  }
  if (dead.length) {
    fail('dead-window', `${dead.length} of ${body.length} windows carry no content motion at all `
      + `(under ${DEAD} local, at ${dead.slice(0, 6).map((w) => w.t + 's').join(', ')}${dead.length > 6 ? ' …' : ''}). `
      + 'A reveal finished and nothing took over. Two things fix this and they were measured, not guessed. '
      + 'SPREAD the moves in a beat so one is always arriving: firing four at once measured 80% of windows '
      + 'dead, the same four spaced sequentially measured 60%. And make each move BIGGER: raising the count '
      + 'from one to eight per beat cut dead windows from 86% to 57% but never moved the median off 0.02, '
      + 'because a 24px reveal that lands inside one window cannot add up to a large one however many you '
      + 'stack. Adding `idle` raises `global` and leaves this finding exactly where it is.');
  }
  if (ref) {
    const rb = ref.slice(0, -2);
    const rFloor = Math.min(...rb.map((w) => w.local));
    const rMed = [...rb.map((w) => w.local)].sort((a, b) => a - b)[Math.floor(rb.length / 2)];
    const ourFloor = Math.min(...body.map((w) => w.local));
    if (ourFloor < rFloor * 0.8) {
      fail('floor-below-reference', `this film's quietest window is ${ourFloor.toFixed(2)} and ${refName}'s is `
        + `${rFloor.toFixed(2)}. Its floor is the thing that makes it read as continuous.`);
    }
    if (localMed < rMed * 0.6) {
      warn('median-below-reference', `local motion median ${localMed.toFixed(2)} against ${refName}'s ${rMed.toFixed(2)}.`);
    }
  }
  // THE LIMIT OF THE SPLIT, said out loud rather than hidden. "Local" means change concentrated in a
  // small region, which correlates with a reveal but is NOT the same thing as content: a large object
  // TRAVELLING is content too, and it changes a large area, so it lands in `global` beside the ambience
  // it was meant to be told apart from. Measured here: pushing this film's scales up to the reference's
  // magnitude raised the renderer's own whole-frame motion from 0.09 to 0.28 and put that gain in
  // `global`. So `ambient-padding` cannot fire on pixels alone without accusing a legitimate camera
  // move of being wallpaper. It is grounded in the JSON instead: it fires only when the scene actually
  // DECLARES an idle, which is the thing it exists to refuse. `dead-window` above needs no such guard,
  // because a beat with no small-region change has nothing arriving in it however much it is moving.
  const declaresIdle = (() => {
    try {
      const d = JSON.parse(fs.readFileSync(path.resolve(ROOT, base + '.json'), 'utf8'));
      const has = (L) => L && L.idle != null && L.idle !== 'none' && L.idle !== false;
      return has(d) || (Array.isArray(d.layers) && d.layers.some(has));
    } catch { return false; }
  })();
  if (declaresIdle && globalMed > localMed && globalMed > 0.2) {
    fail('ambient-padding', `global (whole-frame) motion ${globalMed.toFixed(2)} now exceeds local (content) motion `
      + `${localMed.toFixed(2)}. Something is drifting or breathing more than anything is happening. Ambient motion `
      + 'is not a substitute for a reveal, and this gate will not accept it as one.');
  }

  if (process.argv.includes('--json')) { console.log(JSON.stringify({ prof, errs, warns, adapted, pre }, null, 2)); process.exit(errs.length ? 1 : 0); }
  console.log(`\n  motion-floor · ${slug} · ${body.length} windows of ${WINDOW_S}s${pre ? ' · --pre (renderFrame, no mp4)' : ''}${refName ? ` · vs ${refName}` : ''}`);
  console.log(`    local (content)  median ${localMed.toFixed(2)}  floor ${Math.min(...body.map((w) => w.local)).toFixed(2)}  peak ${Math.max(...body.map((w) => w.local)).toFixed(2)}`);
  console.log(`    global (ambient) median ${globalMed.toFixed(2)}`);
  if (ref) {
    const rb = ref.slice(0, -2);
    console.log(`    ${refName}: local median ${([...rb.map((w) => w.local)].sort((a, b) => a - b)[Math.floor(rb.length / 2)]).toFixed(2)}  floor ${Math.min(...rb.map((w) => w.local)).toFixed(2)}`);
  }
  for (const m of errs) console.log(`    ✗ ${m}`);
  for (const m of warns) console.log(`    ~ ${m}`);
  for (const m of adapted) console.log(`    · adapted ${m}`);
  if (!errs.length && !warns.length) console.log('    ✓ the film never stops, and what fills it is content\n'); else console.log('');
  process.exit(errs.length ? 1 : 0);
}
