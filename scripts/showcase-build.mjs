// Builds the block-based showcase scenes (data story + product UI) by composing the block
// registry the proven way: BLOCKS[family]({ ...props, x, y, start, dur }) -> layer array.
// Emits formats/scene/showcase-data.json + showcase-ui.json on the cinematic vawe-site theme.
import fs from 'node:fs';
import { BLOCKS } from '../blocks/index.mjs';

const T = 'vawe-site';
const write = (name, scene) => { fs.writeFileSync(`formats/scene/${name}.json`, JSON.stringify(scene, null, 1)); console.log(`wrote formats/scene/${name}.json (${scene.layers.length} layers)`); };
const txt = (o) => ({ type: 'text', ...o });

/* ---------- 1. DATA STORY — a chart draws, a number counts up, KPIs land ---------- */
{
  const L = [
    txt({ text: 'data story', font: 'mono', x: 140, y: 150, size: 22, color: 'var(--accent)', start: 0.1, duration: 9.4 }),
    txt({ text: 'Requests, per day.', x: 140, y: 250, size: 82, weight: 700, split: 'word', preset: 'up', stagger: 0.06, each: 0.45, start: 0.3, duration: 9.2 }),
    ...BLOCKS.lineChart({
      x: 140, y: 470, w: 1050, h: 400, label: 'requests / day', variant: 'area',
      data: [{ label: 'M', value: 32 }, { label: 'T', value: 41 }, { label: 'W', value: 38 }, { label: 'T', value: 63 }, { label: 'F', value: 71 }, { label: 'S', value: 88 }, { label: 'S', value: 97 }],
      start: 0.8, dur: 8.6,
    }),
    ...BLOCKS.statBig({ x: 1330, y: 430, to: 2400000, label: 'requests / month', size: 150, start: 3.0, dur: 6.4 }),
    ...BLOCKS.kpiRow({
      x: 140, y: 940, items: [{ value: '+41%', label: 'week over week' }, { value: '97', label: 'peak / day' }, { value: '0', label: 'dropped' }],
      start: 5.4, dur: 4.0,
    }),
  ];
  write('showcase-data', { module: 'scene', theme: T, duration: 9.6, audio: { silent: false }, stings: [{ t: 0.8, fx: 'leak' }, { t: 3.0, fx: 'flash' }], layers: L });
}

/* ---------- 2. PRODUCT UI — a rebuilt dashboard, a cursor clicks, a toast lands ---------- */
{
  const fx = 360, fy = 250, fw = 1200, fh = 620;   // browser frame box
  const L = [
    txt({ text: 'product UI', font: 'mono', x: 140, y: 150, size: 22, color: 'var(--accent)', start: 0.1, duration: 8.2 }),
    ...BLOCKS.browserFrame({ x: fx, y: fy, w: fw, h: fh, url: 'app.vawe.dev', start: 0.3, dur: 7.8 }),
    // rebuilt dashboard inside the frame (content region starts ~64px below chrome)
    txt({ text: 'Overview', x: fx + 44, y: fy + 108, size: 40, weight: 700, start: 0.7, duration: 7.4 }),
    ...BLOCKS['card.stat']({ x: fx + 44, y: fy + 180, w: 330, to: 1950, label: 'frames rendered', delta: '+12%', deltaUp: true, start: 1.0, dur: 7.1 }),
    ...BLOCKS.lineChart({ x: fx + 430, y: fy + 180, w: 700, h: 300, label: 'renders / hour', variant: 'area',
      data: [{ label: 'M', value: 28 }, { label: 'T', value: 44 }, { label: 'W', value: 39 }, { label: 'T', value: 66 }, { label: 'F', value: 82 }], start: 1.3, dur: 6.8 }),
    // cursor glides in and clicks
    { type: 'cursor', x: fx + fw - 210, y: fy + fh - 90, size: 42, start: 3.0, duration: 4.6, clicks: [1.6], path: [{ t: 0, x: -520, y: -260 }, { t: 1.4, x: 0, y: 0, ease: 'easeInOutCubic' }, { t: 4.6, x: 0, y: 0 }] },
    // ...and the click has a consequence: a toast confirms
    ...BLOCKS.toast({ x: fx + fw - 470, y: fy + fh - 130, w: 430, message: 'Video rendered to out.mp4', action: 'Open', start: 4.8, dur: 3.0 }),
  ];
  write('showcase-ui', { module: 'scene', theme: T, duration: 8.4, audio: { silent: false }, stings: [{ t: 4.7, fx: 'flash' }], layers: L });
}
