// blueprints/index.mjs: the BEAT REGISTRY. Blocks give you a COMPONENT (a card, a chart); a blueprint
// gives you a whole BEAT's directed MOTION. Compose a video from beats and the good choreography is the
// default, so the agent never regresses to plain fades (the failure the direction floor gates).
//
// Placed in a scene as { "type": "beat", "beat": "<name>", "start": s, "dur": s, ...props } and expanded
// at LOAD time by core/expand.js, the same path blocks use; no separate step. Docs: docs/CRAFT/BLUEPRINTS.md.
import { withBlurb, blurbsOf, defineRegistry } from '../core/registry.js';
import * as Beats from './beats.mjs';
// The PICTORIAL beats, kept in their own files because three agents authored them in parallel and two
// agents on one file is how a merge eats somebody's work. Split by where the motion was harvested
// FROM, which is also how they group: `beats-track` is higgsfield's hand-keyed tracks, `beats-punct`
// is brew's scale punctuation. `beats-collage` is brew's dense object layouts.
import * as Collage from './beats-collage.mjs';
import * as Track from './beats-track.mjs';
import * as Punct from './beats-punct.mjs';
// The MINED beats: harvested by `make mine` from grammar/*.json (studied real films), never invented.
// See docs/CRAFT/BLUEPRINTS.md "Mined blueprints" and grammar/_mined-shapes.json for the source shots.
import * as Mined from './beats-mined.mjs';

export * from './beats.mjs';
export * from './beats-collage.mjs';
export * from './beats-track.mjs';
export * from './beats-punct.mjs';
export * from './beats-mined.mjs';
export * from './kit.mjs';

// name → factory. A beat factory is pure (props → array of scene-layer JSON) and takes at least {start, dur}.
export const BEATS = {
  kineticHook: withBlurb('hook / open loop: eyebrow + hero count-up|word + kinetic subline', Beats.kineticHook),
  statReveal: withBlurb('payoff: hero count-up + kinetic label', Beats.statReveal),
  cardCascade: withBlurb('feature grid: kinetic title + cards that pop in one after another', Beats.cardCascade),
  chipGrid: withBlurb('named things (sources/tools) as pills that pop staggered + footer', Beats.chipGrid),
  terminalReveal: withBlurb('a CLI beat: typing command + cursor + rising output + accent result', Beats.terminalReveal),
  screenDive: withBlurb('product surface: kinetic title + a real UI shot that KEN-pushes in', Beats.screenDive),
  logoLockup: withBlurb('brand: mark pops + wordmark travels + kinetic headline + sub', Beats.logoLockup),
  logoReveal: withBlurb('brand: mark DRAWS on / MELTS from a blob + bloom + wordmark cascade', Beats.logoReveal),
  verdictProof: withBlurb('claim proven: typing command + note + tone verdict chip', Beats.verdictProof),
  ctaEnd: withBlurb('held end card: mark + install chip + sub + url (exitDur 0)', Beats.ctaEnd),
  typedHook: withBlurb('hook that ERASES itself: types in, un-types ~2x faster, never fades', Beats.typedHook),
  morphButton: withBlurb('the object that BECOMES the next thing: button shrinks/rounds to a dot', Beats.morphButton),
  propSentence: withBlurb('a sentence whose NOUNS are pictures: word · photo · chip · card · word, on a rolling stagger', Collage.propSentence),
  slotSwap: withBlurb('three fixed slots whose contents turn over N times; the right slot changes TYPE each pass', Collage.slotSwap),
  recordedPan: withBlurb('a surface wider than the frame scrolled on an IRREGULAR linear track, riders welded', Track.recordedPan),
  echoRing: withBlurb("a stroked ring replaying another layer's path one beat late, fading as it grows", Track.echoRing),
  scrollStory: withBlurb('a taller-than-frame surface whose CONTENT scrolls under a static tilt, stop by stop', Track.scrollStory),
  focusRack: withBlurb('a rack focus: one plane pulls sharp on the layer blur channel while the other blurs AND dims', Track.focusRack),
  wordBlast: withBlurb('scale punctuation: arrives oversized, settles, drifts, leaves by growing THROUGH the frame', Punct.wordBlast),
  // ---- MINED (from grammar/*.json via `make mine`, see docs/CRAFT/BLUEPRINTS.md) -------------------
  blurResolveHook: withBlurb('a hook whose type arrives smeared with motion blur and snaps into focus, never sliding or fading', Mined.blurResolveHook),
  dialogueAccumulate: withBlurb('sans answered by serif word pairs that accumulate on a held frame, a dot as the joint, ending in a bloom', Mined.dialogueAccumulate),
  containerFill: withBlurb('a fixed frame that never moves while chips fill it in one at a time', Mined.containerFill),
  cardFan: withBlurb('cards arrive from one side and fan open in perspective around a fixed anchor', Mined.cardFan),
  listBuildRows: withBlurb('a vertical list that grows one row at a time under a fixed left rule', Mined.listBuildRows),
  chipConverge: withBlurb('chips scatter in from every side and then converge onto one point', Mined.chipConverge),
  cellMosaic: withBlurb('a grid of mixed cells that slides as one surface while each cell keeps its own content', Mined.cellMosaic),
  wordWipe: withBlurb('an oversized word crosses the whole frame motion-blurred, and its passage is the transition', Mined.wordWipe),
  wordmarkAssemble: withBlurb('the brand mark settles from scattered letters while small tiles drift at a different depth behind it', Mined.wordmarkAssemble),
  viewportTrio: withBlurb('the same subject shown at three sizes at once, the "it is really finished" payoff shot', Mined.viewportTrio),
};

