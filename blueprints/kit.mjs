// blueprints/kit.mjs: the shared MOTION idioms every blueprint composes from. Pure (props → layer object).
//
// WHY: even with the full arsenal in hand, an agent authoring a beat regresses to `rise`+`fade` and passes
// every gate. The plain-video failure the direction floor now catches (docs/MISTAKES.md). A blueprint fixes
// a beat's DIRECTION so good motion is the DEFAULT, not something re-derived each time: kinetic word/char
// reveals, overshoot pops, count-ups, staggered cascades, ken push, cursor. Blueprints fix MOTION, never
// content/copy/layout, so they are not templates (the ledger + similarity gate still enforce uniqueness).
//
// Colours are SEMANTIC theme vars (var(--text/--dim/--accent/--line/--surface2)) so a blueprint is
// brand-agnostic; the theme owns the palette and `make audit` owns contrast. Coordinates are the 1920×1080
// stage; every factory takes {x,y,w,start,dur} so the author places and paces it.

export const INK = 'var(--text)', DIM = 'var(--dim)', ACCENT = 'var(--accent)',
  LINE = 'var(--line)', SURF2 = 'var(--surface-2)', SURF = 'var(--surface)';

// kineticHeadline. The DEFAULT directed headline: words rise/scale in sequence, never a flat fade.
// This is the single biggest thing plain videos miss (docs/CRAFT/DIRECTION.md §1 staging, §5 tell 1).
//
// `exitDur` DEFAULTS TO 0 (held, not faded). Every beat blueprint ends its layers exactly at the
// beat's own `start+dur`, so a nonzero exitDur here used to spend the LAST 0.3-0.4s of the beat
// fading itself to invisible, opacity 0 well before the beat boundary a dissolve then crosses. The
// scene-level transition (`transitions[].fx:"dissolve"`) already blends the outgoing and incoming
// beats at that boundary; a per-layer fade on top of it just empties the frame the dissolve is meant
// to cross (docs/RULES/first-arrival.md, the seam-check acceptance run). Pass `exitDur` explicitly for
// a beat that deliberately wants to fade before its own end.
export const kineticHeadline = ({ text, x = 160, y, w = 1600, size = 64, weight = 700, preset = 'up',
  each = 0.4, stagger = 0.045, align = 'center', color = INK, font, start = 0, dur = 4, exitDur = 0 }) => ({
  type: 'text', text, x, y, w, align, size, weight, color, ...(font ? { font } : {}),
  split: 'word', preset, each, stagger, start, duration: dur, out: 'fade', exitDur,
});

// dollyNumber: a hero stat that COUNTS up and pops in with overshoot. Numbers always count (never a
// static label in a box). easeOutExpo velocity = the number decelerating into its reading.
// `exitDur` defaults to 0: see kineticHeadline above, same reasoning (held to the beat's own end).
export const dollyNumber = ({ to, from = 0, unit = '', decimals, prefix = '', x = 160, y, w = 1600,
  size = 340, weight = 800, color = INK, align = 'center', start = 0, dur = 4, countDur = 1.5,
  out = 'defocus', exitDur = 0 }) => ({
  type: 'count', from, to, unit, ...(decimals != null ? { decimals } : {}), ...(prefix ? { prefix } : {}),
  font: 'sans', x, y, w, align, size, weight, color, ls: '-0.03em',
  // `0.1`, NOT `start + 0.1`. `countStart` is seconds INTO this layer's own window (the schema says
  // so: "Count begins (s into window)"), so adding the absolute start pushed it past the end of the
  // window on any beat that does not begin at zero. A blueprint placed at start: 5 with a 4s window
  // asked the count to begin 5.1s into 4 seconds, so it never ran and the number sat frozen on its
  // `from` value for the whole beat. It was right by accident at start: 0 and wrong everywhere else,
  // which is why it survived: the probe scenes all start at zero. Rendered both ways before and after.
  countStart: 0.1, countDur, ease: 'easeOutExpo',
  start, duration: dur, anim: 'pop', enterDur: 0.55, out, exitDur,
});

// caption: a quiet mono/body support line. Fades in; never competes with the hero (secondary action).
// `exitDur` defaults to 0: see kineticHeadline's comment (held to the beat's own end, not faded early).
export const caption = ({ text, x = 160, y, w = 1600, size = 38, weight = 500, color = DIM, align = 'center',
  start = 0, dur = 4, font = 'mono', anim = 'fade', enterDur = 0.5, exitDur = 0 }) => ({
  type: 'text', text, x, y, w, align, size, weight, color, font, start, duration: dur, anim, out: 'fade', enterDur, exitDur,
});

// chip: a mono pill (a source, a tag, a tool). The caller drops a row/grid of these into a group that
// pops them in one after another (follow-through). Flows by the group's gap, no eyeballed coordinates.
export const chip = ({ text, size = 34, color = INK }) => ({
  type: 'text', text, font: 'mono', size, weight: 500, color, bg: SURF2, pad: '18px 30px', radius: 12, border: `1.5px solid ${LINE}`,
});

// panel: the light "surface" card behind a terminal / callout. Scales in with a whisper of glow.
// `exitDur` defaults to 0: see kineticHeadline's comment (held to the beat's own end, not faded early).
export const panel = ({ x, y, w, h, start, dur, glow = 0.22 }) => ({
  type: 'rect', x, y, w, h, bg: SURF2, radius: 18, border: `1.5px solid ${LINE}`,
  start, duration: dur, anim: 'scale', enterDur: 0.5, out: 'defocus', exitDur: 0, glow,
});

// verdictChip: a tone-coloured result badge (ok/warn/bad) that POPS after the reading it judges.
const TONE = { ok: { fg: '#05683c', bg: '#e6f7ef', bd: '#0aa06a' }, warn: { fg: '#8a5a00', bg: '#fdf3e0', bd: '#f5a623' }, bad: { fg: '#a01212', bg: '#fdeaea', bd: '#ee0000' } };
export const verdictChip = ({ text, tone = 'ok', x, y, w = 300, size = 40, start, dur }) => {
  const t = TONE[tone] || TONE.ok;
  return { type: 'text', text, x, y, w, align: 'center', size, weight: 700, font: 'mono', color: t.fg,
    bg: t.bg, pad: '12px 26px', radius: 10, border: `1.5px solid ${t.bd}`, start, duration: dur, anim: 'pop', enterDur: 0.45 };
};

// row / grid: flow children by gap (flex), never by eyeballed x/y. The staggered pop lives on the caller.
export const rowGroup = (children, gap = 26) => ({ type: 'group', layout: 'row', gap, children });
export const colGroup = (children, gap = 26) => ({ type: 'group', layout: 'column', gap, children });
