// core/timeline/motion-ir.js: ONE resolved model of what moves in a scene, for every gate to read.
//
// WHY THIS EXISTS. Motion in this engine comes from five separate systems that no single reader sees:
// JSON `motion[]` keys (this file's own neighbour, sequence.js, motionAt/velocityAt), GSAP `parts`
// entrances (core/motion/parts.js, timed in formats/scene/scene.js applyGsapHooks), named GSAP `fx` and
// motionPath/physics (core/engine/gsap-effects.js, seeked by core/timeline/clips.js), kinetic split
// presets (core/kinetic/presets.js, core/tracks/units.js), and authored idle (core/engine/idle.js).
// quality/gates/jolt-check.mjs reads `L.motion` and the camera keys DIRECTLY, so a jolt inside a
// kinetic ramp or a GSAP fx is invisible to it: the gate has never heard of those systems.
//
// buildMotionIR(scene) walks an EXPANDED scene (post core/engine/expand.js: relative times and beats
// are already plain numbers) and returns one flat list of entries:
//
//   { id, source, prop, segments: [{ t0, t1, from, to, ease }] | null, why? }
//
// `id` names the moving element (a layer's own id, its type#index, or "camera"). `source` names which
// of the five systems wrote the move: 'json' | 'camera' | 'idle' | 'kinetic' | 'parts' | 'gsap-fx' |
// 'gsap-motionPath' | 'gsap-physics'. `t0`/`t1` are FILM SECONDS (a group child's own `delay` already
// folded in), so two entries from different sources sit on the same clock and are comparable.
//
// WHAT THIS DOES NOT GUESS. A source whose timing depends on something only the DOM knows (a GSAP
// effect's own internal tween definition, a kinetic preset's per-unit stagger which needs the real
// split word/char count, a `parts` selector's real match count against hand-authored markup) gets an
// entry with `segments: null` and a `why` string, so a reader can see something moves there without
// being handed an invented number. Guessing a wrong timing here is the failure this engine logs most
// (engine-doctrine/MISTAKES.md): a plausible number silently substituted for a real one.
import { POSE } from './sequence.js';

// jsonSegments(kfs, absStart): one {t0,t1,from,to,ease} list per POSE property that actually varies
// across the track. Uses the SAME identity fill motionAt's poseAt does (POSE's own [out, identity]
// table), so a value here is the value motionAt would hand a caller, not a re-derivation of it.
function jsonSegments(kfs, absStart) {
  const out = [];
  for (const [authored, [prop, id]] of Object.entries(POSE)) {
    const vals = kfs.map((k) => (k[authored] != null ? k[authored] : id));
    if (vals.every((v) => v === vals[0])) continue; // identity throughout: this track never keys it
    const segments = [];
    for (let i = 0; i < kfs.length - 1; i++) {
      segments.push({ t0: absStart + kfs[i].t, t1: absStart + kfs[i + 1].t,
        from: vals[i], to: vals[i + 1], ease: kfs[i + 1].ease ?? null });
    }
    out.push({ prop, segments });
  }
  return out;
}

