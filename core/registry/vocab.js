// core/vocab.js: the plain words an author is allowed to write where a concrete engine value goes.
//
// WHY THIS EXISTS. Every motion vocabulary in this engine is named by MECHANISM: `easeOutQuart`,
// `workspaceZoomOut`, `0.3`. An author reaching for the right one pays a document read; an author
// reaching for the wrong one pays nothing, so the measured default is `anim:"fade"` and a bare
// `rise`. A guide cannot fix that, because a guide is a gate by another name: it only works on the
// author who already stopped to read it. The fix is to make the word ITSELF resolve, at the same
// slot, so the cheap reach and the right reach are the same keystrokes.
//
// THE WORDS ARE NOT A SECOND VOCABULARY. Each one is an ALIAS onto a value the engine already has,
// and every target is asserted to exist by `make test`. Nothing here can be picked that could
// not be picked before; a word is a shorter spelling, never a new capability.
//
// WHERE THE MEANINGS COME FROM. Two of these words are already spoken elsewhere in the engine and
// they keep that meaning exactly: `snappy` and `smooth` are cut timings (core/cuts.js TIMINGS), and
// their easing targets are the same curves those timings use. One word, one meaning, whichever slot
// it lands in. A word that would have meant something different in two slots is not in the list.
//
// AN UNKNOWN WORD THROWS. It never falls back. That is the whole argument of core/registry.js, and
// this file is built on it rather than beside it: a silent substitution renders a plausible frame
// that is not the one asked for, and the author has no way to see it (engine-doctrine/MISTAKES.md #213 · #367).
import { defineRegistry } from './registry.js';

// ---- FEEL: a word → an easing name in core/motion.js EASINGS ------------------------------------
// Chosen by what the engine can already do, not by what reads well: every value below is a key of
// EASINGS, checked by lib-test. Words that ARE already EASINGS keys (`linear`, `spring`, `settle`,
// `snap`, `rush`, `brake`, `ramp`) are deliberately absent. ResolveEasing finds those first, and a
// word shadowing a curve is exactly the ambiguity this file exists to remove.
export const FEEL = {
  snappy: 'easeOutQuart',        // the cut timing `snappy`, as an easing. Decisive, no overshoot.
  smooth: 'easeInOutCubic',      // the cut timing `smooth`. Eases at both ends: travel, not arrival.
  soft: 'settle',                // the house entrance: decelerate with a whisper of settle.
  sharp: 'easeOutExpo',          // arrives almost instantly and stops. For a cut-like reveal.
  gentle: 'easeInOutSine',       // the shallowest curve here. Idle drift, backgrounds, holds.
  heavy: 'easeInOutQuint',       // long ramp at both ends: mass, something large being moved.
  pop: 'easeOutBack',            // the cut timing `pop`. Overshoots past the mark and comes back.
  bouncy: 'spring-bouncy',       // visible ring before it rests. Toy, playful, loud.
  elastic: 'easeOutElastic',     // more ring than `bouncy`, and longer. Use once per film.
  stiff: 'spring-stiff',         // spring physics with the overshoot damped almost out.
  mechanical: 'linear',          // no easing at all. A machine, a ticker, a conveyor.
};

