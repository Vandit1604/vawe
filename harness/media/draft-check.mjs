// The draft check's I/O: text sampled from the live page and the ship final check run on the draft mp4.
// The decisions are in harness/lib/draft-check.mjs; the mix level is measureMixLevel in page-audio.mjs.
import { spawnSync } from 'node:child_process';
import { readFeatures, summarize, probeSize } from './scene-stats.mjs';
import { blankRuns, isFlat, problemsOf } from '../lib/ship-status.mjs';
import { sampleTimes, DECORATIVE, CHROME } from '../lib/draft-check.mjs';
import { sheetFps, tileProblems, TILE_W } from '../lib/sheet-tiles.mjs';
import { specTimes, wordTimes, objectChecks } from '../lib/spec-conformance.mjs';
import { sampleBoxTracks } from '../lib/box-track.mjs';

/** Static windows, held worlds and blank runs of one video, worst first, then the judge's sheet runs. Throws when ffmpeg fails. */
export function videoProblems(mp4, authoring = {}) {
  const feats = readFeatures(mp4);
  const { diffs, fps } = sheetTileDiffs(mp4);
  return [...problemsOf(summarize(feats), blankRuns(feats, isFlat), undefined, authoring), ...tileProblems(diffs, fps, authoring)];
}

/** The judge's sheet tiles (harness/media/judge-fresh.mjs contactSheet, without labels): adjacent mean grey differences. */
export function sheetTileDiffs(mp4) {
  const dur = parseFloat(spawnSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', mp4], { encoding: 'utf8' }).stdout);
  if (!(dur > 0)) throw new Error(`cannot read the duration of ${mp4}`);
  const src = probeSize(mp4);
  const w = TILE_W, h = Math.round((src.h * w) / src.w / 2) * 2;
  const fps = sheetFps(dur);
  const r = spawnSync('ffmpeg', ['-v', 'error', '-i', mp4, '-vf', `fps=${fps},scale=${w}:${h},format=gray`, '-f', 'rawvideo', '-'], { maxBuffer: 1 << 28 });
  if (r.status !== 0) throw new Error(`sheet tiles: ffmpeg failed on ${mp4}: ${String(r.stderr).trim()}`);
  const size = w * h, n = Math.floor(r.stdout.length / size), diffs = [];
  for (let i = 1; i < n; i++) {
    let sum = 0;
    for (let p = 0; p < size; p++) sum += Math.abs(r.stdout[i * size + p] - r.stdout[(i - 1) * size + p]);
    diffs.push(sum / size);
  }
  return { diffs, fps };
}

// Runs inside the page. { lines, blocks }: lines is one { text, fontPx, box, color, opacity, chrome? } per visible text
// node (fontPx includes ancestor transform scale); blocks is the joined visible text of each element that holds
// two or more such nodes, so a word split into per-letter spans reads as one text. Text inside `decorative` is left out.
export function visibleLines(decorative, chrome) {
  const out = [];
  const owners = new Map();
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const text = node.nodeValue.replace(/\s+/g, ' ').trim();
    const el = node.parentElement;
    if (!text || !el || /^(SCRIPT|STYLE|NOSCRIPT|TITLE)$/.test(el.tagName) || el.closest(decorative)) continue;
    const cs = getComputedStyle(el);
    if (cs.visibility === 'hidden' || /^rgba\(.*, 0\)$/.test(cs.color)) continue;
    let opacity = 1;
    let scale = 1;
    for (let n = el; n; n = n.parentElement) {
      const s = getComputedStyle(n);
      if (s.display === 'none') { opacity = 0; break; }
      opacity *= Number(s.opacity);
      if (s.transform !== 'none') {
        const m = new DOMMatrix(s.transform);
        scale *= Math.sqrt(Math.abs(m.a * m.d - m.b * m.c)) || 1;
      }
    }
    const range = document.createRange();
    range.selectNodeContents(node);
    const r = range.getBoundingClientRect();
    const inside = r.width > 0 && r.height > 0 && r.right > 0 && r.bottom > 0 && r.left < innerWidth && r.top < innerHeight;
    if (!(opacity > 0.5 && inside)) continue;
    const fontPx = parseFloat(cs.fontSize) * scale;
    out.push({ text, fontPx, box: [r.x, r.y, r.width, r.height], color: cs.color, opacity, ...(el.closest(chrome) ? { chrome: true } : {}) });
    for (let a = el; a && a !== document.documentElement; a = a.parentElement) {
      const o = owners.get(a) || { raw: '', n: 0, fontPx, x0: r.left, y0: r.top, x1: r.right, y1: r.bottom };
      o.raw += node.nodeValue;
      o.n += 1;
      o.x0 = Math.min(o.x0, r.left); o.y0 = Math.min(o.y0, r.top); o.x1 = Math.max(o.x1, r.right); o.y1 = Math.max(o.y1, r.bottom);
      owners.set(a, o);
    }
  }
  const blocks = [...owners.values()].filter((o) => o.n > 1)
    .map((o) => ({ text: o.raw.replace(/\s+/g, ' ').trim(), fontPx: o.fontPx, box: [o.x0, o.y0, o.x1 - o.x0, o.y1 - o.y0] }));
  return { lines: out, blocks };
}

/** Seek to each sample time and list the visible text. `seek(ms)` is the renderer's seek; `shots(page)` adds pixels. */
export async function sampleText(page, dur, seek, shots = null) {
  const { step, times } = sampleTimes(dur);
  const samples = [];
  for (const t of times) {
    await seek(t * 1000);
    samples.push({ t, lines: (await page.evaluate(visibleLines, DECORATIVE, CHROME)).lines, ...(shots ? { shots: await shots(page) } : {}) });
  }
  return { samples, step, frameH: await page.evaluate(() => innerHeight) };
}

/**
 * The brief's SPEC tables read off the live page: { samples (the text at each settle time), times (per Words row,
 * when it appears and settles), objects (the Objects checks), frameW, frameH }. Null when the tables name neither.
 */
export async function sampleSpec(page, tables, seek, dur) {
  if (!tables.words.length && !tables.objects.length) return null;
  const [frameW, frameH] = await page.evaluate(() => [innerWidth, innerHeight]);
  const frame = { frameW, frameH };
  const linesAt = async (t) => { await seek(t * 1000); return page.evaluate(visibleLines, DECORATIVE, CHROME); };
  const times = specTimes(tables, dur);
  const samples = [];
  for (const t of times.text) samples.push({ t, ...(await linesAt(t)) });
  const wordTimesOf = [];
  for (const w of tables.words) wordTimesOf.push(await wordTimes(w, linesAt, { dur, frame }));
  const boxes = tables.objects.length ? await sampleBoxTracks(page, times.boxes, { selectors: tables.objects.map((o) => o.selector) }) : null;
  return { samples, times: wordTimesOf, objects: boxes ? await objectChecks(tables.objects, boxes, frame) : null, frameW, frameH };
}
