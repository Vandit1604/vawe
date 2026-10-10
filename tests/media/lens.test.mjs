// The lens (core/surfaces/lens.js) one effect at a time, measured on pixels.
//   node --test --test-concurrency=1 tests/media/lens.test.mjs
// tests/fixtures/pages/lens.html films an HTML screen; `?cfg=` turns ONE effect on over an all-off lens and
// `?only=` shows one feature of the screen. The page is read back with gl.readPixels at a 1920x1080 viewport,
// so one canvas pixel is one CSS pixel. Launches Chrome: not part of the fast unit run.
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { REPO_ROOT, serveRepo, RENDER_ARGS } from '../../harness/lib/render-harness.mjs';
import { projectWith } from '../../core/surfaces/lens.js';

const W = 1920, H = 1080;
let server, browser;

before(async () => {
  const { default: puppeteer } = await import('puppeteer');
  server = await serveRepo({ root: REPO_ROOT });
  browser = await puppeteer.launch({ headless: true, args: RENDER_ARGS });
});
after(async () => { await browser?.close(); server?.close(); });

async function shoot(cfg, { only, t = 0.3, scale = 1, draws = 1, probe = [] } = {}) {
  const page = await browser.newPage();
  try {
    await page.setViewport({ width: W, height: H, deviceScaleFactor: 1 });
    const q = new URLSearchParams({ cfg: JSON.stringify(cfg), scale: String(scale) });
    if (only) q.set('only', only);
    await page.goto(`http://127.0.0.1:${server.port}/tests/fixtures/pages/lens.html?${q}`, { waitUntil: 'load' });
    const b64 = await page.evaluate(async (tt, n) => {
      for (let i = 0; i < n; i++) for (const fn of window.__vaweFrameHooks) await fn(tt);
      const gl = window.__lens.gl;
      const buf = new Uint8Array(gl.drawingBufferWidth * gl.drawingBufferHeight * 4);
      gl.readPixels(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight, gl.RGBA, gl.UNSIGNED_BYTE, buf);
      let s = '';
      for (let i = 0; i < buf.length; i += 32768) s += String.fromCharCode(...buf.subarray(i, i + 32768));
      return btoa(s);
    }, t, draws);
    const probes = await page.evaluate((pts, tt) => pts.map(([x, y]) => window.__lens.project(x, y, tt)), probe, t);
    const raw = Buffer.from(b64, 'base64');
    const at = (x, y) => (Math.floor(y) * W + Math.floor(x)) * 4;
    const px = (x, y) => { const i = (H - 1 - Math.floor(y)) * W * 4 + Math.floor(x) * 4; return [raw[i], raw[i + 1], raw[i + 2]]; };
    return { raw, px, at, probes };
  } finally { await page.close(); }
}

const srgb = (v) => { const c = v / 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
const lin = ([r, g, b]) => 0.2126 * srgb(r) + 0.7152 * srgb(g) + 0.0722 * srgb(b);
const luma = ([r, g, b]) => 0.2126 * r + 0.7152 * g + 0.0722 * b;
const window2 = (img, x0, y0, w, h) => { const out = []; for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) out.push(img.px(x, y)); return out; };
const mean = (a) => a.reduce((s, v) => s + v, 0) / a.length;
const std = (a) => { const m = mean(a); return Math.sqrt(mean(a.map((v) => (v - m) ** 2))); };
const hash = (img) => createHash('md5').update(img.raw).digest('hex');

test('perspective: project() lands on the pixel where the marker is drawn', async () => {
  const cfg = { tiltY: 0.4, tiltX: 0.2, roll: 0.1, zoom: 1.8, aim: [1300, 700] };
  const img = await shoot(cfg, { only: 'marker', probe: [[1512, 812]] });
  let sx = 0, sy = 0, n = 0;
  for (let y = 0; y < H; y += 1) for (let x = 0; x < W; x += 1) { if (luma(img.px(x, y)) > 128) { sx += x; sy += y; n++; } }
  assert.ok(n > 200, `marker pixels found: ${n}`);
  const [p] = img.probes;
  assert.ok(Math.hypot(sx / n - p.x, sy / n - p.y) < 2, `centroid ${(sx / n).toFixed(1)},${(sy / n).toFixed(1)} vs project ${p.x.toFixed(1)},${p.y.toFixed(1)}`);
  assert.ok(p.visible && p.depth > 0);
});

