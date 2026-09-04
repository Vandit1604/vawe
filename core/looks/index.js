// core/looks/index.js: THE RUNNER. presets.js is DATA: the pass library (PASSES), the look
// definitions (LOOKS, one entry per look with its blurb), and the two routing tables (KNOB_ROUTES,
// PASS_READS). This file is the generic machinery around that data: it builds the look registry, merges
// a look's defaults with the author's `lookOpts` and positional `strength`, works out which knobs a
// given look can actually use (liveKnobs) and refuses the rest (assertKnobs), composes a look's passes
// into a CSS `filter` string + overlay list (resolveComposite), and applies the result to a built DOM
// layer (applyComposite). Adding a look means adding one entry to presets.js; nothing here changes.
// core/looks.js re-exports this whole surface so every existing importer keeps its `from './looks.js'`
// path. Mirrors core/backgrounds/ (fx.js + presets.js: data; index.js: runner).
//
// No per-frame work and no frame feedback here: resolveComposite is pure, so renderFrame(n) stays
// deterministic and `make probe` holds.

import { defineRegistry, blurbsOf } from '../registry.js';
import { PASSES, LOOKS, LOOK_AKA, KNOB_ROUTES, PASS_READS, clamp } from './presets.js';

// LOOKS and KNOB_ROUTES were the two public exports of core/looks.js's data half; PASSES, PASS_READS
// and LOOK_AKA stay module-private here exactly as they were before the split.
export { LOOKS, KNOB_ROUTES };

// Read off the looks themselves; blurbsOf throws at load naming any look that forgot one.
export const LOOK_BLURBS = blurbsOf('look', LOOKS);

// The registry, and with it the catalogue section that used to be hand-listed in
// scripts/site/effects-catalog.mjs beside the identical 31 names. The prose below is that section's,
// moved rather than rewritten: one fact, one owner.
//
// THE SLOT IS `filter`, AND IT IS SHARED WITH core/filters.js. That sharing is the whole reason this
// registry earns its keep: a look and a filter preset are written into the SAME JSON key, so an author
// who reaches for `filter: "duotone"` (a filter) while thinking of a look, or the reverse, gets a
// refusal that names which vocabulary the word does live in instead of a dead end.
export const LOOK_REGISTRY = defineRegistry('look', LOOKS, { slot: 'filter', blurbs: LOOK_BLURBS, aka: LOOK_AKA,
  catalog: {
    title: 'Composite looks (static)',
    tag: 'static',
    register: 'look',
    intro: '`filter:"<look>"`. A colour-grade / treatment on a layer (STATIC). One positional arg is always strength (`"neon:0.9"`); the rest ride in `lookOpts`. **`strength` is the only knob every look takes**, `color` (recolours glow, streak, leak, wash and light), `color2` (the other side of a colour split), `colors` (gradient-map stops), `grain` and `vignette` each need the matching pass, so they apply to some looks and not others. A knob a look cannot apply THROWS and names what that look does take, rather than being silently dropped; `liveKnobs(name)` in `core/looks/index.js` is the list.',
    usage: (n, { j }) => j({ type: 'image', src: 'assets/shot.png', x: 160, y: 140, w: 1600, filter: `${n}:0.9` }),
    noPreview: 'a grade needs a photographic source, and the index ships no photographs. See it on the looks clip on /showcase.',
  },
});

// merge look defaults ← lookOpts ← positional strength; strength stays a clamped master dial.
function mergeOpts(look, opts = {}, positional) {
  const merged = { ...look.d, ...opts };
  const strength = clamp(positional != null ? positional : merged.strength != null ? merged.strength : 0.7, 0, 1);
  merged.strength = strength;
  return merged;
}

// Which knobs this look can actually use: `strength` always, plus every routed knob at least one of
// its passes reads. Derived from the recipe, never restated, so adding a pass to a look widens what
// the look accepts without anyone remembering to update a list.
export function liveKnobs(name) {
  const look = LOOKS[name];
  if (!look) return [];
  const readable = new Set(look.p.flatMap(([passName]) => PASS_READS[passName] || []));
  return ['strength', ...Object.keys(KNOB_ROUTES).filter((k) => KNOB_ROUTES[k].some((t) => readable.has(t)))];
}

