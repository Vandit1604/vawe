// showcase-build.mjs — emits the six capability clips the site's showcase rows play.
//
//   node scripts/author/showcase-build.mjs        # → formats/scene/showcase-*.json
//
// THE RULE EVERY CLIP OBEYS: the capability performs itself. No clip carries an eyebrow naming what
// it is ("kinetic typography", "shader stings"), and no clip labels its effects ("fade", "whip",
// "flash") — a word in a box proves nothing, and six clips sharing one skeleton is exactly what the
// ledger flags. Each clip is a hook and a payoff, with the artifact as the argument.
//
// Theme is `vawe`: the real brand read off site/app/globals.css — white field, one cobalt accent.
import fs from 'node:fs';
import { BLOCKS } from '../../blocks/index.mjs';

const T = 'vawe';
const write = (name, scene) => {
  fs.writeFileSync(`formats/scene/${name}.json`, JSON.stringify(scene, null, 2));
  console.log(`  ✓ ${name.padEnd(17)} ${String(scene.duration).padStart(4)}s  ${String(scene.layers.length).padStart(2)} layers  ${(scene.cuts || []).length} cuts  ${(scene.stings || []).length} stings`);
};
const txt = (o) => ({ type: 'text', ...o });
const base = (duration) => ({ module: 'scene', aspect: '16:9', theme: T, duration, audio: { silent: true } });
// one centred full-bleed word, composed identically every time so only the MOTION differs
const hero = (text, o = {}) => txt({ text, x: 210, y: 400, w: 1500, align: 'center', size: 190, weight: 700, color: 'var(--text)', ...o });

/* ── 1. TYPE ── the word performs its own definition: content and proof are the same object. ──── */
{
  const L = [
    hero('stagger', { split: 'char', preset: 'up', stagger: 0.085, each: 0.42, start: 0.25, duration: 1.95, anim: 'none', exitDur: 0.22 }),
    hero('decode', { split: 'char', preset: 'decode', stagger: 0.045, each: 0.4, start: 2.35, duration: 1.95, anim: 'none', exitDur: 0.22 }),
    hero('blur', { split: 'char', preset: 'blur', presetOpts: { px: 30 }, stagger: 0.07, each: 0.55, start: 4.45, duration: 1.95, anim: 'none', exitDur: 0.22 }),
    txt({ text: 'Every word, a function of <b>n</b>.', x: 210, y: 440, w: 1500, align: 'center', size: 96, weight: 700, color: 'var(--text)', split: 'word', preset: 'up', stagger: 0.075, each: 0.5, start: 6.5, duration: 1.9, anim: 'none', exitDur: 0 }),
  ];
  write('showcase-type', { ...base(8.4), layers: L, cuts: [{ t: 2.3, style: 'punch' }, { t: 4.4, style: 'punch' }, { t: 6.45, style: 'riseBlur' }] });
}

/* ── 2. CUTS ── it must actually CUT. The old clip had cuts:0 and drew labels reading "fade". ─── */
{
  const card = (label, value, start, dur) => [
    { type: 'rect', x: 460, y: 300, w: 1000, h: 420, bg: 'var(--surface)', border: '1px solid var(--line-strong)', radius: 16, elevation: 1, start, duration: dur, anim: 'none', exitDur: 0.01 },
    txt({ text: value, x: 460, y: 392, w: 1000, align: 'center', size: 132, weight: 700, color: 'var(--text)', start: start + 0.05, duration: dur - 0.06, anim: 'none', exitDur: 0.01 }),
    txt({ text: label, x: 460, y: 600, w: 1000, align: 'center', size: 26, font: 'mono', color: 'var(--dim)', start: start + 0.05, duration: dur - 0.06, anim: 'none', exitDur: 0.01 }),
  ];
  const L = [
    txt({ text: 'A cut is a <b>feeling</b>.', x: 210, y: 440, w: 1500, align: 'center', size: 110, weight: 700, color: 'var(--text)', split: 'word', preset: 'up', stagger: 0.07, each: 0.42, start: 0.25, duration: 1.5, anim: 'none', exitDur: 0.2 }),
    ...card('render', '1,350', 2.0, 1.0),
    ...card('workers', '8', 3.05, 1.0),
    ...card('drift', '0', 4.1, 1.0),
    ...card('reruns', 'again', 5.15, 1.0),
    ...card('bytes', 'same', 6.2, 1.1),
    txt({ text: 'Not a transition menu.', x: 210, y: 470, w: 1500, align: 'center', size: 84, weight: 700, color: 'var(--text)', split: 'word', preset: 'up', stagger: 0.07, each: 0.46, start: 7.4, duration: 0.8, anim: 'none', exitDur: 0 }),
  ];
  write('showcase-cuts', { ...base(8.2), layers: L, cuts: [
    { t: 1.98, style: 'whip' }, { t: 3.03, style: 'punch' }, { t: 4.08, style: 'flip' },
    { t: 5.13, style: 'iris' }, { t: 6.18, style: 'wipe' }, { t: 7.35, style: 'riseBlur' },
  ] });
}

