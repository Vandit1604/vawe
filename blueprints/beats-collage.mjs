// blueprints/beats-collage.mjs — the two COLLAGE beats measured off `brew-launch-act1`, the densest
// film in this library. Both exist for the same reason: the frames an author reaches for by hand are
// one headline and one supporting line, and brew's best two beats are neither.
//
// `propSentence` is the answer to "a film of pure type is a failed film" (CLAUDE.md §2a0000): a claim
// whose NOUNS are pictures makes the claim without setting it in type. `slotSwap` is the answer to
// "a slideshow is still a failure" (§2a000) in a register the continuous-object rule cannot see: the
// geometry holds and the world inside it turns over, so three shots read as one.
//
// Colours are SEMANTIC theme vars, so both beats are brand-agnostic. Coordinates are the 1920x1080 stage.
import { INK, ACCENT, LINE, SURF2 } from './kit.mjs';

// The colour wave brew lights every word of a collage with: each word arrives in the accent and settles
// to the resting colour. `flash` is left unset so it takes the THEME's accent rather than freezing
// brew's hex here.
//
// KNOW THE LIMIT. A colour-wave word writes its own colour on every frame, so the engine's per-window
// automatic ink (`inkAt`, formats/scene/scene.js) never reaches it: the word settles to whatever `rest`
// says regardless of what is behind it. On a light backdrop the default is right and nothing needs
// saying; over a DARK bg window, pass `wordColor` / `labelColor` or the words settle into the backdrop
// and vanish.
const wave = (rest) => ({ color: rest, split: 'word', preset: 'colorWave',
  presetOpts: { hold: 0.5, to: rest }, each: 0.7, anim: 'none' });

// propSentence — a sentence whose nouns are REAL OBJECTS: word · photo · chip · captured UI · word,
// flowed as one reading line that wraps. Measured off brew beat 4 (t=4.6, 1.6s): nine layers land
// inside 0.42s at a rolling ~0.06-0.08s step, the props popping (0.32s) while the words light up on a
// colour wave. The density IS the effect, so the beat is short and the whole frame arrives at once.
//
// Flowed, not placed. brew hand-typed ten coordinate pairs; a blueprint that did the same would be a
// template with the picture baked in. One wrapping flex row means the sentence reads in the order the
// author wrote it, and the props keep their own sizes without anyone eyeballing an x.
//
// Every child rides `delay` (core/layers/util.js addGroupChild), which staggers the ENTRANCE inside the
// group's window and leaves the exit in formation. That is the shape brew has: a scattered arrival and
// one clean departure. Props leave through `defocus` because a dozen objects sliding at once reads as
// chaos (CLAUDE.md launch rule 4); words fade, since a word has nothing to blur.
//
// Placed by x/y and not by `pin`, because a wrapping sentence has no height until it is laid out and
// `pin` needs a declared `h` (core/validate.mjs says so). The default y suits the two-row sentence this
// beat is sized for; move it up for three rows, down for one, and look at the frame either way.
export function propSentence({ items = [], x = 120, y = 250, w = 1680, gap = 44, size = 170,
  weight = 600, wordColor = INK, propW = 380, radius = 22, stagger = 0.08, justify = 'flex-start',
  start = 0, dur = 1.6, enterDur = 0.32, exitDur = 0.2 } = {}) {
  // one prop's shared timing: it arrives late by its place in the sentence and leaves with everything else
  const timing = (i, it) => ({ delay: +(it.at != null ? it.at : i * stagger).toFixed(3), enterDur, exitDur });

  const children = items.map((it, i) => {
    const t = timing(i, it);
    if (it.word != null) {
      return { type: 'text', text: it.word, size: it.size || size, weight: it.weight || weight,
        ...wave(it.color || wordColor), ...t, out: 'fade' };
    }
    if (it.image) {
      const iw = it.w || propW;
      return { type: 'image', src: it.image, w: iw, h: it.h || Math.round(iw * 0.62),
        radius: it.radius ?? radius, ken: it.ken ?? true, anim: 'pop', out: 'defocus', ...t };
    }
    if (it.icon) {
      // an icon needs a field to sit on or it reads as a stray glyph at this scale: a filled tile,
      // sized off the icon so the two can never drift apart.
      const box = it.w || 132, mark = it.iconW || Math.round(box * 0.44);
      return { type: 'group', layout: 'row', justify: 'center', items: 'center', w: box, h: box,
        bg: it.bg || ACCENT, radius: it.radius ?? Math.round(box / 2), anim: 'pop', out: 'defocus', ...t,
        children: [{ type: 'image', src: it.icon, w: mark, h: mark }] };
    }
    if (it.component) {
      return { type: 'component', src: it.component, w: it.w || 420, anim: 'pop', out: 'defocus', ...t };
    }
    if (it.chip != null) {
      return { type: 'text', text: it.chip, font: 'mono', size: it.size || 34, weight: 500,
        color: it.color || INK, bg: it.bg || SURF2, pad: it.pad || '18px 30px', radius: it.radius ?? 12,
        border: `1.5px solid ${LINE}`, anim: 'pop', out: 'defocus', ...t };
    }
    throw new Error('propSentence: each item needs one of word | image | icon | component | chip; got '
      + JSON.stringify(it));
  });

  return [{ type: 'group', x, y, w, layout: 'row', wrap: true, gap, items: 'center', justify,
    start, duration: dur, anim: 'none', children }];
}

