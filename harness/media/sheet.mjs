#!/usr/bin/env node
// `vawe sheet <page|mp4> [--at s,s,...] [--labels] [--cols n] [--out file.png]`: a storyboard sheet, one tile per second,
// the second printed on each tile and, with --labels, the data-world id of the world on top (a page only).
//   node harness/media/sheet.mjs films/my-launch/page.html --at 0.5,1.2,3 --labels
// Default seconds: the middle of each world of a page, else 12 evenly spaced.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { frameTile, tileGrid } from '../lib/tile.mjs';
import { durationOf } from '../lib/contact-sheet.mjs';
import { worldAt, worldRows } from '../lib/timeline.mjs';
import { parseAt } from './compare-frames.mjs';

const die = (m) => { console.error(`error: ${m}`); process.exit(2); };
const EVEN_TILES = 12;
const TILE_W = 480;

export const tileLabel = (t, world) => `${t}s${world ? ` ${world}` : ''}`;

/** `n` seconds spread over the film, centred in equal parts. */
export const evenSeconds = (dur, n = EVEN_TILES) => Array.from({ length: n }, (_, i) => +((i + 0.5) * dur / n).toFixed(2));

function videoSize(file) {
  const r = spawnSync('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height', '-of', 'csv=p=0', file], { encoding: 'utf8' });
  const [w, h] = r.stdout.trim().split(',').map(Number);
  if (!(w > 0 && h > 0)) die(`cannot read the size of ${file}`);
  return { w, h };
}

/** The middle of each world that shows, or `evenSeconds` for a page with none. */
export function storyboardSeconds(spans, dur) {
  const mids = worldRows(spans).map((w) => +((w.start + w.end) / 2).toFixed(2));
  return mids.length ? mids : evenSeconds(dur);
}

async function pageTiles(pagePath, at, withWorlds, dir) {
  const { openPage, seekAll, resolveFrame, settle, readPageMeta } = await import('./render-page.mjs');
  const dur = Number(readPageMeta(pagePath, 'duration'));
  if (!(dur > 0)) die(`${pagePath} has no <meta name="duration">`);
  const frame = resolveFrame(pagePath);
  const opened = await openPage(pagePath, frame, { warm: true });
  try {
    if (!opened.reused) {
      await opened.page.goto(opened.url, { waitUntil: 'load' });
      await settle(opened.page);
      await opened.markWarm?.();
    }
    const spans = withWorlds || !at ? await (await import('./world-sample.mjs')).sampleWorlds(opened.page, dur, (ms) => opened.page.evaluate((t) => window.__pageSeek(t / 1000), ms)) : [];
    const times = at ? parseAt(at) : storyboardSeconds(spans, dur);
    const shots = [];
    for (const [i, t] of times.entries()) {
      await seekAll(opened.page, t * 1000);
      const png = path.join(dir, `s${i}.png`);
      await opened.page.screenshot({ path: png });
      shots.push({ t, png, world: withWorlds ? worldAt(spans, t) : null });
    }
    return { shots, size: { w: frame.width, h: frame.height } };
  } finally {
    await opened.close();
  }
}

function videoTiles(mp4, at) {
  const times = at ? parseAt(at) : evenSeconds(durationOf(mp4));
  return { shots: times.map((t) => ({ t, png: mp4, world: null })), size: videoSize(mp4) };
}

async function main(argv) {
  const flag = (n) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : undefined; };
  const valued = new Set(['--at', '--cols', '--out']);
  const source = argv.find((a, i) => !a.startsWith('--') && !valued.has(argv[i - 1]));
  if (!source) die('missing <page|mp4>; usage: bin/vawe sheet <page|mp4> [--at s,s,...] [--labels] [--cols n] [--out file.png]');
  if (!fs.existsSync(source)) die(`no such file: ${source}`);
  const labels = argv.includes('--labels');
  const isPage = source.endsWith('.html');
  if (labels && !isPage) die('--labels names the world on each tile, which only a page has; give the page');
  const out = path.resolve(flag('--out') || path.join('out', `sheet-${path.basename(source, path.extname(source)) === 'page' ? path.basename(path.dirname(path.resolve(source))) : path.basename(source, path.extname(source))}.png`));
  fs.mkdirSync(path.dirname(out), { recursive: true });
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'vawe-sheet-'));
  try {
    let read;
    try { read = isPage ? await pageTiles(source, flag('--at'), labels, dir) : videoTiles(source, flag('--at')); } catch (e) { die(e.message); }
    const th = Math.round((TILE_W * read.size.h) / read.size.w);
    const tiles = read.shots.map((s, i) => frameTile(s.png, s.t, path.join(dir, `t${i}.png`), { tw: TILE_W, th, label: tileLabel(s.t, s.world) }));
    const cols = Number(flag('--cols')) || Math.min(tiles.length, 4);
    tileGrid(tiles, { cols, tw: TILE_W, th, out });
    console.log(`✓ ${out}: ${tiles.length} tile(s), ${cols} per row, left to right: ${read.shots.map((s) => tileLabel(s.t, s.world)).join(', ')}`);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

if (import.meta.url === `file://${process.argv[1]}`) main(process.argv.slice(2)).catch((e) => die(e.stack || String(e)));
