// build-cadence-film.mjs — 15s, three dense 5s beats joined by TWO transitions, one invisible and one
// expressive. The shape docs/CRAFT/TRANSITIONS.md argues for: one cut family carries the film and a
// single seam is earned at the payoff. Three families would trip `effect-soup`; the vocabulary is deep
// so you can pick the right one, not so you can use several.
//
// The spine is a sound-form that survives both transitions and changes at each: one flat bar in beat 1,
// four stems in beat 2, one tall waveform in beat 3. Same SVG throughout, driven by var(--t), so the
// object genuinely persists rather than being three graphics that resemble each other.
import fs from 'node:fs';

const FORM = { x: 196, y: 548, w: 1528, h: 404 };
const N = 64, ROWS = 4;
const CUT1 = 5.0, CUT2 = 10.0;
const STEMS = ['DRUMS', 'BASS', 'KEYS', 'STRINGS'];

// one envelope per stem, fixed and hand-shaped so each row reads as a different instrument rather than
// as noise: drums spiky, bass slow, keys mid, strings a long swell
const env = (row, u) => {
  if (row === 0) return Math.abs(Math.sin(u * 47)) * (0.35 + 0.65 * Math.abs(Math.sin(u * 6.2)));
  if (row === 1) return 0.42 + 0.5 * Math.sin(u * 5.1 + 0.4);
  if (row === 2) return (0.3 + 0.5 * Math.abs(Math.sin(u * 12.4 + 1))) * (0.5 + 0.5 * Math.sin(u * Math.PI));
  return Math.sin(u * Math.PI) * (0.55 + 0.4 * Math.sin(u * 3.3));
};

const form = () => {
  const W = FORM.w, H = FORM.h, gap = 5, bw = (W - 220 - gap * (N - 1)) / N;
  const rowGap = 78, mid = H / 2;
  const out = [`<svg viewBox="0 0 ${W} ${H}" width="${W}" xmlns="http://www.w3.org/2000/svg">`];
  const P = (from, dur) => `clamp(0,(var(--t,0) - ${from}) / ${dur},1)`;
  // the collapse: stems fold onto one line and the merged form grows
  const COL = P(CUT2 - 0.28, 0.72);

  STEMS.forEach((name, r) => {
    const appear = r === 0 ? 0.55 : CUT1 - 0.2 + r * 0.34;      // row 0 IS the beat-1 bar; the rest arrive in beat 2
    const dy = (r - (ROWS - 1) / 2) * rowGap;
    const label = `<text x="0" y="${(mid + dy + 7).toFixed(1)}" font-family="var(--font-mono)" font-size="21" fill="var(--dim)"`
      + ` style="opacity:calc(${P(appear, 0.3)} * (1 - ${COL}))">${name}</text>`;
    out.push(label);
    for (let i = 0; i < N; i++) {
      const u = i / (N - 1);
      const x = +(220 + i * (bw + gap)).toFixed(1);
      const at = +(appear + 0.009 * i).toFixed(3);
      const hgt = Math.max(4, Math.abs(env(r, u)) * 62);
      // in beat 1 row 0 is a near-flat line; it opens up when the stems arrive
      const open = r === 0 ? `(0.12 + 0.88 * ${P(CUT1 - 0.15, 0.5)})` : '1';
      // merged height: every row lends its shape to one tall form on the collapse
      const merged = Math.max(6, Math.abs(env(0, u) * 0.5 + env(1, u) * 0.5 + env(2, u) * 0.6 + env(3, u) * 1.1) * 74);
      out.push(`<rect x="${x}" y="${(mid + dy - hgt / 2).toFixed(1)}" width="${bw.toFixed(1)}" height="${hgt.toFixed(1)}"`
        + ` rx="${(bw / 2).toFixed(1)}" fill="var(--accent)"`
        + ` style="transform-box:view-box;transform-origin:${(x + bw / 2).toFixed(1)}px ${(mid + dy).toFixed(1)}px;`
        + `transform:translateY(calc(${(-dy).toFixed(1)}px * ${COL}))`
        + ` scaleY(calc(${P(at, 0.26)} * ${open} * (1 - ${COL}) + ${(merged / hgt).toFixed(3)} * ${COL}));`
        + `opacity:calc(${P(at, 0.26)} * (1 - ${COL} * ${r === 3 ? 0 : 0.999}))"/>`);
    }
  });
  // the playhead sweeps the stems while they build, then retires into the merged form
  out.push(`<rect width="2" height="${H - 40}" y="20" fill="var(--text-2)"`
    + ` style="opacity:calc(${P(CUT1 + 0.1, 0.25)} * (1 - ${COL}));`
    + `x:calc(220px + ${(W - 240).toFixed(0)}px * ${P(CUT1 + 0.1, 4.2)})"/>`);
  return out.join('') + '</svg>';
};