// slotSwap — three slots that never move while their CONTENTS turn over N times. Measured off brew
// beats 11-13 (t=14.9/16.5/18.1, 1.3s visible each): badge, label and payload sit at the same three
// boxes every pass, and every pass re-uses the same four stagger offsets (label 0 · tile +0.10 ·
// icon +0.16 · payload +0.35). The repeat is the point — an identical rhythm three times is what makes
// the row read as one object being re-filled instead of three cuts.
//
// The payload slot changes TYPE (a word, then a number, then a picture), which is the difference
// between this and a table. A table's third column is the same kind of thing every row; here the
// answer is a different kind of thing each time, and only the box it lands in is fixed.
//
// Passes butt up against each other by default (a pass ends exactly where the next begins), so the
// slots are never empty. brew left a 0.3s hole between its passes; pass `hold` to reproduce that
// deliberately, and know that `make beat-check` calls an unfilled frame `dead-air`.
//
// `offsets` takes no `= {}` default on purpose: scripts/author/expand-blocks.mjs reads a factory's prop
// names off the source with a regex that stops at the first `}`, so a brace in the signature hides every
// prop after it and the expander warns that `start` and `dur` are not accepted. A wrong warning trains an
// author to ignore the right ones.
export function slotSwap({ passes = [], x = 240, y = 330, badge = 150, badgeRadius = 34, gap = 40,
  labelW = 780, labelSize = 150, labelWeight = 600, labelColor = INK, badgeBg = ACCENT,
  cx = 1460, cy = 405, payloadW = 340, offsets, start = 0, dur = 4.5, hold,
  enterDur = 0.3, exitDur = 0.15 } = {}) {
  const n = passes.length;
  if (!n) return [];
  const every = n > 1 ? (dur - (hold ?? dur / n)) / (n - 1) : 0;
  const win = hold ?? (n > 1 ? every : dur);
  const off = { label: 0, tile: 0.1, icon: 0.16, payload: 0.35, ...(offsets || {}) };
  const iconW = Math.round(badge * 0.44);
  // The outgoing pass has to still be on screen when the next one starts, or the swap renders as a hole:
  // a layer's exit is the LAST `exitDur` of its window, so butt-jointed passes leave one frame with the
  // old row already gone and the new row still at zero. Measured as an empty frame at the exact joint,
  // which is what `make beat-check` calls `dead-air`. Every pass but the last therefore overhangs its
  // successor by its own exit, so the two ramps cross. An explicit `hold` is left alone: a shorter hold
  // than the cadence is an author asking for the gap brew has.
  const over = hold == null ? exitDur : 0;

  const L = [];
  passes.forEach((p, i) => {
    const t0 = start + i * every;
    const span = win + (i < n - 1 ? over : 0);
    const at = (d) => ({ start: +(t0 + d).toFixed(3), duration: +(span - d).toFixed(3), enterDur, exitDur });

    if (p.label != null) {
      L.push({ type: 'text', text: p.label, x: x + badge + gap, y, w: labelW, align: 'left',
        size: labelSize, weight: labelWeight, ...wave(labelColor), ...at(off.label) });
    }
    if (p.icon) {
      L.push({ type: 'rect', x, y: y + 10, w: badge, h: badge, radius: badgeRadius,
        bg: p.badgeBg || badgeBg, anim: 'pop', ...at(off.tile) });
      L.push({ type: 'image', src: p.icon, x: x + Math.round((badge - iconW) / 2),
        y: y + 10 + Math.round((badge - iconW) / 2), w: iconW, h: iconW, anim: 'pop', ...at(off.icon) });
    }

    // THE PAYLOAD. Centred on one fixed point rather than pinned to one edge, because the whole device
    // is that the box does not move and the kinds of thing landing in it have no common width.
    const q = p.payload;
    if (!q) return;
    const w = q.w || payloadW, tm = at(off.payload);
    const px = Math.round(cx - w / 2);
    if (q.image) {
      const h = q.h || w;
      L.push({ type: 'image', src: q.image, x: px, y: Math.round(cy - h / 2), w, h,
        radius: q.radius ?? 34, ken: q.ken ?? true, anim: 'pop', ...tm });
    } else if (q.icon) {
      L.push({ type: 'image', src: q.icon, x: px, y: Math.round(cy - w / 2), w, h: w, anim: 'pop', ...tm });
    } else if (q.to != null) {
      L.push({ type: 'count', from: q.from ?? 0, to: q.to, ...(q.unit ? { unit: q.unit } : {}),
        ...(q.suffix ? { suffix: q.suffix } : {}), ...(q.decimals != null ? { decimals: q.decimals } : {}),
        x: px, y: Math.round(cy - (q.size || 120) * 0.62), w, align: 'center', size: q.size || 120,
        weight: 800, color: q.color || ACCENT, ls: '-0.03em', countStart: 0.1,
        countDur: Math.max(0.4, (win - off.payload) * 0.7), ease: 'easeOutExpo', anim: 'pop', ...tm });
    } else if (q.word != null) {
      // sized close to the label, because the payload is the thing that CHANGES and it must not be the
      // smallest thing in the row
      L.push({ type: 'text', text: q.word, x: px, y: Math.round(cy - (q.size || 110) * 0.62), w,
        align: 'center', size: q.size || 110, weight: q.weight || 700,
        ...wave(q.color || labelColor), ...tm });
    } else if (q.chip != null) {
      L.push({ type: 'text', text: q.chip, font: 'mono', x: px, y: Math.round(cy - 34), w,
        align: 'center', size: q.size || 30, weight: 600, color: q.color || INK, bg: q.bg || SURF2,
        pad: '16px 22px', radius: 14, border: `1.5px solid ${LINE}`, anim: 'pop', ...tm });
    } else if (q.component) {
      L.push({ type: 'component', src: q.component, x: px, y: Math.round(cy - (q.h || w * 0.6) / 2),
        w, anim: 'pop', ...tm });
    } else {
      throw new Error('slotSwap: a payload needs one of image | icon | to | word | chip | component; got '
        + JSON.stringify(q));
    }
  });
  return L;
}
