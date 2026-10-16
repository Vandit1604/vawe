// harness/lib/ref-measure/particle-field.mjs: a field of many small moving sprites (rain, dust, sparks, confetti) read as one thing:
// how many there are, which way and how fast the field moves, and how far it spreads. The region tracker follows large parts; on a
// field it followed the ground behind it. Method: sprites are the small compact spots that differ from their local mean, found in
// every frame; the field move is the most common displacement from the sprites of one frame to those of the next.

export const FIELD_W = 360;
export const FIELD_FPS = 15;
export const FIELD_SECONDS = 6;
export const FIELD_MIN = 15;
const BLUR_R = 6;
const DEV_THR = 24;
const MAX_SIDE = 40;
const MAX_AREA = 300;
const STILL_PX = 1;
const MIN_AREA = 2;
const MATCH_REACH = 0.12;
const MIN_COHERENCE = 0.1;
const DIRECTIONS = ['right', 'down-right', 'down', 'down-left', 'left', 'up-left', 'up', 'up-right'];

const median = (a) => (a.length ? [...a].sort((x, y) => x - y)[Math.floor(a.length / 2)] : 0);
const percentile = (a, p) => (a.length ? [...a].sort((x, y) => x - y)[Math.min(a.length - 1, Math.floor(p * a.length))] : 0);

/** The compass word of a screen vector (y grows down). Pure. */
export const directionWord = (vx, vy) => DIRECTIONS[(Math.round(Math.atan2(vy, vx) / (Math.PI / 4)) + 8) % 8];

/** 1 where a pixel differs from the mean of its neighbourhood by more than DEV_THR, else 0. Pure. */
function deviationMask(g, w, h) {
  const ii = new Int32Array((w + 1) * (h + 1));
  for (let y = 0; y < h; y++) {
    let row = 0;
    for (let x = 0; x < w; x++) { row += g[y * w + x]; ii[(y + 1) * (w + 1) + x + 1] = ii[y * (w + 1) + x + 1] + row; }
  }
  const mask = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) {
    const y0 = Math.max(0, y - BLUR_R), y1 = Math.min(h, y + BLUR_R + 1);
    for (let x = 0; x < w; x++) {
      const x0 = Math.max(0, x - BLUR_R), x1 = Math.min(w, x + BLUR_R + 1);
      const sum = ii[y1 * (w + 1) + x1] - ii[y0 * (w + 1) + x1] - ii[y1 * (w + 1) + x0] + ii[y0 * (w + 1) + x0];
      if (Math.abs(g[y * w + x] - sum / ((x1 - x0) * (y1 - y0))) > DEV_THR) mask[y * w + x] = 1;
    }
  }
  return mask;
}

/** The unvisited mask pixels next to pixel i (8-connected); marks them visited. */
function unvisitedAround(mask, i, w, h) {
  const x = i % w, y = (i - x) / w, found = [];
  for (let k = 0; k < 9; k++) {
    const nx = x + (k % 3) - 1, ny = y + Math.floor(k / 3) - 1, j = ny * w + nx;
    if (nx < 0 || nx >= w || ny < 0 || ny >= h || mask[j] !== 1) continue;
    mask[j] = 2;
    found.push(j);
  }
  return found;
}

/** The connected spots of a mask as { area, x, y, width, height }; the mask is consumed. */
function spotsOf(mask, w, h) {
  const out = [];
  for (let s = 0; s < mask.length; s++) {
    if (mask[s] !== 1) continue;
    const spot = { area: 0, sx: 0, sy: 0, minX: w, maxX: 0, minY: h, maxY: 0 };
    mask[s] = 2;
    for (const stack = [s]; stack.length;) {
      const i = stack.pop(), x = i % w, y = (i - x) / w;
      spot.area++; spot.sx += x; spot.sy += y;
      spot.minX = Math.min(spot.minX, x); spot.maxX = Math.max(spot.maxX, x); spot.minY = Math.min(spot.minY, y); spot.maxY = Math.max(spot.maxY, y);
      stack.push(...unvisitedAround(mask, i, w, h));
    }
    out.push({ area: spot.area, x: spot.sx / spot.area, y: spot.sy / spot.area, width: spot.maxX - spot.minX, height: spot.maxY - spot.minY });
  }
  return out;
}

