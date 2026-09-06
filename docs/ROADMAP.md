---
when: proposing new engine work, or checking whether an effect already exists
answers: "the effect surface: which named effects ship, which are NOT BUILT, what is built and unused, and the one rule that governs all of it"
group: engine
---

# Roadmap: the effect surface

Everything here is a capability the engine should be able to render. It is a backlog, not a plan:
nothing below is committed to a release, and the ordering is by **cost of the first one in a
family**, because the second is nearly free once the machinery exists.

**The engine is a web page.** That is the whole reason this list is tractable, anything the
browser can do, `renderFrame(n)` can capture deterministically. The only real question per item is
*which substrate*, and that is what the tiers below encode.

**How to read the status marks.** Every named effect below carries one of four, and nothing else:

- **SHIPS** · exists, reachable from a scene, and something renders it. The `file:line` is the proof.
- **NOT BUILT** · checked against the registry that would own it, and absent. Reach for something else.
- **PART** · the family half exists. The line says which half.
- **UNUSED** · reachable and tested, and zero scene files use it. See *Built and unused* below.

A strikethrough is never a status mark here. Two items in the previous version were struck through
and then contradicted by their own prose, and the strike read as done at a glance.

## The one rule that governs all of it

Every effect must stay **pure in `n`**. No wall clock, no unseeded randomness, no state carried
between frames. A particle sim that steps from the previous frame is not renderable here: frames
shard across parallel tabs and render out of order, so an effect that cannot be evaluated directly
at frame `n` will silently produce different output per run. Where a family needs simulation, it
gets a **closed-form or seeded-deterministic** implementation, or it does not ship.

This is not a purity fetish. It is what `make probe` checks, and it is the property the whole
product is sold on.

**Known violation (found 2026-07-17, half fixed, narrowed).** Re-renders of an UNCHANGED scene can
be pixel-different when the scene carries long-settling motion. The original diagnosis named two
causes and only one of them survives.

- **FIXED: representative selection.** Spring settles leave sub-pixel movement inside the DOM
  signature's rounding, so near-identical frames group together, and WHICH frame the group captured
  used to depend on worker order. The representative is now always the group's FIRST frame by index
  (`internal/scene/scene.go:616-618`, `rep[f] = rep[f-1]`), and a long run gets a mid-run anchor
  byte-compared inside the instance, which fails loudly rather than quietly.
- **STILL OPEN: cross-tab rasterization.** Adjacent frames captured by *different* tabs differ in
  pixels the film never changed. The renderer says so in its own source
  (`internal/render/render.go:216-217`) and now refuses to print a motion figure measured across
  workers (`:219-224`) rather than quoting a number it cannot make. Byte-identical re-renders hold
  at `-workers 1`. This is gap 3 at the bottom of the page.

## Not an effect, and ahead of every effect: aspect ratios

**Multi-aspect is built and unadopted, and that distinction is the whole item now.** "One source
renders 16:9, 9:16, 1:1 and 4:5" is a headline claim on the site. Every piece of machinery the claim
needs ships. The library does not use it.

The failure was never in the renderer, which sizes the canvas correctly per `--aspect`. It is that
**the scene author has to solve the layout for each ratio by hand.** `showcase-aspect.json` itself
shipped with `x: 60, w: 1800`, pixels tuned to a 1920 canvas, so at 9:16 the box overflowed by 780px
and cut "ratio." clean off the frame. The one beat advertising relative coordinates was
hand-computing absolute ones. Then the gate found two more bugs in the same six-second scene: a
`pin: "center"` with no `w` resolved to `(W-0)/2` and put the layer's LEFT EDGE on the centre line
at every aspect, and its `dy` values were silently dropped. A scene whose entire job is proving
multi-aspect was wrong in three ways, and rendering it at its own ratio revealed none of them.

The lesson generalises past aspect ratios: **the checks were measuring the wrong thing.** Safe-zone
measured the container border box, so a text layer given a `w` flagged its own empty slack as
off-frame, which pushes an author to shrink `w` until the *box* fits, tuning a number rather than
fixing a layout. It now measures the ink for layers that paint no box of their own. And a degenerate
`pin` is a fact about the SOURCE, not about any rendered frame, so it is now checked by name.

### The machinery, and what each piece is worth