test('project(): the aim point maps to the middle of the view, a tilted far edge is smaller', () => {
  const base = { tiltX: 0, tiltY: 0, roll: 0, zoom: 1, focal: 1.7, aim: null };
  const mid = projectWith(base, [1920, 1080], { w: W, h: H }, 960, 540);
  assert.ok(Math.abs(mid.x - 960) < 1e-6 && Math.abs(mid.y - 540) < 1e-6 && Math.abs(mid.scale - 1) < 1e-6);
  const tilted = { ...base, tiltY: 0.5 };
  const right = projectWith(tilted, [1920, 1080], { w: W, h: H }, 1800, 540);
  const left = projectWith(tilted, [1920, 1080], { w: W, h: H }, 120, 540);
  assert.ok(right.scale > left.scale, 'tiltY > 0 brings the right edge closer');
});

test('depth of field: sharp at the focus point, blurred at the far edge, flat plane stays sharp', async (t) => {
  const tilt = { tiltY: 0.5, aim: [1100, 650], dof: { focus: [1100, 650], soft: 0, blur: 0 } };
  const sharpness = async (blur, cfg) => {
    const img = await shoot({ ...cfg, dof: { ...cfg.dof, blur } }, { only: 'stripes', probe: [[1100, 650], [560, 650]] });
    const [focusAt, farAt] = img.probes;
    const grad = (x0, y0) => mean(Array.from({ length: 40 * 30 }, (_, i) => { const x = Math.round(x0) - 20 + (i % 40), y = Math.round(y0) - 15 + Math.floor(i / 40); return Math.abs(luma(img.px(x + 1, y)) - luma(img.px(x, y))); }));
    return { focus: grad(focusAt.x, focusAt.y), far: grad(farAt.x, farAt.y) };
  };
  const sharp = await sharpness(0, tilt);
  const soft = await sharpness(0.9, tilt);
  t.diagnostic(`sharpness kept at focus ${(soft.focus / sharp.focus).toFixed(2)}, at far edge ${(soft.far / sharp.far).toFixed(2)}`);
  assert.ok(soft.focus / sharp.focus > 0.85, `at the focus point ${soft.focus.toFixed(1)} vs ${sharp.focus.toFixed(1)}`);
  assert.ok(soft.far / sharp.far < 0.5, `at the far edge ${soft.far.toFixed(1)} vs ${sharp.far.toFixed(1)}`);
  const flat = await sharpness(0.9, { aim: [1100, 650], dof: { focus: [1100, 650], soft: 0 } });
  assert.ok(flat.far / sharp.far > 0.5 || flat.far > 5, 'a plane facing the camera has no depth to defocus');
});

test('palette: a 50% grey maps to the stop mix at its brightness', async () => {
  const stops = [[0, 0, 0], [1, 0, 0], [1, 1, 0], [1, 1, 1]];
  const img = await shoot({ palette: { stops } }, { only: 'patch' });
  const [r, g, b] = img.px(1400, 500);
  const expectG = 255 * (128 / 255 * 3 - 1);
  assert.ok(r > 250 && b < 6 && Math.abs(g - expectG) < 8, `got ${r},${g},${b} want 255,${expectG.toFixed(0)},0`);
});

test('bloom: a bright glyph lifts the pixels around it, not the far ground', async (t) => {
  const off = await shoot({}, { only: 'glyph' });
  const on = await shoot({ bloom: { strength: 1.5, radius: 30, threshold: 0.2 } }, { only: 'glyph' });
  const near = (img) => mean(window2(img, 310, 470, 40, 12).map(luma));
  const far = (img) => mean(window2(img, 310, 150, 40, 12).map(luma));
  t.diagnostic(`bloom lift ${(near(on) - near(off)).toFixed(1)} levels 20 px above the glyph`);
  assert.ok(near(on) - near(off) > 12, `lift above the glyph ${(near(on) - near(off)).toFixed(1)}`);
  assert.ok(far(on) - far(off) < 2, 'far ground unchanged');
});

