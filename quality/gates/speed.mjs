#!/usr/bin/env node
// quality/gates/speed.mjs: make check GATE=speed D=<film> [LAYER=<id>]
//
// A READOUT, not a gate, exit 0 always. AE draws speed as a curve on a graph; this engine has no
// graph editor, so an author cannot SEE whether a `speed:4` handle actually rushes or a travel
// station's `easeIn` actually stops. This prints the three numbers that answer it: start, peak and
// end speed for every motion segment of every layer, every camera leg, and every transition, sampled
// off the engine's OWN resolved values (motionAt/velocityAt/cameraAt/cameraVelocityAt,
// core/timeline/sequence.js) at the film's own fps - the exact functions the render and the other
// gates already evaluate a scene through, so this cannot disagree with what actually plays.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { sceneTiming } from './scene-timing.mjs';
import { motionAt, velocityAt, cameraAt, cameraVelocityAt } from '../../core/timeline/sequence.js';
import { gateFindings } from '../../harness/lib/findings.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const DEFAULT_FPS = 60; // cmd/render/main.go's own default for a final render

// sampleSpeeds(evalSpeed, t0, t1, fps): start/peak/end of `evalSpeed(t, dt)` over one segment,
// sampled at fps resolution the same way the renderer walks a scene frame by frame.
function sampleSpeeds(evalSpeed, t0, t1, fps) {
  const span = t1 - t0;
  if (!(span > 0)) return null;
  const dt = Math.min(1 / fps, span / 2);
  if (!(dt > 0)) return null;
  const n = Math.max(1, Math.round(span * fps));
  const speeds = [];
  for (let i = 0; i <= n; i++) {
    const t = t0 + span * (i / n);
    speeds.push(evalSpeed(Math.min(t1, Math.max(t0 + dt, t)), dt));
  }
  return { start: speeds[0], peak: Math.max(...speeds), end: speeds[speeds.length - 1] };
}

const fmt = (n) => (Number.isFinite(n) ? n.toFixed(1) : 'n/a');
const easeLabel = (k) => (k && (k.easeIn || k.easeOut)) ? 'handle' : (k && k.ease) || 'default';

// VELOCITY_SPIKE_PX_S / _SCALE_S: how much a layer's or the camera's speed may jump between two
// CONSECUTIVE rendered frames before it reads as a jolt rather than a curve, not a gate threshold
// tuned in the abstract. The vawe-flow-2 diagnosis (engine-doctrine/MOTION-CRAFT.md owns speed/motion) measured a
// visible jolt from a frame-to-frame scale-rate change well under 1 full scale-unit/s; the floor here
// sits under that so a real jolt is caught before it needs a frame-difference plot to see.
export const VELOCITY_SPIKE_PX_S = 600;
export const VELOCITY_SPIKE_SCALE_S = 0.6;

