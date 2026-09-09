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

/** Per-window: local motion (content arriving) and global motion (ambience), kept apart. */
export function profile(frames, { fps = SAMPLE_FPS, windowS = WINDOW_S } = {}) {
  const per = Math.max(1, Math.round(fps * windowS));
  const out = [];
  for (let w = 0; w + per < frames.length; w += per) {
    let local = 0, global = 0, n = 0;
    for (let i = w; i < w + per && i + 1 < frames.length; i++) {
      const { amount, share } = pairProfile(frames[i], frames[i + 1]);
      if (share <= LOCAL_SHARE) local += amount; else global += amount;
      n++;
    }
    out.push({ t: +(w / fps).toFixed(2), local: +(local / n).toFixed(3), global: +(global / n).toFixed(3) });
  }
  return out;
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

    console.log('  ✓ motion-floor self-test: a drift reads global, a reveal reads local, stillness reads zero,');
    console.log('    a whole-frame slide reads global, and a bounded object travelling reads local');
    process.exit(0);
  }

  const arg = process.argv.slice(2).find((a) => !a.startsWith('--')) || process.env.D;
  if (!arg) { console.error('usage: make motion-floor D=formats/scene/<film>.json'); process.exit(2); }
  const base = String(arg).replace(/\.json$/, '');
  const slug = path.basename(base);
  const mp4 = path.join(ROOT, 'out', slug + '.mp4');
  if (!fs.existsSync(mp4)) { console.log(`  motion-floor: no render at out/${slug}.mp4 yet, so there are no pixels to read. Render first.`); process.exit(0); }

  const frames = pullFrames(mp4);
  if (!frames) { console.log('  motion-floor: ffmpeg returned no frames; skipped rather than guessed.'); process.exit(0); }
  const prof = profile(frames);

  // The reference's own numbers, when the film declares one. Nothing here is a threshold I chose.
  let ref = null, refName = null;
  const sbPath = [base + '.storyboard.md', path.join(ROOT, 'formats/scene', slug + '.storyboard.md')]
    .map((f) => path.resolve(ROOT, f)).find((f) => fs.existsSync(f));
  if (sbPath) {
    const m = /^reference\s*:\s*["']?([\w.-]+)/mi.exec(fs.readFileSync(sbPath, 'utf8'));
    if (m) {
      refName = m[1];
      const refMp4 = ['refs/' + refName + '.mp4', 'refs/' + refName + '/' + refName + '.mp4']
        .map((f) => path.join(ROOT, f)).find((f) => fs.existsSync(f));
      if (refMp4) { const rf = pullFrames(refMp4); if (rf) ref = profile(rf); }
    }
  }

  const gf = gateFindings();
  const errs = [], warns = [];
  const err = (c, m) => { errs.push(m); gf.fail(c, m); };
  const warn = (c, m) => { warns.push(m); gf.warn(c, m); };

  // The last window is the outro: a film is allowed to stop at its end, and the reference does.
  const body = prof.slice(0, -2);
  const dead = body.filter((w) => w.local < DEAD);
  const localMed = [...body.map((w) => w.local)].sort((a, b) => a - b)[Math.floor(body.length / 2)] || 0;
  const globalMed = [...body.map((w) => w.global)].sort((a, b) => a - b)[Math.floor(body.length / 2)] || 0;

  if (dead.length) {
    err('dead-window', `${dead.length} of ${body.length} windows carry no content motion at all `
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
      err('floor-below-reference', `this film's quietest window is ${ourFloor.toFixed(2)} and ${refName}'s is `
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
    err('ambient-padding', `global (whole-frame) motion ${globalMed.toFixed(2)} now exceeds local (content) motion `
      + `${localMed.toFixed(2)}. Something is drifting or breathing more than anything is happening. Ambient motion `
      + 'is not a substitute for a reveal, and this gate will not accept it as one.');
  }

  if (process.argv.includes('--json')) { console.log(JSON.stringify({ prof, errs, warns }, null, 2)); process.exit(errs.length ? 1 : 0); }
  console.log(`\n  motion-floor · ${slug} · ${body.length} windows of ${WINDOW_S}s${refName ? ` · vs ${refName}` : ''}`);
  console.log(`    local (content)  median ${localMed.toFixed(2)}  floor ${Math.min(...body.map((w) => w.local)).toFixed(2)}  peak ${Math.max(...body.map((w) => w.local)).toFixed(2)}`);
  console.log(`    global (ambient) median ${globalMed.toFixed(2)}`);
  if (ref) {
    const rb = ref.slice(0, -2);
    console.log(`    ${refName}: local median ${([...rb.map((w) => w.local)].sort((a, b) => a - b)[Math.floor(rb.length / 2)]).toFixed(2)}  floor ${Math.min(...rb.map((w) => w.local)).toFixed(2)}`);
  }
  for (const m of errs) console.log(`    ✗ ${m}`);
  for (const m of warns) console.log(`    ~ ${m}`);
  if (!errs.length && !warns.length) console.log('    ✓ the film never stops, and what fills it is content\n'); else console.log('');
  process.exit(errs.length ? 1 : 0);
}
