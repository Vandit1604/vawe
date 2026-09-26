import fs from 'node:fs';
import { glyphText } from '../../core/type/on-screen-text.js';

function typedHook({ text, x = 368, y = 459, w = 1400, size = 126, weight = 700, color = 'var(--text)',
  cps = 33, ls = '0.04em', start = 0, dur = 1.6 } = {}) {
  const chars = glyphText(text).length;
  const typeTime = chars / cps;
  const untypeAt = Math.max(typeTime + 0.25, dur - Math.max(0.3, chars / (cps * 2)));
  return [{
    type: 'text', text, x, y, w, align: 'left', size, weight, color, ls,
    typing: cps, untype: +untypeAt.toFixed(2), untypeRate: cps * 2, caret: true, caretHold: true,
    start, duration: dur, exitDur: 0,
  }];
}

function morphButton({ label = 'GENERATE', x = 764, y = 429, w = 392, h = 222,
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

const W = 1920;
const CHROME_AT = 1.46;                   // the app arrives
const BTN = { x: 1156, y: 452, w: 372, h: 128 };

const PAN = [
  { t: 0, x: 26 },
  { t: 0.68, x: 0, ease: 'easeInOutSine' },   // holds while the prompt is typed
  { t: 0.84, x: -124, ease: 'linear' },
  { t: 0.97, x: -238, ease: 'linear' },
  { t: 1.11, x: -351, ease: 'linear' },
  { t: 1.24, x: -437, ease: 'linear' },
  { t: 1.38, x: -486, ease: 'easeOutCubic' },
];

const chrome = () => {
  const pill = (x, y, w, h, r = 18, fill = 'var(--surface2)') =>
    `<div style="position:absolute;left:${x}px;top:${y}px;width:${w}px;height:${h}px;border-radius:${r}px;background:${fill}"></div>`;
  let h = `<div style="position:relative;width:${W}px;height:1080px;font-family:var(--font-sans)">`;
  h += pill(196, 232, 108, 104, 22) + pill(318, 232, 108, 104, 22) + pill(440, 232, 108, 104, 22);
  h += pill(576, 232, 392, 104, 22) + pill(1042, 232, 742, 104, 22);
  h += `<div style="position:absolute;left:180px;top:392px;width:1560px;height:248px;border-radius:34px;`
    + `background:linear-gradient(90deg,#0e1014 0%,#161920 52%,#1d2129 100%);border:1px solid var(--line)"></div>`;
  h += pill(212, 560, 262, 62, 14) + pill(492, 560, 148, 62, 14) + pill(658, 560, 176, 62, 14);
  h += `<div style="position:absolute;left:212px;top:196px;color:var(--dim);font-size:22px;`
    + `font-family:var(--font-mono);letter-spacing:0.14em">CADENCE</div>`;
  return h + '</div>';
};

const ring = {
  type: 'rect', x: 812, y: 230, w: 296, h: 296, radius: 148, bg: 'transparent',
  border: '3px solid var(--accent-glow)', start: 3.68, duration: 0.62,
  motion: [
    { t: 0, scale: 0.42, opacity: 0 },
    { t: 0.06, scale: 0.82, opacity: 0.9, ease: 'easeOutCubic' },
    { t: 0.16, scale: 1, opacity: 0.82, ease: 'easeOutCubic' },
    { t: 0.4, scale: 1.34, opacity: 0.4, ease: 'easeInOutCubic' },
    { t: 0.62, scale: 1.62, opacity: 0, ease: 'easeOutCubic' },
  ],
};

const btn = morphButton({
  label: 'COMPOSE  ✦', x: BTN.x, y: BTN.y, w: BTN.w, h: BTN.h,
  fill: 'radial-gradient(112% 86% at 50% 116%, #ffc24d 0%, #ffb020 44%, #f59b06 78%)',
  ink: 'var(--on-light)', shrink: 196, at: 1.96, over: 0.42,
  start: CHROME_AT, dur: 2.68,
})[0];
btn.id = 'btn';
btn.panWith = 'chrome';
// key threw the button 194px RIGHT in two frames at 3244 px/s (engine-doctrine/MISTAKES.md #200). So it leaves at
btn.motion = [
  { t: 0, x: 0, y: 0 },                                   // origin for the shared pan
  { t: 1.05, x: -330, y: -10, rot: -2, ease: 'linear' },  // peels away, matching the page's speed
  { t: 1.13, x: -364, y: -44, rot: -4, ease: 'linear' },
  { t: 1.22, x: -378, y: -92, rot: -3, ease: 'linear' },
  { t: 1.32, x: -382, y: -128, rot: -1, ease: 'linear' },
  { t: 1.44, x: -382, y: -152, rot: 0, ease: 'easeOutCubic' },
  { t: 1.62, x: -382, y: -134, ease: 'easeInOutCubic' },
  { t: 1.72, x: -382, y: -138, ease: 'easeOutCubic' },
  { t: 2.42, x: -382, y: -138, scale: 0.5, ease: 'easeInOutCubic' },
  { t: 2.54, x: -382, y: -138, scale: 0.2, ease: 'linear' },
  { t: 2.64, x: -382, y: -138, scale: 0.05, opacity: 0, ease: 'easeInCubic' },
];

const WAVE = { x: 300, y: 596, w: 1320, h: 224, at: 3.62 };
const wave = () => {
  const N = 68, gap = 4, bw = (WAVE.w - gap * (N - 1)) / N;
  const out = [`<svg viewBox="0 0 ${WAVE.w} ${WAVE.h}" width="${WAVE.w}" xmlns="http://www.w3.org/2000/svg">`];
  for (let i = 0; i < N; i++) {
    const u = i / (N - 1);
    const env = Math.sin(u * Math.PI) * (0.55 + 0.45 * Math.sin(u * 9.1 + 0.6)) * (0.62 + 0.38 * Math.sin(u * 21.7));
    const hgt = Math.max(6, Math.round(Math.abs(env) * WAVE.h * 0.92));
    const x = +(i * (bw + gap)).toFixed(1), y = +((WAVE.h - hgt) / 2).toFixed(1);
    const at = +(WAVE.at + 0.0068 * i).toFixed(3);
    out.push(`<rect x="${x}" y="${y}" width="${bw.toFixed(1)}" height="${hgt}" rx="${(bw / 2).toFixed(1)}" fill="var(--accent)"`
      + ` style="transform-box:view-box;transform-origin:${(x + bw / 2).toFixed(1)}px ${WAVE.h / 2}px;`
      + `transform:scaleY(clamp(0,(var(--t,0) - ${at}) * 9,1));opacity:clamp(0,(var(--t,0) - ${at}) * 9,1)"/>`);
  }
  return out.join('') + '</svg>';
};

const scene = {
  module: 'scene',
  authoring: {
    allow: ['contrast', 'safe', 'overlap'],
    _why: {
      contrast: 'the COMPOSE label at f48 is mid-entrance on a gradient; the audit measures the nested span, which carries no timing so midMove cannot skip it. higgsfield-recreation reports 1.1:1 at the same frame for the same reason.',
      safe: 'the prompt rides the page off-frame after it is typed and read, which is the register. The pan is delayed until typing finishes so it IS read first.',
      overlap: 'the COMPOSE button sits inside the input bar it belongs to. Two html layers overlapping is the composition, not a collision.',
    },
  },
  theme: 'cadence',
  aspect: '16:9',
  duration: 5,
  authoringNote: 'A made-up product (Cadence), authored from scratch in the keyed-motion register: one '
    + 'continuous action, no cuts, and the COMPOSE button as the object that becomes the loading dot. '
    + 'Uses panWith for the shared page drift, morphButton for the transform and typedHook for the '
    + 'self-erasing opener. Built by harness/author/build-cadence.mjs.',
  layers: [
    typedHook({ text: 'Any scene.', x: 244, y: 424, w: 1400, size: 132, cps: 26, start: 0.08, dur: 1.5 })[0],
    { type: 'rect', id: 'scrim', x: 0, y: 0, w: W, h: 1080, bg: 'var(--bg)',
      start: 1.4, duration: 1.62, anim: 'fade', enterDur: 0.3, out: 'fade', exitDur: 0.08 },
    { type: 'html', id: 'chrome', x: 0, y: 0, w: W, html: chrome(),
      start: CHROME_AT, duration: 1.52, anim: 'fade', enterDur: 0.28, out: 'fade', exitDur: 0.1,
      motion: PAN },
    { type: 'text', id: 'prompt', panWith: 'chrome', text: 'Score a chase through Tokyo rain',
      x: 236, y: 486, w: 1500, align: 'left', size: 46, weight: 400, color: 'var(--text)',
      typing: 96, caret: true, caretHold: true, start: 1.78, duration: 0.9, out: 'fade', exitDur: 0.1,
      motion: [{ t: -0.32, x: 0, y: 0 }] },
    btn,
    ring,
    { type: 'text', id: 'gen', text: 'Composing', x: 390, y: 470, w: 760, align: 'right', size: 92,
      weight: 500, color: 'var(--text2)', anim: 'fade', enterDur: 0.34, start: 3.96, duration: 1.04, exitDur: 0,
      motion: [{ t: -0.14, x: -246 }, { t: 0.14, x: -218, ease: 'linear' }, { t: 0.24, x: -148, ease: 'linear' },
        { t: 0.34, x: -66, ease: 'linear' }, { t: 0.44, x: -24, ease: 'linear' }, { t: 0.58, x: 0, ease: 'easeOutCubic' }] },
    { type: 'html', id: 'wave', x: WAVE.x, y: WAVE.y, w: WAVE.w, h: WAVE.h, html: wave(),
      start: 3.5, duration: 1.5, anim: 'fade', enterDur: 0.22, exitDur: 0 },
    ...[0, 1, 2].map((i) => ({
      type: 'rect', id: `dot${i}`, panWith: 'gen', x: 932 + i * 30, y: 520, w: 14, h: 14, radius: 7,
      bg: 'var(--accent)', start: +(4.0 + i * 0.13).toFixed(2), duration: +(1.0 - i * 0.13).toFixed(2),
      exitDur: 0,
      motion: [
        { t: 0, opacity: 0.22, scale: 0.7 },
        { t: 0.23, opacity: 1, scale: 1, ease: 'easeOutCubic' },
        { t: 0.46, opacity: 0.22, scale: 0.7, ease: 'easeInOutSine' },
        { t: 0.69, opacity: 1, scale: 1, ease: 'easeOutCubic' },
      ],
    })),
  ],
  bg: [{ t: 0, preset: 'plain', from: 0, to: 5 }],
};

fs.writeFileSync('films/scene/cadence.json', JSON.stringify(scene, null, 2) + '\n');
console.log(`wrote films/scene/cadence.json · ${scene.layers.length} layers · no cuts · ${scene.duration}s`);
