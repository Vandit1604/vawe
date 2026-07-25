// core/audio-cues.js — the cue tables for auto sound-design, as PURE DATA (no side effects).
//
// A transition is not one whoosh on everything: a punch snaps, a softwipe breathes, an iris blooms,
// a whip is loud air. These maps name the Cuelume voicing (see core/audio-kit.mjs) each transition
// mechanism gets under `audio.auto`. They live here, imported by all three consumers, so they cannot
// drift: the render path (formats/scene/scene.html), the bake catalogue (scripts/media/audio-bake.mjs),
// and the coverage gate (scripts/gates/lib-test.mjs). Previously scene.html hand-mirrored these and had
// already lost `push` from CUT_CUE and had no SEAM_CUE at all (every seam rendered silent).

// Cut style -> cue. Consumed for layer `cut` and top-level `cuts`.
export const CUT_CUE = {
  punch: 'press', whip: 'whisper', skewWhip: 'whisper', jitter: 'tick',
  softwipe: 'whisper', wipe: 'whisper', softiris: 'bloom', iris: 'bloom',
  rise: 'bloom', riseBlur: 'bloom', drop: 'droplet', zoom: 'droplet',
  slide: 'whisper', push: 'whisper', fade: 'whisper', blur: 'whisper',
  flip: 'toggle', spin: 'toggle', cube: 'toggle', roll: 'toggle',
  clock: 'tick', blinds: 'tick', barn: 'tick',
  squeeze: 'press', collapse: 'press', letterbox: 'press',
};

// Seam fx -> cue. Consumed for `data.seams` (the two-scene GPU blends core/seams.js SEAM_FX; the premium
// transitions the unified `transitions` surface lowers into seams). Must cover every SEAM_FX — lib-test
// asserts it, so a new seam fx can never ship silent again.
export const SEAM_CUE = {
  fade: 'whisper', dissolve: 'whisper', slide: 'whisper', uncover: 'whisper', wipe: 'whisper',
  crossWarp: 'whisper', push: 'press', whipPan: 'whoosh', sdfIris: 'bloom', dispersion: 'sparkle',
  lens: 'droplet', flashWhite: 'press', cinematicZoom: 'droplet', portal: 'bloom',
};
