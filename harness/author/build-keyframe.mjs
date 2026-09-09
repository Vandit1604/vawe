// Builds formats/scene/keyframe.json: a film about keyed motion that IS keyed motion.
// The timeline strip and the shape's motion track are generated from ONE list of keys, so the diamonds
// you see landing are literally the keys the shape is moving through. If they ever disagree the film is
// lying, and generating both from one source is the only way to be sure they cannot.
import fs from 'node:fs';

// t = seconds from the shape's start · x,y = where it goes · the path is a hand, not a curve
// The film's claim is "these keys ARE this motion", so the shape must ride directly above its own
// track: a key's x on the strip and the shape's x are the SAME number, derived from one mapping. The
// first cut had the shape crossing the top of the frame while its diamonds landed at the bottom, which
// looks related in time and is unrelated in space. The picture was not saying what the words said.
const STRIP = { x: 170, y: 726, w: 1580, h: 210 };
const SPAN = 2.1, PAD = 26;
const px = (t) => +(PAD + (STRIP.w - PAD * 2) * (t / SPAN)).toFixed(1);

// t = seconds from the shape's start · y = how high it rides · x comes from the track, never by hand
const WOBBLE = [
  [0.00, 0], [0.62, -34], [0.69, -58], [0.75, -66], [0.82, -44], [0.88, 12], [0.95, 72],
  [1.02, 128], [1.09, 168], [1.16, 190], [1.23, 176], [1.30, 132], [1.37, 74],
  [1.46, 20, 'easeOutCubic'], [1.70, 0, 'easeOutCubic'],
];
const KEYS = WOBBLE.map(([t, y, ease]) => ({ t, x: +(px(t) - px(0)).toFixed(1), y, ...(ease ? { ease } : {}) }));

const SHAPE_START = 1.25;                 // when the shape appears

// the strip: a ruler, a playhead riding the scene clock, and a diamond per key that pops as it is passed
const strip = () => {
  const W = STRIP.w, H = STRIP.h, pad = PAD;
  const out = [`<svg viewBox="0 0 ${W} ${H}" width="${W}" xmlns="http://www.w3.org/2000/svg">`];
  out.push(`<rect x="0" y="0" width="${W}" height="${H}" rx="12" fill="var(--surface-2)" stroke="var(--line)"/>`);
  for (let t = 0; t <= SPAN + 1e-6; t += 0.25) {
    const major = Math.abs(t * 2 - Math.round(t * 2)) < 1e-6;
    out.push(`<rect x="${px(t)}" y="${major ? 26 : 40}" width="1" height="${H - (major ? 62 : 76)}" fill="var(--line-strong)"/>`);
    if (major) out.push(`<text x="${px(t) + 8}" y="46" font-family="var(--font-mono)" font-size="22" fill="var(--dim)">${t.toFixed(2)}s</text>`);
  }
  out.push(`<rect x="${pad}" y="${H - 55}" width="${W - pad * 2}" height="6" rx="3" fill="var(--accent-dim)"/>`);
  out.push(`<text x="${pad}" y="${H - 14}" font-family="var(--font-mono)" font-size="20" fill="var(--dim)">motion track</text>`);
  // one diamond per key, popping at the instant the shape passes through it
  for (const k of KEYS) {
    const at = +(SHAPE_START + k.t).toFixed(3);
    const cx = px(k.t), cy = H - 52;
    out.push(`<g style="transform-box:view-box;transform-origin:${cx}px ${cy}px;`
      + `transform:scale(clamp(0,(var(--t,0) - ${at}) * 14,1));opacity:clamp(0,(var(--t,0) - ${at}) * 14,1)">`
      + `<rect x="${cx - 11}" y="${cy - 11}" width="22" height="22" rx="3" fill="var(--accent)" transform="rotate(45 ${cx} ${cy})"/></g>`);
  }
  // a hairline riding the playhead, joining the shape above to the key it is dropping below
  const p0 = px(0), p1 = px(SPAN);
  out.push(`<rect width="2" height="${H - 20}" y="10" fill="var(--text)" style="opacity:clamp(0,(var(--t,0) - ${SHAPE_START}) * 8,1);`
    + `x:calc(${p0}px + ${p1 - p0}px * clamp(0,(var(--t,0) - ${SHAPE_START}) / ${SPAN},1))"/>`);
  out.push('</svg>');
  return out.join('');
};

const scene = {
  module: 'scene',
  theme: 'vawe',
  aspect: '16:9',
  duration: 7.4,
  authoringNote: 'Authored from scratch to test whether the keyed-motion work makes rich motion reachable. '
    + 'The strip and the shape share ONE key list (scratchpad/build-keyframe.mjs), so the diamonds landing '
    + 'are the keys the shape moves through. 15 keys, dense enough that the new linear-under-0.14s default '
    + 'and auto motion blur both apply without being asked for.',
  layers: [
    { type: 'text', text: 'Fifteen keys.', x: 240, y: 300, w: 1200, size: 116, weight: 700,
      color: 'var(--text)', ls: '-0.02em', typing: 30, untype: 1.55, untypeRate: 60,
      caret: true, caretHold: true, start: 0.1, duration: 1.82, exitDur: 0 },
    { type: 'html', id: 'strip', x: STRIP.x, y: STRIP.y, w: STRIP.w, h: STRIP.h,
      start: 0.95, duration: 6.45, anim: 'fade', enterDur: 0.45, html: strip(),
      motion: [{ t: 0, y: 54 }, { t: 0.5, y: 0, ease: 'easeOutCubic' }] },
    { type: 'rect', id: 'shape', x: STRIP.x + PAD - 52, y: 418, w: 104, h: 104, radius: 24, bg: 'var(--accent)',
      start: SHAPE_START, duration: 6.15, anim: 'pop', enterDur: 0.34, motion: KEYS },
    { type: 'text', text: 'That is one second of motion.', x: 240, y: 300, w: 1400, size: 92,
      weight: 700, color: 'var(--text)', ls: '-0.02em', split: 'word', preset: 'up', each: 0.42,
      stagger: 0.045, start: 3.35, duration: 1.9, out: 'fade', exitDur: 0.3 },
    { type: 'text', text: 'You used to type them.', x: 240, y: 300, w: 1400, size: 92, weight: 700,
      color: 'var(--text-2)', ls: '-0.02em', anim: 'rise', enterDur: 0.5, start: 5.15, duration: 2.25, exitDur: 0,
      motion: [{ t: 0, y: 18 }, { t: 0.5, y: 0, ease: 'easeOutCubic' }] },
    { type: 'text', text: 'Now you drag.', x: 240, y: 424, w: 1400, size: 116, weight: 800,
      color: 'var(--accent)', ls: '-0.02em', split: 'word', preset: 'up', each: 0.5, stagger: 0.06,
      start: 5.75, duration: 1.65, exitDur: 0,
      motion: [{ t: 0, x: -26 }, { t: 0.55, x: 0, ease: 'easeOutCubic' }] },
  ],
  bg: [{ t: 0, preset: 'dotmatrix', mode: 'wave', period: 7, peakAlpha: 0.3 }],
};

fs.writeFileSync('formats/scene/keyframe.json', JSON.stringify(scene, null, 2) + '\n');
console.log(`wrote formats/scene/keyframe.json · ${KEYS.length} keys · ${scene.layers.length} layers`);
