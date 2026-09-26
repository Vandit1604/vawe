import fs from 'node:fs';
import path from 'node:path';
import { resolveCoords } from '../../core/engine/boot.js';
import { frameOf } from '../../core/layout/safe.js';

function findBySrc(layers, rel) {
  for (const L of layers || []) {
    if (!L || typeof L !== 'object') continue;
    if (L.src === rel) return L;
    if (L.children) { const c = findBySrc(L.children, rel); if (c) return c; }
  }
  return null;
}

/** findFilmLayerBox(root, fragPath, filmArg) -> {film, id, x, y, w, h, W, H} for the html layer that
 * names this fragment as its `src`, resolved to real canvas pixels, or null when no film uses it yet.
 * `filmArg` (D=<film>) names the film explicitly; otherwise every .json beside the fragment is scanned. */
export function findFilmLayerBox(root, fragPath, filmArg) {
  const rel = path.relative(root, path.resolve(fragPath)).split(path.sep).join('/');
  const dir = path.dirname(path.resolve(fragPath));
  const candidates = filmArg
    ? [path.resolve(filmArg)]
    : fs.readdirSync(dir).filter((f) => f.endsWith('.json')).map((f) => path.join(dir, f));
  for (const film of candidates) {
    if (!fs.existsSync(film)) continue;
    let data;
    try { data = JSON.parse(fs.readFileSync(film, 'utf8')); } catch { continue; }
    if (!data || data.module !== 'scene' || !Array.isArray(data.layers)) continue;
    const found = findBySrc(data.layers, rel);
    if (!found) continue;
    const aspectKey = data.aspect || ((data.orientation === 'landscape' || data.orient === 'landscape') ? '16:9' : '9:16');
    const frame = frameOf(data, aspectKey);
    resolveCoords(data, frame.W, frame.H, frame.safe, frame); // mutates `found` in place
    return { film: path.relative(root, film), id: found.id || null,
      x: found.x || 0, y: found.y || 0, w: found.w || frame.W, h: found.h || frame.H, W: frame.W, H: frame.H };
  }
  return null;
}
