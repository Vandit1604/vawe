// blocks/board.mjs — the SPLIT-FLAP BOARD: a mechanical departure board that is a THING on the
// screen, with a drum and a hinge line per character, not another full-frame wash.
//
// WHY A BLOCK AND NOT A PRESET. The MOTION is the `flap` preset (core/type.js) and it works on any
// text layer; what a preset cannot be is an OBJECT. A board is cells — a drum per character, each
// with its own plate and its own hinge line across the middle — and cells are geometry, which is
// what a factory makes. The two halves are deliberately separable: reach for the preset when a
// headline should turn over, and for this when the board itself is the subject.
//
// ONE LAYER PER CHARACTER, and that is the point rather than a cost. A single text layer with
// letter-spacing dialled to a cell width would have to agree with a font's advance width, which is a
// measurement, at render time, after the fonts load — the bug shape this repo logs most. A character
// placed at its own x needs no measurement and lands on its drum in every one of the 31 faces.
//
// A SPACE KEEPS ITS DRUM. A board does not skip a position when a word ends; it shows a blank plate.
// So whitespace emits the cell and no glyph.
import { TOKENS as T, text, rect } from './kit.mjs';
export const CATEGORY = 'Type';

// The plate is the theme's MAXIMUM-CONTRAST PAIR: `--text` for the drum, `--bg` for the glyph. Two
// halves meeting at a lighter hinge line across the middle.
//
// Built from `--surface-2` it was theme-correct and completely invisible on a white-first theme — the
// drums washed into the paper and the board stopped being an object, which is the one thing this block
// is for. The contrast pair fixes that and costs one thing, said plainly: WHICH WAY ROUND THE BOARD
// LANDS IS THE THEME'S, not this block's. Dark plates on vawe, light plates on higgsfield. The letters
// read either way, because the pair is the theme's own furthest-apart two colours; the one case that
// could still wash out is a theme whose `text` sits near the current backdrop, and `--line-strong` on
// the edge is what draws the drum back out of the page there.
const PLATE = 'linear-gradient(180deg, var(--text) 0 calc(50% - 1px), '
  + 'color-mix(in srgb, var(--text) 55%, var(--bg)) calc(50% - 1px) calc(50% + 1px), '
  + 'color-mix(in srgb, var(--text) 88%, var(--bg)) calc(50% + 1px) 100%)';

// splitFlapBoard — `word` turns over on the drums and lands. `steps` is how many flaps each drum runs
// (also its speed: the run is fitted into `each` however many you ask for), `stagger` is the delay
// between neighbouring drums, which is what makes the row settle left to right.
export function splitFlapBoard({ x, y, word = 'DEPARTING', label, size = 88, gap = 6, radius = 6,
  steps = 14, each = 0.9, stagger = 0.07, start = 0, dur = 4 } = {}) {
  const chars = [...String(word)];
  const cellW = Math.round(size * 0.74), cellH = Math.round(size * 1.2);
  const out = [];
  const top = label ? y + Math.round(size * 0.5) : y;
  if (label) out.push(text({ x, y, text: label, font: 'mono', size: Math.round(size * 0.26),
    weight: 600, color: T.accent, ls: '0.22em', start, duration: dur, anim: 'fade', enterDur: 0.3 }));
  chars.forEach((ch, i) => {
    const cx = x + i * (cellW + gap);
    // The plates arrive first and faster than the drums turn, so the board exists before it reads.
    out.push(rect({ x: cx, y: top, w: cellW, h: cellH, radius, bg: PLATE,
      border: `1.5px solid var(--line-strong)`, start: start + i * (stagger * 0.5), duration: dur - i * (stagger * 0.5),
      anim: 'pop', enterDur: 0.28, out: 'defocus', exitDur: 0.35 }));
    if (!ch.trim()) return;                       // a blank position still owns its drum
    // NO `anim` on the drum: `split` owns a layer's entrance and the engine refuses the pair outright.
    // The flap IS the entrance — a drum that also faded in would be turning behind a curtain.
    out.push(text({ x: cx, y: top + Math.round((cellH - size * 1.04) / 2), w: cellW, align: 'center',
      text: ch, font: 'mono', size, weight: 700, color: T.paper,
      split: 'char', preset: 'flap', presetOpts: { steps }, each, stagger: 0,
      start: start + 0.2 + i * stagger, duration: dur - 0.2 - i * stagger,
      out: 'defocus', exitDur: 0.35 }));
  });
  return out;
}

// ─────────────────────────────────────────────────────────────────────────────
// THE OPTION CONTRACT. Vocabulary and checker: blocks/schema.mjs.
export const BOARD_SCHEMAS = {
  splitFlapBoard: {
    // Long enough to say a place or a verdict, short enough that the last drum is still on screen.
    word: { kind: 'str', max: 24, def: 'DEPARTING' },
    label: { kind: 'str', max: 24 },
    size: { kind: 'int', min: 24, max: 300, def: 88 },
    gap: { kind: 'int', min: 0, max: 60, def: 6 },
    radius: { kind: 'int', min: 0, max: 40, def: 6 },
    // How many flaps a drum runs before it lands. Below about 6 the sequence is too short to read as
    // ordered and the board looks like a cut; far above 20 the run is a blur at any sane `each`.
    steps: { kind: 'int', min: 2, max: 60, def: 14 },
    // Seconds one drum takes to run its whole sequence.
    each: { kind: 'num', min: 0.1, max: 6, def: 0.9 },
    // Delay between neighbouring drums. Zero lands the whole row at once, which no board does.
    stagger: { kind: 'num', min: 0, max: 1, def: 0.07 },
  },
};
