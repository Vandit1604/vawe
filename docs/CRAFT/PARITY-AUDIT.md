---
when: "you are about to reach for an effect we already ship, and want to know whether ours is any good"
answers: "seven of the most-demanded SaaS motion effects, each measured against the recipe practitioners publish, with a verdict and the concrete gap"
group: look
---

# Parity audit: are the effects we ship actually good?

`docs/CRAFT/SAAS-MOTION-DEMAND.md` found that nine of the ten most-demanded SaaS motion effects
already ship here. This audit asks the harder question about seven of them: **shipping is not the same
as doing it well.** Each was checked against the recipe practitioners publish, with numbers, then
against our implementation, read rather than trusted.

**Every verdict came out BEHIND on at least one axis.** That is the useful result. Two of the seven are
also genuinely AHEAD on a second axis, and both for the same reason: the purity rule forces a
closed-form implementation, which turns out to be more correct than the reference method rather than
less.

| effect | verdict | the number that decided it |
|---|---|---|
| stagger / offset reveal | BEHIND | the standard primitive ships three dials, we ship one |
| snappy overshoot | **BEHIND, fixed** | the `overshoot` handle peaked at exactly 1.000000 |
| text scramble | BEHIND on dials, AHEAD on determinism | refresh is a fixed count per window, so a 0.5s reveal scrambles at 48/s and a 2s one at 12/s |
| 2.5D parallax | BEHIND | `depth` appears in 1 of 170 scenes; 44 of 47 camera films sit entirely at z = 0 |
| device mockup | BEHIND | `metalness: 0.86` with no environment map anywhere in the file |
| animated gradient | **BEHIND on the default, fixed** | 57 to 105 seconds per cycle against a practitioner band of 6 to 12; now 11.4 to 20.9 |
| logo reveal | BEHIND | `fill: none` is set for the draw and never restored, so a mark cannot end filled |

**One was fixed the moment it was found.** The `overshoot` keyframe handle shipped with a positive
arriving speed, and `y2 = 1 - speed * influence` puts that control point BELOW the key, so the curve
peaked at exactly 1.000000 over 20,001 samples. It was a plain ease-in carrying an overshoot's blurb,
in a published, registry-named entry, and no gate reported it. `speed: -0.8` at influence 62 now peaks
at 1.1008, the 10 per cent practitioners state. `lib-test` asserts any handle promising an overshoot
samples above 1, and that the others do not.

---

## Part one: stagger, easing, text scramble

Uncommitted working note. Three of the seven effects in `docs/CRAFT/SAAS-MOTION-DEMAND.md`, checked
against how practitioners actually build them. Every claim about our code names a file and a line that
was opened. Numbers were re-measured here, not quoted from the demand sheet.

Population for the adoption counts: the 161 files in `formats/scene/` with `module == "scene"`
(`schema.json` excluded). That is the raw directory, not the 134 gate-visible set CLAUDE.md quotes, so
the counts here are an upper bound.

---

## 1. Stagger / offset reveal

### The standard recipe

- Per-item delay of 40 to 120ms is the band the SaaS write-ups give; Framer Motion's
  `staggerChildren` examples sit at 0.1s and Motion's own examples at 0.05s.
  <https://motion.dev/docs/stagger> · <https://www.svgator.com/blog/offset-delay-motion-design/>
- Three dials come with the primitive everywhere it is implemented, and only the first is the delay:
  `stagger(delay, { from, startDelay, ease })`. `from` defaults to `"first"` and takes
  `"center"`, `"last"` or an index. `ease` defaults to `"linear"` and redistributes the delays
  across the total stagger time. <https://motion.dev/docs/stagger>
- GSAP's stagger carries the same three plus `amount`, a TOTAL time the delays are divided into, and
  `grid`/`axis` for a two-dimensional order. `amount` is the dial that stops a long list from
  becoming a long shot.
- The count rule practitioners state: stagger five or six items, then bring the rest in together.
  <https://www.aninix.com/wiki/how-to-create-a-good-stagger-in-the-ui-animation>

### What we do

Two implementations, and they do not share a dial.

