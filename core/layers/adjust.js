// core/layers/adjust.js, THE ADJUSTMENT LAYER: one grade applied to EVERYTHING BENEATH IT.
//
// Every other effect in this engine is per-layer. There was no way to say "desaturate the whole frame
// from here down", or "blur what is behind this card as it comes forward", without writing the same
// filter onto each of the fifteen layers it should cover and keeping them in agreement by hand. It is
// the one After Effects primitive genuinely missing here, and it is the reason a grade over a beat was
// never attempted: the cost was linear in the number of layers.
//
// THE MECHANISM IS ALREADY LOAD-BEARING, which is why this file is short. `backdrop-filter` reads the
// pixels BEHIND an element, and core/layers/util.js has used it for the GLASS look since the day that
// comment was written. An adjustment layer is that, sized to the frame, with no card: a transparent
// box whose only job is to filter what has already been painted under it.
//
// THE Z-ORDER CONTRACT, which is the whole of the design and is NOT new machinery. `track` is the
// layer's z-index and always has been. So:
//
//     BENEATH = every layer with a LOWER `track` than this one. Those are graded.
//     ABOVE   = every layer with a HIGHER `track`. Those are untouched, and that is how you keep a
//               headline crisp over a background you are blurring.
//
// A layer with no `track` gets its array index (films/scene/scene.js), so in a scene that never
// mentions `track`, "beneath" means "written earlier in `layers`". State `track` when the answer
// matters; leaving it to the array order is how a later edit silently moves the grade.
//
//   { "type": "adjust", "kind": "desaturate", "start": 2, "duration": 1.5 }
//   { "type": "adjust", "kind": "blur", "amount": 18, "track": 6 }
//   { "type": "adjust", "filter": "sepia(0.4) contrast(1.15)" }     // raw, for anything not named here
//
// KEYABLE WITH NO NEW MACHINERY. The CSS is written against `var(--adjust)`, which the build seeds from
// `amount`, so the existing `vars` track drives it and the grade ramps like anything else:
//
//   { "type": "adjust", "kind": "blur", "amount": 20,
//     "vars": { "--adjust": [0, 1] }, "varsDur": 0.8, "varsEase": "easeOutCubic" }
//
// That is deliberate rather than lazy: a second keying mechanism for one layer type would be the
// second-spelling fork this codebase logs as the source of most of its drift, and `vars` is already the
// answer to "animate a number the layer's own CSS reads".
import { defineRegistry } from '../registry/registry.js';
import { propsOf } from '../registry/props.js';

// Each kind is (unit) => the CSS filter, where `unit` is the string `calc(var(--adjust) * amount)` in
// whatever unit that kind needs. `--adjust` runs 0..1 and `amount` carries the strength, so a keyed
// `--adjust` always ramps from NOTHING to the authored grade, in every kind, in the same direction.
const KINDS = {
  // BLOOM IS THE ONE THAT NEEDED A NAME. Every other kind here REPLACES what is beneath it; a bloom has
  // to be blurred and brightened and then composited BACK OVER the sharp original, or the subject
  // disappears into its own halo. That takes three parts which are individually obvious and jointly
  // not: a blur, a brightness above 1, and `mix-blend-mode: screen` on the layer. Reached for by hand it
  // is easy to get two of the three and see nothing.
  //
  // Verified by render: text with a bloom adjust over it keeps its sharp glyphs AND gains a soft halo,
  // where the same filter without the blend erases the text completely.
  //
  // The blend is set in `build` rather than being part of this string, because it is a compositing mode
  // and not a filter, and putting it here would mean this table returned two different kinds of thing.
  bloom:      (u) => `blur(calc(${u} * 0.9px)) brightness(calc(1 + ${u} * 0.09)) saturate(1.25)`,
  blur:       (u) => `blur(calc(${u} * 1px))`,
  desaturate: (u) => `saturate(calc(1 - ${u}))`,
  darken:     (u) => `brightness(calc(1 - ${u} * 0.01))`,
  brighten:   (u) => `brightness(calc(1 + ${u} * 0.01))`,
  contrast:   (u) => `contrast(calc(1 + ${u} * 0.01))`,
};

// Defaults per kind, because the natural unit differs: blur is pixels, and the other three are
// percentages of their own scale. One shared default would make `darken` either invisible or total.
const AMOUNT = { bloom: 16, blur: 14, desaturate: 1, darken: 45, brighten: 30, contrast: 25 };

export const ADJUST_BLURBS = {
  bloom:      'a real GLOW over everything beneath: blurs it 16px, lifts brightness 9% and screens the halo back over the sharp original so the subject stays crisp',
  blur:       'soften everything beneath by 14px of blur. The rack-focus of a whole beat, not of one layer',
  desaturate: 'drain the colour beneath by 100%, its default `amount` of 1. 1 is fully grey',
  darken:     'dim everything beneath by 45%, its default `amount`, cutting brightness',
  brighten:   'lift everything beneath by 30%, its default `amount`, raising brightness',
  contrast:   'harden the tones beneath by 25%, its default `amount`, widening light against dark',
};

