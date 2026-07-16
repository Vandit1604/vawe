# Roadmap — the effect surface

Everything here is a capability the engine should be able to render. It is a backlog, not a plan:
nothing below is committed to a release, and the ordering is by **cost of the first one in a
family**, because the second is nearly free once the machinery exists.

**The engine is a web page.** That is the whole reason this list is tractable — anything the
browser can do, `renderFrame(n)` can capture deterministically. The only real question per item is
*which substrate*, and that is what the tiers below encode.

## The one rule that governs all of it

Every effect must stay **pure in `n`**. No wall clock, no unseeded randomness, no state carried
between frames. A particle sim that steps from the previous frame is not renderable here: frames
shard across parallel tabs and render out of order, so an effect that cannot be evaluated directly
at frame `n` will silently produce different output per run. Where a family needs simulation, it
gets a **closed-form or seeded-deterministic** implementation, or it does not ship.

This is not a purity fetish. It is what `make probe` checks, and it is the property the whole
product is sold on.

## Cost tiers

| Tier | Substrate | Cost | Why |
|---|---|---|---|
| **1** | CSS / SVG filters | hours | `filter`, `mask`, `clip-path`, `mix-blend-mode`, `background-clip`, `@keyframes` evaluated at `t`. Already how `core/cuts.js` and `core/type.js` work. |
| **2** | Canvas 2D | hours-days | Per-pixel work that does not need the GPU. Halftone, dither, ASCII, pixel-sort. |
| **3** | GLSL fragment shader | days | Per-pixel, per-frame, keyed on `(progress, seed)` only. `core/shaders.js` already has this path; most items are a new `SHADER_FX` entry. |
| **4** | Three.js / WebGL scene | days-weeks | Real geometry, depth, raymarching. New layer type; heaviest lift, biggest payoff. |
| **5** | Needs a determinism story first | unknown | Simulation, audio-reactivity, depth estimation. Blocked on design, not effort. |

## Tier 1 — CSS / SVG (cheap, do these first)

The whole **Lower Thirds** family (BILD, accent underline, bold block, clean bar, colour block,
dark card, kicker name, mask reveal, side rule, soft pill, stack bars, news ticker) is one layout
component plus a variant token. Ship the component, get twelve.

Same shape for **Social Overlays** (X post card, Reddit card, Spotify now playing, YouTube lower
third, macOS notification, Instagram/TikTok follow) — these are `html` layers with real brand
marks. **Licence caveat:** ship the *shape*, never a platform's logo lockup, unless the mark is
used nominatively.

Also here: **CSS Transitions** (3D, blur, cover, dissolve, grid, push, radial, scale, mechanical),
**Effects** (grain overlay, vignette, shimmer sweep, parallax zoom/unzoom), most **Captions**
(highlight, pill karaoke, gradient fill, neon accent/glow, weight shift, editorial emphasis, clip
wipe, emoji pop), **Text Effects** (blend difference, texture mask), the **glow/light** family
(bloom, halation, diffusion, rim light, spotlight cone), **duotone/tritone/gradient-map**,
**posterize**, **sepia**, and **Code Snippets** — twenty-four terminal themes are a token set over
the existing `codeBlock` block, not twenty-four features.

## Tier 2 — Canvas 2D

Halftone, newsprint/Bayer dither, ASCII render, pixel sorting, mosaic/stained glass, cross-hatch,
stipple, low-poly triangulate, voxelize, **Grid Pixelate Wipe**, **Matrix Decode**, **Code Typing**
/ **Code Diff** / **Code Highlight Sweep** / **Code Scroll To Line** (text metrics, not shaders).

**Data maps** (Spain, US, US bubble/flow/hex, world) live here too: real GeoJSON + a projection.
The map is easy; sourcing accurate boundary data is the actual work, and inaccurate maps are worse
than none.

## Tier 3 — GLSL (one new SHADER_FX each)

The **Shader Transitions** family is the natural next block: chromatic radial split, cross warp
morph, domain warp dissolve, SDF iris, swirl vortex, ridged burn, ripple waves, gravitational lens,
thermal distortion, light leak, flash through white, whip pan, cinematic zoom, glitch.