/* ── 3. STINGS ── a sting is punctuation: it lands ON the reveal, and is never named. ─────────── */
{
  const L = [
    txt({ text: 'Every claim needs', x: 210, y: 360, w: 1500, align: 'center', size: 78, weight: 500, color: 'var(--text-2)', split: 'word', preset: 'up', stagger: 0.08, each: 0.5, start: 0.3, duration: 3.2, anim: 'none', exitDur: 0.25 }),
    txt({ text: 'a <b>moment</b> it lands.', x: 210, y: 470, w: 1500, align: 'center', size: 122, weight: 700, color: 'var(--text)', split: 'word', preset: 'up', stagger: 0.08, each: 0.5, start: 1.1, duration: 2.4, anim: 'none', exitDur: 0.25 }),
    txt({ text: 'proof.', x: 210, y: 400, w: 1500, align: 'center', size: 210, weight: 700, color: 'var(--accent)', split: 'char', preset: 'stretch', stagger: 0.03, each: 0.4, start: 3.75, duration: 2.05, anim: 'none', exitDur: 0.22 }),
    txt({ text: 'Punctuation, not decoration.', x: 210, y: 460, w: 1500, align: 'center', size: 86, weight: 700, color: 'var(--text)', split: 'word', preset: 'up', stagger: 0.07, each: 0.5, start: 6.1, duration: 2.3, anim: 'none', exitDur: 0 }),
  ];
  write('showcase-stings', { ...base(8.4), layers: L,
    cuts: [{ t: 3.7, style: 'punch' }, { t: 6.05, style: 'riseBlur' }],
    stings: [{ t: 3.72, fx: 'flash', colors: ['#2563eb'], intensity: 0.6 }, { t: 6.07, fx: 'leak', colors: ['#2563eb', '#8fc0ff'], intensity: 0.35 }] });
}

/* ── 4. DATA ── NOT the hero-metric template (big number + label + KPI row is an impeccable ban).
      Real measured figures: stripe.json renders 45.0s / 1350 frames. The shocker is determinism. ─ */
{
  const L = [
    txt({ text: 'One film. <b>1,350</b> frames.', x: 210, y: 280, w: 1500, align: 'center', size: 96, weight: 700, color: 'var(--text)', split: 'word', preset: 'up', stagger: 0.07, each: 0.44, start: 0.3, duration: 4.0, anim: 'none', exitDur: 0.24 }),
    ...BLOCKS['lineChart.area']({
      x: 400, y: 440, w: 1120, h: 330, label: 'frames rendered / worker',
      data: [{ label: '1', value: 169 }, { label: '2', value: 168 }, { label: '3', value: 169 }, { label: '4', value: 168 },
        { label: '5', value: 169 }, { label: '6', value: 169 }, { label: '7', value: 169 }, { label: '8', value: 169 }],
      start: 1.0, dur: 3.3,
    }),
    txt({ text: 'Render it again.', x: 210, y: 330, w: 1500, align: 'center', size: 92, weight: 500, color: 'var(--text-2)', split: 'word', preset: 'up', stagger: 0.07, each: 0.44, start: 4.5, duration: 3.9, anim: 'none', exitDur: 0 }),
    txt({ text: 'Byte for byte, <b>the same</b>.', x: 210, y: 450, w: 1500, align: 'center', size: 118, weight: 700, color: 'var(--text)', split: 'word', preset: 'up', stagger: 0.08, each: 0.5, start: 5.3, duration: 3.1, anim: 'none', exitDur: 0 }),
    txt({ text: 'renderFrame(n) is pure in n', x: 210, y: 660, w: 1500, align: 'center', size: 30, font: 'mono', color: 'var(--dim)', start: 6.4, duration: 2.0, anim: 'fade', enterDur: 0.5, exitDur: 0 }),
  ];
  write('showcase-data', { ...base(8.4), layers: L,
    cuts: [{ t: 4.45, style: 'riseBlur' }],
    stings: [{ t: 5.28, fx: 'flash', colors: ['#2563eb'], intensity: 0.4 }] });
}