// ---- DURATION: a word → seconds ----------------------------------------------------------------
// `medium` is 0.3 because that is BASE_ENTER (core/clips.js), the house default this engine already
// gives every layer that names nothing. Not imported: core/clips.js imports core/motion.js, which
// imports this file, and the cycle is not worth a constant. lib-test asserts the two agree.
//
// The range is MOTION scale (0.08s to 1.2s), because every slot that takes these words is an
// entrance, an exit or a junction. A word is not a film length, and the scene-root `duration` does
// not take one.
export const DURATION = {
  instant: 0.08,     // under the threshold where the eye reads travel. A state change, not a move.
  fast: 0.18,        // read as quick but still a move.
  // productive/expressive: Carbon Design System's own two duration REGISTERS (carbondesignsystem.com/
  // elements/motion/overview), picked by how much the moment is worth, not by how far something
  // travels. Their numbers are the same published bands engine-doctrine/CRAFT/MOTION-REGISTERS.md §2
  // already cites (MD3's "standard transition" 200-300ms, "dramatic/hero" 300-500ms): productive sits
  // at the low end of the standard band, expressive at the low end of the dramatic one. Slotted into
  // THIS SAME ladder rather than a second table, since `resolveComparative`'s "faster"/"slower" walks
  // one ordered ladder and a second table would leave these two words unreachable by it.
  productive: 0.22,  // Carbon's utilitarian tier: small, frequent moves. Sits inside MD3's 200-300ms band.
  medium: 0.3,       // BASE_ENTER, the engine's own default entrance.
  expressive: 0.4,   // Carbon's emphasis tier: an occasional, bigger moment. Sits inside MD3's 300-500ms band.
  slow: 0.6,         // deliberate. The eye has time to follow the whole path.
  luxurious: 1.2,    // a held gesture. One per film, on the beat that deserves the screen time.
};

// ---- CAMERA: a word → a move name in core/camera-moves.js CAMERA_MOVES --------------------------
// The move names are verbs-plus-nouns from the code (`workspaceZoomOut`), which is right for the
// function and wrong for a person describing a shot. These are the shot descriptions.
export const CAMERA_WORDS = {
  'push in': 'slowPush',
  'slow push-in': 'slowPush',
  'pull back': 'workspaceZoomOut',
  'zoom out': 'workspaceZoomOut',
  dive: 'diveIn',
  follow: 'panFollow',
  sweep: 'truck',
  tour: 'travel',
  'pan stations': 'travel',
  circle: 'orbit',
  'ui focus zoom': 'diveIn',
  'punch in': 'punchIn',
  shake: 'cameraShake',
  'drift hold': 'driftHold',
};

// Registered through the same primitive as every other vocabulary, so a word written into the WRONG
// slot is diagnosed rather than merely rejected: `anim: "snappy"` now answers "that is a feel word,
// try `ease`" instead of listing thirty anims it is not among. The registry also owns the near-miss
// list and the "never a fallback" contract. There is no `pick(name, default)` to reach for.
// ---- INTERPOLATION MODES: not curves, and that is the whole distinction --------------------------
//
// An EASING is a function of one segment's own progress: it cannot see the keys either side, so it
// necessarily starts and ends that segment at zero velocity. A FEEL WORD is another spelling of one.
// An interpolation MODE is a third thing: it decides how the value between two keys is computed at all,
// and it is allowed to read the neighbours.
//
// `through` is the speed graph. It fits a cubic Hermite whose tangent at each key comes from that key's
// NEIGHBOURS, so the velocity entering a key equals the velocity leaving it and a travel through
// several keys reads as one gesture instead of stopping at each. Measured on three sparse keys, the
// default curve passes the interior key at 2 px/s and `through` passes it at 770 (core/sequence.js).
//
// They live in the same `ease` field because that is where an author reaches for them, and they are
// listed separately because calling one an easing is what made the first attempt name it `smooth`,
// which is already a feel word for easeInOutCubic. `resolveEasing` never sees these: core/sequence.js
// dispatches them before it is called, and a mode reaching resolveEasing would be a bug.
export const INTERP = {
  through: 'velocity carries THROUGH the key: a cubic Hermite with neighbour tangents, so a travel across several keys is one gesture rather than a stop at each',
};

