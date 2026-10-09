// The images of `vawe see`: per shot a native-size key frame, a strip through the cut that opens it, an onion of its biggest move and
// nearest-neighbour zooms of every effect found in it. Each image comes back with the numbers that belong to it. No cap on the count.
import fs from 'node:fs';
import path from 'node:path';
import { ffmpegOrDie } from '../../lib/scratch.mjs';
import { downsample } from './core.mjs';
import { motionDeltaSeries } from '../shot-detect.mjs';
import { runShot } from './compare.mjs';
import { frameRgb, lumaOf } from './frame.mjs';
import { makeOnion } from './onion.mjs';
import { stripWindow } from './strip-math.mjs';
import { zoomCell } from './zoom.mjs';
import { autoBox, FRAME_H, FRAME_W } from './zoom-math.mjs';

const ZOOM = 8;
const STRIP_FRAMES = 9;
const MIN_ONION_S = 0.25;
const ONION_FRAMES = 8;
const round = (n, d = 2) => +n.toFixed(d);
const pad = (n) => String(n).padStart(2, '0');

/** The native-size PNG of the frame at second `t`. */
export function stillImage(video, t, file) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  ffmpegOrDie(['-v', 'error', '-y', '-ss', Math.max(0, t).toFixed(3), '-i', video, '-frames:v', '1', file], file, 'key frame');
  return file;
}

/** The first grid of `runShot` over [from, from + span) with exactly STRIP_FRAMES frames, moved to `file`. */
function stripImage(video, tmp, from, span, energy, file) {
  const fps = Math.min(30, STRIP_FRAMES / span);
  const { gridPaths, outDir } = runShot(video, tmp, from, from + span, fps, { energy, quiet: true });
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.renameSync(gridPaths[0], file);
  fs.rmSync(outDir, { recursive: true, force: true });
  return { file, from: round(from, 3), to: round(from + span, 3), fps: round(fps, 1) };
}

/** The 240x135 box (1920x1080 pixels) of the densest bright edge at second `t`, the densest edge of any brightness when none is bright, or null. */
export function effectBox(video, t) {
  const { rgb } = frameRgb(video, t);
  const luma = lumaOf(rgb);
  return autoBox(luma) ?? autoBox(luma, FRAME_W, FRAME_H, 0);
}

/** `box` centred on a point (cx, cy) in the 1920x1080 frame, 240x135. */
const boxAround = (cx, cy) => ({ x: Math.min(FRAME_W - 240, Math.max(0, Math.round(cx - 120))), y: Math.min(FRAME_H - 135, Math.max(0, Math.round(cy - 67))), w: 240, h: 135 });

const move = (m) => `${m.id} ${m.axis} ${m.travelPx} px ${m.start?.toFixed?.(2) ?? '?'} to ${m.settle?.toFixed?.(2) ?? '?'} s${m.overshootPct != null ? `, overshoot ${m.overshootPct}%` : ''}${m.ease ? `, ${m.ease}` : ''}`;

function frameLines(shot) {
  const L = [`shot ${shot.index} (${shot.id}) ${shot.start.toFixed(2)} to ${shot.end.toFixed(2)} s, ${shot.frames} f, key frame at ${shot.key.toFixed(2)} s`];
  L.push(`palette ${shot.palette.map((p) => `${p.hex} ${Math.round(p.share * 100)}%`).join(' ')}`);
  if (shot.ground) L.push(`ground ${shot.ground.hex} (L ${shot.ground.L}, chroma ${shot.ground.chroma}, hue ${shot.ground.hue})${shot.ground.lightDrift != null ? `, light drift ${shot.ground.lightDrift} L` : ''}`);
  if (shot.text.length) L.push(`text: ${shot.text.map((t) => `"${t.text}" ${t.boxHeightPx} px high`).join(', ')}`);
  return L;
}

