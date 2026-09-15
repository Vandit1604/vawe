// core/audio-cues.js: the cue tables for auto sound-design, as PURE DATA (no side effects).
//
// A transition is not one whoosh on everything: a punch snaps, a softwipe breathes, an iris blooms,
// a whip is loud air. These maps name the Cuelume voicing (see core/audio-kit.mjs) each transition
// mechanism gets under `audio.auto`. They live here, imported by all three consumers, so they cannot
// drift: the render path (formats/scene/scene.html), the bake catalogue (generators/media/audio-bake.mjs),
// and the coverage gate (quality/gates/lib-test.mjs). Previously scene.html hand-mirrored these and had
// already lost `push` from CUT_CUE and had no SEAM_CUE at all (every seam rendered silent).

// Cut style -> cue. Consumed for layer `cut` and top-level `cuts`.
// `none` maps to SILENCE explicitly. It was simply absent, so `CUT_CUE[style] || 'whoosh'` gave a
// no-transition cut a whoosh - a sound for something the audience never sees. An entry of `null` is a
// stated decision; a missing key is a gap that the fallback fills with a guess. engine-doctrine/MISTAKES.md #360.
// EVERY MOVING CUT USED TO POINT AT `whisper`, AND `whisper` NO LONGER EXISTS. When the listening pass
// deleted the noise cues it did not follow them here, so eleven of these keys named nothing and the
// clicks (`press`, `tick`, `toggle`) that survived the edit were UI sounds standing in for a cut.
// They now point at the movement family, which is what a cut wanted in the first place.
export const CUT_CUE = {
  none: null,
  punch: 'impact', whip: 'whoosh', skewWhip: 'whoosh', jitter: 'pluck',
  softwipe: 'whoosh', wipe: 'whoosh', softiris: 'bloom', iris: 'bloom',
  rise: 'bloom', riseBlur: 'bloom', drop: 'droplet', zoom: 'droplet',
  slide: 'whoosh', push: 'whoosh', fade: 'bloom', blur: 'droplet',
  flip: 'whoosh', spin: 'whoosh', cube: 'whoosh', roll: 'whoosh',
  clock: 'pluck', blinds: 'pluck', barn: 'pluck',
  squeeze: 'impact', collapse: 'impact', letterbox: 'impact',
  // a match cut is meant to pass unnoticed, so the shape closing is the only event worth voicing
  matchCut: 'bloom',
};

// Seam fx -> cue. Consumed for `data.seams` (the two-scene GPU blends core/seams.js SEAM_FX; the premium
// transitions the unified `transitions` surface lowers into seams). Must cover every SEAM_FX, lib-test
// asserts it, so a new seam fx can never ship silent again.
// `whipPan: 'whoosh'` was the one honest row in this table and it named a cue the engine could not
// synthesise: `whoosh` resolved through an ALIAS onto `whisper`, a low-passed hiss. It is a real
// voicing now, so the alias is gone and the name means what it says.
export const SEAM_CUE = {
  fade: 'bloom', dissolve: 'bloom', slide: 'whoosh', uncover: 'whoosh', wipe: 'whoosh',
  crossWarp: 'whoosh', push: 'impact', whipPan: 'whoosh', sdfIris: 'bloom', dispersion: 'sparkle',
  lens: 'droplet', flashWhite: 'impact', cinematicZoom: 'drop', portal: 'bloom',
  // the hand-written house set (core/transitions/units-house.js), a cue per fx by character.
  barnDoor: 'whoosh', clockWipe: 'whoosh', irisRound: 'bloom', shatterGlitch: 'sparkle',
  zoomBlur: 'whoosh', swirlWarp: 'whoosh', rippleWave: 'droplet', pixelDissolve: 'sparkle',
  blindsWipe: 'whoosh', burnThrough: 'impact', spinZoom: 'whoosh', lumaWipe: 'bloom',
};
