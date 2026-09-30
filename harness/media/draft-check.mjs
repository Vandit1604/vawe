// The draft check's I/O: text sampled from the live page and the ship final check run on the draft mp4.
// The decisions are in harness/lib/draft-check.mjs; the mix level is measureMixLevel in page-audio.mjs.
import { spawnSync } from 'node:child_process';
import { readFeatures, summarize, probeSize } from './scene-stats.mjs';
import { blankRuns, isFlat, problemsOf } from '../lib/ship-status.mjs';
import { sampleTimes } from '../lib/draft-check.mjs';
import { sheetFps, tileProblems, TILE_W } from '../lib/sheet-tiles.mjs';

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

// Runs inside the page: one { text, fontPx } per visible text node. fontPx includes ancestor transform scale.
function visibleLines() {
  const out = [];
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const text = node.nodeValue.replace(/\s+/g, ' ').trim();
    const el = node.parentElement;
    if (!text || !el || /^(SCRIPT|STYLE|NOSCRIPT|TITLE)$/.test(el.tagName)) continue;
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
    if (opacity > 0.5 && inside) out.push({ text, fontPx: parseFloat(cs.fontSize) * scale, box: [r.x, r.y, r.width, r.height], color: cs.color, opacity });
  }
  return out;
}

/** Seek to each sample time and list the visible text. `seek(ms)` is the renderer's seek; `shots(page)` adds pixels. */
export async function sampleText(page, dur, seek, shots = null) {
  const { step, times } = sampleTimes(dur);
  const samples = [];
  for (const t of times) {
    await seek(t * 1000);
    samples.push({ t, lines: await page.evaluate(visibleLines), ...(shots ? { shots: await shots(page) } : {}) });
  }
  return { samples, step, frameH: await page.evaluate(() => innerHeight) };
}
