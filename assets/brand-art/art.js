// Brand art: a scene painted as a grey light map (0 dark, 1 lit), then a print pass into two or three inks.

const INKS = {
  a: { paper: [241, 234, 218], mid: [50, 145, 255], deep: [10, 82, 255] },
  b: { paper: [0, 0, 0], mid: [50, 145, 255], top: [255, 255, 255] },
};

export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hash(x, y, s) {
  let h = Math.imul(x, 374761393) + Math.imul(y, 668265263) + Math.imul(s, 1442695041);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

function vnoise(x, y, cell, s) {
  const gx = x / cell, gy = y / cell, x0 = Math.floor(gx), y0 = Math.floor(gy);
  const fx = gx - x0, fy = gy - y0, sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
  const a = hash(x0, y0, s), b = hash(x0 + 1, y0, s), c = hash(x0, y0 + 1, s), d = hash(x0 + 1, y0 + 1, s);
  return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
}

function bayer8() {
  let m = [[0]];
  for (let n = 1; n < 8; n *= 2) {
    const k = [];
    for (let y = 0; y < n * 2; y++) {
      k.push([]);
      for (let x = 0; x < n * 2; x++) k[y].push(4 * m[y % n][x % n] + [0, 2, 3, 1][(y >= n) * 2 + (x >= n)]);
    }
    m = k;
  }
  return m.flat().map((v) => (v + 0.5) / 64);
}

const gray = (v) => { const c = Math.round(Math.max(0, Math.min(1, v)) * 255); return `rgb(${c},${c},${c})`; };

function cam(f, cx, cy) {
  return { f, cx, cy, pr: (p) => [cx + (f * p[0]) / p[2], cy + (f * p[1]) / p[2]] };
}

function fill(ctx, pts, v) {
  ctx.fillStyle = gray(v);
  ctx.beginPath();
  pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  ctx.closePath();
  ctx.fill();
}

// A quad on the plane O + u*U + v*V.
function quad(c, O, U, V, u0, v0, u1, v1) {
  const at = (u, v) => c.pr([O[0] + U[0] * u + V[0] * v, O[1] + U[1] * u + V[1] * v, O[2] + U[2] * u + V[2] * v]);
  return [at(u0, v0), at(u1, v0), at(u1, v1), at(u0, v1)];
}

// Adds light: white at `amount` opacity in the centre, falling smoothly to nothing at r.
function glow(ctx, x, y, r, amount) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  [[0, 1], [0.15, 0.62], [0.4, 0.26], [0.7, 0.07], [1, 0]].forEach(([t, k]) => g.addColorStop(t, `rgba(255,255,255,${amount * k})`));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
}

// A four-point star: a glow, two long spikes, two short diagonal ones and a hot core.
function star(ctx, x, y, r) {
  glow(ctx, x, y, r * 12, 0.5);
  glow(ctx, x, y, r * 3.5, 0.9);
  const spike = (a, len, w) => {
    const ca = Math.cos(a), sa = Math.sin(a);
    fill(ctx, [[x + ca * len, y + sa * len], [x - sa * w, y + ca * w], [x - ca * len, y - sa * len], [x + sa * w, y - ca * w]], 1);
  };
  spike(0, r * 7, r * 0.34);
  spike(Math.PI / 2, r * 7, r * 0.34);
  spike(Math.PI / 4, r * 2.6, r * 0.22);
  spike(-Math.PI / 4, r * 2.6, r * 0.22);
  ctx.fillStyle = gray(1);
  ctx.beginPath();
  ctx.arc(x, y, r * 0.8, 0, Math.PI * 2);
  ctx.fill();
}

// The mark's shield head (64-unit grid: 10 x 7 block, 45 degree sides meeting the line at y 14), centred on x.
function shield(ctx, x, y, s, v) {
  const p = [[-5, 0], [5, 0], [5, 7], [1, 11], [1, 30], [-1, 30], [-1, 11], [-5, 7]];
  fill(ctx, p.map(([a, b]) => [x + a * s, y + b * s]), v);
}

// A small walking figure seen from behind, feet at (x, y). `page` adds a sheet carried in the right hand.
function figure(ctx, x, y, h, v, { page = false, step = 1 } = {}) {
  const u = h / 10;
  fill(ctx, [[x - 0.35 * u, y], [x - 0.95 * u * step, y], [x - 0.75 * u, y - 4.6 * u], [x - 0.1 * u, y - 4.6 * u]], v);
  fill(ctx, [[x + 0.35 * u, y], [x + 0.95 * u * step, y - 0.15 * u], [x + 0.75 * u, y - 4.6 * u], [x + 0.1 * u, y - 4.6 * u]], v);
  fill(ctx, [[x - 1.25 * u, y - 4.4 * u], [x + 1.25 * u, y - 4.4 * u], [x + 1.35 * u, y - 8.1 * u], [x - 1.35 * u, y - 8.1 * u]], v);
  fill(ctx, [[x - 1.35 * u, y - 8.0 * u], [x - 1.85 * u, y - 4.6 * u], [x - 1.45 * u, y - 4.5 * u], [x - 1.0 * u, y - 7.6 * u]], v);
  fill(ctx, [[x + 1.35 * u, y - 8.0 * u], [x + 1.85 * u, y - 4.6 * u], [x + 1.45 * u, y - 4.5 * u], [x + 1.0 * u, y - 7.6 * u]], v);
  ctx.fillStyle = gray(v);
  ctx.beginPath();
  ctx.arc(x, y - 9.0 * u, 0.95 * u, 0, Math.PI * 2);
  ctx.fill();
  if (page) {
    fill(ctx, [[x + 1.5 * u, y - 6.8 * u], [x + 3.5 * u, y - 6.4 * u], [x + 3.2 * u, y - 3.6 * u], [x + 1.2 * u, y - 4.0 * u]], 0.98);
  }
}

// Timeline lanes on a tower face: floors along z, each floor a row of clips cut around one playhead column.
// play (0..1), when given, sweeps the playhead from the tower's corner to its outer edge; each clip then draws one ink.
function laneFace(ctx, c, R, O, U, zn, zf, E, base, clipV, play) {
  const V = [0, 0, 1];
  const ph0 = 0.25 + R() * 0.6 * E;
  const ph = play == null ? ph0 : 0.03 + play * E;
  const dz = 0.034;
  for (let z = zn; z < zf; z += dz) {
    const t = (z - zn) / (zf - zn);
    const b = base * (1 - 0.32 * t);
    fill(ctx, quad(c, O, U, V, 0, z, E, Math.min(zf, z + dz + 0.002)), b);
    if (zf - z < dz * 1.5) continue;
    let u = R() * 0.08;
    const top = z + dz * 0.2, bot = z + dz * 0.8;
    while (u < E) {
      const len = 0.05 + R() * R() * 0.5;
      const u1 = Math.min(E, u + len);
      const cut = [[u, u1]];
      if (u < ph + 0.03 && u1 > ph - 0.03) cut.splice(0, 1, [u, ph - 0.03], [ph + 0.03, u1]);
      const one = play == null ? null : clipV * (0.7 + 0.6 * R());
      for (const [a, e] of cut) if (e - a > 0.01) fill(ctx, quad(c, O, U, V, a, top, e, bot), one ?? clipV * (0.7 + 0.6 * R()));
      u = u1 + 0.018 + R() * 0.03;
    }
  }
  fill(ctx, quad(c, O, U, V, ph - 0.006, zn, ph + 0.006, zf), clipV);
  fill(ctx, quad(c, O, U, V, 0, zf - 0.006, E, zf), 0.98);
}

