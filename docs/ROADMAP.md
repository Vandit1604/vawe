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
- ~~**Layout that resolves rather than gets computed.**~~ **Refused, not yet measured.** A centring
  keyword with nothing to centre is now a VALIDATE error (`core/validate.mjs` `layoutErrors`), so it
  fails at `make validate` and in boot before a frame renders, on both axes. The rule lives in exactly
  one place and `verify/audit.mjs` imports it. The *measure* half — making `center` size itself from
  the rendered layer — is still open and still moves every centred layer, so it stays deliberate.
- ~~**The y axis has the same trap, unchecked.**~~ **Checked**, except on text/count, where `size*1.2`
  is a defensible estimate and enough scenes have tuned around the current behaviour that changing it
  would move shipped content. That carve-out is pinned in `make gate-test`. Original note: A missing `h` makes `pin:"center"` resolve `y` to
  `0.46*H` — top edge on the optical line, not the layer centred on it. (The far edges no longer have
  this problem: `bottom` estimates a text layer's height as `size*1.2`, matching scene.html's anchor
  fallback. No width equivalent is possible.) It skews by half a line rather than throwing content
  off-frame, and enough scenes have tuned around it that flagging it today would be mostly noise. It
  is still wrong, and it is the same root cause.
- ~~**Per-aspect overrides.**~~ **Done** — `aspects: { "9:16": { …props… } }` on any layer or camera
  keyframe, merged for that canvas only, applied before `resolveCoords`. The validator checks every
  declared variant, so an override cannot reintroduce the centring trap at one ratio only.
- ~~**4:5 is claimed but barely exercised.**~~ **Done** — `formats/scene/aspects-demo.json` composes
  for all five ratios and passes `make audit ASPECT=all`.

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

**Shipped (`core/canvas-fx.js`, `canvasFx` on an image layer):** halftone · Bayer dither · mosaic ·
stipple · ASCII · edgeDetect (Sobel) · crosshatch, plus stylized presets blueprint/comic/risograph/
sketch/matrix/newsprint. Determinism story settled: **baked once at build** (boot's awaited preload →
static PNG), so the pixels never change per frame — probe/snap prove it. See `docs/DESIGN-NOTES/tier5.md`
for the general carve-out taxonomy this used.

