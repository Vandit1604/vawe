// scripts/dev/theme-sheet.mjs: ONE rendered contact sheet for ONE theme's `look` (W8,
// core/registry/theme-contract.js), so a brand's look is a picture an author can glance at, not a JSON they have
// to read. Same machinery as scripts/dev/preset-sheets.mjs (frameTile/tileGrid/tileBox/renderOf from
// scripts/gates/tile.mjs), reused rather than reimplemented: a second render-and-tile pipeline is a
// second thing to drift.
//
// A theme with no `look` has nothing to show; this refuses by name rather than rendering a blank sheet
// that would look like a bug.
//
//   node scripts/dev/theme-sheet.mjs --theme vawe   ·   make theme-sheet THEME=vawe
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { frameTile, tileGrid, tileBox, renderOf } from '../gates/tile.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const SCRATCH = path.join(ROOT, 'formats/scene/_batch/theme-sheets');
const OUT_DIR = path.join(ROOT, 'site/public/blocklib/themes');

const themeArg = process.argv.find((a) => a.startsWith('--theme='));
const theme = themeArg ? themeArg.slice('--theme='.length) : (process.env.THEME || '');
if (!theme) { console.error('usage: node scripts/dev/theme-sheet.mjs --theme <name>   ·   make theme-sheet THEME=<name>'); process.exit(2); }

const themePath = path.join(ROOT, 'themes', `${theme}.json`);
if (!fs.existsSync(themePath)) { console.error(`theme-sheet: no theme at ${path.relative(ROOT, themePath)}`); process.exit(2); }
const themeSpec = JSON.parse(fs.readFileSync(themePath, 'utf8'));
const look = themeSpec.look;
if (!look) { console.error(`theme-sheet: theme "${theme}" has no \`look\` block, nothing to show. See docs/CRAFT/THEME-LOOK.md.`); process.exit(2); }

const windows = look.backdrop && look.backdrop.length ? look.backdrop : ['plain'];
const perWindow = 2.2, tail = 0.4;
const dur = +(windows.length * perWindow + tail).toFixed(2);

// One bg window per backdrop preset, evenly split (a theme sheet is a reference clip, not a film: no
// cuts to bind windows to, so `from`/`to` is written explicitly rather than junction-bound).
const bg = windows.map((preset, i) => ({ from: +(i * perWindow).toFixed(2), to: +((i + 1) * perWindow).toFixed(2), preset }));

const cutDefault = look.cuts?.default || 'fade';
const cutAccent = look.cuts?.accent || cutDefault;
const transitions = windows.slice(1).map((_, i) => ({ at: +((i + 1) * perWindow).toFixed(2), fx: i === windows.length - 2 ? cutAccent : cutDefault, dur: 0.4 }));

const headlineSize = look.scale?.headline || 60;
const hookSize = look.scale?.hook || 80;
const anchor = look.layout?.anchor || 'left';
const margin = look.layout?.margin ?? 160;
const align = anchor === 'center' ? 'center' : anchor === 'right' ? 'right' : 'left';
const x = margin, w = 1920 - margin * 2;

const layers = [
  // beat A: the hook, at the theme's own hook scale.
  { type: 'text', text: `${theme}`, x, y: 380, w, align, size: hookSize, weight: 800,
    anim: 'pop', enterDur: 0.4, start: 0.1, duration: perWindow - 0.2, out: 'fade', exitDur: 0.3 },
  { type: 'text', text: 'the look', x, y: 380 + hookSize * 0.9, w, align, size: 32, weight: 500,
    font: 'mono', color: 'var(--dim)', anim: 'fade', enterDur: 0.4, start: 0.3, duration: perWindow - 0.4 },
  // one headline per backdrop window, naming the preset it sits on, at the theme's headline scale.
  ...windows.map((preset, i) => ({
    type: 'text', text: preset, x, y: 480, w, align, size: headlineSize, weight: 700,
    anim: 'pop', enterDur: 0.4, start: +(i * perWindow + 0.15).toFixed(2), duration: perWindow - 0.3, out: 'fade', exitDur: 0.3,
  })).slice(1),
  // cut family, named once so the sheet documents it rather than only demonstrating it.
  { type: 'text', text: `cuts: ${cutDefault} -> ${cutAccent}`, x, y: 960, w, align: 'left', size: 26, weight: 600,
    font: 'mono', color: 'var(--accent)', anim: 'fade', enterDur: 0.3, start: perWindow + 0.2, duration: dur - perWindow - 0.4 },
];

