// core/fx/progress.js — hand the layer the FILM's own progress, 0 at the first frame and 1 at the
// last, as a CSS custom property its markup can draw with. A runtime bar, a chapter dot that walks a
// rule, a ring that closes as the film ends, a readout of minutes remaining: all of them are one
// number, and until now that number did not exist anywhere a layer could reach.
//
//   "modifiers": [{ "progress": true }]                    // writes --film
//   "modifiers": [{ "progress": "--bar" }]                 // under your own name
//   "modifiers": [{ "progress": { "var": "--bar", "ease": "easeOutCubic" } }]
//
// NOT `vars`, and the difference is the whole point. `L.vars` interpolates over the LAYER's window,
// which is what an entrance wants; this is the FILM's clock, which is what a progress bar wants. An
// author could only fake it by writing the runtime into the layer as a literal — a second copy of a
// number the scene already owns, which is wrong the first time anyone adds a beat and says nothing.
// FIRST CONSUMER OF scene.clock: `t` and `duration` together are what `t` alone could never answer.
//
// WHY A CUSTOM PROPERTY. It is the one channel a modifier may write without contending with anything:
// transform, opacity and filter belong to the cross-cutting tracks (see the composition-order contract
// in core/fx/index.js), while a custom property is inherited by every descendant, so the layer's own
// CSS, an inline `calc()`, or an SVG attribute reads it and the modifier never touches layout. Written
// in full every frame and never read back, so a cold render and a warm one agree.

import { EASINGS, resolveEasing } from '../motion.js';

export const PROGRESS_KEYS = ['var', 'ease'];

function resolve(spec) {
  const s = spec === true ? {} : typeof spec === 'string' ? { var: spec } : spec;
  if (!s || typeof s !== 'object' || Array.isArray(s))
    throw new Error(`progress: expected true, a custom property name, or an object like `
      + `{ "var": "--bar" } — got ${JSON.stringify(spec)}. Keys: ${PROGRESS_KEYS.join(', ')}.`);
  for (const k of Object.keys(s))
    if (!PROGRESS_KEYS.includes(k))
      throw new Error(`progress: unknown key "${k}" — known: ${PROGRESS_KEYS.join(', ')}.`);
  const name = s.var == null ? '--film' : s.var;
  // A property name without the two dashes is not a custom property; CSS drops the declaration and
  // the layer draws with an unset variable, which looks exactly like the modifier never ran.
  if (typeof name !== 'string' || !name.startsWith('--'))
    throw new Error(`progress: \`var\` must be a CSS custom property, so it starts with "--" — got `
      + `${JSON.stringify(s.var)}. Anything else is silently discarded by the CSS parser.`);
  // resolveEasing WARNS on an unknown name and falls back to easeOutCubic. That is right for a prop
  // authored in a hundred scenes and wrong for this registry, where an unknown name is a hard error
  // (core/fx/index.js): a curve silently swapped is a bar that eases wrongly and reports nothing.
  if (s.ease != null && typeof s.ease !== 'function' && !EASINGS[s.ease])
    throw new Error(`progress: unknown easing ${JSON.stringify(s.ease)} — one of: ${Object.keys(EASINGS).join(', ')}.`);
  const ease = s.ease == null ? null : resolveEasing(s.ease);
  return { name, ease };
}

export function build(kit, el, L, spec) { resolve(spec); }

export function frame(kit, el, L, t, scene, spec) {
  const { name, ease } = resolve(spec);
  const { duration } = scene.clock;
  // A film with no length has no "how far through", and 0/0 would write NaN into the property, which
  // CSS discards without a word. Cannot happen through the normal path (duration is derived from the
  // last clip's end) but it is one authored `"duration": 0` away.
  if (!(duration > 0))
    throw new Error(`progress: the scene's duration is ${duration}, so there is no film to be a `
      + `fraction of. Give the scene a positive \`duration\`, or let it derive one from its layers.`);
  const u = Math.max(0, Math.min(1, scene.clock.t / duration));
  el.style.setProperty(name, (ease ? ease(u) : u).toFixed(5));
}