function sceneLanes(ctx, W, H, lay, R) {
  const f = H * lay.f, cx = lay.vx * W, cy = lay.vy * H, c = cam(f, cx, cy);
  const sky = 0.1;
  ctx.fillStyle = gray(sky);
  ctx.fillRect(0, 0, W, H);
  const yb = 0.5, wb = lay.road ?? 0.06, zb = 9;
  const sx = cx, sy = cy + (f * yb) / zb - H * 0.05;
  glow(ctx, sx, sy, H * 0.6, 0.3);
  const towers = lay.towers;
  for (const t of towers) {
    const xi = (t.o[0] * H * t.zn) / f, yi = (t.o[1] * H * t.zn) / f;
    const O = [xi, yi, 0];
    laneFace(ctx, c, R, O, [0, t.q[1], 0], t.zn, t.zf, 3, 0.62, 0.12, lay.play);
    laneFace(ctx, c, R, O, [t.q[0], 0, 0], t.zn, t.zf, 3, 0.88, 0.22, lay.play);
  }
  star(ctx, sx, sy, lay.twinkle ? H * 0.012 * lay.twinkle : H * 0.012);
  for (let z = 0.3; z < zb; z *= 1.04) {
    const t = Math.min(1, (z - 0.3) / 3.2);
    fill(ctx, quad(c, [-wb, yb, 0], [1, 0, 0], [0, 0, 1], 0, z, 2 * wb, z * 1.042), 0.55 + 0.42 * t);
  }
  const zf = lay.figZ;
  fill(ctx, [c.pr([-0.03, yb, zf * 0.7]), c.pr([0.03, yb, zf * 0.7]), c.pr([0.012, yb, zf]), c.pr([-0.012, yb, zf])], 0.38);
  const [fx, fy] = c.pr([0, yb, zf]);
  figure(ctx, fx, fy, H * 0.07, 0.04);
  const [hx, hy] = c.pr([0, yb, zb]);
  shield(ctx, hx, hy - H * 0.034, H * 0.0013, 1);
}

// Page stacks seen from above, the film frame glowing on the ground far below.
function scenePages(ctx, W, H, lay, R) {
  const f = H * lay.f, cx = lay.vx * W, cy = lay.vy * H, c = cam(f, cx, cy);
  const sky = 0.08, zg = 9;
  ctx.fillStyle = gray(sky);
  ctx.fillRect(0, 0, W, H);
  glow(ctx, cx, cy, H * 0.55, 0.4);
  glow(ctx, cx, cy, H * 0.2, 0.35);
  const fw = lay.frameW, fh = lay.frameW * 0.5625;
  fill(ctx, quad(c, [-fw, -fh, zg], [1, 0, 0], [0, 1, 0], 0, 0, 2 * fw, 2 * fh), 0.08);
  fill(ctx, quad(c, [-fw * 0.8, -fh * 0.62, zg], [1, 0, 0], [0, 1, 0], 0, 0, 1.6 * fw, 1.24 * fh), 1);
  for (let i = 0; i < 9; i++) {
    for (const yy of [-fh * 0.9, fh * 0.72]) {
      const x = -fw * 0.9 + i * (1.8 * fw) / 8.6;
      fill(ctx, quad(c, [x, yy, zg], [1, 0, 0], [0, 1, 0], 0, 0, fw * 0.1, fh * 0.18), 0.9);
    }
  }
  if (lay.play != null) {
    const fx0 = -fw * 0.8, fy0 = -fh * 0.62, px = 1.6 * fw * lay.play;
    fill(ctx, quad(c, [fx0, fy0, zg], [1, 0, 0], [0, 1, 0], 0, 1.12 * fh, px, 1.24 * fh), 0.45);
    fill(ctx, quad(c, [fx0, fy0, zg], [1, 0, 0], [0, 1, 0], px - 0.035, 0, px + 0.035, 1.24 * fh), 0.12);
  }
  const stacks = lay.stacks.map((s) => ({ ...s, w: s.r.map((v) => (v * H * s.zt) / f) })).sort((a, b) => b.zt - a.zt);
  const drawSides = (s) => {
    const [x0, y0, x1, y1] = s.w;
    const faces = [];
    if (x0 > 0) faces.push([[x0, y1, 0], [0, -1, 0], y1 - y0]);
    if (x1 < 0) faces.push([[x1, y0, 0], [0, 1, 0], y1 - y0]);
    if (y0 > 0) faces.push([[x0, y0, 0], [1, 0, 0], x1 - x0]);
    if (y1 < 0) faces.push([[x1, y1, 0], [-1, 0, 0], x1 - x0]);
    for (const [O, U, E] of faces) {
      let k = 0;
      for (let z = s.zt; z < zg; k++) {
        const dz = 0.028 * (1 + (k % 7 === 0) * 1.6);
        const t = (z - s.zt) / (zg - s.zt);
        const lit = 0.4 + 0.45 * Math.pow(t, 0.6);
        const v = k % 7 === 0 ? lit * 0.35 : lit * (0.86 + 0.28 * R());
        fill(ctx, quad(c, O, U, [0, 0, 1], 0, z, E, z + dz + 0.002), v);
        z += dz;
      }
    }
  };
  const drawCap = (s) => {
    const [x0, y0, x1, y1] = s.w, z = s.zt;
    fill(ctx, quad(c, [x0, y0, z], [1, 0, 0], [0, 1, 0], 0, 0, x1 - x0, y1 - y0), 0.95);
    const wx = x1 - x0, hy = y1 - y0, m = Math.min(wx, hy) * 0.09, lh = hy / 22;
    fill(ctx, quad(c, [x0, y0, z], [1, 0, 0], [0, 1, 0], 0, 0, wx, m * 0.9), 0.62);
    let indent = 0;
    for (let y = m * 1.6; y < hy - m; y += lh) {
      if (R() < 0.12) { indent = Math.max(0, indent - 1); continue; }
      let x = m + indent * wx * 0.05;
      const n = 1 + Math.floor(R() * 3);
      for (let i = 0; i < n && x < wx - m; i++) {
        const len = Math.min(wx - m - x, wx * (0.04 + R() * 0.22));
        fill(ctx, quad(c, [x0, y0, z], [1, 0, 0], [0, 1, 0], x, y, x + len, y + lh * 0.5), i === 0 ? 0.18 : 0.42);
        x += len + wx * 0.02;
      }
      if (R() < 0.3) indent = Math.min(4, indent + 1);
    }
  };
  const [ba, bb] = lay.bridge;
  const A = stacks.find((s) => s.id === ba), B = stacks.find((s) => s.id === bb);
  const zb = lay.bridgeZ, by0 = (lay.bridgeY * H * zb) / f, bw = 0.075;
  const bridge = () => {
    const xa = A.w[2], xb2 = B.w[0];
    fill(ctx, quad(c, [xa, by0, zb], [1, 0, 0], [0, 1, 0], 0, 0, xb2 - xa, bw), 0.97);
    fill(ctx, quad(c, [xa, by0 + bw, zb], [1, 0, 0], [0, 0, 1], 0, 0, xb2 - xa, 0.05), 0.5);
    const [fx, fy] = c.pr([xa + (xb2 - xa) * lay.figU, by0 + bw * 0.7, zb]);
    figure(ctx, fx, fy, H * lay.figH, 0.04);
  };
  stacks.forEach(drawSides);
  bridge();
  stacks.forEach(drawCap);
  if (lay.sweep != null) band(ctx, W, H, lay.sweep, 0.3);
  const [sx, sy] = c.pr([0, 0, zg]);
  star(ctx, sx, sy, lay.twinkle ? H * 0.009 * lay.twinkle : H * 0.009);
}