test('grid: equal-area RGB stripes, one cell per period, no overall tint', async (t) => {
  const img = await shoot({ grid: { amount: 1, cell: 6 }, zoom: 2, aim: [1400, 500] }, { only: 'patch' });
  const cell = 12;
  const rows = Array.from({ length: 24 }, (_, i) => 440 + i);
  const chan = (c) => Array.from({ length: cell * 8 }, (_, i) => mean(rows.map((y) => img.px(700 + i, y)[c])));
  const ch = [0, 1, 2].map(chan);
  const means = ch.map((a) => mean(a.map(srgb)) * 255);
  assert.ok(Math.max(...means) / Math.min(...means) < 1.08, `channel means ${means.map((m) => m.toFixed(1))}`);
  const phase = (a) => { const f = Array(cell).fill(0); a.forEach((v, i) => { f[i % cell] += v; }); return f.indexOf(Math.max(...f)); };
  const [pr, pg, pb] = ch.map(phase);
  t.diagnostic(`grid channel means ${means.map((m) => m.toFixed(1))}, peaks ${pr},${pg},${pb} of ${cell} px`);
  const gap = (a, b) => { const d = Math.abs(a - b) % cell; return Math.min(d, cell - d); };
  assert.ok(Math.abs(gap(pr, pg) - 4) <= 1.5 && Math.abs(gap(pg, pb) - 4) <= 1.5, `channel peaks at ${pr},${pg},${pb} of ${cell} px`);
  const swing = (a) => Math.max(...a) - Math.min(...a);
  assert.ok(swing(ch[1]) > 40, 'the cells are visible');
  const plain = await shoot({ zoom: 2, aim: [1400, 500] }, { only: 'patch' });
  const ratio = mean(window2(img, 700, 440, 96, 24).map(lin)) / mean(window2(plain, 700, 440, 96, 24).map(lin));
  assert.ok(ratio > 0.75 && ratio < 1.05, `the grid keeps ${ratio.toFixed(2)} of the linear light`);
});

test('chromatic aberration: red and blue split by the radial amount in px', async (t) => {
  const img = await shoot({ aberration: { amount: 5 } }, { only: 'bar' });
  const centroid = (c) => { let s = 0, w = 0; for (let x = 40; x < 240; x++) { const v = Math.max(0, img.px(x, 540)[c] - 14); s += x * v; w += v; } return s / w; };
  const sep = centroid(0) - centroid(2);
  const want = 2 * (5 * (960 - 120)) / (0.5 * H);
  t.diagnostic(`R minus B ${sep.toFixed(1)} px, expected ${want.toFixed(1)}`);
  assert.ok(Math.abs(sep - want) < 2, `R minus B ${sep.toFixed(1)} px, expected ${want.toFixed(1)}`);
});

test('tear: rows slide sideways, the same time gives the same rows', async () => {
  const flat = await shoot({}, { only: 'bar' });
  const cfg = { tear: { amount: 40, prob: 1, band: 16 } };
  const a = await shoot(cfg, { only: 'bar' });
  const b = await shoot(cfg, { only: 'bar', draws: 2 });
  const centres = (img) => Array.from({ length: 20 }, (_, k) => { let s = 0, w = 0; for (let x = 0; x < 400; x++) { const v = Math.max(0, luma(img.px(x, 120 + k * 16 + 8)) - 14); s += x * v; w += v; } return s / w; });
  assert.ok(std(centres(flat)) < 0.5, 'a flat lens keeps the bar straight');
  assert.ok(std(centres(a)) > 5, `torn rows spread ${std(centres(a)).toFixed(1)} px`);
  assert.equal(hash(a), hash(b), 'draw(t) is a pure function of t');
});

