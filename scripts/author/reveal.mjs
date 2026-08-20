// reveal.mjs — see how each beat ANIMATES IN, not just where it lands. `make beats` samples a beat's
// middle (the settled state), which hides the motion that carries the craft — the dolly direction, the
// typewriter, a colour-wave, a collage assembling. This renders, per beat, the ENTER arc densely +
// the settled frame + the EXIT arc, so the reveal is always visible. The recurring failure it kills:
// judging a beat by its hold and missing the reveal (docs/MISTAKES.md — the "settled not reveal" trap).
//
//   make reveal D=formats/scene/x.json                 → /tmp/reveal/<name>.png (one row per beat: enter | set | exit)
//   node scripts/author/reveal.mjs <scene.json> [--enter 0.7] [--n 8]
//   GHOST=1 node scripts/author/reveal.mjs <scene.json> → /tmp/reveal/<name>.ghost.png (onion skin)
//
// GHOST=1 answers a question the side-by-side sheet cannot. Three stills in a row show three poses, and
// three poses in three frames look the same whether the move was keyed twice or twenty times: the eye
// has to hold each cell in memory and imagine the path between them, which is exactly the work the sheet
// was supposed to do for you. An onion skin puts every pose of one entrance in ONE frame, so the
// trajectory is a shape you look at. A move keyed only at its endpoints draws an even, straight smear;
// a move with middle poses bends, bunches, or changes direction. This library's median scene has zero
// hand-keyed motion tracks (CLAUDE.md), and nothing here could show that.
//
// Deterministic: reads the scene's exact layer start-times to place each beat's enter window precisely
// (no guessing), and renders headless via the engine's pure renderFrame(n). For a raw reference video
// (no JSON) use `make filmstrip … FROM=<beat> FPS=12` per beat instead — this tool is for our renders.
import http from 'node:http';
import fs from 'node:fs';
import { onScreenText } from '../lib/text.mjs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer';
import { sceneDims } from '../../core/safe.js';
import { writeReceipt } from '../lib/receipt.mjs';
import { scratch, ffmpegOrDie } from '../lib/scratch.mjs';
import { lowerScene } from '../../core/transitions-lower.js';
// The ramp lengths have ONE definition and this is it. Re-deriving the default here is how the two
// copies drift: the `--layers` window below carried a hand-written `?? 0.4` while the engine's default
// has been 0.3 since the snap band landed, so every per-layer window was sampled ~33% too wide.
import { enterDurOf } from '../../core/clips.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const argv = process.argv.slice(2);

// Record that a contact sheet was produced for THIS exact scene content, so beat-check can nag when the
// scene moves on without anyone looking. The hashing and the path now live in scripts/lib/receipt.mjs;
// this used to be a copy-paste kept "identical" by hand in beats.mjs and reveal.mjs, which is a promise
// no comment can keep.
function writeSeenReceipt(scene, sheet, tool) { writeReceipt('beats', scene, { sheet, tool }); }
const flag = (n, d) => { const i = argv.indexOf(n); return i >= 0 ? +argv[i + 1] : d; };
const dataArg = argv.find((a, i) => !a.startsWith('--') && !(argv[i - 1] || '').startsWith('--'));
if (!dataArg || !fs.existsSync(dataArg)) { console.error('usage: node scripts/author/reveal.mjs <scene.json> [--enter 0.7] [--n 8]'); process.exit(1); }
const ENTER = flag('--enter', 0.7);   // seconds of the entrance to sample densely
const NENTER = flag('--n', 8);        // frames across the entrance arc
const NEXIT = 5;                      // frames across the exit arc
// `transitions` is the documented unified surface and lowers to cuts/seams/stings before the engine
// renders (core/transitions-lower.js). Without this, a film that declares its boundaries the
// documented way was read as a film with NO boundaries. Idempotent; a no-op for raw `cuts`. #380.
const data = lowerScene(JSON.parse(fs.readFileSync(dataArg, 'utf8')));
const format = data.module;
if (!format || !fs.existsSync(path.join(ROOT, 'formats', format, 'scene.html'))) { console.error(`✗ unknown module "${format}"`); process.exit(1); }
const dataUrl = '/' + path.relative(ROOT, path.resolve(dataArg)).split(path.sep).join('/');