// findVelocitySpikes(evalSpeed, t0, t1, fps, threshold, cutsAt): a REPORT, not a fix. Walks the
// EXPANDED track frame by frame (the same fps the render walks it at) and flags a step where the speed
// changes by more than `threshold` between two consecutive frames, skipping any frame that lands on a
// declared cut (`cutsAt`, absolute seconds) since a hard cut IS an intentional discontinuity.
export function findVelocitySpikes(evalSpeed, t0, t1, fps, threshold, cutsAt = []) {
  const dt = 1 / fps;
  if (!(t1 - t0 > dt)) return [];
  const spikes = [];
  let prev = null, prevAt = null;
  for (let t = t0; t <= t1 + 1e-9; t += dt) {
    const at = Math.min(t1, Math.max(t0 + dt, t));
    const v = evalSpeed(at, dt);
    if (prev != null) {
      const jump = Math.abs(v - prev);
      const onCut = cutsAt.some((c) => Math.abs(c - at) < dt / 2 || Math.abs(c - prevAt) < dt / 2);
      if (jump > threshold && !onCut) spikes.push({ t: +prevAt.toFixed(3), jump: +jump.toFixed(2) });
    }
    prev = v; prevAt = at;
  }
  return spikes;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const arg = process.argv.slice(2).find((a) => !a.startsWith('--')) || process.env.D;
  if (!arg) { console.error('usage: make check GATE=speed D=films/scene/<film>.json [LAYER=<id>]'); process.exit(2); }
  const layerFilter = process.env.LAYER || null;
  const sceneFile = path.resolve(ROOT, String(arg).replace(/\.json$/, '') + '.json');
  if (!fs.existsSync(sceneFile)) { console.error(`no scene at ${sceneFile}`); process.exit(2); }
  const scene = JSON.parse(fs.readFileSync(sceneFile, 'utf8'));
  const T = sceneTiming(scene);
  const fps = T.scene.fps || DEFAULT_FPS;

  console.log(`\n  speed · ${path.basename(sceneFile)} · ${fps}fps`);
  // A READOUT prints every segment; a velocity-spike line is the one real finding in it (a jolt, not
  // just a measurement), so it alone is recorded, the same dual-write craft-coverage.mjs uses: the
  // console.log beside each stays the printed line, unchanged.
  const f = gateFindings();

  // Only the boundaries that exist on the LOWERED scene (`transitions[]` is baked to `cuts`/`stings`/
  // `seams` before this point, engine-doctrine/RULES): a declared cut is an intentional discontinuity, so a
  // velocity-spike check excludes the frame it lands on rather than flagging it as a jolt.
  const cuts = Array.isArray(T.scene.cuts) ? T.scene.cuts : [];
  const cutsAt = cuts.map((c) => c.t);

  // ---- layer motion segments -----------------------------------------------------------------
  let anyLayer = false;
  T.content.forEach((L, idx) => {
    const id = L.id || `${L.type || 'layer'}#${idx}`;
    if (layerFilter && id !== layerFilter) return;
    if (!Array.isArray(L.motion) || L.motion.length < 2) return;
    const [layerStart] = T.contentSpans[idx];
    anyLayer = true;
    console.log(`\n  layer ${id}`);
    const at = (t) => +(layerStart + t).toFixed(2);
    for (let i = 0; i < L.motion.length - 1; i++) {
      const a = L.motion[i], b = L.motion[i + 1];
      const r = sampleSpeeds((t, dt) => velocityAt(L.motion, t, dt).speed, a.t, b.t, fps);
      if (!r) { console.log(`    ${at(a.t)}s-${at(b.t)}s  (zero-length, skipped)`); continue; }
      console.log(`    ${at(a.t)}s-${at(b.t)}s  ${fmt(r.start)} -> ${fmt(r.peak)} -> ${fmt(r.end)} px/s  ease: ${easeLabel(b)}`);
    }
    // ONE scan across the WHOLE track, not per segment: a per-segment scan resets its `prev` sample at
    // every keyframe, which is exactly where a hard stop (engine-doctrine/MISTAKES.md #125) shows up, so it would
    // never see the one frame it exists to catch.
    const cutsRel = cutsAt.map((c) => c - layerStart);
    const spikes = findVelocitySpikes((t, dt) => velocityAt(L.motion, t, dt).speed,
      L.motion[0].t, L.motion[L.motion.length - 1].t, fps, VELOCITY_SPIKE_PX_S, cutsRel);
    for (const s of spikes) {
      console.log(`      velocity-spike: ${at(s.t)}s  +${s.jump} px/s in one frame`);
      f.warn('velocity-spike', `${id}: ${at(s.t)}s  +${s.jump} px/s in one frame`, { at: at(s.t), jump: s.jump, layer: id });
    }
  });
  if (!anyLayer) console.log(layerFilter ? `\n  no keyed motion on layer "${layerFilter}"` : '\n  no layer has a keyed motion track');

  // ---- camera legs ----------------------------------------------------------------------------
  const camKf = Array.isArray(T.scene.camera) ? T.scene.camera : [];
  if (!layerFilter && camKf.length > 1) {
    console.log('\n  camera');
    for (let i = 0; i < camKf.length - 1; i++) {
      const a = camKf[i], b = camKf[i + 1];
      const pos = sampleSpeeds((t, dt) => cameraVelocityAt(camKf, t, dt).speed, a.t, b.t, fps);
      const zoom = sampleSpeeds((t, dt) => (cameraAt(camKf, t).s - cameraAt(camKf, t - dt).s) / dt, a.t, b.t, fps);
      if (!pos) { console.log(`    ${a.t}s-${b.t}s  (zero-length, skipped)`); continue; }
      console.log(`    ${a.t}s-${b.t}s  ${fmt(pos.start)} -> ${fmt(pos.peak)} -> ${fmt(pos.end)} px/s`
        + `  ·  zoom ${fmt(zoom.start)} -> ${fmt(zoom.peak)} -> ${fmt(zoom.end)} scale/s  ease: ${easeLabel(b)}`);
    }
    // ONE scan across the WHOLE leg list, for the same reason as the layer loop above.
    const posSpikes = findVelocitySpikes((t, dt) => cameraVelocityAt(camKf, t, dt).speed,
      camKf[0].t, camKf[camKf.length - 1].t, fps, VELOCITY_SPIKE_PX_S, cutsAt);
    for (const s of posSpikes) {
      console.log(`      velocity-spike: ${s.t}s  +${s.jump} px/s in one frame`);
      f.warn('velocity-spike', `camera: ${s.t}s  +${s.jump} px/s in one frame`, { at: s.t, jump: s.jump, layer: 'camera' });
    }
    const zoomSpikes = findVelocitySpikes((t, dt) => (cameraAt(camKf, t).s - cameraAt(camKf, t - dt).s) / dt,
      camKf[0].t, camKf[camKf.length - 1].t, fps, VELOCITY_SPIKE_SCALE_S, cutsAt);
    for (const s of zoomSpikes) {
      console.log(`      velocity-spike: ${s.t}s  +${s.jump} scale/s in one frame`);
      f.warn('velocity-spike', `camera zoom: ${s.t}s  +${s.jump} scale/s in one frame`, { at: s.t, jump: s.jump, layer: 'camera-zoom' });
    }
  } else if (!layerFilter) {
    console.log('\n  camera: no legs (a static frame, or nothing baked to `data.camera`)');
  }

  // ---- transitions (cuts) ----------------------------------------------------------------------
  if (!layerFilter) {
    if (cuts.length) {
      console.log('\n  transitions');
      for (const c of cuts) {
        const dur = T.cutDurAt(c.t);
        console.log(`    ${c.t}s  ${c.style || 'cut'}${c.dir ? ` (${c.dir})` : ''}  ${dur.toFixed(2)}s`);
      }
    } else {
      console.log('\n  transitions: none');
    }
  }
  console.log('');
  process.exit(0);
}