| piece | status | proof |
|---|---|---|
| Per-aspect gate, `make audit ASPECT=…` | **SHIPS** | `Makefile:302` passes `--aspect` through to `verify/audit.mjs`, mirroring `bin/vawe`. It also reports a scene that fails to boot instead of dying on an uncaught `TypeError`, which is how four unloadable scenes stayed invisible. |
| One safe area, keyed on destination | **SHIPS** | `safeArea()` at `core/layout/safe.js:121`, throwing on an unknown destination at `:123`. There used to be four disagreeing safe zones, because "safe" was three ideas at once: a margin, a platform's chrome, and an anchor. One function answers all of it, and placement and checking share it, so `pin:"bottom"` cannot fail. |
| Per-aspect overrides, `aspects: { "9:16": {…} }` | **SHIPS** | Validated per declared ratio at `core/validate/validate.mjs:207-213`; `aspects` is in the shared prop list at `formats/scene/schema.json:8`. An override cannot reintroduce the centring trap at one ratio only. |
| A scene composed for all five ratios | **SHIPS** | `formats/scene/aspects-demo.json`, which passes `make audit ASPECT=all`. |
| Layout that RESOLVES rather than gets computed | **PART** | The refusal half ships: a centring keyword with nothing to centre is a VALIDATE error (`core/validate/validate.mjs` `layoutErrors`), on both axes, in one place, imported by `verify/audit.mjs`. The **measure** half, `center` sizing itself from the rendered layer, is **NOT BUILT**. It moves every centred layer, so it stays deliberate. |
| The y-axis version of the same trap | **PART** | Checked, except on text and count, where `size*1.2` is the estimate and enough scenes have tuned around it that changing it would move shipped content. That carve-out is pinned in `make gate-test`. |
| **Library-wide adoption** | **NOT BUILT** | Counted on this branch over the 170 JSON files in `formats/scene/`: `"aspects"` appears in **1** scene (`aspects-demo.json`), `"col"` in **0**, `"pin"` in **14**. The relative-coordinate system is one demo and fourteen pins. Everything else is hand-placed absolute pixels tuned to a 1920x1080 canvas. |

Read the last row carefully, because it is not "the library is broken". Each of those scenes declares
`aspect: "16:9"`, only ever ships 16:9, and is clean there. **The claim is what is broad.** So the
fix is a fork, and it is a product call: either make the claim precise (the engine renders any
aspect; a scene is composed for the ones it declares), or compose the films for four.

## Cost tiers

| Tier | Substrate | Cost | Why |
|---|---|---|---|
| **1** | CSS / SVG filters | hours | `filter`, `mask`, `clip-path`, `mix-blend-mode`, `background-clip`, `@keyframes` evaluated at `t`. Already how `core/cuts/index.js` and `core/type/type.js` work. |
| **2** | Canvas 2D | hours-days | Per-pixel work that does not need the GPU. Halftone, dither, ASCII, pixel-sort. |
| **3** | GLSL fragment shader | days | Per-pixel, per-frame, keyed on `(progress, seed)` only. Most items are a new `SHADER_FX` entry. |
| **4** | Three.js / WebGL scene | days-weeks | Real geometry, depth, raymarching. Its layer type now ships; see Tier 4. |
| **5** | Needs a determinism story first | unknown | Simulation, depth estimation. Blocked on design, not effort. |

## Tier 1: CSS / SVG