Then **chromatic** (aberration, prism split, RGB offset, dispersion, iridescence), **analog/retro**
(VHS tracking + bleed, CRT scanlines + curvature + phosphor, film grain/dust/gate weave, dot-crawl),
**glitch/digital** (datamosh, block displacement, tearing, macroblocking, bit-crush, feedback loop),
**distortion** (barrel, fisheye, heat shimmer, ripple, twirl, kaleidoscope, displacement map, melt),
**blur/motion** (radial, zoom, spin, lens/bokeh-shaped, frosted glass), **Code Shader Dissolve**,
**Glitch RGB** captions, **Liquid Background/Glass**, **Portal**, **Shatter**.

Note: **true multi-sample motion blur** is not this tier. It means rendering sub-frames and
accumulating — a render-pipeline change, not a shader. Tier 5.

## Tier 4 — Three.js / WebGL

Needs a new layer type (`three`?) with a deterministic clock, mirroring how `shader` works today.

**Code 3D Extrude**, **Code Morph**, **Code Snippet Flight**, **iPhone & MacBook 3D Showcase**,
**3D UI Reveal**, extruded 3D text, raymarched SDF scenes, fractals (mandelbulb/julia), metaballs,
holographic foil, chrome/refractive glass, water + caustics, cloth/flag wave, wireframe/point-cloud,
depth-map 2.5D parallax, **Parallax Layers** captions, starfield/warp-speed/nebula/aurora.

**HTML-in-Canvas / Liquid Glass** (iOS 26 home screen, context menu, media controls, notification,
widgets, macOS Tahoe desktop) sits between 3 and 4: mostly `backdrop-filter` + layered highlights,
but the convincing version needs real refraction. Start Tier 1, escalate only if it looks cheap.
**Honest note:** Apple documents Liquid Glass for Apple platforms only. Any web version is an
approximation and should be labelled one — never implied to be the real control.

## Tier 5 — blocked on a determinism story

These are **not** "hard", they are **unsolved for this engine**, and shipping them naively breaks
the product's central claim:

- **Particle/fluid sims** (smoke, fog, fluid/ink diffusion, reaction-diffusion, boids, gravity
  fields, disintegration, sand pour). Sims are iterative; `renderFrame(412)` cannot step 411 frames
  first. Needs closed-form motion, or a precomputed baked buffer keyed by frame, or an explicit
  "sim layers render in-order" carve-out that costs frame sharding.
- **Audio-reactive** (beat-driven scale/flash, spectrum bars, kick-triggered glitch). Pure in `n`
  is *achievable* — FFT the track offline, bake per-frame bins into the scene — but that is a
  pipeline feature, not an effect. It is a good one: it would make music videos trivial.
- **True motion blur.** Sub-frame accumulation in the render pipeline.
- **Depth estimation** for 2.5D parallax from a flat image. Needs a model in the pipeline.
- **Chroma key / luma key / difference matte.** Easy per-pixel; the question is where source video
  enters a scene at all.

## The Showcases

**App Showcase**, **Apple Money Count**, **Blue Sweater Intro**, **North Korea Locked Down**,
**NYC Paris Flight**, **VPN YouTube Spot** are not effects — they are *compositions* of the above.
They belong in `formats/scene/`, as evidence the vocabulary composes. Build them **last**, and let
them dictate which effects actually matter: a showcase that cannot be built is a better spec for
the backlog than a wish-list is.

## What I would build first

1. **Lower thirds** (Tier 1, one component → twelve entries). Highest ratio of surface to effort in
   the whole list.
2. **Shader transitions** (Tier 3). `core/shaders.js` already has the machinery; each is one
   `SHADER_FX` entry, and transitions are what a motion engine is judged on.
3. **Code snippet themes** (Tier 1). Twenty-four themes = a token set over `codeBlock`. This repo's
   audience is developers; code that looks like their editor is worth more here than anywhere else.
4. **Analog/retro** (Tier 3). VHS/CRT/film is the most-requested aesthetic family and it is all
   fragment shaders.
5. **The `three` layer type** (Tier 4), once 1-4 prove the vocabulary. It unlocks the largest
   single block of the list.

Everything in Tier 5 gets a design note before a line of code. The determinism claim is the
product; an effect that quietly breaks it costs more than it adds.