// The descriptions used to be TRAILING `//` COMMENTS on the lines above, parsed back out of this file's
// own source by a regex in scripts/site/blueprints-catalog.mjs and by a second one in
// scripts/author/arsenal.mjs. Two parsers over one file, each of which silently found nothing for a beat
// whose line was formatted differently: the catalogue's pattern named `Beats.` alone and reported the
// beats declared from the three other modules as undocumented while they sat correctly commented two
// lines below. A comment is not a data structure. `withBlurb` puts the same sentence where the code can
// read it, and blurbsOf refuses at load for the beat that forgot one, which is what both regexes were
// checking for after the fact.
export const BEAT_BLURBS = blurbsOf('blueprint beat', BEATS);

// The registry, and with it the catalogue section that was hand-listed in
// scripts/site/effects-catalog.mjs with its usage form and its no-preview reason a file further on.
// The known failure mode of a beat, printed by `make arsenal` under its blurb. Optional and seeded on
// the highest-traffic beats only: each line is a trap the doctrine already names, kept where an author
// reaching for the beat will see it. A key that is not a beat is refused at load (core/registry.js).
export const BEAT_PITFALLS = {
  kineticHook: 'a hook over ~12 words, or with more than one emoji, reads weak and the validator rejects it. Front-load the strong word.',
  statReveal: 'a number the frame never SHOWS is worse than none. Back the stat with the real UI it comes from, do not only set it in type.',
  cardCascade: 'a uniform stagger on every card reads as a spec sheet, not a film. Vary the rhythm and let the most important card move last.',
  terminalReveal: 'a typed command with no visible consequence is a dead beat. Show what the command DID, not just that it ran.',
  screenDive: 'a KEN push onto a low-res or placeholder screen amplifies the flaw. Use a real captured surface at full resolution.',
  ctaEnd: 'a mark sized like a bullet beside the headline reads as punctuation. Give the logo real prominence on the end card (150px+).',
};

export const BEAT_REGISTRY = defineRegistry('blueprint beat', BEATS, { slot: 'layers[].beat', blurbs: BEAT_BLURBS,
  pitfalls: BEAT_PITFALLS,
  catalog: {
    title: 'Beat blueprints',
    tag: 'blueprint',
    intro: '`{ "type":"beat", "beat":"<name>", ... }`. A whole beat\'s directed motion, expanded at load. See BLUEPRINTS.md, and `make blueprints` for the props each takes and the sentence that ASKS for it.',
    usage: (n, { j }) => j({ type: 'beat', beat: n, start: 0.2, dur: 4.4, x: 160, y: 320, w: 1200 }),
    noPreview: 'a beat writes a whole cast of layers from content you supply. Run `make expand D=<file>` to see what it writes.',
  },
});

