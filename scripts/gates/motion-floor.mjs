#!/usr/bin/env node
// scripts/gates/motion-floor.mjs: DOES THE FILM EVER STOP, and is what fills the gaps real?
//
//   make motion-floor D=formats/scene/<film>.json   ·   node scripts/gates/motion-floor.mjs <film> [--json]
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
import { gateFindings } from '../lib/findings.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

// Sampled at 30fps because that is the rate `scripts/media/study.mjs` reads every reference in
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
 * For one consecutive pair: the mean absolute change, and what share of the frame carries 80% of it.
 * Returns { amount, share }. `share` is the locality: small means content arrived, large means drift.
 */
export function pairProfile(a, b) {
  const n = a.length;
  const d = new Uint8Array(n);
  let total = 0;
  for (let i = 0; i < n; i++) { const v = Math.abs(a[i] - b[i]); d[i] = v; total += v; }
  const amount = total / n;
  if (total < 1) return { amount, share: 1 };
  const sorted = Array.from(d).sort((x, y) => y - x);
  let run = 0, k = 0;
  for (const v of sorted) { run += v; k++; if (run >= total * 0.8) break; }
  return { amount, share: k / n };
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
// gate's self-test and exited before its own code began. scripts/dev/motion-lab.mjs hit exactly
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
    console.log('  ✓ motion-floor self-test: a drift reads global, a reveal reads local, stillness reads zero');
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
      + 'A reveal finished and nothing took over. The fix is overlap, not ambience: start the next reveal '
      + 'before the last one lands. Adding `idle` here would raise `global` and leave this finding exactly '
      + 'where it is.');
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
