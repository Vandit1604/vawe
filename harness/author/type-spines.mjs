// Measured from real films/scene/ films by duration bucket: transitions/film avg is 1.34 at 10-15s, jumps to 2.57 at 15-18s and 4.47 at 18-25s, the break sits right at 15s.
// Also the value quality/gates/storyboard-check.mjs's SPINE_MAX_S already used; not picked to match vawe-continuous-action's "~15s".
export const CONTINUOUS_ACTION_MAX_S = 15;

export const TYPE_SPINES = {
  launch: {
    register: 'kinetic',
    beats: ['kineticHook', 'screenDive', 'cardCascade', 'statReveal', 'logoLockup', 'ctaEnd'],
    paceBand: [2.0, 3.2],
    bgPresets: ['soft', 'mesh', 'spotlight', 'accent'],
    cutFamily: { default: 'fade', accent: 'cinematicZoom' },
    cues: ['chime', 'whoosh', 'success'],
    continuousObject: {
      object: 'the primary action control (the button or field the viewer would press)',
      t0: 'idle, waiting to be used',
      states: ['pressed, carrying the result of the press', 'resolving into the consequence of that press'],
      last: 'mid-consequence, the payoff withheld or held for its final beat only',
    },
  },
  explainer: {
    register: 'quiet',
    beats: ['kineticHook', 'containerFill', 'listBuildRows', 'chipGrid', 'statReveal', 'ctaEnd'],
    paceBand: [2.5, 4.0],
    bgPresets: ['paper', 'soft', 'dotmatrix'],
    cutFamily: { default: 'dissolve', accent: 'punch' },
    cues: ['tick', 'chime'],
    waive: { 'sparse-beats': 'explainer pace band, 2.5-4.0s per beat (skills/vawe-type/reference/explainer.md): one idea must land before the next starts, so a boundary every ~3.7s is the type\'s own rhythm, not a slideshow' },
    continuousObject: {
      object: 'the headline figure (the one number this film proves)',
      t0: 'blank or zero, not yet earned',
      states: ['counts up as the proof is named'],
      last: 'held at its final value, labeled, no further change',
    },
  },
  'talking-head': {
    register: 'quiet',
    beats: ['blurResolveHook', 'containerFill', 'statReveal', 'ctaEnd'],
    paceBand: [3.0, 5.0],
    bgPresets: ['ink', 'deep'],
    cutFamily: { default: 'fade', accent: 'fade' },
    cues: ['tick'],
    continuousObject: null,
  },
  sting: {
    register: 'kinetic',
    beats: ['logoReveal'],
    paceBand: [4.0, 8.0],
    bgPresets: ['black', 'ink'],
    cutFamily: { default: 'fade', accent: 'fade' },
    cues: ['chime'],
    continuousObject: {
      object: 'the mark (the logo or wordmark)',
      t0: 'unformed: hidden, scattered, or reduced to a single stroke',
      states: ['assembles or reveals itself into its full form'],
      last: 'fully formed, held, nothing further moves',
    },
  },
  demo: {
    register: 'quiet',
    beats: ['kineticHook', 'recordedPan', 'verdictProof', 'ctaEnd'],
    paceBand: [2.5, 4.5],
    bgPresets: ['soft', 'ink'],
    cutFamily: { default: 'fade', accent: 'punch' },
    cues: ['click', 'success'],
    continuousObject: {
      object: 'the control the cursor drives',
      t0: 'idle, cursor approaching',
      states: ['clicked, the UI responds'],
      last: 'the verdict visible on or beside it, held',
    },
  },
  recreation: {
    register: null,
    beats: ['kineticHook', 'statReveal', 'ctaEnd'],
    paceBand: [2.0, 4.0],
    bgPresets: ['soft', 'accent'],
    cutFamily: { default: 'fade', accent: 'fade' },
    cues: [],
    continuousObject: null,
  },
};

export function typeNames() {
  return Object.keys(TYPE_SPINES);
}