// HOW TO ASK FOR ONE, in prose. Their catalog entry ships as a SENTENCE you paste into a brief; ours
// shipped as JSON you paste into a scene. The difference matters at the moment a film is being planned,
// which is before any JSON exists: a storyboard beat can name a blueprint and say how it is adapted
// ("Use `slotSwap`, three passes, the right slot changes type each pass"), and the author then has a
// starting point instead of a blank beat. A description says what a beat IS; this says how to REACH for
// it. Kept beside BEATS, one map, checked for completeness the same way the descriptions are.
export const REQUESTS = {
  kineticHook: 'Open on a kinetic hook: eyebrow, one hero number or word that counts up, a subline that arrives word by word.',
  statReveal: 'Land the payoff as a hero stat that counts up under a kinetic label, and hold it.',
  cardCascade: 'Show the feature set as cards that pop in one after another under a kinetic title.',
  chipGrid: 'List the named things as mono pills that pop in staggered, with an accent footer.',
  terminalReveal: 'Show it working in a terminal: the command types itself, output rises, the result lands in the accent.',
  screenDive: 'Push the camera into the real product surface under a kinetic title.',
  logoLockup: 'Lock up the brand: the mark pops, the wordmark travels in, a kinetic headline over a sub.',
  logoReveal: 'Reveal the brand by DRAWING the mark on stroke by stroke, bloom, then cascade the wordmark.',
  verdictProof: 'Prove the claim: type the command, note the result, pop a tone-coloured verdict chip after it.',
  ctaEnd: 'End on a held card: the mark, the install line, the url, and no exit.',
  typedHook: 'Open with a line that types itself in and then UN-types faster than it arrived. It never fades.',
  morphButton: 'Make the button BECOME the next thing: it shrinks, rounds and sheds its label until it is a dot.',
  propSentence: 'Write one sentence across the frame with real objects as the nouns: word, photo, chip, card, word, on a rolling stagger.',
  slotSwap: 'Fix a row of slots and turn its contents over N times at the same offsets. The right slot changes TYPE each pass so it never reads as a table.',
  recordedPan: 'Pan a surface wider than the frame on an irregular linear track so it reads as a screen recording, with the cursor and callouts welded to it.',
  echoRing: 'Keep the frame alive through the slow change: a stroked ring replays the subject\'s path one beat late, fading as it grows.',
  scrollStory: 'Scroll a page taller than the frame the way a person scrolls it: hold the frame still, lean the surface on a static tilt, and stop at each real section in turn on one ease.',
  focusRack: 'Rack the focus between two planes: the near one pulls sharp while the far one blurs AND dims, one exchange, then settle sharp before the cut.',
  wordBlast: 'Punctuate with one word (or the mark) that arrives oversized, settles, creeps, then grows THROUGH the frame. It does not fade.',
  blurResolveHook: 'Open on a line that arrives smeared with motion blur and snaps into focus. It never slides, fades or scales.',
  dialogueAccumulate: 'Build the hook as sans/serif word pairs that accumulate on a held frame, a small dot joining each pair, then a bloomed payoff line.',
  containerFill: 'Hold a fixed frame on screen and fill it with chips one at a time. The frame is the constant; the count is the variable.',
  cardFan: 'Fan a stack of cards open from one side around a fixed anchor, each a touch later and a touch more rotated than the last.',
  listBuildRows: 'Grow a vertical list one row at a time under a fixed rule, never resetting what already landed.',
  chipConverge: 'Scatter a ring of chips in from every side, then converge them onto one point.',
  cellMosaic: 'Slide a grid of mixed cells as one surface while every cell keeps its own content, so words and pictures cross cell boundaries together.',
  wordWipe: 'Wipe the frame with one word roughly eight times the normal type size, motion-blurred, and land the reveal the instant it clears.',
  wordmarkAssemble: 'Assemble the brand mark from scattered letters while small tiles drift slowly at a different depth behind it.',
  viewportTrio: 'Show the same real surface at three sizes at once, the "it is really finished" payoff shot.',
};
