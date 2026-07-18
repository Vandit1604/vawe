// core/paint-fx.js — GENERATIVE Canvas 2D effects: draw(ctx, w, h, lt, seed, opts), pure in `lt`.
//
// WHY THIS EXISTS, separately from core/canvas-fx.js: canvasFx transforms a SOURCE IMAGE and is baked
// once at build into a static PNG, so the pixels never change per frame. That carve-out is what makes
// halftone/dither deterministic, and it is also why canvasFx cannot express anything that MOVES.
// Matrix rain, a starfield, a travelling wave field have no source image and must be redrawn each
// frame — which is only safe if the frame is a pure function of `lt`, never of the previous frame.
//
// THE CONTRACT every effect here keeps:
//   • no accumulation. Nothing reads the canvas it is drawing onto; each frame is drawn from scratch.
//   • no Math.random / Date. Randomness is hash(seed, i) — same seed, same picture, forever.
//   • closed-form motion. A particle's position at `lt` is f(lt), not "last position + velocity",
//     because renderFrame(412) cannot step 411 frames first. That single rule is the difference
//     between this file and the particle sims parked in ROADMAP Tier 5.

// deterministic hash → [0,1). Integer mixing (no trig), so it is identical across engines.
export function hash01(i, seed = 0) {
  let h = (Math.imul(i ^ seed, 2654435761) ^ (seed * 40503)) >>> 0;
  h ^= h >>> 15; h = Math.imul(h, 2246822519); h ^= h >>> 13; h = Math.imul(h, 3266489917); h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}
const GLYPHS = 'アイウエオカキクケコサシスセソタチツテトナニヌネノ0123456789ABCDEFXYZ';

export const PAINT_FX = {
  // matrix rain — the effect ROADMAP names as needing this layer. Each column falls at its own seeded
  // speed; the head position is (lt * speed + offset) wrapped, so it is f(lt) and never integrated.
  // The glyph in a cell changes on a quantised clock, so it flickers without being random per frame.
  matrix(ctx, w, h, lt, seed, o = {}) {
    const size = o.size ?? 20, cols = Math.ceil(w / size), rows = Math.ceil(h / size) + 2;
    const color = o.color || '#3ddc84', tail = o.tail ?? 14, rate = o.rate ?? 12;
    ctx.font = `${size - 4}px ui-monospace, monospace`;
    ctx.textBaseline = 'top';
    for (let c = 0; c < cols; c++) {
      const speed = (0.5 + hash01(c, seed) * 1.3) * (o.speed ?? 1) * rows * 0.5;
      const head = ((hash01(c + 977, seed) * rows) + lt * speed) % (rows + tail);
      for (let k = 0; k < tail; k++) {
        const r = Math.floor(head) - k;
        if (r < 0 || r >= rows) continue;
        const a = (1 - k / tail) ** 1.6;
        // quantised glyph clock: changes `rate` times a second, identical for the same (c,r,tick)
        const tick = Math.floor(lt * rate);
        const g = GLYPHS[Math.floor(hash01(c * 8191 + r * 131 + tick, seed) * GLYPHS.length)];
        ctx.globalAlpha = k === 0 ? 1 : a * 0.75;
        ctx.fillStyle = k === 0 ? (o.headColor || '#eafff2') : color;
        ctx.fillText(g, c * size, r * size);
      }
    }
    ctx.globalAlpha = 1;
  },

  // starfield — radial travel. Each star's radius is (r0 + lt*speed) wrapped, so a star's position is
  // computed directly from lt rather than advanced frame by frame.
  starfield(ctx, w, h, lt, seed, o = {}) {
    const n = o.count ?? 220, cx = w / 2, cy = h / 2, maxR = Math.hypot(cx, cy);
    ctx.fillStyle = o.color || '#ffffff';
    for (let i = 0; i < n; i++) {
      const ang = hash01(i, seed) * Math.PI * 2;
      const sp = (0.25 + hash01(i + 313, seed) * 0.9) * (o.speed ?? 1) * maxR * 0.25;
      const r = ((hash01(i + 71, seed) * maxR) + lt * sp) % maxR;
      const k = r / maxR;
      ctx.globalAlpha = Math.min(1, k * 1.8) * (o.opacity ?? 0.9);
      const rad = (o.size ?? 1.6) * (0.35 + k * 1.5);
      ctx.beginPath(); ctx.arc(cx + Math.cos(ang) * r, cy + Math.sin(ang) * r, rad, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;
  },

  // wave field — stacked contour lines travelling through a sum of sines. Closed form by definition.
  waves(ctx, w, h, lt, seed, o = {}) {
    const lines = o.count ?? 26, amp = o.amp ?? 26, sp = o.speed ?? 1;
    ctx.lineWidth = o.weight ?? 1.5;
    for (let l = 0; l < lines; l++) {
      const y0 = ((l + 0.5) / lines) * h;
      const ph = hash01(l, seed) * Math.PI * 2;
      ctx.globalAlpha = (o.opacity ?? 0.5) * (0.35 + 0.65 * Math.sin((l / lines) * Math.PI));
      ctx.strokeStyle = o.color || '#2563eb';
      ctx.beginPath();
      for (let x = 0; x <= w; x += 8) {
        const u = x / w;
        const y = y0
          + Math.sin(u * 6.2 + lt * sp * 1.1 + ph) * amp
          + Math.sin(u * 13.7 - lt * sp * 0.7 + ph * 1.7) * amp * 0.35;
        x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  },
};

export const PAINT_FX_NAMES = Object.keys(PAINT_FX);
