// blueprints/beats-mined.mjs: beats MINED from studied real films (grammar/*.json), not invented.
//
// WHY THIS FILE EXISTS. `make mine` reads the 17 studied grammars under grammar/ and clusters their
// shots by device (grammar/_mined-shapes.json is the receipt: which grammar + shot index backs each
// shape). Every factory below has a `sources:` line naming the grammar files and shot numbers it was
// measured off, the same discipline blueprints/beats-track.mjs and beats-punct.mjs already keep. A
// blueprint here fixes MOTION + STRUCTURE, never copy/colour/brand, exactly like every other beat file.
//
// Colours are semantic theme vars; coordinates are the 1920x1080 stage. Pure: props in, layers out.
import { INK, DIM, ACCENT, LINE, SURF2, caption, kineticHeadline } from './kit.mjs';

// blurResolveHook: a hook whose type arrives SMEARED with motion blur and snaps into focus. Nothing
// slides, fades or scales; the blur channel alone carries the entrance, which reads as speed in a
// single still frame the way a fade never does (docs/CRAFT `_patterns.json`, "Blur-resolve as the
// entrance"). sources: pin-1119918632363453012#1, pin-415034921941332045, pin-333759022406760643.
export function blurResolveHook({ text, x = 160, y = 400, w = 1600, size = 130, weight = 800,
  color = INK, align = 'center', font, blurFrom = 24, resolveAt = 0.4, sub, start = 0, dur = 2.4 } = {}) {
  const motion = [{ t: 0, blur: blurFrom }, { t: resolveAt, blur: 0, ease: 'easeOutCubic' }];
  // exitDur 0: held to the beat's own end (docs/RULES/first-arrival.md), so a dissolve into the next
  // beat crosses real content rather than an already-faded field.
  const out = [{ type: 'text', text, x, y, w, align, size, weight, color, ...(font ? { font } : {}),
    start, duration: dur, anim: 'none', motion, out: 'fade', exitDur: 0 }];
  // The sub sits UNDER the headline's line box, not inside it: 0.9 x size landed it on the descenders
  // and validate flagged the two lines colliding at every size (found by the acceptance run, 2026-09-06).
  if (sub) out.push(caption({ text: sub, x, y: y + Math.round(size * 1.35), w,
    start: start + resolveAt + 0.15, dur: Math.max(0.4, dur - resolveAt - 0.15) }));
  return out;
}

// dialogueAccumulate: type does not travel, it ACCUMULATES word-pair by word-pair on a held frame, a
// small dot as the joint between the two voices of each pair, then a late line arrives big over a
// bloom. Measured off `rebuilt` shot 1 (9.5s, the film's whole open): the type never moves, only the
// ground blooms under the last line. sources: rebuilt#1.
export function dialogueAccumulate({ pairs = [], bloomLine, x = 160, y = 260, w = 1600, size = 88,
  gap = 46, rowGap = 28, dotColor = ACCENT, dotSize = 16, stagger = 0.9, start = 0, dur = 5.5 } = {}) {
  const rows = pairs.map((p) => ({ type: 'group', layout: 'row', items: 'center', gap, children: [
    p.sans && { type: 'text', text: p.sans, size, weight: 700, color: INK },
    { type: 'rect', w: dotSize, h: dotSize, radius: Math.round(dotSize / 2), bg: dotColor },
    p.serif && { type: 'text', text: p.serif, font: 'serif', size, weight: 500, color: DIM },
  ].filter(Boolean) }));
  // First row at start+0.15, inside the first-arrival window (docs/RULES/first-arrival.md, 0.1-0.3s),
  // not the 0.3s hold this beat used to give before anything appeared: as a hook (this beat opens the
  // `explainer` type spine, scripts/author/type-spines.mjs), frame 1 needs a ramp, not an empty hold.
  const FIRST = 0.15;
  const bloomStart = start + FIRST + pairs.length * stagger + 0.4;
  const bloomY = y + pairs.length * (size + rowGap);
  // exitDur 0: held to the beat's own end, see blurResolveHook above.
  const out = [{ type: 'group', x, y, w, layout: 'column', gap: rowGap, start: start + FIRST,
    duration: Math.max(0.5, dur - FIRST), anim: 'pop', enterDur: 0.5, each: stagger, out: 'fade',
    exitDur: 0, children: rows }];
  if (bloomLine) {
    out.push({ type: 'glow', x: x - 60, y: bloomY - 40, w: w + 120, h: Math.round(size * 2.4),
      preset: 'bloom', intensity: 0.45, color: dotColor,
      flash: { attack: 0.5, decay: 1.2, peak: 0.4 }, start: bloomStart,
      duration: Math.max(0.5, dur - (bloomStart - start)) });
    out.push(kineticHeadline({ text: bloomLine, x, y: bloomY + 20, w, size: Math.round(size * 1.15),
      weight: 800, each: 0.4, stagger: 0.05, start: bloomStart + 0.1,
      dur: Math.max(0.6, dur - (bloomStart - start) - 0.1) }));
  }
  return out;
}

