// blueprints/index.mjs — the BEAT REGISTRY. Blocks give you a COMPONENT (a card, a chart); a blueprint
// gives you a whole BEAT's directed MOTION. Compose a video from beats and the good choreography is the
// default, so the agent never regresses to plain fades (the failure the direction floor gates).
//
// Placed in a scene as { "type": "beat", "beat": "<name>", "start": s, "dur": s, ...props } and expanded
// by scripts/author/expand-blocks.mjs (make expand), the same path blocks use. Docs: docs/CRAFT/BLUEPRINTS.md.
import * as Beats from './beats.mjs';

export * from './beats.mjs';
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
};