// Adds a soft diagonal band of light across the frame; at 0 it is off the left edge, at 1 off the right.
function band(ctx, W, H, at, amount) {
  const x = -0.45 * W + (1.9 * W + 0.5 * H) * at, half = H * 0.45;
  const g = ctx.createLinearGradient(x - half, -half * 0.5, x + half, half * 0.5);
  [[0, 0], [0.5, amount], [1, 0]].forEach(([t, k]) => g.addColorStop(t, `rgba(255,255,255,${k})`));
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
}

// A filmstrip laid on the ground like a road: it starts as an HTML page under the camera and runs as film
// frames to the star on the horizon, under a row of frame gates.
function sceneStrip(ctx, W, H, lay, R) {
  const f = H * lay.f, cx = lay.vx * W, cy = lay.vy * H, c = cam(f, cx, cy);
  const sky = 0.09, yb = lay.camY, zFar = 80;
  ctx.fillStyle = gray(sky);
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = gray(0.16);
  ctx.fillRect(0, cy, W, H - cy);
  for (let x = -40; x <= 40; x += 1.6) fill(ctx, [c.pr([x - 0.02, yb, 0.3]), c.pr([x + 0.02, yb, 0.3]), c.pr([x + 0.02, yb, zFar]), c.pr([x - 0.02, yb, zFar])], 0.21);
  glow(ctx, cx, cy, H * 0.75, 0.42);
  const P = (x, z) => [x, yb, z];
  const flat = (x0, z0, x1, z1, v) => fill(ctx, [c.pr(P(x0, z0)), c.pr(P(x1, z0)), c.pr(P(x1, z1)), c.pr(P(x0, z1))], v);
  const zPage = lay.pageEnd, hw = 0.5;
  flat(-hw, zPage, hw, zFar, 0.12);
  let z = lay.run == null ? zPage + 0.05 : zPage + 0.05 + (lay.run - 1) * 0.5;
  for (let k = 0; z < zFar; k++) {
    const len = 0.5, t = Math.min(1, Math.log(z / zPage) / Math.log(zFar / zPage));
    flat(-hw * 0.7, z, hw * 0.7, z + len * 0.86, 0.62 + 0.36 * t);
    for (let s = 0; s < 4; s++) {
      const zs = z + s * (len / 4) + 0.03;
      flat(-hw * 0.93, zs, -hw * 0.81, zs + 0.06, 0.85);
      flat(hw * 0.81, zs, hw * 0.93, zs + 0.06, 0.85);
    }
    z += len;
  }
  const pw = lay.pageW, z0 = 0.3;
  flat(-pw, z0, pw, zPage, 0.95);
  let indent = 0;
  for (let zz = zPage - 0.12; zz > z0 + 0.05; zz -= 0.09) {
    if (R() < 0.14) { indent = Math.max(0, indent - 1); continue; }
    let x = -pw + 0.12 + indent * 0.09;
    const n = 1 + Math.floor(R() * 3);
    for (let i = 0; i < n && x < pw - 0.12; i++) {
      const len = Math.min(pw - 0.12 - x, 0.08 + R() * 0.38);
      flat(x, zz - 0.045, x + len, zz, i === 0 ? 0.2 : 0.45);
      x += len + 0.05;
    }
    if (R() < 0.3) indent = Math.min(4, indent + 1);
  }
  for (const zg of lay.gates.slice().sort((a, b) => b - a)) {
    const gw = 0.95, gh = 1.15, th = 0.05, top = yb - gh;
    const side = (x0, x1) => fill(ctx, [c.pr([x0, top, zg]), c.pr([x1, top, zg]), c.pr([x1, yb, zg]), c.pr([x0, yb, zg])], 0.9);
    side(-gw, -gw + th);
    side(gw - th, gw);
    fill(ctx, [c.pr([-gw, top - 0.16, zg]), c.pr([gw, top - 0.16, zg]), c.pr([gw, top + th, zg]), c.pr([-gw, top + th, zg])], 0.9);
    for (let k = 0; k < 12; k++) {
      const x = -gw + 0.08 + k * ((2 * gw - 0.16) / 11.6);
      fill(ctx, [c.pr([x, top - 0.12, zg]), c.pr([x + 0.07, top - 0.12, zg]), c.pr([x + 0.07, top - 0.03, zg]), c.pr([x, top - 0.03, zg])], 0.1);
    }
  }
  const zf = lay.figZ;
  fill(ctx, [c.pr([-0.005, yb, zf * 0.76]), c.pr([0.05, yb, zf * 0.76]), c.pr([0.04, yb, zf]), c.pr([0, yb, zf])], 0.3);
  const [fx, fy] = c.pr(P(0.02, zf));
  figure(ctx, fx, fy, H * lay.figH, 0.04, { page: true });
  star(ctx, cx, cy - H * 0.04, lay.twinkle ? H * 0.017 * lay.twinkle : H * 0.017);
}

// Adds a cone of light from point a to the segment b0-b1, fading from `near` to `far` opacity.
function beam(ctx, a, b0, b1, near, far) {
  const mx = (b0[0] + b1[0]) / 2, my = (b0[1] + b1[1]) / 2;
  const g = ctx.createLinearGradient(a[0], a[1], mx, my);
  g.addColorStop(0, `rgba(255,255,255,${near})`);
  g.addColorStop(1, `rgba(255,255,255,${far})`);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(a[0], a[1]);
  ctx.lineTo(b0[0], b0[1]);
  ctx.lineTo(b1[0], b1[1]);
  ctx.closePath();
  ctx.fill();
}

// Text lines of a document on the plane O + u*U + v*V, inside u 0..w, v 0..h: a title bar, then ragged lines.
// `shown` (a count of body lines, fractional) types the lines in: the line it ends in is cut at that fraction.
function docLines(ctx, c, R, { O, U, V, w, h, shown = Infinity }, ink, rows) {
  const m = w * 0.1, lh = (h - 2 * m) / rows;
  fill(ctx, quad(c, O, U, V, m, m, m + w * 0.42, m + lh * 0.9), ink);
  for (let k = 2; k < rows; k++) {
    const y = m + k * lh, typed = shown - (k - 2), end = typed >= 1 ? Infinity : m + (w - 2 * m) * typed;
    let x = m + (R() < 0.3 ? w * 0.06 : 0);
    const n = 1 + Math.floor(R() * 3);
    for (let i = 0; i < n && x < w - m; i++) {
      const len = Math.min(w - m - x, w * (0.08 + R() * 0.32));
      if (x < end) fill(ctx, quad(c, O, U, V, x, y, Math.min(x + len, end), y + lh * 0.45), ink);
      x += len + w * 0.04;
    }
  }
}

