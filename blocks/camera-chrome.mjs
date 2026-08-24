// blocks/camera-chrome.mjs — VIEWFINDER FURNITURE. A camcorder OSD and an autofocus scan gate, as
// blocks rather than camera moves.
//
// WHY HERE AND NOT core/camera-moves.js: a camera move in this engine is (params) → keyframe[], a
// piece of GEOMETRY applied to the whole stage. Nothing here moves the camera. Both blocks DRAW
// chrome over the frame: brackets, a lamp, a readout, a travelling band. Filing chrome in the camera
// registry would put a picture in a table of numbers.
//
// MOTION, AND THE TRAP. CSS transitions and animations are dead engine-wide (core/tokens.css, and
// core/validate.mjs refuses a fragment that uses them), so a `@keyframes … infinite` REC lamp renders
// as a still. Two channels are real and both are used here:
//   * `parts` (core/parts.js) — a CSS selector into this markup; every match gets a seeked entrance
//     with a stagger, and `out: true` gives it the paired exit. The brackets and the OSD chips arrive
//     and leave that way.
//   * `var(--t)` — the scene clock in SECONDS, written on every html layer (core/layers/html.js).
//     Geometry computed off it in a calc() is deterministic and seeks correctly.
// The blinking lamp is a SQUARE WAVE off `--t`, the same round()/mod() idiom the caret in
// blocks/terminal-html.mjs uses, because a one-shot `vars` ramp eases from a to b once and never
// repeats. The running timecode is the same trick on a digit column: floor the clock, translate the
// strip by that many rows.
import { TOKENS, HAIR, R, SPACE, TYPE, r2 } from './kit.mjs';

const T = TOKENS;

// TWO LITERALS, both under kit.mjs's own test for a legitimate one. A camcorder REC lamp is red
// because the hardware is red, not because a brand chose it — the "operating system's chrome" case.
// The fringe is red+cyan because a channel misregistration has no other colours — the "physical
// phenomenon" case. Neither is a colour a theme should ever repaint.
const REC_RED = '#FF3B30';
const FRINGE = 'text-shadow:1px 0 rgba(255,0,0,0.5),-1px 0 rgba(0,255,255,0.5)';

const OSD = `font:600 ${TYPE.base}px var(--font-mono);letter-spacing:0.14em;color:${T.ink};${FRINGE}`;
const P_EASE = 'easeOutCubic';
const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// One rolling digit. `unit` is how many seconds it takes to advance, `base` where it wraps. The
// value is computed in CSS, never in JS, so it is a function of the frame and not of render order.
function digitStrip(unit, base, lineH, from) {
  const col = Array.from({ length: base }, (_, i) =>
    `<span style="display:block;height:${lineH}px;line-height:${lineH}px">${i}</span>`).join('');
  const v = `mod(round(down, (var(--t,0) + ${r2(from)}) / ${unit}, 1), ${base})`;
  return `<span style="display:inline-block;width:1ch;height:${lineH}px;overflow:hidden;vertical-align:top">`
    + `<span style="display:block;transform:translateY(calc(-1 * ${v} * ${lineH}px))">${col}</span></span>`;
}

// An L-bracket. `cx`/`cy` say which corner it belongs to, so one definition draws all four. A caller
// that drives the bracket itself passes `transform` and leaves `part` off: `parts` writes transforms,
// so a bracket cannot be owned by both channels at once.
function bracket({ cx, cy, arm, weight, color, inset = 0, transform = '', part = false }) {
  const hx = cx === 'left' ? 'left' : 'right';
  const vy = cy === 'top' ? 'top' : 'bottom';
  return `<div ${part ? 'data-part ' : ''}style="position:absolute;${hx}:${inset}px;${vy}:${inset}px;`
    + `width:${arm}px;height:${arm}px;border-radius:${R.micro}px;`
    + `border-${hx}:${weight}px solid ${color};border-${vy}:${weight}px solid ${color}`
    + `${transform ? `;transform:${transform}` : ''}"></div>`;
}

