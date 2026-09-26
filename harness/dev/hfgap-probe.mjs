#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as VFX from '../../blocks/vfx.mjs';
import { expandThemeFile } from '../lib/theme-load.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const theme = process.argv[2] || 'vawe';
const palette = expandThemeFile(JSON.parse(fs.readFileSync(path.join(root, 'themes', `${theme}.json`), 'utf8'))).palette;
const lum = (hex) => {
  const m = /^#([0-9a-f]{6})$/i.exec(String(hex || ''));
  if (!m) return 1;
  const n = parseInt(m[1], 16);
  return (0.2126 * ((n >> 16) & 255) + 0.7152 * ((n >> 8) & 255) + 0.0722 * (n & 255)) / 255;
};
const dark = lum(palette.bg) < 0.5;

const CODE = ['export function serve(req) {', '  const t = route(req.url);', '  if (!t) return notFound(req);', '  return t.handle(req);', '}'];

const BEATS = [
  () => VFX.textCursor({ x: 220, y: 470, w: 1480, body: 'Ship it', size: 150, cursor: 'block' }),
  () => VFX.parallaxZoom({ x: 360, y: 160, w: 1200, h: 760, title: 'One card takes the frame',
    caption: 'the neighbours travel outward', tiles: [{ label: 'queue' }, { label: 'index' }, { label: 'cache' },
      { label: 'edge' }, { label: 'store' }, { label: 'logs' }, { label: 'auth' }, { label: 'jobs' }] }),
  () => VFX.parallaxUnzoom({ x: 360, y: 160, w: 1200, h: 760, title: 'and hands it back',
    caption: 'the same board, run backwards', tiles: [{ label: 'queue' }, { label: 'index' }, { label: 'cache' },
      { label: 'edge' }, { label: 'store' }, { label: 'logs' }, { label: 'auth' }, { label: 'jobs' }] }),
  () => VFX.morphText({ x: 410, y: 460, w: 1100, words: ['ideas', 'drafts', 'inbox', 'shipped'], size: 120, hold: 0.8 }),
  () => VFX.redditPost({ x: 650, y: 340, w: 620, sub: 'programming', author: 'deterministic', age: '4h',
    title: 'Every frame is a pure function of n', body: 'No clock, no random, no accumulation. Render 412 alone or after 411 others.',
    votes: 2410, comments: 188, voted: 'up' }),
  () => VFX.uiReveal3d({ x: 620, y: 260, w: 680, items: [{ label: 'Frames rendered', value: '1,320' },
    { label: 'Workers', value: '8' }, { label: 'Draft render', value: '31s' },
    { label: 'Blocks swept', value: '179' }, { label: 'Identical', value: '106' }] }),
  () => [{ type: 'three', three: 'codeExtrude', lines: CODE, x: 0, y: 0, w: 1920, h: 1080, dolly: 5.6 }],
  () => [{ type: 'three', three: 'codeDissolve', lines: CODE, x: 0, y: 0, w: 1920, h: 1080, dolly: 5.6, breakAt: 0.6, breakDur: 1.8 }],
  () => [{ type: 'three', three: 'codeAssemble', lines: CODE, x: 0, y: 0, w: 1920, h: 1080, dolly: 5.6 }],
];

const SPAN = 3;
const layers = [];
BEATS.forEach((make, i) => {
  const start = i * SPAN;
  for (const L of make()) layers.push({ ...L, start: start + (L.start ?? 0), duration: SPAN });
});
const duration = BEATS.length * SPAN;

const scene = {
  module: 'scene', theme, aspect: '16:9', duration,
  audio: { silent: true, _why: 'a block probe, not a film: the subject is what each block draws, and a bed would only add a thing to check' },
  bg: [{ preset: dark ? 'dark' : 'paper', from: 0, to: duration }],
  layers,
};
const out = path.join(root, 'films/scene/_probe-hfgap.json');
fs.writeFileSync(out, JSON.stringify(scene, null, 2) + '\n');
console.log(`_probe-hfgap.json · theme ${theme} (${dark ? 'dark' : 'light'}) · ${layers.length} layers · ${duration}s`);
