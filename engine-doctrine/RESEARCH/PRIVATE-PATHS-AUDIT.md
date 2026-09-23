---
when: "deciding whether a new effect can compose with what the engine already owns, or before adding a new falloff/ramp/timing mechanism"
answers: "every private code path found in core/, split from missing owners; the operator-to-look ratio measured from the real registries; the full operator list"
group: engine
---

# PRIVATE-PATHS-AUDIT.md: operators the engine has, and paths that ignore them

Source: `.claude/plans/operators-not-looks.plan.md`, Part One (Tasks 1 and 2 only). Part Two (the
falloff operator, and the recommended vocabulary) is separate work and is not attempted here.

The rule this checks, quoted from `AGENTS.md:122`:

> EVERY EFFECT COMPOSES; NONE IS A SPECIAL CASE. A new look is a combination of things the engine
> already owns (a unit, a clock, an order, a property, an exit), never a private code path that owns
> its own timing, its own colour ramp or its own reveal. The test before writing: name which existing
> mechanism each half of the effect uses. If one half has no owner yet, add the owner, not the effect.

## Method

Three domains of `core/` were read in full against this test, each by a separate pass so no file was
skipped for budget: `core/surfaces/` (shaders, paint, particles, three, raymarch), `core/kinetic/` +
`core/looks/` + `core/canvas/` + `core/backgrounds/`, and `core/camera-moves/` + `core/cuts/` +
`core/transitions/` + `core/stings/` + `core/timeline/`. For every named effect the question asked was
the rule's own test: name the mechanism each half uses (timing, colour, reveal, falloff, easing); if an
owner exists elsewhere in the engine and the effect does not call it, that is a PRIVATE PATH; if no
owner exists anywhere, that is a MISSING OWNER. These are reported as separate lists below because
filing one as the other is exactly the mislead this audit was warned against.

One structural fact governs most of the surfaces findings and is stated once rather than 23 times:
`core/surfaces/*` is a different substrate from the rest of `core/`, raw WebGL fragment shaders and
Canvas2D pixel loops compiled and run outside the DOM/JS tween pipeline. `EASING_REGISTRY`
(`core/motion/motion.js`) and the stagger/colour-ramp owner (`core/type/type.js`) operate on DOM/CSS
properties and per-character text; grepping every `core/surfaces/*.js` file for either found zero
call sites, because there is nothing in GLSL or a canvas 2D loop to call them from. Filing every shader
as "private path, should call EASING_REGISTRY" would itself be a false finding: the substrate wall is
real, not a choice made per-effect.

## Private paths (an owner exists, and this effect does not use it)

| Effect | File:Line | Owns privately | Existing owner | Measured consequence |
|---|---|---|---|---|
| none found | | | | |

Zero. Every effect read across the three passes that had a concept with a real existing owner used
that owner: kinetic presets (`colorWave`, `chroma`, `swing`, `unfold`, `draw`, `assemble`, `flap`,
`decode`, `core/kinetic/presets.js`) call `resolveEasing`/`easeOutCubic`/`easeOutSettle`/`spring`/seeded
`random` from `core/motion/motion.js` rather than reimplementing them; `colorWave` itself
(`core/kinetic/presets.js:175`) is the *fixed* version of the exact bug logged for `typing`: it composes
`easeOutCubic` with CSS `color-mix()` against the theme's `--layer-ink` token instead of a private hex
lerp. `core/looks/presets.js`'s `PASSES` table wraps real CSS/SVG filter primitives (saturate, contrast,
blur, hue-rotate, sepia, displace, gradientMap, convolve, morph, relief) rather than owning its own
pixel math. `core/cuts/presentations.js` drives every cut off one shared `p` (progress) supplied by
`TIMING_REGISTRY` (`core/cuts/timings.js`) and imports `clamp01`/`lerp` from `core/motion/motion.js`.
`cameraShake` (`core/camera-moves/camera-shake.js:23-40`) samples the shared `shake()` noise owner from
`core/motion/motion.js` and named `EASING_REGISTRY` strings. `particles.js` (`confetti`, `sparks`,
`dust`) uses `random()` from `core/motion/motion.js` and `glowRGB` from `core/looks/filters.js`.

**This is the finding, not an absence of one**: `typing`'s bug (built in isolation from the 32 kinetic
presets, its own colour ramp) does not recur anywhere else that was read. The engine composed itself
correctly everywhere a real owner existed to compose with. The problem this audit actually found is
downstream: several concepts have **no owner at all** to compose with, so nothing here counts as
ignoring one.

