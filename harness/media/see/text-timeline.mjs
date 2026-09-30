// On-screen text, sampled every 1/sampleFps s with one tesseract pass per frame. Two views of the same
// reads: runs of identical lines (the whole-film inventory a rebuild checks itself against) and word
// appearances (each word with its own t0, t1 and box, repeats kept). Pixel coordinates are reference px.
//
// Kinetic type: most wrong reads come from moving, blurred frames. Every word carries a `sharp` score
// (Laplacian variance of its box over its contrast), and each tracked word is read again from its
// sharpest samples, cropped and enlarged, so the spelling comes from the frame where the word rests.
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { ffmpegOrDie } from '../../lib/scratch.mjs';
import { parseTesseractTsv } from './ocr.mjs';
import { trackWords, norm, assertWordsRead } from '../../lib/ref-measure/words.mjs';

const OCR_W = 1280;
const POOL = 4;
const WORD_CONF = 60;
const LINE_CONF = 30;
const CROP_SCALE = 3;
const CROP_PAD = 0.35;
const SHARP_KEEP = 0.7;
const CROP_READS = 2;

function run(cmd, args) {
  return new Promise((resolve) => {
    const c = spawn(cmd, args, { stdio: 'ignore' });
    c.on('close', (code) => resolve(code));
    c.on('error', () => resolve(-1));
  });
}

async function tesseract(img, base, psm = 11) {
  const args = [img, base, '--psm', String(psm), 'tsv'];
  let code = await run('tesseract', args);
  if (code !== 0) code = await run('tesseract', args);
  if (code === -1) throw new Error('tesseract is not installed or not on PATH: install it (brew install tesseract) or skip OCR with --no-ocr');
  if (code !== 0) throw new Error(`tesseract exited ${code} on ${path.basename(img)}: run it by hand on that frame to see why`);
}

async function pool(items, fn) {
  let next = 0;
  await Promise.all(Array.from({ length: POOL }, async () => {
    while (next < items.length) await fn(items[next++]);
  }));
}

function readPgm(file) {
  const b = fs.readFileSync(file);
  let p = 0;
  const tok = [];
  while (tok.length < 4) {
    while (b[p] <= 0x20) p++;
    let q = p;
    while (b[q] > 0x20) q++;
    tok.push(b.toString('latin1', p, q));
    p = q;
  }
  return { w: Number(tok[1]), h: Number(tok[2]), px: b.subarray(p + 1) };
}

// A frame with visible content: its grey levels spread over more than noise.
const CONTENT_STDDEV = 12;
function hasContent(g) {
  let n = 0, sum = 0, sq = 0;
  for (let i = 0; i < g.px.length; i += 16) { const v = g.px[i]; n++; sum += v; sq += v * v; }
  return n > 0 && Math.sqrt(Math.max(0, sq / n - (sum / n) ** 2)) > CONTENT_STDDEV;
}

// Laplacian variance over the squared contrast: blur lowers it, a plain fade does not.
export function sharpness(g, w) {
  const x0 = Math.max(1, Math.floor(w.cx - w.w / 2)), x1 = Math.min(g.w - 2, Math.ceil(w.cx + w.w / 2));
  const y0 = Math.max(1, Math.floor(w.cy - w.h / 2)), y1 = Math.min(g.h - 2, Math.ceil(w.cy + w.h / 2));
  let n = 0, s = 0, s2 = 0, lo = 255, hi = 0;
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    const i = y * g.w + x, v = g.px[i];
    const l = 4 * v - g.px[i - 1] - g.px[i + 1] - g.px[i - g.w] - g.px[i + g.w];
    s += l; s2 += l * l; n++;
    if (v < lo) lo = v;
    if (v > hi) hi = v;
  }
  if (n < 4) return 0;
  const m = s / n;
  return (s2 / n - m * m) / ((hi - lo + 8) ** 2);
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

const scalePx = (p, k) => ({ cx: p.cx * k, cy: p.cy * k, w: p.w * k, h: p.h * k });

// One enlarged crop of a word box, ink on a plain ground, read as a single line.
async function cropRead(dir, file, w, tag) {
  const g = readPgm(file);
  const padX = Math.round(w.w * CROP_PAD), padY = Math.round(w.h * CROP_PAD);
  const x0 = Math.max(0, Math.round(w.cx - w.w / 2) - padX), y0 = Math.max(0, Math.round(w.cy - w.h / 2) - padY);
  const cw = Math.min(g.w - x0, Math.round(w.w) + 2 * padX), ch = Math.min(g.h - y0, Math.round(w.h) + 2 * padY);
  if (cw < 4 || ch < 4) return null;
  let sum = 0;
  for (let y = y0; y < y0 + ch; y++) for (let x = x0; x < x0 + cw; x++) sum += g.px[y * g.w + x];
  const dark = sum / (cw * ch) < 128;
  const out = path.join(dir, `crop_${tag}.png`);
  const vf = `crop=${cw}:${ch}:${x0}:${y0},${dark ? 'negate,' : ''}scale=${cw * CROP_SCALE}:${ch * CROP_SCALE}:flags=lanczos,pad=iw+60:ih+60:30:30:color=white`;
  if ((await run('ffmpeg', ['-v', 'error', '-y', '-i', file, '-vf', vf, out])) !== 0) return null;
  await tesseract(out, path.join(dir, `crop_${tag}`), 7);
  const tsv = path.join(dir, `crop_${tag}.tsv`);
  if (!fs.existsSync(tsv)) return null;
  const ws = parseTesseractTsv(fs.readFileSync(tsv, 'utf8'), 0, 1, 1, 1, true);
  if (!ws.length) return null;
  return { text: ws.map((x) => x.text).join(' '), conf: Math.min(...ws.map((x) => x.conf)) };
}

