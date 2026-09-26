import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { onScreenText } from '../lib/text.mjs';
import { openScene } from './scene-page.mjs';
import { writeReceipt } from '../lib/receipt.mjs';
import { scratch, ffmpegOrDie } from '../lib/scratch.mjs';
import { drawtext } from './sheets.mjs';
import { loadScene } from '../../core/engine/expand.js';
import { enterDurOf } from '../../core/timeline/clips.js';

const NEXIT = 5;                      // frames across the exit arc
const GHOST_W = 340;                  // wider than the strip tiles: the trail is the subject now
const GHOST_COLS = 3;
const GHOST_MAX = 15;                 // a long film has dozens of entrances; a sheet nobody scrolls is not read

const stack = (dir, inputs, out, what, extra = '') => {
  if (inputs.length === 1 && !extra) { fs.copyFileSync(inputs[0], out); return out; }
  const chain = inputs.length === 1 ? `[0:v]${extra.replace(/^,/, '')}` : `${dir}stack=inputs=${inputs.length}${extra}`;
  ffmpegOrDie(['-v', 'error', '-y', ...inputs.flatMap((i) => ['-i', i]), '-filter_complex', chain, '-frames:v', '1', out], out, what);
  return out;
};

function meanLuma(file) {
  const out = file + '.luma';
  ffmpegOrDie(['-v', 'error', '-y', '-i', file, '-vf', 'scale=1:1:flags=area', '-pix_fmt', 'gray', '-f', 'rawvideo', out], out, 'luma probe');
  return fs.readFileSync(out)[0];
}

const desc = (l) => l.text ? `"${onScreenText(l.text).slice(0, 16)}"` : (l.src ? l.src.split('/').pop().slice(0, 16) : l.type);

/** Build the reveal contact sheet (or the onion-skin ghost sheet) from an open scene.
 *  `auto` marks the receipt as machine-made: see sheets.mjs. */