test('exposure, vignette and grain', async () => {
  const fill = { aim: [1400, 500], zoom: 3.4 };
  const plain = await shoot(fill, { only: 'patch' });
  const dim = await shoot({ ...fill, exposure: 0.5 }, { only: 'patch' });
  const vig = await shoot({ ...fill, vignette: 0.4 }, { only: 'patch' });
  const grain = await shoot({ ...fill, grain: 0.1 }, { only: 'patch' });
  assert.ok(Math.abs(lin(dim.px(960, 540)) / lin(plain.px(960, 540)) - 0.5) < 0.03, 'exposure scales linear light');
  const corner = lin(vig.px(4, 4)) / lin(vig.px(960, 540));
  assert.ok(Math.abs(corner - 0.64) < 0.05, `vignette corner ${corner.toFixed(2)} of the centre in linear light, expected 0.64`);
  const sd = std(window2(grain, 900, 500, 60, 60).map((p) => p[1]));
  assert.ok(sd > 5 && sd < 10, `grain std ${sd.toFixed(1)} of 255, expected about 7.4`);
});

test('bloom: a linear-light tail reaches far past one pass, energy stays sane', async (t) => {
  const edge = 360 + 1;
  const tail = async (radius) => {
    const img = await shoot({ bloom: { strength: 1, radius, threshold: 0.3 } }, { only: 'glyph' });
    const base = mean(Array.from({ length: 20 }, (_, i) => lin(img.px(1200 + i, 530))));
    return (d) => mean(Array.from({ length: 5 }, (_, i) => lin(img.px(edge + d, 528 + i)))) - base;
  };
  const wide = await tail(120), narrow = await tail(8);
  const half = [4, 8, 16, 32, 64, 100].map((d) => [d, wide(d)]);
  const e = wide(4) / Math.E;
  const reach = [4, 8, 16, 32, 64, 100, 140].find((d) => wide(d) < e);
  t.diagnostic(`linear excess at 4/16/64/100 px: ${[4, 16, 64, 100].map((d) => wide(d).toFixed(4))}, tail falls to 1/e at ${reach} px; narrow bloom at 64 px ${narrow(64).toFixed(5)}`);
  assert.ok(wide(64) > 0.004, `a wide halo on the glyph, ${wide(64).toFixed(4)} linear at 64 px`);
  assert.ok(narrow(64) < wide(64) / 4, 'a short radius gives no tail that far out');
  assert.ok(half.every(([, v], i) => i === 0 || v <= half[i - 1][1] + 1e-4), 'the tail falls with distance');
  assert.ok(wide(4) < 0.6, 'bloom adds light without blowing the surround out');
});

test('aperture: an out-of-focus point lights a pentagon of the lens radius', async (t) => {
  const cfg = { dof: { soft: 24, blades: 5, rotation: 0, roundness: 0, bokeh: 0, taps: 64, catEye: 0 } };
  const img = await shoot(cfg, { only: 'point' });
  const cx = 1006, cy = 806;
  const peak = Math.max(...window2(img, cx - 40, cy - 40, 80, 80).map(lin));
  const radii = Array.from({ length: 120 }, (_, k) => {
    const a = (k / 120) * 2 * Math.PI;
    let far = 0;
    for (let r = 4; r < 45; r += 0.5) if (lin(img.px(cx + Math.cos(a) * r, cy + Math.sin(a) * r)) > peak * 0.4) far = r;
    return far;
  });
  const at = (i) => (i + 120) % 120;
  const smooth = radii.map((_, i) => mean(Array.from({ length: 9 }, (_, o) => radii[at(i + o - 4)])));
  const peaks = smooth.filter((v, i) => Array.from({ length: 17 }, (_, o) => smooth[at(i + o - 8)]).every((w, o) => o === 8 || v > w || (v === w && o > 8)) && v > mean(smooth)).length;
  const ratio = Math.max(...smooth) / Math.min(...smooth);
  t.diagnostic(`pentagon: ${peaks} corners, max radius ${Math.max(...smooth).toFixed(1)} px, corner/edge ratio ${ratio.toFixed(2)} (1.24 expected)`);
  assert.ok(peaks === 5, `${peaks} corners`);
  assert.ok(Math.max(...smooth) > 20 && Math.max(...smooth) < 34, `corner radius ${Math.max(...smooth)}`);
  assert.ok(ratio > 1.12 && ratio < 1.4, `corner/edge ratio ${ratio.toFixed(2)}`);
});