// camcorderHud — the viewfinder overlay: corner brackets, a blinking REC lamp, a running timecode, a
// battery gauge, a zoom readout, and the lens vignette that sells all of it as glass.
export function camcorderHud({ x = 0, y = 0, w = 1920, h = 1080, rec = true, zoom = '2.4', battery = 68,
  label = 'SP', from = 0, start = 0, dur = 5 } = {}) {
  const inset = SPACE.xxl;                 // 48 — the brackets sit inside the safe area, like real chrome
  const arm = 96;                          // the bracket's arm length
  // The rails clear the brackets rather than guessing at a margin: previewed at 48+24 the battery
  // readout sat ON the top-right bracket's vertical arm.
  const rail = inset + arm + SPACE.md;
  const lineH = TYPE.lead + 6;             // 30: the digit row height, and the strip's travel step

  // The lamp: 1 Hz square wave. mod(t,1) runs 0→1, round(down, …, 0.5) snaps it to 0 or 0.5, ×2 makes
  // it 0 or 1. On for the back half of every second, off for the front. No CSS animation anywhere.
  const blink = 'calc(round(down, mod(var(--t,0), 1), 0.5) * 2)';

  const pips = Array.from({ length: 4 }, (_, i) => {
    const lit = battery > i * 25;
    return `<span style="display:inline-block;width:11px;height:16px;margin-right:${i === 3 ? SPACE.xs : 2}px;`
      + `background:${lit ? T.ink : 'transparent'};border:1px solid ${T.ink};border-radius:1px"></span>`;
  }).join('');

  const chip = (inner) => `<div data-part style="display:flex;align-items:center;gap:${SPACE.snug}px">${inner}</div>`;

  const recMark = rec
    ? `<span style="width:18px;height:18px;border-radius:${R.pill}px;background:${REC_RED};opacity:${blink}"></span>`
      + `<span style="color:${REC_RED};${FRINGE}">REC</span>`
    : `<span style="color:${T.ink}">▶</span><span>PLAY</span>`;

  const timecode = digitStrip(600, 6, lineH, from) + digitStrip(60, 10, lineH, from)
    + `<span style="display:inline-block;height:${lineH}px;line-height:${lineH}px;opacity:${blink}">:</span>`
    + digitStrip(10, 6, lineH, from) + digitStrip(1, 10, lineH, from);

  const html = `<div style="position:relative;width:${w}px;height:${h}px;overflow:hidden;${OSD}">`
    // the lens vignette: permanent, and the reason white chrome stays readable over any footage
    + `<div style="position:absolute;inset:0;pointer-events:none;`
    + `background:radial-gradient(120% 90% at 50% 50%, transparent 42%, color-mix(in srgb, #000 62%, transparent) 100%)"></div>`
    + ['left', 'right'].flatMap((cx) => ['top', 'bottom'].map((cy) =>
      bracket({ cx, cy, arm, weight: 3, color: T.ink, inset, part: true }))).join('')
    // top rail: the transport mark on the left, the gauges on the right
    + `<div style="position:absolute;left:${rail}px;top:${inset + SPACE.md}px">`
    + chip(recMark) + `</div>`
    + `<div style="position:absolute;right:${rail}px;top:${inset + SPACE.md}px;display:flex;align-items:center;gap:${SPACE.lg}px">`
    + chip(`<span>ZOOM</span><span style="color:${T.accent}">×${esc(zoom)}</span>`)
    + chip(`${pips}<span>${Math.round(battery)}%</span>`)
    + `</div>`
    // bottom rail: the running clock on the left, the tape mode on the right
    + `<div data-part style="position:absolute;left:${rail}px;bottom:${inset + SPACE.md}px;`
    + `display:flex;align-items:center;gap:${SPACE.sm}px">`
    + `<span style="font-size:${TYPE.lead}px;height:${lineH}px;line-height:${lineH}px;display:inline-flex">${timecode}</span>`
    + `</div>`
    + `<div data-part style="position:absolute;right:${rail}px;bottom:${inset + SPACE.md}px">${esc(label)}</div>`
    + `</div>`;

  return [{
    type: 'html', x, y, w, h, html, start, duration: dur, anim: 'fade', enterDur: 0.3, exitDur: 0.35,
    // the chrome assembles piece by piece and leaves the same way — `parts`, not a card fade.
    parts: { select: '[data-part]', anim: 'popIn', each: 0.34, stagger: 0.06, delay: 0.1, ease: P_EASE, out: true },
  }];
}