// containerFill: a FIXED frame that never moves while its contents fill in one at a time, the cheapest
// continuity device the corpus has, the eye rests on the frame while the list grows. Measured off the
// pattern seen across four films: the container is the constant, the count is the variable.
// sources: pin-1119918632363453012#2, pin-583145851797705243, arc-space-swiping, pin-333759022406800725.
//
// Design Read: ONE `html` layer, the panel chrome and every chip in one fragment, `parts` fills the
// `.chip`s in one at a time. Flat surface, hairline border, mono pills, no gradient. Theme tokens:
// --surface/--line/--surface-2/--text/--font-mono.
export function containerFill({ items = [], x = 460, y = 400, w = 1000, h = 220, gap = 28,
  itemSize = 42, glow = 0.28, stagger = 0.35, start = 0, dur = 4.5 } = {}) {
  const chipHtml = (t) => `<div class="chip" style="box-sizing:border-box;font:500 ${itemSize}px var(--font-mono);`
    + `color:${INK};background:${SURF2};padding:18px 30px;border-radius:12px;border:1.5px solid ${LINE}">${t}</div>`;
  const html = `<div style="box-sizing:border-box;width:${w}px;height:${h}px;background:var(--surface);`
    + `border:1.5px solid ${LINE};border-radius:18px;display:flex;flex-wrap:wrap;align-content:center;`
    + `justify-content:flex-start;gap:${gap}px;padding:0 40px">${items.map(chipHtml).join('')}</div>`;
  // First arrival: 0.2s hold (docs/RULES/first-arrival.md), not the 0.3-0.4s this beat used to give the
  // chips before anything readable appeared. exitDur 0: held to the beat's own end (see blurResolveHook
  // above), so the outgoing side of a dissolve into/out of this beat still shows real content.
  return [{
    type: 'html', x, y, w, h, start, duration: dur, anim: 'scale', enterDur: 0.5, out: 'defocus', exitDur: 0, glow,
    html, parts: [{ select: '.chip', anim: 'popIn', each: 0.35, stagger, delay: 0.2, out: true, exitDur: 0.3 }],
  }];
}

