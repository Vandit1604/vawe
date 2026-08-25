// scripts/gates/eye-trace.mjs — WHERE IS THE VIEWER LOOKING WHEN A CUT LANDS, and where does the next
// shot make them look? The first gate in this engine that measures Murch's fourth priority.
//
//   node scripts/gates/eye-trace.mjs <scene.json> [--strict] [--json]
//   node scripts/gates/eye-trace.mjs --selftest        the scorer's own fixtures, run these first
//   node scripts/gates/eye-trace.mjs --census          the library distribution the threshold came from
//
// TIER: REPORT, and the ranking is the reason. Murch puts eye-trace fourth of six, at 7%, under
// emotion (51%), story (23%) and rhythm (10%), and his instruction is to sacrifice UPWARD from the
// bottom — a cut that serves the story is allowed to cost the eye a journey. A gate that BLOCKED on
// eye-trace would invert his own ranking and make the 7% item the one thing a film cannot spend.
// So it prints the measurement and stops nobody.
//
// SOURCES
//   Derek Lieu, "Good Eye Trace For Smooth Editing" — the procedure: read the outgoing focal point,
//   place the incoming subject there. https://www.derek-lieu.com/blog/4/6/good-eye-trace-for-smooth-editing
//   EditMentor, "Eye Trace in Filmmaking" — the attention ranking (brighter > larger > in focus >
//   moving > eyes > mouth) and the cumulative-debt point.
//   https://editmentor.com/blog/eye-trace-in-filmmaking-a-visual-journey/
//   Walter Murch's Rule of Six, via PremiumBeat.
//   https://www.premiumbeat.com/blog/when-and-where-to-make-the-cut-inspired-by-walter-murchs-in-the-blink-of-an-eye/
//   A challenge to the Rule of Six's treatment of eye-trace exists and is recorded here unread:
//   https://nofilmschool.com/2018/08/editing-eye-trace-mind-rule-six-incorrect
//
// NO SOURCE PUBLISHES A DISTANCE THRESHOLD. Every one says "avoid making the eye travel" and not one
// says how far. JUMP_FAR below is OURS, derived from this library's own distribution (--census), and
// it must never be cited to a source.
//
// ------------------------------------------------------------------------------------------------
// WHAT THE SCORER CAN AND CANNOT SEE, stated before any number it produces.
//
// The ranking has six terms. Two of them, eyes and mouth, need a face and have no subject in a built
// frame, so four remain. All four are scored from the JSON, and the honesty sits in the FIRST one:
//
//   bright  NOT luminance. CONTRAST against the backdrop, which for a built frame is the better
//           question anyway: white type on a white field is the brightest thing in the scene and
//           nobody looks at it. The backdrop is a real colour, not a guess — core/backgrounds.js
//           bgPreset() returns the literal base hex for the scene's own bg window, so the ground is
//           read from the one place that paints it. A layer colour is a hex, an rgb()/hsl(), or a
//           var(--token) resolved through the theme palette exactly as core/boot.js applyTheme maps
//           it. When it is none of those (color-mix, a gradient, an undeclared colour that inherits)
//           the term is UNKNOWN for that layer and it is dropped from the average rather than
//           guessed at. Every verdict prints how many layers were unreadable.
//   large   canvasShare's box, clipped to the camera's view. It refuses to invent an extent: a layer
//           declaring one axis with no readable intrinsic aspect scores 0 rather than being squared.
//           That refusal is why the hairline test below passes, and it is not mine — scene-timing.mjs
//           already paid for it, in the gate that got deleted for squaring a 590x18 rule into 590x590.
//   focus   the `blur` channel of the motion track plus a declared blur filter. Cheap and real.
//   moving  per-frame centroid displacement from the motion track, plus a nominal contribution while
//           a layer is inside its entrance or exit ramp, because an arriving layer IS moving whether
//           or not it was hand-keyed. The nominal is stated as a constant and is not measured.
//
// WHY NOT PIXELS. The third option was to render frames and score them. It is the only way to see the
// real thing, and it costs a render per scene, which puts it out of an authoring loop and out of a
// 158-scene census. The JSON answer is available in 1.4s for the whole library and it is honest about
// its blind spots. If this gate ever disagrees with your eyes, your eyes win: `make beats`.
//
// WEIGHTS. The ranking gives an ORDER, not weights. These are mine: 0.35 / 0.30 / 0.20 / 0.15, in the
// source's order, applied to each term normalised against the largest value among the LIVE layers of
// that frame. The normalisation is what makes the score scale-free, so a film of small marks and a
// film of full-bleed panels are judged the same way.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { sceneTiming, boxOf, sceneView, num } from './scene-timing.mjs';
import { flattenLayers } from '../lib/layers.mjs';
import { population, isTemplate, SCENE_DIR } from '../lib/census.mjs';
import { resolveCoords } from '../../core/boot.js';
import { safeArea } from '../../core/safe.js';
import { motionAt } from '../../core/sequence.js';
import { bgPreset, bgPaletteFrom } from '../../core/backgrounds.js';
import { parseColorRGB } from '../../core/motion.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const FPS = 30;
const DT = 1 / FPS;

