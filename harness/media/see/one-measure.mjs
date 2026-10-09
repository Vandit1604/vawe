// The measures of `vawe see` for one film, as one object (see.json): structure, motion, look, type and sound. Every number comes from the
// owner of that measure: ref-spec (cuts, elements, camera, colour, ground, eye, words, audio hits), look (light and texture), motion-math
// (bursts of energy), the page (timeline, velocity). This file joins them per shot; it adds only what no owner has: flashes as events, grain, focus.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { cutAdvice } from '../../lib/board.mjs';
import { timelineOf } from '../../lib/timeline.mjs';
import { motionDeltaSeries } from '../shot-detect.mjs';
import { refSpec } from '../ref-spec.mjs';
import { measureFile, renderMixCached } from '../page-audio.mjs';
import { readTimeline } from '../timeline.mjs';
import { openPage, readPageMeta, resolveFrame } from '../render-page.mjs';
import { frameRgb } from './frame.mjs';
import { edgesAt, lumaSeries } from './look.mjs';
import { bloomSigma, flashProfile, hueOf, summarise } from './look-math.mjs';
import { noiseOf, readMotion } from './motion-math.mjs';
import { burstsOfMoves, cameraWords, grainOf, layoutTilt, maskFlashes, separateFlashes, sharpnessMap, shotsWithoutFlashes } from './one-math.mjs';
import { readVelocity } from './velocity.mjs';
import { stripWindow } from './strip-math.mjs';

const round = (n, d = 3) => (n == null ? null : +n.toFixed(d));
const GRAIN_W = 960, GRAIN_H = 540;
const MAX_LOOK_SHOTS = 80;
const MIN_HIT = 0.1;
const SOLID_STEP = 24;
const SOLID_SHARE = 0.004;

/** The sRGB hex of a Lab colour (D65). */
export function labToHex([L, a, b]) {
  const fy = (L + 16) / 116, fx = fy + a / 500, fz = fy - b / 200;
  const inv = (t) => (t ** 3 > 216 / 24389 ? t ** 3 : (116 * t - 16) / (24389 / 27));
  const X = 0.95047 * inv(fx), Y = inv(fy), Z = 1.08883 * inv(fz);
  const lin = [3.2404542 * X - 1.5371385 * Y - 0.4985314 * Z, -0.969266 * X + 1.8760108 * Y + 0.041556 * Z, 0.0556434 * X - 0.2040259 * Y + 1.0572252 * Z];
  const enc = (c) => Math.round(255 * Math.min(1, Math.max(0, c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055)));
  return `#${lin.map((c) => enc(c).toString(16).padStart(2, '0')).join('')}`;
}

function grayFrames(video, t, n, w, h) {
  const r = spawnSync('ffmpeg', ['-v', 'error', '-ss', Math.max(0, t).toFixed(3), '-i', video, '-frames:v', String(n), '-vf', `scale=${w}:${h}:flags=area,format=gray`, '-f', 'rawvideo', '-'], { maxBuffer: 1 << 26 });
  if (r.status !== 0 || r.stdout.length < w * h * n) return null;
  return Array.from({ length: n }, (_, i) => new Uint8Array(r.stdout.subarray(i * w * h, (i + 1) * w * h)));
}

/** The second at which a shot shows its settled picture: a beat after its last move lands, else its middle. */
export function keyTime(shot, fps) {
  const frame = 1 / fps;
  const settled = Math.max(0, ...shot.moves.map((m) => m.settle ?? 0), shot.energy?.moving ? shot.energy.settle ?? 0 : 0);
  const t = settled > shot.start ? settled + 0.05 : (shot.start + shot.end) / 2;
  return round(Math.min(Math.max(t, shot.start), Math.max(shot.start, shot.end - 1.5 * frame)), 3);
}

/** The peak speed of a tracked element in the units of its rows (px per second): the largest two-frame central difference of the refined positions. */
export function peakSpeed(rows, fps) {
  let peak = 0;
  for (let i = 1; i + 1 < rows.length; i++) peak = Math.max(peak, Math.hypot(rows[i + 1].x - rows[i - 1].x, rows[i + 1].y - rows[i - 1].y) * (fps / (rows[i + 1].f - rows[i - 1].f)));
  return peak;
}