// cardFan: N cards arrive from one side and FAN open in perspective around a fixed anchor, each a
// touch later and a touch more rotated than its neighbour. Measured off `pinref` shots 3, 5-7, where a
// phone's supporting panels repeatedly arrive from the right and fan. sources: pinref#3, #5, #6, #7.
//
// Design Read: PER-ITEM MOTION, so each card is its OWN `html` layer (the card is markup: title +
// mono detail on a flat surface), keeping the exact per-card `motion` track a `parts` fragment cannot
// express (`parts` staggers children of one fragment; this beat needs one fan angle per card).
export function cardFan({ cards = [], anchorX = 1350, anchorY = 540, cardW = 360, cardH = 220,
  radius = 18, spread = 26, arriveFrom = 500, stagger = 0.18, settleAt = 0.5, start = 0, dur = 3.5 } = {}) {
  const n = cards.length;
  const mid = (n - 1) / 2;
  return cards.map((c, i) => {
    const rot = Math.round((i - mid) * spread);
    const dx = Math.round((i - mid) * cardW * 0.42);
    const dy = Math.round(Math.abs(i - mid) * 18);
    const t0 = i * stagger;
    const html = `<div style="box-sizing:border-box;width:${cardW}px;height:${cardH}px;padding:24px;`
      + `background:var(--surface);border:1.5px solid var(--line);border-radius:${radius}px;`
      + `display:flex;flex-direction:column;gap:10px">`
      + (c.title ? `<div style="font:700 30px var(--font-sans);color:${INK}">${c.title}</div>` : '')
      + (c.detail ? `<div style="font:500 22px var(--font-mono);color:${DIM}">${c.detail}</div>` : '')
      + `</div>`;
    return {
      type: 'html', x: anchorX - Math.round(cardW / 2), y: anchorY - Math.round(cardH / 2),
      w: cardW, h: cardH, html,
      // exitDur 0: held to the beat's own end, see blurResolveHook above.
      start: start + t0, duration: Math.max(0.4, dur - t0), anim: 'none', out: 'defocus', exitDur: 0,
      motion: [
        { t: 0, x: arriveFrom, rot: rot * 2, opacity: 0 },
        { t: settleAt, x: dx, y: dy, rot, opacity: 1, ease: 'easeOutCubic' },
      ],
    };
  });
}

// listBuildRows: a vertical list that BUILDS, one row landing after another under a fixed left rule,
// the list itself never resets. Measured off `pinref` shots 11-15, five consecutive shots each adding
// exactly one row to the same list. sources: pinref#11, #12, #13, #14, #15.
//
// Design Read: ONE `html` layer for the whole list, `parts` reveals each `.row` in turn instead of a
// row-per-layer stack. A dot + mono label per row, flat, no chrome. Theme tokens: --text/--font-mono.
export function listBuildRows({ items = [], x = 240, y = 260, w = 900, rowH = 86, gap = 18,
  size = 40, weight = 600, dotColor = ACCENT, stagger = 0.5, start = 0, dur = 5 } = {}) {
  const rowHtml = (label) => `<div class="row" style="box-sizing:border-box;height:${rowH}px;display:flex;`
    + `align-items:center;gap:20px">`
    + `<div style="width:12px;height:12px;border-radius:6px;background:${dotColor};flex:none"></div>`
    + `<div style="font:${weight} ${size}px var(--font-mono);color:${INK}">${label}</div></div>`;
  const html = `<div style="box-sizing:border-box;width:${w}px;display:flex;flex-direction:column;`
    + `gap:${gap}px">${items.map(rowHtml).join('')}</div>`;
  // exitDur 0: held to the beat's own end, see blurResolveHook above.
  return [{
    type: 'html', x, y, w, start, duration: dur, anim: 'none', enterDur: 0, exitDur: 0,
    html, parts: [{ select: '.row', anim: 'fadeUp', each: 0.35, stagger, out: true, exitDur: 0.3 }],
  }];
}