**The generative half now exists.** `paint` is a layer type (`core/layers/paint.js` + `core/paint-fx.js`):
a Canvas 2D surface redrawn every frame as a pure function of local time, mirroring how `shader` works.
That is the piece **Matrix Decode** was waiting on, and it ships with `matrix` · `starfield` · `waves`.
The contract each effect keeps: no accumulation, no Math.random/Date, and CLOSED-FORM motion (a
particle's position is f(lt), never "last position + velocity") — which is exactly the line between
this tier and the sims in Tier 5. Guarded by `make canvas-purity`, which hashes real pixels because
`make probe` compares a DOM signature and structurally cannot see inside a canvas.

**Remaining:** stained glass, low-poly triangulate, voxelize, **Code Typing** / **Code Diff** /
**Code Highlight Sweep** / **Code Scroll To Line** (text metrics, not shaders). New generative effects
are now content — one entry in `PAINT_FX`, no framework work.
(`pixelSort` ships in `CANVAS_FX_NAMES` and `gridPixelateWipe` ships in `SHADER_FX` — both were listed
here as remaining long after they landed.)

**Excluded on purpose (break determinism — cannot ship as-is):** datamosh / P-frame freeze (codec +
stateful), feedback/phosphor trails (frame feedback), low-fps stutter (per-frame state). These are the
"Tier D" of the composite-looks plan; they would violate pure-in-n and are documented, not built.

**Data maps** (Spain, US, US bubble/flow/hex, world) live here too: real GeoJSON + a projection.
The map is easy; sourcing accurate boundary data is the actual work, and inaccurate maps are worse
than none.

## Tier 3 — GLSL (one new SHADER_FX each)

**MOSTLY SHIPPED — audited 2026-07-19.** `SHADER_FX` holds 35 entries and `AMBIENT_FX` 17; between
them the families below are majority-built. This section used to read as a wish-list and sent two
consecutive planning passes at work that already existed.

- **Shader Transitions: all 14 ship.** chromaticSplit · crossWarp · domainWarp · sdfIris · vortex ·
  ridgedBurn · ripple · lens · thermal · leak · flash · whipPan · glitch, and **`cinematicZoom`
  shipped 2026-07-19** — the GLSL sibling of the `PRESENTATIONS.zoom` cut. A generative overlay cannot
  smear the pixels under it, so it sells the dolly with the artefacts one leaves: radial streaks that
  die at the optical centre, a compressing rim, and a centre bloom at peak speed.
- **chromatic: all 5 ship** (aberration/prism/RGB-offset via the `chromatic` filter primitive,
  `dispersion` and `iridescence` as stings).
- **analog/retro: majority ships** — `AMBIENT_FX` vhs · crt · filmGrain · lightLeak, `LOOKS` vhs ·
  super8 · crt, plus `dotCrawl` in `AMBIENT_FX`, and **`gateWeave` shipped 2026-07-19** (film dust,
  hairs, and the frame drifting in the projector gate — the gate border, dust and hair all ride one
  closed-form offset, so the picture appears to float without anything being sampled). CRT phosphor
  *trails* stay excluded (frame feedback).
- **distortion: 7 of 8 ship** — barrel · heatShimmer · ripple · swirl/vortex · kaleidoscope ·
  displace/melt, plus **`fisheye` via `resample`** (see below). Missing: real block displacement of a
  layer beyond what `macroblock` does.
- **blur/motion: bokeh ships, and `zoomBlur` + `spinBlur` now ship via `resample`** (see below). They
  needed a texture to sample, not a new `SHADER_FX` entry. Frosted glass now has two answers: the
  `glass` prop (`backdrop-filter`) for a blurred backdrop, `resample:"refract"` for real bending.
- Still absent: **Glitch RGB captions, Liquid Background/Glass, Portal, Shatter, Code
  Shader Dissolve.** Code Shader Dissolve needs a DOM subtree as a
  texture (Seam C, not built); Portal and Shatter need real geometry. **`bit-crush` and `macroblocking`
  now ship** as `resample` effects.

Note: **true multi-sample motion blur** is not this tier. It means rendering sub-frames and
accumulating — a render-pipeline change, not a shader. Tier 5.

### The capability that unblocked a whole cluster: shaders could not read the frame · SEAMS A + B NOW BUILT

Audited 2026-07-19, then **built**. The diagnosis stands: `core/stings.js` and `core/shaders-ambient.js`
contain **zero** `sampler2D` / `texture2D`, and both are purely GENERATIVE overlays composited above the
scene (stings sit at z-index 70). Nothing in *that* path can sample what is behind it. What changed is
that the sampling path no longer has to go through it.

Both cheap paths shipped:
1. **`backdrop-filter`**: the `glass` prop on any layer (`core/layers/util.js`). Reads what is behind
   an element natively: frosted panels, the Tier-1 Liquid Glass approximation, blur-behind. It cannot
   BEND the backdrop, only filter it, so it never covered the sampling family below.
2. **Layer-as-texture, SHIPPED as `resample`** (`core/resample-fx.js` + `core/resample.js`). A layer
   whose content is already a raster is bound as a GL texture and re-sampled through a fragment shader.
   **Seam A (canvas sources: `paint`, `shader`) and Seam B (image sources: the `<img>` of an `image`
   layer) are both done.** Spec: `{ fx, amount, speed, seed }` on the layer, `amount` optionally
   `[from, to]` so the effect animates across the layer's own window. Docs: `docs/PRIMITIVES.md`.

**Now done** (each was blocked purely on "must transform pixels it cannot see"):
- ~~radial / zoom blur~~ → `zoomBlur`
- ~~spin blur~~ → `spinBlur`
- ~~fisheye, real lens distortion of a layer~~ → `fisheye` (barrel above 0.5, pincushion below)
- ~~bit-crush~~ → `bitCrush` (depth-halving dial, not a linear level ramp)
- ~~macroblocking~~ → `macroblock`
- ~~real glass refraction~~ → `refract` (noise-gradient displacement + per-channel dispersion)
- plus two that came free once sampling existed: `dissolve` (ember-lit erosion) and `chromaShift`.

**Still NOT built, and deliberately so:**
- **Seam C, sampling an arbitrary DOM subtree** (`text`, `group`, `component`, `codeBlock`). `resample`
  needs a raster, and a DOM subtree is not one. Doing it means an offline `foreignObject` bake to a
  texture in boot's awaited preload, mirroring how `canvasFx` bakes. That work has **not** been done, so
  **Code Shader Dissolve** (wants a `codeBlock` as its texture) is still blocked, and the validator
  rejects `resample` on any non-raster layer rather than silently ignoring it.
- **Full-frame feedback**: sampling the COMPOSITED frame. Out of scope on purpose: the composite is one
  frame behind and Go-side, so reading it makes `renderFrame(n)` depend on which frames ran before it.
  That breaks pure-in-`n`, which is the product's central claim. `resample` never samples its own
  previous output; guarded by `make probe` + `make canvas-purity`.
- **Seam D — two-scene shader transitions (NOT built).** A cut today transforms ONE scene root
  (`core/cuts.js`, a another engine-model timing/presentation split) and a sting is a GENERATIVE overlay above
  it. Neither can blend the outgoing beat INTO the incoming one, because neither samples both as
  textures. another engine does exactly this: rasterize the two beats either side of a cut to textures
  `u_from`/`u_to` and run a fragment shader keyed on `u_progress` — which buys whip-pan motion-blur that
  smears BOTH beats, an sdf-iris that reveals the next beat through a mask, dispersion/lens/warp that
  bend across the seam, and flash-through-white with independent in/out windows. Ours cannot do any of
  these; a `PRESENTATIONS` entry can only move/fade/clip one root, and a sting only paints on top.
  **The determinism story is clean** (both textures are pure functions of `n`, no feedback), so this is
  effort, not a blocked design. **The build:** a transition primitive that captures the two adjacent
  beats to offscreen rasters (the `resample` layer-as-texture path already proves single-source capture;
  this needs a second source and a window that spans the cut), then a small `TRANSITION_FX` GLSL registry
  keyed on `(progress, seed)` — mirroring `SHADER_FX`. Port targets from the another engine study:
  `whipPan` (10-tap directional blur on both), `sdfIris`, `flashThroughWhite` (dual smoothstep windows),
  `crossWarp`, `gravitationalLens`. This is the one thing the two reference engines have that we do not.

**Seam D — two-scene shader transitions — NOW BUILT (`core/seams.js`).** The capability neither a sting
(overlay on one beat) nor a cut (transform one root) could offer: sample the OUTGOING beat AND the
INCOMING beat as textures and blend one INTO the other. The whole stage either side of a boundary is
rasterised ONCE at build (in-browser `foreignObject` over the live bg canvas, fonts + CSS + `:root`
vars inlined) into `u_from` / `u_to`, and a two-sampler fragment shader keyed on `u_progress` runs the
blend: `crossWarp` · `whipPan` · `sdfIris` · `dispersion` · `lens` · `flashWhite` · `cinematicZoom`, plus
a `fade` fallback. Determinism holds because both textures are pure functions of `n` (two fixed frames,
baked once); no WebGL or a blank raster degrades to a plain cross-fade. Author API: top-level
`seams: [{ t, fx, dur, dir?, seed?, intensity? }]`. This is the DOM-as-texture `foreignObject` bake that
**Seam C** wanted — Seam C (sampling one arbitrary subtree as a `resample` source) can now follow the
same path. Note the bake surfaced a real framework bug: the virtual clock starved chromedp's rAF
readiness Poll during the awaited bake; fixed by virtualising page timers lazily (see MISTAKES #121).

~~**Genuinely cheap and still absent** (generative): nebula, iridescence, dot-crawl.~~ **All three
shipped 2026-07-19**: `nebula` and `dotCrawl` in `AMBIENT_FX`, `iridescence` in `SHADER_FX`.

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
the product's central claim. (Audio-reactivity used to sit here and no longer does: `make spectrum`
bakes per-frame band energy offline and the render reads row `n` of a table, so it never was a
determinism problem once the analysis moved out of the frame. See `core/spectrum.js`.)

- **Particle/fluid sims** (smoke, fog, fluid/ink diffusion, reaction-diffusion, boids, gravity
  fields, disintegration, sand pour). Sims are iterative; `renderFrame(412)` cannot step 411 frames
  first. Needs closed-form motion, or a precomputed baked buffer keyed by frame, or an explicit
  "sim layers render in-order" carve-out that costs frame sharding.
- **True motion blur.** Sub-frame accumulation in the render pipeline. NOTE: the cheap half already
  ships — `L.motionBlur` derives a streak from the motion track's velocity, sampled at `t` and
  `t - 1/fps` so it stays pure in `n` (`formats/scene/scene.html`). What remains is real multi-sample
  accumulation, which is a quality upgrade rather than a zero-to-one.
- **Depth estimation** for 2.5D parallax from a flat image. Needs a model in the pipeline.
- ~~**Chroma key / luma key / difference matte.**~~ **Unblocked.** The question this was waiting on —
  where source video enters a scene — is answered: the `clip` layer plays a preloaded PNG frame
  sequence (`core/layers/clip.js`, exercised by `_coverage-reel.json`). Keying is now one per-pixel
  entry over a `clip`, i.e. content, not a determinism problem.

## Retro / expressive text (resourceboy.com/text-effects/retro) — backlog

A large family of retro text looks to mine for effects: https://resourceboy.com/text-effects/retro/
(chrome, letterpress, sticker, foil, neon, halftone, marquee, etc.). Pull from it whenever the
question is "what text effect should we build next." One is already shipped: the **ransom cutout**
(`core/ransom.js`, paper + color palettes — see PRIMITIVES). The rest below are queued.

Three near-complete reference implementations were handed over (Study / resourceboy, self-contained
WebGL1 + React). They are worth building, but note the **shared catch**: as given, each is an
*interactive site component* — a `requestAnimationFrame` loop driven by `performance.now()`, pointer
position, and `Math.random()`. That is the exact opposite of `renderFrame(n)` purity. So each has two
possible homes, and the port differs:

- **As a live SITE block** (like the current blocks browser / editor): drop in almost as-is. The site
  already runs interactive WebGL; cursor + rAF are fine there. Lowest effort, highest fidelity.
- **As a VIDEO primitive** (a new fx/layer): must be rewritten **pure in n** — drive every phase from
  the frame number, delete the cursor input and every `Math.random`/`performance.now`, and follow the
  multi-pass-bloom-into-FBOs pattern already proven by `core/stings.js` / `core/raymarch-fx.js`. This
  is the Tier 4 (WebGL) + Tier 5 (determinism) overlap; give it a design note first.

Queued from the handoff:
- **Blur glow** — a crisp word in a gradient-mapped soft bloom on light paper: rasterize the word to a
  height-locked white mask, build a real multi-pass Gaussian bloom (4 downsampled H/V blur FBOs) with
  a depth-of-field focus, sum with falling weights, gamma, then gradient-map the luminance through a
  5-stop ramp; ink-coloured sharp word on top; soft-light film grain. Ships several light-paper
  palettes. (Study, WebGL1.)
- **Chromatic glow** — the same multi-pass bloom, then split into a warm and a cool copy offset in
  opposite directions with a spectral (multi-tap prism) rainbow rim; grain; palette worlds each with
  their own wall colour, dark and light modes. The static `chroma` reveal preset and the `chromaGlow`
  filter already gesture at this; this is the full live version. (Study, WebGL1.)
- **Real-sprite ransom** — the asset-based cousin of `core/ransom.js`: real cut-out magazine letter
  sprites (royalty-free WebP, e.g. resourceboy's pack) picked per character with seeded jitter, versus
  our procedural CSS tiles. Higher fidelity, but needs a vetted royalty-free sprite set committed and
  served, and for video it must bake to frames (no `Math.random` swap). Procedural ships today; sprites
  are the upgrade when the asset licensing is settled.

## What a showcase actually found (App Showcase, 2026-07-19)

The instruction in the next section — build the showcases last and let them dictate the backlog — was
tested by storyboarding an **App Showcase** against all 125 catalog blocks without writing the film.
It surfaced 17 gaps. Three were defects and are FIXED; the other fourteen are the backlog, recorded
here rather than left in a transcript.

**Fixed:** `phoneFrame`/`browserFrame` had no content slot (`children` now, plus a phone status row);
`browserFrame` defaulted `url` to a real company's domain; `deploySuccess` baked in the invented
statistic "Ready in 1.2s" (now `title`/`note`/`steps` props, `note` defaulting to nothing).

~~**The structural one — fix this before more effects.**~~ **DONE (2026-07-19).** `nowPlaying` used to
be the ONLY app-content block, so a product-demo storyboard could only depict a *music app*. All six
factories now ship in `blocks/app.mjs`: `feedRow` · `listRow` · `settingsRow` · `profileHeader` ·
`onboardCard` · `emptyState`. This was correctly called ahead of any transition on this page.

**Containers and composition — DONE (2026-07-19), both, in `blocks/index.mjs` (WAVE 6)**
- ~~No **split-screen / picture-in-picture** primitive~~ → **`splitScreen`** (`splitScreen.pip`). A side
  is a block descriptor `{ block, props }`, the same shape a scene already writes; the container
  computes the pane box and injects `x`/`y`/`w`/`start`/`dur`. It injects `w` and NOT `h` on purpose:
  most factories size themselves off content and accept no `h`, and a prop a factory does not
  destructure is dropped in silence.
- ~~`comparison.beforeAfter` takes two columns of STRINGS~~ → **`comparison.screens`**. `leftScreen` /
  `rightScreen` turn the columns into panes and hand the geometry to `splitScreen`. The string form is
  untouched and takes precedence by absence, so every existing caller renders what it rendered before.

**State that cannot move — DONE (2026-07-19), all three**
- ~~`tabBar` takes a static `active` index~~ → **`tabBar.switch`** / **`tabBar.icons`**. `activeFrom` +
  `activeTo` slide the selection, and `tabs` now take `{ icon, label }`. One `html` layer: the pill
  translates by `var(--p)` and the ACTIVE-styled copy of the label row lives inside the pill,
  counter-translated by the same expression, so whichever tab the pill is over renders lit for free.
  The two copies differ in COLOUR ONLY — a heavier active copy is a WIDER copy, and the alignment
  depends on the two rows being metrically identical.
- ~~`stepFlow` has the same frozen `active`~~ → **`stepFlow.build`**. `activeFrom` + `activeTo` sweep one
  number; rings light and connectors fill as `pos` crosses them. Three states of a ring have to occupy
  the same 44px, which a flow layout cannot express, so this is one `html` layer too.
- ~~No **app-scroll or screen-transition** block at all~~ → **`screenSwap`** (`screenSwap.slide`). Every
  screen shares one box and the windows hand over. It defaults to `wipe` because a wipe is a CLIP: the
  outgoing screen never travels outside its own box, so a swap inside a device frame does not slide
  across the bezel. `slide` pairs its directions (enter right, leave left) rather than retreating.

**Interaction — DONE (2026-07-19), all three, in `blocks/interact.mjs`**
- ~~no standalone cursor/tap block~~ → `pointer` (an arbitrary path) and `tapRipple`.
- ~~no mobile keyboard~~ → `keyboard`, a phone-shaped rising key plane.
- ~~`card`'s `cta` has no press state~~ → `pressButton`.

**Proof surfaces — three of four DONE (2026-07-19)**
- ~~No **app-store / install** block~~ → **`installCard`**, on `followCard`'s conventions. The stars
  FILL: one row of five glyphs revealed by a hard-edged mask whose fraction is `rating / 5`, so a 4.6
  lands mid-glyph. Every figure is a prop and every default is empty (`rating` 0 draws no stars), and
  the count is FORMATTED from a number so the block cannot be handed a sentence.
- ~~`avatarStack` … proves nothing without a hand-placed text layer~~ → **`socialProof`**, which owns
  the stack and the caption and puts the caption where the stack actually ends. `caption`/`sub`
  default to nothing; the `+N` still comes from the caller.
- ~~`toast`/`notification` cannot stack or expire, and the icon prop exists on one and not the other~~ →
  **`toast.stack`** / **`notification.stack`**. `items` stacks and expires via one shared
  `stackWindows` helper in `blocks/kit.mjs`, and each block recurses into its own single-card form so
  the stacked and single shapes cannot drift. `notification`'s `icon` was in the signature and
  rendered NOWHERE; it now draws the same chip `toast` does.
- `loadingBar`/`progressRing` assume card-scale width and do not read inside a device screen. **STILL
  OPEN** — a sizing question, not a missing capability, and untouched by this pass.

**Found while building the above (not fixed here — it belongs in `core/`):** a NESTED `layout:'free'`
group does not position its own children. `layoutGroup` sets `display:block` and `addGroupChild` marks
the children `position:absolute`, but nothing on the group is positioned, so an absolutely-placed
child escapes to the LAYER root. Free layout works at top level (a layer root is positioned) and
misplaces one node down, silently. It cost `installCard` a rating track that flew to the card's corner.

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
~~1. **Lower thirds**~~ **Done** — all twelve variants ship (`lowerThird.cleanBar` … `.newsTicker`).
~~2. **Shader transitions**~~ **Done** — 13 of 14; see Tier 3 above.
~~3. **Code snippet themes**~~ **Done to 12** — `CODE_THEMES` has twelve WCAG-checked palettes and all
   twelve now have catalog rows. Going to twenty-four is more content, not a different kind of work.
~~4. **Analog/retro**~~ **Mostly done** — see Tier 3 above.
5. **The `three` layer type** (Tier 4). Its own precondition ("once 1-4 prove the vocabulary") is now
   met. Note the risk it was written with has since evaporated: headless WebGL already renders in the
   Go pipeline (`site-backdrop.json` ships a `shader` layer), and the layer pattern has been proven
   twice over by `core/layers/shader.js` and `core/layers/paint.js`.

**A standing warning, learned the hard way.** Items 1, 2 and 4 sat on this list as "build first" long
after they were built, and two planning passes in a row were routed at them. Before building anything
named here, check the registry that would own it — `SHADER_FX`, `AMBIENT_FX`, `CANVAS_FX_NAMES`,
`PAINT_FX_NAMES`, `LOOK_NAMES`, `CAP_STYLES`, `PRESENTATIONS`, `blocks/catalog.mjs`. `make coverage`
prints most of them. A roadmap is a claim about the past as much as the future, and this one decayed
silently because nothing checked it.

Everything in Tier 5 gets a design note before a line of code. The determinism claim is the
product; an effect that quietly breaks it costs more than it adds.
