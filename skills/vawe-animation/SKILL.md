---
name: vawe-animation
description: "Make motion FEEL right in a vawe scene: the easing doctrine (smooth beats bouncy, ~3 easing characters per film), entrance/exit pairing, stagger as reading order, and the text-effect vocabulary. Load while authoring or tuning a scene JSON when motion reads floaty, monotone, or toy-like. Maps atomic motion rules onto this engine's primitives (core/motion/motion.js easings, type.js presets, gsap-effects.js)."
stage: direct
---

# vawe-animation: how motion should FEEL

Everything animates as a pure function of the frame (`core/motion/motion.js`). This skill is about the *feel*:
which easing, how long, in what order. The vocabulary is real and checkable (`make lib-test`).

## Easing is physics (never linear on a visible move)

- **Entrances DECELERATE** (ease-out family: `easeOutCubic/Quart/Expo`, `easeOutSettle`). They arrive and rest.
- **Exits ACCELERATE** (`easeInCubic/Quart`, `rush`): a layer leaves faster than it came.
- **Ambient loops are sinusoidal** (`easeInOutSine`); camera cruises `easeInOutCubic`, dives `easeOutQuart`.
- **Springs for pops.** `spring`/`spring-bouncy`/`spring-stiff` (bounce/settle) OR the iOS-parameterised
  `springEase({response, dampingFraction})`: **ζ=1.0 house default (no overshoot), 0.8-0.85 alive (a whisper),
  <0.55 don't** (visible bounce reads toy). Smooth beats bouncy for premium.
- **~3 easing characters per film.** A different easing on every layer reads as noise. Pick a small set and
  repeat it. That consistency IS the brand's motion personality (`themes/<brand>.json` `motion`).

## Timing & order

- **Stagger = reading order.** Related units enter one-after-another (60-120ms); the single most important
  element moves LAST or MOST. Motion order tells the eye what to read first.
- **`stagger.from` picks the wave shape**, not just `first`: `center`/`edges`/`last`/`random`, or
  `typewriter` (chars/sec at a fixed `cps`, not a shared budget, so a long and a short line still type
  at the same speed). Full table, generated, never restated here: [`engine-doctrine/EFFECTS.md`](../../engine-doctrine/EFFECTS.md)
  ("Stagger order").
- **Entry pace is a voice, not a constant.** Ambient elements drift (0.8-1.2s), payoffs snap (0.25-0.35s),
  thesis lines are luxurious (each 0.5+). Uniform 0.45s everywhere is the `monotone-timing` tell.
- **Settle and hold.** An entrance must reach TRUE rest (endpoints snapped to 0/1) and hold, a layer still
  drifting at its keyframe blurs text and reads unfinished.

## Text effect vocabulary (`split` + `preset`, or GSAP `fx`)

- **The full preset list is generated, never hand-copied here**: `core/kinetic/presets.js` (30+ presets:
  `up`, `scale`, `blur`, `decode`, `type` the hard on/off for terminals/timers, `wave`/`shimmerWave`,
  `draw`, `riseClip`, `colorWave` and more) is the source, [`engine-doctrine/EFFECTS.md`](../../engine-doctrine/EFFECTS.md)
  the regenerated catalogue (`make effects`). Pick by mood there, in `vawe-effects`'s mechanism table,
  not from a memorised subset, which is exactly how a preset added after this line goes unused.
- **GSAP char fx** (`core/engine/gsap-effects.js`): `charOvershoot`, `charBlurCascade`, `charFold`, `charTilt` on a
  `split` layer; idle loops `float`/`pulse`/`breathe`. Pair with `anim:"none"`.
- **A changing word belongs in a fixed box** (launch rule) so nothing reflows; the chip is the brand-colour spot.

## Pairing (the enter/exit contract)

- **Pair every entrance with a directional exit** (`anim:"slide-right"` + `out:"slide-left"`, one continuous
  travel, never enter-and-retreat, which the `enter-and-retreat` tell catches).
- **Blur out when moving would fight the content** (`out:"defocus"` for faces, dense grids, 50-element scenes).

Primitives are pure and tested (`make lib-test`). Effects catalog: `vawe-effects`. Doctrine: [`engine-doctrine/CRAFT/DIRECTION.md`](../../engine-doctrine/CRAFT/DIRECTION.md) · [`engine-doctrine/MOTION-CRAFT.md`](../../engine-doctrine/MOTION-CRAFT.md).
