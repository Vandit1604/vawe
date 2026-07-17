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

**Known violation (found 2026-07-17, unfixed):** the Go renderer's frame-dedup makes re-renders of an
UNCHANGED scene pixel-different when the scene carries long-settling motion. Spring settles leave
sub-pixel movement inside the DOM signature's rounding, so near-identical frames group together, and
WHICH frame becomes the group's captured representative depends on worker order across the 8 parallel
tabs. Catalog pages differ ~4% of pixels (max delta 88) between two back-to-back renders of the same
JSON; scenes with fade-only motion (showcase-aspect) stay byte-identical. The fix belongs in the
renderer (tighten the signature, or make representative selection deterministic, e.g. always the
group's FIRST frame by index); until then `make catalog` avoids re-rendering unchanged pages so the
site's clips do not churn, which contains the symptom, not the cause.

## Not an effect, and ahead of every effect: aspect ratios

**Multi-aspect is not finished, and it is load-bearing for the whole list.** "One source renders
16:9, 9:16, 1:1 and 4:5" is a headline claim on the site, the `showcase-aspect` scene exists to
prove it, and the section of the homepage that pins now argues it. It does not yet hold up.

The failure is not in the renderer, which sizes the canvas correctly per `--aspect` and does its job.
It is that **the scene author has to solve the layout for each ratio by hand, and nothing stops them
getting it wrong.** `showcase-aspect.json` itself shipped with `x: 60, w: 1800` — pixels tuned to a
1920 canvas — so at 9:16 the box overflowed by 780px and cut "ratio." clean off the frame. The one
beat advertising relative coordinates was hand-computing absolute ones, and it took a human eye to
notice. That is the shape of the problem: a scene renders "fine" at every ratio and is wrong at all
but one.

**Update: the gate is built (`make audit ASPECT=16:9,9:16,1:1,4:5|all`), and the first thing it did
was find two more bugs in that same six-second scene.** The fix for the overflow above had been
`pin: "center"` with no `w`. But `pin` centres *a box*, and `resolveCoords` sizes a missing `w` as 0,
so `center` resolved to `(W-0)/2` and put the layer's LEFT EDGE on the centre line. It rendered
jammed into the right half **at every aspect, 16:9 included**, and passed the audit only because the
ink happened to land inside the safe box there. Separately, the `dy: -190 / dy: 20` meant to separate
its two lines were silently dropped (`dx`/`dy` are read only inside `scene.html`'s anchor pass), so
both lines rendered at the same `y`, overlapping. A scene whose entire job is proving multi-aspect
was wrong in three different ways, and rendering it at its own ratio revealed none of them.

The lesson generalises past aspect ratios: **the checks were measuring the wrong thing.** Safe-zone
measured the container border box, so a text layer given a `w` (which it needs) flagged its own empty
slack as off-frame, which pushes an author to shrink `w` until the *box* fits — tuning a number, not
fixing a layout. It now measures the ink for layers that paint no box of their own. And a degenerate
`pin` is a fact about the SOURCE, not about any rendered frame, so it is now checked by name rather
than hoped to trip a measurement.

### The measured state (`make audit ASPECT=16:9,9:16,1:1,4:5`)

Not an estimate. Every scene, at the four ratios the site advertises; ✓ = zero hard issues:

```
scene              16:9   9:16   1:1    4:5
showcase-aspect      ✓      ✓      ✓      ✓
stripe               ✓    ✗(11)  ✗(11)  ✗(11)
linear-launch        ✓    ✗(18)  ✗(18)  ✗(18)
creed-launch         ✓    ✗(19)  ✗(19)  ✗(19)
argus-launch         ✓    ✗(14)  ✗(14)  ✗(14)
vawe-intro           ✓    ✗(11)  ✗(11)  ✗(11)
hero-site            ✓     ✗(4)   ✗(4)   ✗(4)
showcase-cuts        ✓     ✗(3)   ✗(3)   ✗(3)
showcase-ui          ✓     ✗(6)   ✗(6)   ✗(6)
showcase-data        ✓     ✗(5)   ✗(5)   ✗(5)
```

**One six-second scene survives a change of ratio.** The counts are identical across 9:16/1:1/4:5
because the failure is not per-ratio: it is "not 1920 wide". Across all 45 scenes, `col` is used
**zero** times and `pin` **once** — the whole relative-coordinate system is one layer. Everything else
is hand-placed absolute pixels tuned to a 1920x1080 canvas.

Read that carefully, because it is not "nine broken scenes". Each of those scenes declares
`aspect: "16:9"` and only ever ships 16:9, and at 16:9 every one of them is clean. Nothing is broken.
**The claim is what is broad.** So the fix is a fork, and it is a product call, not an engineering one:
either make the claim precise (the engine renders any aspect; a scene is composed for the ones it
declares), or build per-aspect composition so a film can genuinely ship four.

### What is missing, roughly in order

- ~~**A gate.**~~ **Done.** `make audit ASPECT=…` mirrors `bin/vawe --aspect`, audits each canvas the
  CLI would ship, and writes one overlay per ratio. It also reports a scene that fails to boot instead
  of dying on an uncaught `TypeError` — previously one broken scene meant every *other* scene in the
  sweep went unaudited, which is how four unloadable scenes (`plinth-ad`, `vawe-launch`,
  `threadcite-*`, all missing or incomplete themes) stayed invisible.
- ~~**A safe area worth the name.**~~ **Done** — `core/safe.js`. There were FOUR safe zones (boot's 6%
  inset, tokens.css's per-orientation table, and a box each in audit.mjs and run.js) and they
  disagreed: three of four engine edge pins placed content into the zone the audit rejected. They were
  irreconcilable because "safe" was three ideas at once — a **margin** (a property of the canvas), a
  platform's **chrome** (a property of the DESTINATION: 9:16 for a hero and 9:16 for TikTok are the
  same canvas with different unusable regions), and an **anchor**. One function now answers all of it,
  keyed on `destination`, and placement and checking share it, so `pin:"bottom"` cannot fail.
- **Layout that resolves rather than gets computed.** This is now THE gap, and the table above is its
  size. `pin`/`col`/`align` work; absolute `x`/`w` is still the path of least resistance and silently
  means "16:9 only". Either the validator rejects absolute coordinates in a multi-aspect scene, or
  authoring defaults to relative and absolute is opt-in. **The deeper fix is in `resolveCoords`**:
  sizing an absent `w` as 0 turns a centring keyword into a left-edge placement without complaint.
  Making `center` measure the rendered layer (or refuse) would remove the trap rather than police it.
  That moves every centred layer, so it needs a `make snap` baseline and a deliberate call.
- **The y axis has the same trap, unchecked.** A missing `h` makes `pin:"center"` resolve `y` to
  `0.46*H` — top edge on the optical line, not the layer centred on it. (The far edges no longer have
  this problem: `bottom` estimates a text layer's height as `size*1.2`, matching scene.html's anchor
  fallback. No width equivalent is possible.) It skews by half a line rather than throwing content
  off-frame, and enough scenes have tuned around it that flagging it today would be mostly noise. It
  is still wrong, and it is the same root cause.
- **Per-aspect overrides.** Some beats genuinely need a different composition at 9:16 than 16:9, not
  the same one re-solved. There is no way to say so today. This is what the table above actually needs.
- **4:5 is claimed but barely exercised.** It appears in copy and in one diagram. It needs a scene.

Until this is solid, "any aspect" is a promise the engine keeps only when the author does the work
by hand. That is worth more than any new sting, because it is already being sold.

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

0. **Aspect ratios** (above). Not an effect, and ahead of all of them: it is a claim already on the
   site that the engine only half keeps. ~~Ship the per-aspect gate first~~ — **done**; it paid for
   itself immediately by finding three bugs in the one scene that exists to prove the claim. What
   remains is the `resolveCoords` trap behind them and a scene that exercises 4:5.
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