// Six skill cards hung as slabs in the air, a stair that climbs to the star; the figure stands on the second.
function sceneStair(ctx, W, H, lay, R) {
  const f = H * lay.f, cx = lay.vx * W, cy = lay.vy * H, c = cam(f, cx, cy);
  ctx.fillStyle = gray(0.08);
  ctx.fillRect(0, 0, W, H);
  const steps = lay.steps.map(([x, y, z], i) => ({ i, x, y, z }));
  const last = steps[steps.length - 1];
  const [sx, sy] = c.pr([last.x, last.y - lay.starUp, last.z + lay.depth]);
  glow(ctx, sx, sy, H * 0.9, 0.34);
  glow(ctx, sx, sy, H * 0.3, 0.3);
  const w = lay.cardW, h = lay.cardH, d = lay.depth;
  for (const s of steps.slice().reverse()) {
    const t = s.i / (steps.length - 1);
    const x0 = s.x - w, x1 = s.x + w, y0 = s.y, y1 = s.y + h, z0 = s.z;
    if (y0 > 0) fill(ctx, quad(c, [x0, y0, z0], [1, 0, 0], [0, 0, 1], 0, 0, 2 * w, d), 0.98);
    if (y1 < 0) fill(ctx, quad(c, [x0, y1, z0], [1, 0, 0], [0, 0, 1], 0, 0, 2 * w, d), 0.22);
    if (x0 > 0) fill(ctx, quad(c, [x0, y0, z0], [0, 0, 1], [0, 1, 0], 0, 0, d, h), 0.4);
    if (x1 < 0) fill(ctx, quad(c, [x1, y0, z0], [0, 0, 1], [0, 1, 0], 0, 0, d, h), 0.4);
    const face = 0.8 + 0.16 * t;
    fill(ctx, quad(c, [x0, y0, z0], [1, 0, 0], [0, 1, 0], 0, 0, 2 * w, h), face);
    fill(ctx, quad(c, [x0, y0, z0], [1, 0, 0], [0, 1, 0], 0, 0, 2 * w, h * 0.035), 1);
    const typed = lay.type == null ? Infinity : typedLines((lay.type + s.i / steps.length) % 1, 9);
    docLines(ctx, c, R, { O: [x0, y0, z0], U: [1, 0, 0], V: [0, 1, 0], w: 2 * w, h, shown: typed }, 0.16, 11);
    if (s.i === lay.figStep) {
      const fz = z0 + d * 0.55, xf = s.x + w * lay.figU;
      fill(ctx, [c.pr([xf - 0.01, y0, fz]), c.pr([xf + 0.05, y0, fz]), c.pr([xf + 0.04, y0, z0 + 0.02]), c.pr([xf - 0.02, y0, z0 + 0.02])], 0.55);
      const [fx, fy] = c.pr([xf, y0, fz]);
      figure(ctx, fx, fy, H * lay.figH, 0.04, { page: Boolean(lay.figPage) });
    }
  }
  star(ctx, sx, sy, lay.twinkle ? H * 0.015 * lay.twinkle : H * 0.015);
}

// A card's lines at phase q of its cycle: typed in over 85% of it, then cleared.
function typedLines(q, lines) {
  return q < 0.85 ? (lines * q) / 0.85 : 0;
}

// The towers of the search city, nearest last, with none in front of the cited page; cA and cB box the cited face on screen.
function searchTowers(c, W, lay, R) {
  const yg = lay.camY, C = lay.cited;
  const cited = { x0: C.x - C.w, x1: C.x + C.w, z0: C.z, z1: C.z + 0.4, h: C.h, cited: true };
  const box = (t) => [c.pr([t.x0, yg - t.h, t.z0]), c.pr([t.x1, yg, t.z0])];
  const [cA, cB] = box(cited);
  const towers = [cited];
  let z = lay.z0;
  for (let row = 0; row < lay.rows; row++) {
    for (let gx = -lay.cols; gx <= lay.cols; gx++) {
      const x = gx * lay.pitch + (R() - 0.5) * 0.25, hw = 0.12 + R() * 0.16, dd = 0.2 + R() * 0.3, h = 0.2 + R() * R() * lay.tall;
      if (R() < 0.2) continue;
      const t = { x0: x - hw, x1: x + hw, z0: z, z1: z + dd, h };
      const [a, b] = box(t);
      if (a[0] < lay.left * W) continue;
      const covers = t.z0 < C.z + 0.5 && a[0] < cB[0] + 8 && b[0] > cA[0] - 8 && a[1] < cB[1];
      if (!covers) towers.push(t);
    }
    z *= lay.zg;
  }
  towers.sort((a, b) => b.z0 - a.z0);
  return { towers, cA, cB };
}

// The ground of the search city: brighter toward the horizon, streets running to it.
function searchGround(ctx, c, lay) {
  const yg = lay.camY, zEnd = lay.z0 * Math.pow(lay.zg, lay.rows);
  for (let zz = 0.4; zz < zEnd; zz *= 1.05) {
    const t = Math.log(zz / 0.4) / Math.log(zEnd / 0.4);
    fill(ctx, quad(c, [lay.groundX, yg, zz], [1, 0, 0], [0, 0, 1], 0, 0, 40, zz * 0.052), 0.05 + 0.3 * t * t);
  }
  for (let gx = -lay.cols; gx <= lay.cols; gx++) {
    const x = (gx + 0.5) * lay.pitch;
    if (x < lay.groundX) continue;
    fill(ctx, [c.pr([x - 0.012, yg, 0.4]), c.pr([x + 0.012, yg, 0.4]), c.pr([x + 0.012, yg, zEnd]), c.pr([x - 0.012, yg, zEnd])], 0.4);
  }
}

// One page tower: black near, blue with distance; the cited one is a white page.
function pageTower(ctx, c, R, lay, t) {
  const top = lay.camY - t.h, wid = t.x1 - t.x0, dep = t.z1 - t.z0;
  const fog = lay.fog * Math.pow(Math.min(1, Math.log(t.z0 / lay.z0) / Math.log(lay.fogZ / lay.z0)), 0.8);
  if (t.x0 > 0) fill(ctx, quad(c, [t.x0, top, t.z0], [0, 0, 1], [0, 1, 0], 0, 0, dep, t.h), 0.02 + fog * 0.8);
  if (t.x1 < 0) fill(ctx, quad(c, [t.x1, top, t.z0], [0, 0, 1], [0, 1, 0], 0, 0, dep, t.h), 0.02 + fog * 0.8);
  if (top > 0) fill(ctx, quad(c, [t.x0, top, t.z0], [1, 0, 0], [0, 0, 1], 0, 0, wid, dep), 0.14 + fog);
  const O = [t.x0, top, t.z0];
  fill(ctx, quad(c, O, [1, 0, 0], [0, 1, 0], 0, 0, wid, t.h), t.cited ? 0.98 : 0.04 + fog);
  if ((c.f * wid) / t.z0 <= 9) return;
  const hh = t.cited ? Math.min(t.h, wid * 1.6) : t.h;
  docLines(ctx, c, R, { O, U: [1, 0, 0], V: [0, 1, 0], w: wid, h: hh }, t.cited ? 0.08 : 0.42 + fog, Math.max(5, Math.round(hh / 0.045)));
}

