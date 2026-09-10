// blueprints/beats.mjs: the BEAT LIBRARY. Each factory is a pure props → array-of-richly-animated-layers
// for one whole beat, with the direction baked in (kinetic reveals, overshoot, cascades, count-ups, ken
// push, cursor). Compose a video as a sequence of beats + brand content; the good motion is the default.
//
// A beat fixes MOTION and STRUCTURE, never copy/colour/brand. Those come from props + the theme, so two
// brands using the same beat still differ (the ledger/similarity gate enforce it). Placed in a scene as
//   { "type": "beat", "beat": "kineticHook", "start": 0.3, "dur": 5.5, "eyebrow": "...", "to": 94, ... }
// and expanded at load (core/engine/expand.js), no separate step. See docs/CRAFT/BLUEPRINTS.md.
import { INK, DIM, ACCENT, LINE, SURF2, kineticHeadline, dollyNumber, caption, verdictChip } from './kit.mjs';
import { glyphText } from '../core/type/on-screen-text.js';

// kineticHook: the OPEN LOOP. An eyebrow question, a hero number (count-up + pop) OR a big kinetic word,
// then a word-by-word subline. Front-loads the strong element (DIRECTION.md §4).
// `heroSize` overrides the count's own size (360 unchanged if omitted); a theme's `look.scale.hook`
// (core/registry/theme-contract.js W8) is the one caller that passes it, so a brand's hook scale is real
// without every existing kineticHook call needing to change. `captionSize` overrides the subline (74
// unchanged if omitted), from `look.scale.caption`, same optional-kwarg shape.
export function kineticHook({ x = 160, y = 160, w = 1600, eyebrow, to, unit = '', decimals, word, wordSize = 300,
  heroSize = 360, sub, captionSize, start = 0, dur = 5.5 } = {}) {
  const out = [];
  if (eyebrow) out.push(caption({ text: eyebrow, x, y: y + 90, w, size: 56, start, dur }));
  // The hero's own entrance offset: 0.4s when an eyebrow already fills frame 1 (the hero landing later
  // is a build, not an empty hold), 0.15s when it does not, so the very first thing on screen in a
  // no-eyebrow hook still shows up inside the first-arrival window (docs/RULES/first-arrival.md,
  // 0.1-0.3s) rather than holding on an empty frame until 0.4s in.
  const heroAt = eyebrow ? 0.4 : 0.15;
  if (to != null) out.push(dollyNumber({ to, unit, decimals, x, y: y + 190, w, size: heroSize, start: start + heroAt, dur: dur - heroAt }));
  else if (word) out.push(kineticHeadline({ text: word, x, y: y + 190, w, size: wordSize, weight: 800, preset: 'scale', each: 0.34, start: start + heroAt, dur: dur - heroAt }));
  if (sub) out.push(kineticHeadline({ text: sub, x, y: y + 620, w, size: captionSize || 74, weight: 700, start: start + 1.9, dur: dur - 1.9 }));
  return out;
}

// statReveal: the PAYOFF. A hero count-up + a kinetic label. Held long (the release the build earned).
// `heroSize` overrides the count's own size (320 unchanged if omitted): a theme's `look.scale.headline`.
// `captionSize` overrides the label under it (48 unchanged if omitted), from `look.scale.caption`.
export function statReveal({ x = 160, y = 330, w = 1600, to, unit = '', decimals, prefix, label,
  heroSize = 320, captionSize, start = 0, dur = 3.6 } = {}) {
  return [
    dollyNumber({ to, unit, decimals, prefix, x, y, w, size: heroSize, start, dur }),
    label && kineticHeadline({ text: label, x, y: y + 380, w, size: captionSize || 48, weight: 600, each: 0.3, stagger: 0.03, start: start + 0.9, dur: dur - 0.9 }),
  ].filter(Boolean);
}

