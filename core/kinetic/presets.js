// core/kinetic/presets.js: the kinetic-type PRESET vocabulary, extracted out of core/type.js. Every preset is PURE in the unit's own local progress `u∈[0,1]`: it
// reads nothing about layout, measurement or the DOM. That purity is what made the lift possible -
// splitText/unitProgress/animateUnits stay in core/type.js because THEY touch the DOM and the clock;
// this file only maps a number to a style object (plus the two presets, decode/flap, whose subject is
// the text itself rather than a style, and so carry a small support function alongside them).
// core/type.js re-exports every name below, unchanged, so no importer of './type.js' has to move.
import { resolveEasing, clamp01, easeOutCubic, easeOutBack, easeOutSettle, spring, hashSeed, random } from '../motion/motion.js';
import { defineRegistry, blurbsOf, withBlurb } from '../registry/registry.js';

// Each preset carries its own one-liner, so adding a preset is ONE edit: the blurb rides the entry
// instead of sitting in a second map that agreed with this one only because a gate said so. Say what
// it LOOKS like and when to reach for it, not how the maths works, and carry the caution where there
// is one (`wave`/`shimmerWave` never settle). engine-doctrine/EFFECTS.md renders these lines verbatim.
// withBlurb, not a local Object.assign: two agents built this independently and each invented its own
// way to attach a blurb, which is precisely the duplication the change exists to remove. One
// mechanism for a FUNCTION entry (core/registry.js), and a plain `blurb:` key for a DATA entry
// like a look, where no helper is needed.
const preset = (fn, blurb) => withBlurb(blurb, fn);

// wght(n): one weight, said in BOTH channels, because the two are not interchangeable and neither
// alone is safe. `font-variation-settings` is the only one that can express 634, and 20 of the 31
// vendored woff2 carry a `wght` axis it drives continuously; on the other 11 (CourierPrime, the two
// InstrumentSerif cuts, IosevkaCharon, FiraSansExtraCondensed and the static inter-*/space-* subsets)
// it is SILENTLY IGNORED, which is this repo's most-logged bug shape. `fontWeight` is what those 11
// hear, so the ramp degrades to the nearest static cut instead of to a dead still.
// Rounded to 1 for the axis and to the CSS 100-step for the fallback: a value written every frame
// must be stable in u, and a float in a fallback nobody can interpolate buys nothing.
// NO `wdth`. Anybody is documented upstream as wdth+wght and core/tokens.css:58 repeats it, but
// fontkit reports ONE axis on the vendored subset and on all 19 others: the width axis did not
// survive subsetting. A width ramp would therefore be a no-op on every face this engine ships.
export const wght = (n) => {
  const v = Math.round(Math.max(100, Math.min(900, n)));
  return { fontWeight: String(Math.round(v / 100) * 100), fontVariationSettings: `'wght' ${v}` };
};


