// scripts/author/animatic.mjs — play the storyboard before building the film.
//
// A storyboard shows WHAT happens. An animatic shows whether the things you planned have the TIME to
// happen. That distinction is the whole reason this file exists, and it is the one failure this repo
// keeps shipping: a handover that needed twenty frames and got two, a tail with nothing in it, a beat
// whose change was written down correctly and never built. `storyboard-check` cannot catch any of it,
// because it grades the plan against itself. This grades the plan against a clock.
//
// So the output is DELIBERATELY UGLY. Grey blocks, one weight of type, no easing worth the name, no
// brand, no colour. Every ounce of styling is a thing your eye would rather look at than the pacing,
// and pacing is the only question an animatic is allowed to answer. If it looks good you will judge
// the look. It does not look good.
//
// Two things it makes visible that nothing else does:
//   · a beat with no `picture:` renders a big empty slot that says so. The dual-channel rule ("visual
//     and copy carry the beat simultaneously, not sequentially") stops being a doc and becomes a hole
//     in the frame. 29 films in this library waive `no-visual-vocabulary`; every one of them would
//     have been a screen of empty boxes here, before a line of JSON was written.
//   · the beat clock runs in the corner, so a beat that reads fine on paper and is over before you
//     have finished the sentence is obvious at the moment it happens.
//
//   node scripts/author/animatic.mjs <STORYBOARD.md> [--out formats/scene/<name>.animatic.json]
//   make animatic SB=<file>            (generates, then renders draft)
import fs from 'node:fs';
import path from 'node:path';
import { parseStoryboard, timeline } from './storyboard-parse.mjs';

const args = process.argv.slice(2);
const SB = args.find((a) => !a.startsWith('--'));
const flag = (n) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : null; };
if (!SB || !fs.existsSync(SB)) {
  console.error('usage: animatic <STORYBOARD.md> [--out <scene.json>]');
  console.error('       template: docs/CRAFT/STORYBOARD-TEMPLATE.md');
  process.exit(2);
}

const src = fs.readFileSync(SB, 'utf8');
const sb = parseStoryboard(src);
if (!sb.beats.length) { console.error(`✗ no beats found in ${SB} — beats are "## Beat N: Title (0s-6s)" headings.`); process.exit(1); }
const { beats, guessed } = timeline(sb);

const name = path.basename(SB).replace(/\.(md|markdown)$/i, '').replace(/[^a-z0-9-]+/gi, '-').toLowerCase();
const OUT = flag('--out') || `formats/scene/${name}.animatic.json`;

// canvas from `format: 1920x1080`, defaulting to landscape
const fmt = /(\d+)\s*[x×]\s*(\d+)/.exec(sb.format || '');
const W = fmt ? +fmt[1] : 1920, H = fmt ? +fmt[2] : 1080;
const aspect = W >= H ? '16:9' : '9:16';
const total = Math.max(...beats.map((b) => b.end));

// the animatic palette: paper, ink, and one grey. Three values, so nothing here can be mistaken for
// a design decision that survives into the film.
const INK = '#111111', GREY = '#c9c9c9', SLOT = '#e6e6e6', MUTED = '#8a8a8a';
const layers = [];
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/[—–]/g, ','); // the validator rejects em-dashes on screen, and so does the house style

const PAD = Math.round(W * 0.055);
const SLOT_TOP = Math.round(H * 0.30), SLOT_H = Math.round(H * 0.46);