// A city of page towers at night: searchlights sweep the sky, one lands on one page and it is cited.
function sceneSearch(ctx, W, H, lay, R) {
  const f = H * lay.f, cx = lay.vx * W, cy = lay.vy * H, c = cam(f, cx, cy);
  const yg = lay.camY;
  ctx.fillStyle = gray(0.05);
  ctx.fillRect(0, 0, W, H);
  for (const [x, r, a] of lay.haze) glow(ctx, x * W, cy, H * r, a);
  const { towers, cA, cB } = searchTowers(c, W, lay, R);
  searchGround(ctx, c, lay);
  for (const t of towers) pageTower(ctx, c, R, lay, t);
  for (const [i, b] of lay.beams.entries()) {
    const a = c.pr([b.x, yg - b.y, b.z]), len = H * 2.4, ang = b.a + (lay.swing?.[i] ?? 0);
    beam(ctx, a, [a[0] + Math.cos(ang - b.w) * len, a[1] + Math.sin(ang - b.w) * len], [a[0] + Math.cos(ang + b.w) * len, a[1] + Math.sin(ang + b.w) * len], 0.5, 0.05);
    glow(ctx, a[0], a[1], H * 0.025, 0.9);
  }
  const src = c.pr(lay.citedFrom);
  beam(ctx, src, [cA[0], (cA[1] + cB[1]) / 2 - H * 0.04], [cB[0], (cA[1] + cB[1]) / 2 + H * 0.04], 0.55, 0.4);
  glow(ctx, src[0], src[1], H * 0.03, 1);
  glow(ctx, (cA[0] + cB[0]) / 2, (cA[1] + cB[1]) / 2, H * 0.16, 0.35);
  for (let k = 0; k < lay.crawlers; k++) {
    const x = (Math.floor(R() * 2 * lay.cols) - lay.cols + 0.5) * lay.pitch, zc = lay.z0 * Math.pow(lay.zg, R() * lay.rows * 0.6);
    const [px, py] = c.pr([x, yg, zc]);
    if (px < lay.left * W + 40) continue;
    glow(ctx, px, py, H * 0.016, 0.8);
    ctx.fillStyle = gray(1);
    ctx.beginPath();
    ctx.arc(px, py, Math.max(2, H * 0.003), 0, Math.PI * 2);
    ctx.fill();
  }
  const [fx, fy] = c.pr([lay.fig[0], yg, lay.fig[1]]);
  glow(ctx, fx, fy - H * lay.figH * 0.4, H * lay.figH * 2.2, 0.7);
  figure(ctx, fx, fy, H * lay.figH, 0.02);
  star(ctx, (cA[0] + cB[0]) / 2, cA[1] - H * 0.06, H * 0.014);
}

// One endless card-catalogue wall; a drawer stands open with its index cards and the figure brings one more.
function sceneCatalog(ctx, W, H, lay, R) {
  const f = H * lay.f, cx = lay.vx * W, cy = lay.vy * H, c = cam(f, cx, cy);
  const yb = lay.floorY, zFar = 70, rh = lay.rowH, cz = lay.colZ;
  ctx.fillStyle = gray(0.1);
  ctx.fillRect(0, 0, W, H);
  const [sx, sy] = [cx + lay.starDX * H, cy - lay.starUp * H];
  glow(ctx, sx, sy, H * 0.8, 0.36);
  for (let zz = 0.4; zz < zFar; zz *= 1.05) {
    const t = Math.min(1, Math.log(zz / 0.4) / Math.log(zFar / 0.4));
    fill(ctx, quad(c, [-30, yb, zz], [1, 0, 0], [0, 0, 1], 0, 0, 60, zz * 0.052), 0.12 + 0.3 * Math.pow(t, 2));
  }
  fill(ctx, [c.pr([lay.lane[0], yb, 0.5]), c.pr([lay.lane[1], yb, 0.5]), c.pr([lay.lane[1], yb, zFar]), c.pr([lay.lane[0], yb, zFar])], 0.62);
  const wall = (X, dir, base, rows) => {
    const U = [0, 0, 1], V = [0, 1, 0];
    fill(ctx, quad(c, [X, yb - rows * rh, 0.3], U, V, 0, 0, zFar, rows * rh), base * 0.35);
    for (let k = 0, z0 = 0.3; z0 < 40; k++, z0 += cz) {
      const t = Math.min(1, Math.log((z0 + 0.3) / 0.6) / Math.log(40 / 0.6));
      for (let r = 0; r < rows; r++) {
        const y0 = yb - (r + 1) * rh;
        if ((f * rh) / z0 < 2.5) continue;
        if (dir > 0 && r === lay.open[0] && k === lay.open[1]) {
          fill(ctx, quad(c, [X, y0, z0], U, V, cz * 0.06, rh * 0.08, cz * 0.94, rh * 0.94), 0.03);
          continue;
        }
        const v = base * (0.78 + 0.2 * t) * (0.94 + 0.12 * R());
        const O = [X, y0, z0];
        fill(ctx, quad(c, O, U, V, cz * 0.06, rh * 0.08, cz * 0.94, rh * 0.94), v);
        fill(ctx, quad(c, O, U, V, cz * 0.36, rh * 0.26, cz * 0.64, rh * 0.42), Math.min(1, v + 0.2));
        fill(ctx, quad(c, O, U, V, cz * 0.38, rh * 0.31, cz * 0.62, rh * 0.37), v * 0.45);
        fill(ctx, quad(c, O, U, V, cz * 0.46, rh * 0.56, cz * 0.54, rh * 0.68), 0.12);
      }
    }
  };
  wall(-lay.leftX, -1, lay.leftV, lay.rows);
  wall(lay.rightX, 1, 0.98, lay.rows);
  const X = lay.rightX, [orow, ocol] = lay.open, P = lay.pull;
  const za = 0.3 + ocol * cz + cz * 0.06, zb = 0.3 + (ocol + 1) * cz - cz * 0.06;
  const yTop = yb - (orow + 1) * rh + rh * 0.08, yBot = yb - orow * rh - rh * 0.06;
  const xo = X - P;
  if (yTop > 0) fill(ctx, quad(c, [xo, yTop, za], [1, 0, 0], [0, 0, 1], 0, 0, P, zb - za), 0.1);
  const cards = lay.cards;
  for (let i = cards - 1; i >= 0; i--) {
    const xc = xo + 0.06 + (i * (P - 0.1)) / cards;
    const up = rh * (0.45 + 0.15 * R()) + (i === lay.liftCard ? lay.lift : 0), tab = R();
    const O = [xc, yTop - up, za + 0.015];
    fill(ctx, quad(c, O, [0, 0, 1], [0, 1, 0], 0, 0, zb - za - 0.03, up + rh * 0.4), 0.97 - 0.1 * R());
    fill(ctx, quad(c, O, [0, 0, 1], [0, 1, 0], (zb - za) * (0.1 + 0.6 * tab), -rh * 0.07, (zb - za) * (0.28 + 0.6 * tab), 0.002), 0.97);
    fill(ctx, quad(c, O, [0, 0, 1], [0, 1, 0], 0, 0, zb - za - 0.03, rh * 0.02), 0.3);
    fill(ctx, quad(c, O, [0, 0, 1], [0, 1, 0], (zb - za) * 0.1, up * 0.3, (zb - za) * 0.6, up * 0.36), 0.35);
  }
  fill(ctx, quad(c, [xo, yTop, za], [1, 0, 0], [0, 1, 0], 0, 0, P, yBot - yTop), 0.5);
  for (let k = 1; k < 6; k++) fill(ctx, quad(c, [xo, yTop, za], [1, 0, 0], [0, 1, 0], (P * k) / 6, 0, (P * k) / 6 + 0.008, yBot - yTop), 0.32);
  const Of = [xo, yTop, za];
  fill(ctx, quad(c, Of, [0, 0, 1], [0, 1, 0], 0, 0, zb - za, yBot - yTop), 0.95);
  fill(ctx, quad(c, Of, [0, 0, 1], [0, 1, 0], (zb - za) * 0.34, (yBot - yTop) * 0.22, (zb - za) * 0.66, (yBot - yTop) * 0.4), 1);
  fill(ctx, quad(c, Of, [0, 0, 1], [0, 1, 0], (zb - za) * 0.36, (yBot - yTop) * 0.28, (zb - za) * 0.64, (yBot - yTop) * 0.34), 0.4);
  fill(ctx, quad(c, Of, [0, 0, 1], [0, 1, 0], (zb - za) * 0.45, (yBot - yTop) * 0.56, (zb - za) * 0.55, (yBot - yTop) * 0.7), 0.1);
  const fzz = lay.figZ, fxx = lay.figX;
  fill(ctx, [c.pr([fxx - 0.01, yb, fzz]), c.pr([fxx + 0.02, yb, fzz]), c.pr([fxx - 0.12, yb, fzz - 0.4]), c.pr([fxx - 0.18, yb, fzz - 0.4])], 0.3);
  const [fx, fy] = c.pr([fxx, yb, fzz]);
  figure(ctx, fx, fy, H * lay.figH, 0.04, { page: true });
  star(ctx, sx, sy, H * 0.014);
}

