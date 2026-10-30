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
function laneFace(ctx, c, R, O, U, zn, zf, E, base, clipV) {
  const V = [0, 0, 1];
  const ph = 0.25 + R() * 0.6 * E;
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
      for (const [a, e] of cut) if (e - a > 0.01) fill(ctx, quad(c, O, U, V, a, top, e, bot), clipV * (0.7 + 0.6 * R()));
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
  const yb = 0.5, wb = 0.06, zb = 9;
  const sx = cx, sy = cy + (f * yb) / zb - H * 0.05;
  glow(ctx, sx, sy, H * 0.6, 0.3);
  const towers = lay.towers;
  for (const t of towers) {
    const xi = (t.o[0] * H * t.zn) / f, yi = (t.o[1] * H * t.zn) / f;
    const O = [xi, yi, 0];
    laneFace(ctx, c, R, O, [0, t.q[1], 0], t.zn, t.zf, 3, 0.62, 0.12);
    laneFace(ctx, c, R, O, [t.q[0], 0, 0], t.zn, t.zf, 3, 0.88, 0.22);
  }
  star(ctx, sx, sy, H * 0.012);
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
  const [sx, sy] = c.pr([0, 0, zg]);
  star(ctx, sx, sy, H * 0.009);
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
  let z = zPage + 0.05;
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
  star(ctx, cx, cy - H * 0.04, H * 0.017);
}

const SCENES = { lanes: sceneLanes, pages: scenePages, strip: sceneStrip };

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

function print(img, L, W, H, ink, seed) {
  const B = bayer8(), d = img.data, I = INKS[ink];
  const at = (x, y) => L[Math.min(H - 1, Math.max(0, y)) * W + Math.min(W - 1, Math.max(0, x))];
  const set = (i, c, j) => { d[i] = c[0] + j; d[i + 1] = c[1] + j; d[i + 2] = c[2] + j; d[i + 3] = 255; };
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = y * W + x, o = i * 4;
      const n = (hash(x, y, seed) - 0.5) * 0.2 + (vnoise(x, y, 70, seed + 1) - 0.5) * 0.16 + (vnoise(x, y, 6, seed + 2) - 0.5) * 0.1;
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

export function paint(canvas, { scene, ink, lay, rects, seed = 7 }) {
  const W = canvas.width, H = canvas.height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  SCENES[scene](ctx, W, H, lay, rng(seed));
  const src = ctx.getImageData(0, 0, W, H).data;
  const L = new Float32Array(W * H);
  for (let i = 0; i < L.length; i++) L[i] = src[i * 4] / 255;
  if (lay.calm != null) calm(L, W, H, rects, lay.calm, lay.feather * H);
  const img = ctx.createImageData(W, H);
  print(img, L, W, H, ink, seed);
  ctx.putImageData(img, 0, 0);
}
