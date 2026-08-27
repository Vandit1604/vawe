// blueprints/index.mjs: the BEAT REGISTRY. Blocks give you a COMPONENT (a card, a chart); a blueprint
// gives you a whole BEAT's directed MOTION. Compose a video from beats and the good choreography is the
// default, so the agent never regresses to plain fades (the failure the direction floor gates).
//
// Placed in a scene as { "type": "beat", "beat": "<name>", "start": s, "dur": s, ...props } and expanded
// by scripts/author/expand-blocks.mjs (make expand), the same path blocks use. Docs: docs/CRAFT/BLUEPRINTS.md.
import * as Beats from './beats.mjs';
// The PICTORIAL beats, kept in their own files because three agents authored them in parallel and two
// agents on one file is how a merge eats somebody's work. Split by where the motion was harvested
// FROM, which is also how they group: `beats-track` is higgsfield's hand-keyed tracks, `beats-punct`
// is brew's scale punctuation. `beats-collage` is brew's dense object layouts.
import * as Collage from './beats-collage.mjs';
import * as Track from './beats-track.mjs';
import * as Punct from './beats-punct.mjs';

export * from './beats.mjs';
export * from './beats-collage.mjs';
export * from './beats-track.mjs';
export * from './beats-punct.mjs';
export * from './kit.mjs';

// name → factory. A beat factory is pure (props → array of scene-layer JSON) and takes at least {start, dur}.
export const BEATS = {
  kineticHook: Beats.kineticHook,       // hook / open loop: eyebrow + hero count-up|word + kinetic subline
  statReveal: Beats.statReveal,         // payoff: hero count-up + kinetic label
  cardCascade: Beats.cardCascade,       // feature grid: kinetic title + cards that pop in one after another
  chipGrid: Beats.chipGrid,             // named things (sources/tools) as pills that pop staggered + footer
  terminalReveal: Beats.terminalReveal, // a CLI beat: typing command + cursor + rising output + accent result
  screenDive: Beats.screenDive,         // product surface: kinetic title + a real UI shot that KEN-pushes in
  logoLockup: Beats.logoLockup,         // brand: mark pops + wordmark travels + kinetic headline + sub
  logoReveal: Beats.logoReveal,         // brand: mark DRAWS on / MELTS from a blob + bloom + wordmark cascade
  verdictProof: Beats.verdictProof,     // claim proven: typing command + note + tone verdict chip
  ctaEnd: Beats.ctaEnd,                 // held end card: mark + install chip + sub + url (exitDur 0)
  typedHook: Beats.typedHook,           // hook that ERASES itself: types in, un-types ~2x faster, never fades
  morphButton: Beats.morphButton,       // the object that BECOMES the next thing: button shrinks/rounds to a dot
  propSentence: Collage.propSentence, // a sentence whose NOUNS are pictures: word · photo · chip · card · word, on a rolling stagger
  slotSwap: Collage.slotSwap,           // three fixed slots whose contents turn over N times; the right slot changes TYPE each pass
  recordedPan: Track.recordedPan,       // a surface wider than the frame scrolled on an IRREGULAR linear track, riders welded
  echoRing: Track.echoRing,             // a stroked ring replaying another layer's path one beat late, fading as it grows
  scrollStory: Track.scrollStory,       // a taller-than-frame surface whose CONTENT scrolls under a static tilt, stop by stop
  focusRack: Track.focusRack,           // a rack focus: one plane pulls sharp on the layer blur channel while the other blurs AND dims
  wordBlast: Punct.wordBlast,           // scale punctuation: arrives oversized, settles, drifts, leaves by growing THROUGH the frame
};

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
};