// Gives every sample of a tracked word the spelling with the most weight: each read counts by its
// confidence and its sharpness, and a read of the enlarged crop counts one and a half times.
async function rereadSharpest(dir, files, samples, sampleFps) {
  const apps = trackWords(samples, sampleFps);
  const at = new Map();
  samples.forEach((s, i) => s.words.forEach((w) => at.set(w.id, { w, i })));
  const jobs = [];
  apps.forEach((a, ai) => {
    const top = Math.max(...a.samples.map((s) => s.sharp));
    a.samples.filter((s) => s.sharp >= SHARP_KEEP * top).sort((x, y) => y.sharp - x.sharp).slice(0, CROP_READS)
      .forEach((s, k) => jobs.push({ ai, k, s, i: at.get(s.id).i }));
  });
  const reads = [];
  await pool(jobs, async (j) => {
    const r = await cropRead(dir, path.join(dir, files[j.i]), j.s, `${j.ai}_${j.k}`);
    if (r && /[a-zA-Z0-9]/.test(r.text)) reads.push({ ...j, ...r });
  });
  apps.forEach((a, ai) => {
    const top = Math.max(1e-9, ...a.samples.map((s) => s.sharp));
    const cands = [...a.samples.map((s) => ({ text: s.text, conf: s.conf, sharp: s.sharp, weight: 1 })),
      ...reads.filter((r) => r.ai === ai).map((r) => ({ text: r.text, conf: r.conf, sharp: r.s.sharp, weight: 1.5 }))];
    const votes = new Map();
    for (const c of cands) {
      const key = norm(c.text);
      if (key) votes.set(key, (votes.get(key) || 0) + c.weight * (c.conf / 100) * (0.25 + 0.75 * (c.sharp / top)));
    }
    const win = [...votes.entries()].sort((x, y) => y[1] - x[1])[0]?.[0];
    if (!win) return;
    const best = cands.filter((c) => norm(c.text) === win).sort((x, y) => y.conf - x.conf)[0];
    for (const s of a.samples) Object.assign(at.get(s.id).w, { text: best.text, conf: Math.max(at.get(s.id).w.conf, Math.min(best.conf, 99)) });
  });
}

/** -> [{ t, words: [{ id, text, conf, sharp, cx, cy, w, h }], lines: [text] }], coordinates in px of the video's own size. */
export async function sampleText(video, workDir, { sampleFps = 8, width, height } = {}) {
  fs.mkdirSync(workDir, { recursive: true });
  // Leptonica rewrites /tmp paths and then finds no file; hand tesseract the real path.
  const dir = fs.mkdtempSync(path.join(fs.realpathSync(workDir), 'text-'));
  try {
    ffmpegOrDie(['-v', 'error', '-y', '-i', video, '-vf', `fps=${sampleFps},scale=${OCR_W}:-2,format=gray`, path.join(dir, 'f_%05d.pgm')], null, 'text frames');
    const files = fs.readdirSync(dir).filter((f) => f.endsWith('.pgm')).sort();
    await pool(files, (f) => tesseract(path.join(dir, f), path.join(dir, f.replace('.pgm', ''))));
    const k = width ? width / OCR_W : 1;
    const frameH = width && height ? (OCR_W * height) / width : (OCR_W * 9) / 16;
    const raw = files.map((f, i) => {
      const tsv = path.join(dir, f.replace('.pgm', '.tsv'));
      const all = parseTesseractTsv(fs.existsSync(tsv) ? fs.readFileSync(tsv, 'utf8') : '', LINE_CONF, 1, OCR_W, frameH, true);
      const g = readPgm(path.join(dir, f));
      const words = all.filter((w) => w.conf >= WORD_CONF && /[a-zA-Z0-9]/.test(w.text))
        .map((w, wi) => Object.assign(w, { id: i * 1000 + wi, sharp: sharpness(g, w.px), ...w.px }));
      return { t: i / sampleFps, all, words, content: hasContent(g) };
    });
    await rereadSharpest(dir, files, raw, sampleFps);
    const samples = raw.map((s) => ({
      t: s.t,
      words: s.words.map((w) => ({ id: w.id, text: w.text, conf: w.conf, sharp: w.sharp, ...scalePx(w.px, k) })),
      lines: linesOf(s.all),
      content: s.content,
    }));
    assertWordsRead(samples, sampleFps);
    return samples;
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

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