function cutLines(shot, prev, structureCut, groundCut, eyeCut) {
  const L = [`cut into shot ${shot.index} at ${shot.start.toFixed(2)} s: ${shot.cutIn.type}${shot.cutIn.dir ? ` ${shot.cutIn.dir}` : ''}, ${shot.cutIn.frames} f${structureCut?.hitLead != null ? `, sound ${structureCut.hitLead} f before it` : ''}`];
  L.push(`outgoing shot ${prev.index} ${prev.length.toFixed(2)} s, incoming ${shot.length.toFixed(2)} s`);
  if (groundCut) L.push(`ground change at the cut: deltaE ${groundCut.dE}`);
  if (eyeCut) L.push(`eye jump across the cut: ${eyeCut.jump} frame heights`);
  const e = shot.energy;
  if (e?.moving) L.push(`incoming motion: starts ${e.start.toFixed(2)} s, peaks ${e.peak} at ${e.peakAt.toFixed(2)} s, settles ${e.settle.toFixed(2)} s, ${e.bursts.length} burst${e.bursts.length === 1 ? '' : 's'}`);
  return L;
}

function zoomLines(shot, what, box) {
  const l = shot.look ?? {};
  const L = [`${what}: box ${box.x},${box.y},${box.w},${box.h} at ${ZOOM}x, nearest-neighbour, second ${shot.key.toFixed(2)}`];
  if (l.bloom) L.push(`bloom: 90 to 10% over ${l.bloom.px} px (gaussian sigma about ${l.bloom.sigma} px)`);
  if (l.chroma) L.push(`fringe: blue minus red dx ${l.chroma.dx} px, dy ${l.chroma.dy} px, ${l.chroma.share}% of ${l.chroma.n} edges off by 1 px or more`);
  if (l.glow) L.push(`glow colour: ${l.glow.name}`);
  if (l.clipped != null) L.push(`clipped share ${l.clipped}% (peak ${l.clippedPeak}%)`);
  return L;
}

const frameImage = (shot, ctx, folder) => ({ file: stillImage(ctx.video, shot.key, path.join(folder, 'frame.png')), t: shot.key, lines: frameLines(shot) });

function cutImage(shot, ctx, folder) {
  const prev = ctx.m.shots[shot.index - 2];
  if (!prev) return null;
  const span = Math.min(1, Math.max(0.5, 2.5 * Math.min(prev.length, shot.length)));
  const strip = stripImage(ctx.video, ctx.tmp, stripWindow(shot.start, span, ctx.dur).from, span, ctx.energy, path.join(folder, 'cut-in.png'));
  const near = (c) => Math.abs(c.at - shot.start) < 0.04;
  return { ...strip, lines: cutLines(shot, prev, ctx.m.structure.cuts.find(near), ctx.m.groundCuts?.find(near), ctx.m.motion.eyeCuts.find(near)) };
}

function onionImage(shot, ctx, folder) {
  const big = shot.moves.filter((x) => x.start != null && x.settle != null && x.settle - x.start >= MIN_ONION_S).sort((a, b) => b.travelPx - a.travelPx)[0];
  if (!big) return null;
  const on = makeOnion({ video: ctx.video, name: ctx.src.name }, { at: (big.start + big.settle) / 2, span: Math.min(2, big.settle - big.start + 0.1), n: ONION_FRAMES, out: folder });
  const file = path.join(folder, 'move-onion.png');
  fs.renameSync(on.out, file);
  return { file, from: on.times[0], to: on.times.at(-1), lines: [`${move(big)}; peak ${big.peakPxPerS} px/s (${big.peakHeightsPerS} frame heights/s); ${ONION_FRAMES} frames, oldest cool and faint, newest strong; a ghost past the final place is overshoot`] };
}

function edgeZoom(shot, ctx, folder) {
  let box = null;
  try { box = shot.length >= 0.1 ? effectBox(ctx.video, Math.min(shot.key, ctx.dur - 0.05)) : null; } catch { box = null; }
  if (!box) return null;
  const file = path.join(folder, 'zoom-edge.png');
  zoomCell(ctx.clip, shot.key, box, ZOOM, file);
  return { file, what: 'edge (bloom, fringe, glow)', t: shot.key, box, lines: zoomLines(shot, 'densest bright edge', box) };
}

