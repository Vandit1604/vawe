#!/usr/bin/env node
// harness/media/content.mjs: how rich a frame's CONTENT is, measured one way for a reference and for our
// own render, so the two can be compared act by act. Motion, joints and grounds are measured elsewhere
// (harness/media/study.mjs); this owns the other half: is there something worth looking at in the frame.
//
// Four numbers, each chosen because a still frame can carry it:
//   colorfulness  Hasler and Süsstrunk 2003, the "M" metric on sRGB. 0 is grey; their bands name the rest.
//   fill          share of pixels that differ from the ground (the median of a 4% border ring).
//   detail        mean luma gradient: flat panels score low, type and imagery score high.
//   photo         share of 16px cells with natural texture: many distinct colours and real luma spread.
// Not measured: type size in frame, which needs text detection. The look pass records it by eye.
import { spawnSync } from 'node:child_process';

export const W = 480, H = 270;

const BANDS = [[15, 'not'], [33, 'slightly'], [45, 'moderately'], [59, 'averagely'], [82, 'quite'], [109, 'highly']];
export const bandOf = (m) => (BANDS.find(([lim]) => m < lim) || [0, 'extremely'])[1];

/** measureFrame(rgb, w, h): rgb is a packed 8-bit RGB buffer of w*h pixels. */
export function measureFrame(px, w = W, h = H) {
  const n = w * h;
  if (!px || px.length < n * 3) throw new Error(`content: expected ${n * 3} bytes of rgb for ${w}x${h}, got ${px ? px.length : 0}`);
  const ring = Math.max(2, Math.round(Math.min(w, h) * 0.04));
  const rs = [], gs = [], bs = [];
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (x >= ring && x < w - ring && y >= ring && y < h - ring) continue;
    const i = (y * w + x) * 3; rs.push(px[i]); gs.push(px[i + 1]); bs.push(px[i + 2]);
  }
  const med = (a) => a.sort((p, q) => p - q)[a.length >> 1];
  const ground = [med(rs), med(gs), med(bs)];

  let sRg = 0, sYb = 0, sRg2 = 0, sYb2 = 0, subject = 0;
  const lum = new Float32Array(n);
  for (let k = 0; k < n; k++) {
    const r = px[k * 3], g = px[k * 3 + 1], b = px[k * 3 + 2];
    const rg = r - g, yb = 0.5 * (r + g) - b;
    sRg += rg; sYb += yb; sRg2 += rg * rg; sYb2 += yb * yb;
    lum[k] = 0.299 * r + 0.587 * g + 0.114 * b;
    // 36 over three channels: a white card on a near-white ground still counts, JPEG noise does not
    if (Math.abs(r - ground[0]) + Math.abs(g - ground[1]) + Math.abs(b - ground[2]) > 36) subject++;
  }
  const mRg = sRg / n, mYb = sYb / n;
  const sdRg = Math.sqrt(Math.max(0, sRg2 / n - mRg * mRg)), sdYb = Math.sqrt(Math.max(0, sYb2 / n - mYb * mYb));
  const colorfulness = Math.hypot(sdRg, sdYb) + 0.3 * Math.hypot(mRg, mYb);

  let grad = 0;
  for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
    const k = y * w + x; grad += Math.abs(lum[k + 1] - lum[k - 1]) + Math.abs(lum[k + w] - lum[k - w]);
  }
  const C = 16; let cells = 0, photo = 0;
  for (let cy = 0; cy + C <= h; cy += C) for (let cx = 0; cx + C <= w; cx += C) {
    cells++;
    const seen = new Set(); let s = 0, s2 = 0;
    for (let y = cy; y < cy + C; y++) for (let x = cx; x < cx + C; x++) {
      const k = y * w + x;
      seen.add((px[k * 3] >> 3) << 10 | (px[k * 3 + 1] >> 3) << 5 | (px[k * 3 + 2] >> 3));
      s += lum[k]; s2 += lum[k] * lum[k];
    }
    const sd = Math.sqrt(Math.max(0, s2 / (C * C) - (s / (C * C)) ** 2));
    // ponytail: a texture heuristic, not a classifier; a busy gradient can pass, a flat UI panel cannot
    if (seen.size > 24 && sd > 12) photo++;
  }
  const r1 = (v) => Math.round(v * 10) / 10, r2 = (v) => Math.round(v * 100) / 100;
  return { colorfulness: r1(colorfulness), band: bandOf(colorfulness), fill: r2(subject / n),
    detail: r1(grad / ((w - 2) * (h - 2))), photo: r2(photo / cells) };
}

/** measureVideo(file, times): one measurement per second in `times`, each from a single decoded frame. */
export function measureVideo(file, times) {
  return times.map((t) => {
    const r = spawnSync('ffmpeg', ['-v', 'error', '-ss', String(t), '-i', file, '-frames:v', '1',
      '-vf', `scale=${W}:${H}:flags=area`, '-pix_fmt', 'rgb24', '-f', 'rawvideo', '-'], { maxBuffer: W * H * 3 + 1024 });
    if (r.status !== 0 || !r.stdout || r.stdout.length < W * H * 3)
      throw new Error(`content: could not decode ${file} at ${t}s: ${String(r.stderr || '').trim() || 'no frame'}`);
    return { t, ...measureFrame(r.stdout) };
  });
}

function selftest() {
  const frame = (fn) => { const b = Buffer.alloc(W * H * 3); for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) b.set(fn(x, y), (y * W + x) * 3); return b; };
  const grey = measureFrame(frame(() => [128, 128, 128]));
  if (grey.colorfulness !== 0 || grey.fill !== 0 || grey.photo !== 0) throw new Error(`flat grey should score 0, got ${JSON.stringify(grey)}`);
  const card = measureFrame(frame((x) => (x < W / 2 ? [236, 238, 240] : [220, 40, 60])));
  if (card.fill < 0.45 || card.colorfulness < 45) throw new Error(`half red frame should fill ~0.5 and be colourful, got ${JSON.stringify(card)}`);
  let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const noise = measureFrame(frame(() => [rnd() * 255, rnd() * 255, rnd() * 255]));
  if (noise.photo < 0.9) throw new Error(`textured noise should read as photo cells, got ${JSON.stringify(noise)}`);
  const mock = measureFrame(frame((x, y) => (x > 60 && x < 420 && y > 40 && y < 230 ? [250, 250, 252] : [238, 242, 250])));
  if (mock.photo !== 0 || mock.colorfulness > 15) throw new Error(`a pale flat mock should be photo-free and not colourful, got ${JSON.stringify(mock)}`);
  console.log('ok - content: grey scores 0, a red half fills and is colourful, noise reads as photo, a pale mock is flat');
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const [a, ...rest] = process.argv.slice(2);
  if (a === '--selftest') selftest();
  else if (a) console.log(JSON.stringify(measureVideo(a, rest.length ? rest.map(Number) : [1]), null, 1));
  else { console.error('usage: node harness/media/content.mjs <video.mp4> [seconds...] | --selftest'); process.exit(2); }
}