export async function revealSheet(s, { dataArg, enter = 0.7, n = 8, all = false, ghost = false, auto = false } = {}) {
  const ENTER = enter, NENTER = n;
  const data = loadScene(JSON.parse(fs.readFileSync(dataArg, 'utf8')));
  const { duration } = s.meta;
  const [VW, VH] = [s.width, s.height];

  const near = (arr, t, e = 0.35) => arr.some((x) => Math.abs(x - t) < e);
  let bounds = [];
  for (const c of data.cuts || []) if (typeof c.t === 'number' && !near(bounds, c.t)) bounds.push(c.t);
  for (const t of data.transitions || []) if (typeof t.at === 'number' && !near(bounds, t.at)) bounds.push(t.at);
  const starts = [...new Set((data.layers || []).filter((l) => l.track !== 0).map((l) => l.start ?? 0))].sort((a, b) => a - b);
  let last = -9;
  for (const t of starts) { if (t - last > 1.2 && !near(bounds, t)) bounds.push(t); last = t; }

  const clipTiming = (await s.page.evaluate(() => [...document.querySelectorAll('[data-start]')].map((el) => ({
    start: parseFloat(el.dataset.start) || 0,
    enter: el.dataset.enter == null ? null : el.dataset.enter,
    text: (el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 18),
    kind: el.className || el.tagName.toLowerCase(),
  })))).map((c) => ({ ...c, enterDur: enterDurOf({ dataset: c.enter == null ? {} : { enter: c.enter } }) }));
  const rampAt = (t) => {
    const at = clipTiming.filter((c) => Math.abs(c.start - t) < 0.005);
    return at.length ? Math.max(...at.map((c) => c.enterDur)) : enterDurOf({ dataset: {} });
  };

  bounds = [...new Set(bounds.map((t) => Math.max(0, Math.min(duration, t))))].sort((a, b) => a - b);
  if (!bounds.length || bounds[0] > 0.05) bounds.unshift(0);
  const beats = bounds.map((t0, i) => ({ i, t0, t1: i + 1 < bounds.length ? bounds[i + 1] : duration })).filter((b) => b.t1 - b.t0 > 0.15);

  const SLUG = path.basename(dataArg, '.json');
  const sheet = scratch('reveal', `${SLUG}.png`);
  const tmp = scratch('reveal', `${SLUG}.frames`);
  fs.rmSync(tmp, { recursive: true, force: true }); fs.mkdirSync(tmp, { recursive: true });

  const tileW = 200, tileH = Math.round((tileW * VH) / VW);
  const clamp = (t) => Math.max(0, Math.min(duration - 0.01, t));
  const grab = async (t, file, tag, color) => {
    const raw = file + '.raw.png';
    await s.grab(clamp(t), raw);
    ffmpegOrDie(['-v', 'error', '-y', '-i', raw, '-vf',
      `scale=${tileW}:${tileH},drawtext=text='${drawtext(tag)}':x=5:y=5:fontsize=15:fontcolor=${color}:box=1:boxcolor=black@0.6`, file], file, `tile @${t.toFixed(2)}s`);
    return file;
  };

  const ghostH = Math.round((GHOST_W * VH) / VW);
  async function ghostCell(poses, out, label) {
    const raws = [];
    for (let k = 0; k < poses.length; k++) {
      const f = path.join(tmp, `${path.basename(out, '.png')}_p${k}.png`);
      await s.grab(clamp(poses[k]), f);
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
    steps.push(`[gf]scale=${GHOST_W}:${ghostH},drawtext=text='${drawtext(label)}':x=6:y=6:fontsize=15:fontcolor=white:box=1:boxcolor=black@0.72,`
      + `drawbox=x=0:y=0:w=iw:h=ih:color=0x2a2a30:t=1[out]`);
    ffmpegOrDie(['-v', 'error', '-y', ...raws.flatMap((r) => ['-i', r]),
      '-filter_complex', steps.join(';'), '-map', '[out]', '-frames:v', '1', out], out, `ghost ${label}`);
    return out;
  }

  const entranceEvents = () => {
    const ev = new Map();
    for (const l of data.layers || []) { if (l.track === 0) continue; const t = +(l.start ?? 0).toFixed(2); (ev.get(t) || ev.set(t, []).get(t)).push(l); }
    return [...ev.entries()].sort((a, b) => a[0] - b[0]);
  };

  if (ghost) {
    const events = entranceEvents();
    const shown = events.slice(0, GHOST_MAX);
    const cells = [];
    for (let i = 0; i < shown.length; i++) {
      const [t, ls] = shown[i];
      const declared = rampAt(t);
      const ramp = declared > 0 ? declared : enterDurOf({ dataset: {} });
      const poses = Array.from({ length: NENTER }, (_, k) => t + (ramp * (k + 1)) / NENTER);
      const label = `${i + 1} @${t.toFixed(2)}s ${ls.map(desc).join(' ')} · ${NENTER}p/${ramp.toFixed(2)}s`
        + (declared > 0 ? '' : ' parent ramp');
      cells.push(await ghostCell(poses, path.join(tmp, `ghost_${String(i).padStart(2, '0')}.png`), label));
      console.log(`  ghost ${label}`);
    }
    const gsheet = scratch('reveal', `${SLUG}.ghost.png`);
    const grows = [];
    for (let i = 0; i < cells.length; i += GHOST_COLS) {
      const chunk = cells.slice(i, i + GHOST_COLS);
      const r = path.join(tmp, `grow_${i}.png`);
      stack('h', chunk, r, `ghost row ${i}`, `,pad=${GHOST_W * GHOST_COLS}:ih:0:0:color=0x0a0a0c`);
      grows.push(r);
    }
    stack('v', grows, gsheet, 'ghost sheet');
    console.log(`✓ ghost · ${shown.length}${events.length > shown.length ? ` of ${events.length}` : ''} entrance(s) · each cell = every pose of one entrance, onion-skinned  →  ${gsheet}`);
    return { sheet: gsheet, ghost: true, cells: shown.length };
  }

  let units;
  if (all) {
    units = entranceEvents().map(([t, ls], i) => {
      const win = Math.min(ENTER, rampAt(t) + 0.25);
      return { i, label: `@${t.toFixed(2)}s`, tag: ls.map(desc).join(' '),
        samples: Array.from({ length: NENTER }, (_, k) => { const at = t + (win * k) / (NENTER - 1); return { t: at, tag: `${i + 1} ${(at - t).toFixed(2)}s`, color: 'lime' }; }) };
    });
  } else {
    units = beats.map((b) => {
      const span = b.t1 - b.t0, eWin = Math.min(ENTER, span * 0.55), xWin = Math.min(0.5, span * 0.4);
      const smp = [];
      for (let k = 0; k < NENTER; k++) { const t = b.t0 + (eWin * k) / (NENTER - 1); smp.push({ t, tag: `${b.i + 1} in ${(t - b.t0).toFixed(2)}s`, color: 'lime' }); }
      smp.push({ t: b.t0 + Math.min(span * 0.7, eWin + (span - eWin) * 0.5), tag: `${b.i + 1} SET`, color: 'white' });
      for (let k = 0; k < NEXIT; k++) { const t = b.t1 - xWin + (xWin * k) / (NEXIT - 1); smp.push({ t, tag: `${b.i + 1} out`, color: 'orange' }); }
      return { i: b.i, label: `beat ${b.i + 1}`, samples: smp };
    });
  }

  const rows = [];
  for (const u of units) {
    const cells = [];
    for (let k = 0; k < u.samples.length; k++) { const sm = u.samples[k]; cells.push(await grab(sm.t, path.join(tmp, `u${u.i}_${k}.png`), sm.tag, sm.color)); }
    const row = path.join(tmp, `row_${String(u.i).padStart(2, '0')}.png`);
    stack('h', cells, row, `row ${u.label}`);
    rows.push({ img: row, n: cells.length });
    if (all) console.log(`  reveal @${u.label.slice(1)} · ${u.tag}`);
  }

  const maxCells = Math.max(...rows.map((r) => r.n));
  const full = tileW * maxCells;
  const padded = rows.map((r, i) => {
    if (r.n === maxCells) return r.img;
    const p = path.join(tmp, `pad_${i}.png`);
    ffmpegOrDie(['-v', 'error', '-y', '-i', r.img, '-vf', `pad=${full}:ih:0:0:color=0x0a0a0c`, p], p, `pad row ${i}`);
    return p;
  });
  stack('v', padded, sheet, 'contact sheet');
  writeReceipt('beats', dataArg, { sheet, tool: 'reveal', ...(auto ? { auto: true } : {}) });
  if (all) console.log(`✓ reveal (ALL layers) · ${units.length} distinct entrances · each row = one reveal event's ENTER arc  →  ${sheet}`);
  else console.log(`✓ reveal · ${beats.length} beats · each row = [green ENTER arc · white SETTLED · orange EXIT arc]  →  ${sheet}`);
  return { sheet, beats: beats.length, units: units.length };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const argv = process.argv.slice(2);
  const flag = (n, d) => { const i = argv.indexOf(n); return i >= 0 ? +argv[i + 1] : d; };
  const dataArg = argv.find((a, i) => !a.startsWith('--') && !(argv[i - 1] || '').startsWith('--'));
  if (!dataArg || !fs.existsSync(dataArg)) { console.error('usage: node harness/author/reveal.mjs <scene.json> [--enter 0.7] [--n 8]'); process.exit(1); }
  const all = argv.includes('--layers') || process.env.LAYERS === '1';
  const ghost = argv.includes('--ghost') || process.env.GHOST === '1';
  let s;
  try { s = await openScene(dataArg); }
  catch (e) { console.error(`✗ ${e.message}`); process.exit(1); }
  try {
    await revealSheet(s, { dataArg, enter: flag('--enter', 0.7), n: flag('--n', 8), all, ghost });
  } finally { await s.close(); }
  if (ghost) {
    console.log('  Read the TRAIL, not the final pose. An even, straight smear is a move keyed only at its two');
    console.log('  endpoints. A trail that bends, bunches or reverses has poses in the middle that somebody chose.');
    console.log('  A cell with no trail at all is a layer that only fades: it arrives without travelling.');
  } else {
    console.log('  Read the GREEN cells: how does each entrance animate IN? (dolly direction, typing, a colour-wave, a card assembling.)');
    console.log('  ' + (all ? 'Per-LAYER pass: every distinct entrance, so a staggered sub-reveal mid-beat is caught too.' : 'Beat-level. Add LAYERS=1 for every element own entrance.') + '  `make dev-tool X=beats` samples the hold; this samples the reveal.');
  }
}