const chrome = () => {
  const pill = (x, y, w, h, r = 18) => `<div style="position:absolute;left:${x}px;top:${y}px;width:${w}px;`
    + `height:${h}px;border-radius:${r}px;background:var(--surface-2)"></div>`;
  return `<div style="position:relative;width:1920px;height:1080px">`
    + `<div style="position:absolute;left:200px;top:372px;width:1520px;height:132px;border-radius:24px;`
    + `background:linear-gradient(90deg,#0e1014 0%,#171a21 60%,#1e222a 100%);border:1px solid var(--line)"></div>`
    + pill(1500, 398, 196, 80, 18)
    + `</div>`;
};

const T = (o) => ({ type: 'text', weight: 700, color: 'var(--text)', ls: '-0.02em', ...o });

const scene = {
  module: 'scene',
  theme: 'cadence',
  aspect: '16:9',
  duration: 15,
  sceneUnits: false,
  authoringNote: 'Three dense 5s beats, two transitions: an invisible riseBlur cut at 5s carries the '
    + 'film and ONE expressive cinematicZoom seam is earned at the 10s payoff (docs/CRAFT/TRANSITIONS.md). '
    + 'The sound-form is the spine: a flat bar, then four stems, then one merged waveform, all one SVG '
    + 'driven by var(--t), so it survives both transitions and CHANGES at each. Built by '
    + 'scripts/author/build-cadence-film.mjs; the cut easings are verified with `make measure`.',
  // NO cuts and NO seams, deliberately. A cut transforms one root and never touches the second scene;
  // a seam blends two frozen stills. Both are something laid OVER a boundary. Here the boundary is
  // BUILT: at 5s the input bar hands its pose to the stem panel (`becomes`) while the form opens from
  // one line into four, and at 10s the four fold back into one. Nothing crosses that is not already on
  // screen, so there is no transition to look at — only the content changing state.
  layers: [
    // ---- beat 1: the ask ----
    T({ text: 'CADENCE', x: 200, y: 150, w: 900, size: 26, weight: 500, color: 'var(--text-2)',
      font: 'mono', ls: '0.22em', start: 0.08,  duration: 4.72, anim: 'fade', enterDur: 0.5 }),
    T({ text: 'Every scene needs a score.', x: 200, y: 214, w: 1500, size: 104,
      split: 'word', preset: 'up', each: 0.5, stagger: 0.05, start: 0.32, duration: 4.62,
      out: 'up', exitDur: 0.42 }),
    { type: 'html', id: 'chrome', x: 0, y: 0, w: 1920, h: 1080, html: chrome(), becomes: 'stems',
      becomesDur: 0.5, start: 1.65, duration: 3.35,
      anim: 'fade', enterDur: 0.35, out: 'down', exitDur: 0.52,
      motion: [{ t: 0, y: 26 }, { t: 0.46, y: 0, ease: 'easeOutCubic' }] },
    T({ id: 'prompt', panWith: 'chrome', text: 'Score a chase through Tokyo rain', x: 246, y: 414,
      w: 1300, size: 42, weight: 400, typing: 84, caret: true, caretHold: true,
      start: 2.05, duration: 2.6, out: 'fade', motion: [{ t: -0.4, y: 0 }] }),

    // ---- the spine: one form across all three beats ----
    { type: 'html', id: 'form', x: FORM.x, y: FORM.y, w: FORM.w, h: FORM.h, html: form(),
      start: 0.4, duration: 14.6, anim: 'fade', enterDur: 0.5, exitDur: 0 },

    { type: 'rect', id: 'stems', x: 176, y: 528, w: 1568, h: 444, radius: 26, bg: 'rgba(255,255,255,0.02)',
      border: '1px solid var(--line)', start: 4.72, duration: 5.08, anim: 'fade', enterDur: 0.56, out: 'fade' },

    // ---- beat 2: the work ----
    T({ text: 'Four stems. One take.', x: 200, y: 214, w: 1500, size: 104,
      split: 'word', preset: 'up', each: 0.46, stagger: 0.05, start: 4.94, duration: 4.9,
      out: 'up', exitDur: 0.42 }),
    T({ text: 'Written, arranged and mixed while you watch.', x: 200, y: 356, w: 1020, size: 40,
      weight: 400, color: 'var(--text-2)', anim: 'rise', enterDur: 0.55, start: 5.95, duration: 3.7, out: 'fade',
      motion: [{ t: 0, y: 16 }, { t: 0.5, y: 0, ease: 'easeOutCubic' }] }),
    T({ text: '00:00 / 01:30', x: 1310, y: 356, w: 410, size: 34, weight: 500, align: 'right',
      color: 'var(--text-2)', font: 'mono', anim: 'fade', enterDur: 0.5, start: 6.2, duration: 3.45, out: 'fade' }),

    // ---- beat 3: the payoff ----
    T({ text: 'Ninety seconds of music.', x: 200, y: 214, w: 1500, size: 104,
      split: 'word', preset: 'up', each: 0.48, stagger: 0.05, start: 9.92, duration: 5.08, exitDur: 0 }),
    T({ text: 'Eleven seconds of work.', x: 200, y: 348, w: 980, size: 66, weight: 700,
      color: 'var(--accent)', split: 'word', preset: 'up', each: 0.44, stagger: 0.05,
      start: 11.05, duration: 3.95, exitDur: 0 }),
    T({ text: 'cadence.audio', x: 1240, y: 372, w: 480, size: 34, weight: 500, align: 'right',
      color: 'var(--text-2)', font: 'mono', anim: 'fade', enterDur: 0.6, start: 12.1, duration: 2.9, exitDur: 0 }),
  ],
  // A HAND-AUTHORED backdrop, because `dotmatrix` was chosen to clear a `no-bg-motion` warning and a
  // dot field means nothing for a product that writes music. This is the grid the music sits on: beat
  // lines every 120px and a brighter bar line every fourth, scrolling left at 240px/s. At that rate one
  // beat crosses every 0.5s, so the field is keeping 120bpm — the backdrop is a metronome rather than a
  // texture. Plus the zero-line the waveform is drawn against, and a vignette so the centre reads.
  // No CSS animation anywhere (the sanitiser rejects it by name): everything is a function of var(--t),
  // so a seeked frame is pure in n.
  bg: [{ t: 0, from: 0, to: 15, tone: 'dark', html:
    `<div style="position:absolute;inset:0;background:#07080a"></div>`
    // TRANSFORM, because it is the path core/bg-html.js documents and the DOM confirms it: at t=7.0 this
    // element computes matrix(1,0,0,1,-1680,0), exactly 7.0 x -240. I first blamed background-position
    // for not moving, on a pixel test that was too crude to tell — at alpha 0.05 under a vignette the
    // flat backdrop dominates and a zero shift wins by default. That was a bad measurement, not a
    // finding; whether background-position also works is untested.
    + `<div style="position:absolute;top:0;bottom:0;left:0;width:5600px;`
    + `background-image:repeating-linear-gradient(90deg,rgba(255,176,32,0.20) 0 2px,transparent 2px 480px),`
    + `repeating-linear-gradient(90deg,rgba(255,176,32,0.085) 0 1px,transparent 1px 120px);`
    + `transform:translateX(calc(var(--t,0) * -240px))"></div>`
    + `<div style="position:absolute;left:0;right:0;top:50%;height:1px;background:rgba(255,176,32,0.07)"></div>`
    + `<div style="position:absolute;inset:0;background:radial-gradient(72% 58% at 50% 46%,`
    + `rgba(0,0,0,0) 0%,rgba(0,0,0,0.42) 74%,rgba(0,0,0,0.78) 100%)"></div>` }],
  // a 15s film with a locked-off camera reads as a slideshow of stills however much moves inside it
  cameraMove: { move: 'slowPush', start: 0, dur: 15, from: 1, to: 1.06, ease: 'easeInOutCubic' },
};

fs.writeFileSync('formats/scene/cadence-film.json', JSON.stringify(scene, null, 2) + '\n');
console.log(`wrote formats/scene/cadence-film.json · ${scene.layers.length} layers · no cuts, no seams · ${scene.duration}s`);