/** The moves of a spec shot's elements, lengths in pixels of a 1080-high frame so that films of any size compare. */
function movesOf(shot, fps, frameH) {
  const k = 1080 / frameH;
  return shot.elements.map((e) => {
    const px = peakSpeed(e.rows, fps) * k;
    const start = Math.max(shot.f0 / fps, e.start?.t ?? e.f0 / fps), settle = Math.min(shot.f1 / fps, e.land?.t ?? e.f1 / fps);
    const at = (p) => p.map((v) => round(v * k, 1));
    return {
      id: e.id, axis: e.axis, from: at(e.from), to: at(e.to), travelPx: Math.round(Math.hypot(e.to[0] - e.from[0], e.to[1] - e.from[1]) * k), size: at(e.size),
      start: round(start), settle: round(settle), peakPxPerS: Math.round(px), peakHeightsPerS: round(px / 1080, 3),
      overshootPct: e.overshoot == null ? null : round((e.overshoot - 1) * 100, 1),
      ease: e.easing?.class ?? null, css: e.easing?.css ?? null, durMs: e.easing?.durMs ?? null, confidence: e.confidence, blur: e.blur ? { dir: e.blur.dir, minSharp: e.blur.minSharp } : null,
      solid: e.solid, color: e.color,
    };
  });
}

function structureOf(spec, shots, cuts, flashes, world, fps) {
  const lengths = shots.map((s) => s.length);
  const sorted = [...lengths].sort((a, b) => a - b);
  const median = sorted.length ? sorted[sorted.length >> 1] : 0;
  return {
    shots: shots.map((s) => ({ index: s.index, id: s.id, start: s.start, end: s.end, length: s.length, frames: s.frames, cutIn: s.cutIn, flashes: s.flashes, parts: s.parts })),
    cuts: cuts.map((c) => ({ at: c.t, frame: c.frame, type: c.transition.type, dir: c.transition.dir, frames: c.transition.frames, confidence: c.transition.confidence, hitLead: c.hitLead, beatLead: c.beatLead })),
    flashEdges: flashes.flashEdges.map((c) => ({ at: c.t, frame: c.frame })),
    rhythm: { lengths, min: sorted[0] ?? null, median, max: sorted.at(-1) ?? null, advice: cutAdvice(lengths) },
    worlds: world ? world.worlds : null,
    spectacle: world ? world.spectacle : null,
    tempo: spec.audio ? { bpm: spec.audio.bpm, confidence: spec.audio.confidence, framesPerBeat: spec.audio.framesPerBeat } : null,
  };
}

async function pageRead(page, log) {
  log('reading the page: worlds, cues, loudness');
  const read = await readTimeline(page);
  return { read, timeline: timelineOf(read) };
}

async function pageVelocity(page, shots, log) {
  log('reading element speeds from the page');
  const frame = resolveFrame(page, {});
  const { page: tab, url, close } = await openPage(page, frame, { final: false });
  const out = [];
  try {
    await tab.goto(url, { waitUntil: 'load' });
    for (const s of shots) {
      if (s.length < 0.15) continue;
      const { from, to } = stripWindow((s.start + s.end) / 2, s.length, Number(readPageMeta(page, 'duration')) || s.end);
      const got = await readVelocity(tab, {}, from, to);
      out.push({ shot: s.index, moves: got.rows.filter((r) => r.analysis.pos.moves).map((r) => ({ label: r.label.replace(/^\d+\.\s*/, ''), ...r.analysis.pos, px: Math.round(r.analysis.pos.peakSpeed * got.height) })) });
    }
  } finally {
    await close();
  }
  return out;
}

function shotLook(video, shot, series, fps, dur) {
  const f0 = Math.round(shot.start * fps), f1 = Math.max(f0 + 1, Math.round(shot.end * fps));
  const means = series.means.slice(f0, f1), clips = series.clips.slice(f0, f1);
  const lum = means.length ? means.reduce((s, v) => s + v, 0) / means.length : null;
  const sorted = [...clips].sort((a, b) => a - b);
  const look = { luma: lum == null ? null : Math.round(lum), clipped: sorted.length ? round(sorted[sorted.length >> 1], 2) : null, clippedPeak: sorted.length ? round(sorted.at(-1), 2) : null };
  const times = [shot.key];
  if (shot.length >= 0.6) times.push(shot.start + 0.25 * shot.length, shot.start + 0.75 * shot.length);
  const got = edgesAt(video, times.map((t) => Math.min(t, dur - 0.05)), dur);
  const s = summarise({ means: means.length > 1 ? means : [lum, lum], fps, clips: clips.length > 1 ? clips : [0, 0], ...got });
  return { ...look, bloom: s.bloom ? { ...s.bloom, sigma: bloomSigma(s.bloom.px) } : null, chroma: s.chroma, glow: s.glow, texture: s.texture };
}