function hull(pts) {
  const p = pts.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lo = [], up = [];
  for (const q of p) { while (lo.length > 1 && cross(lo[lo.length - 2], lo[lo.length - 1], q) <= 0) lo.pop(); lo.push(q); }
  for (const q of p.reverse()) { while (up.length > 1 && cross(up[up.length - 2], up[up.length - 1], q) <= 0) up.pop(); up.push(q); }
  return lo.slice(0, -1).concat(up.slice(0, -1));
}

// A hall with one huge screen; the figure's projector throws a beam through haze, and the film on the screen holds the star.
function sceneCinema(ctx, W, H, lay, R) {
  const f = H * lay.f, cx = lay.vx * W, cy = lay.vy * H, c = cam(f, cx, cy);
  const S = lay.screen, yf = lay.floorY;
  ctx.fillStyle = gray(0.05);
  ctx.fillRect(0, 0, W, H);
  const O = [S.x0, S.top, S.z0], U = [S.x1 - S.x0, 0, S.z1 - S.z0], V = [0, S.bot - S.top, 0];
  const at = (u, v) => c.pr([O[0] + U[0] * u, O[1] + V[1] * v, O[2] + U[2] * u]);
  const [mx, my] = at(0.5, 0.5);
  glow(ctx, mx, my, H * 1.2, 0.22);
  for (let zz = 0.5; zz < 40; zz *= 1.05) fill(ctx, quad(c, [-30, yf, zz], [1, 0, 0], [0, 0, 1], 0, 0, 60, zz * 0.052), 0.1 + 0.08 * Math.min(1, zz / S.z1));
  const ext = lay.curtain;
  for (const [u0, u1] of [[-ext, -0.02], [1.02, 1 + ext]]) {
    for (let k = 0; k < 14; k++) {
      const a = u0 + ((u1 - u0) * k) / 14, b = u0 + ((u1 - u0) * (k + 1)) / 14;
      fill(ctx, [at(a, -0.12), at(b, -0.12), c.pr([O[0] + U[0] * b, yf, O[2] + U[2] * b]), c.pr([O[0] + U[0] * a, yf, O[2] + U[2] * a])], k % 2 ? 0.2 : 0.3);
    }
  }
  fill(ctx, [at(-ext, -0.2), at(1 + ext, -0.2), at(1 + ext, -0.1), at(-ext, -0.1)], 0.3);
  fill(ctx, [at(-0.02, -0.02), at(1.02, -0.02), at(1.02, 1.02), at(-0.02, 1.02)], 0.03);
  const bands = 12, hz = 0.66;
  for (let k = 0; k < bands; k++) {
    const v0 = (hz * k) / bands, v1 = (hz * (k + 1)) / bands + 0.002;
    fill(ctx, [at(0, v0), at(1, v0), at(1, v1), at(0, v1)], 0.36 + 0.3 * (k / bands));
  }
  fill(ctx, [at(0, hz), at(1, hz), at(1, 1), at(0, 1)], 0.1);
  const ridge = [at(0, 1)];
  for (let k = 0; k <= 16; k++) ridge.push(at(k / 16, hz - 0.02 - 0.12 * Math.pow(R(), 1.6) * Math.sin((Math.PI * k) / 16)));
  ridge.push(at(1, 1));
  fill(ctx, ridge, 0.08);
  const [sa, sb] = lay.seats;
  for (let zr = S.z0 - 0.3; zr > lay.lens[2] + 0.3; zr -= lay.rowGap) {
    for (let xs = sa; xs < sb; xs += 0.06) {
      if (Math.abs(xs - lay.aisle) < 0.08) continue;
      const top = yf - 0.05;
      fill(ctx, quad(c, [xs, top, zr], [1, 0, 0], [0, 1, 0], 0.004, 0, 0.054, 0.05), 0.04);
      fill(ctx, quad(c, [xs, top, zr], [1, 0, 0], [0, 1, 0], 0.006, 0, 0.052, 0.008), 0.5);
    }
  }
  const lens = c.pr(lay.lens);
  const cone = hull([lens, at(0, 0), at(1, 0), at(1, 1), at(0, 1)]);
  ctx.save();
  ctx.beginPath();
  cone.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  ctx.closePath();
  const g = ctx.createLinearGradient(lens[0], lens[1], mx, my);
  g.addColorStop(0, lay.flicker == null ? 'rgba(255,255,255,0.6)' : `rgba(255,255,255,${0.6 * lay.flicker})`);
  g.addColorStop(1, lay.flicker == null ? 'rgba(255,255,255,0.12)' : `rgba(255,255,255,${0.12 * lay.flicker})`);
  ctx.fillStyle = g;
  ctx.fill();
  ctx.clip();
  for (let k = 0; k < 60; k++) {
    const t0 = R(), u = R(), v = R();
    const t = lay.drift == null ? t0 : (t0 + lay.drift) % 1;
    const [ex, ey] = at(u, v);
    glow(ctx, lens[0] + (ex - lens[0]) * t, lens[1] + (ey - lens[1]) * t, H * (0.04 + 0.12 * t), lay.drift == null ? 0.12 : 0.12 * Math.sin(Math.PI * t));
  }
  ctx.restore();
  const [sx, sy] = at(lay.starUV[0], lay.starUV[1]);
  star(ctx, sx, sy, H * 0.016);
  const [lx, ly, lz] = lay.lens;
  const [gx, gy] = c.pr([lx, yf, lz]);
  glow(ctx, gx, gy, H * 0.3, 0.75);
  fill(ctx, quad(c, [lx - 0.045, ly - 0.012, lz + 0.03], [1, 0, 0], [0, 1, 0], 0, 0, 0.05, 0.03), 0.06);
  fill(ctx, quad(c, [lx - 0.024, ly + 0.018, lz + 0.03], [1, 0, 0], [0, 1, 0], 0, 0, 0.008, yf - ly - 0.018), 0.06);
  glow(ctx, lens[0], lens[1], H * 0.05, 1);
  const [fx, fy] = c.pr([lay.fig[0], yf, lay.fig[1]]);
  figure(ctx, fx, fy, H * lay.figH, 0.03);
}