const magenta = (img) => { let n = 0; for (let y = 0; y < H; y += 2) for (let x = 0; x < W; x += 2) { const [r, g, b] = img.px(x, y); if (r > 200 && g < 60 && b > 200) n++; } return n; };

test('fit: a strong tilt keeps the target in the frame and, with cover, shows no border', async (t) => {
  const tilt = { tiltY: 0.9, tiltX: 0.15, zoom: 2.5, aim: [250, 540], edge: 'black', outside: [1, 0, 1], dof: { blur: 0 } };
  const target = [1850, 540];
  const lost = await shoot(tilt, { only: 'stripes', probe: [target] });
  assert.equal(lost.probes[0].visible, false, 'without a fit the camera looks away from the target');
  assert.ok(magenta(lost) > 1000, 'and the border shows');
  const kept = await shoot({ ...tilt, fit: { keep: target, margin: 80 } }, { only: 'stripes', probe: [target] });
  const p = kept.probes[0];
  assert.ok(p.visible && p.x >= 80 - 1 && p.x <= W - 80 + 1 && p.y >= 80 - 1 && p.y <= H - 80 + 1, `target at ${p.x.toFixed(0)},${p.y.toFixed(0)}`);
  const covered = await shoot({ ...tilt, fit: { keep: target, margin: 80, cover: true } }, { only: 'stripes', probe: [target] });
  t.diagnostic(`border pixels (sampled): lost ${magenta(lost)}, kept ${magenta(kept)}, cover ${magenta(covered)}`);
  assert.equal(magenta(covered), 0, 'cover leaves no border in the frame');
  const extended = await shoot({ ...tilt, edge: 'extend' }, { only: 'stripes' });
  assert.equal(magenta(extended), 0, 'an extended edge never shows the border');
});

test('a canvas source films the same plane as an HTML source', async () => {
  const page = await browser.newPage();
  try {
    await page.setViewport({ width: W, height: H, deviceScaleFactor: 1 });
    const q = new URLSearchParams({ cfg: JSON.stringify({ palette: { stops: [[0, 0, 0], [1, 1, 1]] } }), src: 'canvas' });
    await page.goto(`http://127.0.0.1:${server.port}/tests/fixtures/pages/lens.html?${q}`, { waitUntil: 'load' });
    await page.evaluate(async () => { for (const fn of window.__vaweFrameHooks) await fn(0.3); });
    const g = await page.evaluate(() => { const gl = window.__lens.gl; const b = new Uint8Array(4); gl.readPixels(1400, 1080 - 500, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, b); return [...b]; });
    assert.ok(Math.abs(g[1] - 128) < 4, `canvas source grey ${g}`);
  } finally { await page.close(); }
});

test('render-page: the lens fixture renders identically twice, in a draft and a final', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'lens-determinism-'));
  const script = path.join(REPO_ROOT, 'harness/media/render-page.mjs');
  const page = path.join(REPO_ROOT, 'tests/fixtures/pages/lens.html');
  const frames = (mp4) => execFileSync('ffmpeg', ['-v', 'error', '-i', mp4, '-f', 'framemd5', '-'], { encoding: 'utf8' }).split('\n').filter((l) => l && !l.startsWith('#')).map((l) => l.split(',').pop().trim());
  try {
    for (const mode of [[], ['--final', '--blur', '1']]) {
      const [a, b] = ['a', 'b'].map((n) => {
        const out = path.join(tmp, `${mode.length ? 'final' : 'draft'}-${n}.mp4`);
        execFileSync('node', [script, page, out, '--fps', '10', ...(mode.length ? mode : ['--w', '320', '--h', '180'])], { encoding: 'utf8', stdio: 'pipe' });
        return frames(out);
      });
      assert.ok(a.length >= 10 && new Set(a).size > 1, 'the lens moves with the seek');
      assert.deepEqual(a, b, `${mode.length ? 'final' : 'draft'}: two renders differ`);
    }
  } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
});
