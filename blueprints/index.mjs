// blueprints/index.mjs — the BEAT REGISTRY. Blocks give you a COMPONENT (a card, a chart); a blueprint
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
import * as Track from './beats-track.mjs';
import * as Punct from './beats-punct.mjs';

export * from './beats.mjs';
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
  recordedPan: Track.recordedPan,       // a surface wider than the frame scrolled on an IRREGULAR linear track, riders welded
  echoRing: Track.echoRing,             // a stroked ring replaying another layer's path one beat late, fading as it grows
  wordBlast: Punct.wordBlast,           // scale punctuation: arrives oversized, settles, drifts, leaves by growing THROUGH the frame
};