- Split text: `unitProgress` (`core/type.js:79`) is `u = clamp01((t - i * stagger) / each)`. Order is
  the DOM index `i`, always. Defaults resolved at `core/tracks/units.js:26`: `stagger` falls through to
  `kit.M.stagger`, which is `DEFAULT_MOTION.stagger = 0.045` (`core/motion.js:881`), and `each`
  defaults to 0.5s.
- `parts`: `formats/scene/scene.js:517` hands the spec to `gsap.fromTo` with
  `duration: p.each ?? 0.5, stagger: p.stagger ?? 0.07, ease: power3.out, delay: layer.start + (p.delay ?? 0.1)`.
- `core/effector.js:107` is a different primitive (falloff from a moving point, `radius` 300,
  `falloff: "smooth"`), correctly described in its own header as the thing a stagger cannot express.

Measured over the library: 365 split-text layers. Median stagger train
(`(n-1) * stagger + each`) is 0.62s and only 9 exceed 1.5s, so the shipped work is not broken. But
`linear-launch.json` splits 90 characters and the author hand-dropped `stagger` to 0.028 to keep the
train under 2.6s, and `product-feature-tour.json` did the same at 72 characters. That is the `amount`
dial being simulated by arithmetic in the scene file.

The 45ms default is in band and is a good default. Nothing else about the mechanism is a dial.

### Verdict: BEHIND

The delay is right and the two other dials the standard primitive ships with, ordering (`from`) and a
total-time cap (`amount`), do not exist in either implementation.

### The gap, concretely

Add both to `unitProgress` (`core/type.js:79`), which is the one owner both a split layer and any
future consumer read:

