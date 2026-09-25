// seamMotionFreezeWarnings(cfg): a boundary transition that lowers to a SEAM (core/transitions/lower.js
// boundaryMechanism) bakes the OUTGOING and INCOMING beat to two still rasters once (films/scene/
// scene.js bakeSeams, ~1613-1649) and blends between those two stills for the whole window
// (drawSeams, ~1593-1611): the live DOM underneath is fully covered. That is a deliberate determinism
// trade (a seam has to composite two frames it can hold onto, not the moving stage), and it stays: the
// bug this warns about is that nothing SAYS it, so a layer's `motion` track, an `acrossBeats` layer, or
// a camera keyframe placed inside the window plays right up to the seam, freezes for its whole
// duration, then jumps to wherever it was "supposed" to be the moment the window ends.
import { isObj } from './util.mjs';
import { boundaryMechanism } from '../transitions/lower.js';
import { DIRECTIONAL_CUT, DIRECTIONAL_SEAM } from '../transitions/catalog.js';

function seamWindows(d) {
  const windows = [];
  for (const t of Array.isArray(d.transitions) ? d.transitions : []) {
    if (!isObj(t) || typeof t.fx !== 'string') continue;
    const at = t.at ?? t.t;
    const dur = +t.dur || 0;
    if (typeof at !== 'number' || !(dur > 0)) continue;
    let mech;
    try { mech = boundaryMechanism(t.fx, t.mech); } catch { continue; } // unknown fx: reported elsewhere
    if (mech === 'seam') windows.push({ at, end: at + dur, fx: t.fx });
  }
  // Legacy scenes can still author `seams[]` directly; every entry there is a seam by definition.
  for (const s of Array.isArray(d.seams) ? d.seams : []) {
    if (!isObj(s)) continue;
    const at = s.at ?? s.t;
    const dur = +s.dur || 0;
    if (typeof at === 'number' && dur > 0) windows.push({ at, end: at + dur, fx: s.fx || s.style || 'seam' });
  }
  return windows;
}

const inWin = (w, x) => x > w.at + 1e-6 && x < w.end - 1e-6;
const overlapsWin = (w, a, b) => a < w.end - 1e-6 && b > w.at + 1e-6;
const FREEZE_FIX = 'a seam bakes two still frames and blends between them, so nothing inside its '
  + 'window can move: it freezes for the window, then jumps once the window ends. Use a cut, a '
  + 'flow-seam recipe, or move the motion outside the window.';

function layerFreezeWarnings(windows, ls, path, out) {
  (Array.isArray(ls) ? ls : []).forEach((L, i) => {
    if (!isObj(L)) return;
    const label = `${path}[${i}]${L.id ? ` #${L.id}` : ''}`;
    const start = +L.start || 0;
    const dur = +L.duration || +L.dur || 0;
    for (const w of windows) {
      if (Array.isArray(L.motion) && L.motion.some((k) => isObj(k) && inWin(w, start + (+k.t || 0)))) {
        out.push(`${label} has a \`motion\` key inside the seam at ${w.at}s-${w.end}s ("${w.fx}"): ${FREEZE_FIX}`);
      }
      if (L.acrossBeats === true && dur > 0 && overlapsWin(w, start, start + dur)) {
        out.push(`${label} is \`acrossBeats\` and runs through the seam at ${w.at}s-${w.end}s ("${w.fx}"): ${FREEZE_FIX}`);
      }
    }
    if (Array.isArray(L.children)) layerFreezeWarnings(windows, L.children, `${path}[${i}].children`, out);
  });
}

function cameraFreezeWarnings(windows, cam, out) {
  if (!cam) return;
  for (const w of windows) {
    if (cam.some((k) => isObj(k) && inWin(w, +k.t || 0)))
      out.push(`camera has a keyframe inside the seam at ${w.at}s-${w.end}s ("${w.fx}"): ${FREEZE_FIX}`);
  }
}

export function seamMotionFreezeWarnings(cfg) {
  const d = cfg || {};
  const windows = seamWindows(d);
  if (!windows.length) return [];
  const out = [];
  layerFreezeWarnings(windows, d.layers, 'layers', out);
  cameraFreezeWarnings(windows, Array.isArray(d.camera) ? d.camera : Array.isArray(d.cam) ? d.cam : null, out);
  return out;
}

// dirCutFx / dirSeamFx: DERIVED, not hand-kept, sets of fx names whose rendered output actually changes
// with `dir`. Probed exactly the way core/cuts/presentations.js already probes a cut (SOLO_BLIND,
// cutWrites): call the real function/read the real shader and see whether the output depends on it,
// so an fx added tomorrow classifies itself instead of drifting out of a maintained list.
//
// That probe now lives in core/transitions/catalog.js as DIRECTIONAL_CUT / DIRECTIONAL_SEAM, the one owner.
//
// All four cardinal dirs, not just two: `sign()` in core/cuts/presentations.js is +1 for both `left`
// and `up`, so a two-value probe ("left" vs "up") missed `roll`/`spin`, which only flip sign on
// right/down. Four dirs, compared against each other, catches an axis-only OR a sign-only dependency.
// The directional sets are owned by core/transitions/catalog.js, probed from the real presentations and shaders.
const dirCutFx = DIRECTIONAL_CUT;
const dirSeamFx = DIRECTIONAL_SEAM;

// dirWarnings(cfg): a `transitions[]` entry can set `dir`, but only some fx read it. A cut fx not in
// `dirCutFx`, a seam fx not in `dirSeamFx`, or ANY sting (a generative overlay with no direction input
// at all, core/stings/index.js) accepts `dir` as valid schema and then quietly never uses it: the
// render is byte-identical for every `dir` value, and nothing else says so.
export function dirWarnings(cfg) {
  const d = cfg || {};
  const out = [];
  for (const [i, t] of (Array.isArray(d.transitions) ? d.transitions : []).entries()) {
    if (!isObj(t) || t.dir == null || typeof t.fx !== 'string') continue;
    let mech;
    try { mech = boundaryMechanism(t.fx, t.mech); } catch { continue; } // unknown fx: reported elsewhere
    const at = t.at ?? t.t;
    const label = `transitions[${i}]${typeof at === 'number' ? ` (at ${at}s)` : ''} fx "${t.fx}"`;
    if (mech === 'sting') {
      out.push(`${label} sets \`dir\` but lowers to a STING: a sting is a generative overlay with no `
        + 'direction input, and `dir` is silently dropped. Remove it, or use a cut/seam if direction matters.');
    } else if (mech === 'cut' && !dirCutFx.has(t.fx)) {
      out.push(`${label} sets \`dir\` but lowers to a CUT whose presentation never reads it `
        + '(core/cuts/presentations.js): the transition renders identically for every `dir`. Directional '
        + `cuts: ${[...dirCutFx].sort().join(', ')}.`);
    } else if (mech === 'seam' && !dirSeamFx.has(t.fx)) {
      out.push(`${label} sets \`dir\` but lowers to a SEAM whose shader never reads \`u_dir\` `
        + '(core/transitions/units.js): the blend renders identically for every `dir`. Directional '
        + `seams: ${[...dirSeamFx].sort().join(', ')}.`);
    }
  }
  return out;
}
