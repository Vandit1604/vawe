// blueprints/beats.mjs: the BEAT LIBRARY. Each factory is a pure props → array-of-richly-animated-layers
// for one whole beat, with the direction baked in (kinetic reveals, overshoot, cascades, count-ups, ken
// push, cursor). Compose a video as a sequence of beats + brand content; the good motion is the default.
//
// A beat fixes MOTION and STRUCTURE, never copy/colour/brand. Those come from props + the theme, so two
// brands using the same beat still differ (the ledger/similarity gate enforce it). Placed in a scene as
//   { "type": "beat", "beat": "kineticHook", "start": 0.3, "dur": 5.5, "eyebrow": "...", "to": 94, ... }
// and expanded by `make expand`. See docs/CRAFT/BLUEPRINTS.md.
import { INK, DIM, ACCENT, kineticHeadline, dollyNumber, caption, chip, panel, verdictChip, rowGroup, colGroup } from './kit.mjs';
import { glyphText } from '../core/on-screen-text.js';

// kineticHook: the OPEN LOOP. An eyebrow question, a hero number (count-up + pop) OR a big kinetic word,
// then a word-by-word subline. Front-loads the strong element (DIRECTION.md §4).
export function kineticHook({ x = 160, y = 160, w = 1600, eyebrow, to, unit = '', decimals, word, wordSize = 300, sub,
  start = 0, dur = 5.5 } = {}) {
  const out = [];
  if (eyebrow) out.push(caption({ text: eyebrow, x, y: y + 90, w, size: 56, start, dur }));
  if (to != null) out.push(dollyNumber({ to, unit, decimals, x, y: y + 190, w, size: 360, start: start + 0.4, dur: dur - 0.4 }));
  else if (word) out.push(kineticHeadline({ text: word, x, y: y + 190, w, size: wordSize, weight: 800, preset: 'scale', each: 0.34, start: start + 0.4, dur: dur - 0.4 }));
  if (sub) out.push(kineticHeadline({ text: sub, x, y: y + 620, w, size: 74, weight: 700, start: start + 1.9, dur: dur - 1.9 }));
  return out;
}

// statReveal: the PAYOFF. A hero count-up + a kinetic label. Held long (the release the build earned).
export function statReveal({ x = 160, y = 330, w = 1600, to, unit = '', decimals, prefix, label, start = 0, dur = 3.6 } = {}) {
  return [
    dollyNumber({ to, unit, decimals, prefix, x, y, w, size: 320, start, dur }),
    label && kineticHeadline({ text: label, x, y: y + 380, w, size: 48, weight: 600, each: 0.3, stagger: 0.03, start: start + 0.9, dur: dur - 0.9 }),
  ].filter(Boolean);
}

// cardCascade. A FEATURE GRID that proves density: a kinetic title + N cards that pop in one after
// another (follow-through/staging). Each card = name (accent) + desc (body) + a mono command/detail.
export function cardCascade({ x = 197, y = 300, w = 1526, title, cards = [], cols = 3, cardW = 490,
  start = 0, dur = 8 } = {}) {
  const card = (c) => colGroup([
    { type: 'text', text: c.name, size: 36, weight: 700, color: ACCENT },
    c.desc && { type: 'text', text: c.desc, font: 'serif', w: cardW - 56, size: 26, weight: 500, color: 'var(--text-2)' },
    c.detail && { type: 'text', text: c.detail, w: cardW - 56, font: 'mono', size: 22, weight: 500, color: DIM },
  ].filter(Boolean), 12);
  const rows = [];
  for (let i = 0; i < cards.length; i += cols) {
    rows.push(rowGroup(cards.slice(i, i + cols).map((c) => ({ ...card(c), w: cardW, pad: 28, bg: 'var(--surface)', radius: 18, border: `1.5px solid var(--line)` })), 28));
  }
  return [
    title && kineticHeadline({ text: title, x: 160, y: y - 150, w: 1600, size: 62, weight: 700, each: 0.36, stagger: 0.04, start, dur }),
    { type: 'group', x, y, w, layout: 'column', gap: 26, start: start + 0.4, duration: dur - 0.4, anim: 'pop', enterDur: 0.46, each: 0.06, out: 'defocus', exitDur: 0.45, children: rows },
  ].filter(Boolean);
}