// chipConverge: a scattered ring of chips flies in from every side and then CONVERGES onto one point,
// the opposite choreography to a cascade. Measured off `pinref` shots 16-17, six status chips
// scattering in 3D and then resolving onto the phone. sources: pinref#16, #17.
//
// Design Read: PER-ITEM MOTION (each chip has its own scatter angle + settle time), so each chip is
// its OWN `html` layer, a mono pill on a flat surface, keeping its exact `motion` track.
export function chipConverge({ chips = [], targetX = 960, targetY = 540, radius = 480, size = 34,
  scatterAt = 0.55, start = 0, dur = 2.6 } = {}) {
  const n = chips.length || 1;
  return chips.map((t, i) => {
    const ang = (i / n) * Math.PI * 2;
    const sx = Math.round(Math.cos(ang) * radius), sy = Math.round(Math.sin(ang) * radius);
    const html = `<div style="box-sizing:border-box;font:600 ${size}px var(--font-mono);color:${INK};`
      + `background:${SURF2};padding:14px 22px;border-radius:12px;border:1.5px solid ${LINE};`
      + `text-align:center">${t}</div>`;
    return {
      type: 'html', x: targetX - 80, y: targetY - 20, w: 160, html,
      start, duration: dur, anim: 'none', exitDur: 0,
      motion: [
        { t: 0, x: sx, y: sy, scale: 0.8, opacity: 0 },
        { t: Math.min(dur - 0.1, 0.35 + i * 0.03), x: sx, y: sy, scale: 1, opacity: 1, ease: 'easeOutCubic' },
        { t: Math.min(dur, scatterAt + i * 0.02 + 0.2), x: 0, y: 0, scale: 0.9, opacity: 1, ease: 'easeInOutCubic' },
      ],
    };
  });
}

// cellMosaic: a GRID of cells that travels as ONE object while every cell keeps its own content, so
// words and pictures cross cell boundaries together instead of reading as separate slides. Measured
// off `rebuilt` shot 3, its busiest shot (motion 5.77), a dark grid sliding under dotted rules.
// sources: rebuilt#3.
//
// Design Read: the GROUP's motion (one slide track, unchanged) still carries the whole grid as one
// object. Only a cell's OWN representation changes: a text cell is drawn UI, so it is an `html` layer
// (a plain sans label); an image cell is already a real picture and stays `type:'image'`.
export function cellMosaic({ cells = [], cols = 4, cellW = 260, cellH = 170, gap = 14,
  x = 0, y = 300, travel = -260, start = 0, dur = 3.5 } = {}) {
  const children = cells.map((c) => (c.image
    ? { type: 'image', src: c.image, w: cellW, h: cellH, radius: 12 }
    : { type: 'html', w: cellW, h: cellH, html: `<div style="box-sizing:border-box;width:${cellW}px;`
      + `height:${cellH}px;display:flex;align-items:center;font:700 30px var(--font-sans);`
      + `color:${INK}">${c.text}</div>` }));
  return [{
    type: 'group', x, y, w: cols * (cellW + gap), layout: 'row', wrap: true, gap,
    // exitDur 0: held to the beat's own end, see blurResolveHook above.
    start, duration: dur, anim: 'none', out: 'fade', exitDur: 0,
    motion: [{ t: 0, x: 0 }, { t: dur, x: travel, ease: 'linear' }],
    children,
  }];
}

// wordWipe: a word crosses the WHOLE frame far larger than the canvas, motion-blurred, and its passage
// IS the transition: what it reveals lands the instant it clears. Measured off `rebuilt` shot 4, whose
// scale contrast (one word ~8x the frame's own type) is the loudest frame in that film.
// sources: rebuilt#4.
export function wordWipe({ word, color = INK, size = 560, scale = 1.6, weight = 800, wipeAt = 0.4,
  revealText, subText, x = 0, w = 1920, y = 340, start = 0, dur = 1.8 } = {}) {
  // The schema caps `size` at 560; the frame-fill look (a word ~8x the frame's own type) comes from
  // the track's `scale`, so the word is set at the cap and scaled up, not written past it.
  const out = [{ type: 'text', text: word, x, y, w, align: 'center', size, weight, color,
    start, duration: Math.max(0.5, wipeAt + 0.3), anim: 'none', exitDur: 0, motionBlur: true,
    motion: [{ t: 0, x: -w, scale }, { t: wipeAt, x: w, scale, ease: 'easeInCubic' }] }];
  if (revealText) out.push(caption({ text: revealText, x: 160, y: y + 40, w: 1600, size: 40,
    weight: 600, color: ACCENT, start: start + wipeAt, dur: Math.max(0.4, dur - wipeAt) }));
  if (subText) out.push(caption({ text: subText, x: 160, y: y + 100, w: 1600, size: 30,
    start: start + wipeAt + 0.2, dur: Math.max(0.3, dur - wipeAt - 0.2) }));
  return out;
}

