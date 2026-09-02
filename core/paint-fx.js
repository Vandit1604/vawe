import { glowRGB } from './filters.js';
import { defineRegistry } from './registry.js';
import { lit } from './color.js';

// These draw to a CANVAS, which cannot read a CSS custom property, so a token has to be resolved to
// components. glowRGB already does exactly that against the live theme and caches it (core/filters.js),
// so the theme is read once at build and never per frame, the determinism contract is unchanged.
const ACCENT = () => `rgb(${glowRGB('var(--accent)').join(',')})`;
// core/paint-fx.js, GENERATIVE Canvas 2D effects: draw(ctx, w, h, lt, seed, opts), pure in `lt`.
//
// WHY THIS EXISTS, separately from core/canvas-fx.js: canvasFx transforms a SOURCE IMAGE and is baked
// once at build into a static PNG, so the pixels never change per frame. That carve-out is what makes
// halftone/dither deterministic, and it is also why canvasFx cannot express anything that MOVES.
// Matrix rain, a starfield, a travelling wave field have no source image and must be redrawn each
// frame, which is only safe if the frame is a pure function of `lt`, never of the previous frame.
//
// THE CONTRACT every effect here keeps:
//   • no accumulation. Nothing reads the canvas it is drawing onto; each frame is drawn from scratch.
//   • no Math.random / Date. Randomness is hash(seed, i), same seed, same picture, forever.
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

// The option names every effect below reads OFF THE LAYER. A paint layer's `o` IS the layer object
// (core/surfaces/paint.js passes it straight through), so these are layer props, not a nested options
// bag, which is why they are declared here rather than left to the effect that reads them.
export const PROPS = { size: {}, color: {}, headColor: {}, tail: {}, rate: {}, speed: {}, count: {},
  amp: {}, angle: {}, hue: {}, hues: {}, length: {}, opacity: {}, weight: {} };