/** The sprites of one gray frame: [{ x, y }] centres of compact spots that differ from their local mean. Pure. */
export const spritesOf = (g, w, h) => spotsOf(deviationMask(g, w, h), w, h)
  .filter((p) => p.area >= MIN_AREA && p.area <= MAX_AREA && p.width < MAX_SIDE && p.height < MAX_SIDE)
  .map((p) => ({ x: p.x, y: p.y }));

/**
 * The most common displacement { dx, dy, share, still } from the sprites of `a` to those of `b` within `reach` px, not counting a shift of STILL_PX or less;
 * `share` is the part of `a` with a partner at that shift and `still` the part with a partner that did not move. Pure.
 */
export function commonShift(a, b, reach) {
  if (!a.length || !b.length) return null;
  const side = 2 * reach + 1;
  const votes = new Int32Array(side * side);
  let still = 0;
  for (const p of a) for (const q of b) {
    const dx = Math.round(q.x - p.x), dy = Math.round(q.y - p.y);
    if (Math.abs(dx) > reach || Math.abs(dy) > reach) continue;
    if (Math.abs(dx) <= STILL_PX && Math.abs(dy) <= STILL_PX) { if (dx === 0 && dy === 0) still++; continue; }
    votes[(dy + reach) * side + dx + reach]++;
  }
  let best = 0, at = 0, bestRaw = 0;
  for (let y = 1; y < side - 1; y++) for (let x = 1; x < side - 1; x++) {
    let sum = 0;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) sum += votes[(y + dy) * side + x + dx];
    if (sum > best || (sum === best && votes[y * side + x] > bestRaw)) { best = sum; at = y * side + x; bestRaw = votes[y * side + x]; }
  }
  return { dx: (at % side) - reach, dy: Math.floor(at / side) - reach, share: Math.min(1, best / a.length), still: Math.min(1, still / a.length) };
}

/**
 * The field in decoded gray frames [Uint8Array] of w by h at `fps`: { count: { median, min, max }, speed (frame heights per second),
 * direction (a compass word, or null when the moving sprites share no direction), coherence (the part of the sprites that move with the field, 0 to 1),
 * still (the part that sit where they were the frame before), spread: { x, y } (the share of the frame
 * width and height holding the middle 90% of the sprites) }; null when the median frame has fewer than FIELD_MIN sprites. Pure.
 */
export function readParticleField(frames, w, h, fps) {
  const sprites = frames.map((g) => spritesOf(g, w, h));
  const counts = sprites.map((s) => s.length);
  if (median(counts) < FIELD_MIN) return null;
  const shifts = [];
  for (let i = 1; i < sprites.length; i++) {
    const s = commonShift(sprites[i - 1], sprites[i], Math.round(MATCH_REACH * h));
    if (s) shifts.push(s);
  }
  const dx = median(shifts.map((s) => s.dx)), dy = median(shifts.map((s) => s.dy));
  const coherence = +median(shifts.map((s) => s.share)).toFixed(2);
  const still = +median(shifts.map((s) => s.still)).toFixed(2);
  const all = sprites.flat();
  const share = (key, size) => +((percentile(all.map((p) => p[key]), 0.95) - percentile(all.map((p) => p[key]), 0.05)) / size).toFixed(2);
  return {
    count: { median: median(counts), min: Math.min(...counts), max: Math.max(...counts) },
    speed: +((Math.hypot(dx, dy) * fps) / h).toFixed(2),
    direction: coherence >= MIN_COHERENCE && (dx || dy) ? directionWord(dx, dy) : null,
    coherence,
    still,
    spread: { x: share('x', w), y: share('y', h) },
  };
}