// chipGrid: NAMED things (sources, integrations, tools) as mono pills that pop in staggered, with an
// accent footer line. Backs a "reads every X" / "works with Y" claim by SHOWING the set.
export function chipGrid({ x = 300, y = 380, w = 1320, title, chips = [], cols = 4, footer, start = 0, dur = 6.5 } = {}) {
  const rows = [];
  for (let i = 0; i < chips.length; i += cols) rows.push(rowGroup(chips.slice(i, i + cols).map((c) => chip({ text: c })), 26));
  return [
    title && kineticHeadline({ text: title, x: 160, y: y - 180, w: 1600, size: 62, weight: 700, preset: 'scale', each: 0.34, stagger: 0.035, start, dur }),
    { type: 'group', x, y, w, layout: 'column', gap: 26, start: start + 0.4, duration: dur - 0.4, anim: 'pop', enterDur: 0.5, each: 0.05, out: 'defocus', exitDur: 0.4, children: rows },
    footer && caption({ text: footer, x: 160, y: y + 380, w: 1600, size: 40, weight: 600, color: ACCENT, anim: 'pop', start: start + 1.5, dur: dur - 1.5 }),
  ].filter(Boolean);
}

// terminalReveal. The product IS a CLI: a light panel, a typing command with a cursor, output that
// rises in word-by-word, and an accent result. A live demo, not a screenshot of one.
export function terminalReveal({ x = 360, y = 330, w = 1200, h = 470, title, prompt = '$', command,
  output = [], result, cps = 16, start = 0, dur = 6.7 } = {}) {
  const px = x + 50, py = y + 42;
  const L = [
    title && kineticHeadline({ text: title, x: 160, y: y - 160, w: 1600, size: 58, weight: 700, each: 0.34, stagger: 0.035, start, dur }),
    panel({ x, y, w, h, start: start + 0.2, dur: dur - 0.2 }),
    { type: 'text', text: prompt, x: px, y: py, w: 40, align: 'left', size: 34, weight: 700, font: 'mono', color: ACCENT, start: start + 0.6, duration: dur - 0.6 },
    { type: 'text', text: command, x: px + 52, y: py, w: w - 130, align: 'left', size: 34, weight: 500, font: 'mono', color: INK, typing: cps, start: start + 0.6, duration: dur - 0.6 },
    { type: 'cursor', size: 34, start: start + 1.4, duration: 0.9, path: [{ t: 0, x: px + 340, y: py + 20 }, { t: 0.5, x: px + 340, y: py + 20 }] },
  ];
  output.forEach((line, i) => L.push({ type: 'text', text: line, x: px, y: py + 88 + i * 50, w: w - 100, align: 'left', size: 28, weight: 500, font: 'mono', color: DIM, split: 'word', preset: 'up', each: 0.3, stagger: 0.02, start: start + 2.1 + i * 0.4, duration: dur - 2.1 - i * 0.4 }));
  if (result) L.push({ type: 'text', text: result, x: px, y: y + h - 60, w: w - 100, align: 'left', size: 32, weight: 600, font: 'mono', color: ACCENT, anim: 'pop', enterDur: 0.5, start: start + 2.1 + output.length * 0.4 + 1.0, duration: 1.0 });
  return L.filter(Boolean);
}