// THE SYMPTOM IS NOT IN THE BLURB, AND THE SYMPTOM IS WHAT A PERSON TYPES. `make arsenal` was asked
// "the move stops dead in the middle of a travel", which is the exact defect `through` was written to
// remove, and it answered NOTHING HERE CLEARLY MATCHES and offered a camera move, a flight path and a
// colour grade. The blurb is accurate and speaks the engine's own words (velocity, key, Hermite), so it
// retrieves for somebody who already knows the mechanism and for nobody else. That is the retrieval
// failure core/registry.js `aka` exists for: the words go in the SEARCH index without turning the
// printed description into keyword soup. Counted over `films/scene/*.json`: 289 motion tracks in
// 166 films, and `through` appears on none of them.
const INTERP_AKA = {
  through: ['stall', 'stalls', 'stops dead', 'dead stop', 'stops in the middle', 'pause', 'pauses',
    'hitch', 'hesitates', 'stutter', 'jerk', 'kink', 'waypoint', 'sparse keys', 'three keys',
    'graph editor', 'continuous bezier', 'auto bezier', 'carries speed', 'one gesture', 'rounds a corner'],
};

export const INTERP_REGISTRY = defineRegistry('interpolation mode', INTERP, { slot: 'ease', blurbs: INTERP, aka: INTERP_AKA,
  catalog: {
    title: 'Interpolation modes (not easings)',
    tag: 'motion key',
    intro: 'On a `motion` key\'s `ease`, but NOT a curve. An easing is a function of one segment\'s own progress, so it necessarily starts and ends that segment at zero velocity and an interior keyframe becomes a dead stop. A MODE decides how the value is computed at all and may read the keys either side. `{ "t":0.6, "x":400, "ease":"through" }`',
    // THREE FAMILIES ADDED WITHOUT THEIR ROWS, and `make regen` was red for all three at once, so the
    // catalogue could not regenerate at all. A family is not shipped until it can be looked up: this
    // table is the only place that says how to WRITE one.
    // An interpolation mode is not an easing and does not go in `ease`'s usual slot mentally, so the
    // form matters: it is the key on a motion KEY, and it governs the segment arriving at that key.
    usage: (n, { text }) => text({ anim: 'none', motion: [{ t: 0, x: -300 }, { t: 0.8, x: 0, ease: n }, { t: 1.6, x: 300, ease: n }] }),
    noPreview: 'a mode is the SHAPE of the segment between two keys. A still frame is a point on that curve and shows nothing about it; it is only itself in motion.',
  },
});

// THESE THIRTY BLURBS ARE THE PLAIN-ENGLISH DOOR, and their absence was a measured failure rather than
// an untidiness. `make arsenal Q="slow down at the end"` and `Q="make the camera move closer"` both
// answered NOTHING HERE CLEARLY MATCHES, and that message tells the author to assume the engine does
// not have it. It has both: `smooth` is easeInOutCubic and `push in` is slowPush. A search that says
// "absent" about something present is worse than one that says nothing, because it ends the looking.
//
// The 41 EASINGS deliberately carry no blurbs (see EASING_REGISTRY in core/motion.js: 41 near-identical
// sentences about acceleration are worse than one feel table). That decision is kept, and it only works
// if the feel words below carry the words a person would actually type. So they are written for SEARCH,
// not for elegance: each one names the sensation, not the curve, because the curve already has a name.
const FEEL_BLURBS = {
  snappy: 'quick and decisive: moves off fast and slows down hard at the end. The default for a UI element landing.',
  smooth: 'eases in and eases out, slow at both ends. The safe choice for anything travelling a long way across frame.',
  soft: 'arrives and settles, with the overshoot damped out. Use where a hard stop would read as a collision.',
  sharp: 'leaves instantly and decelerates steeply. The most aggressive slow-down-at-the-end available.',
  gentle: 'slow at both ends, but shallower than smooth. Ambient drift, backgrounds, anything not asking for attention.',
  heavy: 'slow at both ends and slow in the middle: reads as mass. Big panels and full-frame moves.',
  pop: 'overshoots the target and comes back: a small bounce of emphasis on something as it lands.',
  bouncy: 'a spring with heavy give and low stiffness, damping ratio 0.45 (55% bounce): swings past the mark before it settles, over a second to rest. Playful, and loud: one per film at most.',
  elastic: 'overshoots repeatedly with a decaying wobble. The loudest option here and rarely the right one.',
  stiff: 'a spring with high stiffness and almost no give, damping ratio 0.88 (12% bounce): settles in about half a second with barely a wobble. Springs that must not look playful.',
  mechanical: 'no acceleration at all, constant speed start to finish. Correct for a loop or a marquee, wrong for anything a person is meant to watch arrive.',
};