// A CSS cubic-bezier as y(x): solves x for the curve parameter by bisection.
function bezier(x1, y1, x2, y2) {
  const b = (s, p1, p2) => 3 * p1 * s * (1 - s) * (1 - s) + 3 * p2 * s * s * (1 - s) + s * s * s;
  return (u) => {
    let lo = 0, hi = 1;
    for (let k = 0; k < 30; k++) { const m = (lo + hi) / 2; if (b(m, x1, x2) < u) lo = m; else hi = m; }
    return b((lo + hi) / 2, y1, y2);
  };
}

// An easing graph standing on the ground: a bar per frame at equal time, the curve and its two handles on top, and a
// track in front where the same frames bunch at both ends. The figure waits at the start; the star is the end value.
function sceneEase(ctx, W, H, lay, R) {
  const f = H * lay.f, cx = lay.vx * W, cy = lay.vy * H, c = cam(f, cx, cy);
  const yb = lay.floorY, zFar = 60;
  ctx.fillStyle = gray(0.08);
  ctx.fillRect(0, 0, W, H);
  const [ox, oz] = lay.origin, [tx, tz] = lay.span, gh = lay.height;
  const P = (u, v) => c.pr([ox + tx * u, yb - gh * v, oz + tz * u]);
  const Q = (u) => c.pr([ox + tx * u, yb, oz + tz * u - lay.track]);
  const ease = bezier(...lay.bez);
  const [ex, ey] = P(1, 1), sx = ex, sy = ey - H * lay.starUp;
  glow(ctx, sx, sy, H * 0.9, 0.3);
  glow(ctx, sx, sy, H * 0.28, 0.24);
  for (let zz = 0.4; zz < zFar; zz *= 1.05) {
    const t = Math.min(1, Math.log(zz / 0.4) / Math.log(zFar / 0.4));
    fill(ctx, quad(c, [-30, yb, zz], [1, 0, 0], [0, 0, 1], 0, 0, 60, zz * 0.052), 0.1 + 0.3 * t * t);
  }
  const panel = (u0, v0, u1, v1, v) => fill(ctx, [P(u0, v0), P(u1, v0), P(u1, v1), P(u0, v1)], v);
  panel(-0.06, -0.02, 1.06, 1.14, 0.14);
  for (let k = 1; k < 4; k++) {
    panel(-0.06, k / 4 - 0.003, 1.06, k / 4 + 0.003, 0.24);
    panel(k / 4 - 0.002, -0.02, k / 4 + 0.002, 1.14, 0.24);
  }
  const n = lay.frames, bw = 0.3 / (n - 1);
  for (let i = 0; i < n; i++) {
    const u = i / (n - 1), v = ease(u);
    panel(u - bw, 0, u + bw, Math.max(v, 0.012), (0.42 + 0.4 * v) * (0.94 + 0.12 * R()));
  }
  const line = (pts, width, v) => {
    ctx.strokeStyle = gray(v);
    ctx.lineWidth = width;
    ctx.lineCap = 'round';
    ctx.beginPath();
    pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.stroke();
  };
  const knob = ([x, y], r, v, core) => {
    fill(ctx, [[x - r, y - r], [x + r, y - r], [x + r, y + r], [x - r, y + r]], v);
    if (core != null) fill(ctx, [[x - r * 0.45, y - r * 0.45], [x + r * 0.45, y - r * 0.45], [x + r * 0.45, y + r * 0.45], [x - r * 0.45, y + r * 0.45]], core);
  };
  const [x1, y1, x2, y2] = lay.bez;
  line([P(0, 0), P(x1, y1)], H * 0.004, 0.9);
  line([P(1, 1), P(x2, y2)], H * 0.004, 0.9);
  line(Array.from({ length: 97 }, (_, k) => P(k / 96, ease(k / 96))), H * 0.009, 1);
  knob(P(x1, y1), H * 0.013, 1, 0.1);
  knob(P(x2, y2), H * 0.013, 1, 0.1);
  for (let i = 0; i < n; i++) knob(P(i / (n - 1), ease(i / (n - 1))), H * 0.0055, 1);
  fill(ctx, [Q(-0.08), Q(1.08), c.pr([ox + tx * 1.08, yb, oz + tz * 1.08 - lay.track - 0.12]), c.pr([ox - tx * 0.08, yb, oz - tz * 0.08 - lay.track - 0.12])], 0.62);
  for (let i = 0; i < n; i++) {
    const u = ease(i / (n - 1)), d = 0.006;
    fill(ctx, [Q(u - d), Q(u + d), c.pr([ox + tx * (u + d), yb, oz + tz * (u + d) - lay.track - 0.12]), c.pr([ox + tx * (u - d), yb, oz + tz * (u - d) - lay.track - 0.12])], 1);
  }
  if (lay.run != null) {
    const u = lay.run, e = ease(u), [dx, dy] = P(u, e), [qx, qy] = Q(e);
    glow(ctx, qx, qy, H * 0.07, 0.8);
    glow(ctx, dx, dy, H * 0.08, 0.7);
    knob([dx, dy], H * 0.016, 1);
  }
  const [fx, fy] = c.pr([ox + tx * lay.figU, yb, oz + tz * lay.figU - lay.track - 0.06]);
  glow(ctx, fx, fy - H * lay.figH * 0.4, H * lay.figH * 2.4, 0.75);
  figure(ctx, fx, fy, H * lay.figH, 0.04);
  star(ctx, sx, sy, H * 0.015);
}