function textureZoom(shot, ctx, folder) {
  const tex = ctx.m.look.film.texture;
  if (!tex || !tex.kind || tex.kind === 'none' || !tex.box || tex.at < shot.start - 0.001 || tex.at >= shot.end + 0.001) return null;
  const box = boxAround(tex.box.x + tex.box.w / 2, tex.box.y + tex.box.h / 2);
  const file = path.join(folder, 'zoom-texture.png');
  zoomCell(ctx.clip, tex.at, box, ZOOM, file);
  const period = tex.kind === 'grid' ? `${round(tex.periodX)} x ${round(tex.periodY)} px` : `${round(tex.period)} px`;
  return { file, what: 'screen texture', t: tex.at, box, lines: [`screen texture: ${tex.kind}, period ${period}${tex.striped ? `, RGB-striped (channels ${tex.spreadDeg} deg apart)` : ', monochrome'}; box ${box.x},${box.y},${box.w},${box.h} at ${ZOOM}x`] };
}

function flashImage(f, i, ctx, folder) {
  const n = Math.min(STRIP_FRAMES, f.frames + 2);
  const strip = stripImage(ctx.video, ctx.tmp, Math.max(0, (f.frame - 1) / ctx.m.media.fps), (n + 0.5) / ctx.m.media.fps, ctx.energy, path.join(folder, `flash-${i + 1}.png`));
  const box = effectBox(ctx.video, Math.min(f.peakAt, ctx.dur - 0.05));
  let zoom = null;
  if (box) { zoom = { file: path.join(folder, `flash-${i + 1}-peak.png`), box, t: f.peakAt }; zoomCell(ctx.clip, f.peakAt, box, ZOOM, zoom.file); }
  const joined = f.sameShot === true ? 'the same shot before and after' : f.sameShot === false ? 'a cut hides under it' : 'shots either side not compared';
  return { ...strip, zoom, lines: [`flash ${i + 1}: ${f.at.toFixed(2)} s, ${f.frames} f (${f.seconds} s), mean luma ${f.baseLuma} to ${f.peakLuma}, rise ${f.rise} f, decay ${f.decay} f, clipped ${f.clippedAtPeak ?? '?'}% at the peak, tint ${f.tint ?? '?'}, ${joined}`] };
}

/** All images of one film into `dir`. `m` is the output of measureSide. Returns { shots: [{ index, id, frame, cut, onion, zooms, flashes }] }. */
export function makeImages(src, m, dir, log) {
  const ctx = { src, m, video: src.video, dur: m.media.duration, energy: downsample(motionDeltaSeries(src.video), 10), clip: { video: src.video, dur: m.media.duration, label: 'a', name: src.name }, tmp: path.join(dir, '.tmp') };
  const shots = m.shots.map((shot) => {
    const folder = path.join(dir, 'images', `shot-${pad(shot.index)}`);
    log(`images of shot ${shot.index} of ${m.shots.length}`);
    return { index: shot.index, id: shot.id, frame: frameImage(shot, ctx, folder), cut: cutImage(shot, ctx, folder), onion: onionImage(shot, ctx, folder),
      zooms: [edgeZoom(shot, ctx, folder), textureZoom(shot, ctx, folder)].filter(Boolean),
      flashes: m.look.flashes.filter((x) => x.shot === shot.index).map((f, i) => flashImage(f, i, ctx, folder)) };
  });
  fs.rmSync(ctx.tmp, { recursive: true, force: true });
  return { shots };
}

/** The images of a moment (`--at`): the native frame, the strip around it, the onion and an edge zoom. */
export function momentImages(src, m, at, dir, log) {
  log(`images of the moment ${at} s`);
  const video = src.video, dur = m.media.duration;
  const energy = downsample(motionDeltaSeries(video), 10);
  const folder = path.join(dir, 'images', `moment-${at.toFixed(2)}`);
  const out = { at, frame: stillImage(video, Math.min(at, dur - 0.05), path.join(folder, 'frame.png')) };
  const { from } = stripWindow(at, 1, dur);
  out.strip = stripImage(video, path.join(dir, '.tmp'), from, 1, energy, path.join(folder, 'strip.png'));
  const on = makeOnion({ video, name: src.name }, { at, span: 0.6, n: ONION_FRAMES, out: folder });
  out.onion = path.join(folder, 'onion.png');
  fs.renameSync(on.out, out.onion);
  const box = effectBox(video, Math.min(at, dur - 0.05));
  if (box) { out.zoom = { file: path.join(folder, 'zoom-edge.png'), box }; zoomCell({ video, dur, label: 'a', name: src.name }, at, box, ZOOM, out.zoom.file); }
  fs.rmSync(path.join(dir, '.tmp'), { recursive: true, force: true });
  return out;
}