const DURATION_BLURBS = {
  instant: '0.08s, about a twelfth of a second. Barely perceptible as motion: a state flip that must not feel animated.',
  fast: '0.18s, under a fifth of a second. A payoff snapping into place, a value ticking over.',
  productive: '0.22s, Carbon\'s utilitarian tier for small, frequent UI-adjacent moves: quick enough that the motion never costs the viewer attention.',
  medium: '0.3s, BASE_ENTER, the engine\'s own default entrance. About a third of a second, reach past it on purpose.',
  expressive: '0.4s, Carbon\'s emphasis tier for an occasional bigger moment: slower than `productive` on purpose, so the one that matters reads as the one that matters.',
  slow: '0.6s, a little over half a second. A thesis line taking its time, a deliberate reveal.',
  luxurious: '1.2s, over a second. The pace of a hero moment, and monotonous if more than one beat uses it.',
};

// The plain words a person would say instead of a number, folded into search only, never printed
// (core/registry/registry.js `aka`). Each one names the WORD-ACTION contract's `words` half; the
// `action` half is DURATION_BLURBS above, which now carries the real seconds value on every entry.
const DURATION_AKA = {
  instant: ['snap', 'no visible motion', 'immediate'],
  fast: ['quick', 'brief', 'snappy pace'],
  productive: ['utilitarian pace', 'small UI move', 'frequent-motion tier'],
  medium: ['default speed', 'normal pace', 'moderate'],
  expressive: ['emphasis pace', 'bigger moment', 'occasional-motion tier'],
  slow: ['deliberate', 'unhurried', 'takes its time'],
  luxurious: ['lingering', 'held', 'extended hold'],
};

const CAMERA_BLURBS = {
  'push in': 'the camera moves closer, slowly and continuously. Tightens attention without a cut.',
  'slow push-in': 'the same slow move closer, spelled the way a storyboard usually spells it.',
  'pull back': 'the camera retreats to reveal the wider context around what you have been looking at.',
  'zoom out': 'the same widening move, spelled the way most people ask for it.',
  dive: 'a fast move INTO the frame, ending close on one element. For entering a product surface.',
  follow: 'the camera pans to keep a moving subject in frame.',
  sweep: 'the camera trucks sideways across the scene, revealing what was beyond the edge.',
  tour: 'a multi-leg move that visits several places in turn, one continuous shot rather than cuts.',
  'pan stations': 'the same touring move, named for what it does: stopping at each station in order.',
  circle: 'the camera orbits around the subject, so the subject stays put and the view changes.',
  'ui focus zoom': 'a dive aimed at one control or panel, for showing exactly where a click lands.',
  'punch in': 'an abrupt jump closer, not a glide. Punctuation: it hits on a beat.',
  shake: 'a short handheld jolt. An impact, a hit, a moment of instability.',
  'drift hold': 'a very slow move on a held frame, so a static shot is never fully still.',
};

// A person asking for "snappy" often says "springy" too, meaning the same quick, decisive land, not
// the bounce a spring gives on impact (that is `bouncy`, a few rows down). Without this word the query
// tied with `hang`, a motion-key influence preset that also mentions "snappy" in its own blurb.
const FEEL_AKA = {
  snappy: ['springy', 'crisp', 'punchy'],
  smooth: ['glide', 'gliding', 'ease in and out', 'flowing motion'],
  soft: ['settle in', 'gentle landing', 'no overshoot', 'cushioned stop'],
  sharp: ['abrupt stop', 'hard slowdown', 'instant departure'],
  gentle: ['ambient drift', 'shallow ease', 'unhurried background motion'],
  heavy: ['weighty', 'massive', 'slow to start and stop', 'ponderous'],
  pop: ['overshoot and settle', 'bounce back into place', 'little kick'],
  bouncy: ['spring bounce', 'springy landing', 'visible bounce'],
  elastic: ['rubber band', 'wobble', 'repeated overshoot'],
  stiff: ['tight spring', 'barely any give', 'crisp spring'],
  mechanical: ['robotic', 'constant speed', 'no acceleration', 'machine-like'],
};

