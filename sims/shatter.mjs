// sims/shatter.mjs — a panel disintegrating.
//
// The reveal move that a `t`-posed layer cannot do: the panel holds still, takes an impulse from one
// point, and its pieces then carry independent linear and angular momentum with gravity and drag.
// Each shard's state at frame n is the integral of everything before it.
//
// Composition (MOTION-CRAFT rule 8): a full second of stillness, then the break, then the fall. The
// hold before the hit is the anticipation, and it is what makes the hit land.
import { clamp01, easeInCubic, rgba, mix } from './lib/rng.mjs';

export const dims = { w: 900, h: 900 };
export const fps = 30;
export const frames = 84;
export const seed = 0x5A77;

const COLS = 13, ROWS = 13;
const HIT = 22;            // frame the impulse lands
const GRAVITY = 0.72;
const DRAG = 0.988;
const PANEL = 0.74;        // panel side as a fraction of the canvas

const NEAR = [96, 214, 255];
const FAR = [22, 46, 122];

export function setup(ctx) {
  const r = ctx.rng;
  const side = ctx.W * PANEL;
  const x0 = (ctx.W - side) / 2, y0 = (ctx.H - side) / 2;
  const cw = side / COLS, ch = side / ROWS;
  // the impulse origin, off-centre so the break is asymmetric; a centred impulse produces a
  // symmetric bloom that reads as a graphic, not as an impact
  const ix = x0 + side * 0.36, iy = y0 + side * 0.42;

  // ONE jittered vertex lattice, SHARED between neighbouring cells. Jittering each quad's four
  // corners independently is the obvious way to write this and it is wrong: neighbours then disagree
  // about where their common edge is, so the panel is already full of gaps before anything hits it
  // and the break has nothing left to reveal. Shared vertices give a seamless plate that is
  // nonetheless irregular once it comes apart.
  const vert = [];
  for (let vy = 0; vy <= ROWS; vy++) {
    for (let vx = 0; vx <= COLS; vx++) {
      const edge = vx === 0 || vy === 0 || vx === COLS || vy === ROWS;
      const j = edge ? 0 : 0.3;   // the outer boundary stays straight, so the panel reads as a panel
      vert.push([x0 + vx * cw + r.range(-j, j) * cw, y0 + vy * ch + r.range(-j, j) * ch]);
    }
  }
  const V = (vx, vy) => vert[vy * (COLS + 1) + vx];

  const shards = [];
  for (let cy = 0; cy < ROWS; cy++) {
    for (let cx = 0; cx < COLS; cx++) {
      const quad = [V(cx, cy), V(cx + 1, cy), V(cx + 1, cy + 1), V(cx, cy + 1)];
      const mx = (quad[0][0] + quad[1][0] + quad[2][0] + quad[3][0]) / 4;
      const my = (quad[0][1] + quad[1][1] + quad[2][1] + quad[3][1]) / 4;
      const dx = mx - ix, dy = my - iy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      shards.push({
        quad, cx: mx, cy: my,
        // local coordinates, so the shard can be drawn rotated about its own centre. Outset by a
        // half pixel: adjacent fills that share an exact edge still leave an antialiasing seam, and
        // a lattice of seams is a visible grid on a plate that is supposed to look solid.
        local: quad.map(([qx, qy]) => {
          const ex = qx - mx, ey = qy - my, el = Math.max(0.001, Math.hypot(ex, ey));
          return [ex + (ex / el) * 0.6, ey + (ey / el) * 0.6];
        }),
        dist,
        ox: 0, oy: 0, vx: 0, vy: 0, rot: 0, vr: 0,
        // shade by distance from the impact: near pieces read bright, far pieces sit back
        tint: mix(NEAR, FAR, clamp01(dist / (side * 0.72))),
        delay: Math.round(dist * 0.055),   // the crack PROPAGATES; it does not go off everywhere at once
        kick: r.range(0.72, 1.45),
        spin: r.range(-0.16, 0.16),
      });
    }
  }
  ctx.state = { shards, side, ix, iy };
}

export function step(ctx, i) {
  const { shards, ix, iy } = ctx.state;
  ctx.state.frameT = i;
  for (const s of shards) {
    const t0 = HIT + s.delay;
    if (i === t0) {
      // one impulse, applied once, on the frame the crack reaches this shard
      const dx = s.cx - ix, dy = s.cy - iy;
      const d = Math.max(6, Math.sqrt(dx * dx + dy * dy));
      const mag = (140 / d) * s.kick;
      s.vx = (dx / d) * mag;
      s.vy = (dy / d) * mag - 2.4;
      s.vr = s.spin * mag * 0.7;
    }
    if (i > t0) {
      s.vx *= DRAG;
      s.vy = s.vy * DRAG + GRAVITY;
      s.ox += s.vx;
      s.oy += s.vy;
      s.rot += s.vr * 0.05;
    }
  }
}

export function draw(ctx) {
  const g = ctx.g;
  const i = ctx.state.frameT;
  for (const s of ctx.state.shards) {
    const t0 = HIT + s.delay;
    // fade a shard out over its own fall so the frame empties instead of ending on litter
    const fallen = i > t0 ? (i - t0) / 34 : 0;
    const alpha = 1 - easeInCubic(clamp01(fallen));
    if (alpha <= 0.004) continue;
    g.save();
    g.translate(s.cx + s.ox, s.cy + s.oy);
    g.rotate(s.rot);
    g.beginPath();
    g.moveTo(s.local[0][0], s.local[0][1]);
    for (let k = 1; k < 4; k++) g.lineTo(s.local[k][0], s.local[k][1]);
    g.closePath();
    // tumbling reads through SHADING, not only through rotation: a shard turning away from the
    // light darkens. Without this a rotated quad looks like a sliding quad.
    const face = 0.72 + 0.28 * Math.cos(s.rot * 2);
    g.fillStyle = rgba(s.tint.map((c) => c * face), alpha * 0.94);
    g.fill();
    // the edge highlight appears only once a shard is actually LOOSE. Drawing it at rest would
    // outline every seam and give away the break before it happens.
    const loose = clamp01((i - t0) / 4);
    if (loose > 0) {
      g.strokeStyle = rgba([236, 248, 255], alpha * loose * 0.5);
      g.lineWidth = 1.2;
      g.stroke();
    }
    g.restore();
  }
}
