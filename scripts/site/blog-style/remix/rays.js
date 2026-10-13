// The dithered-rays ground shared by covers (thumb.html) and figures (figure/figure.html).
window.Rays = (() => {
  const TONES = {
    blue:   [[5, 10, 32], [12, 44, 140], [10, 135, 255], [170, 214, 255]],
    violet: [[14, 8, 34], [58, 28, 140], [138, 92, 255], [214, 196, 255]],
    pink:   [[26, 6, 22], [120, 16, 78], [242, 46, 140], [255, 190, 222]],
    cyan:   [[4, 20, 28], [8, 86, 110], [24, 196, 222], [184, 244, 252]],
    orange: [[28, 10, 4], [128, 44, 8], [255, 122, 36], [255, 214, 170]],
    lime:   [[10, 20, 6], [44, 92, 14], [138, 214, 40], [222, 250, 170]],
    red:    [[26, 4, 6], [118, 14, 22], [240, 52, 52], [255, 196, 190]],
    teal:   [[4, 20, 18], [10, 92, 76], [30, 200, 160], [180, 244, 226]],
  };
  const BAYER = [
    [0, 32, 8, 40, 2, 34, 10, 42], [48, 16, 56, 24, 50, 18, 58, 26], [12, 44, 4, 36, 14, 46, 6, 38], [60, 28, 52, 20, 62, 30, 54, 22],
    [3, 35, 11, 43, 1, 33, 9, 41], [51, 19, 59, 27, 49, 17, 57, 25], [15, 47, 7, 39, 13, 45, 5, 37], [63, 31, 55, 23, 61, 29, 53, 21],
  ];
  const clamp01 = (v) => Math.min(1, Math.max(0, v));
  const smooth = (a, b, v) => { const t = clamp01((v - a) / (b - a)); return t * t * (3 - 2 * t); };
  const bayer = (i, j) => (BAYER[j & 7][i & 7] + 0.5) / 64;

  function hash(i, j, seed) {
    let h = Math.imul(i, 374761393) + Math.imul(j, 668265263) + Math.imul(seed, 1442695041);
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  }

  // Converging rays: s is the ray brightness at an angle, r the distance from the vanishing point.
  function rayField(p, w, h) {
    const freqs = [6, 11, 17, 26], amps = [1, 0.7, 0.5, 0.3];
    const phases = freqs.map((_, k) => hash(k, 7, p.seed) * Math.PI * 2);
    const ampSum = amps.reduce((a, b) => a + b, 0);
    const cos = Math.cos(p.tilt), sin = Math.sin(p.tilt);
    return (x, y) => {
      const dx0 = (x - p.cx * w) / w, dy0 = (y - p.cy * h) / w;
      const dx = dx0 * cos + dy0 * sin, dy = (dy0 * cos - dx0 * sin) * p.squash;
      const r = Math.hypot(dx, dy), a = Math.atan2(dy, dx) + 0.1 * r;
      let s = 0;
      for (let k = 0; k < freqs.length; k++) s += amps[k] * Math.sin(freqs[k] * a + phases[k]);
      return { s: smooth(0.28, 0.72, 0.5 + 0.5 * s / ampSum), r };
    };
  }

  // gain 1 is the cover; a figure passes less so its panels stay the brightest thing on the ground.
  function draw(ctx, w, h, p, { cell = 8, gain = 1 } = {}) {
    const levels = TONES[p.tone] || TONES.blue;
    const field = rayField(p, w, h);
    for (let j = 0; j * cell < h; j++) for (let i = 0; i * cell < w; i++) {
      const { s, r } = field(i * cell + cell / 2, j * cell + cell / 2);
      const v = clamp01(0.06 + gain * (0.58 * s * smooth(0.02, 0.5, r) + 0.95 * Math.exp(-r * 6)));
      const scaled = v * (levels.length - 1), lo = Math.floor(scaled);
      const pick = Math.min(levels.length - 1, lo + (scaled - lo > bayer(i, j) ? 1 : 0));
      ctx.fillStyle = `rgb(${levels[pick].join(',')})`;
      ctx.fillRect(i * cell, j * cell, cell, cell);
    }
  }

  return { TONES, draw };
})();