| named effect | status | proof |
|---|---|---|
| Lower Thirds, all twelve variants | **SHIPS** | `lowerThird` at `blocks/core.mjs:230`; `BLOCKS` carries `lowerThird.cleanBar` · `.boldBlock` · `.bild` · `.darkCard` · `.sideRule` · `.kickerName` · `.accentUnderline` · `.maskReveal` · `.softPill` · `.colourBlock` · `.stackBars` · `.newsTicker`. |
| Social Overlays: X post · Reddit · Spotify · YouTube · follow | **SHIPS** | `tweetCard` · `redditPost` · `nowPlaying` · `videoLowerThird` · `followCard`, all in `BLOCKS` (`blocks/index.mjs`). Licence caveat stands: ship the *shape*, never a platform's logo lockup, unless the mark is used nominatively. |
| macOS notification | **PART** | No macOS-specific block. `notification` (plus `.warn` · `.error` · `.stack`) covers the shape without the platform chrome. |
| CSS Transitions: 3D · blur · cover · push · radial · scale · mechanical | **SHIPS** | `PRESENTATIONS` in `core/cuts/index.js` holds 27 entries: `cube` (3D) · `blur` · `slide` (cover) · `wipe` · `iris` · `zoom` (scale) · `squeeze` · `blinds` · `barn` · `flip` · `roll` · `letterbox` · `skewWhip` · `matchCut` and more. |
| CSS Transitions: dissolve · grid | **NOT BUILT** *as cuts* | Neither name is in `PRESENTATIONS`. The dissolve exists one level up as `SEAM_FX.dissolve` (`core/timeline/seams.js:32`) and as `RESAMPLE_FX.dissolve`; the grid one exists as `SHADER_FX.gridPixelateWipe` (`core/stings/index.js:33`). Both are reachable, neither is a cut. |
| grain overlay · vignette · shimmer sweep · parallax zoom | **SHIPS** | `filmGrain` in `AMBIENT_FX`; `vignette` in `FILTER_PRESETS` (`core/looks/filters.js`); `shimmerWave` in `core/type/type.js` presets; `ken` on an image layer (`formats/scene/schema.json:1327`). |
| Captions: highlight · pill karaoke · neon accent · weight shift · clip wipe | **SHIPS** | `CAP_STYLES` holds 19 (`core/type/captions.js`): `highlight` · `pillKaraoke` · `neonEdge` · `weightShift` · `clipWipe`, plus `kineticSlam` · `underlineDraw` · `flipUp` · `ghostSplit` · `waveRide` · `scramble` · `wordFlash` · `wordSlide` · `typeOn` · `readerFocus` · `inkFill` · `focusPull` · `letterRise` · `weightWave`. |
| Captions: gradient fill · editorial emphasis · emoji pop | **NOT BUILT** | None of the three is a `CAP_STYLES` key. |
| Text Effects: blend difference · texture mask | **NOT BUILT** *as named presets* | No preset in `core/type/type.js`, `core/looks/filters.js` or `core/looks/index.js` owns either name. Both are authorable by hand: `mix-blend-mode` is not on `core/type/sanitize-html.js`'s refused list, and `mask` is a layer prop (`formats/scene/schema.json:1291`). |
| glow/light: bloom · halation | **SHIPS** | `bloom` in `FILTER_PRESETS`; `halationFilm` in `LOOKS` (`core/looks/index.js:197`, 31 entries). |
| glow/light: diffusion · rim light | **NOT BUILT** | Neither name appears in `FILTER_PRESETS`, `LOOKS` or `AMBIENT_FX`. |
| glow/light: spotlight cone | **PART** | `spotlight` exists as a BACKGROUND (`core/backgrounds/index.js:152`), a radial glow travelling across the frame. There is no per-layer cone. |
| duotone · tritone · gradient-map · posterize · sepia | **SHIPS** | All five are `FILTER_PRESETS` keys (15 total, `core/looks/filters.js`). |
| Code snippet themes, twenty-four | **PART, and the rest is content** | Fourteen WCAG-checked `codeBlock.*` themes ship (`.light` · `.py` · `.midnight` · `.ember` · `.forest` · `.ocean` · `.neon` · `.paper` · `.ink` · `.dusk` · `.slate` · `.aurora` · `.linen` · `.frost`) with catalog rows. Going further is a token set, not a feature. |

## Tier 2: Canvas 2D