// screenDive. The payoff PRODUCT surface: a kinetic title, then the real UI capture/screenshot that
// KEN-PUSHES in (zoom into the dashboard, not a static card), plus a mono caption. Pair with a
// `cinematicZoom` seam at `start` for the dive-in (docs/MOTION-RECIPES.md dive-in).
export function screenDive({ x = 626, y = 195, w = 668, title, image, caption: cap, zoom = [1.0, 1.28], start = 0, dur = 7 } = {}) {
  return [
    title && kineticHeadline({ text: title, x: 160, y: 108, w: 1600, size: 58, weight: 700, preset: 'scale', each: 0.3, stagger: 0.03, start, dur }),
    { type: 'image', src: image, x, y, w, radius: 14, border: `1.5px solid var(--line)`, start: start + 0.3, duration: dur - 0.6, anim: 'scale', enterDur: 0.55, out: 'defocus', exitDur: 0.4, ken: { from: zoom[0], to: zoom[1] } },
    cap && caption({ text: cap, x: 160, y: 918, w: 1600, size: 36, start: start + 0.6, dur: dur - 0.6 }),
  ].filter(Boolean);
}

// logoLockup. The BRAND beat: the real mark pops (ken drift), the wordmark travels in, a kinetic
// headline, a mono sub. Give the logo prominence (a deliberate element, not a bullet).
export function logoLockup({ markX = 690, markY = 300, markW = 150, wordX = 860, wordY = 322, wordW = 470,
  mark, wordmark, headline, sub, start = 0, dur = 5.5 } = {}) {
  return [
    mark && { type: 'image', src: mark, x: markX, y: markY, w: markW, start: start + 0.4, duration: dur - 0.4, anim: 'pop', enterDur: 0.6, out: 'defocus', exitDur: 0.4, ken: { from: 1.0, to: 1.05 } },
    wordmark && { type: 'image', src: wordmark, x: wordX, y: wordY, w: wordW, start: start + 0.7, duration: dur - 0.7, anim: 'slide-left', enterDur: 0.6, out: 'defocus', exitDur: 0.4 },
    headline && kineticHeadline({ text: headline, x: 160, y: markY + 260, w: 1600, size: 78, weight: 700, each: 0.44, stagger: 0.05, start: start + 1.3, dur: dur - 1.3 }),
    sub && caption({ text: sub, x: 160, y: markY + 400, w: 1600, size: 38, start: start + 2.0, dur: dur - 2.0 }),
  ].filter(Boolean);
}

// logoReveal. The mark ASSEMBLES itself: a bloom swells behind it while the logo either DRAWS on
// (stroke, line-by-line) or MELTS into place from a blob (true shape-morph, optional spin), then the
// wordmark cascades in word-by-word. This is the "rotate/draw and morph into the logo" beat. Pass a raw
// SVG path in `mark` (the settled logo). For the melt, also pass `morphFrom` (the start shape); omit it to
// get the stroke draw-on, which now ends filled rather than as an outline. Give the mark prominence (size 260+).
// COORDS: `mark`/`morphFrom` are in the `viewBox` space (default "0 0 100 100"), NOT stage pixels, a path
// like "M50 10 L90 88 L10 88 Z" fills the box; the box is placed/sized by x/size. Path coords outside the
// viewBox render off-box (invisible) with no error. Pass a matching `viewBox` if your path uses other units.
export function logoReveal({ x, y = 360, size = 300, viewBox = '0 0 100 100', mark, morphFrom, spin = 0,
  wordmark, sub, color = ACCENT, canvasW = 1920, start = 0, dur = 5 } = {}) {
  const mx = x != null ? x : Math.round((canvasW - size) / 2);   // centre the mark box on the canvas
  const out = [
    // a bloom that SWELLS as the mark completes (attack-decay, not a strobe), light overflowing the mark
    { type: 'glow', x: mx - 70, y: y - 70, w: size + 140, h: size + 140, preset: 'bloom', intensity: 0.5,
      color, flash: { attack: 0.55, decay: 1.5, peak: 0.4 }, start: start + 0.6, duration: dur - 0.6 },
  ];
  if (mark && morphFrom) {
    out.push({ type: 'svg', x: mx, y, w: size, h: size, viewBox, d: morphFrom, fill: color,
      morph: { to: mark, dur: 1.5, spin, points: 200 }, start: start + 0.3, duration: dur - 0.3,
      anim: 'fade', enterDur: 0.3, out: 'defocus', exitDur: 0.4 });
  } else if (mark) {
    // The draw RESOLVES into the fill, so this branch ends as the mark exactly as the morph branch above
    // does. It used to end as an outline, which is not a logo reveal: the standard recipe uses the drawn
    // stroke as a matte for the real artwork. `ease` is the AE Easy Ease the write-on always wanted.
    out.push({ type: 'svg', x: mx, y, w: size, h: size, viewBox, d: mark, stroke: color, fill: color,
      draw: { dur: 1.3, weight: 3, ease: 'easeInOutCubic', fillDur: 0.4 },
      start: start + 0.3, duration: dur - 0.3, out: 'defocus', exitDur: 0.4 });
  }
  if (wordmark) out.push(kineticHeadline({ text: wordmark, x: 160, y: y + size + 70, w: canvasW - 320, size: 92,
    weight: 800, preset: 'up', each: 0.42, stagger: 0.05, color: INK, start: start + 1.7, dur: dur - 1.7 }));
  if (sub) out.push(caption({ text: sub, x: 160, y: y + size + 200, w: canvasW - 320, size: 38, start: start + 2.3, dur: dur - 2.3 }));
  return out;
}