/* ── 5. UI ── the click has a consequence, and the payoff reframes everything you just watched. ── */
{
  const fx = 400, fy = 190, fw = 1120, fh = 600;
  const L = [
    ...BLOCKS.browserFrame({ x: fx, y: fy, w: fw, h: fh, url: 'app.vawe.dev', start: 0.25, dur: 5.6 }),
    txt({ text: 'Overview', x: fx + 44, y: fy + 104, size: 38, weight: 700, color: 'var(--text)', start: 0.6, duration: 5.25, anim: 'fade', exitDur: 0.2 }),
    ...BLOCKS['card.stat']({ x: fx + 44, y: fy + 176, w: 330, to: 1350, label: 'frames rendered', delta: '+12%', deltaUp: true, start: 0.85, dur: 5.0 }),
    ...BLOCKS['lineChart.area']({ x: fx + 420, y: fy + 176, w: 640, h: 290, label: 'renders / hour',
      data: [{ label: 'M', value: 28 }, { label: 'T', value: 44 }, { label: 'W', value: 39 }, { label: 'T', value: 66 }, { label: 'F', value: 82 }], start: 1.1, dur: 4.75 }),
    { type: 'cursor', x: fx + fw - 200, y: fy + fh - 96, size: 44, start: 2.4, duration: 3.45, clicks: [1.5],
      path: [{ t: 0, x: -520, y: -280 }, { t: 1.4, x: 0, y: 0, ease: 'easeOutExpo' }, { t: 3.45, x: 0, y: 0 }] },
    ...BLOCKS.toast({ x: fx + fw - 470, y: fy + fh - 140, w: 430, message: 'Video rendered to out.mp4', action: 'Open', start: 4.05, dur: 1.8 }),
    txt({ text: 'No screen recording.', x: 210, y: 350, w: 1500, align: 'center', size: 88, weight: 500, color: 'var(--text-2)', split: 'word', preset: 'up', stagger: 0.07, each: 0.44, start: 6.05, duration: 2.35, anim: 'none', exitDur: 0 }),
    txt({ text: 'This is <b>JSON</b>.', x: 210, y: 470, w: 1500, align: 'center', size: 132, weight: 700, color: 'var(--text)', split: 'word', preset: 'up', stagger: 0.08, each: 0.5, start: 6.75, duration: 1.65, anim: 'none', exitDur: 0 }),
  ];
  write('showcase-ui', { ...base(8.4), layers: L,
    cuts: [{ t: 6.0, style: 'riseBlur' }],
    stings: [{ t: 4.06, fx: 'flash', colors: ['#2563eb'], intensity: 0.35 }] });
}

/* ── 6. ASPECT ── the site plays this scene at three ratios side by side, so the TRIO is the
      proof. The clip must not label its own ratio (the page already does) — it just composes. ── */
{
  const L = [
    txt({ text: 'one source', x: 60, y: 320, w: 1800, align: 'center', size: 38, font: 'mono', color: 'var(--dim)', start: 0.3, duration: 5.7, anim: 'fade', enterDur: 0.5, exitDur: 0 }),
    txt({ text: 'every <b>ratio</b>.', x: 60, y: 410, w: 1800, align: 'center', size: 148, weight: 700, color: 'var(--text)', split: 'word', preset: 'up', stagger: 0.09, each: 0.55, start: 0.7, duration: 5.3, anim: 'none', exitDur: 0 }),
  ];
  write('showcase-aspect', { ...base(6), layers: L });
}