// THE CONSTANT, AND IT IS OURS. See --census for the distribution it came from. Stated here rather
// than buried so an author can argue with one number instead of with a verdict.
// THE 90TH PERCENTILE of the junctions in this library where the focal SUBJECT actually changes
// (53 of 185; the other 132 hold one subject across the cut and travel 0 by construction). So one
// junction in ten in a normal film here is expected to exceed it, and a film that exceeds it often is
// unusual for THIS library rather than wrong by some published standard. Re-derive with --census
// after the library grows; do not round it to look tidy.
export const JUMP_FAR = 0.30;      // fraction of the frame diagonal
export const W = { bright: 0.35, large: 0.30, focus: 0.20, moving: 0.15 };
// a layer inside its entrance/exit ramp is moving even with no keyed track. Nominal, not measured:
// a 0.45s slide of 200px is about 15px/frame on a 1920 canvas, which is 0.7% of the diagonal.
const RAMP_MOTION = 0.007;

// core/boot.js applyTheme() is the only writer of these vars. Mirrored, not re-derived: a second
// mapping would drift and the drifted copy is the one that scores the wrong colour.
const TOKEN = { '--bg': 'bg', '--bg-2': 'bg2', '--surface': 'surface', '--surface-2': 'surface2',
  '--line': 'line', '--line-strong': 'lineStrong', '--text': 'text', '--text-2': 'text2',
  '--dim': 'dim', '--ink': 'ink', '--up': 'up', '--down': 'down', '--accent': 'accent',
  '--accent-2': 'accent2', '--accent-dim': 'accentDim', '--accent-glow': 'accentGlow' };