// verdictProof. A claim PROVEN, not asserted: a typing command, a stats note, and a tone-coloured
// verdict chip that pops (the reading first, then the verdict on it).
export function verdictProof({ x = 360, y = 360, w = 1200, h = 300, title, prompt = '$', command, note,
  verdict = 'HOLDS', tone = 'ok', cps = 22, start = 0, dur = 5.5 } = {}) {
  const px = x + 50, py = y + 42;
  return [
    title && kineticHeadline({ text: title, x: 160, y: y - 170, w: 1600, size: 56, weight: 700, each: 0.32, stagger: 0.035, start, dur }),
    panel({ x, y, w, h, start: start + 0.3, dur: dur - 0.3 }),
    { type: 'text', text: prompt, x: px, y: py, w: 40, align: 'left', size: 32, weight: 700, font: 'mono', color: ACCENT, start: start + 0.6, duration: dur - 0.6 },
    { type: 'text', text: command, x: px + 50, y: py, w: w - 130, align: 'left', size: 30, weight: 500, font: 'mono', color: INK, typing: cps, start: start + 0.6, duration: dur - 0.6 },
    note && { type: 'text', text: note, x: px, y: py + 98, w: w - 300, align: 'left', size: 30, weight: 500, font: 'mono', color: DIM, anim: 'fade', enterDur: 0.4, start: start + 2.2, duration: dur - 2.2 },
    verdictChip({ text: verdict, tone, x: x + w - 350, y: py + 84, start: start + 2.6, dur: dur - 2.6 }),
  ].filter(Boolean);
}

// ctaEnd. The HELD end card: mark pops, the install command sits in an accent-bordered chip, a mono
// sub, the URL. Everything holds to the final frame (exitDur 0), never fade the payoff.
export function ctaEnd({ mark, markX = 895, markY = 250, markW = 130, command, sub, url, start = 0, dur = 3.6 } = {}) {
  return [
    mark && { type: 'image', src: mark, x: markX, y: markY, w: markW, start: start + 0.1, duration: dur - 0.1, anim: 'pop', enterDur: 0.6, exitDur: 0, fx: 'breathe' },
    command && { type: 'text', text: command, x: 660, y: 470, w: 600, align: 'center', size: 60, weight: 600, font: 'mono', color: INK, bg: 'var(--surface)', pad: '22px 40px', radius: 14, border: `2px solid ${ACCENT}`, start: start + 0.4, duration: dur - 0.4, anim: 'pop', enterDur: 0.5, exitDur: 0 },
    sub && { type: 'text', text: sub, x: 160, y: 640, w: 1600, align: 'center', size: 38, weight: 500, font: 'mono', color: DIM, start: start + 0.7, duration: dur - 0.7, anim: 'fade', enterDur: 0.6, exitDur: 0 },
    url && { type: 'text', text: url, x: 160, y: 730, w: 1600, align: 'center', size: 44, weight: 700, color: ACCENT, start: start + 1.0, duration: dur - 1.0, anim: 'pop', enterDur: 0.5, exitDur: 0 },
  ].filter(Boolean);
}