// A knob this look cannot use is an ERROR. Silently accepting it is how `color` came to do nothing on
// nineteen looks while three documents promised otherwise; the same reasoning, and the same wording,
// as the unknown-modifier throw in core/fx/index.js.
function assertKnobs(name, opts) {
  const keys = Object.keys(opts || {});
  if (!keys.length) return;
  const live = liveKnobs(name);
  const bad = keys.filter((k) => !live.includes(k));
  if (bad.length)
    throw new Error(`lookOpts: "${name}" does not use ${bad.map((k) => `\`${k}\``).join(', ')}, it takes: `
      + `${live.join(', ')}. A knob a look cannot apply would render a frame that looks plausible and `
      + `differs from what was asked, so it is refused rather than dropped.`);
}

// resolveComposite(name, opts, positional) → { filter, overlays } | null.
//   filter:   the CSS `filter` string (fns concatenated in pipeline order)
//   overlays: [{ bg, blend?, opacity?, radius? }] appended as inset child divs, in order
export function resolveComposite(name, opts = {}, positional) {
  const look = LOOKS[name];
  if (!look) return null;
  assertKnobs(name, opts);
  const o = mergeOpts(look, opts, positional);
  const s = o.strength;
  // The author's knobs, expanded into the private arguments they control. Written AFTER the fixed
  // bag, which is the whole fix: an override has to beat a default it does not share a spelling with
  // (`color` vs the bloom's `glowColor`). Empty unless the author passed something, so a scene with
  // no lookOpts resolves byte-identically to before.
  const routed = {};
  for (const knob of Object.keys(opts || {}))
    for (const target of KNOB_ROUTES[knob] || []) routed[target] = opts[knob];
  const fns = [];
  const overlays = [];
  for (const [passName, fixed] of look.p) {
    // A LOOK NAMING A PASS THAT DOES NOT EXIST IS A TYPO, NOT AN INSTRUCTION TO SKIP IT.
    // `if (!pass) continue` dropped the pass and rendered the look MISSING one of its effects, with
    // nothing said. The same shape as `ANIM[name] || fade` two files over, wearing a `continue`
    // instead of a `||`. LOOKS is our own data, so this can only ever fire on a typo we wrote, which
    // is exactly why it should throw at boot rather than ship a quieter look.
    const pass = PASSES[passName];
    if (!pass) {
      throw new Error(`look "${name}" names pass "${passName}", which does not exist. `
        + `Known passes: ${Object.keys(PASSES).sort().join(', ')}. `
        + `A missing pass renders the look without one of its effects and says nothing, so it is refused.`);
    }
    const out = pass({ ...o, ...(fixed || {}), ...routed }, s);
    if (out.fns) fns.push(...out.fns.filter(Boolean));
    if (out.overlays) overlays.push(...out.overlays);
  }
  return { filter: fns.join(' '), overlays };
}

export const LOOK_NAMES = LOOK_REGISTRY.names;

// The strength this look WOULD resolve to, given what resolveComposite would be given. Exported so a
// caller that has to SCALE a look (core/spectacle.js, pulling every competing dial down) multiplies
// the number the look really uses instead of keeping a second copy of the 0.7 default over there.
// null for an unknown name, so the caller can say so rather than silently scaling nothing.
export const baseStrength = (name, opts, positional) =>
  (LOOKS[name] ? mergeOpts(LOOKS[name], opts, positional).strength : null);

// base name of a filter spec ("neon:0.9" → "neon"); isLook tells util.js whether to route here.
export const lookName = (spec) => String(spec || '').split(':')[0].trim();
export const isLook = (spec) => LOOK_REGISTRY.has(lookName(spec));

// Apply a composite look to a built layer element (browser only). Sets the CSS `filter` on the layer
// and appends the look's overlay divs as inset children (ordered, pointer/layout-inert, radius-inherit).
// Idempotent: guarded so a re-apply is a no-op. Pure inputs → deterministic DOM.
export function applyComposite(el, spec, lookOpts) {
  if (!el || el.__lookApplied) return;
  const name = lookName(spec);
  const after = String(spec).slice(name.length + 1).trim();
  const positional = after !== '' && !isNaN(+after) ? +after : undefined;
  const resolved = resolveComposite(name, lookOpts || {}, positional);
  // `if (!resolved) return;` until now: a mistyped look applied NO look and left the layer ungraded,
  // with nothing said. util.js only routes here when isLook() already matched, so reaching this with a
  // null means the two disagree, which is worth a loud error, not a shrug. #361.
  // `pick` rather than a hand-written list: reaching here means isLook() and resolveComposite disagree,
  // and the registry's refusal also searches every OTHER vocabulary, so a name that is really a filter
  // preset or a sting says so instead of printing 31 looks and leaving the author to spot the absence.
  if (!resolved) LOOK_REGISTRY.pick(name);
  el.__lookApplied = name;
  // On an IMAGE layer the picture is the <img> inside the wrap, and the wrap already clips (it sets
  // overflow:hidden for `radius`/`ken`). Filtering the wrap put the glow passes OUTSIDE the picture:
  // a bloom is a drop-shadow, drop-shadows paint beyond the box, and nothing was there to stop them,
  // so `neon` on a photo lit up the container's border instead of the photo. Filter the <img> and the
  // wrap clips the bloom to the frame. Overlays stay on the wrap: they are inset:0 and inherit its
  // radius, which is exactly the coverage they want.
  const picture = el.classList?.contains('hs-img-wrap') ? el.querySelector('img') : null;
  if (resolved.filter) (picture || el).style.filter = resolved.filter;
  resolved.overlays.forEach((ov, i) => {
    const d = document.createElement('div');
    d.className = 'hs-look-ov';
    d.style.cssText = `position:absolute;inset:0;pointer-events:none;border-radius:inherit;z-index:${3 + i}`;
    d.style.background = ov.bg;
    if (ov.blend) d.style.mixBlendMode = ov.blend;
    if (ov.opacity != null) d.style.opacity = String(ov.opacity);
    el.appendChild(d);
  });
}