export const FEEL_REGISTRY = defineRegistry('feel word', FEEL, { slot: 'ease', blurbs: FEEL_BLURBS, aka: FEEL_AKA });
export const DURATION_REGISTRY = defineRegistry('duration word', DURATION, { slot: 'enterDur', blurbs: DURATION_BLURBS, aka: DURATION_AKA });
const CAMERA_WORD_AKA = {
  'push in': ['move closer', 'zoom in slowly', 'tighten on the subject'],
  'slow push-in': ['creep closer', 'gradual zoom in', 'slow zoom'],
  'pull back': ['widen out', 'reveal the context', 'back away'],
  'zoom out': ['widen the shot', 'show the whole scene', 'back off'],
  dive: ['dive in', 'plunge toward', 'crash toward a target'],
  follow: ['track the subject', 'pan to keep up', 'follow the action'],
  sweep: ['sweep across', 'truck sideways', 'lateral move'],
  tour: ['multi-stop flight', 'visit several spots', 'station to station'],
  'pan stations': ['stop at each station', 'guided tour', 'sequential pan'],
  circle: ['orbit the subject', 'swing around', 'rotate around'],
  'ui focus zoom': ['zoom to a control', 'focus on a panel', 'highlight a UI element', 'camera push-in onto a UI region', 'push in on a button or panel'],
  'punch in': ['crash zoom', 'sudden zoom in', 'hard cut closer'],
  shake: ['camera jolt', 'impact shake', 'screen shake'],
  'drift hold': ['handheld hold', 'breathing camera', 'never fully still'],
};

export const CAMERA_WORD_REGISTRY = defineRegistry('camera word', CAMERA_WORDS, { slot: 'cameraMove.move', blurbs: CAMERA_BLURBS, aka: CAMERA_WORD_AKA });

/**
 * resolveSeconds(v): a duration slot's value, whatever spelling it arrived in.
 *   a number  → itself (a scene that names 0.42 keeps naming 0.42)
 *   absent    → itself, so the caller's own default still decides
 *   a word    → its seconds
 *   anything else → throws, naming the words and the near misses
 * Idempotent, so a lowering pass may run twice over the same data.
 */
export const resolveSeconds = (v) => {
  if (v == null || typeof v === 'number') return v;
  return DURATION_REGISTRY.pick(v);
};

/** resolveCameraMove(name): a move name passes through; a shot word becomes its move name. */
export const resolveCameraMove = (name) => {
  if (typeof name !== 'string') return name;
  return Object.prototype.hasOwnProperty.call(CAMERA_WORDS, name) ? CAMERA_WORDS[name] : name;
};

// ---- COMPARATIVE: a word → a direction, stepping the DURATION ladder ----------------------------
// A user often names a word relative to what is already there ("make it faster", "a touch slower")
// rather than an absolute duration. There is nothing to alias: this is not a sixth DURATION entry, it
// is a DIRECTION over the ladder DURATION already is. `Object.keys(DURATION)` is already ordered
// instant..luxurious by its own seconds, so "one step" needs no new data.
//
// FEEL carries no such order and is deliberately left out: its words are curve SHAPES, not degrees of
// one scale (`heavy` is not "more" of `snappy`; the closest thing to an order, ring/overshoot on
// `pop`→`bouncy`→`elastic`, covers 3 of 11 words and would leave the other 8 with no honest step).
// Comparative duration words are the case that fits the data; comparative feel words are not, so they
// stay out rather than force an order the registry does not already carry.
export const COMPARATIVE = { faster: -1, slower: 1 };