// ---- the keyed-motion register (docs/CRAFT/KEYED-MOTION.md) -----------------------------------------
// Two beats lifted from `higgsfield-recreation`, the exemplar. They exist because the mechanics that
// make that film read as a product film are otherwise reachable only by hand-writing the JSON, which is
// how the library ended up with ONE layer using motionBlur and ONE using untype.

// typedHook: the hook that ERASES ITSELF. Types in, holds, then un-types faster than it arrived, with a
// caret throughout and no fade (`exitDur: 0`). A fade-out is a way of declining to decide how something
// leaves; a typed line already knows. The untype rate is deliberately ~2x the type rate: writing is
// considered, deleting is not.
export function typedHook({ text, x = 368, y = 459, w = 1400, size = 126, weight = 700, color = INK,
  cps = 33, ls = '0.04em', start = 0, dur = 1.6 } = {}) {
  // glyphText: the caret walks textContent characters (core/layers/text.js stripLen), so the typing
  // time this blueprint budgets has to be counted the same way the renderer counts it.
  const chars = glyphText(text).length;
  const typeTime = chars / cps;
  // hold at least a beat once typed, then untype in the remainder
  const untypeAt = Math.max(typeTime + 0.25, dur - Math.max(0.3, chars / (cps * 2)));
  return [{
    type: 'text', text, x, y, w, align: 'left', size, weight, color, ls,
    typing: cps, untype: +untypeAt.toFixed(2), untypeRate: cps * 2, caret: true, caretHold: true,
    start, duration: dur, exitDur: 0,
  }];
}

// morphButton. The object that BECOMES the next thing: a labelled button that shrinks, rounds and sheds
// its label until it is a dot. Position keys cannot express this, so it runs on ONE progress variable
// with a different POWER per property, linear height, eased width, cubic radius (square until late,
// then suddenly round), and a label that leaves early on a squared term. One clock, many curves.
export function morphButton({ label = 'GENERATE', x = 764, y = 429, w = 392, h = 222,
  fill = 'var(--accent)', ink = 'var(--on-light)', shrink = 205, at = 1.45, over = 0.4,
  start = 0, dur = 2.7 } = {}) {
  const inner = `width:calc(${w}px - (var(--p,0) * 0.35 + var(--p,0) * var(--p,0) * 0.65) * ${shrink}px);`
    + `height:calc(${h}px - var(--p,0) * ${Math.round(h * 0.16)}px);`
    + `border-radius:calc(30px + var(--p,0) * var(--p,0) * var(--p,0) * 900px);`
    + `background:${fill};display:flex;align-items:center;justify-content:center`;
  const span = `opacity:calc(1 - var(--p,0) * var(--p,0) * 3.2);color:${ink};`
    + `font-family:var(--font-sans);font-size:30px;font-weight:800;letter-spacing:0.08em;white-space:nowrap`;
  return [{
    type: 'html', x, y, w,
    html: `<div style="width:${w}px;height:${h}px;display:flex;align-items:center;justify-content:center">`
      + `<div style="${inner}"><span style="${span}">${String(label)}</span></div></div>`,
    anim: 'fade', enterDur: 0.3, motionBlur: 0.16,
    vars: { '--p': [0, 1] }, varsDelay: at, varsDur: over, varsEase: 'linear',
    start, duration: dur,
  }];
}