export const PAINT_FX = {
  // matrix rain: the effect ROADMAP names as needing this layer. Each column falls at its own seeded
  // speed; the head position is (lt * speed + offset) wrapped, so it is f(lt) and never integrated.
  // The glyph in a cell changes on a quantised clock, so it flickers without being random per frame.
  matrix(ctx, w, h, lt, seed, o = {}) {
    const size = o.size ?? 20, cols = Math.ceil(w / size), rows = Math.ceil(h / size) + 2;
    const color = o.color || lit('#3ddc84', 'glyph rain is green because the film it quotes is green. An homage, not a brand colour'), tail = o.tail ?? 14, rate = o.rate ?? 12;
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
        ctx.fillStyle = k === 0 ? (o.headColor || lit('#eafff2', 'the leading glyph is white-hot; a trail cools BEHIND its head')) : color;
        ctx.fillText(g, c * size, r * size);
      }
    }
    ctx.globalAlpha = 1;
  },

  // starfield: radial travel. Each star's radius is (r0 + lt*speed) wrapped, so a star's position is
  // computed directly from lt rather than advanced frame by frame.
  starfield(ctx, w, h, lt, seed, o = {}) {
    const n = o.count ?? 220, cx = w / 2, cy = h / 2, maxR = Math.hypot(cx, cy);
    ctx.fillStyle = o.color || lit('#ffffff', 'stars are white');
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

  // aurora: soft colour blobs drifting through a sum of sines. Each blob's centre is f(lt) (two
  // detuned sines per axis, so the path never simply repeats), its radius breathes on a third sine,
  // and its hue is seeded per blob. Drawn as additive radial gradients (lighter blend) so overlaps
  // bloom to white the way real aurora does. Closed-form → seek-safe; nothing reads the prior frame.
  aurora(ctx, w, h, lt, seed, o = {}) {
    const n = o.count ?? 5, sp = o.speed ?? 1, base = o.opacity ?? 0.5;
    const hues = o.hues || [265, 200, 320, 150, 220];
    const prev = ctx.globalCompositeOperation;
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < n; i++) {
      const px = 0.5 + 0.42 * Math.sin(lt * sp * (0.17 + hash01(i, seed) * 0.12) + hash01(i + 5, seed) * 6.28)
                     + 0.10 * Math.sin(lt * sp * 0.31 + i);
      const py = 0.5 + 0.40 * Math.sin(lt * sp * (0.13 + hash01(i + 9, seed) * 0.10) + hash01(i + 3, seed) * 6.28)
                     + 0.08 * Math.cos(lt * sp * 0.23 + i * 1.7);
      const cx = px * w, cy = py * h;
      const rad = (0.32 + 0.10 * Math.sin(lt * sp * 0.4 + i)) * Math.max(w, h);
      const hue = o.hue != null ? o.hue : hues[i % hues.length];
      const a = base * (0.5 + 0.5 * Math.sin(lt * sp * 0.35 + i * 2.1));
      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, rad);
      g.addColorStop(0, `hsla(${hue},85%,62%,${(a * 0.9).toFixed(3)})`);
      g.addColorStop(0.5, `hsla(${hue},85%,55%,${(a * 0.35).toFixed(3)})`);
      g.addColorStop(1, `hsla(${hue},85%,50%,0)`);
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
    }
    ctx.globalCompositeOperation = prev;
  },

  // meteor: index-seeded ballistic streaks falling on a shared diagonal. Each meteor's progress along
  // its path is ((offset + lt/period) mod 1), so the head position is computed directly from lt (no
  // integration). The tail is a gradient stroke drawn BEHIND the head each frame, a deterministic echo,
  // not accumulated pixels. Head fades in/out at the path ends so streaks don't pop at the wrap.
  meteor(ctx, w, h, lt, seed, o = {}) {
    const n = o.count ?? 14, sp = o.speed ?? 1, color = o.color || lit('#eaf2ff', 'the cool edge of a spark, not a brand tint');
    const ang = ((o.angle ?? 28) * Math.PI) / 180, dx = Math.cos(ang), dy = Math.sin(ang);
    const span = Math.hypot(w, h) * 1.3, len = o.length ?? 220;
    for (let i = 0; i < n; i++) {
      const period = 2.2 + hash01(i, seed) * 3.2;
      const u = ((hash01(i + 41, seed) + lt / (period / sp)) % 1 + 1) % 1;
      // start point spread across the top-left edge, offset back along the travel direction
      const sx = (hash01(i + 7, seed) * 1.4 - 0.2) * w - dx * span * 0.15;
      const sy = (hash01(i + 19, seed) * 0.5 - 0.35) * h - dy * span * 0.15;
      const hx = sx + dx * span * u, hy = sy + dy * span * u;
      const tx = hx - dx * len, ty = hy - dy * len;
      const edge = Math.min(1, u * 6) * Math.min(1, (1 - u) * 6); // fade at both ends
      const g = ctx.createLinearGradient(tx, ty, hx, hy);
      g.addColorStop(0, `${color}00`);
      g.addColorStop(1, color);
      ctx.strokeStyle = g;
      ctx.lineWidth = o.weight ?? 2;
      ctx.globalAlpha = (o.opacity ?? 0.9) * edge;
      ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(hx, hy); ctx.stroke();
      ctx.globalAlpha = edge;
      ctx.fillStyle = o.headColor || lit('#ffffff', 'a meteor head is white-hot, like the trail above');
      ctx.beginPath(); ctx.arc(hx, hy, (o.weight ?? 2) * 0.9, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;
  },

  // wave field: stacked contour lines travelling through a sum of sines. Closed form by definition.
  waves(ctx, w, h, lt, seed, o = {}) {
    const lines = o.count ?? 26, amp = o.amp ?? 26, sp = o.speed ?? 1;
    ctx.lineWidth = o.weight ?? 1.5;
    for (let l = 0; l < lines; l++) {
      const y0 = ((l + 0.5) / lines) * h;
      const ph = hash01(l, seed) * Math.PI * 2;
      ctx.globalAlpha = (o.opacity ?? 0.5) * (0.35 + 0.65 * Math.sin((l / lines) * Math.PI));
      ctx.strokeStyle = o.color || ACCENT();   // was '#2563eb', literally this project's accent, frozen into an effect
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

// Registered so a name in the WRONG SLOT is diagnosed rather than merely rejected: the engine
// can say "that is a paint fx" when someone writes it somewhere else. core/registry.js.
export const PAINT_REGISTRY = defineRegistry('paint fx', PAINT_FX, { slot: 'paint',
  catalog: {
    title: 'Generative paint FX (per-frame)',
    tag: 'per-frame',
    intro: '`{ "type":"paint", "paint":"<name>" }`. A full-canvas animated field, pure in t.',
    usage: (n, { full }) => full({ type: 'paint', paint: n }),
    preview: (n, { base, OVER }) => base({ layers: [{ type: 'paint', paint: n, x: 0, y: 0, w: 1920, h: 1080, start: 0, duration: 6 }, { ...OVER, text: n }] }),
  },
});