const COMPARATIVE_BLURBS = {
  faster: 'one step toward `instant` on the duration ladder: whatever is there now, a touch quicker.',
  slower: 'one step toward `luxurious` on the duration ladder: whatever is there now, more deliberate.',
};

const COMPARATIVE_AKA = {
  faster: ['quicker', 'snappier', 'speed up', 'speed it up', 'tighten the timing'],
  slower: ['more deliberate', 'slow down', 'slow it down', 'ease off', 'give it more time'],
};

export const COMPARATIVE_REGISTRY = defineRegistry('comparative duration word', COMPARATIVE,
  { slot: 'enterDur / exitDur / duration (relative)', blurbs: COMPARATIVE_BLURBS, aka: COMPARATIVE_AKA });

// The stepping ladder is the five ORIGINAL words, not every DURATION key: `productive`/`expressive`
// are a REGISTER choice (which MD3/Carbon tier this beat belongs to), a fixed pair, not a point on the
// single generic speed dial, so "one step toward instant" does not have an honest answer for them the
// way it does for `medium`. Same argument the FEEL exclusion above already makes, one word set over.
const DURATION_LADDER = ['instant', 'fast', 'medium', 'slow', 'luxurious'];

/**
 * resolveComparative(word, current): one step along the DURATION ladder from `current`.
 *   word: `faster` or `slower` (the canonical spellings; `aka` on the registry is a SEARCH index for
 *     `make arsenal` only, same as every other registry here, never a second spelling this accepts).
 *     An unknown word throws, same contract as every other resolver in this file.
 *   current: the value the step is relative to, a number of seconds, a DURATION word, or absent
 *     (defaults to `medium`, the engine's own default entrance). Snapped to the ladder's NEAREST step
 *     first, so a hand-typed 0.5s steps from `slow` (0.6s), the closest named rung, not from an
 *     unratcheted 0.5.
 * CLAMPS at either end rather than throwing: "faster" than `instant` stays `instant`. A silent clamp
 * is normally the exact failure this file refuses (core/registry/registry.js), but there is nowhere
 * else for the step to land, an end of a five-word ladder is the ladder's own edge, not an unknown
 * value being guessed at. No consumer resolves this automatically yet (nothing in a scene or a harness
 * tool names a layer's OWN prior value to step from); it is reachable today only by calling it directly
 * or through `make arsenal Q="snappier"`.
 */
export function resolveComparative(word, current) {
  const dir = COMPARATIVE_REGISTRY.pick(word);
  const seconds = current == null ? DURATION.medium
    : typeof current === 'number' ? current : resolveSeconds(current);
  let idx = 0, bestDiff = Infinity;
  DURATION_LADDER.forEach((w, i) => {
    const diff = Math.abs(DURATION[w] - seconds);
    if (diff < bestDiff) { bestDiff = diff; idx = i; }
  });
  const next = Math.min(DURATION_LADDER.length - 1, Math.max(0, idx + dir));
  return DURATION[DURATION_LADDER[next]];
}

/**
 * verifyVocab({ easings, cameraMoves }): every word's target still exists.
 * Called by lib-test rather than at import time: this file must stay a leaf (core/motion.js imports
 * it), so it cannot import the registries it aliases. A rename on the far side is caught by the
 * gate, not by a crash inside a render worker.
 */
export function verifyVocab({ easings, cameraMoves }) {
  const bad = [];
  for (const [w, target] of Object.entries(FEEL)) if (!easings.includes(target)) bad.push(`feel "${w}" → missing easing "${target}"`);
  for (const [w, target] of Object.entries(CAMERA_WORDS)) if (!cameraMoves.includes(target)) bad.push(`camera "${w}" → missing move "${target}"`);
  return bad;
}
