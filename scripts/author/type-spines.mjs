// scripts/author/type-spines.mjs: one beat spine per VIDEO TYPE, read by `scaffold.mjs --type <type>`.
//
// WHY A SEPARATE TABLE. `scaffold.mjs`'s default MIDDLE rotation (cardCascade/wordBlast/chipGrid) is
// one shape: a generic feature reel. A launch film, an explainer and a sting are not built the same
// way (AGENTS.md W10, `.claude/plans/great-motion-design.plan.md`), so a single rotation cannot serve
// all of them without becoming the same generic film with a different name on it. Each entry below
// fixes: which blueprints play which ROLE (open/build/payoff/close), the pace band in seconds per
// beat, which `bg` presets the type turns through, which cut family it favours, and which audio cues
// it reaches for. `make blueprints` prints the full roster; this file only picks an ORDER for one type.
//
// Every blueprint name here is real: cross-checked by hand against `make blueprints`
// (scripts/site/blueprints-catalog.mjs), which prints the full 29-beat roster.
//
// `register`: 'kinetic' or 'quiet', per docs/CRAFT/MOTION-REGISTERS.md. Restraint (how many beats may
// move, how loud the loud moment gets) is not one universal rule: a 'quiet' type pays a legibility cost
// for every millisecond of motion (NN/g, Apple HIG) and wants one loud moment against a still field; a
// 'kinetic' type sells sustained motion as the content itself (kinetic-typography practice, beat-synced
// editing, the Saul Bass / Kyle Cooper title tradition) and a still beat is the cost. Selected here so
// an author does not have to remember which register a film is in.
// CONTINUOUS-ACTION THRESHOLD, measured rather than guessed. Bucketing every real (non-scratch) film
// in formats/scene/ by duration (excluding `_`-prefixed probes and generated siblings): 0-10s carries
// 0.59 declared transitions/film on average and is transition-free 72% of the time; 10-15s is still
// transition-light (56% zero, avg 1.34); the break happens right at 15s, where 15-18s drops to 36% zero
// and avg 2.57, and 18-25s to 18% zero and avg 4.47. The library itself treats a film under ~15s as
// naturally cut-light; past it, cuts become the norm. This is also the exact value
// `quality/gates/storyboard-check.mjs`'s own `SPINE_MAX_S` already uses to decide when a plan must name
// what holds the film (`threads:`/`object:`), so 15s was already a load-bearing number in this repo
// before this file used it, not a new one picked to match `vawe-continuous-action/SKILL.md`'s "~15s".
export const CONTINUOUS_ACTION_MAX_S = 15;

