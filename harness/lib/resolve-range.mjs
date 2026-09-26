import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseStoryboard, timeline } from '../author/storyboard-parse.mjs';

const GRID = 1 / 60; // the frame-locked clock tempo.js itself snaps to
const snap = (v) => Math.round(v / GRID) * GRID;

function storyboardPath(filmPath) {
  return filmPath.replace(/\.json$/, '.storyboard.md');
}

function readFilm(filmPath) {
  const data = JSON.parse(fs.readFileSync(filmPath, 'utf8'));
  const tempo = typeof data.tempo === 'number' ? data.tempo : 1;
  const inv = 1 / tempo;
  const duration = typeof data.duration === 'number' ? snap(data.duration * inv) : Infinity;
  return { inv, duration };
}

function loadBeats(filmPath) {
  const sbPath = storyboardPath(filmPath);
  const src = fs.readFileSync(sbPath, 'utf8');
  return timeline(parseStoryboard(src)).beats;
}

function findBeat(beats, ref) {
  const asNum = Number(ref);
  if (Number.isInteger(asNum) && asNum >= 1 && asNum <= beats.length) return beats[asNum - 1];
  const needle = String(ref).trim().toLowerCase();
  const hit = beats.find((b) => b.name.toLowerCase().includes(needle));
  if (!hit) {
    throw new Error(`no beat matches "${ref}" (this film has ${beats.length}: ${beats.map((b) => b.name).join(', ')})`);
  }
  return hit;
}

function clampRange(center0, center1, pad, duration) {
  const from = Math.max(0, center0 - pad);
  const to = Math.min(duration, center1 + pad);
  if (from >= to) throw new Error(`resolved range ${from.toFixed(2)}-${to.toFixed(2)}s is empty after clamping to the film's duration (${duration.toFixed(2)}s)`);
  return { from, to };
}

/** resolveBeat(filmPath, ref, pad=0.4) -> { from, to }, final film seconds, padded and clamped. */
export function resolveBeat(filmPath, ref, pad = 0.4) {
  const { inv, duration } = readFilm(filmPath);
  const beat = findBeat(loadBeats(filmPath), ref);
  const start = snap((beat.start ?? 0) * inv);
  const end = snap((beat.end ?? start) * inv);
  return clampRange(start, end, pad, duration);
}

/** resolveJoin(filmPath, n, pad=0.8) -> the seam between beat n and beat n+1, padded. */
export function resolveJoin(filmPath, n, pad = 0.8) {
  const { inv, duration } = readFilm(filmPath);
  const beats = loadBeats(filmPath);
  const i = Number(n);
  if (!Number.isInteger(i) || i < 1 || i >= beats.length) {
    throw new Error(`JOIN=${n}: needs a beat number from 1 to ${beats.length - 1} (the join right after that beat)`);
  }
  const seam = snap((beats[i - 1].end ?? beats[i].start ?? 0) * inv);
  return clampRange(seam, seam, pad, duration);
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const [filmPath, kind, ref] = process.argv.slice(2);
  if (!filmPath || !kind || ref === undefined) {
    console.error('usage: node harness/lib/resolve-range.mjs <film.json> beat|join <ref>');
    process.exit(2);
  }
  try {
    const r = kind === 'join' ? resolveJoin(filmPath, ref) : resolveBeat(filmPath, ref);
    console.log(`${r.from} ${r.to}`);
  } catch (e) {
    console.error(`✗ ${e.message}`);
    process.exit(1);
  }
}