/** relative luminance, WCAG. `null` in, `null` out — an unreadable colour never becomes a number. */
export function lumOf(v, palette) {
  if (typeof v !== 'string') return null;
  const s = v.trim();
  const m = /^var\(\s*(--[a-z0-9-]+)/i.exec(s);
  const lit = m ? (TOKEN[m[1]] ? palette[TOKEN[m[1]]] : null) : s;
  if (typeof lit !== 'string' || /gradient\(|color-mix\(/i.test(lit)) return null;
  const c = parseColorRGB(lit);
  if (!c) return null;
  const f = [c.r, c.g, c.b].map((x) => { x /= 255; return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4; });
  return 0.2126 * f[0] + 0.7152 * f[1] + 0.0722 * f[2];
}

/** the backdrop's luminance at t, from the window the scene itself declares. */
export function groundLum(d, theme, t) {
  const wins = Array.isArray(d.bg) ? d.bg : (d.bg ? [d.bg] : []);
  let win = wins[0] || {};
  for (const b of wins) if (b && typeof b === 'object' && num(b.t, num(b.from, -1)) <= t) win = b;
  const P = bgPaletteFrom(theme.palette || {});
  if (!P) return null;
  let base;
  try { base = bgPreset(win.preset, win.value, P).base; } catch { return null; }
  // a gradient ground has two ends; the eye sees the average, and the two ends of every preset here
  // sit within a few percent of each other.
  const ends = [base.color, base.from, base.to].filter((x) => typeof x === 'string');
  const ls = ends.map((c) => lumOf(c, {})).filter((x) => x != null);
  return ls.length ? ls.reduce((a, b) => a + b, 0) / ls.length : null;
}

// ------------------------------------------------------------------------------------------------
// THE SCORER

// WHERE THE INK IS, which for a wide text layer is not the middle of its box. A text layer declares a
// box and CSS puts the glyphs at one end of it: `align` is unset for 511 of the 1215 sized text layers
// in this library and CSS defaults to left, so a 6-word headline in a 1600px box has its ink centre
// about 500px left of its box centre — a quarter of the diagonal, which is larger than JUMP_FAR. An
// eye-trace gate that scored the box centre would be reporting the wrong place for a third of the
// library's type.
//
// THIS IS AN ESTIMATE AND IT IS BOUNDED, which is the whole difference between it and the size helper
// that got `visual-vocabulary` deleted. That one squared an axis it did not know and produced a number
// with no ceiling. This one estimates a Latin advance width at 0.55em, CLAMPS it to the declared box,
// and touches the CENTROID ONLY — the `large` term still reads the declared box, unestimated, so the
// term that killed the old gate is not fed by a guess. Worst case the ink centre is off by half the
// difference between the guess and the truth, and it can never leave the box.
const EM_ADVANCE = 0.55;
function inkCentreX(L, x, w) {
  if (L.type !== 'text' || typeof L.text !== 'string' || !(w > 0)) return x + w / 2;
  const lines = String(L.text).replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]*>/g, '').split('\n');
  const glyphs = Math.max(...lines.map((s2) => s2.trim().length), 0);
  const est = Math.min(w, glyphs * num(L.size, 48) * EM_ADVANCE);
  const a = L.align || 'left';                      // core/layers/util.js only sets textAlign when told
  return a === 'center' ? x + w / 2 : a === 'right' ? x + w - est / 2 : x + est / 2;
}

/** the layer's box and centroid at absolute time t, in stage px. */
function poseAt(L, t) {
  const b = boxOf(L, ROOT);
  let w = b.w, h = b.h, dx = 0, dy = 0, scale = 1, blur = 0, opacity = 1;
  if (Array.isArray(L.motion) && L.motion.length) {
    const m = motionAt(L.motion, t - num(L.start, 0));
    dx = m.dx || 0; dy = m.dy || 0; scale = m.scale ?? 1; blur = m.blur || 0; opacity = m.opacity ?? 1;
    if (m.w != null) w = m.w;                 // the box AT this moment, not the biggest it ever is
    if (m.h != null) h = m.h;
  }
  if (typeof L.filter === 'string' && /blur\(/i.test(L.filter)) blur = Math.max(blur, 8);
  const x = num(L.x, null), y = num(L.y, null);
  return { w: w * scale, h: h * scale, blur, opacity, how: b.how,
    // an undeclared coordinate centres the layer on the CANVAS (core/boot.js resolveCoords), and the
    // caller passes the canvas in so this file keeps no second copy of that rule.
    cx: x == null ? null : inkCentreX(L, x + dx, w * scale),
    cy: y == null ? null : y + dy + (h * scale) / 2 };
}

/** is this layer inside an entrance or exit ramp at t? */
const ramping = (L, t) => {
  const s = num(L.start, 0), du = num(L.duration, num(L.dur, Infinity));
  const en = L.split ? 0.6 : (L.enterDur != null ? num(L.enterDur, 0.45) : 0.45);
  const ex = L.exitDur != null ? num(L.exitDur, 0.4) : 0.4;
  return (t < s + en) || (Number.isFinite(du) && t > s + du - ex);
};

/**
 * focalAt(ctx, t) → the scored winner among the layers alive at t, plus every candidate's terms.
 * `null` when nothing is on screen (dead air, which beat-check already owns).
 */
export function focalAt(ctx, t) {
  const { T, CW, CH, palette, ground, d } = ctx;
  const live = [];
  T.content.forEach((L, i) => {
    const [a, b] = T.contentSpans[i];
    if (t >= a && t < b) live.push(L);
  });
  if (!live.length) return null;
  const view = sceneView(d, t, CW, CH) || { x: 0, y: 0, w: CW, h: CH };
  const cand = live.map((L) => {
    const p = poseAt(L, t), pPrev = poseAt(L, t - DT);
    const cx = p.cx == null ? CW / 2 : p.cx, cy = p.cy == null ? CH / 2 : p.cy;
    // AREA — clipped to what the camera is looking at, and 0 for an extent this file cannot derive.
    const vw = Math.max(0, Math.min(cx + p.w / 2, view.x + view.w) - Math.max(cx - p.w / 2, view.x));
    const vh = Math.max(0, Math.min(cy + p.h / 2, view.y + view.h) - Math.max(cy - p.h / 2, view.y));
    const large = p.how === 'unknown' ? 0 : Math.min(1, (vw * vh) / (view.w * view.h));
    // BRIGHT — contrast against the ground, or null when the colour cannot be read.
    const own = L.color ?? L.bg;
    const ll = lumOf(own, palette);
    const bright = (ll == null || ground == null) ? null : Math.abs(ll - ground) * (p.opacity ?? 1);
    // MOVING — keyed displacement this frame, plus the ramp nominal.
    const diag = Math.hypot(view.w, view.h);
    const keyed = (pPrev.cx == null || p.cx == null) ? 0 : Math.hypot(p.cx - pPrev.cx, p.cy - pPrev.cy) / diag;
    const moving = keyed + (ramping(L, t) ? RAMP_MOTION : 0);
    return { L, cx, cy, terms: { bright, large, focus: 1 / (1 + p.blur / 10), moving }, how: p.how };
  });
  const max = {};
  for (const k of ['bright', 'large', 'focus', 'moving'])
    max[k] = Math.max(0, ...cand.map((c) => c.terms[k] ?? 0));
  for (const c of cand) {
    let s = 0, wSum = 0;
    for (const k of ['bright', 'large', 'focus', 'moving']) {
      const v = c.terms[k];
      if (v == null) continue;                  // UNKNOWN is dropped, never defaulted to zero
      s += W[k] * (max[k] > 0 ? v / max[k] : 0); wSum += W[k];
    }
    c.score = wSum > 0 ? s / wSum : 0;          // renormalise so a colourless layer is not penalised
  }
  cand.sort((a, b) => b.score - a.score || String(a.L.id ?? '').localeCompare(String(b.L.id ?? '')));
  return { win: cand[0], cand, unreadable: cand.filter((c) => c.terms.bright == null).length, live: cand.length };
}

// ------------------------------------------------------------------------------------------------
// THE FILM

export function trace(scene) {
  const d = JSON.parse(JSON.stringify(scene));
  const T = sceneTiming(d);
  const [CW, CH] = T.canvas;
  const lowered = T.scene;
  // px coordinates, resolved by the ENGINE's own placement grammar. Nothing here re-implements pin.
  resolveCoords(lowered, CW, CH, safeArea(CW, CH, lowered.destination || 'web'));
  const theme = loadTheme(lowered);
  const ctx = { T, CW, CH, d: lowered, palette: theme.palette || {},
    ground: groundLum(lowered, theme, 0) };
  const diag = Math.hypot(CW, CH);

  // every junction the film declares, in time order.
  const marks = [];
  for (const [k, kind] of [['cuts', 'cut'], ['seams', 'seam'], ['stings', 'sting']])
    for (const m of lowered[k] || []) if (Number.isFinite(+m?.t)) marks.push({ t: +m.t, kind });
  marks.sort((a, b) => a.t - b.t);

  // THE FRAME EITHER SIDE, and why it is a SEARCH rather than t±1/30. A cut here is a WINDOW, not a
  // splice: `cut.dur` (0.4s by default) is a transition the engine plays, and a film that is not
  // wrapped as scene-units routinely empties the frame across it. Sampling one frame after the mark
  // then reads "nothing on screen" for four consecutive cuts of a film whose frames are full
  // (brew-launch-act1). What the eye actually acquires is the FIRST thing the new shot puts up, so
  // that is what gets scored. The search is bounded by the neighbouring junctions so it can never
  // reach across a cut and score the wrong shot, and both sampled times are reported.
  const SEARCH = 1.5;
  const nearest = (from, dir, limit) => {
    for (let k = 1; k <= Math.round(Math.min(SEARCH, limit) * FPS); k++) {
      const t = from + dir * k * DT;
      if (t < 0 || t > T.duration) break;
      const f = focalAt(ctx, t);
      if (f) return { f, t };
    }
    return null;
  };

  const junctions = [];
  marks.forEach((m, i) => {
    ctx.ground = groundLum(lowered, theme, m.t);
    const prev = i > 0 ? marks[i - 1].t : 0;
    const next = i < marks.length - 1 ? marks[i + 1].t : T.duration;
    const b = nearest(m.t, -1, m.t - prev);
    const a = nearest(m.t, +1, next - m.t);
    if (!b || !a) { junctions.push({ ...m, empty: true }); return; }
    const before = b.f, after = a.f;
    const dist = Math.hypot(after.win.cx - before.win.cx, after.win.cy - before.win.cy) / diag;
    junctions.push({ ...m, dist, before, after, tBefore: b.t, tAfter: a.t,
      // ONE CANDIDATE IS NOT A FOCAL POINT. When a side holds a single live layer the winner won by
      // being alone, and on a persistent corner watermark that is a hole in the film rather than a
      // place the eye was. vawe-launch has exactly that: nothing but its own filename tag between
      // 11.1s and 11.9s, so the gate reads a 43% jump off a frame beat-check calls dead air. Said out
      // loud rather than suppressed, because the jump IS real and the emptiness is the better finding.
      lonely: (before.live === 1 ? 'before' : '') + (after.live === 1 ? 'after' : ''),
      unreadable: before.unreadable + after.unreadable, live: before.live + after.live });
  });

  // BEATS, for the debt shape: the span between one junction and the next.
  const edges = [0, ...marks.map((m) => m.t), T.duration];
  const beats = [];
  for (let i = 0; i < edges.length - 1; i++) beats.push({ start: edges[i], end: edges[i + 1], dur: edges[i + 1] - edges[i] });

  return { T, CW, CH, diag, junctions, beats, duration: T.duration, theme: theme.name || 'inline' };
}

function loadTheme(d) {
  if (d.theme && typeof d.theme === 'object') return d.theme;
  try { return JSON.parse(fs.readFileSync(path.join(ROOT, 'themes', `${d.theme}.json`), 'utf8')); }
  catch { return {}; }
}

/**
 * THE ACCUMULATING HALF, and the honest version of it.
 *
 * EditMentor's point is that re-acquisition costs a fraction of a second, so a run of equally short
 * beats never lets the viewer catch up and the confusion adds up across the film. Three measures come
 * out of that, and only two of them discriminate. All three are printed, because the inert one is
 * itself a finding.
 *
 *   reacquire   the share of the film's runtime the eye spends TRAVELLING rather than reading.
 *               Σ(dist × RECOVER) / duration. This is the one that separates films.
 *   peak        the classic running debt, in SECONDS: a jump adds dist × RECOVER, the beat that
 *               follows pays its own length off. It is INERT in this library and in any film with
 *               beats over about a third of a second, because one saccade never outruns one beat.
 *               Kept and printed so nobody rebuilds it expecting it to fire.
 *   crowded     the pairing the source actually names: a jump over JUMP_FAR followed by a beat
 *               SHORTER than this film's own median. This is the shape, and it fires.
 *
 * RECOVER is OURS. The sources say "a fraction of a second" and publish no number. 0.30s is the cost
 * of a full-diagonal jump, scaled linearly with distance; a jump of a tenth of the diagonal costs
 * 0.03s. Argue with the constant, not with the verdict.
 */
export const RECOVER = 0.30;

export function debtOf(t) {
  const durs = t.beats.map((b) => b.dur).sort((a, b) => a - b);
  const median = durs.length ? durs[Math.floor(durs.length / 2)] : 0;
  let debt = 0, peak = 0, peakAt = 0, travel = 0;
  const trail = [], crowded = [];
  t.junctions.forEach((j, i) => {
    if (j.empty || j.dist == null) return;
    const cost = j.dist * RECOVER;
    travel += cost;
    debt = Math.max(0, debt + cost);
    if (debt > peak) { peak = debt; peakAt = j.t; }
    const beat = t.beats[i + 1];
    if (beat && j.dist > JUMP_FAR && beat.dur < median)
      crowded.push({ t: j.t, dist: j.dist, beat: beat.dur, median });
    if (beat) debt = Math.max(0, debt - beat.dur);
    trail.push({ t: j.t, dist: j.dist, cost, beat: beat ? beat.dur : null, debt });
  });
  return { median, peak, peakAt, travel, share: t.duration ? travel / t.duration : 0, trail, crowded };
}

// ------------------------------------------------------------------------------------------------
// SELF-TEST — run this before you trust a single number the gate prints.
//
// The first fixture is not decoration. `visual-vocabulary` was deleted from this repo for squaring a
// 590x18 decorative rule into 590x590 and crediting a hairline with a tenth of the frame, and this
// gate reads the same geometry. If the hairline ever wins fixture 1, the scorer is wrong and the
// numbers below it are worse than nothing.
const FIXTURES = [
  { name: 'hairline vs card',
    want: 'card',
    why: 'a 590x18 decorative rule is 0.5% of the frame; a 400x300 card is 5.8%. The card must win.',
    scene: { module: 'scene', theme: 'default', duration: 3, bg: [{ preset: 'paper' }],
      cuts: [{ t: 1.5, style: 'cut' }],
      layers: [
        { type: 'rect', id: 'hairline', x: 665, y: 900, w: 590, h: 18, bg: 'var(--line)', start: 0, duration: 3 },
        { type: 'rect', id: 'card', x: 760, y: 390, w: 400, h: 300, bg: 'var(--ink)', start: 0, duration: 3 },
      ] } },
  { name: 'hairline at MAXIMUM contrast vs a mid-tone card',
    want: 'card',
    why: 'the hairline test with the odds stacked: the rule is the loudest colour in the theme and the '
       + 'card is a mid grey. The card must STILL win, or "brighter" has been let outrank everything.',
    scene: { module: 'scene', theme: 'default', duration: 3, bg: [{ preset: 'paper' }],
      cuts: [{ t: 1.5, style: 'cut' }],
      layers: [
        { type: 'rect', id: 'hairline', x: 665, y: 900, w: 590, h: 18, bg: 'var(--ink)', start: 0, duration: 3 },
        { type: 'rect', id: 'card', x: 760, y: 390, w: 400, h: 300, bg: '#9aa0aa', start: 0, duration: 3 },
      ] } },
  { name: 'huge dim panel vs small bright headline',
    want: 'headline',
    why: 'a near-white panel on a white ground is a SURFACE. The dark headline on it is the subject, '
       + 'even at a twentieth of its area. This is the case a pure area scorer gets wrong.',
    scene: { module: 'scene', theme: 'default', duration: 3, bg: [{ preset: 'paper' }],
      cuts: [{ t: 1.5, style: 'cut' }],
      layers: [
        { type: 'rect', id: 'panel', x: 100, y: 100, w: 1720, h: 880, bg: '#f2f3f5', start: 0, duration: 3 },
        { type: 'text', id: 'headline', text: 'the point', x: 200, y: 460, w: 600, size: 96, color: 'var(--text)', start: 0, duration: 3 },
      ] } },
];

function selftest() {
  console.log('\n  eye-trace · scorer self-test\n');
  let bad = 0;
  for (const f of FIXTURES) {
    const t = trace(f.scene);
    const j = t.junctions[0];
    const got = String(j.before.win.L.id);
    const rows = j.before.cand.map((c) => `${String(c.L.id).padEnd(10)} score ${c.score.toFixed(3)}  `
      + `bright ${c.terms.bright == null ? ' n/a ' : c.terms.bright.toFixed(3)}  large ${c.terms.large.toFixed(4)}  `
      + `focus ${c.terms.focus.toFixed(2)}  moving ${c.terms.moving.toFixed(4)}  box:${c.how}`);
    const ok = got === f.want;
    if (!ok) bad++;
    console.log(`  ${ok ? '✓' : '✗'} ${f.name}  → focal point is "${got}" (wanted "${f.want}")`);
    console.log(`      ${f.why}`);
    for (const r of rows) console.log(`      ${r}`);
    console.log('');
  }
  console.log(bad ? `  ✗ ${bad} fixture(s) wrong — STOP. A confident wrong number is worse than no gate.\n`
    : '  ✓ the scorer beats the hairline. Raw terms are printed above so the arithmetic is arguable.\n');
  process.exit(bad ? 1 : 0);
}

// ------------------------------------------------------------------------------------------------
// CLI

function report(file, opts = {}) {
  const scene = JSON.parse(fs.readFileSync(file, 'utf8'));
  if (scene.module !== 'scene') return null;
  const t = trace(scene);
  const D = debtOf(t);
  const allow = scene.authoring?.allow || [];
  const named = (c) => c.L.id || `${c.L.type}${c.L.text ? ` "${String(c.L.text).replace(/<[^>]*>/g, '').slice(0, 22)}"` : ''}`;
  const findings = [];
  for (const j of t.junctions) {
    if (j.empty || j.dist == null) continue;
    if (j.dist > JUMP_FAR) findings.push({ code: 'eye-jumps-the-frame', t: j.t,
      msg: `${j.kind}@${j.t.toFixed(2)}s · the eye moves ${(j.dist * 100).toFixed(0)}% of the diagonal — from `
        + `${named(j.before.win)} at (${j.before.win.cx | 0},${j.before.win.cy | 0}) to ${named(j.after.win)} at `
        + `(${j.after.win.cx | 0},${j.after.win.cy | 0}). Land the incoming subject nearer where the eye already is.`
        + (j.lonely ? ` NOTE: the ${j.lonely} side holds ONE live layer, so it won by being alone — check `
          + `beat-check for dead air before you move anything.` : '') });
  }
  for (const c of D.crowded) findings.push({ code: 'no-time-to-catch-up', t: c.t,
    msg: `${c.t.toFixed(2)}s · the eye is sent ${(c.dist * 100).toFixed(0)}% of the diagonal and then given `
      + `${c.beat.toFixed(2)}s, under this film's own median beat of ${c.median.toFixed(2)}s. A big jump should buy `
      + `the NEXT beat more time, not less.` });
  return { file, t, D, findings: findings.filter((f) => !allow.includes(f.code)), allow, opts };
}

// IMPORTED, NOT RUN. The scorer is exported so lib-test and any future gate can reach it, and a
// module that runs its own CLI on import cannot be imported at all.
const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
const args = process.argv.slice(2);
const file = args.find((a) => !a.startsWith('--'));
const strict = args.includes('--strict');
if (!isMain) { /* module use */ } else {

if (args.includes('--selftest')) selftest();

if (args.includes('--census')) {
  // THE SAME POPULATION waiver-drift walks, so a number quoted from here and a number quoted from
  // there are about the same library. Its filter, not a second one: derivatives out, module==="scene" in.
  const { names, blind } = population('EYE-TRACE CENSUS', {
    filter: (f, abs) => {
      if (isTemplate(f) || f === 'schema.json' || /\.(animatic|intent|expanded|beatsync|captioned|directed)\./.test(f)) return false;
      try { return JSON.parse(fs.readFileSync(abs, 'utf8'))?.module === 'scene'; } catch { return false; }
    },
  });
  if (blind) { console.error(`  blind: ${blind}`); process.exit(3); }
  const all = [], moved = [], rows = [], debts = [];
  let bad = 0, unread = 0, scored = 0;
  for (const f of names) {
    let r; try { r = report(path.join(ROOT, SCENE_DIR, f)); } catch { bad++; continue; }
    if (!r) continue;
    const ds = [];
    for (const j of r.t.junctions) {
      if (j.dist == null) continue;
      ds.push(j.dist); all.push(j.dist);
      // THE SPLIT THAT MATTERS. A junction whose focal point is the SAME LAYER on both sides is the
      // continuous-object device working, and its distance is 0 by construction. 169 of 244 junctions
      // in this library are that, so the pooled median is 0.000 and says nothing about the rule. The
      // threshold is set on the junctions where the eye is actually asked to MOVE to a new subject.
      if (j.before.win.L !== j.after.win.L) moved.push(j.dist);
      unread += j.unreadable || 0; scored += j.live || 0;
    }
    debts.push([f.replace('.json', ''), r.D.share, r.D.travel, r.D.median, r.D.crowded.length]);
    rows.push([f.replace('.json', ''), ds]);
  }
  all.sort((a, b) => a - b); moved.sort((a, b) => a - b);
  const q = (arr, p) => (arr.length ? arr[Math.min(arr.length - 1, Math.floor(p * arr.length))] : 0);
  console.log(`  ${all.length} junction(s) across ${rows.length} scene(s) · ${bad} unreadable file(s)`);
  console.log(`  ${all.length - moved.length} of them (${((1 - moved.length / (all.length || 1)) * 100).toFixed(0)}%) keep the SAME `
    + `focal layer across the junction — a continuous subject, distance 0 by construction.`);
  console.log(`  ${unread} of ${scored} scored layers had a colour this gate could not read `
    + `(${((unread / (scored || 1)) * 100).toFixed(1)}%).\n`);
  const histo = (arr, label) => {
    console.log(`  ${label} — fraction of the frame diagonal`);
    const B = 10, hist = new Array(B).fill(0);
    for (const v of arr) hist[Math.min(B - 1, Math.floor(v * B))]++;
    const wide = Math.max(1, ...hist);
    for (let i = 0; i < B; i++) console.log(`   ${(i / B).toFixed(1)}-${((i + 1) / B).toFixed(1)}  `
      + `${'█'.repeat(Math.round((hist[i] / wide) * 44)).padEnd(44)} ${String(hist[i]).padStart(4)}`);
    console.log(`   min ${q(arr, 0).toFixed(3)} · p25 ${q(arr, 0.25).toFixed(3)} · median ${q(arr, 0.5).toFixed(3)} · `
      + `p75 ${q(arr, 0.75).toFixed(3)} · p90 ${q(arr, 0.9).toFixed(3)} · max ${(arr[arr.length - 1] || 0).toFixed(3)}\n`);
  };
  histo(all, `all ${all.length} junctions`);
  histo(moved, `the ${moved.length} junctions where the focal SUBJECT changes`);
  console.log(`  JUMP_FAR = ${JUMP_FAR} → ${all.filter((v) => v > JUMP_FAR).length} of ${all.length} junctions `
    + `(${((all.filter((v) => v > JUMP_FAR).length / (all.length || 1)) * 100).toFixed(0)}%) over it; `
    + `${moved.filter((v) => v > JUMP_FAR).length} of ${moved.length} subject changes `
    + `(${((moved.filter((v) => v > JUMP_FAR).length / (moved.length || 1)) * 100).toFixed(0)}%).\n`);
  const worstDebt = debts.filter((x) => x[1] > 0).sort((a, b) => b[1] - a[1]).slice(0, 12);
  if (worstDebt.length) {
    console.log(`  ACCUMULATED COST — share of runtime the eye spends travelling (at ${RECOVER}s per full diagonal)`);
    for (const [nm2, sh, tr, md, cr] of worstDebt)
      console.log(`   ${nm2.padEnd(34)} ${(sh * 100).toFixed(2).padStart(5)}%  ${tr.toFixed(2)}s total  `
        + `median beat ${md.toFixed(2)}s${cr ? `   ${cr} jump(s) with no time to catch up` : ''}`);
    const crowdedFilms = debts.filter((x) => x[4] > 0);
    console.log(`\n  ${crowdedFilms.length} film(s) send the eye over JUMP_FAR and then give it a below-median beat.`);
    console.log(`  Running-debt-in-seconds peaks at ${Math.max(0, ...debts.map((x) => x[2])).toFixed(2)}s across the whole `
      + `library and is INERT: one saccade never outruns one beat.\n`);
  }
  if (args.includes('--worst')) {
    const worst = rows.filter((r) => r[1].length).map((r) => [r[0], Math.max(...r[1])])
      .sort((a, b) => b[1] - a[1]).slice(0, 15);
    console.log('  the 15 largest single jumps in the library');
    for (const [nm, v] of worst) console.log(`   ${nm.padEnd(34)} ${(v * 100).toFixed(0)}%`);
    console.log('');
  }
  process.exit(0);
}

if (!file || !fs.existsSync(file)) {
  console.error('usage: node scripts/gates/eye-trace.mjs <scene.json> [--strict] [--json] | --selftest | --census [--worst]');
  process.exit(2);
}
const r = report(file);
if (!r) { console.error(`✗ ${file}: not a scene (module !== "scene")`); process.exit(2); }
if (args.includes('--json')) {
  console.log(JSON.stringify({ file, jumpFar: JUMP_FAR,
    junctions: r.t.junctions.map((j) => ({ t: j.t, kind: j.kind, dist: j.dist ?? null,
      from: j.before ? { id: j.before.win.L.id ?? j.before.win.L.type, x: j.before.win.cx | 0, y: j.before.win.cy | 0 } : null,
      to: j.after ? { id: j.after.win.L.id ?? j.after.win.L.type, x: j.after.win.cx | 0, y: j.after.win.cy | 0 } : null,
      unreadable: j.unreadable ?? null, live: j.live ?? null })),
    debt: r.D, findings: r.findings }, null, 2));
  process.exit(0);
}

const nm = (c) => c.L.id || `${c.L.type}${c.L.text ? ` "${String(c.L.text).replace(/<[^>]*>/g, '').slice(0, 20)}"` : ''}`;
console.log(`\n  eye-trace · ${path.basename(file)}  theme ${r.t.theme} · ${r.t.CW}x${r.t.CH} · `
  + `${r.t.junctions.length} junction(s) · median beat ${r.D.median.toFixed(2)}s  (JUMP_FAR ${JUMP_FAR}, ours)\n`);
if (!r.t.junctions.length) {
  console.log('  no cuts, seams or stings — there is no junction for the eye to cross.\n');
  process.exit(0);
}
console.log(`  the eye spends ${(r.D.travel).toFixed(2)}s of ${r.t.duration.toFixed(1)}s travelling `
  + `(${(r.D.share * 100).toFixed(1)}% of the runtime, at ${RECOVER}s per full-diagonal jump — ours)\n`);
console.log('   at      kind    the eye moves        from                     to                       cost');
for (const j of r.t.junctions) {
  if (j.empty || j.dist == null) { console.log(`   ${j.t.toFixed(2).padStart(6)}s ${j.kind.padEnd(7)} (nothing on screen)`); continue; }
  const d = r.D.trail.find((x) => x.t === j.t);
  const bar = '▇'.repeat(Math.round(j.dist * 20));
  console.log(`   ${j.t.toFixed(2).padStart(6)}s ${j.kind.padEnd(7)} ${(j.dist * 100).toFixed(0).padStart(3)}% ${bar.padEnd(16)}`
    + ` ${nm(j.before.win).slice(0, 24).padEnd(24)} ${nm(j.after.win).slice(0, 24).padEnd(24)} ${d ? d.cost.toFixed(2) + 's' : '-'}`
    + `${j.lonely ? '  ← 1 layer on screen' : ''}`
    + `${j.unreadable ? `  (${j.unreadable}/${j.live} colours unread)` : ''}`);
}
console.log('');
if (!r.findings.length) {
  console.log(`  ✓ every junction lands the eye within ${(JUMP_FAR * 100) | 0}% of the diagonal, and no big jump `
    + `is followed by a below-median beat.\n`);
  process.exit(0);
}
for (const f of r.findings) console.log(`    ~ [eye-trace] ${f.code}: ${f.msg}`);
console.log(strict
  ? '\n  ✗ eye-trace (strict)\n'
  : '\n  REPORT ONLY — Murch ranks eye-trace fourth of six at 7%, under emotion, story and rhythm, and says\n'
    + '  to sacrifice upward from the bottom. A cut that serves the story may cost the eye a journey.\n'
    + '  Waive with {"authoring":{"allow":["eye-jumps-the-frame"]}} plus a _why.\n');
process.exit(strict ? 1 : 0);
}