- `from`: remap `i` before the multiply. `"first"` (today's behaviour, the default), `"center"`,
  `"last"`, an index, and `"random"` seeded through `hashSeed(i)` so a seek stays exact.
- `amount`: when set, `stagger = amount / max(1, n - 1)`, so a 90-glyph headline and a 6-word one take
  the same wall time. This is what the two scenes above hand-computed.

For `parts` the fix is nearly free and is documentation plus validation, not code: GSAP already accepts
`{ each, from, amount, grid }` in the `stagger` slot, so `formats/scene/scene.js:517` passes an object
straight through today. Nothing says so and nothing validates it, which is the undocumented-capability
shape this repo logs. `formats/scene/schema.json` carries `stagger` as a bare name with no type.

### The step somebody would not guess

`from: "center"` is not a cosmetic reorder. On a headline it changes what the eye reads as the subject:
a left-to-right train reads as typing, a centre-out train reads as the word arriving as one object.
`assemble` (`core/type.js:363`) already knew this, and because the engine had no ordering dial it had
to spend part of its OWN window on a hashed delay to fake a shuffled arrival. That workaround is the
bug report.

---

## 2. Snappy ease with overshoot

### The standard recipe

- After Effects Easy Ease is influence 33.33 at speed 0. Overshoot is made by pushing a keyframe's
  bezier handle so the value passes its key and returns; it is a property of the velocity ARRIVING at
  the key, so easing INTO the key kills it.
  <https://mtmograph.com/blogs/tools/the-bounce-and-overshoot-animation-trick-every-motion-designer-should-know>
- The web equivalents are stated as spring constants. Framer Motion's default spring is stiffness 100,
  damping 10, mass 1, which is a damping ratio of 0.5 and a first overshoot of 16.3%.
  <https://www.framer.com/dictionary/spring-animation>
- SwiftUI's default is `response: 0.55, dampingFraction: 0.825`, which overshoots about 1%.
  <https://www.createwithswift.com/understanding-spring-animations-in-swiftui/>
- CSS `easeOutBack` peaks at 1.10, the de facto 10% figure.

### What we do

Measured, not read, by sampling each curve at 20,001 points:

| curve | file | peak | at t |
|---|---|---|---|
| `easeOutBack` | `core/motion.js` EASINGS | 1.1000 | 0.58 |
| `snap` / `easeOutSnap` (default LAYER entrance) | `core/motion.js:428` | 1.0152 | 0.48 |
| `settle` / `easeOutSettle` (default per-unit) | `core/motion.js:421` | 1.0006 | 0.90 |
| `spring` | `core/motion.js:411` | 1.0681 | 0.69 |
| `spring-bouncy` | `core/motion.js:412` | 1.2053 | 0.41 |
| `overshootEase(0.12)` | `core/motion.js:498` | 1.1200 | 0.54 |
| `overshootEase(0.30)` | `core/motion.js:498` | 1.2999 | 0.31 |
| **handle `overshoot`, either side or both** | `core/motion.js:230` | **1.0000** | 1.00 |

`overshootEase` is the strongest thing in this file. It inverts the second-order step response
`Mp = exp(-pi*zeta / sqrt(1 - zeta^2))` for zeta, so an author states the overshoot percentage they can
see and gets it: asked 12%, measured 1.1200; asked 30%, measured 1.2999. AE gives you a handle and you
find the percentage by eye.

`springEase({response, dampingFraction})` (`core/motion.js:83`) defaults `dampingFraction` to 1, so
`ease: "springEase"` overshoots by exactly zero. That is a defensible house default and it is two clicks
softer than both platform defaults it is modelled on (iOS 0.825, Framer 0.5).

The `overshoot` HANDLE is wrong. Its blurb (`core/motion.js:230`) says the value "sails past its key and
comes back". Its numbers are influence 62, speed 1.8. `handleCurve` (`core/motion.js:266`) builds
`cubicBezier(x1, speed*x1, 1-x2, 1-speed*x2)`, so on the arriving side y2 = 1 - 1.8*0.62 = -0.116, which
pulls the curve DOWN before the key and produces a plain ease-in. Peak 1.000000. A sail-past on the
arriving side needs a NEGATIVE speed: `{influence: 40, speed: -1}` measures 1.0885, and
`{influence: 40, speed: -0.5}` measures 1.0296.

Adoption: 4 scenes author a keyframe handle at all; `hang` appears in 4, `easyEase` in 2, `fling` in 2,
`overshoot` in 1.

### Verdict: BEHIND on the named handle, AHEAD on the ease

`overshootEase` beats the AE method because the number an author states is the number that renders. The
handle called `overshoot` does not overshoot, measured at 1.000000 against a blurb that promises a
sail-past.

### The gap, concretely

Change the `overshoot` entry at `core/motion.js:230` to a negative arriving speed. `{influence: 40,
speed: -1}` gives 8.8%, sitting between `easeOutBack` (10%) and `snap` (1.5%), and matches what the
blurb already claims. One scene uses it, so the blast radius is one file. Then add the assertion
`lib-test` does not have: every named handle whose blurb claims an overshoot must sample above 1.

### The step somebody would not guess

Overshoot on a graph-editor handle is a NEGATIVE arrival speed, not a fast one. Speed here is a multiple
of the segment's average velocity, and any positive multiple keeps the curve under its key. The value
has to be still moving the wrong way as it reaches the key, which is exactly what the AE sources mean
when they say easing INTO a key destroys the overshoot.

---

## 3. Text scramble

### The standard recipe

GSAP's ScrambleTextPlugin is the reference implementation, and its dials are:
`chars` (default `"upperCase"`, also `lowerCase`, `numbers`, or a custom string), `speed` (default 1, a
multiplier on how often the junk characters refresh), `revealDelay` (default 0, seconds the scramble
holds before letters start resolving), `delimiter` (default `""` for character-by-character, `" "` for
word-by-word), `rightToLeft` (default false). <https://gsap.com/docs/v3/Plugins/ScrambleTextPlugin/>

baffle.js states the same two primitives independently: a `characters` set and a `speed` in
milliseconds between obfuscation updates. <https://camwiegert.github.io/baffle/>

The consistent shape across all of them: the refresh is a RATE (updates per unit time), and the charset
and the reveal delay are the two things a brand actually changes.

### What we do

`decodeText` (`core/type.js:385`) with the `decode` preset entry at `core/type.js:202`.

- Charset: `GLYPHS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ023456789#$%&'` (`core/type.js:384`), 39 characters,
  hardcoded. Note it contains no `1`.
- Refresh: `step = Math.floor(clamp01(u) * 24)`, a fixed COUNT of 24 refreshes across the unit's whole
  window, not a rate. At the default `each` of 0.5s that is 48 refreshes per second, aliased down to 30
  by the frame rate. At `each: 2` it is 12 per second. So the scramble speed silently tracks the
  duration, which is the opposite of every reference implementation.
- Reveal: `settled = Math.floor(clamp01(u) * (n + 1))`, strictly left to right, no `rightToLeft` and no
  `revealDelay`.
- Determinism: `hashSeed(`${unitIndex}:${c}:${step}`)`, pure in u. This is genuinely better than the
  references, all of which use `Math.random()` and cannot be seeked.

**Nothing is exposed.** `animateUnits` (`core/type.js:443`) special-cases decode at line 454:
`if (preset === 'decode') { decodeText(el, u, i); ...; return; }`. `popts` is never passed, and
`decodeText` takes no options object at all, so `presetOpts` on a decode layer is silently inert. The
preset function at `core/type.js:202` declares a `{ i = 0 }` parameter that is never called.

Adoption is healthy: 12 of 161 scenes use `decode`, and `make arsenal Q="text scramble characters
resolve"` returns it.

One trap worth knowing: with `split: "char"` each unit is one character, so `n = 1` and
`settled = floor(u * 2)` is a hard swap at the halfway point. Decode is a word-split and line-split
effect; on a char split the left-to-right resolve comes entirely from the stagger.

### Verdict: BEHIND on the dials, AHEAD on determinism

Ours is the only one of the four that survives a backward seek, and its refresh count is baked at 24
with a charset baked at 39 characters, while the two dials every reference exposes are `chars` and a
refresh RATE.

### The gap, concretely

Give `decodeText` an options object and pass `popts` through at `core/type.js:454`:

- `chars`: a string, or one of the named sets. A brand scramble in numerals, or in `░▒▓█`, is a
  different effect and is currently unreachable.
- `rate`: refreshes per second, defaulting to 48 so no shipped frame moves (24 across the current
  default `each` of 0.5s). `step = Math.floor(t_local * rate)` instead of `Math.floor(u * 24)`. This is
  the fix that matters: today a slower reveal is also a slower scramble, and those are two decisions.
- `revealDelay`: a fraction of the window the unit stays fully scrambled before resolving.

### The step somebody would not guess

`revealDelay`. Without it the first character resolves on the first frame, so the viewer never sees a
fully scrambled word and the effect reads as noisy type rather than as decoding. The references all
carry it, and it is the one parameter whose absence you feel without being able to name.

---

## The single most valuable change

**Fix the `overshoot` handle at `core/motion.js:230`.**

It wins on the repo's own ordering, not on size. The other two gaps are missing expressiveness: an
author who wants a centre-out stagger or a numeral charset today writes something else and knows they
did. `overshoot` is a named, blurbed, registry-published thing that measurably does not do what its own
name says, at a peak of 1.000000, and nothing reports it. An author reaches for it, gets a plain
ease-in, sees a plausible frame, and concludes the engine's overshoot is weak. That is the silent
substitution class this codebase ranks above every other failure, and the fix is one number plus a
`lib-test` assertion that a handle promising an overshoot samples above 1.

The stagger `from`/`amount` work is the bigger feature and should follow it: it touches 365 layers and
the most-demanded effect in the demand sheet, but the current default of 45ms is correct, so it buys
range rather than repairing a wrong.

---

## Part two: parallax, device mockups, gradients, logo reveals

Scope: rows 6, 8, 9 and 10 of [`SAAS-MOTION-DEMAND.md`](SAAS-MOTION-DEMAND.md). All four are marked
**SHIPPED** there. Three of the four are not at parity. Adoption counts below are `grep -l` over the
170 files in `formats/scene/*.json` on this machine.

Every claim about our code names a file and a line I opened. Where a source publishes no number I say
so rather than inventing one.

---

## 1. 2.5D multi-plane parallax

### The standard recipe

The AE method is fixed and old. Cut the picture into depth planes, make each a 3D layer, push the near
ones toward the camera (negative Z) and the far ones away (positive Z), then **scale every layer back to
the size it had before you moved it** and fly the camera along Z. The scale step is not optional and it
is the step tutorials spend their words on: the pinhole camera magnifies by `zoom / distance`, so a layer
moved in Z changes size, and a multiplane rig where the planes changed size is a zoom rather than a
depth. Both of the popular helper tools exist to do exactly this one sum: pt_Multiplane distributes a
layered PSD in Z, and GenKiParallaxer adjusts Z and "tailors the scale to match the camera's field of
view".

Numbers: AE's own camera converts a focal length to a pixel zoom by `focal_mm * comp_width_px / 36mm`,
so a 50mm lens on a 1920 comp is a 2667px zoom, and the compensating scale for a layer at distance `z`
from the picture plane is `(zoom - z) / zoom`. No source publishes a preferred plane separation; it is
stated as a function of the comp.

Sources: https://motionarray.com/learn/after-effects/animate-flat-2d-images-after-effects/ ·
https://lesterbanks.com/2016/11/free-multiplane-tool-easy-effects-z-space/ ·
https://genkicomp.gumroad.com/l/GenKiParallaxer

### What we do

Two separate implementations.

**The DOM one.** `core/fx/plane.js:122` writes `translate: 0 0 <z>px` on the layer element, under a
camera rig whose default lens is 1600px (`formats/scene/scene.js:1080`, `persp: 1600`). Named depths at
`core/fx/plane.js:158`: `far -0.75`, `back -0.375`, `front 0.15`, `near 0.28`, all fractions of the live
lens, so `back` under the 1600px default is z = -600 and is drawn at 0.73x. `depthZ`
(`core/fx/plane.js:183`) prints the magnification of every name in its own refusal. `--plane-z` makes the
depth keyable through `vars` (`core/fx/plane.js:122-130`).

The compensation is explicitly refused. `core/fx/plane.js:147` says the fourth barrier "stays the
author's", and the header at `core/fx/plane.js:36-40` tells the author to divide by `(lens - z) / lens`
themselves.

**The three.js one.** `uiParallax` (`core/three-fx.js:225`) takes up to 6 planes, spaces them at
`z = -i * 0.9` world units, sizes every plane 2.4 wide, dollies the group by `travel ?? 2.2` over
`duration ?? 4`, and swings `swing ?? 0.18` rad on a 12.6s sine. Camera is `fov ?? 35` at
`dolly ?? 5.2` (`core/three-fx.js:864-865`). At those defaults the near plane is 5.2 units out and a
sixth plane is 9.7, a depth ratio of 1.87, so the strongest parallax available at defaults is
near travelling 1.87x the far.

Adoption: `"plane"` appears in 4 of 170 scenes, `"depth"` in 1, `uiParallax` in 2. `core/fx/plane.js:135`
records the same thing from its own census: 3 films of 134, while 44 of the 47 films that move the camera
have every layer at z = 0.

### Verdict: BEHIND

The one arithmetic step every AE multiplane tool automates is the one step we hand back to the author,
and the adoption number is what that costs: 1 scene of 170 uses a named depth.

### The gap, concretely

1. Add an opt-out compensation on `depth`/`plane`, for example `depth: {name:"back", hold:true}`, that
   multiplies the layer's own size by `(lens - z)/lens` at build so `back` renders at the size the author
   laid out. The value is already computed for the error message (`core/fx/plane.js:190`), so this is
   arithmetic that exists being applied instead of printed. `kick` owning scale is a real objection, but
   `kick` is an animated scale and this is a static size correction at build; they do not collide.
2. `uiParallax` hardcodes `const ar = 1.6` (`core/three-fx.js:233`) for every plane. A 16:9 capture
   (1.778) is squashed by 11% and a phone capture is unrecognisable. The texture knows its own aspect;
   read it.

### The step somebody would not guess

That the scale correction is what makes it a depth. Skipping it does not merely make layers the wrong
size, it converts the whole shot back into a zoom, because a uniformly magnified stack is what a zoom is.

---

## 2. Device mockup reveal

### The standard recipe

Nobody publishes tilt angles, which `SAAS-MOTION-DEMAND.md:52` already records and my search confirms.
The vendors describe the shape rather than the numbers: a device turns from an off angle and **settles**,
with the screen content playing, camera depth and lighting handled for you
(https://www.applaunchflow.com/3d-mockup-animation-generator ·
https://devmotion.app/tools/video-to-browser/saas). A 360 degree spin is the other named form.

The one number that is not a matter of taste is a rendering one: a metallic PBR body needs an environment
to reflect. `MeshStandardMaterial` at high metalness has almost no diffuse term, so with only punctual
lights it renders near black plus three specular hits
(https://threejs.org/docs/#api/en/materials/MeshStandardMaterial).

### What we do

`deviceShowcase` (`core/three-fx.js:193`). A rounded slab, 3.0 x 2.0 x 0.16 for `laptop` and
1.35 x 2.75 x 0.16 otherwise, plus a `PlaneGeometry` screen inset 0.13 (laptop) or 0.09, given
`MeshBasicMaterial` so the screen emits rather than lights (`core/three-fx.js:206`). Correct, and the
comment at `core/three-fx.js:203` records the bevel-depth bug it cost to get there.

Pose (`core/three-fx.js:210-216`): `rotation.y = sin(t * 0.45 * spin) * 0.55`, so yaw sweeps plus and
minus 31.5 degrees on a 14.0s period; `rotation.x = sin(t * 0.31 * spin) * 0.14`, plus and minus 8.0
degrees on 20.3s; plus a 0.045 unit float on a 10.5s period.

Lighting (`core/three-fx.js:114-117`): ambient 0.55, key 2.4, fill 0.9, rim 1.5. No environment map, no
tone mapping, no shadows anywhere in the file (I grepped `envMap|Environment|PMREM|toneMapping`: zero
hits).

Body material is `roughness: 0.34, metalness: 0.86` written as literals (`core/three-fx.js:199`), while
`PROPS` declares `metalness` and `roughness` (`core/three-fx.js:29`) and five other scenes honour them
(`:434`, `:576`, `:642`, `:661`, `:795`).

Adoption: `deviceShowcase` in 2 of 170 scenes.

### Verdict: BEHIND

Three faults, and the material one is measurable: metalness 0.86 with no environment map is a body with
no diffuse and nothing to reflect.

### The gap, concretely

1. **Silent no-op.** `L.metalness` and `L.roughness` are declared and ignored at
   `core/three-fx.js:199`. This is the exact shape CLAUDE.md forbids: an input accepted and dropped.
   One line, `roughness: L.roughness ?? 0.34, metalness: L.metalness ?? 0.86`.
2. **No environment.** Either add a small procedural env (three's `RoomEnvironment` through a PMREM) or
   drop the default metalness to about 0.2 so the punctual lights carry it. Today the default is a body
   that is mostly black between the three highlights.
3. **No reveal.** The pose is an unending sine that never lands, so this is a turntable, not the row-8
   effect ("the shot pulls back and the UI turns out to be inside a laptop"). Add a settle: yaw and pitch
   easing from an off angle to a held hero angle over `duration`, the same shape `uiParallax` already has
   at `core/three-fx.js:240-242`. Without it every use needs a camera move authored around it.
4. The `laptop` is a single slab. No base, no hinge, no keyboard. It reads as a tablet with a wide screen.
   A second slab hinged at the bottom edge is cheap and is what makes the silhouette say laptop.

### The step somebody would not guess

That the screen must be `MeshBasicMaterial` and the body must not. We already get that right and the
comment says why. The mirror of it, that a metal body without an environment is black, we got wrong.

---

## 3. Animated background gradient

### The standard recipe

The Stripe-lineage implementation is a plane geometry warped by fractal Simplex noise with a small number
of colour layers, not a stack of blurred radial blobs. `wave-gradient`, the open reimplementation,
defaults to amplitude 320, density `[0.06, 0.16]`, four colours, speed 1.25, seed 0, fps 24
(https://github.com/sa3dany/wave-gradient). The whole thing is about 10kb
(https://medium.com/design-bootcamp/moving-mesh-gradient-background-with-stripe-mesh-gradient-webgl-package-6dc1c69c4fa2).

The blob-and-blur shortcut is a documented alternative: radial-gradient divs inside a parent carrying
`filter: blur(40px)`. For pacing, the guides put a hero loop at **6 to 12 seconds per cycle**
(https://gradients.design/animated-gradient).

### What we do

Two families again.

**Shader.** `flow` is the documented premium default (`core/shaders-ambient.js:30`): a vertical base wash
plus three gaussian blobs mixed by `exp` falloff (`core/shaders-ambient.js:175-179`). The drift
coefficients WERE 0.06 to 0.11 rad/s, so the blob paths had periods of **57 to 105 seconds**. Palette is
up to 8 stops with optional positions, mixed in **OKLab** (`core/shaders-ambient.js:104-131`). The layer
takes `speed` (`core/layers/canvas.js:16`, applied at `:58`), default 1.

**Canvas backgrounds.** `aurora` (`core/backgrounds.js:77`) draws 2 to 4 radial blobs with
`globalCompositeOperation = 'lighter'`; default periods `px` 13 to 19s and `py` 14 to 22s, radii 480 to
620px, divided by `motionScale` (default 1). `softwash` (`core/backgrounds.js:113`) is the same idea
source-over, radii as fractions of the frame diagonal (0.21 to 0.34), with a deliberate core stop at
`WASH_CORE = 0.34` so each pool has a readable centre. The `mesh` preset passes `motionScale: 3.2`
(`core/backgrounds.js:428`), giving periods of 3.8 to 6.9s.

### Verdict: BEHIND on the default, PARITY on the machinery. FIXED.

The machinery is arguably ahead: OKLab mixing, positioned stops, aspect-relative radii and a
`motionScale` knob that shortens the period as it widens the drift are all things the blob shortcut does
not have. The default was the problem. `flow`, the one the file calls "the premium default", cycled in 57
to 105 seconds against the 6 to 12 second band, so in a 20 second film it traversed about a fifth of one
cycle. The repo already measured this class of defect: `core/backgrounds.js:87-90` records four
"living" presets at 0.02 to 0.14 median per-frame luma delta against `liquid`'s 0.96.

### What was done

The six coefficients are multiplied by 5 (`core/shaders-ambient.js`, the `u_fx==0` branch), so the
periods are **11.4 to 20.9s**. That is deliberately just SLOWER than the 6 to 12 second reference band:
a mesh gradient run inside 12s sloshes, and a backdrop that pulls the eye has stopped being a backdrop.
Judged on a strip at 1.0 / 3.5 / 6.0 / 8.5s, not one still, with high-contrast stops so the blobs are
readable; the field visibly reorganises across the strip and no adjacent pair reads as fast. Objectively,
mean per-frame luma delta at t=6s went from **0.027 to 0.094** (0 to 255 scale).

`make snap` was NOT cited: it compares the DOM and not pixels (`docs/MISTAKES.md` #532), so for a shader
it reports nothing whatever the coefficients say. One committed film names `flow`, `site-backdrop.json`,
and it sets `speed: 0.22`, so its net rate becomes 1.1x its old one and it is visually unchanged. That
scene is also the proof of the diagnosis: the dial worked, so the author corrected the default at the
call site instead of reporting it. `docs/MISTAKES.md` #544.

### The other 17 branches, surveyed and deliberately left

Only `plasma` (`t*0.14`, `t*0.11`, periods 45 to 63s) fails the same arithmetic the same way, and it is
the obvious next candidate. It was left because nobody has looked at what `plasma` should feel like, and
retuning a second effect on the strength of one measurement of a different one is how a default gets
replaced by a guess. `mist` is slow ON PURPOSE and says so in its blurb. `aurora` and `drift` advance a
NOISE field rather than a sine, so the period arithmetic above does not describe them and quoting it for
them would be wrong.

### The step somebody would not guess

Mixing in OKLab rather than sRGB. We already do it and `core/shaders-ambient.js:104-116` is honest that
it cannot rescue near-complementary pairs.

---

## 4. Logo reveal / motion identity

### The standard recipe

Trim Paths. Convert the mark to a shape layer, add Trim Paths, key **End** from 0 to 100%, use Easy Ease
on both keys and Round Caps, and use **Offset** and staggered starts so element N begins as element N-1
finishes (https://www.topcoder.com/thrive/articles/using-trim-paths-in-after-effects-to-create-simple-animation ·
https://www.meganfriesth.com/learn/logoanimation). Typical clip length is **2 to 5 seconds**
(https://filmora.wondershare.com/video-editor-review/animate-stroke-in-after-effects.html).

The part that decides whether it looks like a logo animation or a school exercise: the stroke is a
**matte**, not the artwork. The drawn stroke reveals the real filled logo through an Alpha Matte, so the
mark ends as itself. A write-on that ends as an outline has not revealed the logo.

### What we do

`core/layers/svg.js`. `draw` sets `pathLength = 1`, `stroke-dasharray: 1 1`, `stroke-dashoffset: 1`
(`:49-52`) and animates the offset to 0 over `draw.dur ?? 1.2` with `easeOutCubic`, hardcoded
(`core/layers/svg.js:76-77`). `stroke-linecap: round` (`:36`), matching the recipe. Weight defaults to 3
(`:48`). `morph` is a true point-lerp: both paths resampled to `morph.points ?? 180`, aligned by
`bestRotation`, with an optional `spin` (`core/layers/svg.js:57-68`).

`logoReveal` (`blueprints/beats.mjs:111`) wraps that: a bloom at attack 0.55 / decay 1.5 / peak 0.4
starting at +0.6s, then either a 1.5s morph or a 1.3s draw at weight 3 starting at +0.3s, then a wordmark
cascade at +1.7s with `each: 0.42, stagger: 0.05`.

Note the task's framing is off in one place: `core/morph.js` is **TextMorph**, letters migrating between
two words (`core/morph.js:1`). The shape morph is `core/path-morph.js`, reached from the `svg` layer.

Adoption: `logoReveal` in 1 of 170 scenes, `logoLockup` in 0, `"draw"` in 10, `"morph"` in 3.

### Verdict: BEHIND

`core/layers/svg.js:46` sets `fill: none` when `draw` is present, and `frame()` never restores it, so a
mark that draws on **can never end as the filled logo**. That is the matte half of the standard recipe
missing entirely, and it is why `draw` is an outline effect here rather than a logo reveal.

### The gap, concretely

1. **Resolve the fill.** After `u >= 1`, or on a `draw.fill` window, cross-fade the path's fill in and the
   stroke out. Roughly five lines in `frame()` at `core/layers/svg.js:78`, and it needs the built fill
   colour stashed at build since `:46` currently discards it.
2. **Expose Start, not just End.** Trim Paths has Start, End and Offset; we animate the equivalent of End
   alone. `draw: {from, to}` covers the common case of a stroke that travels rather than grows.
3. **Ease.** `easeOutCubic` is hardcoded at `core/layers/svg.js:77`, so the write-on starts at maximum
   speed. The standard is Easy Ease at both ends. Take `draw.ease` and default it to an in-out.
4. **One path only.** `L.d` is a single `d`, so a multi-element mark has to be flattened into one compound
   path and gets no per-element stagger. `parts`-style sequencing over several `<path>` children is the
   shape, and `core/parts.js` already owns staggered entrances.
5. `logoReveal`'s 1.3s draw sits below the 2 to 5 second band. Defensible in a 20 second film, so I would
   change it last, and only after the fill resolves.

### The step somebody would not guess

That the stroke is a matte for the finished logo rather than the drawing itself. Everything about our
implementation follows from having missed that: forcing `fill: none`, having no fill to resolve to, and
treating the draw as the whole effect rather than its first half.

---

## The single most valuable change

**Auto-compensate scale on `depth`, effect 1.**

It beats the other three on reach. Effects 2 and 4 are used by 2 and 1 of 170 scenes, so fixing them
improves films that mostly do not exist yet. Effect 3 is a coefficient retune, real but small, and the
`speed` escape hatch already exists for anyone who noticed. Depth is different: 44 of the 47 films that
move a camera have every layer at z = 0 (`core/fx/plane.js:135`), which means the engine's whole
parallax capability is dark, and the file itself names the reason. It removed three of the four barriers
and left the fourth, the one every AE multiplane tool was written to remove. The arithmetic is already in
the codebase; it is printed in an error message (`core/fx/plane.js:190`) instead of applied.

Second, and much cheaper if you want a win in one sitting: the fill resolve on `svg` `draw`
(`core/layers/svg.js:46`). It is about five lines and it turns an outline effect into a logo reveal.
