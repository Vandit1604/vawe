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
export const TYPE_SPINES = {
  launch: {
    // captured UI (screenDive) carries the middle; logoLockup gives the brand its own beat, never a bullet.
    beats: ['kineticHook', 'screenDive', 'cardCascade', 'statReveal', 'logoLockup', 'ctaEnd'],
    paceBand: [2.0, 3.2],
    bgPresets: ['soft', 'mesh', 'spotlight', 'accent'],
    cutFamily: { default: 'fade', accent: 'cinematicZoom' },
    cues: ['chime', 'whoosh', 'success'],
  },
  explainer: {
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
  },
  'talking-head': {
    // the face-safe slot is the placeholder rect the worked example fills; captions carry the beat
    // rhythm instead of blueprint variety, so the spine stays short and repeats on purpose.
    beats: ['blurResolveHook', 'containerFill', 'statReveal', 'ctaEnd'],
    paceBand: [3.0, 5.0],
    bgPresets: ['ink', 'deep'],
    cutFamily: { default: 'fade', accent: 'fade' },
    cues: ['tick'],
  },
  sting: {
    // one move, one blueprint, no filler. `dur` should be 4-8s; the spine has no build slot at all.
    beats: ['logoReveal'],
    paceBand: [4.0, 8.0],
    bgPresets: ['black'],
    cutFamily: { default: 'fade', accent: 'fade' },
    cues: ['chime'],
  },
  demo: {
    // recordedPan/scrollStory carry a real cursor path; the payoff is the verdict, not a stat.
    beats: ['kineticHook', 'recordedPan', 'verdictProof', 'ctaEnd'],
    paceBand: [2.5, 4.5],
    bgPresets: ['soft', 'ink'],
    cutFamily: { default: 'fade', accent: 'punch' },
    cues: ['click', 'success'],
  },
  recreation: {
    // the spine is deliberately generic: a recreation takes its beat shapes from `make study`'s
    // grammar, not from this table. Kept as the two-beat fallback so `--type recreation` still runs.
    beats: ['kineticHook', 'statReveal', 'ctaEnd'],
    paceBand: [2.0, 4.0],
    bgPresets: ['soft', 'accent'],
    cutFamily: { default: 'fade', accent: 'fade' },
    cues: [],
  },
};

export function typeNames() {
  return Object.keys(TYPE_SPINES);
}