function walkLayers(layers, out, parentAbsStart) {
  (layers || []).forEach((L, idx) => {
    if (!L || typeof L !== 'object') return;
    const id = L.id || `${L.type || 'layer'}#${idx}`;
    // A top-level layer's own `start` is already a film-second number post-expand (item 2's relative-
    // time resolver runs before this). A GROUP CHILD carries no `start` of its own: its visibility
    // window opens at the parent's start plus its own `delay` (core/layers/util.js childContentStart's
    // sibling rule), computed once here rather than re-derived per source below.
    const absStart = parentAbsStart == null ? (L.start ?? 0) : parentAbsStart + (L.delay ?? 0);

    if (Array.isArray(L.motion) && L.motion.length > 1) {
      for (const { prop, segments } of jsonSegments(L.motion, absStart)) {
        out.push({ id, source: 'json', prop, segments });
      }
    }

    if (L.idle && L.idle !== 'none') {
      const t1 = absStart + (L.duration ?? 0);
      out.push({ id, source: 'idle', prop: L.idle, segments: [{ t0: absStart, t1, from: null, to: null, ease: null }],
        why: 'a periodic sin-based generator (core/engine/idle.js), not a linear from→to move; '
          + 'amplitude and period live in the layer\'s own idle options' });
    }

    // KINETIC: a split layer's `preset` (core/kinetic/presets.js), staggered per unit by
    // core/tracks/units.js. Each unit's own window is a closed formula of its INDEX, but the index
    // only exists once the authored text is actually split into words/chars in the DOM, so the total
    // unit count (and therefore every unit past the first) is not known here.
    if (L.preset && (L.split || L.ransom)) {
      out.push({ id, source: 'kinetic', prop: L.preset, segments: null,
        why: 'per-unit timing needs the split word/char count, known only once the DOM splits the authored text (core/tracks/units.js unitProgress)' });
    }

    if (L.parts) {
      for (const p of (Array.isArray(L.parts) ? L.parts : [L.parts])) {
        out.push({ id, source: 'parts', prop: p.anim || 'fadeUp', segments: null,
          why: 'per-unit timing needs the real match count of `select` against the layer\'s own hand-authored markup, a DOM query (formats/scene/scene.js applyGsapHooks)' });
      }
    }

    for (const item of (Array.isArray(L.fx) ? L.fx : (L.fx ? [L.fx] : []))) {
      const name = typeof item === 'string' ? item : item && item.name;
      out.push({ id, source: 'gsap-fx', prop: name || null, segments: null,
        why: 'a named GSAP effect\'s timing lives inside its own registered effect function (core/engine/gsap-effects.js), not in data this IR can read' });
    }
    if (L.motionPath) out.push({ id, source: 'gsap-motionPath', prop: 'motionPath', segments: null,
      why: 'position along an SVG path is computed by GSAP\'s MotionPathPlugin at build, not a from→to this IR can state' });
    if (L.physics) out.push({ id, source: 'gsap-physics', prop: 'physics', segments: null,
      why: 'velocity/gravity/friction scatter is simulated by GSAP\'s Physics2DPlugin, not a keyed segment' });

    if (Array.isArray(L.children) && L.children.length) walkLayers(L.children, out, absStart);
  });
}

// CAMERA_POSE: the subset of cameraAt's fields worth reporting as motion (position, zoom, orientation).
// `focus`/`aperture`/`persp` are lens state, not a move the eye tracks the way a pan or a push is, and
// are left out of this first cut rather than guessed at.
const CAMERA_POSE = [['x', 0], ['y', 0], ['s', 1], ['rx', 0], ['ry', 0], ['roll', 0]];

function cameraSegments(camKf) {
  const out = [];
  for (const [prop, id] of CAMERA_POSE) {
    const vals = camKf.map((k) => (k[prop] != null ? k[prop] : id));
    if (vals.every((v) => v === vals[0])) continue;
    const segments = [];
    for (let i = 0; i < camKf.length - 1; i++) {
      segments.push({ t0: camKf[i].t, t1: camKf[i + 1].t, from: vals[i], to: vals[i + 1], ease: camKf[i + 1].ease ?? null });
    }
    out.push({ prop, segments });
  }
  return out;
}

/**
 * buildMotionIR(scene): scene is an EXPANDED scene object (core/engine/expand.js's expandScene, or the
 * lowered form loadScene returns) carrying `layers` and, at top level, `camera`. Pure: reads only what
 * is on the object, touches no DOM, returns a fresh array.
 */
export function buildMotionIR(scene) {
  const out = [];
  walkLayers((scene && scene.layers) || [], out, null);
  const camKf = scene && Array.isArray(scene.camera) ? scene.camera : [];
  if (camKf.length > 1) {
    for (const { prop, segments } of cameraSegments(camKf)) out.push({ id: 'camera', source: 'camera', prop, segments });
  }
  return out;
}