// wordmarkAssemble: the mark's LETTERS settle from scattered positions while small tiles drift slowly
// at a different depth behind it, so the brand assembles itself rather than simply appearing. Measured
// off `rebuilt` shot 5, the last shot: cards tumbling, tiles drifting, a wordmark scrambling into
// place, ending on the mark alone. sources: rebuilt#5.
export function wordmarkAssemble({ wordmark, tiles = [], x, y = 460, size = 92, canvasW = 1920,
  scatterR = 260, settleAt = 0.9, start = 0, dur = 3.2 } = {}) {
  const wx = x != null ? x : Math.round((canvasW - 600) / 2);
  const n = tiles.length || 1;
  const bg = tiles.map((t, i) => {
    const ang = (i / n) * Math.PI * 2;
    const dx = Math.round(Math.cos(ang) * (scatterR + 120));
    const dy = Math.round(Math.sin(ang) * (scatterR + 120) * 0.5);
    // exitDur 0: held to the beat's own end, see blurResolveHook above.
    return { type: 'image', src: t, x: wx - 60 + i * 10, y: y - 220, w: 96,
      start, duration: dur, anim: 'none', out: 'fade', exitDur: 0,
      motion: [
        { t: 0, x: dx, y: dy, opacity: 0 },
        { t: 0.4, x: dx, y: dy, opacity: 0.7, ease: 'easeOutCubic' },
        { t: dur, x: Math.round(dx * 1.1), y: dy - 12, opacity: 0.5, ease: 'linear' },
      ] };
  });
  const mark = kineticHeadline({ text: wordmark, x: 160, y, w: canvasW - 320, size, weight: 800,
    preset: 'scale', each: 0.5, stagger: 0.06, start: start + settleAt, dur: Math.max(0.6, dur - settleAt) });
  return [...bg, mark];
}

// viewportTrio: the same subject at THREE sizes at once, the payoff shot that says "it is really
// finished". Measured off `framer-hero` shot 2 (t=17.2s, its loudest peak): the finished site shown in
// three viewports simultaneously. sources: framer-hero#2.
export function viewportTrio({ image, caption: cap, sizes = [280, 460, 760], gap = 60,
  y = 300, start = 0, dur = 3.4 } = {}) {
  const totalW = sizes.reduce((a, b) => a + b, 0) + gap * (sizes.length - 1);
  const tallest = Math.round(sizes[sizes.length - 1] * 0.62);
  let cx = Math.round((1920 - totalW) / 2);
  const layers = sizes.map((w, i) => {
    const h = Math.round(w * 0.62);
    // No `border` on an image: core/layers/image.js never reads it and the expander refuses a prop
    // that is set and never read (the same defect that kept screenDive from rendering).
    // exitDur 0: held to the beat's own end (docs/RULES/first-arrival.md), so a dissolve out of this
    // beat crosses real content rather than an already-faded field.
    const layer = { type: 'image', src: image, x: cx, y: y + Math.round((tallest - h) / 2), w, h,
      radius: 12, start: start + i * 0.08,
      duration: Math.max(0.6, dur - i * 0.08), anim: 'scale', enterDur: 0.5, out: 'defocus', exitDur: 0 };
    cx += w + gap;
    return layer;
  });
  if (cap) layers.push(caption({ text: cap, x: 160, y: y + tallest + 60, w: 1600, size: 34,
    start: start + 0.6, dur: Math.max(0.4, dur - 0.6) }));
  return layers;
}