// A waveform standing along both sides of a road to the star, one channel each side, cut through by the loudness
// target rail; the bars are the sound, the reflection on the ground its tail.
function sceneWave(ctx, W, H, lay, R) {
  const f = H * lay.f, cx = lay.vx * W, cy = lay.vy * H, c = cam(f, cx, cy);
  const yb = lay.floorY, zFar = 60, zEnd = 40;
  ctx.fillStyle = gray(0.06);
  ctx.fillRect(0, 0, W, H);
  glow(ctx, cx, cy, H * 0.85, 0.38);
  for (let zz = 0.4; zz < zFar; zz *= 1.05) {
    const t = Math.min(1, Math.log(zz / 0.4) / Math.log(zFar / 0.4));
    fill(ctx, quad(c, [-30, yb, zz], [1, 0, 0], [0, 0, 1], 0, 0, 60, zz * 0.052), 0.08 + 0.3 * t * t);
  }
  for (let z = 0.3; z < zFar; z *= 1.04) {
    const t = Math.min(1, (z - 0.3) / 3.2);
    fill(ctx, quad(c, [-lay.road, yb, z], [1, 0, 0], [0, 0, 1], 0, 0, 2 * lay.road, z * 0.042), 0.5 + 0.45 * t);
  }
  const env = (z) => 0.62 + 0.38 * Math.sin(lay.phase + Math.log(z) * lay.beat);
  const channel = (x, zMin, base) => {
    const zs = [];
    for (let z = zMin; z < zEnd; z *= lay.step) zs.push(z);
    const amps = zs.map((z) => Math.min(1.25, env(z) * (0.5 + 0.7 * R())));
    for (let k = zs.length - 1; k >= 0; k--) {
      const z = zs[k], dz = z * (lay.step - 1) * lay.fillZ, h = amps[k] * lay.amp;
      const t = Math.log(z / zMin) / Math.log(zEnd / zMin);
      fill(ctx, quad(c, [x, yb - h, z], [0, 0, 1], [0, 1, 0], 0, 0, dz, h), base * (0.82 + 0.18 * t));
      fill(ctx, quad(c, [x, yb, z], [0, 0, 1], [0, 1, 0], 0, 0, dz, h * 0.4), base * 0.32);
    }
    const yt = yb - lay.target * lay.amp;
    fill(ctx, [c.pr([x, yt - 0.008, zMin]), c.pr([x, yt - 0.008, zEnd]), c.pr([x, yt + 0.008, zEnd]), c.pr([x, yt + 0.008, zMin])], 1);
  };
  channel(-lay.left[0], lay.left[1], lay.left[2]);
  channel(lay.right[0], lay.right[1], lay.right[2]);
  const [fx, fy] = c.pr([0.02, yb, lay.figZ]);
  figure(ctx, fx, fy, H * lay.figH, 0.04);
  star(ctx, cx, cy - H * 0.03, H * 0.016);
}

const SCENES = { lanes: sceneLanes, pages: scenePages, strip: sceneStrip, stair: sceneStair, search: sceneSearch, catalog: sceneCatalog, cinema: sceneCinema, ease: sceneEase, wave: sceneWave };

// Flattens the art toward the sky value under the text, feathered, so copy sits on a calm ground.
function calm(L, W, H, rects, value, feather) {
  for (const r of rects) {
    const x0 = Math.max(0, Math.floor(r.x - feather)), x1 = Math.min(W, Math.ceil(r.x + r.w + feather));
    const y0 = Math.max(0, Math.floor(r.y - feather)), y1 = Math.min(H, Math.ceil(r.y + r.h + feather));
    for (let y = y0; y < y1; y++) {
      const dy = Math.max(r.y - y, 0, y - (r.y + r.h));
      for (let x = x0; x < x1; x++) {
        const dx = Math.max(r.x - x, 0, x - (r.x + r.w));
        const d = Math.hypot(dx, dy) / feather;
        if (d >= 1) continue;
        const m = 1 - d * d * (3 - 2 * d);
        const i = y * W + x;
        L[i] = L[i] * (1 - m) + value * m;
      }
    }
  }
}

// phase (radians), when given, turns the coarse ink mottle between two fields so a loop's texture breathes without flicker.
function print(img, L, W, H, ink, seed, phase) {
  const B = bayer8(), d = img.data, I = INKS[ink];
  const k1 = Math.cos(phase ?? 0), k2 = Math.sin(phase ?? 0);
  const at = (x, y) => L[Math.min(H - 1, Math.max(0, y)) * W + Math.min(W - 1, Math.max(0, x))];
  const set = (i, c, j) => { d[i] = c[0] + j; d[i + 1] = c[1] + j; d[i + 2] = c[2] + j; d[i + 3] = 255; };
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = y * W + x, o = i * 4;
      const n = phase == null
        ? (hash(x, y, seed) - 0.5) * 0.2 + (vnoise(x, y, 70, seed + 1) - 0.5) * 0.16 + (vnoise(x, y, 6, seed + 2) - 0.5) * 0.1
        : (hash(x, y, seed) - 0.5) * 0.2 + (k1 * (vnoise(x, y, 70, seed + 1) - 0.5) + k2 * (vnoise(x, y, 70, seed + 11) - 0.5)) * 0.16 + (vnoise(x, y, 6, seed + 2) - 0.5) * 0.1;
      const m1 = B[((y >> 1) & 7) * 8 + ((x >> 1) & 7)], m2 = B[(x & 7) * 8 + (y & 7)];
      const dust = hash(x, y, seed + 7), j = Math.round((hash(x, y, seed + 9) - 0.5) * 8);
      if (ink === 'a') {
        const l1 = L[i] + n, l2 = at(x - 3, y - 2) + n;
        let hits = ((l1 - 0.46) / 0.26 < m1 ? 1 : 0) + ((l2 - 0.16) / 0.2 < m2 ? 1 : 0);
        if (dust < 0.0035) hits = 0;
        else if (dust > 0.9985) hits = Math.max(hits, 1);
        set(o, hits === 0 ? I.paper : hits === 1 ? I.mid : I.deep, hits === 0 ? j : 0);
      } else {
        const l1 = L[i] + n, l2 = at(x - 2, y - 1) + n;
        const blue = (l1 - 0.28) / 0.24 > m1, top = (l2 - 0.72) / 0.18 > m2;
        if (dust < 0.0009) set(o, I.top, 0);
        else if (top) set(o, I.top, 0);
        else if (blue && dust > 0.012) set(o, I.mid, 0);
        else set(o, I.paper, 0);
      }
    }
  }
}

export function paint(canvas, { scene, ink, lay, rects, seed = 7, phase }) {
  const W = canvas.width, H = canvas.height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  SCENES[scene](ctx, W, H, lay, rng(seed));
  const src = ctx.getImageData(0, 0, W, H).data;
  const L = new Float32Array(W * H);
  for (let i = 0; i < L.length; i++) L[i] = src[i * 4] / 255;
  if (lay.calm != null) calm(L, W, H, rects, lay.calm, lay.feather * H);
  const img = ctx.createImageData(W, H);
  print(img, L, W, H, ink, seed, phase);
  ctx.putImageData(img, 0, 0);
}