// ---------- presets: u∈[0,1] → style object (compositor-friendly props only) ----------
export const PRESETS = {
  // weight: the font's own `wght` axis IS the entrance. Every other preset here moves a glyph or fades
  // it; this one redraws the outline, which is the one register a static face cannot fake and the thing
  // current practice means by kinetic typography. Staggered per unit, the ramp reads as a CREST OF
  // WEIGHT travelling the headline rather than as a line of type arriving.
  //
  // ON THE 11 STATIC FACES IT STILL WORKS, and that is the reason wght() writes both channels:
  // `font-variation-settings` is silently ignored by a face with no axis, so on CourierPrime, the two
  // InstrumentSerif cuts, IosevkaCharon, FiraSansExtraCondensed and the static inter-*/space-* subsets
  // the `fontWeight` half lands instead and the ramp degrades to the nearest 100-step cut. Coarse, and
  // never a dead still, the failure this repo logs most.
  //
  // NO WIDTH TWIN. No face this engine ships keeps a `wdth` axis (core/tokens.css:58): the width axis
  // did not survive subsetting, so a width ramp would be a no-op on all 31 and is deliberately unbuilt.
  //
  // WEIGHT IS A LAYOUT PROPERTY whichever channel writes it, so the words after the one being drawn
  // shift as the crest passes. On a centred headline that reads as the line breathing; it is the cost
  // of the register, not a bug. Pair it with `split:"word"` and a stagger, and give the line room.
  weight: preset((u, { from = 200, to = 800, rise = 12 } = {}) => {
    const e = easeOutCubic(clamp01(u));
    return { opacity: clamp01(u * 2), ...wght(from + (to - from) * e),
      transform: `translateY(${((1 - easeOutSettle(clamp01(u))) * rise).toFixed(2)}px)` };
  },
    'the glyphs THICKEN into place along the font\'s own `wght` axis, a crest of weight travelling the line · the one register a static face cannot fake, and it degrades to the nearest static cut rather than to a dead still'),
  // rise + fade (default kinetic reveal)
  up: preset((u, { dist = 40 } = {}) => ({ opacity: clamp01(u), transform: `translateY(${((1 - easeOutSettle(u)) * dist).toFixed(2)}px)` }),
    'words/chars rise into place, no blur: the plain lift'),
  down: preset((u, { dist = 40 } = {}) => ({ opacity: clamp01(u), transform: `translateY(${(-(1 - easeOutSettle(u)) * dist).toFixed(2)}px)` }),
    'words/chars drop into place from above: the mirror of `up`'),
  // fade: opacity only, no transform at all. The neutral entrance nothing else undercuts, and because
  // it carries no motion it is also the neutral EXIT: play it with u reversed (a split unit's `exit`
  // does exactly that) and a word simply dissolves rather than travelling anywhere.
  fade: preset((u) => ({ opacity: clamp01(u), transform: 'none' }),
    'plain opacity fade, no motion at all: the neutral entrance, and the neutral exit reversed'),
  // typewriter: hard on/off (unit is fully in once its progress passes ~0)
  // the zero-motion preset: a hard snap on, no transform. `at` chooses WHERE in the entrance it
  // snaps (default 0 = the moment it starts). Raise it for a delayed hard cut in a staggered line.
  type: preset((u, { at = 0 } = {}) => ({ opacity: u > at ? 1 : 0, transform: 'none' }),
    'typewriter hard on/off, no transform: terminals, timers, code'),
  // scale up from small
  scale: preset((u, { from = 0.4 } = {}) => ({ opacity: clamp01(u * 2), transform: `scale(${(from + (1 - from) * easeOutBack(u)).toFixed(3)})` }),
    'punch in from small (overshoot)'),
  // blur + fade in
  blur: preset((u, { px = 16 } = {}) => ({ opacity: clamp01(u), filter: `blur(${((1 - easeOutCubic(u)) * px).toFixed(2)}px)` }),
    'resolve out of blur: calm, premium'),
  // rise + blur + fade, per unit: measured off a studied text-animation reference at 10fps, where each
  // letter lifts a short way while it sharpens, about 0.05s apart, settled in about 0.4s. The blur and the
  // lift share one ease, so a unit is never sharp while still travelling.
  blurUp: preset((u, { dist = 28, px = 12 } = {}) => { const e = easeOutCubic(clamp01(u));
    return { opacity: clamp01(u * 1.4), transform: `translateY(${((1 - e) * dist).toFixed(2)}px)`, filter: `blur(${((1 - e) * px).toFixed(2)}px)` }; },
    'letters lift and sharpen out of blur together: the default kinetic headline'),
  // springy bounce in
  // `settle` used to scale the spring INPUT (`u * settle * 2`) while spring's own omega is 2π/settle,
  // so the two cancelled and the dial did nothing (engine-doctrine/MISTAKES.md #115). Input is a constant now, so
  // settle drives the settle time as named; the constant 1.0 keeps the default (settle 0.5) identical.
  bounce: preset((u, { bounce = 0.5, settle = 0.5, dist = 60 } = {}) => { const s = spring(u, { bounce, settle }); return { opacity: clamp01(u * 3), transform: `translateY(${((1 - s) * dist).toFixed(2)}px)` }; },
    'springy bounce in: playful brands only'),
  // slide from a side
  slide: preset((u, { dir = 'left', dist = 80 } = {}) => { const k = 1 - easeOutSettle(u); const x = (dir === 'left' ? -1 : dir === 'right' ? 1 : 0) * k * dist; const y = (dir === 'up' ? -1 : dir === 'down' ? 1 : 0) * k * dist; return { opacity: clamp01(u), transform: `translate(${x.toFixed(2)}px, ${y.toFixed(2)}px)` }; },
    'slides in from one side (`dir`): pair it with the opposite exit'),
  // persistent sinusoidal wave (u is used as raw phase, not a one-shot). No `loop:true` needed: this
  // preset and `shimmerWave` are force-looped by name at animateUnits (core/type.js), so the
  // instruction this comment used to carry was redundant and read as a requirement.
  wave: preset((u, { amp = 14, phase = 0 } = {}) => ({ opacity: 1, transform: `translateY(${(Math.sin(u * Math.PI * 2 + phase) * amp).toFixed(2)}px)` }),
    'sinusoidal wave across units: a LOOP that never settles; ambient only'),
  // shimmerWave: a 3D traveling shimmer over live text (motion-primitives TextShimmerWave). Each glyph
  // rides a bump (translate + scale + rotateY + brightness) and the bump travels across the word via the
  // per-unit phase offset. Looping (u is raw phase); pair with a small `phaseStep` (~0.12) so the wave
  // reads as one crest moving, not every letter pulsing together. Pure in the phase → pure in n.
  shimmerWave: preset((u, { amp = 1 } = {}) => {
    const b = (1 - Math.cos(u * Math.PI * 2)) / 2;   // 0..1..0 bump over one cycle
    return { opacity: 1,
      transform: `perspective(600px) translateY(${(-8 * b * amp).toFixed(2)}px) translateZ(${(24 * b * amp).toFixed(1)}px) rotateY(${(12 * b * amp).toFixed(2)}deg) scale(${(1 + 0.12 * b * amp).toFixed(3)})`,
      filter: `brightness(${(1 + 0.5 * b).toFixed(3)})` };
  },
    'looping light wave (per-unit): a 3D crest travelling across the word; never settles'),
  // 3D flip-up per unit (cards/letters somersault into place)
  // a 3D card flip in. `axis` picks the hinge (x = top-over, y = door-swing) and `deg` the start
  // angle (bigger = more severe). Defaults reproduce the old fixed behaviour exactly.
  flip: preset((u, { axis = 'x', deg = 80 } = {}) => {
    const a = (1 - easeOutCubic(u)) * -deg;
    const rot = String(axis).toLowerCase() === 'y' ? `rotateY(${a.toFixed(1)}deg)` : `rotateX(${a.toFixed(1)}deg)`;
    return { opacity: clamp01(u * 1.5), transform: `perspective(900px) ${rot}` };
  },
    '3D flip-up per unit, letters somersault into place: `axis` picks the hinge'),
  // fall from above with gravity (accelerating), tiny overshoot squash at landing
  fall: preset((u, { dist = 90 } = {}) => { const e = easeOutBack(clamp01(u)); return { opacity: clamp01(u * 2), transform: `translateY(${(-(1 - e) * dist).toFixed(2)}px)` }; },
    'falls from above under gravity and lands with a small squash'),
  // elastic pop: springy scale with visible wobble
  elastic: preset((u, { bounce = 0.62, settle = 0.5 } = {}) => { const s = spring(clamp01(u) * 1.2, { bounce, settle }); return { opacity: clamp01(u * 3), transform: `scale(${(0.3 + 0.7 * s).toFixed(3)})` }; },
    'elastic scale pop with visible wobble: playful brands only'),
  // skew slide: italic shear that straightens as it lands (editorial/sporty)
  skew: preset((u, { dist = 70 } = {}) => { const k = 1 - easeOutCubic(clamp01(u)); return { opacity: clamp01(u * 1.4), transform: `translateX(${(-k * dist).toFixed(2)}px) skewX(${(-k * 14).toFixed(1)}deg)` }; },
    'italic shear that straightens as it lands: editorial, sporty'),
  // focus pull: heavy blur + slight over-scale resolving to crisp
  focus: preset((u, { px = 22 } = {}) => ({ opacity: clamp01(u * 1.3), transform: `scale(${(1 + (1 - easeOutCubic(clamp01(u))) * 0.06).toFixed(3)})`, filter: `blur(${((1 - easeOutCubic(clamp01(u))) * px).toFixed(2)}px)` }),
    'focus pull, heavy blur and over-scale resolving to crisp, dreamy, premium'),
  // decode: deterministic scramble -> resolve (tech reveal; hero words only). Uses data-final
  // stashed by animateUnits on first call; character choice = hashSeed(unit index, step), pure.
  decode: preset((u) => {
    const uu = clamp01(u);
    return { opacity: uu > 0 ? 1 : 0, __decode: uu, transform: 'none' }; // resolved in animateUnits (needs textContent)
  },
    'scramble→settle, techy'),
  // tilt: small rotate-in + rise (sporty/editorial)
  tilt: preset((u, { deg = 8, dist = 26 } = {}) => { const e = easeOutSettle(clamp01(u)); return { opacity: clamp01(u * 1.4), transform: `translateY(${((1 - e) * dist).toFixed(2)}px) rotate(${((1 - e) * -deg).toFixed(2)}deg)` }; },
    'each unit rises and swings upright from a small angle, sporty and editorial. A flat rotation, not a 3D hinge: `flip` is the one that turns'),
  // stretch: horizontal smear that snaps true (impact words)
  stretch: preset((u, { from = 1.6 } = {}) => { const e = easeOutCubic(clamp01(u)); return { opacity: clamp01(u * 2), transform: `scaleX(${(from + (1 - from) * e).toFixed(3)})`, filter: `blur(${((1 - e) * 6).toFixed(2)}px)` }; },
    'horizontal smear that snaps true: impact words'),
  // gradient sweep: background-clip text, gradient slides through (ONE hero word per film)
  gradient: preset((u, { c1 = '#8a8f98', c2 = '#ffffff' } = {}) => { const pos = (100 - clamp01(u) * 100).toFixed(1); return { opacity: 1, backgroundImage: `linear-gradient(100deg, ${c1} 20%, ${c2} 50%, ${c1} 80%)`, backgroundSize: '250% 100%', backgroundPosition: `${pos}% 0`, webkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent', transform: 'none' }; },
    'gradient sweeps through letterforms'),
  // highlight: marker band grows behind the unit (emphasis mid-sentence)
  highlight: preset((u, { color = 'rgba(255,220,90,0.35)' } = {}) => { const w = (clamp01(u) * 100).toFixed(1); return { opacity: 1, backgroundImage: `linear-gradient(${color}, ${color})`, backgroundRepeat: 'no-repeat', backgroundSize: `${w}% 78%`, backgroundPosition: '0 60%', transform: 'none' }; },
    'marker highlight sweep'),
  // colorWave: a wave of the accent sweeps THROUGH a phrase word by word - each unit appears in the
  // accent colour and settles to the resting one. Split by word with a stagger (or staggered per-layer)
  // so the wave travels along the line.
  //
  // IT WAS CALLED `inkflash`, and the name was the only ink in it. The effect was extracted from the
  // Brew launch film (engine-doctrine/CRAFT/REFERENCE-STUDY.md), where a collage "lights EACH word orange in turn";
  // what was measured off that reference was a COLOUR WAVE, and that is faithfully what was built. The
  // name promised pigment hitting paper, so a bleed was later added to make the code match the word -
  // which is designing backwards from a label. Renamed to what it does, and the bleed removed with the
  // name that asked for it. A real ink effect is still unbuilt and should be built as itself.
  //
  // The two colours were `#ff742e` and `#1c1613`: the reference brand's accent and ink (themes/brew.json),
  // frozen into a preset every theme may use. They default to the THEME now. engine-doctrine/MISTAKES.md #354.
  //
  // `colors` IS THE SECOND MODE, added for madera's tagline (engine-doctrine/MISTAKES.md, recipes/recipes.json
  // "word-by-word"): "each word landing in its own colour before the line settles to one ink" is N
  // resting colours in flight at once, one per unit, which `flash`/`to` cannot express (they are a
  // single accent shared by every unit). `colors[i % n]` gives unit `i` its own arrival colour; `settle`
  // is what it eases to afterwards, held for `hold` first exactly as `flash` already is. Omitting
  // `settle` means the unit keeps ITS OWN colour forever, never mixing toward one ink, because "stay
  // this colour" has to be expressible without inventing a second dial that means "don't settle".
  // `flash`/`to` are ignored once `colors` is given, so the two modes never fight over one `color` write.
  colorWave: preset((u, { flash, to, hold = 0.5, colors, settle } = {}, i = 0) => {
    const e = easeOutCubic(clamp01((clamp01(u) - hold) / (1 - hold)));
    const base = colors ? colors[i % colors.length] : null;
    // The resting colour DEFAULTS TO THE LAYER'S OWN, not to `var(--ink)`. This preset paints `color` on
    // every unit every frame, so it overrides the per-window automatic ink that core/layers/util.js just
    // resolved, and `--ink` is the dark one in a white-first theme, so a colour-wave headline over a
    // dark bg window settled to invisible while the same headline without the preset read fine.
    // `--layer-ink` is that layer's settled colour, published by util.js. An explicit `to`/`settle` still wins.
    const f = base || flash || 'var(--accent)';
    // `colors` with no `settle` stays in its own colour: no mix, no fallback to the theme ink.
    if (base && settle == null) return { opacity: clamp01(u * 4), color: f, transform: 'none' };
    const rest = settle || to || 'var(--layer-ink, var(--ink))';
    return {
      opacity: clamp01(u * 4),
      // color-mix, not a hex lerp: the resting colour is usually the theme's, and a theme colour is only
      // known as a CSS variable at render time. The original mixHex could only take literals.
      color: `color-mix(in srgb, ${f} ${((1 - e) * 100).toFixed(1)}%, ${rest})`,
      transform: 'none',
    };
  },
    'the accent sweeps word by word along a line, each unit lighting then settling to the resting colour · `colors` gives EACH unit its OWN arrival colour instead of one shared accent, per-word colour before the line settles to one ink'),
  // underline: draws left -> right beneath the unit
  underline: preset((u, { color = 'currentColor', h = 3 } = {}) => { const w = (clamp01(u) * 100).toFixed(1); return { opacity: 1, backgroundImage: `linear-gradient(${color}, ${color})`, backgroundRepeat: 'no-repeat', backgroundSize: `${w}% ${h}px`, backgroundPosition: '0 100%', transform: 'none' }; },
    'a rule grows left to right along the baseline as the word lands, the marker under a heading'),
  // shadow: poster lift, long shadow collapses as the word settles
  shadow: preset((u, { dist = 14 } = {}) => { const k = (1 - easeOutCubic(clamp01(u))); return { opacity: clamp01(u * 1.5), transform: `translateY(${(-k * 6).toFixed(2)}px)`, textShadow: `0 ${(k * dist).toFixed(1)}px ${(k * dist * 1.6).toFixed(1)}px rgba(0,0,0,0.55)` }; },
    'a long poster shadow collapses as the word settles, poster statements'),
  // riseClip: the word rises out from behind a mask at its own baseline.
  // `dist` is a PERCENTAGE of the unit's own height, not px. It was 44px, which is a different
  // fraction of a 40px caption than of a 150px headline, at large sizes the word was already
  // half-visible at u=0, so the mask read as a smudge instead of an edge. A percentage is
  // self-scaling and needs no measurement, so the preset stays a pure function of u.
  riseClip: preset((u, { dist = 130 } = {}) => ({ opacity: 1, transform: `translateY(${((1 - easeOutSettle(clamp01(u))) * dist).toFixed(2)}%)` }),
    'the word climbs out from behind a hard edge at its own baseline, hidden until it clears the line. The clean editorial reveal'),
  // draw: an SVG stroke draws itself on. Pairs with splitText(el,'path'), which stamps
  // pathLength="1" so dash units are normalised. The offset is then a pure function of u with no
  // measurement. `back:true` draws from the far end. Hidden at u=0, exact identity at u=1 (dash
  // cleared, not left at 0, so the stroke renders as authored, dasharray:1 on a closed shape
  // would otherwise round-trip a hairline seam).
  draw: preset((u, { ease = 'easeOutCubic', back = false } = {}) => {
    // presetOpts arrive from JSON, so `ease` is a NAME here, not a function, resolveEasing takes
    // either. (Every other preset takes only numbers, so this is the first one that needed it.)
    const k = clamp01(u);
    if (k >= 1) return { opacity: 1, strokeDasharray: 'none', strokeDashoffset: '0' };
    const p = resolveEasing(ease)(k);
    return { opacity: k > 0 ? 1 : 0, strokeDasharray: '1 1', strokeDashoffset: (back ? p - 1 : 1 - p).toFixed(4) };
  },
    'stroke draw-on for SVG paths'),
  // chroma: chromatic-aberration entrance. R/G/B channels split apart (textShadow ghosts) and
  // converge as the unit settles to a CRISP glyph (residual 0 by default → no colour border at rest;
  // pass residual:>0 to leave a hair of fringe). The satisfying part is the misregistration resolving.
  chroma: preset((u, { dist = 16, rise = 10, residual = 0 } = {}) => {
    const e = easeOutCubic(clamp01(u));
    const off = ((1 - e) * dist + residual);
    const y = (1 - easeOutSettle(clamp01(u))) * rise;
    return { opacity: clamp01(u * 2), transform: `translateY(${y.toFixed(2)}px)`,
      textShadow: `${off.toFixed(2)}px 0 0 rgba(255,0,64,0.75), ${(-off).toFixed(2)}px 0 0 rgba(0,180,255,0.75)` };
  },
    'R/G/B ghosts split apart and converge to a crisp glyph'),
  // swing: each unit hinges down from its top edge and swings past centre with a spring, settling
  // upright (pendulum). Playful; good on short words / punchy brands.
  swing: preset((u, { deg = 24, bounce = 0.5, settle = 0.55 } = {}) => {
    const s = spring(clamp01(u), { bounce, settle });
    return { opacity: clamp01(u * 2.5), transformOrigin: 'top center', transform: `rotate(${((1 - s) * deg).toFixed(2)}deg)` };
  },
    'each unit hinges from its top edge and swings upright, playful, short words'),
  // unfold: each unit opens from edge-on (rotateY) about its left hinge to lie flat, a card/panel
  // turning to face you. Premium; reads well on serif or heavy display faces.
  unfold: preset((u, { deg = 90 } = {}) => {
    const e = easeOutCubic(clamp01(u));
    return { opacity: clamp01(u * 2), transformOrigin: 'left center', transform: `perspective(820px) rotateY(${((1 - e) * -deg).toFixed(1)}deg)` };
  },
    'opens from edge-on about its left hinge, a panel turning to face you, premium'),
  // strike: a rule DRAWS THROUGH the unit and the word dims behind it. This is the "not X, Y" beat,
  // and it is the half of it the engine could not say: rejecting a word out loud, on screen, so the
  // replacement means something. `grep strike core/` returned nothing before this entry.
  //
  // The rule is a BACKGROUND, not a border and not `text-decoration`: a background can be sized to a
  // percentage of the unit's own box, so the line grows across the word as a pure function of u, and
  // it needs no measurement of the glyphs. Same instrument as `underline` and `highlight`, aimed at
  // the middle of the line box instead of the baseline.
  //
  // THE DIM STARTS AFTER THE LINE HAS CROSSED (0.6), because a word that fades while it is being
  // struck reads as a word disappearing, not as a word being rejected. It must stay legible: "not X"
  // is only worth showing while X can still be read. `fade: 0` keeps it at full strength.
  strike: preset((u, { color = 'currentColor', h = 3, fade = 0.45, at = 54 } = {}) => {
    const p = clamp01(u);
    const w = (easeOutCubic(p) * 100).toFixed(1);
    return { opacity: (1 - fade * clamp01((p - 0.6) / 0.4)).toFixed(4),
      backgroundImage: `linear-gradient(${color}, ${color})`,
      backgroundRepeat: 'no-repeat',
      backgroundSize: `${w}% ${h}px`,
      backgroundPosition: `0 ${at}%`, transform: 'none' };
  },
    'a rule draws THROUGH the word and it dims behind the line, still legible. The "not X, Y" beat, where the rejection is the content'),
  // flap. A SPLIT-FLAP BOARD: the glyph steps FORWARD through the board's own alphabet, one flap at a
  // time, and lands on its letter. Every unit hinges as it turns, so a staggered line reads as a
  // mechanical row settling left to right.
  //
  // NOT `decode`. decode scrambles at random and resolves; the whole charm of a board is that the
  // sequence is ORDERED, so a viewer can see the letter coming three flaps out. Different rhythm
  // (mechanical, not techy) and a different read, which is why it is a second preset and not a knob.
  //
  // The character is mutated by flapText in animateUnits, the same seam `decode` uses, because a
  // preset returns a STYLE and the board's subject is the text. `steps` is how many flaps it runs, so
  // it is also the speed: the whole run is fitted into `each`, however many flaps you ask for.
  flap: preset((u, { steps = 12 } = {}) => {
    const p = clamp01(u);
    if (p >= 1) return { opacity: 1, transform: 'none' };
    // the hinge angle inside ONE flap, so the stutter has the same period as the character change
    const q = (1 - p) * steps;
    const frac = q - Math.floor(q);
    return { opacity: 1, transformOrigin: 'center center',
      transform: `perspective(420px) rotateX(${(-72 * frac).toFixed(2)}deg)` };
  },
    'the glyph steps FORWARD through the board\'s alphabet one flap at a time and lands on its letter, hinging as it turns. An airport board, ordered where `decode` is random'),
  // assemble. THE NAME IS THE POINT: in After Effects this is a Text Animator on Position +
  // Rotation driven by a Range Selector with Randomize Order on, and reading that recipe is what
  // stops it being built as a stack of hand-keyed layers. Three steps, and the third is the one
  // nobody guesses:
  //   1. every glyph starts at its OWN offset and its OWN rotation, not a shared one,
  //   2. the offsets are a FIXED random field, sampled once per glyph and held for the whole run,
  //      so the letters fly a straight path in rather than jittering,
  //   3. the arrival ORDER is shuffled. A left-to-right stagger reads as a line being typed; the
  //      scatter only reads as assembly when the glyphs land out of order.
  //
  // The field is `random(seed:i:axis)`, a hash of the unit index, so it is identical on every render
  // and at every seek. `Math.random()` here would break renderFrame(n) purity outright.
  //
  // Step 3 without a second timing mechanism: the preset spends part of its OWN window as a hashed
  // delay (`shuffle`) and fits the move into what is left. Nothing outside the preset changes, so
  // `each`/`stagger` keep meaning exactly what they mean for every other preset.
  //
  // `stagger: { from: "random" }` NOW EXISTS AND THIS IS STILL NOT IT. The audit read `shuffle` as the
  // missing ordering dial reported as a workaround, and half of that is right: `from` is the outer
  // clock's shuffle, and any preset can have it. `shuffle` is the INNER one, inside a single unit's own
  // window, so it still scatters at `stagger: 0`, which is how this preset is usually written. They
  // compose rather than duplicate, and folding one into the other would repaint every shipped
  // `assemble` layer to buy nothing.
  //
  // Pair it with `split: "char"`. On `split: "word"` it scatters whole words, which is a different
  // and much louder gesture: one hero line per film.
  assemble: preset((u, { dist = 220, spin = 65, shuffle = 0.4, seed = 'assemble', blur = 6 } = {}, i = 0) => {
    const d = shuffle * random(`${seed}:${i}:d`);
    const p = clamp01((clamp01(u) - d) / Math.max(1e-3, 1 - d));
    const e = easeOutSettle(p);
    const k = 1 - e;
    const ang = random(`${seed}:${i}:a`) * Math.PI * 2;
    const rad = dist * (0.35 + 0.65 * random(`${seed}:${i}:r`));
    const rot = (random(`${seed}:${i}:s`) * 2 - 1) * spin;
    const st = { opacity: clamp01(p * 2),
      transform: `translate(${(Math.cos(ang) * rad * k).toFixed(2)}px, ${(Math.sin(ang) * rad * k).toFixed(2)}px) rotate(${(rot * k).toFixed(2)}deg)` };
    // the motion blur is what sells the travel; `blur: 0` turns it off for a face with fine hairlines
    if (blur > 0) st.filter = `blur(${(k * blur).toFixed(2)}px)`;
    return st;
  },
    'each glyph flies in from its OWN scattered offset and rotation and settles into the word, arriving in a shuffled order · the AE "text animator + randomize-order range selector" reveal. Pair it with `split: "char"`'),
};

// Read off the presets themselves; blurbsOf throws at load naming any preset that forgot one.
export const PRESET_BLURBS = blurbsOf('kinetic preset', PRESETS);

// decode support: scrambles textContent deterministically until u resolves each char L->R.
const GLYPHS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ023456789#$%&';

// THE CHARSET IS A DIAL EVERY REFERENCE EXPOSES AND OURS BAKED (engine-doctrine/CRAFT/PARITY-AUDIT.md). A brand
// scramble in numerals, or in block shading, is a different effect and was unreachable. Write a NAME
// from this table, or any string of your own glyphs.
export const DECODE_CHARS = {
  mixed: GLYPHS,
  upperCase: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  lowerCase: 'abcdefghijklmnopqrstuvwxyz',
  numbers: '0123456789',
  symbols: '!<>-_\\/[]{}=+*^?#$%&',
  blocks: '░▒▓█',
  binary: '01',
};
export const DECODE_CHAR_BLURBS = {
  mixed: 'capitals, digits and four symbols, the house default and the busiest of the sets',
  upperCase: 'capitals only, the calmest scramble and the one that keeps a headline reading as type',
  lowerCase: 'lowercase only, quieter still, and the right set under a lowercase headline',
  numbers: 'digits only, for a counter, a price, a code or anything the film is about to state as a number',
  symbols: 'punctuation and operators, a terminal or a cipher rather than a word',
  blocks: 'four shades of block, so the word dissolves into a bar of noise instead of into other letters',
  binary: 'ones and zeros, the loudest cliche in the set, use it once and only where the subject IS binary',
};

// As STAGGER_FROM_REGISTRY (core/type.js): a registry so the arsenal search can find these, and no
// `pick`, because any string of your own glyphs is a legal charset too.
export const DECODE_CHARS_REGISTRY = defineRegistry('scramble charset', DECODE_CHARS,
  { slot: 'presetOpts.chars', blurbs: DECODE_CHAR_BLURBS,
  catalog: {
    title: 'Scramble charsets (`chars`)',
    tag: 'text',
    intro: 'What `preset: "decode"` scrambles WITH, in `presetOpts`: `{ "preset":"decode", "presetOpts": { "chars":"numbers", "rate":48, "revealDelay":0.25 } }`. A named set, or any string of your own glyphs. `rate` is refreshes per SECOND (so a slower reveal is no longer also a slower scramble) and `revealDelay` is the fraction of the window the unit stays fully scrambled before it starts resolving, which is what makes the effect read as decoding rather than as noisy type.',
    usage: (n, { text }) => text({ split: 'word', preset: 'decode', each: 0.9, presetOpts: { chars: n, rate: 48, revealDelay: 0.25 } }),
    preview: (n, { base, HERO }) => base({ layers: [{ ...HERO, split: 'word', preset: 'decode', each: 1.2, stagger: 0.12, presetOpts: { chars: n, revealDelay: 0.25 } }] }),
  },
});

// decodeText(el, u, unitIndex, opts): the scramble, PURE in u. The character choice is a hash of
// (unit, column, step), never Math.random(), so a backward seek is exact. That is the one axis this is
// ahead of every reference on, and it is why the dials below had to be added rather than borrowed.
//
// `rate` IS THE FIX THAT MATTERS. The step used to be `floor(u * 24)`: a fixed COUNT of refreshes
// across the window, so a 0.5s reveal scrambled at 48 characters a second and a 2s one at 12. The rate
// is the constant in every reference implementation and the duration is a separate decision. It is
// stated in refreshes per second and defaults to 48, which at the default `each` of 0.5s is the same
// 24 steps: no shipped frame moves.
export function decodeText(el, u, unitIndex, { chars = 'mixed', rate = 48, revealDelay = 0, each = 0.5 } = {}) {
  const set = DECODE_CHARS[chars] || (typeof chars === 'string' && chars.length ? chars : GLYPHS);
  if (el.__final == null) el.__final = el.textContent;
  const fin = el.__final, n = fin.length;
  if (u >= 1) { if (el.textContent !== fin) el.textContent = fin; return; }
  // revealDelay: the fraction of the window the unit holds FULLY scrambled before it starts resolving.
  // Without it the first character resolves on the first frame, so nobody ever sees a scrambled word
  // and the effect reads as noisy type. Default 0, which is exactly what shipped.
  const rd = Math.min(0.95, Math.max(0, revealDelay));
  const settled = Math.floor(clamp01((clamp01(u) - rd) / (1 - rd)) * (n + 1));
  const step = Math.floor(clamp01(u) * Math.max(0, each) * Math.max(0, rate));
  let out = '';
  for (let c = 0; c < n; c++) {
    if (c < settled || fin[c] === ' ') out += fin[c];
    else out += set[hashSeed(`${unitIndex}:${c}:${step}`) % set.length];
  }
  if (el.textContent !== out) el.textContent = out;
}

// flap support: the split-flap alphabet, and the ordered walk up to the final character. A board only
// carries the glyphs on its drums, so lowercase is shown as its capital while the drum is turning and
// the AUTHOR'S text is restored exactly at the end. A lowercase headline still renders as written.
// A character the board has no drum for (an emoji, a CJK glyph) never flaps: it is simply there.
const FLAPS = ' ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789.,:!?-/&$%+#@';
export function flapText(el, u, steps = 12) {
  if (el.__final == null) el.__final = el.textContent;
  const fin = el.__final;
  if (u >= 1) { if (el.textContent !== fin) el.textContent = fin; return; }
  // walk BACKWARDS from the target by the flaps still to run, so the drum arrives forward onto it
  const back = Math.ceil(clamp01(1 - u) * steps);
  let out = '';
  for (const ch of fin) {
    const idx = FLAPS.indexOf(ch.toUpperCase());
    out += idx < 0 ? ch : FLAPS[((idx - back) % FLAPS.length + FLAPS.length) % FLAPS.length];
  }
  if (el.textContent !== out) el.textContent = out;
}

// Defined after PRESETS so the map is complete. Gives the cross-registry hint: `preset:"popIn"`
// is told that popIn is a gsap effect, which is the mistake three shipped layers actually made.
// The words a person searches with that these blurbs cannot honestly carry. Each one is a query that
// returned NOTHING HERE CLEARLY MATCHES the day it was added, for a capability sitting right here.
// `aka` is never printed, so the blurb stays a sentence a reader can use and the index gets the synonym.
const PRESET_AKA = {
  // "typewriter typing text one letter at a time" found nothing. The blurb says typewriter and stops,
  // so every other word an author reaches for (typing, letters, keystroke) missed.
  type: ['typing', 'letters one at a time', 'keystroke', 'terminal caret'],
  // "cross a word out with a line through it" is what the beat is FOR, and `strikethrough` is the word
  // for it in every text tool. It appeared nowhere in the whole arsenal.
  strike: ['strikethrough', 'crossed out', 'struck through'],
  // "chromatic aberration colour fringing" found nothing. The effect's real name is not in our prose.
  chroma: ['chromatic aberration', 'rgb split', 'colour fringing'],
  // "per word colour" / "each word its own colour" named the madera tagline gap directly and the blurb
  // alone does not carry the phrase a person actually types for it.
  colorWave: ['per word colour', 'per-word color', 'each word its own colour', 'colour per word', 'words leave one by one'],
  // the neutral exit vocabulary: "leave the frame" already means something else (a whole-layer `out`),
  // so a query for a SPLIT UNIT leaving word by word needs its own words on the preset it defaults to.
  fade: ['word by word exit', 'words leave one by one', 'text disappears word by word', 'split exit'],
};
export const PRESET_REGISTRY = defineRegistry('kinetic preset', PRESETS, { slot: 'preset', blurbs: PRESET_BLURBS, aka: PRESET_AKA,
  catalog: {
    title: 'Kinetic text presets',
    tag: 'text',
    intro: '`split`+`preset` on a text layer. Words/chars reveal with motion. `{ "split":"word", "preset":"up", "each":0.4, "stagger":0.05 }`',
    usage: (n, { text }) => text({ split: 'word', preset: n, each: 0.5, stagger: 0.05 }),
    preview: (n, { base, HERO }) => base({ layers: [{ ...HERO, split: 'word', preset: n, each: 0.6, stagger: 0.06 }] }),
  },
});