for (const b of beats) {
  const dur = Math.max(0.2, b.end - b.start);
  const enter = Math.min(0.28, dur * 0.22);

  // ── the COPY channel, measured first ──────────────────────────────────────────────────────────
  // Real words at roughly real sizes, because "does this line have time to be READ" is a pacing
  // question and a placeholder cannot answer it. Long copy SHRINKS rather than overflowing: a real
  // storyboard line can be a whole prompt sentence, and at a fixed headline size it ran straight
  // through the picture slot and over the caption below it. An animatic that garbles its own copy
  // cannot answer the one question it exists for. Width is estimated from character count (~0.5em
  // average advance) and the size backed off until it fits the lines it is allowed.
  const fit = (text, startSize, maxLines) => {
    const box = W - PAD * 2;
    let sz = startSize;
    while (sz > 18 && Math.ceil(text.length * sz * 0.5 / box) > maxLines) sz -= 2;
    return { size: sz, lines: Math.max(1, Math.ceil(text.length * sz * 0.5 / box)) };
  };
  const copy = [];
  let cursorY = Math.round(H * 0.11);
  b.onscreen.slice(0, 3).forEach((line, j) => {
    const big = j === 0;
    const t = esc(line);
    const { size, lines } = fit(t, Math.round(H * (big ? 0.072 : 0.032)), big ? 3 : 2);
    copy.push({
      type: 'text', text: t, x: PAD, y: cursorY, w: W - PAD * 2, size, weight: big ? 700 : 400,
      color: big ? INK : MUTED, align: 'left', ls: big ? '-0.02em' : '0',
      start: +(b.start + (big ? 0 : 0.12 * j)).toFixed(2),
      duration: +Math.max(0.2, dur - (big ? 0 : 0.12 * j)).toFixed(2),
      anim: 'fade', enterDur: +enter.toFixed(2), exitDur: 0,
    });
    cursorY += Math.round(size * 1.18 * lines) + (big ? 14 : 6);
  });

  // ── the PICTURE channel, placed under whatever the copy needed ─────────────────────────────────
  // Always drawn, even when the beat names nothing to draw. An empty labelled slot is the point: it
  // is the dual-channel gap, made impossible to skim past.
  const hasPic = !!(b.picture || b.blueprint);
  const capt = b.picture || (b.blueprint ? `blueprint: ${b.blueprint}` : 'NO PICTURE NAMED, this beat is type only');
  const slotTop = Math.max(SLOT_TOP, cursorY + 16);
  const slotH = Math.max(140, H - slotTop - Math.round(H * 0.14));
  layers.push({
    type: 'rect', x: PAD, y: slotTop, w: W - PAD * 2, h: slotH, radius: 6,
    bg: hasPic ? SLOT : 'transparent', border: hasPic ? `2px solid ${GREY}` : `2px dashed ${GREY}`,
    start: +b.start.toFixed(2), duration: +dur.toFixed(2), anim: 'fade', enterDur: +enter.toFixed(2), exitDur: 0,
  });
  layers.push({
    type: 'text', text: esc(capt), x: PAD + 24, y: slotTop + 18, w: W - PAD * 2 - 48,
    size: Math.round(H * 0.024), weight: 500, color: hasPic ? MUTED : '#b00020', align: 'left',
    start: +b.start.toFixed(2), duration: +dur.toFixed(2), anim: 'fade', enterDur: +enter.toFixed(2), exitDur: 0,
  });
  layers.push(...copy);

  // ── the HUD ────────────────────────────────────────────────────────────────────────────────────
  // Which beat this is and how long it lasts, on the frame, because a beat that reads fine on paper
  // and is gone before you finish the sentence has to be caught AS IT HAPPENS.
  layers.push({
    type: 'text', text: esc(`${b.i + 1}. ${b.name}   ${b.start.toFixed(1)}s to ${b.end.toFixed(1)}s   (${dur.toFixed(1)}s)`),
    x: PAD, y: H - Math.round(H * 0.085), w: W - PAD * 2, size: Math.round(H * 0.024), weight: 500,
    color: MUTED, align: 'left', start: +b.start.toFixed(2), duration: +dur.toFixed(2), exitDur: 0,
  });
  if (b.why) layers.push({
    type: 'text', text: esc(`why: ${b.why}`), x: PAD, y: H - Math.round(H * 0.05),
    w: W - PAD * 2, size: Math.round(H * 0.021), weight: 400, color: GREY, align: 'left',
    start: +b.start.toFixed(2), duration: +dur.toFixed(2), exitDur: 0,
  });
}

const scene = {
  module: 'scene',
  // An animatic is a timing test, not a film. Every taste gate would be right about it and none of
  // them would be useful, so they are waived here BY CONSTRUCTION rather than per-scene by an author
  // talking themselves into it. The one thing that must stay honest is the clock.
  authoring: {
    allow: ['no-visual-vocabulary', 'no-continuous-object', 'no-continuous-object-inferred', 'plain-slideshow',
      'dead-air', 'ends-on-nothing', 'linear-motion', 'monotone-timing', 'static-bg', 'overlap', 'contrast', 'safe'],
    _why: { animatic: 'A deliberately unstyled timing pass generated from ' + path.basename(SB) + ' by scripts/author/animatic.mjs. It is meant to look like nothing so that pacing is the only thing left to judge. It is never rendered as a deliverable.' },
  },
  theme: 'vawe',
  aspect,
  duration: +total.toFixed(2),
  authoringNote: `ANIMATIC of ${path.basename(SB)}: ${beats.length} beats, ${total.toFixed(1)}s. Generated, never hand-edited. `
    + 'Judge PACING only: does each beat have room for what it promised, and is any of it over before you can read it?',
  layers,
  bg: [{ t: 0, preset: 'plain', from: 0, to: +total.toFixed(2) }],
};

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(scene, null, 2) + '\n');

const noPic = beats.filter((b) => !b.picture && !b.blueprint);
const fast = beats.filter((b) => (b.end - b.start) < 1.2);
console.log(`✓ animatic → ${OUT}`);
console.log(`  ${beats.length} beats · ${total.toFixed(1)}s · ${layers.length} layers`);
if (guessed.length) console.log(`  ~ ${guessed.length} beat(s) had no time range and were spaced evenly: ${guessed.slice(0, 4).join(', ')}. A guessed span is fine to watch and useless to trust, so put ranges in the headings.`);
if (noPic.length) console.log(`  ~ ${noPic.length}/${beats.length} beat(s) name no picture: ${noPic.map((b) => b.name).slice(0, 4).join(', ')}. Those render as empty slots, which is what a type-only beat IS.`);
if (fast.length) console.log(`  ~ ${fast.length} beat(s) under 1.2s: ${fast.map((b) => b.name).slice(0, 4).join(', ')}. Watch whether the copy can be read at all.`);
console.log(`\n  render it:  ./bin/vawe ${OUT} --draft --workers 2`);
