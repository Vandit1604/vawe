// blueprints/beats-mined.mjs: beats MINED from studied real films (grammar/*.json), not invented.
//
// WHY THIS FILE EXISTS. `make mine` reads the 17 studied grammars under grammar/ and clusters their
// shots by device (grammar/_mined-shapes.json is the receipt: which grammar + shot index backs each
// shape). Every factory below has a `sources:` line naming the grammar files and shot numbers it was
// measured off, the same discipline blueprints/beats-track.mjs and beats-punct.mjs already keep. A
// blueprint here fixes MOTION + STRUCTURE, never copy/colour/brand, exactly like every other beat file.
//
// Colours are semantic theme vars; coordinates are the 1920x1080 stage. Pure: props in, layers out.
import { INK, DIM, ACCENT, LINE, SURF2, caption, chip, panel, kineticHeadline } from './kit.mjs';

// blurResolveHook: a hook whose type arrives SMEARED with motion blur and snaps into focus. Nothing
// slides, fades or scales; the blur channel alone carries the entrance, which reads as speed in a
// single still frame the way a fade never does (docs/CRAFT `_patterns.json`, "Blur-resolve as the
// entrance"). sources: pin-1119918632363453012#1, pin-415034921941332045, pin-333759022406760643.
export function blurResolveHook({ text, x = 160, y = 400, w = 1600, size = 130, weight = 800,
  color = INK, align = 'center', font, blurFrom = 24, resolveAt = 0.4, sub, start = 0, dur = 2.4 } = {}) {
  const motion = [{ t: 0, blur: blurFrom }, { t: resolveAt, blur: 0, ease: 'easeOutCubic' }];
  const out = [{ type: 'text', text, x, y, w, align, size, weight, color, ...(font ? { font } : {}),
    start, duration: dur, anim: 'none', motion, out: 'fade', exitDur: 0.4 }];
  if (sub) out.push(caption({ text: sub, x, y: y + Math.round(size * 0.9), w,
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
  const bloomStart = start + 0.3 + pairs.length * stagger + 0.4;
  const bloomY = y + pairs.length * (size + rowGap);
  const out = [{ type: 'group', x, y, w, layout: 'column', gap: rowGap, start: start + 0.3,
    duration: Math.max(0.5, dur - 0.3), anim: 'pop', enterDur: 0.5, each: stagger, out: 'fade',
    exitDur: 0.4, children: rows }];
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
export function containerFill({ items = [], x = 460, y = 400, w = 1000, h = 220, gap = 28,
  itemSize = 42, glow = 0.28, stagger = 0.35, start = 0, dur = 4.5 } = {}) {
  const chips = items.map((t) => chip({ text: t, size: itemSize }));
  return [
    panel({ x, y, w, h, start, dur, glow }),
    { type: 'group', x: x + 40, y: y + Math.round((h - itemSize - 36) / 2), w: w - 80,
      layout: 'row', wrap: true, gap, start: start + 0.3, duration: Math.max(0.5, dur - 0.3),
      anim: 'pop', enterDur: 0.4, each: stagger, out: 'fade', exitDur: 0.3, children: chips },
  ];
}

// cardFan: N cards arrive from one side and FAN open in perspective around a fixed anchor, each a
// touch later and a touch more rotated than its neighbour. Measured off `pinref` shots 3, 5-7, where a
// phone's supporting panels repeatedly arrive from the right and fan. sources: pinref#3, #5, #6, #7.
export function cardFan({ cards = [], anchorX = 1350, anchorY = 540, cardW = 360, cardH = 220,
  radius = 18, spread = 26, arriveFrom = 500, stagger = 0.18, settleAt = 0.5, start = 0, dur = 3.5 } = {}) {
  const n = cards.length;
  const mid = (n - 1) / 2;
  return cards.map((c, i) => {
    const rot = Math.round((i - mid) * spread);
    const dx = Math.round((i - mid) * cardW * 0.42);
    const dy = Math.round(Math.abs(i - mid) * 18);
    const t0 = i * stagger;
    return {
      type: 'group', x: anchorX - Math.round(cardW / 2), y: anchorY - Math.round(cardH / 2),
      w: cardW, pad: 24, bg: 'var(--surface)', radius, border: `1.5px solid var(--line)`,
      layout: 'column', gap: 10,
      start: start + t0, duration: Math.max(0.4, dur - t0), anim: 'none', out: 'defocus', exitDur: 0.3,
      motion: [
        { t: 0, x: arriveFrom, rot: rot * 2, opacity: 0 },
        { t: settleAt, x: dx, y: dy, rot, opacity: 1, ease: 'easeOutCubic' },
      ],
      children: [
        c.title && { type: 'text', text: c.title, size: 30, weight: 700, color: INK },
        c.detail && { type: 'text', text: c.detail, size: 22, weight: 500, color: DIM, font: 'mono' },
      ].filter(Boolean),
    };
  });
}

// listBuildRows: a vertical list that BUILDS, one row landing after another under a fixed left rule,
// the list itself never resets. Measured off `pinref` shots 11-15, five consecutive shots each adding
// exactly one row to the same list. sources: pinref#11, #12, #13, #14, #15.
export function listBuildRows({ items = [], x = 240, y = 260, w = 900, rowH = 86, gap = 18,
  size = 40, weight = 600, dotColor = ACCENT, stagger = 0.5, start = 0, dur = 5 } = {}) {
  return items.map((label, i) => ({
    type: 'group', x, y: y + i * (rowH + gap), w, layout: 'row', items: 'center', gap: 20,
    start: start + i * stagger, duration: Math.max(0.4, dur - i * stagger),
    anim: 'slide-up', enterDur: 0.35, out: 'fade', exitDur: 0.3,
    children: [
      { type: 'rect', w: 12, h: 12, radius: 6, bg: dotColor },
      { type: 'text', text: label, size, weight, color: INK, font: 'mono' },
    ],
  }));
}

// chipConverge: a scattered ring of chips flies in from every side and then CONVERGES onto one point,
// the opposite choreography to a cascade. Measured off `pinref` shots 16-17, six status chips
// scattering in 3D and then resolving onto the phone. sources: pinref#16, #17.
export function chipConverge({ chips = [], targetX = 960, targetY = 540, radius = 480, size = 34,
  scatterAt = 0.55, start = 0, dur = 2.6 } = {}) {
  const n = chips.length || 1;
  return chips.map((t, i) => {
    const ang = (i / n) * Math.PI * 2;
    const sx = Math.round(Math.cos(ang) * radius), sy = Math.round(Math.sin(ang) * radius);
    return {
      type: 'text', text: t, x: targetX - 80, y: targetY - 20, w: 160, align: 'center',
      font: 'mono', size, weight: 600, color: INK, bg: SURF2, pad: '14px 22px', radius: 12,
      border: `1.5px solid ${LINE}`, start, duration: dur, anim: 'none', exitDur: 0,
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
export function cellMosaic({ cells = [], cols = 4, cellW = 260, cellH = 170, gap = 14,
  x = 0, y = 300, travel = -260, start = 0, dur = 3.5 } = {}) {
  const children = cells.map((c) => (c.image
    ? { type: 'image', src: c.image, w: cellW, h: cellH, radius: 12 }
    : { type: 'text', text: c.text, w: cellW, size: 30, weight: 700, color: INK }));
  return [{
    type: 'group', x, y, w: cols * (cellW + gap), layout: 'row', wrap: true, gap,
    start, duration: dur, anim: 'none', out: 'fade', exitDur: 0.3,
    motion: [{ t: 0, x: 0 }, { t: dur, x: travel, ease: 'linear' }],
    children,
  }];
}

// wordWipe: a word crosses the WHOLE frame far larger than the canvas, motion-blurred, and its passage
// IS the transition: what it reveals lands the instant it clears. Measured off `rebuilt` shot 4, whose
// scale contrast (one word ~8x the frame's own type) is the loudest frame in that film.
// sources: rebuilt#4.
export function wordWipe({ word, color = INK, size = 900, weight = 800, wipeAt = 0.4,
  revealText, subText, x = 0, w = 1920, y = 340, start = 0, dur = 1.8 } = {}) {
  const out = [{ type: 'text', text: word, x, y, w, align: 'center', size, weight, color,
    start, duration: Math.max(0.5, wipeAt + 0.3), anim: 'none', exitDur: 0, motionBlur: true,
    motion: [{ t: 0, x: -w }, { t: wipeAt, x: w, ease: 'easeInCubic' }] }];
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
    return { type: 'image', src: t, x: wx - 60 + i * 10, y: y - 220, w: 96,
      start, duration: dur, anim: 'none', out: 'fade', exitDur: 0.3,
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
    const layer = { type: 'image', src: image, x: cx, y: y + Math.round((tallest - h) / 2), w, h,
      radius: 12, start: start + i * 0.08,
      duration: Math.max(0.6, dur - i * 0.08), anim: 'scale', enterDur: 0.5, out: 'defocus', exitDur: 0.4 };
    cx += w + gap;
    return layer;
  });
  if (cap) layers.push(caption({ text: cap, x: 160, y: y + tallest + 60, w: 1600, size: 34,
    start: start + 0.6, dur: Math.max(0.4, dur - 0.6) }));
  return layers;
}