// cardCascade. A FEATURE GRID that proves density: a kinetic title + N cards that pop in one after
// another (follow-through/staging). Each card = name (accent) + desc (body) + a mono command/detail.
// `heroSize` overrides each card's desc/body text (26 unchanged if omitted): a theme's `look.scale.body`
// (core/registry/theme-contract.js W8) is the one caller that passes it, the same optional-kwarg,
// unchanged-default shape as `kineticHook`'s `heroSize` (blueprints/kit.mjs doc, docs/CRAFT/THEME-LOOK.md).
//
// Design Read: ONE `html` layer, a flex-wrapped row of hairline-bordered cards (flat surface, one
// accent reserved for the name), `parts` pops each `.card` in turn instead of a rect/text stack per
// card. No gradient, no card-in-card. Theme tokens only: --surface/--line/--accent/--text-2/--dim/
// --font-sans/--font-serif/--font-mono.
export function cardCascade({ x = 197, y = 300, w = 1526, title, cards = [], cols = 3, cardW = 490,
  heroSize, start = 0, dur = 8 } = {}) {
  const bodySize = heroSize || 26;
  const cardHtml = (c) => `<div class="card" style="box-sizing:border-box;width:${cardW}px;padding:28px;`
    + `background:var(--surface);border:1.5px solid var(--line);border-radius:18px;display:flex;`
    + `flex-direction:column;gap:12px">`
    + `<div style="font:700 36px var(--font-sans);color:${ACCENT}">${c.name}</div>`
    + (c.desc ? `<div style="font:500 ${bodySize}px var(--font-serif);color:var(--text-2)">${c.desc}</div>` : '')
    + (c.detail ? `<div style="font:500 22px var(--font-mono);color:${DIM}">${c.detail}</div>` : '')
    + `</div>`;
  const html = `<div style="box-sizing:border-box;display:flex;flex-wrap:wrap;gap:28px;width:${w}px">`
    + `${cards.map(cardHtml).join('')}</div>`;
  return [
    title && kineticHeadline({ text: title, x: 160, y: y - 150, w: 1600, size: 62, weight: 700, each: 0.36, stagger: 0.04, start, dur }),
    // exitDur 0: held to the beat's own end (docs/RULES/first-arrival.md), so a dissolve into the next
    // beat crosses real content rather than an already-faded field. `parts` pops each `.card` in turn,
    // the same follow-through the old rect-stack group gave for free (core/motion/parts.js).
    { type: 'html', x, y, w, start: start + 0.4, duration: dur - 0.4, anim: 'none', enterDur: 0, exitDur: 0,
      html, parts: [{ select: '.card', anim: 'popIn', each: 0.46, stagger: 0.06, out: true, exitDur: 0.3 }] },
  ].filter(Boolean);
}

// chipGrid: NAMED things (sources, integrations, tools) as mono pills that pop in staggered, with an
// accent footer line. Backs a "reads every X" / "works with Y" claim by SHOWING the set.
// `bodySize` overrides each chip's own text (34 unchanged if omitted), from `look.scale.body`;
// `captionSize` overrides the footer line (40 unchanged if omitted), from `look.scale.caption`. Same
// optional-kwarg, unchanged-default shape as `kineticHook`'s `heroSize` (docs/CRAFT/THEME-LOOK.md
// "Left undone" note names this beat as the next slice of that work).
//
// Design Read: ONE `html` layer, mono pills in a flex-wrapped row, `parts` pops each `.chip` in turn.
// Flat surface, hairline border, no gradient. Theme tokens only: --surface-2/--line/--text/--font-mono.
export function chipGrid({ x = 300, y = 380, w = 1320, title, chips = [], cols = 4, footer,
  bodySize, captionSize, start = 0, dur = 6.5 } = {}) {
  const size = bodySize || 34;
  const chipHtml = (t) => `<div class="chip" style="box-sizing:border-box;font:500 ${size}px var(--font-mono);`
    + `color:${INK};background:${SURF2};padding:18px 30px;border-radius:12px;border:1.5px solid ${LINE}">${t}</div>`;
  const html = `<div style="box-sizing:border-box;display:flex;flex-wrap:wrap;gap:26px;width:${w}px">`
    + `${chips.map(chipHtml).join('')}</div>`;
  return [
    title && kineticHeadline({ text: title, x: 160, y: y - 180, w: 1600, size: 62, weight: 700, preset: 'scale', each: 0.34, stagger: 0.035, start, dur }),
    // exitDur 0: held to the beat's own end, see cardCascade above.
    { type: 'html', x, y, w, start: start + 0.4, duration: dur - 0.4, anim: 'none', enterDur: 0, exitDur: 0,
      html, parts: [{ select: '.chip', anim: 'popIn', each: 0.5, stagger: 0.05, out: true, exitDur: 0.3 }] },
    footer && caption({ text: footer, x: 160, y: y + 380, w: 1600, size: captionSize || 40, weight: 600, color: ACCENT, anim: 'pop', start: start + 1.5, dur: dur - 1.5 }),
  ].filter(Boolean);
}