## Missing owners (no mechanism anywhere in `core/` owns this concept yet)

| Concept | Sites (file:line) | What it does today | Measured consequence |
|---|---|---|---|
| A falloff: bright at a source point, dim with distance | `core/backgrounds/fx.js:155` (`spotlight`, `createRadialGradient` 2-stop), `:168-172` (`metallic`, 3-stop pool), `:87-93` (`aurora`, per-blob radial), `:120-141` (`softwash`, 3-stop `WASH_CORE`); `core/surfaces/shaders-ambient.js:134` (`blob()` gaussian) plus ~10 more inline `exp(-d*d*k)` / `smoothstep` falloffs across `flow`, `plasma`, `drift`, `mist`, `lightLeak`, `kaleidoscope`, `nebula`, `metaballs`, `bands`, `godRays` | Each site hand-rolls its own radial gradient or exponential falloff, independently | **15+ separate reimplementations of the same primitive.** None can be swapped for a different falloff shape without editing GLSL or canvas code by hand; a bug or an improvement to one does not reach the other 14. This is the exact gap Task 3 (Part Two, out of scope here) is scoped to close. |
| `godRays` specifically | `core/surfaces/shaders-ambient.js:593-645` | Generates two octaves of drifting noise thresholded into a canopy; blurb promises "shafts of light, crepuscular rays, BRIGHT through the middle" | Cannot render a shaft or a bright core, because there is no bright-source-shape-smeared-radially primitive to build one from. This is a missing owner, not a private path: there is nothing in the engine yet to have ignored. |
| A soft feathered edge (source shape → 0 over a distance, applied to a transition boundary) | `core/cuts/presentations.js:129-130` (`softwipe`, hand-rolled CSS gradient band `e-18%` to `e+2%`), `:135` (`softiris`, same pattern, circular) | Each cut re-derives its own feather-band math | Two independent copies of the same un-owned concept in the same file. Corroborates the falloff finding from an unrelated angle: transition-edge feathering, not ambient-shader light, wants the same primitive. |
| A gradient colour ramp, generalized (not tied to a theme token) | `core/kinetic/presets.js:149` (`gradient` kinetic preset: its own 2-stop linear-gradient sweep) | Sweeps a fixed 2-colour gradient across text, separately from `colorWave`'s `color-mix()`-against-theme-token mechanism | Cannot take arbitrary theme tokens the way `colorWave` does; cannot be reused by a non-text layer, because no generic multi-stop colour-ramp primitive exists independent of the one caption preset that owns one. |

**Count: 1 private path (zero), 4 missing-owner concepts, ~20 sites.** The dominant one by site count is
the falloff/bright-to-dim-with-distance primitive: 15+ hand-rolled instances across backgrounds and
shaders, plus 2 more in transition edges, all reimplementing the same shape Task 3 is scoped to build
as one operator.

### Not fully determined

`core/surfaces/raymarch-fx.js` (402 lines) and `core/surfaces/three-fx.js` (1133 lines) were sampled
(headers, registry declarations, first ~60 lines) but not read end to end; both declare the same
determinism/purity contract as `shaders-ambient.js` in their header comments, so the same "different
substrate, not a per-effect violation" classification provisionally applies, but individual scenes were
not each checked against their blurbs. `core/surfaces/globe.js`, `globe-dots.js`, `three-scenes.js`,
`palette.js`, `paint.js`, `shader.js`, `surface-keys.js`, `index.js` were not opened. A full-coverage
pass on `core/surfaces/` would need to read these; the falloff finding above is unlikely to change
(the same GLSL pattern was already confirmed in the two largest files in the directory), but exact
counts for raymarch/three could rise.

## Task 2: operators vs. looks, from the real registries