const ADJUST_AKA = {
  bloom: ['glow', 'halo', 'soft glow'],
  blur: ['soften', 'rack focus', 'defocus'],
  desaturate: ['grey out', 'drain color', 'black and white'],
  darken: ['dim', 'shadow the frame', 'dim it down'],
  brighten: ['lighten', 'lift the exposure', 'brighten up'],
  contrast: ['punch up contrast', 'harden tones', 'more contrast'],
};

export const ADJUST_REGISTRY = defineRegistry('adjustment', KINDS, { blurbs: ADJUST_BLURBS, aka: ADJUST_AKA, slot: 'kind',
  catalog: {
    title: 'Adjustment layers (grade what is BENEATH)',
    tag: 'per-layer',
    intro: '`{ "type":"adjust", "kind":"<name>" }`. One grade over every layer with a LOWER `track`, so a whole beat can go soft or grey from a single layer instead of the same filter written onto fifteen. `amount` is the strength in that kind\'s own unit, and the CSS reads `var(--adjust)`, so the existing `vars` track keys it: `{ "type":"adjust","kind":"blur","amount":20,"vars":{"--adjust":[0,1]},"varsDur":0.8 }`. A raw `filter` string is the escape hatch and is static.',
    // An adjustment layer is a LAYER, not a prop, and `track` is the whole contract: everything with a
    // lower track is graded, everything above it is untouched.
    usage: (n, { j }) => j({ layers: [{ type: 'adjust', kind: n, amount: 18, track: 6, start: 1.2, duration: 1.5 }] }),
    noPreview: 'a grade has no subject of its own: it is whatever is already under it. The arsenal shows them through the scenes that use them.',
  },
});

// The props are read off this signature (propsOf, core/props.js). `w`/`h` stay `L.x`: they are the
// shared box props every layer type accepts, not spelled out by this file's own declaration.
export function build(kit, el, L, { kind, amount, filter, blend } = L) {
  // NO GROUND OF ITS OWN, and this is not cosmetic. `backdrop-filter` composites what is painted behind
  // the element; give the element a background and it paints over the very pixels it is filtering, so
  // the grade lands on a solid colour and reads as nothing happening.
  el.style.background = 'none';
  el.style.pointerEvents = 'none';
  // FULL FRAME BY DEFAULT. A grade is normally the whole picture, and the frame is already in the kit
  // (core/layers/util.js seeds it from core/boot.js), so nothing here re-derives a canvas size. An
  // author who wants a graded REGION states w/h like any other layer.
  // WIDTH ARRIVES FROM THE SHARED BOX HELPER AND HEIGHT DOES NOT, which is a trap this layer fell
  // straight into. `w` is applied for every layer type; `h` is written by each type that wants it
  // (core/layers/rect.js does it on its first line). The first version of this file set a height ONLY
  // when the author omitted one, so an authored `h` was accepted and silently dropped: an adjust layer
  // given an explicit box measured 950x0 in the DOM, covered nothing, and produced a frame identical to
  // one with no grade at all. Every gate green.
  el.style.width = L.w == null ? `${kit.frame ? kit.frame.W : 1920}px` : `${L.w}px`;
  el.style.height = L.h == null ? `${kit.frame ? kit.frame.H : 1080}px` : `${L.h}px`;

  // The raw form wins, and it is NOT keyable: an author handing in a whole filter string owns it, and
  // rewriting somebody's CSS to thread a variable through it would be the engine editing author input.
  // `kind` is the keyable path and the message below says so rather than leaving it to be discovered.
  let css;
  if (filter != null) {
    css = String(filter);
    if (amount != null) throw new Error(`an adjust layer sets both \`filter\` and \`amount\`. `
      + `\`amount\` is the strength of a named \`kind\`, and a raw \`filter\` states its own strengths, `
      + `so the amount would be discarded. Drop one.`);
  } else {
    const name = kind ?? 'desaturate';
    const fn = ADJUST_REGISTRY.pick(name);   // an unknown kind is refused here, by name, at build
    const amt = amount ?? AMOUNT[name];
    if (typeof amt !== 'number' || !Number.isFinite(amt))
      throw new Error(`an adjust layer's \`amount\` is a number (the strength of "${name}"), got ${JSON.stringify(amt)}.`);
    el.style.setProperty('--adjust', '1');   // the seed `vars` overwrites; without it an un-keyed grade is nothing
    css = fn(`var(--adjust) * ${amt}`);
  }
  el.style.backdropFilter = css;
  el.style.webkitBackdropFilter = css;
  // SCREEN, so the halo ADDS to the sharp picture instead of standing in front of it. Only for `bloom`:
  // every other kind is a grade and a grade that blended would be a different effect wearing the name.
  // `blend` generalises this to a RAW `filter` too (a scene-wide bloom built from filters.js's own
  // `bloomFilter` has no named `kind` to hang the default on, so it states its blend explicitly).
  if (blend) el.style.mixBlendMode = blend;
  else if (filter == null && (kind ?? 'desaturate') === 'bloom') el.style.mixBlendMode = 'screen';
}

export const PROPS = propsOf(build);

// The catalogue row for this type (engine-doctrine/EFFECTS.md, `make effects`). core/layers/index.js refuses one without it.
export const blurb = "one grade over everything BENEATH it: blur, desaturate, darken, brighten or contrast the whole frame from a single layer, keyable through `vars` on `--adjust`";
