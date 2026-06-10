// studio/check.mjs — automated visual + health check for Shortwave Studio.
// Spawns its own server, drives the studio with a headless browser across every format
// (+ landscape where supported), and FAILS on: scene errors, unexpected 4xx, or rendered
// dimensions that don't match the requested orientation. Writes a contact sheet to
// /tmp/studio_check.png. This is how we catch studio regressions without eyeballing.
//
//   node studio/check.mjs            (exit 0 = healthy, 1 = problems)
import { spawn, spawnSync } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PORT = 4400 + Math.floor((Date.now() % 1000) / 10); // vary to dodge a stuck port
const BASE = `http://localhost:${PORT}`;

const srv = spawn('node', ['studio/server.mjs'], { cwd: repoRoot, env: { ...process.env, PORT: String(PORT) }, stdio: 'ignore' });
const cleanup = () => { try { srv.kill(); } catch {} };
process.on('exit', cleanup);

// wait for the server to accept connections
for (let i = 0; i < 50; i++) { try { if ((await fetch(BASE + '/__formats')).ok) break; } catch {} await sleep(100); }
const formats = await (await fetch(BASE + '/__formats')).json();

// landscape is opt-in per format (only those with a [data-orient="landscape"] layout); probe the source
const supportsLandscape = (f) => fs.readFileSync(path.join(repoRoot, 'formats', f, 'scene.html'), 'utf8').includes('data-orient="landscape"');
const cases = [];
for (const f of formats) { cases.push({ f, orient: 'portrait' }); if (supportsLandscape(f)) cases.push({ f, orient: 'landscape' }); }

const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
const tiles = [];
const problems = [];

for (const { f, orient } of cases) {
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
  const issues = [];
  page.on('pageerror', (e) => issues.push('pageerror: ' + e.message));
  // skip the URL-less "Failed to load resource" line (favicon noise); real 4xx are caught with URLs below
  page.on('console', (m) => m.type() === 'error' && !/Failed to load resource/.test(m.text()) && issues.push('console: ' + m.text()));
  page.on('response', (r) => { const u = r.url(); if (r.status() >= 400 && !u.endsWith('favicon.ico')) issues.push(r.status() + ' ' + u.replace(BASE, '')); });

  const settled = () => page.waitForFunction(() => /✓|rror/.test(document.querySelector('#status')?.textContent || ''), { timeout: 25000 }).then(() => true).catch(() => false);
  const dimsAre = (w) => page.waitForFunction((ww) => (document.querySelector('#status')?.textContent || '').includes(ww + '×'), { timeout: 25000 }, String(w)).then(() => true).catch(() => false);
  await page.goto(BASE + '/', { waitUntil: 'load' });
  await page.waitForFunction(() => document.querySelector('#fmt')?.options.length > 0, { timeout: 10000 });
  // sequential, realistic: settle each transition before the next (rapid overlap is a separate stress test)
  await page.select('#fmt', f);
  await settled();
  let ok = true;
  if (orient === 'landscape') { await page.select('#orient', 'landscape'); ok = await dimsAre(1920); }
  else ok = await dimsAre(1080);
  await sleep(300);

  const info = await page.evaluate(() => {
    const w = document.querySelector('#frame').contentWindow;
    return { status: document.querySelector('#status').textContent, drew: !!(w && w.__engine),
      mw: w?.__engine?.meta.width, mh: w?.__engine?.meta.height,
      segMeta: (w?.__engine?.meta.segments || []).length,
      segDom: document.querySelectorAll('#track .tl-seg').length,
      grips: document.querySelectorAll('#track .tl-seg.edit .tl-grip').length,
      ticks: document.querySelectorAll('#ruler .tl-tick').length,
      audioLane: !!document.querySelector('#audio'),
      head: !!document.querySelector('#tlHead') };
  });
  const wantW = orient === 'landscape' ? 1920 : 1080, wantH = orient === 'landscape' ? 1080 : 1920;
  const label = `${f}/${orient}`;
  if (!ok || !info.drew) problems.push(`${label}: did not render (${info.status})`);
  else if (info.mw !== wantW || info.mh !== wantH) problems.push(`${label}: dims ${info.mw}×${info.mh}, expected ${wantW}×${wantH}`);
  // timeline must build: playhead + ruler always present; segment blocks mirror the meta the scene
  // exposed; and every exposed segment is editable (carries a resize grip), so pacing is tunable.
  if (info.drew && !info.head) problems.push(`${label}: timeline playhead missing`);
  if (info.drew && !info.ticks) problems.push(`${label}: timeline ruler has no ticks`);
  if (info.drew && !info.audioLane) problems.push(`${label}: audio lane missing`);
  if (info.drew && info.segMeta !== info.segDom) problems.push(`${label}: timeline segments ${info.segDom} DOM vs ${info.segMeta} meta`);
  if (info.drew && info.segMeta > 0 && info.grips !== info.segMeta) problems.push(`${label}: ${info.grips} resize grips for ${info.segMeta} segments`);
  if (issues.length) problems.push(`${label}: ${[...new Set(issues)].join(' ; ')}`);

  const tileDir = '/tmp/studio_check_tiles';
  if (tiles.length === 0) { fs.rmSync(tileDir, { recursive: true, force: true }); fs.mkdirSync(tileDir, { recursive: true }); }
  const tile = path.join(tileDir, String(tiles.length).padStart(2, '0') + '.png');
  const raw = `/tmp/sc_${label.replace('/', '_')}.png`;
  await page.screenshot({ path: raw });
  spawnSync('ffmpeg', ['-v', 'error', '-y', '-i', raw, '-vf',
    `scale=420:262,drawtext=text='${label}${ok ? '' : ' FAIL'}':x=8:y=8:fontsize=20:fontcolor=white:box=1:boxcolor=black@0.7`, tile]);
  tiles.push(tile);
  await page.close();
}
await browser.close();
cleanup();

if (tiles.length) {
  const cols = 3, rows = Math.ceil(tiles.length / cols);
  spawnSync('ffmpeg', ['-v', 'error', '-y', '-i', '/tmp/studio_check_tiles/%02d.png',
    '-vf', `tile=${cols}x${rows}:padding=8:color=0x0a0a0c`, '-frames:v', '1', '/tmp/studio_check.png']);
}

console.log(`\nchecked ${cases.length} cases (${formats.length} formats)`);
if (problems.length) { console.error('✗ STUDIO CHECK FAILED:\n  - ' + problems.join('\n  - ') + `\n  contact sheet: /tmp/studio_check.png`); process.exit(1); }
console.log(`✓ studio healthy — all cases rendered, correct dims, no console errors / 4xx. sheet: /tmp/studio_check.png`);