// ---- beat boundaries: cut times, else layer-start clusters (>1.2s gap) — same signal as beats.mjs ----
const near = (arr, t, e = 0.35) => arr.some((x) => Math.abs(x - t) < e);
let bounds = [];
for (const c of data.cuts || []) if (typeof c.t === 'number' && !near(bounds, c.t)) bounds.push(c.t);
for (const t of data.transitions || []) if (typeof t.at === 'number' && !near(bounds, t.at)) bounds.push(t.at);
const starts = [...new Set((data.layers || []).filter((l) => l.track !== 0).map((l) => l.start ?? 0))].sort((a, b) => a - b);
let last = -9;
for (const t of starts) { if (t - last > 1.2 && !near(bounds, t)) bounds.push(t); last = t; }

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.woff2': 'font/woff2', '.woff': 'font/woff', '.ttf': 'font/ttf', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp' };
const server = http.createServer((req, res) => {
  const p = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]).replace(/^\/+/, ''));
  if (!p.startsWith(ROOT) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(p)] || 'application/octet-stream' });
  fs.createReadStream(p).pipe(res);
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const port = server.address().port;

const [VW, VH] = sceneDims(data);
const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--hide-scrollbars', '--force-device-scale-factor=1'] });
const page = await browser.newPage();
await page.setViewport({ width: VW, height: VH, deviceScaleFactor: 1 });
await page.goto(`http://127.0.0.1:${port}/formats/${format}/scene.html?data=${encodeURIComponent(dataUrl)}&fps=30`, { waitUntil: 'load' });
await page.waitForFunction('window.__engineReady === true || window.__engineError', { timeout: 30000 });
const err = await page.evaluate(() => window.__engineError || null);
if (err) { console.error('SCENE ERROR:', err); await browser.close(); server.close(); process.exit(1); }
const { duration, fps: F } = await page.evaluate(() => window.__engine.meta);

// The clips' REAL ramp lengths, read off the DOM the engine built rather than off the JSON. The two are
// not the same number: formats/scene/scene.js writes `dataset.enter` as the theme's durationScale times
// BASE_ENTER, so a layer that declares no `enterDur` enters in 0.26s under vawe and 0.3s under a theme
// that does not scale. Sampling a window computed from the JSON would miss the end of one and overshoot
// the other. `[data-start]` is the same selector collectClips uses.
const clipTiming = (await page.evaluate(() => [...document.querySelectorAll('[data-start]')].map((el) => ({
  start: parseFloat(el.dataset.start) || 0,
  enter: el.dataset.enter == null ? null : el.dataset.enter,
  text: (el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 18),
  kind: el.className || el.tagName.toLowerCase(),
})))).map((c) => ({ ...c, enterDur: enterDurOf({ dataset: c.enter == null ? {} : { enter: c.enter } }) }));
// Longest ramp among the clips that start together: the onion skin has to cover the slowest of them.
const rampAt = (t) => {
  const at = clipTiming.filter((c) => Math.abs(c.start - t) < 0.005);
  return at.length ? Math.max(...at.map((c) => c.enterDur)) : enterDurOf({ dataset: {} });
};

bounds = [...new Set(bounds.map((t) => Math.max(0, Math.min(duration, t))))].sort((a, b) => a - b);
if (!bounds.length || bounds[0] > 0.05) bounds.unshift(0);
const beats = bounds.map((t0, i) => ({ i, t0, t1: i + 1 < bounds.length ? bounds[i + 1] : duration })).filter((b) => b.t1 - b.t0 > 0.15);