export const TYPE_SPINES = {
  launch: {
    register: 'kinetic',
    // captured UI (screenDive) carries the middle; logoLockup gives the brand its own beat, never a bullet.
    beats: ['kineticHook', 'screenDive', 'cardCascade', 'statReveal', 'logoLockup', 'ctaEnd'],
    paceBand: [2.0, 3.2],
    bgPresets: ['soft', 'mesh', 'spotlight', 'accent'],
    cutFamily: { default: 'fade', accent: 'cinematicZoom' },
    cues: ['chime', 'whoosh', 'success'],
    // Below CONTINUOUS_ACTION_MAX_S this type is authored as ONE object crossing the whole film
    // (skills/vawe-continuous-action/SKILL.md), not as the `beats` rotation above, which is the >=15s
    // shape. object/t0/states/last mirror the skill's own Step 1 table.
    continuousObject: {
      object: 'the primary action control (the button or field the viewer would press)',
      t0: 'idle, waiting to be used',
      states: ['pressed, carrying the result of the press', 'resolving into the consequence of that press'],
      last: 'mid-consequence, the payoff withheld or held for its final beat only',
    },
  },
  explainer: {
    register: 'quiet',
    // no product beat: the spine is entirely hook -> build -> counted proof -> payoff, held pace.
    beats: ['kineticHook', 'containerFill', 'listBuildRows', 'chipGrid', 'statReveal', 'ctaEnd'],
    paceBand: [2.5, 4.0],
    bgPresets: ['paper', 'soft', 'dotmatrix'],
    cutFamily: { default: 'dissolve', accent: 'punch' },
    cues: ['tick', 'chime'],
    // The pace band is the type's own decision, and it sits just past the floor's 3.5s boundary rule
    // (sparse-beats). Written here once, so every explainer scaffold carries the reasoned waiver instead
    // of each author rediscovering the block after a render (the acceptance run did, 2026-09-06).
    waive: { 'sparse-beats': 'explainer pace band, 2.5-4.0s per beat (skills/vawe-type-explainer): one idea must land before the next starts, so a boundary every ~3.7s is the type\'s own rhythm, not a slideshow' },
    // A held figure, not a UI control, is this type's natural continuous object: an explainer under
    // 15s still has one thing to show becoming true, it just is not a product surface.
    continuousObject: {
      object: 'the headline figure (the one number this film proves)',
      t0: 'blank or zero, not yet earned',
      states: ['counts up as the proof is named'],
      last: 'held at its final value, labeled, no further change',
    },
  },
  'talking-head': {
    register: 'quiet',
    // the face-safe slot is the placeholder rect the worked example fills; captions carry the beat
    // rhythm instead of blueprint variety, so the spine stays short and repeats on purpose.
    beats: ['blurResolveHook', 'containerFill', 'statReveal', 'ctaEnd'],
    paceBand: [3.0, 5.0],
    bgPresets: ['ink', 'deep'],
    cutFamily: { default: 'fade', accent: 'fade' },
    cues: ['tick'],
    // No continuousObject: a talking-head is held by the face and the captions, not by a prop. Forcing
    // an object spine onto it would be exactly the "rectangle that resizes four times" the skill warns
    // against. Below CONTINUOUS_ACTION_MAX_S it still drops the beat-cut rotation (docs/CRAFT/ROUTING.md
    // via the type SKILL), it just carries no object; `threads:` alone holds it.
    continuousObject: null,
  },
  sting: {
    register: 'kinetic',
    // one move, one blueprint, no filler. `dur` should be 4-8s; the spine has no build slot at all.
    beats: ['logoReveal'],
    paceBand: [4.0, 8.0],
    // 'black' stays first (a sting's single beat always lands on bgPresets[0]): the flat field a mark
    // reveal wants. 'ink' is here only for the continuous-action branch's `firstMoving()` fallback, so a
    // sting's backdrop is not asleep for its whole runtime (beat-check's `static-bg`, promoted to a hard
    // code in author-check): dark enough to still read as the same look, just not perfectly still.
    bgPresets: ['black', 'ink'],
    cutFamily: { default: 'fade', accent: 'fade' },
    cues: ['chime'],
    // A sting's whole runtime is already under CONTINUOUS_ACTION_MAX_S by definition (paceBand tops out
    // at 8s), so it is ALWAYS the continuous-action shape: the mark itself is the one object.
    continuousObject: {
      object: 'the mark (the logo or wordmark)',
      t0: 'unformed: hidden, scattered, or reduced to a single stroke',
      states: ['assembles or reveals itself into its full form'],
      last: 'fully formed, held, nothing further moves',
    },
  },
  demo: {
    register: 'quiet',
    // recordedPan/scrollStory carry a real cursor path; the payoff is the verdict, not a stat. A demo
    // is UI-adjacent by definition (it IS the interface), so it inherits the quiet register.
    beats: ['kineticHook', 'recordedPan', 'verdictProof', 'ctaEnd'],
    paceBand: [2.5, 4.5],
    bgPresets: ['soft', 'ink'],
    cutFamily: { default: 'fade', accent: 'punch' },
    cues: ['click', 'success'],
    // A demo's subject is already a UI control being driven by a cursor, the textbook continuous object.
    continuousObject: {
      object: 'the control the cursor drives',
      t0: 'idle, cursor approaching',
      states: ['clicked, the UI responds'],
      last: 'the verdict visible on or beside it, held',
    },
  },
  recreation: {
    // no fixed register: a recreation inherits whatever register the studied source film is in
    // (`make study`'s grammar), which is exactly why this spine stays a generic two-beat fallback.
    register: null,
    beats: ['kineticHook', 'statReveal', 'ctaEnd'],
    paceBand: [2.0, 4.0],
    bgPresets: ['soft', 'accent'],
    cutFamily: { default: 'fade', accent: 'fade' },
    cues: [],
    // Inherits its object (or lack of one) from the studied source, same reasoning as `register: null`.
    continuousObject: null,
  },
};

export function typeNames() {
  return Object.keys(TYPE_SPINES);
}
