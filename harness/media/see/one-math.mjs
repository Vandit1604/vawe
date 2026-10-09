// Pure parts of `vawe see`: shots with the flashes taken out, bursts from tracked elements, camera in words, sharpness and grain of a frame.
// No I/O and no heavy imports.

const round = (n, d = 3) => +n.toFixed(d);

/** The first problem in the arguments of see, or null. Pure. */
export function seeProblem({ at, atB, from, to, vs }) {
  const bad = (v) => v !== undefined && !(Number.isFinite(Number(v)) && Number(v) >= 0);
  for (const [name, v] of [['--at', at], ['--at-b', atB], ['--from', from], ['--to', to]]) if (bad(v)) return `${name} is not a number of seconds: "${v}"`;
  if (atB !== undefined && !vs) return '--at-b needs --vs <b>';
  if (atB !== undefined && at === undefined) return '--at-b needs --at <s>';
  if (from !== undefined && to !== undefined && Number(to) <= Number(from)) return '--to must be after --from';
  return null;
}
const SAME_PICTURE_DE = 15;
const FLASH_EDGE_FRAMES = 1;

/** The seconds of film in a number of frames, three places. Pure. */
export const secs = (frames, fps) => round(frames / fps);

/**
 * Splits the spec's cuts by the flash candidates of `vawe look` (each { frame, frames, neutral }). A candidate is a flash when the picture before and
 * after it is the same shot (the dominant Lab colours of the two neighbouring shots differ by under 15) or its own colour is neutral white (a white-out);
 * a short coloured shot between two different shots is a shot. The cuts within one frame of a flash's first frame or of the frame after its last are its
 * edges; a white-out that hides a cut keeps its last edge as that cut. `shotLab(frame)` is the dominant Lab colour of the spec shot that holds `frame`,
 * or null. Returns { cuts, flashEdges, flashes } with each flash carrying `sameShot`, `dE` and the frames of its `edgeFrames`. Pure.
 */
export function separateFlashes(cuts, candidates, shotLab) {
  const judged = candidates.map((f) => {
    const before = shotLab(f.frame - 1 - FLASH_EDGE_FRAMES), after = shotLab(f.frame + f.frames + FLASH_EDGE_FRAMES);
    const dE = before && after ? Math.hypot(before[0] - after[0], before[1] - after[1], before[2] - after[2]) : null;
    const sameShot = dE === null ? null : dE < SAME_PICTURE_DE;
    return { ...f, sameShot, dE: dE === null ? null : round(dE, 1), accepted: sameShot === true || Boolean(f.neutral) };
  });
  const flashes = judged.filter((f) => f.accepted);
  const owner = (c) => flashes.findIndex((f) => c.frame >= f.frame - FLASH_EDGE_FRAMES && c.frame <= f.frame + f.frames + FLASH_EDGE_FRAMES);
  const kept = [], edges = [];
  for (const c of cuts) (owner(c) >= 0 ? edges : kept).push(c);
  flashes.forEach((f, i) => {
    const mine = edges.filter((c) => owner(c) === i);
    if (f.sameShot === false && mine.length) { const last = mine.at(-1); edges.splice(edges.indexOf(last), 1); kept.push(last); }
    f.edgeFrames = edges.filter((c) => owner(c) === i).map((c) => c.frame);
  });
  return { cuts: kept.sort((a, b) => a.frame - b.frame), flashEdges: edges, flashes };
}

/**
 * Shots [{ f0, f1, ... }] of the spec joined across the flashes that sit inside one shot: a shot that lies wholly inside a flash is dropped
 * and the shots either side of a same-shot flash become one. `flashes` is the output of separateFlashes. Pure.
 */
export function shotsWithoutFlashes(shots, flashes) {
  const inFlash = (s) => flashes.some((f) => s.f0 >= f.frame - FLASH_EDGE_FRAMES && s.f1 <= f.frame + f.frames + FLASH_EDGE_FRAMES + 1);
  const kept = shots.filter((s) => !inFlash(s));
  const out = [];
  for (const s of kept) {
    const prev = out.at(-1);
    const bridge = prev && flashes.find((f) => f.sameShot && f.frame >= prev.f1 - FLASH_EDGE_FRAMES - 1 && f.frame + f.frames <= s.f0 + FLASH_EDGE_FRAMES + 1);
    if (bridge) { prev.f1 = s.f1; prev.parts.push(s.index); prev.flashes.push(bridge.at); prev.elements = [...prev.elements, ...s.elements]; prev.text = [...prev.text, ...s.text]; prev.hits = [...prev.hits, ...s.hits]; continue; }
    out.push({ ...s, parts: [s.index], flashes: [] });
  }
  return out;
}

