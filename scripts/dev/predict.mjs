// scripts/dev/predict.mjs — hunt ONE bug shape across every site that has it.
//
// The shape (docs/MISTAKES.md #195, #197): a keyframe track is read KEY TO KEY, so what a key does not
// say is not "unchanged" — it is identity. That is a fine contract for a track a human TYPES, where
// omitting a property is a choice. It is a trap for a track the engine FABRICATES, because the generator
// fills in whatever the author's input did not mention, and identity is almost never what they meant.
//
// It has two faces, and looking for only the first is how this file failed on its first run:
//
//   (a) the generated key OMITS the property   → the reader resets it        (mergePan, #195)
//   (b) the generated key STATES identity      → the generator reset it      (multiPhase, #197)
//
// (b) is invisible to a structural check: the key is complete and well-formed, and only the SEMANTICS
// are wrong. So each generator is driven with an input whose correct answer is known independently —
// "a leg that mentions nothing should change nothing" — and the output is checked against that, not
// against a schema.
//
//   node scripts/dev/predict.mjs [--verbose]
import { CAMERA_MOVES } from '../../core/camera-moves.js';
import { cameraAt, motionAt } from '../../core/sequence.js';
import { BLOCKS } from '../../blocks/index.mjs';
import { layoutErrors } from '../../core/validate.mjs';

const VERBOSE = process.argv.includes('--verbose');
const results = [];
const rec = (probe, site, status, detail) => results.push({ probe, site, status, detail });

// ---- A1 · a generated step that mentions nothing must CHANGE nothing ---------------------------
// Every leg-driven camera generator: run a journey whose middle leg specifies no axis at all, and
// assert the camera is still where the previous leg left it. This is the check that would have caught
// multiPhase's hold leg panning 180px home while claiming to hold.
{
  const legs = [{ dur: 1.5, s: 1.25, x: 180, y: -60 }, { dur: 2 }, { dur: 1.5, s: 1, x: 0, y: 0 }];
  const kf = CAMERA_MOVES.multiPhase({ legs });
  const a = cameraAt(kf, 1.5), b = cameraAt(kf, 3.5);
  const moved = Math.hypot(b.x - a.x, b.y - a.y) + Math.abs(b.s - a.s) * 1000;
  rec('A1', 'multiPhase', moved > 1 ? 'HIT' : 'ok',
    `hold leg: (${a.x.toFixed(0)}, ${a.y.toFixed(0)}, s${a.s.toFixed(2)}) → (${b.x.toFixed(0)}, ${b.y.toFixed(0)}, s${b.s.toFixed(2)})`
    + (moved > 1 ? '  ← a leg that mentions nothing moved the camera' : '  (held)'));
}

// ...and every generator must produce a track whose own keys are internally consistent: no property
// declared and then dropped, which is face (a).
const CAM_PROPS = ['s', 'x', 'y', 'rx', 'ry', 'p'];
const CAM_CASES = {
  slowPush: [{}, { from: 1, to: 1.3, dur: 4 }], diveIn: [{}, { tx: 700, ty: 400, to: 1.6 }],
  panFollow: [{}, { dur: 5 }], workspaceZoomOut: [{}, { from: 1.8, to: 1 }],
  orbit: [{}, { deg: 20, dur: 5 }],
  multiPhase: [{ legs: [{ dur: 1, s: 1.2 }, { dur: 1, x: 90 }, { dur: 1, s: 1 }] }],
};
function omissions(keys, props) {
  const bad = [];
  for (const p of props) {
    const first = keys.findIndex((k) => k && k[p] != null);
    if (first < 0) continue;
    for (let i = first + 1; i < keys.length; i++) if (!keys[i] || keys[i][p] == null) { bad.push(`${p}@${i}`); break; }
  }
  return bad;
}
for (const [name, fn] of Object.entries(CAMERA_MOVES)) {
  for (const params of (CAM_CASES[name] || [{}])) {
    let keys; try { keys = fn(params); } catch (e) { rec('A2', name, 'ERROR', e.message); continue; }
    if (!Array.isArray(keys) || keys.length < 2) continue;
    const bad = omissions(keys, CAM_PROPS);
    rec('A2', name, bad.length ? 'HIT' : 'ok', bad.length ? `declared then dropped: ${bad.join(', ')}` : `${keys.length} keys complete`);
  }
}

// ---- A3 · block factories -----------------------------------------------------------------------
// A block emits LAYERS, so anything it emits is subject to every rule a hand-authored layer is. The
// motion tracks it generates get the same key-to-key check, and the whole emission is run through
// layoutErrors — the same gate an author's own file passes through, including the reversal check.
const MOT_PROPS = ['x', 'y', 'scale', 'rot', 'opacity', 'blur'];
for (const [name, fn] of Object.entries(BLOCKS)) {
  let out;
  try { out = fn({ x: 200, y: 300, start: 0.2, dur: 4 }); } catch (e) { rec('A3', name, 'skip', `needs props: ${e.message.slice(0, 54)}`); continue; }
  const layers = (Array.isArray(out) ? out : [out]).filter((l) => l && typeof l === 'object');
  if (!layers.length) { rec('A3', name, 'skip', 'emitted nothing with these props'); continue; }
  const flat = [];
  const walk = (ls) => ls.forEach((l) => { flat.push(l); if (Array.isArray(l.children)) walk(l.children); });
  walk(layers);
  const partial = flat.filter((l) => Array.isArray(l.motion) && l.motion.length > 1 && omissions(l.motion, MOT_PROPS).length);
  const errs = layoutErrors({ layers: flat, duration: 5, aspect: '16:9' });
  if (partial.length) rec('A3', name, 'HIT', `${partial.length} emitted motion track(s) declare a property then drop it`);
  else if (errs.length) rec('A3', name, 'HIT', errs[0].slice(0, 150));
  else rec('A3', name, 'ok', `${flat.length} layer(s) clean`);
}

// ---- report --------------------------------------------------------------------------------------
const by = (s) => results.filter((r) => r.status === s);
for (const r of results) {
  if (!VERBOSE && r.status !== 'HIT' && r.status !== 'ERROR') continue;
  const mark = { HIT: '✗ HIT ', ERROR: '! ERR ', skip: '- skip', ok: '  ok  ' }[r.status];
  console.log(`${mark} [${r.probe}] ${r.site.padEnd(20)} ${r.detail}`);
}
console.log(`\n${results.length} probes · ${by('HIT').length} hit · ${by('ok').length} clean · ${by('skip').length} skipped · ${by('ERROR').length} error`);
process.exit(by('HIT').length ? 1 : 0);
