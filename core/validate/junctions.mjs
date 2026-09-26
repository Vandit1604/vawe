import { isObj } from './util.mjs';
import { resolveSeconds } from '../registry/vocab.js';
import { boundaryMechanism } from '../transitions/lower.js';

// SEAM D range check: fx-name and dur bounds are enforced by the schema (enum + min); what the schema
// cannot express is that the window [t, t+dur] must fall INSIDE the video, else the outgoing/incoming
// beats are baked from clamped edge frames and the transition blends the wrong thing silently.
export function seamErrors(cfg) {
  const out = [];
  const seams = Array.isArray(cfg.seams) ? cfg.seams : [];
  if (!seams.length) return out;
  // effective duration: explicit, else the last layer's end (+0.4 tail), mirrors scene.html.
  let dur = typeof cfg.duration === 'number' ? cfg.duration : 0;
  if (!dur) for (const L of cfg.layers || []) { if (isObj(L) && typeof L.start !== 'string') dur = Math.max(dur, (L.start ?? 0) + (L.duration ?? 2)); }
  dur = +(dur + (typeof cfg.duration === 'number' ? 0 : 0.4)).toFixed(2);
  seams.forEach((s, i) => {
    if (!isObj(s)) return;
    const t = +s.t, d = +(s.dur ?? 0.5);
    if (!isFinite(t)) return; // schema reports the missing/NaN t
    if (t < 0) out.push(`seams[${i}] t is ${s.t}, before the video starts: the render refuses to start until this is fixed. Set t to 0 or later.`);
    if (dur && t + d > dur + 1e-6) out.push(`seams[${i}] window [${t}, ${(t + d).toFixed(2)}] runs past the end of the ${dur}s video, so the outgoing/incoming beats would be baked from clamped edge frames and the transition would blend the wrong thing: the render refuses to start until this is fixed. Move t earlier or shorten dur so the window ends by ${dur}s.`);
  });
  return out;
}

// UNIFIED TRANSITIONS: the fx must route to a real boundary mechanism (cut/seam/sting). The schema
// checks shape (at/dur/timing); only the router knows whether a name is a boundary transition at all,
// so a typo or a layer-only name (e.g. `pop`) used as a boundary is caught here, loudly, not silently.
// A duration slot may name a WORD instead of a number (core/registry/vocab.js), and core/transitions/lower.js
// resolves it. That resolve THROWS on an unknown word, which is right at render and wrong as the first
// thing an author hears: the throw arrives from inside a lowering pass, out of one of eight workers.
// Caught here so the same refusal is a validation line, at the entry point, in a second.
const DUR_WORD_SLOTS = ['duration', 'enterDur', 'exitDur'];
export function durationWordErrors(cfg) {
  const out = [];
  const visit = (L, at) => {
    if (!isObj(L)) return;
    for (const k of DUR_WORD_SLOTS) {
      if (typeof L[k] !== 'string') continue;
      try { resolveSeconds(L[k]); } catch (e) { out.push(`${at}.${k}: ${e.message}`); }
    }
    (L.children || []).forEach((c, i) => visit(c, `${at}.children[${i}]`));
  };
  (cfg.layers || []).forEach((L, i) => visit(L, `layers[${i}]`));
  return out;
}

export function transitionErrors(cfg) {
  const out = [];
  const list = Array.isArray(cfg.transitions) ? cfg.transitions : [];
  list.forEach((T, i) => {
    if (!isObj(T)) { out.push(`transitions[${i}] is a ${typeof T}, not an object: the render refuses to start until this is fixed. Write it as {"at": <seconds>, "fx": "<name>"}.`); return; }
    if (T.fx == null) return; // the schema reports the missing required `fx`/`at`
    try { boundaryMechanism(T.fx, T.mech); }
    catch (e) { out.push(`transitions[${i}]: ${e.message}`); }
  });
  return out;
}

// `transitions[]` IS THE ONLY AUTHORED JUNCTION FORM. `cuts[]`/`stings[]`/`seams[]` are what it lowers
// to (core/transitions/lower.js), and every consumer reads that lowered shape, so a scene that still
// authors one of the three raw keys is either pre-migration or a hand-written regression, not a second
// legal spelling. Checked on the RAW file (this runs before lowering, both in boot.js and the CLI
// below), so a scene this pass has already lowered never trips it: the lowered `cuts` it produced is
// the engine's own output, not something the author wrote. `_lowered` is lowerScene's own mark of
// that (core/transitions/lower.js): a Node consumer that pre-lowers before serving to the browser
// (core/engine/boot.js's runtime validate call, reached by quality/gates/snap-scenes.mjs and
// scene-snap.mjs) would otherwise feed this refusal its own output and block every scene using
// transitions[].
const JUNCTION_KEY_MECH = { cuts: 'cut', stings: 'sting', seams: 'seam' };
export function authoredJunctionErrors(cfg) {
  const out = [];
  if (cfg?._lowered) return out;
  for (const [key, mech] of Object.entries(JUNCTION_KEY_MECH)) {
    if (Array.isArray(cfg?.[key]) && cfg[key].length)
      out.push(`${key}[] is no longer an authored key, it is the INTERNAL lowered output of `
        + `transitions[] (mech:"${mech}"). Write transitions[] instead, then run `
        + `\`node harness/author/migrate-junctions.mjs <file>\` to convert an old scene automatically.`);
  }
  return out;
}