// per scene, so two authors running at once cannot read each other's reveal (same reason as beats.mjs)
const SLUG = path.basename(dataArg, '.json');
// The frames and the sheet MUST come off one base. They did not, and the sheet's parent was therefore
// never created under a job dir — see scripts/lib/scratch.mjs.
const sheet = scratch('reveal', `${SLUG}.png`);
const tmp = scratch('reveal', `${SLUG}.frames`);
fs.rmSync(tmp, { recursive: true, force: true }); fs.mkdirSync(tmp, { recursive: true });
// ffmpeg's hstack/vstack reject `inputs=1` outright, so a scene with ONE beat crashed the whole tool at
// the last step, after every frame had already been rendered. A one-item stack is the identity, and it
// is the single-beat film that most needs looking at, so it is answered here rather than by ffmpeg.
// Pre-existing: `node scripts/author/reveal.mjs formats/scene/ab3-nogate-tenor.json` failed on HEAD.
const stack = (dir, inputs, out, what, extra = '') => {
  if (inputs.length === 1 && !extra) { fs.copyFileSync(inputs[0], out); return out; }
  const chain = inputs.length === 1 ? `[0:v]${extra.replace(/^,/, '')}` : `${dir}stack=inputs=${inputs.length}${extra}`;
  ffmpegOrDie(['-v', 'error', '-y', ...inputs.flatMap((i) => ['-i', i]), '-filter_complex', chain, '-frames:v', '1', out], out, what);
  return out;
};
const tileW = 200, tileH = Math.round((tileW * VH) / VW);
const grab = async (t, file, tag, color) => {
  await page.evaluate((n) => window.__engine.renderFrame(n), Math.round(Math.max(0, Math.min(duration - 0.01, t)) * F));
  const raw = file + '.raw.png';
  await page.screenshot({ path: raw, clip: { x: 0, y: 0, width: VW, height: VH } });
  ffmpegOrDie(['-v', 'error', '-y', '-i', raw, '-vf',
    `scale=${tileW}:${tileH},drawtext=text='${tag}':x=5:y=5:fontsize=15:fontcolor=${color}:box=1:boxcolor=black@0.6`, file], file, `tile @${t.toFixed(2)}s`);
  return file;
};

// ---- GHOST=1 / --ghost : one entrance, every pose, ONE image ----------------------------------
// HOW THE POSES ARE COMBINED, and why the obvious way is wrong. The first build averaged them, at
// 1/(k+1) each, which is the arithmetic mean and is what "ghosted" sounds like it should mean. It
// produced an unreadable image: eight poses give every intermediate position an eighth of its own
// contrast, so a trail that has to be legible at 340px wide arrives at about 3% against the backdrop.
// I rendered it and looked at it, and only two of fifteen cells showed any trail at all.
//
// So the poses go through DARKEN (or LIGHTEN, see below) instead. At each pixel the extreme across all
// poses wins, so every pose contributes at FULL contrast and the union of the positions is the trail.
// A move smears; a layer that only fades draws one crisp copy, because all its poses sit in the same
// place. That distinction is the entire question this mode exists to answer, and darken states it at
// full strength while the mean whispered it.
//
// The direction is not a constant, it is a property of the frame: darken keeps dark ink on a light
// backdrop, and would keep the BACKDROP on a dark one and erase the trail completely. Half this library
// is white-first and half is not, so the mode is chosen per cell from the settled pose's mean
// luminance. Probed through ffmpeg's area scaler down to one pixel rather than guessed from the theme:
// a bg preset can paint anything over the palette's declared colour.
const GHOST = argv.includes('--ghost') || process.env.GHOST === '1';
const GHOST_W = 340;                       // wider than the strip tiles: the trail is the subject now
const GHOST_COLS = 3;
const GHOST_MAX = 15;                      // a long film has dozens of entrances; a sheet nobody scrolls is not read
const ghostH = Math.round((GHOST_W * VH) / VW);

// area-averaged to a single grey pixel; `area` because the default scaler downsampling 1080x1920 to 1x1
// in one hop samples rather than averages, and a sampled pixel is not the frame's luminance.
function meanLuma(file) {
  const out = file + '.luma';
  ffmpegOrDie(['-v', 'error', '-y', '-i', file, '-vf', 'scale=1:1:flags=area', '-pix_fmt', 'gray', '-f', 'rawvideo', out], out, 'luma probe');
  return fs.readFileSync(out)[0];
}