function shotFocus(video, shot) {
  const pair = grayFrames(video, shot.key, 2, GRAIN_W, GRAIN_H);
  if (!pair) return { grain: null, sharp: null, tilt: null };
  const still = !shot.energy?.moving || shot.key >= (shot.energy.settle ?? 0);
  return { grain: still ? grainOf(pair[0], pair[1], GRAIN_W, GRAIN_H) : null, sharp: sharpnessMap(pair[0], GRAIN_W, GRAIN_H), tilt: layoutTilt(pair[0], GRAIN_W, GRAIN_H) };
}

/** The share of pixels of a gray plane that sit on a step of more than 24 levels: near 0 for a solid fill. */
function edgeShare(g, w, h) {
  let n = 0;
  for (let y = 0; y < h - 1; y++) for (let x = 0; x < w - 1; x++) if (Math.abs(g[y * w + x + 1] - g[y * w + x]) > SOLID_STEP || Math.abs(g[(y + 1) * w + x] - g[y * w + x]) > SOLID_STEP) n++;
  return n / (w * h);
}

function flashEvents(video, flashes, fps, series, dur) {
  return flashes.map((f) => {
    const peak = f.frame + Math.max(0, f.rise - 1);
    const t = Math.min(peak / fps, dur - 0.05);
    let tint = null, solid = false;
    try {
      const { rgb, w, h } = frameRgb(video, t);
      const sum = [0, 0, 0];
      for (let i = 0; i < rgb.length; i += 3) { sum[0] += rgb[i]; sum[1] += rgb[i + 1]; sum[2] += rgb[i + 2]; }
      const n = w * h;
      tint = hueOf(sum[0] / n, sum[1] / n, sum[2] / n);
      const g = grayFrames(video, t, 1, GRAIN_W, GRAIN_H);
      solid = g ? edgeShare(g[0], GRAIN_W, GRAIN_H) < SOLID_SHARE : false;
    } catch { tint = null; }
    return { solid, frame: f.frame, at: f.at, frames: f.frames, seconds: round(f.frames / fps), baseLuma: f.base, peakLuma: f.peak, rise: f.rise, decay: f.decay,
      peakAt: round(t), clippedAtPeak: series.clips[peak] == null ? null : round(series.clips[peak], 1), tint: tint?.name ?? null };
  });
}

function typeOf(spec, shots, pageTimeline) {
  const fps = spec.fps, H = spec.media.height, k = 1080 / H;
  const words = spec.shots.flatMap((s) => s.text.map((w) => ({ text: w.text, in: round(w.f0 / fps), out: round(w.f1 / fps), hold: round((w.f1 - w.f0) / fps), capHeightPct: round((100 * w.boxHeightPx) / H, 2), fontPx: round(w.fontPxApprox * k, 0), boxHeightPx: round(w.boxHeightPx * k, 0), cx: round(w.cxPx * k, 0), cy: round(w.cyPx * k, 0) })));
  const lines = (spec.textLines ?? []).map((l) => ({ text: l.text, y: l.y, in: l.t0, out: l.t1, stagger: l.stagger, stepS: l.stepS ?? null, words: l.words.length }));
  const holds = pageTimeline ? pageTimeline.worlds.map((w) => ({ id: w.id, length: round(w.end - w.start), readNeed: w.hold, short: w.hold > 0 && w.end - w.start < w.hold })) : null;
  return { ocr: Boolean(spec.ocr), words, lines, runs: spec.textRuns ?? null, holds, shotsWithText: shots.filter((s) => s.text.length).map((s) => s.index) };
}

