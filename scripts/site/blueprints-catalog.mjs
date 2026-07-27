// scripts/site/blueprints-catalog.mjs — browse the directed-motion BEAT blueprints before authoring.
// Introspects blueprints/index.mjs (no render): each beat's name, props it accepts, and what it emits.
// Token-efficient by design — it's the "reach for a blueprint" priming step (docs/CRAFT/BLUEPRINTS.md).
//   node scripts/site/blueprints-catalog.mjs   ·   make blueprints
import { BEATS } from '../../blueprints/index.mjs';

const DESC = {
  kineticHook: 'HOOK / open loop — eyebrow + hero count-up|word (pop) + word-by-word subline',
  statReveal: 'PAYOFF — hero count-up + kinetic label, held long',
  cardCascade: 'FEATURE GRID — kinetic title + cards that pop in one after another',
  chipGrid: 'NAMED THINGS — sources/tools as pills that pop staggered + accent footer',
  terminalReveal: 'CLI BEAT — typing command + cursor + rising output + accent result',
  screenDive: 'PRODUCT SURFACE — kinetic title + a real UI shot that KEN-pushes in',
  logoLockup: 'BRAND — mark pops + wordmark travels + kinetic headline + sub',
  verdictProof: 'CLAIM PROVEN — typing command + note + a tone verdict chip that pops',
  ctaEnd: 'HELD END CARD — mark + install chip + sub + url (exitDur 0)',
};

console.log(`\n  BEAT BLUEPRINTS · ${Object.keys(BEATS).length} directed beats  (compose a video as a sequence of these)\n`);
console.log(`  Place one as:  { "type": "beat", "beat": "<name>", "start": s, "dur": s, ...props }   → make expand\n`);
for (const [name, fn] of Object.entries(BEATS)) {
  const sig = /\(\s*\{([^}]*)\}/.exec(fn.toString());
  const props = sig ? sig[1].split(',').map((t) => t.split(/[:=]/)[0].trim()).filter(Boolean).join(', ') : '';
  console.log(`  • ${name}`);
  console.log(`      ${DESC[name] || ''}`);
  console.log(`      props: ${props}\n`);
}
console.log('  A blueprint fixes MOTION + structure, never copy/colour — two brands using one still differ.');
console.log('  Full doctrine + the reference reel: docs/CRAFT/BLUEPRINTS.md\n');
