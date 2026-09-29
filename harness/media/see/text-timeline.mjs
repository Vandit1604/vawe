// On-screen text, sampled every 1/sampleFps s with one tesseract pass per frame. Two views of the same
// reads: runs of identical lines (the whole-film inventory a rebuild checks itself against) and word
// appearances (each word with its own t0, t1 and box, repeats kept). Pixel coordinates are reference px.
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { ffmpegOrDie } from '../../lib/scratch.mjs';
import { parseTesseractTsv } from './ocr.mjs';
import { trackWords } from '../../lib/ref-measure/words.mjs';

const OCR_W = 1280;
const POOL = 4;
const WORD_CONF = 60;
const LINE_CONF = 30;

function tesseract(png, base) {
  return new Promise((resolve) => {
    const run = (retry) => {
      const c = spawn('tesseract', [png, base, '--psm', '11', 'tsv'], { stdio: 'ignore' });
      c.on('close', (code) => (code !== 0 && retry ? run(false) : resolve()));
      c.on('error', () => resolve());
    };
    run(true);
  });
}

// Words in one sample -> lines: same row (centre within 0.6 box heights), left to right.
function linesOf(words) {
  const rows = [];
  for (const w of [...words].sort((a, b) => a.px.cy - b.px.cy)) {
    const row = rows.find((r) => Math.abs(r.cy - w.px.cy) <= 0.6 * Math.max(r.h, w.px.h));
    if (row) row.words.push(w); else rows.push({ cy: w.px.cy, h: w.px.h, words: [w] });
  }
  return rows.map((r) => r.words.sort((a, b) => a.px.cx - b.px.cx).map((w) => w.text).join(' '));
}

/** -> [{ t, words: [{ text, conf, cx, cy, w, h }], lines: [text] }], coordinates in px of the video's own size. */
export async function sampleText(video, workDir, { sampleFps = 8, width, height } = {}) {
  fs.mkdirSync(workDir, { recursive: true });
  // Leptonica rewrites /tmp paths and then finds no file; hand tesseract the real path.
  const dir = fs.mkdtempSync(path.join(fs.realpathSync(workDir), 'text-'));
  try {
    ffmpegOrDie(['-v', 'error', '-y', '-i', video, '-vf', `fps=${sampleFps},scale=${OCR_W}:-2`, path.join(dir, 'f_%05d.png')], null, 'text frames');
    const files = fs.readdirSync(dir).filter((f) => f.endsWith('.png')).sort();
    let next = 0;
    const worker = async () => {
      while (next < files.length) {
        const f = files[next++];
        await tesseract(path.join(dir, f), path.join(dir, f.replace('.png', '')));
      }
    };
    await Promise.all(Array.from({ length: POOL }, worker));
    const k = width ? width / OCR_W : 1;
    const frameH = width && height ? (OCR_W * height) / width : (OCR_W * 9) / 16;
    return files.map((f, i) => {
      const tsv = path.join(dir, f.replace('.png', '.tsv'));
      const raw = fs.existsSync(tsv) ? fs.readFileSync(tsv, 'utf8') : '';
      const all = parseTesseractTsv(raw, LINE_CONF, 1, OCR_W, frameH, true).map((w) => ({ ...w, px: scalePx(w.px, k) }));
      const words = all.filter((w) => w.conf >= WORD_CONF && /[a-zA-Z0-9]/.test(w.text)).map((w) => ({ text: w.text, conf: w.conf, ...w.px }));
      return { t: i / sampleFps, words, lines: linesOf(all) };
    });
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

const scalePx = (p, k) => ({ cx: p.cx * k, cy: p.cy * k, w: p.w * k, h: p.h * k });

/** samples -> [{ t0, t1, text }]; lines inside one sample are joined with " / ". */
export function textRuns(samples) {
  const runs = [];
  for (const s of samples) {
    const text = s.lines.filter((l) => l.length > 1).join(' / ');
    const last = runs[runs.length - 1];
    if (last && last.text === text) last.t1 = s.t; else runs.push({ t0: s.t, t1: s.t, text });
  }
  return runs;
}

export const wordAppearances = (samples, sampleFps) => trackWords(samples, sampleFps);

export async function textTimeline(video, workDir, sampleFps = 4) {
  return textRuns(await sampleText(video, workDir, { sampleFps }));
}