async function ghostCell(poses, out, label) {
  const raws = [];
  for (let k = 0; k < poses.length; k++) {
    const f = path.join(tmp, `${path.basename(out, '.png')}_p${k}.png`);
    await page.evaluate((n) => window.__engine.renderFrame(n), Math.round(Math.max(0, Math.min(duration - 0.01, poses[k])) * F));
    await page.screenshot({ path: f, clip: { x: 0, y: 0, width: VW, height: VH } });
    raws.push(f);
  }
  const mode = meanLuma(raws[raws.length - 1]) > 127 ? 'darken' : 'lighten';
  const steps = [];
  let cur = '[0:v]';
  for (let k = 1; k < raws.length; k++) {
    const tag = k === raws.length - 1 ? '[gf]' : `[g${k}]`;
    steps.push(`${cur}[${k}:v]blend=all_mode=${mode}${tag}`);
    cur = tag;
  }
  if (raws.length === 1) steps.push('[0:v]null[gf]');
  // ffmpeg's drawtext takes the text through a filter-graph parser, so a colon or a quote in a layer's
  // copy would end the argument and the graph would fail to build. Strip rather than escape: this is a
  // caption, and a caption that costs a debugging session is not worth the extra character.
  const safe = label.replace(/[^\w @.,%·/+-]/g, ' ').slice(0, 46);
  steps.push(`[gf]scale=${GHOST_W}:${ghostH},drawtext=text='${safe}':x=6:y=6:fontsize=15:fontcolor=white:box=1:boxcolor=black@0.72,`
    + `drawbox=x=0:y=0:w=iw:h=ih:color=0x2a2a30:t=1[out]`);
  ffmpegOrDie(['-v', 'error', '-y', ...raws.flatMap((r) => ['-i', r]),
    '-filter_complex', steps.join(';'), '-map', '[out]', '-frames:v', '1', out], out, `ghost ${label}`);
  return out;
}

// --layers / LAYERS=1 : the "ALL reveals" mode — every DISTINCT entrance (unique layer start-time),
// not just beat-starts, so a staggered sub-reveal mid-beat is captured too. Otherwise: beat-level arcs.
const ALL = argv.includes('--layers') || process.env.LAYERS === '1';
const desc = (l) => l.text ? `"${onScreenText(l.text).slice(0, 16)}"` : (l.src ? l.src.split('/').pop().slice(0, 16) : l.type);

let units;
if (ALL) {
  const ev = new Map();
  for (const l of data.layers || []) { if (l.track === 0) continue; const t = +(l.start ?? 0).toFixed(2); (ev.get(t) || ev.set(t, []).get(t)).push(l); }
  units = [...ev.entries()].sort((a, b) => a[0] - b[0]).map(([t, ls], i) => {
    const win = Math.min(ENTER, rampAt(t) + 0.25);
    return { i, label: `@${t.toFixed(2)}s`, tag: ls.map(desc).join(' '),
      samples: Array.from({ length: NENTER }, (_, k) => { const at = t + (win * k) / (NENTER - 1); return { t: at, tag: `${i + 1} ${(at - t).toFixed(2)}s`, color: 'lime' }; }) };
  });
} else {
  units = beats.map((b) => {
    const span = b.t1 - b.t0, eWin = Math.min(ENTER, span * 0.55), xWin = Math.min(0.5, span * 0.4);
    const s = [];
    for (let k = 0; k < NENTER; k++) { const t = b.t0 + (eWin * k) / (NENTER - 1); s.push({ t, tag: `${b.i + 1} in ${(t - b.t0).toFixed(2)}s`, color: 'lime' }); }
    s.push({ t: b.t0 + Math.min(span * 0.7, eWin + (span - eWin) * 0.5), tag: `${b.i + 1} SET`, color: 'white' });
    for (let k = 0; k < NEXIT; k++) { const t = b.t1 - xWin + (xWin * k) / (NEXIT - 1); s.push({ t, tag: `${b.i + 1} out`, color: 'orange' }); }
    return { i: b.i, label: `beat ${b.i + 1}`, samples: s };
  });
}