async function soundOf(src, spec, pageRead, dir, shots, log) {
  const cuts = spec.cuts.map((c) => c.t);
  const hits = (spec.audio?.hits ?? []).filter((h) => h.strength >= MIN_HIT).map((h) => {
    const onset = h.attack ?? h.t;
    const near = cuts.reduce((b, c) => (b == null || Math.abs(c - onset) < Math.abs(b - onset) ? c : b), null);
    return { onset: round(onset), peak: h.t, strength: h.strength, errMs: h.errMs ?? null, nearestCut: near == null || Math.abs(near - onset) > 0.3 ? null : round(near), leadMs: near == null || Math.abs(near - onset) > 0.3 ? null : Math.round((near - onset) * 1000), shot: shots.find((s) => onset >= s.start && onset < s.end)?.index ?? null };
  });
  let loudness = null;
  try { loudness = measureFile(src.video); } catch { loudness = null; }
  const out = { hasAudio: Boolean(spec.audio), bpm: spec.audio?.bpm ?? null, bpmConfidence: spec.audio?.confidence ?? null, beatFrames: spec.audio?.beatFrames ?? [], hits, mp4: loudness ? { lufs: loudness.I, truePeakDb: loudness.TP } : null, page: null };
  if (pageRead) {
    log('mixing the audio tags as written');
    const { read, timeline } = pageRead;
    out.page = { bed: timeline.bed, cues: timeline.cues, mix: null };
    if (read.specs.length) {
      const film = path.basename(path.dirname(src.page));
      const mix = renderMixCached({ specs: read.specs, duration: read.duration, dir: path.resolve(dir, `${film}-audio`) });
      out.page.mix = { lufs: mix.measured.I, truePeakDb: mix.measured.TP };
    }
  }
  return out;
}

/**
 * The measures of one film. `src` is from resolveSource. `opts`: { ocr, noCache, from, to }. `dir` is the folder of this film's output.
 * Returns the see.json object of the film (without images).
 */
