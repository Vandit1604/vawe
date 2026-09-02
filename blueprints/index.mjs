// blueprints/index.mjs: the BEAT REGISTRY. Blocks give you a COMPONENT (a card, a chart); a blueprint
// gives you a whole BEAT's directed MOTION. Compose a video from beats and the good choreography is the
// default, so the agent never regresses to plain fades (the failure the direction floor gates).
//
// Placed in a scene as { "type": "beat", "beat": "<name>", "start": s, "dur": s, ...props } and expanded
// by scripts/author/expand-blocks.mjs (make expand), the same path blocks use. Docs: docs/CRAFT/BLUEPRINTS.md.
import { withBlurb, blurbsOf, defineRegistry } from '../core/registry.js';
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
export const BEAT_REGISTRY = defineRegistry('blueprint beat', BEATS, { slot: 'layers[].beat', blurbs: BEAT_BLURBS,
  catalog: {
    title: 'Beat blueprints',
    tag: 'blueprint',
    intro: '`{ "type":"beat", "beat":"<name>", ... }`. A whole beat\'s directed motion; `make expand`. See BLUEPRINTS.md, and `make blueprints` for the props each takes and the sentence that ASKS for it.',
    usage: (n, { j }) => j({ type: 'beat', beat: n, start: 0.2, dur: 4.4, x: 160, y: 320, w: 1200 }),
    noPreview: 'a beat writes a whole cast of layers from content you supply. Run `make expand` to see what it writes.',
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
};