// scanGate — an autofocus gate: a band travels the box, then the brackets contract onto the target
// and the lock reads out. `--scan` is the travel, `--lock` the snap; both are engine `vars` channels,
// so both seek.
export function scanGate({ x, y, w = 760, h = 460, label = 'LOCK', ticks = 7, start = 0, dur = 5 } = {}) {
  const scanDur = r2(Math.max(0.6, dur * 0.45));
  const lockAt = r2(scanDur + 0.25);
  const arm = 70, weight = 3, spread = 34;      // spread: how far out the brackets sit before the snap
  const band = 3;

  const p = 'var(--scan,0)';
  const k = 'var(--lock,0)';
  // The brackets sit FLUSH with the gate and contract INWARD onto the target. The first cut had them
  // start proud of the box and snap back, and `overflow:hidden` ate the half that was outside it.
  const pull = (sign) => `calc(${sign} * ${k} * ${spread}px)`;

  // The corner a bracket belongs to decides the SIGN of its travel, which is why this is not one
  // shared transform.
  const corner = (cx, cy) => bracket({
    cx, cy, arm, weight, color: T.accent,
    transform: `translate(${pull(cx === 'left' ? 1 : -1)}, ${pull(cy === 'top' ? 1 : -1)})`,
  });

  const tickRow = Array.from({ length: Math.max(0, ticks) }, () =>
    `<span data-part style="display:block;width:2px;height:${SPACE.sm}px;background:${T.dim}"></span>`).join('');

  const html = `<div style="position:relative;width:${w}px;height:${h}px;overflow:hidden;`
    + `border:${HAIR};border-radius:${R.tight}px;${OSD}">`
    // the gate rail: measurement ticks along the top edge, so the box reads as an instrument
    + `<div style="position:absolute;left:${SPACE.lg}px;right:${SPACE.lg}px;top:${SPACE.sm}px;`
    + `display:flex;justify-content:space-between;align-items:flex-start">${tickRow}</div>`
    // the travelling band. Its own soft trail is a gradient, so the band reads as moving even in a still.
    + `<div style="position:absolute;left:0;right:0;top:0;height:${band}px;background:${T.accent};`
    + `box-shadow:0 0 24px 2px color-mix(in srgb, ${T.accent} 60%, transparent);`
    + `opacity:calc(1 - ${k});transform:translateY(calc(${p} * ${h - band}px))"></div>`
    + `<div style="position:absolute;left:0;right:0;top:0;height:120px;opacity:calc((1 - ${k}) * 0.5);`
    + `background:linear-gradient(180deg, transparent, color-mix(in srgb, ${T.accent} 40%, transparent));`
    + `transform:translateY(calc(${p} * ${h - band}px - 120px))"></div>`
    + corner('left', 'top') + corner('right', 'top') + corner('left', 'bottom') + corner('right', 'bottom')
    // the readout: it exists only once the gate has locked
    + `<div style="position:absolute;left:50%;bottom:${SPACE.lg}px;transform:translateX(-50%);opacity:${k};`
    + `padding:${SPACE.snug}px ${SPACE.md}px;border-radius:${R.pill}px;color:${T.accent};`
    + `background:color-mix(in srgb, ${T.accent} 16%, transparent)">${esc(label)}</div>`
    + `</div>`;

  return [{
    type: 'html', x, y, w, h, html, start, duration: dur, anim: 'fade', enterDur: 0.25, exitDur: 0.3,
    vars: { '--scan': [0, 1], '--lock': [0, 1] },
    varsDelay: { '--scan': 0.15, '--lock': lockAt },
    varsDur: { '--scan': scanDur, '--lock': 0.45 },
    varsEase: { '--scan': 'linear', '--lock': P_EASE },
    parts: { select: '[data-part]', anim: 'popIn', each: 0.3, stagger: 0.04, delay: 0.1, ease: P_EASE, out: true },
  }];
}

export const CAMERA_CHROME_SCHEMAS = {
  camcorderHud: {
    w: { kind: 'int', min: 320, max: 1920, def: 1920 },
    h: { kind: 'int', min: 240, max: 1920, def: 1080 },
    // false draws the ▶ PLAY mark instead: the same rail, the other transport state.
    rec: { kind: 'bool', def: true },
    zoom: { kind: 'str', max: 8, def: '2.4' },
    battery: { kind: 'int', min: 0, max: 100, def: 68 },
    label: { kind: 'str', max: 12, def: 'SP' },
    // Seconds added to the scene clock, so the tape can already be running when the beat opens.
    from: { kind: 'num', min: 0, max: 359999, def: 0 },
  },
  scanGate: {
    w: { kind: 'int', min: 160, max: 1920, def: 760 },
    h: { kind: 'int', min: 120, max: 1080, def: 460 },
    label: { kind: 'str', max: 16, def: 'LOCK' },
    ticks: { kind: 'int', min: 0, max: 40, def: 7 },
  },
};