/** The energy series [{ t, v }] with the samples under each flash (its edges included) set to zero: a flash is an exposure event, not motion. Pure. */
export const maskFlashes = (series, flashes, fps) => series.map((p) => (flashes.some((f) => p.t >= (f.frame - 0.5) / fps && p.t <= (f.frame + f.frames + 1.5) / fps) ? { t: p.t, v: 0 } : p));

/** The moves of a shot's tracked elements grouped into bursts: moves whose start is within `gap` seconds of the running end join. [{ t0, t1, elements }]. Pure. */
export function burstsOfMoves(moves, gap = 0.17) {
  const sorted = moves.filter((m) => m.start != null && m.settle != null).sort((a, b) => a.start - b.start);
  const out = [];
  for (const m of sorted) {
    const last = out.at(-1);
    if (last && m.start - last.t1 < gap) { last.t1 = Math.max(last.t1, m.settle); last.elements.push(m.id); } else out.push({ t0: m.start, t1: m.settle, elements: [m.id] });
  }
  return out.map((b) => ({ ...b, t0: round(b.t0), t1: round(b.t1) }));
}

/** The camera of a shot in words from the spec's camera block: zoom, pan, how fast. Pure. */
export function cameraWords(c, fps) {
  if (!c) return 'unknown';
  const parts = [];
  if (Math.abs(c.zoomTotal - 1) >= 0.02) parts.push(`${c.zoomTotal > 1 ? 'push in' : 'pull out'} x${c.zoomTotal} (peak ${round(Math.abs(c.peakZoomPerFrame) * fps * 100, 0)}% per s)`);
  if (Math.hypot(c.panTotalPx[0], c.panTotalPx[1]) >= 8) {
    const [x, y] = c.panTotalPx;
    const dir = Math.abs(x) >= Math.abs(y) ? (x > 0 ? 'right' : 'left') : (y > 0 ? 'down' : 'up');
    parts.push(`pan ${dir} ${Math.round(Math.hypot(x, y))} px (peak ${Math.round(c.peakPanPxPerFrame * fps)} px/s)`);
  }
  if (c.rotation && Math.abs(c.rotation.total) >= 0.5) parts.push(`rotate ${c.rotation.total > 0 ? 'clockwise' : 'anticlockwise'} ${Math.abs(c.rotation.total)} deg`);
  return parts.length ? parts.join(', ') : 'static';
}

/**
 * Sharpness map of a luma plane: the mean absolute Laplacian in a gw x gh grid of cells, and the ratio of the sharpest third of the cells to the
 * softest third. A ratio near 1 is an even focus; a high one is a shallow depth of field or a blurred region. Pure.
 */
export function sharpnessMap(luma, w, h, gw = 4, gh = 3) {
  const cell = new Float64Array(gw * gh), n = new Float64Array(gw * gh);
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      const lap = Math.abs(4 * luma[i] - luma[i - 1] - luma[i + 1] - luma[i - w] - luma[i + w]);
      const k = Math.min(gh - 1, Math.floor((y * gh) / h)) * gw + Math.min(gw - 1, Math.floor((x * gw) / w));
      cell[k] += lap; n[k]++;
    }
  }
  const grid = Array.from(cell, (s, i) => round(s / n[i], 2));
  const sorted = [...grid].sort((a, b) => a - b);
  const third = Math.max(1, Math.floor(sorted.length / 3));
  const soft = sorted.slice(0, third).reduce((s, v) => s + v, 0) / third, sharp = sorted.slice(-third).reduce((s, v) => s + v, 0) / third;
  return { grid, mean: round(grid.reduce((s, v) => s + v, 0) / grid.length, 2), ratio: round(sharp / Math.max(soft, 0.05), 1) };
}

/**
 * Grain from two luma planes of one still moment: the robust spread (1.4826 times the MAD, in levels of 0..255) of the frame difference over
 * the flat, unchanged tiles, divided by root 2 for one frame. Null when fewer than 20 tiles are flat in both frames. Pure.
 */
export function grainOf(a, b, w, h, tile = 8) {
  const spreads = [];
  for (let y = 0; y + tile <= h; y += tile) {
    for (let x = 0; x + tile <= w; x += tile) {
      let lo = 255, hi = 0, mean = 0;
      const d = [];
      for (let j = 0; j < tile; j++) for (let i = 0; i < tile; i++) {
        const p = (y + j) * w + x + i;
        lo = Math.min(lo, a[p], b[p]); hi = Math.max(hi, a[p], b[p]); d.push(b[p] - a[p]); mean += d.at(-1);
      }
      if (hi - lo > 40) continue;
      mean /= d.length;
      const med = d.map((v) => Math.abs(v - mean)).sort((p, q) => p - q)[d.length >> 1];
      spreads.push(1.4826 * med);
    }
  }
  if (spreads.length < 20) return null;
  spreads.sort((p, q) => p - q);
  return { sigma: round(spreads[spreads.length >> 1] / Math.SQRT2, 2), tiles: spreads.length };
}