export async function measureSide(src, opts, dir, log) {
  const { video, probe } = src;
  const fps = probe.fps, frameH = probe.height;
  fs.mkdirSync(dir, { recursive: true });
  log('measuring cuts, elements, camera, colour, ground, eye, words, audio (ref-spec)');
  const spec = await refSpec({ video, outDir: path.join(dir, 'spec'), maxElements: 10, ocr: opts.ocr, audio: true, cache: !opts.noCache });
  log('reading per-frame energy and light');
  const light = lumaSeries(video, 0);
  const lightFlashes = flashProfile(light.means, fps);
  const energy = maskFlashes(motionDeltaSeries(video), lightFlashes, fps);
  const noise = noiseOf(energy);

  const shotLab = (frame) => spec.colour.perShot.filter((p) => spec.shots.some((s) => s.index === p.shot && frame >= s.f0 && frame < s.f1)).map((p) => p.dominant)[0] ?? null;
  const candidates = flashEvents(video, lightFlashes, fps, light, probe.dur).map((f) => ({ ...f, neutral: f.tint === 'neutral white' && f.solid }));
  const flashes = separateFlashes(spec.cuts, candidates, shotLab);
  const world = src.page ? await pageRead(src.page, log) : null;

  const joined = shotsWithoutFlashes(spec.shots, flashes.flashes).filter((s) => s.f1 > s.f0);
  const shots = joined.map((s, i) => {
    const start = round(s.f0 / spec.fps), end = round(Math.min(s.f1, spec.frames) / spec.fps);
    const cut = spec.cuts.find((c) => c.frame === s.f0);
    const tl = world?.timeline.worlds.find((w) => Math.abs(w.start - start) <= 0.1);
    const moves = movesOf(s, spec.fps, frameH);
    const read = readMotion(energy, start, end, noise);
    const shot = {
      index: i + 1, specIndex: s.index, parts: s.parts, id: tl?.id ?? `shot ${i + 1}`, start, end, length: round(end - start), frames: s.f1 - s.f0, flashes: s.flashes,
      cutIn: cut ? { type: cut.transition.type, frames: cut.transition.frames, dir: cut.transition.dir, evidence: cut.transition.evidence } : { type: i === 0 ? 'start' : 'flash join', frames: 0, dir: '' },
      moves, energy: read, bursts: burstsOfMoves(moves),
      camera: { ...s.camera, words: cameraWords(s.camera, spec.fps) },
      palette: s.palette, layout: s.layout.boxes.map((b) => ({ x: round(b.x, 3), y: round(b.y, 3), w: round(b.w, 3), h: round(b.h, 3), color: b.color, fill: b.fill })),
      text: s.text.map((w) => ({ ...w, boxHeightPx: round(w.boxHeightPx * (1080 / frameH), 0), fontPxApprox: round(w.fontPxApprox * (1080 / frameH), 0) })), hits: s.hits,
    };
    const gp = spec.ground.perShot.find((p) => p.shot === s.index);
    shot.ground = gp?.start ? { startLab: gp.start, endLab: gp.end, hex: labToHex(gp.start), L: gp.L, chroma: gp.chroma, hue: gp.hue, driftDE: gp.driftDE, lightDrift: gp.lightDrift } : null;
    const ep = spec.eye.perShot.find((p) => p.shot === s.index);
    shot.eye = ep?.start ? { start: ep.start, end: ep.end, travel: ep.travel } : null;
    shot.key = keyTime(shot, spec.fps);
    return shot;
  });
  const worldIds = new Set(shots.map((s) => s.id));
  if (world) for (const w of world.timeline.worlds) if (!worldIds.has(w.id)) log(`world ${w.id} has no shot of its own in the film (it is under or inside another)`);

  log('reading light and texture per shot');
  const filmTimes = [...shots].sort((a, b) => b.length - a.length).slice(0, 16).map((s) => s.key);
  const filmEdges = edgesAt(video, filmTimes.length ? filmTimes : [probe.dur / 2], probe.dur);
  const film = summarise({ means: light.means, fps, clips: light.clips, ...filmEdges });
  const look = {
    film: { luma: film.luma, clip: film.clip, bloom: film.bloom ? { ...film.bloom, sigma: bloomSigma(film.bloom.px) } : null, chroma: film.chroma, glow: film.glow, texture: film.texture },
    flashes: flashes.flashes.map((f) => ({ ...f, shot: shots.find((s) => f.at >= s.start - 0.001 && f.at < s.end + 0.001)?.index ?? null })),
    perShot: [],
  };
  for (const s of shots.slice(0, MAX_LOOK_SHOTS)) look.perShot.push({ index: s.index, ...shotLook(video, s, light, fps, probe.dur), ...shotFocus(video, s) });
  for (const l of look.perShot) { const s = shots.find((x) => x.index === l.index); s.look = l; s.camera = { ...s.camera, tilt: l.tilt }; }

  const structure = structureOf(spec, shots, flashes.cuts, flashes, world ? { worlds: world.timeline.worlds, spectacle: world.timeline.spectacle } : null, fps);
  const velocity = src.page ? await pageVelocity(src.page, shots, log) : null;
  const sound = await soundOf(src, spec, world, dir, shots, log);

  return {
    source: { name: src.name, kind: src.kind, video: src.video, page: src.page, hash: src.hash, note: src.note },
    media: { width: probe.width, height: probe.height, fps, duration: round(probe.dur), frames: spec.frames, specFps: spec.fps, audio: Boolean(spec.audio) },
    structure,
    motion: { noise: { mu: round(noise.mu, 3), sigma: round(noise.sigma, 3) }, perShot: shots.map((s) => ({ index: s.index, id: s.id, moves: s.moves, bursts: s.bursts, energy: s.energy, camera: s.camera, eye: s.eye })),
      holds: world ? world.timeline.worlds.map((w) => ({ id: w.id, cut: w.cut })) : null, velocity,
      regions: spec.motionRegions ? { median: spec.motionRegions.median, p90: spec.motionRegions.p90 } : null,
      eyeCuts: spec.eye.cuts ?? [], eyeSummary: spec.eye.summary ?? null },
    look: { ...look, colour: { chromaMedian: spec.colour.chromaMedian, chromaP90: spec.colour.chromaP90, shareDark: spec.colour.shareDark, shareLight: spec.colour.shareLight, lStd: spec.colour.lStd, coloursDistinct: spec.colour.coloursDistinct, coloursPerShotMedian: spec.colour.coloursPerShotMedian }, worldTurns: spec.worldTurns },
    type: typeOf(spec, joined, world?.timeline),
    sound,
    shots,
    groundCuts: spec.ground.cuts,
    flashEdgeCuts: flashes.flashEdges.map((c) => c.t),
  };
}