// terminalReveal. The product IS a CLI: a light panel, a typing command with a cursor, output that
// rises in word-by-word, and an accent result. A live demo, not a screenshot of one.
//
// Design Read: the window chrome (the panel behind the prompt) is ONE `html` layer, a flat surface
// with a hairline border, no gradient. The typing prompt/command/cursor/output/result stay real
// layers BESIDE the fragment: `typing`/`caret` and the `cursor` path are engine-owned clocks a static
// fragment cannot reproduce (no CSS animation), so they sit on top of the chrome at the same absolute
// coordinates the panel used to anchor them at.
// `bodySize` overrides the command's own size (34 unchanged if omitted): a theme's `look.scale.body`.
// `captionSize` overrides the output lines (28 unchanged if omitted), from `look.scale.caption`. Same
// optional-kwarg, unchanged-default shape as `kineticHook`'s `heroSize` (docs/CRAFT/THEME-LOOK.md).
export function terminalReveal({ x = 360, y = 330, w = 1200, h = 470, title, prompt = '$', command,
  output = [], result, cps = 16, bodySize, captionSize, start = 0, dur = 6.7 } = {}) {
  const px = x + 50, py = y + 42;
  const cmdSize = bodySize || 34, outSize = captionSize || 28;
  const chromeHtml = `<div style="box-sizing:border-box;width:${w}px;height:${h}px;background:var(--surface);`
    + `border:1.5px solid var(--line);border-radius:18px"></div>`;
  const L = [
    title && kineticHeadline({ text: title, x: 160, y: y - 160, w: 1600, size: 58, weight: 700, each: 0.34, stagger: 0.035, start, dur }),
    // Same anim/glow as kit.mjs's `panel()` (a whole-layer effect, applies to `html` exactly as it did
    // to `rect`, docs/CRAFT/HTML-FRAGMENTS.md): scales in with a whisper of glow, holds to the beat end.
    { type: 'html', x, y, w, h, html: chromeHtml, start: start + 0.2, duration: dur - 0.2,
      anim: 'scale', enterDur: 0.5, out: 'defocus', exitDur: 0, glow: 0.22 },
    { type: 'text', text: prompt, x: px, y: py, w: 40, align: 'left', size: 34, weight: 700, font: 'mono', color: ACCENT, start: start + 0.6, duration: dur - 0.6 },
    { type: 'text', text: command, x: px + 52, y: py, w: w - 130, align: 'left', size: cmdSize, weight: 500, font: 'mono', color: INK, typing: cps, start: start + 0.6, duration: dur - 0.6 },
    { type: 'cursor', size: 34, start: start + 1.4, duration: 0.9, path: [{ t: 0, x: px + 340, y: py + 20 }, { t: 0.5, x: px + 340, y: py + 20 }] },
  ];
  output.forEach((line, i) => L.push({ type: 'text', text: line, x: px, y: py + 88 + i * 50, w: w - 100, align: 'left', size: outSize, weight: 500, font: 'mono', color: DIM, split: 'word', preset: 'up', each: 0.3, stagger: 0.02, start: start + 2.1 + i * 0.4, duration: dur - 2.1 - i * 0.4 }));
  if (result) L.push({ type: 'text', text: result, x: px, y: y + h - 60, w: w - 100, align: 'left', size: 32, weight: 600, font: 'mono', color: ACCENT, anim: 'pop', enterDur: 0.5, start: start + 2.1 + output.length * 0.4 + 1.0, duration: 1.0 });
  return L.filter(Boolean);
}

// screenDive. The payoff PRODUCT surface: a kinetic title, then the real UI capture/screenshot that
// KEN-PUSHES in (zoom into the dashboard, not a static card), plus a mono caption. Pair with a
// `cinematicZoom` seam at `start` for the dive-in (docs/MOTION-SNIPPETS.md dive-in).
// `captionSize` overrides the mono caption under the shot (36 unchanged if omitted), from
// `look.scale.caption`. Same optional-kwarg, unchanged-default shape as `kineticHook`'s `heroSize`.
export function screenDive({ x = 626, y = 195, w = 668, title, image, caption: cap, zoom = [1.0, 1.28],
  captionSize, start = 0, dur = 7 } = {}) {
  return [
    title && kineticHeadline({ text: title, x: 160, y: 108, w: 1600, size: 58, weight: 700, preset: 'scale', each: 0.3, stagger: 0.03, start, dur }),
    // No `border` here: core/layers/image.js never reads it, and the expander refuses a prop that is
    // set and never read, which is why this beat's preview failed to render. The hairline lives on
    // the surface behind a capture, not on the image itself.
    // exitDur 0: held to the beat's own end, see cardCascade above.
    { type: 'image', src: image, x, y, w, radius: 14, start: start + 0.3, duration: dur - 0.6, anim: 'scale', enterDur: 0.55, out: 'defocus', exitDur: 0, ken: { from: zoom[0], to: zoom[1] } },
    cap && caption({ text: cap, x: 160, y: 918, w: 1600, size: captionSize || 36, start: start + 0.6, dur: dur - 0.6 }),
  ].filter(Boolean);
}

