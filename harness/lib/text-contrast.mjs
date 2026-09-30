// Text colour against the pixels behind it, read from the draft's own frames at the text probe's times.
// quality/gates/page-check.mjs measures the same at critique with the text hidden and grants large type
// 3:1; the draft asks 4.5:1 of every size.
import { spawnSync } from 'node:child_process';
import { parseColor, contrastRatio, ensureContrast } from '../../core/color/engine.js';

export const MIN_RATIO = 4.5;
const GLYPH_DISTANCE = 60;
const MIN_BG_SHARE = 0.1;

const hex = (c) => `#${c.map((v) => Math.round(v).toString(16).padStart(2, '0')).join('')}`;
const median = (xs) => { const s = [...xs].sort((a, b) => a - b); return s[s.length >> 1]; };

/** The pixels in a CSS px box that are far from the text colour, as their per-channel median. Pure. */
export function backgroundIn(frame, box, fg, scale) {
  const [x, y, w, h] = box.map((v) => v * scale);
  const x0 = Math.max(0, Math.floor(x)), y0 = Math.max(0, Math.floor(y));
  const x1 = Math.min(frame.width, Math.ceil(x + w)), y1 = Math.min(frame.height, Math.ceil(y + h));
  const all = [[], [], []], far = [[], [], []];
  for (let py = y0; py < y1; py++) {
    for (let px = x0; px < x1; px++) {
      const i = (py * frame.width + px) * 3;
      const c = [frame.data[i], frame.data[i + 1], frame.data[i + 2]];
      const into = Math.hypot(c[0] - fg[0], c[1] - fg[1], c[2] - fg[2]) > GLYPH_DISTANCE ? far : all;
      c.forEach((v, k) => { into[k].push(v); if (into === far) all[k].push(v); });
    }
  }
  if (!all[0].length) return null;
  const pick = far[0].length >= all[0].length * MIN_BG_SHARE ? far : all;
  return pick.map(median);
}

/** Texts under MIN_RATIO in two samples (or their only sample), worst sample each. frames: Map t -> frame. Pure. */
export function lowContrast(samples, frames, scale) {
  const seen = new Map();
  for (const { t, lines } of samples) {
    const frame = frames.get(t);
    if (!frame) continue;
    for (const l of lines) {
      const fg = l.box && l.color && parseColor(l.color);
      const bg = fg && backgroundIn(frame, l.box, fg, scale);
      if (!bg) continue;
      const ratio = contrastRatio(fg, bg);
      const rec = seen.get(l.text) || { seen: 0, fails: 0, worst: null };
      rec.seen++;
      if (ratio < MIN_RATIO) {
        rec.fails++;
        if (!rec.worst || ratio < rec.worst.ratio) rec.worst = { t, ratio, fg: hex(fg), bg: hex(bg) };
      }
      seen.set(l.text, rec);
    }
  }
  return [...seen].filter(([, r]) => r.fails >= 2 || (r.seen === 1 && r.fails === 1)).map(([text, r]) => ({ text, ...r.worst }));
}

/** One advice line per low-contrast text, with the time, the ratio and a colour that passes. Pure. */
export function contrastLines(found) {
  return found.map((c) => `text "${c.text}" at ${c.t.toFixed(2)} s reads ${c.ratio.toFixed(1)}:1 on the pixels behind it (${c.fg} on ${c.bg}, needs ${MIN_RATIO}:1): use ${ensureContrast(c.fg, c.bg, { min: MIN_RATIO })}, or change the ground behind it`);
}

/** Decode one frame of an mp4 at each time as rgb24. */
export function readFrames(mp4, times) {
  const size = spawnSync('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height', '-of', 'csv=p=0', mp4], { encoding: 'utf8' });
  const [width, height] = String(size.stdout).trim().split(',').map(Number);
  const frames = new Map();
  if (!(width > 0 && height > 0)) return frames;
  for (const t of times) {
    const r = spawnSync('ffmpeg', ['-v', 'error', '-ss', String(t), '-i', mp4, '-frames:v', '1', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], { maxBuffer: width * height * 4 });
    if (r.status === 0 && r.stdout.length === width * height * 3) frames.set(t, { width, height, data: r.stdout });
  }
  return frames;
}

/** Advice lines for the draft: the probe's text against the draft mp4's own pixels. */
export function draftContrastLines(mp4, probe) {
  const frames = readFrames(mp4, probe.samples.map((s) => s.t));
  const first = frames.values().next().value;
  return first ? contrastLines(lowContrast(probe.samples, frames, first.height / probe.frameH)) : [];
}
