#!/usr/bin/env node
// quality/gates/jolt-check.mjs: jolts and dead windows, measured where films are checked.
//
// speed.mjs (frame-to-frame speed jumps) and motion-floor.mjs (dead windows against a rendered mp4)
// both existed and both only printed to a terminal nobody was made to run. A planted linear camera
// station or an easeIn-into-a-hold never showed up as a finding in `make author-check`, because
// neither script spoke the findings contract (harness/lib/findings.mjs) and neither ran in the ship
// path. This gate is the one step that puts both in front of an author automatically, report-only.
//
//   node quality/gates/jolt-check.mjs formats/scene/<film>.json   ·   part of `make author-check`
//
// speed.mjs stays the one owner of the jolt thresholds (VELOCITY_SPIKE_PX_S / _SCALE_S): this file
// only calls its findVelocitySpikes, it never repeats a number of its own.
//
// motion-floor needs a RENDER, not just a scene: it reads out/<film>.mp4 frame by frame. Running it
// against a stale mp4 (one older than the scene it is supposed to check) would grade a film that no
// longer exists, so this only calls it when the render is both present and current.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { sceneTiming } from './scene-timing.mjs';
import { velocityAt, cameraAt, cameraVelocityAt } from '../../core/timeline/sequence.js';
import { buildMotionIR } from '../../core/timeline/motion-ir.js';
import { findVelocitySpikes, VELOCITY_SPIKE_PX_S, VELOCITY_SPIKE_SCALE_S } from './speed.mjs';
import { gateFindings, readFindings } from '../../harness/lib/findings.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const DEFAULT_FPS = 60;

const file = process.argv[2];
if (!file || !fs.existsSync(file)) {
  console.error('usage: node quality/gates/jolt-check.mjs formats/scene/<film>.json');
  process.exit(2);
}
const scene = JSON.parse(fs.readFileSync(file, 'utf8'));
const T = sceneTiming(scene);
const fps = T.scene.fps || DEFAULT_FPS;
const cuts = Array.isArray(T.scene.cuts) ? T.scene.cuts : [];
const cutsAt = cuts.map((c) => c.t);

const f = gateFindings({ scene: file, indent: '  ' });
console.log(`\n  jolt · ${path.basename(file)}`);

// ---- layer motion tracks: one scan per layer across its WHOLE track, same reason as speed.mjs -----
//
// WHICH layers carry a track worth scanning now comes off the ONE motion model every gate is meant to
// read (core/timeline/motion-ir.js), not off a bespoke `Array.isArray(L.motion)` check repeated in
// this file. The velocity ARITHMETIC still calls sequence.js's own velocityAt on the layer's raw
// keyframes: `ease: "through"` fits a Hermite curve off a key's NEIGHBOURS (sequence.js tangentAt),
// which a flattened {t0,t1,from,to} segment cannot reconstruct on its own, so the IR is the gate's map
// of WHERE to look and sequence.js stays the one owner of HOW FAST a track is actually moving there.
const camKf = Array.isArray(T.scene.camera) ? T.scene.camera : [];
const ir = buildMotionIR({ layers: T.content, camera: camKf });
const jsonMotionIds = new Set(ir.filter((e) => e.source === 'json').map((e) => e.id));
T.content.forEach((L, idx) => {
  const id = L.id || `${L.type || 'layer'}#${idx}`;
  if (!jsonMotionIds.has(id)) return;
  const [layerStart] = T.contentSpans[idx];
  const cutsRel = cutsAt.map((c) => c - layerStart);
  const spikes = findVelocitySpikes((t, dt) => velocityAt(L.motion, t, dt).speed,
    L.motion[0].t, L.motion[L.motion.length - 1].t, fps, VELOCITY_SPIKE_PX_S, cutsRel);
  for (const s of spikes) {
    const at = +(layerStart + s.t).toFixed(2);
    f.warn('velocity-spike', `layer ${id} jumps +${s.jump} px/s in one frame at ${at}s (outside any cut)`, { at: `${at}s` });
  }
});

// ---- camera legs, position and zoom, one scan each across the whole leg list ----------------------
if (ir.some((e) => e.source === 'camera')) {
  const posSpikes = findVelocitySpikes((t, dt) => cameraVelocityAt(camKf, t, dt).speed,
    camKf[0].t, camKf[camKf.length - 1].t, fps, VELOCITY_SPIKE_PX_S, cutsAt);
  for (const s of posSpikes) f.warn('velocity-spike', `camera jumps +${s.jump} px/s in one frame at ${s.t}s (outside any cut)`, { at: `${s.t}s` });

  const zoomSpikes = findVelocitySpikes((t, dt) => (cameraAt(camKf, t).s - cameraAt(camKf, t - dt).s) / dt,
    camKf[0].t, camKf[camKf.length - 1].t, fps, VELOCITY_SPIKE_SCALE_S, cutsAt);
  for (const s of zoomSpikes) f.warn('velocity-spike', `camera zoom jumps +${s.jump} scale/s in one frame at ${s.t}s (outside any cut)`, { at: `${s.t}s` });
}

f.emit();
if (f.count === 0) console.log('  → no jolts outside a declared cut.');

// ---- motion-floor, only against a CURRENT render ---------------------------------------------------
const slug = path.basename(file, '.json');
const mp4 = path.join(ROOT, 'out', `${slug}.mp4`);
let floorFailed = false;
if (fs.existsSync(mp4) && fs.statSync(mp4).mtimeMs > fs.statSync(file).mtimeMs) {
  // A separate findings file, not the outer VAWE_FINDINGS_OUT: that one belongs to THIS gate's own
  // f.emit() above, and a child process inheriting it would overwrite it on its own exit.
  const tmp = path.join(ROOT, `.jolt-floor-${process.pid}.json`);
  const { VAWE_FINDINGS_OUT, ...envNoFindings } = process.env;
  const r = spawnSync('node', [path.join(ROOT, 'quality/gates/motion-floor.mjs'), file],
    { encoding: 'utf8', cwd: ROOT, env: { ...envNoFindings, VAWE_FINDINGS_OUT: tmp } });
  process.stdout.write(`${r.stdout || ''}${r.stderr || ''}`);
  floorFailed = (r.status ?? 0) !== 0;
  // Fold motion-floor's own records into this step's findings file, so a bare waiver on one of its
  // codes (dead-window, floor-below-reference, ambient-padding) is visible to author-check the same
  // way any other gate's is, rather than living only in a throwaway temp file.
  const floorRecords = readFindings(tmp) || [];
  const out = process.env.VAWE_FINDINGS_OUT;
  if (out && floorRecords.length) {
    try {
      const existing = JSON.parse(fs.readFileSync(out, 'utf8'));
      fs.writeFileSync(out, JSON.stringify([...(Array.isArray(existing) ? existing : []), ...floorRecords], null, 2));
    } catch { /* best-effort merge; the prose above already reached stdout */ }
  }
  try { fs.rmSync(tmp, { force: true }); } catch { /* temp file, never fail the gate over this */ }
} else {
  console.log(`  motion-floor: skipped, no current render (out/${slug}.mp4 missing or older than the scene json).`);
}

process.exitCode = floorFailed ? 1 : 0;