// logoLockup. The BRAND beat: the real mark pops (ken drift), the wordmark travels in, a kinetic
// headline, a mono sub. Give the logo prominence (a deliberate element, not a bullet).
//
// No plate/panel behind the mark+wordmark today: the beat is two images on the bare backdrop plus type
// (docs/CRAFT/HTML-FRAGMENTS.md's "html counts as a picture" note is about hand-authored markup; this
// beat has none to convert). `bodySize` overrides the headline's own size (78 unchanged if omitted): a
// theme's `look.scale.body`. `captionSize` overrides the sub (38 unchanged if omitted), from
// `look.scale.caption`. Same optional-kwarg, unchanged-default shape as `kineticHook`'s `heroSize`.
export function logoLockup({ markX = 690, markY = 300, markW = 150, wordX = 860, wordY = 322, wordW = 470,
  mark, wordmark, headline, sub, bodySize, captionSize, start = 0, dur = 5.5 } = {}) {
  return [
    // exitDur 0 on both: held to the beat's own end, see cardCascade above. Mark at +0.3, not +0.4: the
    // engine no longer fades a layer's default exit (core/timeline/clips.js exitDurOf), so the PRECEDING
    // beat now holds crisply to its own end with nothing trailing into the cut. A first entrance further
    // out than the beat-check dead-air breath threshold (0.4s) then reads as a stall, not a beat of
    // rest. 0.3s stays inside first-arrival.md's own 0.1-0.3s window and under that threshold.
    mark && { type: 'image', src: mark, x: markX, y: markY, w: markW, start: start + 0.3, duration: dur - 0.3, anim: 'pop', enterDur: 0.6, out: 'defocus', exitDur: 0, ken: { from: 1.0, to: 1.05 } },
    wordmark && { type: 'image', src: wordmark, x: wordX, y: wordY, w: wordW, start: start + 0.7, duration: dur - 0.7, anim: 'slide-left', enterDur: 0.6, out: 'defocus', exitDur: 0 },
    headline && kineticHeadline({ text: headline, x: 160, y: markY + 260, w: 1600, size: bodySize || 78, weight: 700, each: 0.44, stagger: 0.05, start: start + 1.3, dur: dur - 1.3 }),
    sub && caption({ text: sub, x: 160, y: markY + 400, w: 1600, size: captionSize || 38, start: start + 2.0, dur: dur - 2.0 }),
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
// `bodySize` overrides the wordmark's own size (92 unchanged if omitted): a theme's `look.scale.body`.
// `captionSize` overrides the sub (38 unchanged if omitted), from `look.scale.caption`. Same
// optional-kwarg, unchanged-default shape as `kineticHook`'s `heroSize`.
export function logoReveal({ x, y = 360, size = 300, viewBox = '0 0 100 100', mark, morphFrom, spin = 0,
  wordmark, sub, color = ACCENT, canvasW = 1920, bodySize, captionSize, start = 0, dur = 5 } = {}) {
  const mx = x != null ? x : Math.round((canvasW - size) / 2);   // centre the mark box on the canvas
  const out = [
    // a bloom that SWELLS as the mark completes (attack-decay, not a strobe), light overflowing the mark
    { type: 'glow', x: mx - 70, y: y - 70, w: size + 140, h: size + 140, preset: 'bloom', intensity: 0.5,
      color, flash: { attack: 0.55, decay: 1.5, peak: 0.4 }, start: start + 0.6, duration: dur - 0.6 },
  ];
  if (mark && morphFrom) {
    out.push({ type: 'svg', x: mx, y, w: size, h: size, viewBox, d: morphFrom, fill: color,
      morph: { to: mark, dur: 1.5, spin, points: 200 }, start: start + 0.3, duration: dur - 0.3,
      // exitDur 0: held to the beat's own end, see cardCascade above.
      anim: 'fade', enterDur: 0.3, out: 'defocus', exitDur: 0 });
  } else if (mark) {
    // The draw RESOLVES into the fill, so this branch ends as the mark exactly as the morph branch above
    // does. It used to end as an outline, which is not a logo reveal: the standard recipe uses the drawn
    // stroke as a matte for the real artwork. `ease` is the AE Easy Ease the write-on always wanted.
    out.push({ type: 'svg', x: mx, y, w: size, h: size, viewBox, d: mark, stroke: color, fill: color,
      draw: { dur: 1.3, weight: 3, ease: 'easeInOutCubic', fillDur: 0.4 },
      // exitDur 0: held to the beat's own end, see cardCascade above.
      start: start + 0.3, duration: dur - 0.3, out: 'defocus', exitDur: 0 });
  }
  if (wordmark) out.push(kineticHeadline({ text: wordmark, x: 160, y: y + size + 70, w: canvasW - 320, size: bodySize || 92,
    weight: 800, preset: 'up', each: 0.42, stagger: 0.05, color: INK, start: start + 1.7, dur: dur - 1.7 }));
  if (sub) out.push(caption({ text: sub, x: 160, y: y + size + 200, w: canvasW - 320, size: captionSize || 38, start: start + 2.3, dur: dur - 2.3 }));
  return out;
}

// verdictProof. A claim PROVEN, not asserted: a typing command, a stats note, and a tone-coloured
// verdict chip that pops (the reading first, then the verdict on it).
//
// Design Read: the panel behind the reading is ONE `html` layer, same flat surface as terminalReveal's
// chrome. The typing command and the tone verdict chip stay real layers (typing is engine-owned; the
// chip is a tiny result badge, not UI chrome, left as kit.mjs's `verdictChip` text pill).
// `bodySize` overrides the command's own size (30 unchanged if omitted): a theme's `look.scale.body`.
// `captionSize` overrides the note (30 unchanged if omitted), from `look.scale.caption`. Same
// optional-kwarg, unchanged-default shape as `kineticHook`'s `heroSize`.
export function verdictProof({ x = 360, y = 360, w = 1200, h = 300, title, prompt = '$', command, note,
  verdict = 'HOLDS', tone = 'ok', cps = 22, bodySize, captionSize, start = 0, dur = 5.5 } = {}) {
  const px = x + 50, py = y + 42;
  const chromeHtml = `<div style="box-sizing:border-box;width:${w}px;height:${h}px;background:var(--surface);`
    + `border:1.5px solid var(--line);border-radius:18px"></div>`;
  return [
    title && kineticHeadline({ text: title, x: 160, y: y - 170, w: 1600, size: 56, weight: 700, each: 0.32, stagger: 0.035, start, dur }),
    { type: 'html', x, y, w, h, html: chromeHtml, start: start + 0.3, duration: dur - 0.3,
      anim: 'scale', enterDur: 0.5, out: 'defocus', exitDur: 0, glow: 0.22 },
    { type: 'text', text: prompt, x: px, y: py, w: 40, align: 'left', size: 32, weight: 700, font: 'mono', color: ACCENT, start: start + 0.6, duration: dur - 0.6 },
    { type: 'text', text: command, x: px + 50, y: py, w: w - 130, align: 'left', size: bodySize || 30, weight: 500, font: 'mono', color: INK, typing: cps, start: start + 0.6, duration: dur - 0.6 },
    note && { type: 'text', text: note, x: px, y: py + 98, w: w - 300, align: 'left', size: captionSize || 30, weight: 500, font: 'mono', color: DIM, anim: 'fade', enterDur: 0.4, start: start + 2.2, duration: dur - 2.2 },
    verdictChip({ text: verdict, tone, x: x + w - 350, y: py + 84, start: start + 2.6, dur: dur - 2.6 }),
  ].filter(Boolean);
}

// ctaEnd. The HELD end card: mark pops, the install command sits in an accent-bordered chip, a mono
// sub, the URL. Everything holds to the final frame (exitDur 0), never fade the payoff.
//
// Design Read: the install command is drawn UI (a bordered pill), so it is ONE `html` layer, same
// pop/exitDur-0 as before, a whole-layer effect that applies to `html` exactly as it did to `text`.
export function ctaEnd({ mark, markX = 895, markY = 250, markW = 130, command, sub, url, start = 0, dur = 3.6 } = {}) {
  const buttonHtml = command != null ? `<div style="box-sizing:border-box;font:600 60px var(--font-mono);`
    + `color:var(--ink);background:var(--surface);padding:22px 40px;border-radius:14px;`
    + `border:2px solid var(--accent);text-align:center">${command}</div>` : '';
  return [
    mark && { type: 'image', src: mark, x: markX, y: markY, w: markW, start: start + 0.1, duration: dur - 0.1, anim: 'pop', enterDur: 0.6, exitDur: 0, fx: 'breathe' },
    command && { type: 'html', x: 660, y: 470, w: 600, html: buttonHtml, start: start + 0.4, duration: dur - 0.4, anim: 'pop', enterDur: 0.5, exitDur: 0 },
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