if (GHOST) {
  const ev = new Map();
  for (const l of data.layers || []) { if (l.track === 0) continue; const t = +(l.start ?? 0).toFixed(2); (ev.get(t) || ev.set(t, []).get(t)).push(l); }
  const events = [...ev.entries()].sort((a, b) => a[0] - b[0]);
  const shown = events.slice(0, GHOST_MAX);
  const cells = [];
  for (let i = 0; i < shown.length; i++) {
    const [t, ls] = shown[i];
    // A declared ramp of zero is a real answer, not a missing one: `split` layers hand their entrance to
    // the parent's stagger. Sampling a zero-length window would render eight copies of one frame and
    // draw a cell that looks like a fade, so the window falls back to the engine's default length and
    // the label says the ramp is the parent's. What you then see is whatever the PARENT does to it.
    const declared = rampAt(t);
    const ramp = declared > 0 ? declared : enterDurOf({ dataset: {} });
    // Poses land ON the ramp, first one a step in and the last exactly at the settle. Starting at t
    // itself buys a pose of nothing: a layer is at zero opacity on the frame its window opens.
    const poses = Array.from({ length: NENTER }, (_, k) => t + (ramp * (k + 1)) / NENTER);
    // Terse because the caption is burnt into a 340px tile: a longer line is a truncated line.
    const label = `${i + 1} @${t.toFixed(2)}s ${ls.map(desc).join(' ')} · ${NENTER}p/${ramp.toFixed(2)}s`
      + (declared > 0 ? '' : ' parent ramp');
    cells.push(await ghostCell(poses, path.join(tmp, `ghost_${String(i).padStart(2, '0')}.png`), label));
    console.log(`  ghost ${label}`);
  }
  await browser.close(); server.close();
  const gsheet = scratch('reveal', `${SLUG}.ghost.png`);
  const grows = [];
  for (let i = 0; i < cells.length; i += GHOST_COLS) {
    const chunk = cells.slice(i, i + GHOST_COLS);
    const r = path.join(tmp, `grow_${i}.png`);
    stack('h', chunk, r, `ghost row ${i}`, `,pad=${GHOST_W * GHOST_COLS}:ih:0:0:color=0x0a0a0c`);
    grows.push(r);
  }
  stack('v', grows, gsheet, 'ghost sheet');
  // No review receipt here. The receipt means "somebody looked at every beat of this scene"; a ghost
  // sheet samples entrances only, and is capped. Stamping it would clear beat-check's nag for a look
  // that never happened, which is worse than no receipt at all.
  console.log(`✓ ghost · ${shown.length}${events.length > shown.length ? ` of ${events.length}` : ''} entrance(s) · each cell = every pose of one entrance, onion-skinned  →  ${gsheet}`);
  console.log('  Read the TRAIL, not the final pose. An even, straight smear is a move keyed only at its two');
  console.log('  endpoints. A trail that bends, bunches or reverses has poses in the middle that somebody chose.');
  console.log('  A cell with no trail at all is a layer that only fades: it arrives without travelling.');
  process.exit(0);
}

const rows = [];
for (const u of units) {
  const cells = [];
  for (let k = 0; k < u.samples.length; k++) { const sm = u.samples[k]; cells.push(await grab(sm.t, path.join(tmp, `u${u.i}_${k}.png`), sm.tag, sm.color)); }
  const row = path.join(tmp, `row_${String(u.i).padStart(2, '0')}.png`);
  stack('h', cells, row, `row ${u.label}`);
  rows.push({ img: row, n: cells.length });
  if (ALL) console.log(`  reveal @${u.label.slice(1)} · ${u.tag}`);
}
await browser.close(); server.close();

const maxCells = Math.max(...rows.map((r) => r.n));
const full = tileW * maxCells;
const padded = rows.map((r, i) => {
  if (r.n === maxCells) return r.img;
  const p = path.join(tmp, `pad_${i}.png`);
  ffmpegOrDie(['-v', 'error', '-y', '-i', r.img, '-vf', `pad=${full}:ih:0:0:color=0x0a0a0c`, p], p, `pad row ${i}`);
  return p;
});
stack('v', padded, sheet, 'contact sheet');
// REVIEW RECEIPT — the same stamp `make beats` writes: proof that a sheet exists for THIS scene content.
writeSeenReceipt(dataArg, sheet, 'reveal');
if (ALL) console.log(`✓ reveal (ALL layers) · ${units.length} distinct entrances · each row = one reveal event's ENTER arc  →  ${sheet}`);
else console.log(`✓ reveal · ${beats.length} beats · each row = [green ENTER arc · white SETTLED · orange EXIT arc]  →  ${sheet}`);
console.log('  Read the GREEN cells: how does each entrance animate IN? (dolly direction, typing, a colour-wave, a card assembling.)');
console.log('  ' + (ALL ? 'Per-LAYER pass: every distinct entrance, so a staggered sub-reveal mid-beat is caught too.' : 'Beat-level. Add LAYERS=1 for every element own entrance.') + '  `make beats` samples the hold; this samples the reveal.');