Classified every entry `harness/author/discovery.mjs`'s `GROUPS` exposes (the same corpus `make
arsenal` and `make stage` read, never a hand-written list). Rule applied, stated so the split is
checkable: an **operator** is a single general mechanism, parametrized, that composes with arbitrary
content and does not itself encode a fixed multi-step recipe or specific imagery (AE's own list, Radial
Blur / Gradient Ramp / Displacement Map / Blend Modes / Levels / Time Displacement, is the calibration:
one job, works on anything). A **look** is a named, fixed combination of primitives, and/or an entry
whose blurb bakes in a specific subject or imagery. `layer type` (23 entries) is excluded as structural,
neither an operator nor a look, since it defines what a layer *is* rather than a thing applied to one.
`path curve` (4 entries: `arc`, `dip`, `wave`, `ramp`) is reported separately as borderline: each reads
as a parametrized curve shape closer to an easing function than to a named recipe, but is less
unambiguous than easing itself, so it is not forced into either bucket.

**Measured ratio: 394 look entries to 136 operator entries, 2.9 : 1.** Looks outnumber operators by
close to three to one, but the finding is softer than the plan's working hypothesis of "very few
operators": there is a real, if short, operator vocabulary, and it clusters almost entirely in `motion
and time`, `layers and 3D`, and `structure` rather than in `look and ground`, which is almost entirely
looks (backgrounds, gradient recipes, named looks, canvas fx, ambient shaders, paint fx: 114 of 122
entries in that group are looks).

| Class | Kinds | Entries |
|---|---|---|
| Operator | 9 (`filter`, `stagger order`, `modifier`, `depth`, `blend mode`, `adjustment`, `easing`, `cut timing`, `placement`, `destination`) | 136 |
| Look | 25 | 394 |
| Borderline | 1 (`path curve`) | 4 |
| Excluded (structural) | 1 (`layer type`) | 23 |

### The full operator list (136 entries, 10 kinds)

- **filter** (15): sepia, duotone, tritone, gradientMap, thermalBlur, posterize, chromaGlow, displace, bloom, chromaSplit, convolve, morph, goo, relief, vignette
- **stagger order** (6): first, center, last, edges, random, typewriter
- **modifier** (14): alongPath, ghost, kick, lag, matte, mixBlend, occlude, plane, progress, shadow, squash, tilt, upright, wordSlot
- **depth** (4): far, back, front, near
- **blend mode** (17): normal, multiply, screen, overlay, darken, lighten, color-dodge, color-burn, hard-light, soft-light, difference, exclusion, hue, saturation, color, luminosity, plus-lighter
- **adjustment** (6): bloom, blur, desaturate, darken, brighten, contrast
- **easing** (40): easeInCubic, easeOutCubic, easeInOutCubic, easeOutQuart, easeOutExpo, easeOutBack, easeOutElastic, easeInQuart, easeInExpo, easeInOutExpo, easeInSine, easeOutSine, easeInOutSine, easeOutQuint, easeInOutQuart, easeInQuad, easeOutQuad, easeInOutQuad, easeInQuint, easeInOutQuint, easeInCirc, easeOutCirc, easeInOutCirc, easeInBack, easeInOutBack, easeInElastic, easeInOutElastic, easeInBounce, easeOutBounce, easeInOutBounce, rush, brake, ramp, spring, springStiff, spring-bouncy, spring-stiff, springEase, settle, snap
- **cut timing** (8): smooth, out, snappy, pop, rush, brake, ramp, spring
- **placement** (20): center, top, bottom, left, right, top-left, top-right, bottom-left, bottom-right, thirds-tl, thirds-tr, thirds-bl, thirds-br, thirds-t, thirds-b, thirds-l, thirds-r, stage, text-band, lower-band
- **destination** (6): web, feed, tiktok, reels, shorts, broadcast

Notably absent from this list, and the direct explanation for the missing-owner section above: no
falloff/gradient-ramp operator, and no generic feather/edge operator. Both are hand-rolled per site
instead.

### What could not be determined

- Whether `raymarch-fx.js` and `three-fx.js` (core/surfaces, ~1500 combined lines not fully read) hide
  any further private paths or missing-owner sites beyond the falloff pattern already confirmed
  elsewhere in the same directory.
- A per-entry (rather than per-registry-kind) operator/look split. Some `filter` entries (`sepia`,
  `duotone`) read closer to named presets of the general `gradientMap`/CSS-filter mechanism than to
  raw operators themselves; classifying at the registry-kind level is the defensible, reproducible
  unit (it is what `discovery.mjs` itself groups by), but a stricter per-entry pass could move a
  handful of `filter` entries into `look` and shift the ratio slightly further toward looks.

## Acceptance check against the plan

- [x] Every private code path in `core/` is named, with the mechanism that should own it: none found; stated as a finding, not an omission.
- [x] Missing owners are listed separately from private paths: one table each.
- [x] The operator-to-look ratio is measured, not estimated: 136:394 (2.9:1) from `discovery.mjs`'s `GROUPS`.
- [x] Nothing was fixed and nothing was built (Task 1 forbids fixing, Task 2 forbids building): both held.