// the mark, at both sizes W8 fixes (end-card + headline-adjacent), held on the LAST window so the sheet's
// closing frame is also the one a real end card would use.
if (look.marks?.logo) {
  const markPath = path.join(ROOT, look.marks.logo);
  if (fs.existsSync(markPath)) {
    const endSize = look.marks.endCardSize || 140, headSize = look.marks.headlineSize || 100;
    const lastStart = +((windows.length - 1) * perWindow).toFixed(2);
    layers.push(
      { type: 'image', src: look.marks.logo, x: x, y: 700, w: headSize, h: headSize,
        anim: 'fade', enterDur: 0.3, start: lastStart + 0.1, duration: perWindow - 0.2 },
      { type: 'text', text: `headline mark: ${headSize}px`, x: x + headSize + 24, y: 700 + headSize / 2 - 14, w: 400, align: 'left', size: 22, font: 'mono', color: 'var(--dim)',
        anim: 'fade', enterDur: 0.3, start: lastStart + 0.2, duration: perWindow - 0.3 },
      { type: 'image', src: look.marks.logo, x: x + 480, y: 700, w: endSize, h: endSize,
        anim: 'fade', enterDur: 0.3, start: lastStart + 0.3, duration: perWindow - 0.4 },
      { type: 'text', text: `end-card mark: ${endSize}px`, x: x + 480 + endSize + 24, y: 700 + endSize / 2 - 14, w: 400, align: 'left', size: 22, font: 'mono', color: 'var(--dim)',
        anim: 'fade', enterDur: 0.3, start: lastStart + 0.4, duration: perWindow - 0.5 },
    );
  } else {
    console.error(`theme-sheet: theme "${theme}"'s look.marks.logo ("${look.marks.logo}") does not exist, skipping the mark frame.`);
  }
}

const scene = {
  module: 'scene',
  theme,
  aspect: '16:9',
  duration: dur,
  // `fade`/`dissolve`-family cuts need something underneath to cross-fade INTO: without this, a
  // whole-frame fade cut throws "the frame would go empty" (scripts/author/scaffold.mjs carries the
  // same note).
  sceneUnits: true,
  audio: { silent: true, _why: 'theme-sheet: a look reference, not a film' },
  bg,
  transitions,
  layers,
};

fs.mkdirSync(SCRATCH, { recursive: true });
fs.mkdirSync(OUT_DIR, { recursive: true });
const scenePath = path.join(SCRATCH, `${theme}.json`);
const destDir = path.join(OUT_DIR, theme);

fs.writeFileSync(scenePath, JSON.stringify(scene, null, 1));
execFileSync('node', ['core/validate/validate.mjs', scenePath], { cwd: ROOT, stdio: 'inherit' });
execFileSync('./bin/vawe', [scenePath, '--draft', '--workers', '2'], { cwd: ROOT, stdio: 'inherit' });

const mp4 = path.join(ROOT, renderOf(scenePath));
if (!fs.existsSync(mp4)) { console.error(`theme-sheet: renderer reported success but ${mp4} is missing`); process.exit(1); }

fs.mkdirSync(destDir, { recursive: true });
fs.copyFileSync(mp4, path.join(destDir, 'sheet.mp4'));

const box = tileBox(true);
const times = windows.map((_, i) => Math.min(dur - 0.15, i * perWindow + perWindow * 0.6));
const tiles = times.map((t, i) => frameTile(mp4, t, path.join(SCRATCH, `${theme}.tile${i}.png`), box));
tileGrid(tiles, { ...box, cols: Math.min(tiles.length, 4), out: path.join(destDir, 'sheet.png') });

console.log(`✓ theme-sheet: ${theme} (${windows.length} bg window(s), cuts ${cutDefault} -> ${cutAccent}) → ${path.relative(ROOT, path.join(destDir, 'sheet.png'))}`);