**Shipped (`core/canvas/effects.js`, `canvasFx` on an image layer):** `CANVAS_FX` = 8, mosaic · dither ·
halftone · stipple · ascii · edgeDetect · pixelSort · crosshatch, plus stylized presets
blueprint/comic/risograph/sketch/matrix/newsprint. Determinism story settled: **baked once at build**
(boot's awaited preload into a static PNG), so the pixels never change per frame. Probe and snap
prove it. See `docs/DESIGN-NOTES/tier5.md` for the general carve-out taxonomy this used.

**The generative half ships.** `paint` is a layer type (`core/surfaces/paint.js` + `core/surfaces/paint-fx.js`):
a Canvas 2D surface redrawn every frame as a pure function of local time, mirroring how `shader`
works. That is the piece **Matrix Decode** was waiting on. `PAINT_FX` = 5 (`core/surfaces/paint-fx.js:38`):
`matrix` · `starfield` · `aurora` · `meteor` · `waves`. The contract each keeps: no accumulation, no
`Math.random`/`Date`, and CLOSED-FORM motion (a particle's position is f(lt), never "last position
plus velocity"), which is exactly the line between this tier and the sims in Tier 5. Guarded by
`make canvas-purity`, which hashes real pixels because `make probe` compares a DOM signature and
structurally cannot see inside a canvas. A new generative effect is now one `PAINT_FX` entry.

| named effect | status | proof |
|---|---|---|
| Code Typing · Code Diff · Code Highlight Sweep · Code Scroll To Line | **SHIPS** | `codeTyping` · `codeDiff` · `codeHighlight` · `codeScroll`, all exported from `blocks/codeanim.mjs` and present in `BLOCKS`. Text metrics, not shaders. |
| stained glass | **NOT BUILT** | No `stainedGlass` anywhere in `core/` or `blocks/`. |
| low-poly triangulate | **NOT BUILT** | No `lowPoly` or `triangulate` anywhere in `core/` or `blocks/`. |
| voxelize | **NOT BUILT** | No `voxel` anywhere in `core/` or `blocks/`. |
| Data maps: US · US bubble · US flow · US hex · world | **SHIPS** | `usMap` · `usMapBubble` · `usMapFlow` · `usMapHex` · `worldMap` in `blocks/geo.mjs`. |
| Data map: Spain | **NOT BUILT** | No `spain` in `blocks/`. The map is easy; sourcing accurate boundary data is the actual work, and an inaccurate map is worse than none. |

**Excluded on purpose, not queued** (they break determinism and cannot ship as-is): datamosh and
P-frame freeze (codec plus stateful), feedback and phosphor trails (frame feedback), low-fps stutter
(per-frame state). Documented, never built, and not a backlog item.

## Tier 3: GLSL

`SHADER_FX` holds 35 entries (`core/stings/index.js:35`) and `AMBIENT_FX` 23 (`core/surfaces/shaders-ambient.js:49`);
between them the families below are majority built. This section used to read as a wish-list and sent
two consecutive planning passes at work that already existed.

| named effect | status | proof |
|---|---|---|
| Shader Transitions, all 14 | **SHIPS** | `SHADER_FX` = 35, including chromaticSplit · crossWarp · domainWarp · sdfIris · vortex · ridgedBurn · ripple · lens · thermal · leak · flash · whipPan · glitch · `cinematicZoom`, the GLSL sibling of the `PRESENTATIONS.zoom` cut. A generative overlay cannot smear the pixels under it, so it sells the dolly with the artefacts one leaves: radial streaks dying at the optical centre, a compressing rim, a centre bloom at peak speed. |
| chromatic family, all 5 | **SHIPS** | `chromaSplit` and `chromaGlow` in `FILTER_PRESETS`; `dispersion` and `iridescence` in `SHADER_FX`; `chromaShift` in `RESAMPLE_FX`. |
| analog/retro: vhs · crt · film grain · light leak · dot crawl · gate weave · nebula | **SHIPS** | `AMBIENT_FX` (`core/surfaces/shaders-ambient.js`); `LOOKS` adds vhs · super8 · crt. `gateWeave` rides the gate border, the dust and the hair on one closed-form offset, so the picture floats without anything being sampled. |
| CRT phosphor *trails* | **NOT BUILT, excluded** | Frame feedback. See the rule at the top. |
| distortion: barrel · heat shimmer · ripple · vortex · kaleidoscope · displace/melt · fisheye · macroblock | **SHIPS** | `AMBIENT_FX` for the first five, `FILTER_PRESETS.displace` and `LOOKS.melt`, `fisheye` and `macroblock` in `RESAMPLE_FX`. The old "missing real block displacement" line is answered by `macroblock`. |
| blur/motion: bokeh · zoom blur · spin blur · frosted glass | **SHIPS** | `zoomBlur` and `spinBlur` in `RESAMPLE_FX` (8 entries: zoomBlur · spinBlur · fisheye · bitCrush · macroblock · dissolve · refract · chromaShift). Frosted glass has two answers: the `glass` prop (`backdrop-filter`) for a blurred backdrop, `resample:"refract"` for real bending. |
| **Portal** | **SHIPS** | `SEAM_FX` entry, `core/timeline/seams.js:32`, blurb at `:55`. This page listed it as "still absent". |
| **Shatter** | **SHIPS** | `THREE_FX` key, `core/surfaces/three-scenes.js:25`. One slab holds, then breaks into a seeded grid of shards. |
| **Liquid Background** | **SHIPS** | `THREE_FX` key, `core/surfaces/three-scenes.js:27`. |
| **Code Shader Dissolve** | **SHIPS** | `codeDissolve` in `THREE_FX` (`core/surfaces/three-scenes.js:29`); `lines` is declared as its source snippet at `core/surfaces/three-fx.js:35`. It was listed as blocked on Seam C, and Seam C is built. |
| **Glitch RGB captions** | **NOT BUILT** | None of the 19 `CAP_STYLES` is a glitch or RGB style. `LOOKS.glitchGlow` is a whole-frame look, not a caption style. |

**True multi-sample motion blur is not this tier.** It means rendering sub-frames and accumulating: a
render-pipeline change, not a shader. Tier 5.

### Sampling: which seams exist

The old diagnosis stands. `core/stings/index.js` and `core/surfaces/shaders-ambient.js` contain **zero**
`sampler2D`/`texture2D`, and both are purely GENERATIVE overlays composited above the scene. Nothing
in *that* path can sample what is behind it. What changed is that the sampling path no longer goes
through it.

| seam | status | proof |
|---|---|---|
| **A** · canvas sources (`paint`, `shader`) | **SHIPS** | `sourceOf()` at `core/resample/index.js:38` returns the element's stashed surface canvas. |
| **B** · image sources (an `image` layer's `<img>`) | **SHIPS** | The same function, falling through to the `<img>` at `core/resample/index.js:40`. Spec `{ fx, amount, speed, seed }` on the layer, `amount` optionally `[from, to]` so the effect animates across the layer's own window. |
| **C** · an arbitrary DOM subtree | **SHIPS** | **This page said "still NOT built, and deliberately so". It is built.** A built subtree is baked to a texture once at boot through `core/resample/raster.js` (`buildInlinedCss`, `domToCanvas`), awaited by `core/engine/boot.js`, and the design is stated at `core/resample/index.js:14-26`. The validator's refusal narrowed exactly as planned: `UNSAMPLABLE` is now only `['raymarch','three','globe','video']` (`core/validate/validate.mjs:1313`), the four types whose pixels live in a canvas or a video bitmap outside the DOM. **The cost, said plainly:** the bake is ONE INSTANT taken from the built DOM before any frame draws, so a `count` that ticks is frozen at it. The motion comes from the pass, not the source. That is a hero device on a settled beat, not a wrapper around a moving one. |
| **D** · two-scene shader transitions | **SHIPS** | `core/timeline/seams.js`, `SEAM_FX` = 14 (`:32`): fade · dissolve · slide · push · uncover · wipe · crossWarp · whipPan · sdfIris · dispersion · lens · flashWhite · cinematicZoom · portal. The stage either side of a boundary is rasterised once at build into `u_from`/`u_to`, and a two-sampler shader keyed on `u_progress` blends. No WebGL, or a blank raster, degrades to a plain cross-fade. Author API: top-level `seams: [{ t, fx, dur, dir?, seed?, intensity? }]`. This was "the one thing the two reference engines have that we do not". |
| **Full-frame feedback** · sampling the COMPOSITED frame | **NOT BUILT, excluded** | The composite is one frame behind and Go-side, so reading it makes `renderFrame(n)` depend on which frames ran before it. `resample` never samples its own previous output; guarded by `make probe` and `make canvas-purity`. |

**On `vfx-js`, kept because the measurement is still the answer.** It is MIT, zero-dependency, and
does exactly Seam C. Two measured facts ruled it out as a runtime dependency, neither about quality:
its released 1.1.0 has no way to set the clock, `render()` opens with `Date.now()`, and asking for
the same logical frame five times returned five different pictures on all three shaders tried. The
seekable API (`setTime(t); render()`) exists unreleased on main; if it ships, revisit it for its
effect chain and its shader library, never for the sampling, which we now own.

## Tier 4: Three.js / WebGL

**The layer type ships.** This section was written as future work, and it was the "what I would build
first" item 5. `core/surfaces/three.js` exists; `core/surfaces/three-fx.js` declares the props at `:29-38`
behind an 18-line determinism contract at `:5-18` (no `THREE.Clock`, no `performance.now`, no
`Date`, no rAF driving anything); `three` has a full schema entry (`formats/scene/schema.json:705`)
and four scenes use it: `three-showcase.json` · `motion-reel.json` · `motion-reel-v2.json` ·
`showcase-globe.json`. The registry is split into `core/surfaces/three-scenes.js` on purpose, so a Node-side
gate can read the names without resolving the browser-absolute three.js import.

| named effect | status | proof |
|---|---|---|
| extruded 3D text | **SHIPS** | `extrudeText` in `THREE_FX` (`core/surfaces/three-scenes.js:23`). |
| wireframe / point cloud | **PART** | `pointCloud` ships (`core/surfaces/three-scenes.js:22`). No wireframe scene: `THREE_FX` is the eleven scenes in `core/surfaces/three-scenes.js` and none of them is one. |
| metaballs · fractals (mandelbulb) · chrome glass · water caustics · holographic foil | **SHIPS** | `RAYMARCH_FX` = 6 (`core/surfaces/raymarch-fx.js:28-36`): metaballs · mandelbulb · chromeGlass · caustics · holoFoil · glassRefract. |
| Code 3D Extrude · Code Morph · Code Snippet Flight | **SHIPS** | `codeExtrude` in `THREE_FX`; `codeMorph` and `codeFlight` in `BLOCKS` (`blocks/codeanim.mjs`). |
| iPhone and MacBook 3D Showcase · 3D UI Reveal | **SHIPS** | `deviceShowcase` and `uiParallax` in `THREE_FX`; `uiReveal3d` at `blocks/vfx.mjs:305`. |
| HTML-in-Canvas / Liquid Glass | **SHIPS** | Six blocks in `blocks/glass.mjs`: `glassHome` · `glassMenu` · `glassControls` · `glassNotification` · `glassWidgets` · `glassDock`, with real refraction behind them (`glass:"refract"`). **Honest note:** Apple documents Liquid Glass for Apple platforms only. Any web version is an approximation and should be labelled one, never implied to be the real control. |
| starfield · warp speed · nebula · aurora | **SHIPS**, at Tier 2 and 3 | `starfield` and `aurora` in `PAINT_FX`; `nebula` and `aurora` in `AMBIENT_FX`. They never needed Tier 4. |
| cloth / flag wave | **NOT BUILT** | No `THREE_FX` entry, and no `cloth` or `flagWave` in `core/`. |
| water surface as geometry, distinct from `caustics` | **NOT BUILT** | `RAYMARCH_FX.caustics` is a lit field, not a simulated surface. |
| depth-map 2.5D parallax | **NOT BUILT** | No `depthMap` anywhere in `core/` or `scripts/`. Blocked behind depth estimation, Tier 5. |
| **Parallax Layers** captions | **NOT BUILT** | Not a `CAP_STYLES` key. |

## Tier 5: blocked on a determinism story

These are **not** "hard", they are **unsolved for this engine**, and shipping them naively breaks the
product's central claim. Audio-reactivity used to sit here and no longer does: `make spectrum` bakes
per-frame band energy offline and the render reads row `n` of a table (`core/tracks/spectrum.js`), so it
never was a determinism problem once the analysis moved out of the frame.

| item | status | proof |
|---|---|---|
| Particle and fluid sims: smoke · fog · ink diffusion · reaction-diffusion · boids · gravity fields · disintegration · sand pour | **SHIPS by the baked route** | The carve-out this tier named, "a precomputed baked buffer keyed by frame", is built and was unrecorded. `scripts/sim/run.mjs:1-11` runs the simulation offline, in order, once, and emits a PNG frame sequence; reproducibility is hashed by `scripts/sim/provenance.mjs`; the scene plays the frames back through the existing `clip` layer. `make sim`, `make sim-audit`. Non-determinism is confined to bake time. Writing a *live* sim is still refused, and should be. |
| True multi-sample motion blur | **NOT BUILT** | The cheap half ships and is now AUTOMATIC above a speed the eye already reads as fast, not opt-in: `L.motionBlur` derives a streak from the motion track's velocity, sampled at `t` and `t - 1/fps` so it stays pure in `n` (`core/tracks/motion.js:99-104`; `motionBlur:false` opts out, a number overrides the shutter). What remains is real sub-frame accumulation in the render pipeline, and nothing in `internal/render/render.go` does any. |
| Depth estimation for 2.5D parallax from a flat image | **NOT BUILT** | No `depthMap` or depth-estimation path in `core/` or `scripts/`. Needs a model in the pipeline. |
| Chroma key · luma key · difference matte | **NOT BUILT, and unblocked** | The question it waited on, where source video enters a scene, is answered: the `clip` layer plays a preloaded PNG frame sequence (`core/layers/clip.js`, exercised by `_coverage-reel.json`). Keying is now one per-pixel entry over a `clip`. Zero hits for `chromaKey` or `lumaKey` anywhere in the repo. Unblocked is not built. |

Everything in Tier 5 gets a design note before a line of code. The determinism claim is the product;
an effect that quietly breaks it costs more than it adds.

## Retro / expressive text, backlog

A large family of retro text looks to mine: https://resourceboy.com/text-effects/retro/ (chrome,
letterpress, sticker, foil, neon, halftone, marquee). Pull from it whenever the question is "what
text effect should we build next." Four already ship as `LOOKS`: `chrome` · `letterpress` · `neon` ·
`emboss` (`core/looks/index.js:197`). The **ransom cutout** ships procedurally (`core/type/ransom.js`).

Three near-complete reference implementations were handed over (self-contained WebGL1 and React).
They are worth building, but note the **shared catch**: each is an *interactive site component*, a
`requestAnimationFrame` loop driven by `performance.now()`, pointer position and `Math.random()`.
That is the exact opposite of `renderFrame(n)` purity, so each has two possible homes:

- **As a live SITE block**: drop it in almost as-is. The site already runs interactive WebGL.
- **As a VIDEO primitive**: rewrite it **pure in n**, drive every phase from the frame number, delete
  the cursor input and every `Math.random`/`performance.now`, and follow the multi-pass-bloom-into-FBOs
  pattern already proven by `core/stings/index.js` and `core/surfaces/raymarch-fx.js`. Give it a design note first.

| named effect | status | proof |
|---|---|---|
| **Blur glow** | **NOT BUILT** | No `blurGlow` in `core/`. Wanted: rasterize the word to a height-locked white mask, a real multi-pass Gaussian bloom (4 downsampled H/V blur FBOs) with a depth-of-field focus, summed with falling weights, gamma, then gradient-mapped through a 5-stop luminance ramp; the ink-coloured sharp word on top; soft-light grain. |
| **Chromatic glow** | **NOT BUILT** | No `chromaticGlow` in `core/`. The same multi-pass bloom, then a warm and a cool copy offset in opposite directions with a spectral prism rim. `FILTER_PRESETS.chromaGlow` and the `chroma` reveal preset are the static gesture, not this. |
| **Real-sprite ransom** | **NOT BUILT** | `core/type/ransom.js` ships the procedural CSS-tile form. The sprite cousin needs a vetted royalty-free cut-out letter set committed and served, and for video it must bake to frames. Procedural ships today; sprites are the upgrade when the licensing is settled. |

## Blocks: what a showcase found (App Showcase, 2026-07-19)

The instruction below (build the showcases last, let them dictate the backlog) was tested by
storyboarding an **App Showcase** against the catalog without writing the film. It surfaced 17 gaps.
Sixteen are closed, and they are recorded here rather than left in a transcript.

**Fixed defects:** `phoneFrame`/`browserFrame` had no content slot (`children` now, plus a phone
status row); `browserFrame` defaulted `url` to a real company's domain; `deploySuccess` baked in the
invented statistic "Ready in 1.2s".

**Closed, all in `blocks/`:** app content beyond a music player (`feedRow` · `listRow` ·
`settingsRow` · `profileHeader` · `onboardCard` · `emptyState`); split-screen and picture-in-picture
(`splitScreen`, `splitScreen.pip`, whose sides are block descriptors and which injects `w` and NOT
`h` on purpose, because most factories size off content and a prop a factory does not destructure is
dropped in silence); `comparison.screens`; moving state (`tabBar.switch` · `tabBar.icons` ·
`stepFlow.build` · `screenSwap`, which defaults to `wipe` because a wipe is a CLIP, so a swap inside
a device frame does not slide across the bezel); interaction (`pointer` · `tapRipple` · `keyboard` ·
`pressButton`); proof surfaces (`installCard`, whose stars FILL through a hard-edged mask so a 4.6
lands mid-glyph, plus `socialProof` and `toast.stack`/`notification.stack` sharing one `stackWindows`
helper).

| remaining gap | status | proof |
|---|---|---|
| `loadingBar`/`progressRing` assume card scale and do not read inside a device screen | **NOT BUILT** | `loadingBar` still defaults `w = 420` at `blocks/dev.mjs:110`. A sizing question, not a missing capability. |
| A nested `layout:'free'` group did not position its own children | **SHIPS (fixed)** | Recorded here as an open framework bug that cost `installCard` a rating track. Fixed at `core/layers/util.js:522-527`, whose comment names the positioned-ancestor reasoning, and `:567`, which sets `position:absolute` plus `left`/`top` when `parentEl.dataset.free`. |

## Built and unused: the other kind of debt

**This is the engine's real disease, and it is not "not built".** A capability lands, is reachable, is
tested, and no film ever uses it. That reads green on every gate and buys nothing, and this page had
no way to say it before this section existed. Counted over the 170 JSON files in `formats/scene/`:

| capability | reachable | proof | scenes using it |
|---|---|---|---|
| `effector`, a falloff from a travelling point, spent on a layer's own children | yes | `core/motion/effector.js`, registered at `core/tracks/index.js:59`, schema at `formats/scene/schema.json:1255` | **0** |
| `timeRemap` (whip · hold · freeze · rewind) | yes | shapes at `core/timeline/time.js:48`, baked once at boot by `bakeTimeRemap` at `:144`, schema at `formats/scene/schema.json:1814` | **0** |
| `aspects`, per-aspect overrides | yes | `core/validate/validate.mjs:207-213` | **1** (`aspects-demo.json`) |
| `col`, the relative column coordinate | yes | shared prop list, `formats/scene/schema.json:8` | **0** |

Neither `effector` nor `timeRemap` is unreachable, and neither is untested. They are unproven by a
film, which is a different failure and needs a different fix: not engineering, but one scene that
earns the capability. **When adding a capability, name the film that will use it, or expect this
table to grow a row.**

## The Showcases

**App Showcase** ships (`formats/scene/app-showcase.json`). **Apple Money Count**, **Blue Sweater
Intro**, **North Korea Locked Down**, **NYC Paris Flight** and **VPN YouTube Spot** are **NOT BUILT**:
none of them exists in `formats/scene/`. They are not effects, they are *compositions* of the above,
and they belong in `formats/scene/` as evidence the vocabulary composes. Build them **last**, and let
them dictate which effects actually matter: a showcase that cannot be built is a better spec for the
backlog than a wish-list is. The App Showcase already proved that, seventeen times over.

## The five gaps worth building, by what they unlock

1. **Library-wide multi-aspect adoption.** The gate, the safe area, the overrides and a demo all
   ship, and 1 scene in 170 uses them. This is the only gap that makes a claim already on the site
   true.
2. **`center` that measures the rendered layer.** Until it does, every author hand-computes the
   number the layout system exists to compute. That is the root cause behind gap 1, not a sibling
   of it.
3. **Cross-tab raster determinism in the Go capture.** Byte-identical re-renders are the product's
   central claim, and it currently holds only at `-workers 1`.
4. **True multi-sample motion blur.** The one render-pipeline change on the list. Every fast move in
   every film is sold by a derived streak rather than by accumulation.
5. **Chroma / luma key.** Unblocked since the `clip` layer landed, and still unbuilt. It gates any
   film that wants real footage composited rather than placed.

**A standing warning, learned the hard way, and it fired again.** Lower thirds, shader transitions
and analog/retro sat on this page as "build first" long after they were built, and two planning
passes in a row were routed at them. The 2026-09-01 audit found the same decay at a larger scale: the
**`three` layer type**, **Seam C**, **Seam D**, **Portal**, **Shatter**, **Liquid Background**, **Code
Shader Dissolve**, the **code-animation blocks** and the **offline sim baker** were all written here
as future work while shipping. Before building anything named on this page, check the registry that
would own it: `SHADER_FX`, `AMBIENT_FX`, `SEAM_FX`, `RESAMPLE_FX`, `CANVAS_FX_NAMES`,
`PAINT_FX_NAMES`, `THREE_FX`, `RAYMARCH_FX`, `LOOK_NAMES`, `CAP_STYLES`, `FILTER_PRESETS`,
`PRESENTATIONS`, `blocks/catalog.mjs`. `make arsenal Q="…"` searches all of them at once, and it
returns its NEAREST match even when it has no answer, so confirm the name it hands you exists in the
file it names. A roadmap is a claim about the past as much as the future, and this one decayed
silently twice because nothing checked it.
