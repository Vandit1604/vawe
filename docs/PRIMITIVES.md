# The primitive library — everything you compose videos from

No templates. These are the words; you write the sentences. Counts are exact (from code, July 2026).
Everything is pure in the frame number: same input, same bytes, any render order.

**Vocabulary size: 26 cut presentations × 8 timings × 4 directions, 33 shader stings, 14 ambient
shader looks, 26 composite looks, 8 canvas passes, 8 resample effects (layer-as-texture), 25 kinetic
presets × 3 split modes, 14 easings + 3 velocity ramps, 14 background presets (recolored by every
brand theme), 16 drawn icons + fetchable logos/flags/photos, camera + ken burns + shake + pulse.**
That is millions of distinct combinations before copy, layout, and color even enter.

## Responsive: one source → every aspect

Coordinates can be **absolute px** (default, unchanged) or **canvas-relative** so the SAME scene reflows
to any platform ratio:
- `"aspect"` (top-level): `16:9 · 9:16 · 1:1 · 4:5 · 4:3` sets the canvas. Or render several at once:
  `make video D=<file> ASPECT=9:16,1:1,16:9` → `out.9x16.mp4`, `out.1x1.mp4`, `out.16x9.mp4`.
- `x`/`y`/`w`/`h` accept a number (px) **or** a string: `"50%"`, `"50%-40"` (fraction ± offset),
  or a keyword (`center`, `left/right/top/bottom` — anchored inside a per-aspect safe inset).
- `"pin": "center|top|bottom|left|right|top-left|…"` — shorthand that places a layer relative to the
  canvas within the safe zone (give it a `w`/`h` so center/edge maths knows its size).

Resolved once at boot (pure in W,H → still deterministic). Absolute-coord scenes are unaffected.

## Motion math (`core/motion.js`, 56 exports)

| Primitive | Signature | Use for |
|---|---|---|
| `interpolate` | `(t, [in...], [out...], {easing, clamp})` | any value over time, multi-stop |
| `spring` / `springSettle` | `(t, {bounce, settle})` | organic overshoot; settle tells you when it stops |
| `accel` / `decel` / `speedRamp` | `(t, k)` / `(t, {peak, sharp})` | velocity ramping: launch, brake, slow-fast-slow |
| `shake` | `(t, {amp, freq, decay, seed})` | impact/camera shake, decays from a hit |
| `pulse` | `(t, {period, amt})` | idle breathing on chrome (logos, live dots) |
| `kenBurns` | `(t, dur, {from, to, fx, fy})` | the tasteful photo zoom, ≤8% travel, never reverses |
| `noise` / `random` / `hashSeed` | seeded | deterministic scatter/drift |
| `track` / `sequence` | `(n, fps, beats/segments)` | beat windows; enter/exit with holdLast |
| `measureText` / `fitText` | browser | auto-size headlines, no overflow |
| `contrastRatio` / `ensureContrast` | WCAG | pick readable ink at build time |
| easings | 14 named in `EASINGS` (+ `rush`, `brake`, `ramp` aliases) | theme-nameable curves |
| `wipe` / `circleWipe` / `clockWipe` | `(t, ...)` → clip-path | raw reveal shapes |
| `installVirtualClock` | auto in `boot()` | Date/rAF/timers/Math.random frozen to the frame |

## Cuts (`core/cuts.js`) — 26 presentations × 8 timings

`cutStyle(name, seqState, {timing, dir, dist, cx, cy})` → full style set (never leaves properties stuck).

- **Geometric**: `slide` `whip` (motion-blurred throw) `punch` (scale burst) `zoom` (push-through)
  `cube` (perspective hinge) `squeeze` (smear-stretch) `roll` `drop` (gravity) `rise` `flip` `jitter` (decaying shake)
  `skewWhip` (sheared throw) `spin` (logo rotate) `collapse` (vertical fold) `riseBlur` (premium defocus arrival)
- **Reveals**: `wipe` `iris` `clock` `barn` `letterbox` `blinds` (slat mask) + feathered `softwipe` `softiris`
- **Optical**: `fade` `blur` (defocus dissolve) · `none`
- **Timings**: `linear` `smooth` `out` `snappy` `pop` + velocity ramps `rush` `brake` `ramp`
- Taste: whip/slide between same-background scenes only; dark↔light cuts want a shader sting over them.
- **JSON knobs on a layer**: `cut` · `dir` · `dist` · `cutTiming` (the 8 above, default `smooth`) · `cx`/`cy` (iris/soft-iris centre %, default 50/50).

## Shader stings (`core/stings.js`) — 35 WebGL cover-the-cut effects

`fxo.draw(fx, progress, seed)`, pure in its args: `flash` `burn` (ember front) `leak` (**seed-generative
multi-hue light leak — every `seed` is a different leak, many multicolour; tint with `color` to force one hue**)
`grain` `dissolve` (to white) `ink` (to near-black) `glitch` (RGB slice bars) `streak` (radial
rays, 4-tap motion smear) `pixel` (mosaic) `confetti` (seeded burst) `ripple` (impact rings) `scan`
(CRT sweep) `warp` (barrel pulse) `bokeh` (dreamy discs). Plus 8 **shape-wipes** adapted from the MIT
gl-transitions catalog into this overlay model (generative, tint/palette-aware): `wipe` (directional,
seed picks the direction) `circle` (disc from centre) `blinds` (venetian bars) `squares` (staggered
grid) `pinwheel` (angular arms) `doors` (panels close) `polka` (dot curtain) `swirl` (rotational
streaks). And the **warp/chromatic family** (wave 2, all generative): `crossWarp` (a wipe whose
edge is dragged by noise, seed picks the direction) `domainWarp` (liquid marble wash; takes
`colors` for the veins like leak) `sdfIris` (iris wipe through a seeded shape: star/hex/diamond/
triangle) `vortex` (ink spiral pulls into a dark eye) `ridgedBurn` (filament ember front sweeps
up, hotter than burn) `lens` (flare: hot core + ghost discs + anamorphic streak) `thermal`
(iron-bow heat veil, coarse sensor cells) `whipPan` (horizontal smear streaks race the cut)
`chromaticSplit` (rgb-fringed shock ring, channels tear apart then reconverge) `dispersion`
(a spectral prism band sweeps the frame) `gridPixelateWipe` (a chunky pixel-block curtain sweeps
the diagonal, quantised-brightness blocks with a jittered pixel-art front; `color`-tint aware).
Peak them AT the cut; see MOTION-CRAFT for the when-to-use guide.
- **JSON sting**: `{ t, fx, dur, seed, color?, intensity? }`. `color` (hex) recolours the effect by
  luminance (tint any effect to a brand accent — e.g. cobalt on a mono reel); omit for native colours.
  `intensity` scales strength (1 = default). The white/grey effects (flash/streak/scan/ripple/bokeh/
  grain/pixel/dissolve) tint cleanly; the coloured ones (leak/burn/glitch/confetti) shift toward the tint.
  `leak` also takes **`colors: ["#..", ...]`** (up to 4) — the leak is built from exactly those hues and
  the `seed` only arranges them (deterministic + art-directable). Omit both → seed-generated multi-hue.

## Ambient shader looks (`core/shaders-ambient.js`) — 17 continuous WebGL fields (the `shader` layer)

Where stings cover a cut, these are LOOPING looks placed as a `shader` layer, pure in local `t`.
Two roles:
- **Fields behind content** (low track, intensity ~0.3): `flow` (premium mesh gradient) `aurora`
  (undulating curtain) `plasma` (two-tone interference) `drift` (soft bokeh) `mist` (near-still haze)
  `matrixDecode` (digital rain: green glyph columns fall with bright white leading cells; `colors[0]`
  tints the rain — a hacker/terminal backdrop).
- **Overlay looks on top of content** (high track, intensity ~0.6-0.9): `vhs` (tracking noise, chroma
  fringe, scanlines, dropouts) `crt` (phosphor stripe mask + rolling refresh bar + vignette)
  `filmGrain` (animated grain + dust, luminance-only so contrast holds) `lightLeak` (warm blobs drift
  in from an edge, looping; `colors` sets the hues). Plus a **distortion-styled** set: `barrel`
  (lens vignette + faint edge chromatic fringe) `heatShimmer` (warm haze rising in wavy bands) `ripple`
  (gentle water caustics) `kaleidoscope` (mirrored rotating mandala; `colors`-aware). These are
  self-generated veils, not true screen-space warps of the pixels below (a WebGL canvas can't sample
  the DOM under it) — honest, and still perfectly composable. Knobs: `speed` · `intensity` · `colors`
  · `seed`. Reel: _wave3-reel demonstrates all eight overlay looks over live copy.

## Kinetic type (`core/type.js`) — 25 presets × char/word/line splits

`splitText(el, mode)` (preserves `<b>/<em>`) + `animateUnits(units, t, {preset, stagger, each})`:
`up` `down` `type` `scale` `blur` `bounce` `slide` `wave` (looping) `flip` `fall` `elastic` `skew` `focus`
`decode` (scramble-resolve) `tilt` `stretch` `gradient` (sweep) `highlight` (marker) `underline` `shadow`
(poster lift) `riseClip` (baseline reveal) `chroma` (chromatic-aberration split converging to crisp,
leaves a hair of fringe) `swing` (hinge from the top edge, pendulum settle) `unfold` (rotateY open
from edge-on). Reels: cuts-demo.mp4 + type-demo.mp4 + chromatic.mp4.
- **Default feel (July 2026):** entrances (`up`/`down`/`slide`/`tilt`/`riseClip` + the `rise` anim) now
  use **`easeOutSettle`** — a gentle overshoot that lands *exactly* at rest (endpoints snapped, so no
  sub-pixel blur on hold). Premium settle by default vs the old flat cubic.
- **Auto-fit safety (default):** a headline with a `w` that wraps past `maxLines` (5) or overflows its
  box is shrunk to fit (via `fitBox`) so it never clips the frame. Only fires on real overflow.
- **JSON knobs on a layer**: `preset` · `split` · `stagger` · `each` · `dist` · `loop` · **`presetOpts`**
  (per-preset overrides, e.g. `gradient` `{c1,c2}` · `highlight`/`underline` `{color}` · `blur`/`focus`
  `{px}` · `tilt` `{deg}` · `wave` `{amp,phase}` · `bounce`/`elastic` `{bounce,settle}` · `scale`/`stretch` `{from}`).

## Ransom cutout (`core/ransom.js`) — comic/kidnapper-note treatment

`"ransom": true` on a `text` layer cuts every glyph from a different source: its own typeface (from a
pool of 8 distinct OFL classes — grotesque · contrast serif · marker · geometric · editorial serif ·
wide display · typewriter mono), its own paper swatch, a torn clip-path edge, a ±6° tilt, size and
baseline jitter, and a lift shadow. Implies `split:"char"` and defaults the entrance to `fall`; pair
with any preset. Pure in n (every choice is a function of `hashSeed(seed,index)`) — the note is
byte-identical across render order. Mixed case is preserved from the input.
- **Two palettes:** `"ransom": true` = muted **paper** (newsprint/kraft, a kidnapper note). `"ransom":
  { "palette": "color" }` = vivid **magazine cutout** (saturated construction-paper grounds, a neon
  tile, wood-type, colored ink on colored stock — the `bE KINd` look).
- **Object knobs**: `{ palette, accent, faces, swatches, ransomSeed }`. `ransomSeed` (also a top-level
  layer prop) defaults to the text, so the same word always cuts the same way; change it to re-roll.
- Faces must be registered in `core/tokens.css` or `ransomStyle` throws (never a silent body-font
  fallback). Edges stay near-axis-aligned on purpose: steeper diagonal cuts rasterise
  non-deterministically under the per-glyph rotation. Reel: ransom-demo.mp4 · ransom-color-demo.mp4.

## Backgrounds (`core/backgrounds.js`) — 14 canvas presets, theme-recolored

Light: `paper` `paperShapes` `paperDots` `soft` `accent` `accentPlain` `dotmatrix` `plain` · Dark:
`ink` `aurora` `mesh` `constellation` `spotlight` `brandglow` `shapes`. Every preset reads the brand's
palette pack; plain by default, texture only on hook/CTA. `accentPlain` = the brand accent as a CLEAN
full-bleed field (grain only, no dots/spotlight) — for plain sites whose hero is a flat colour.
Over an accent-coloured bg, `<b>` emphasis auto-falls-back to the layer's own colour (no blue-on-blue);
override any layer's emphasis colour with `emColor`.
- **JSON bg window**: `{ preset, from, to, value?, opts? }`. `value: "dark"|"light"` forces the treatment.
  `opts` tunes the preset's baked numbers per video: `{ intensity, dotAlpha, spacing, drift, grain }`
  (palette still owns colour). `ink` draws accent-tinted dots — for a clean flat dark, use `plain` + `value:"dark"`.
- **Seed variation (July 2026):** every preset now takes a `seed` (default = hash of theme name + preset),
  so the SAME preset renders **differently across brands** — aurora/mesh/shapes blobs reposition,
  dot grids shift phase/registration. Kills the "every video's backdrop looks the same" problem. Override per window with `seed`.
- **Theme-owned bg (customize, don't default):** a theme can author its OWN backdrop in `themes/<name>.json`
  as `bgDefault: { preset, value?, opts?, seed? }`; a video then says `bg: [{ use: "theme", from, to }]` and
  gets the brand's authored bg instead of a shared global preset name. Fails loud if the theme never authored
  one (same no-fallback contract as colours/fonts). Clean dark backdrops: `deep` / `dark` presets (no dots).

### Customization knobs (added July 2026 — most primitives take overrides now)
The primitives ship rich defaults but expose their knobs to the JSON; reach for these instead of
accepting the default:

| Primitive | Set on the layer / spec |
|---|---|
| Cut | `cutTiming` (8 curves) · `cx`/`cy` (iris centre) |
| Kinetic | `presetOpts` `{}` — per-preset colours / px / deg / amp / spring |
| Shader sting | `color` (tint to a brand accent) · `intensity` |
| Background | `opts` `{ intensity, dotAlpha, spacing, drift, grain }` |
| Count / motion / camera / ken | fully exposed already (from/to/ease · keyframes · s/x/y · from/to) |

Defaults are unchanged, so omitting a knob renders exactly as before. If a look feels generic, a
baked default is usually why — override it.

## Clips & adapters (`core/clips.js`)

`driveClips(root, t)` runs any `[data-start]` element's window/enter/exit/z-track (12 anim names);
`registerTimeline`/`seekAll` seek paused GSAP/WAAPI timelines deterministically.

## Motion tracks (per-layer element choreography)

Any layer takes an optional `motion: [{t, x, y, scale, rot, opacity, ease}]` keyframe track — the
element-choreography primitive that enter-presets + camera alone can't express (converge, drift,
orbit, parallax). Times are **seconds from the layer's start**; `x`/`y` are pixel OFFSETS added onto
the layer's base position; `scale`/`rot`/`opacity` are multipliers. Interpolated pure-in-`n`
(`easeInOutCubic` default, per-keyframe `ease`), composed ON TOP of the enter/exit/cut transform, so
it stacks with `anim`/`cut` and the camera. This is the declarative analog of a GSAP `tl.to()` tween —
same arbitrary motion, still deterministic (no wall clock, dedup-safe).

```jsonc
// a node holds scattered, then flies to the layer's base position and shrinks into a hub
"motion": [ {"t":0,"x":314,"y":-102}, {"t":2.4,"x":314,"y":-102}, {"t":3.05,"x":0,"y":0,"scale":0.5,"opacity":0.4} ]
```

## Cameras

- Global: `camera: [{t, s, x, y}]` keyframes (scene) / per-scene `camera` (demo) — eased pans+pushes.
- Continuous: bg breathe `scale(1.05 + 0.02·sin(t·0.35))` — never resets at cuts.
- Per-image: `ken: true | {from, to, fx, fy}` on image layers — clipped frame, slow zoom.
- Impact: `shake(t - hitT, {seed})` on the camera wrapper at slam moments.

## Sound & captions (added July 2026 — biggest quality-per-effort wins)

The Go mixer (`internal/audio`) was always there (music bed + VO auto-duck + SFX cues + limiter); these turn it on:

- **Auto sound-design**: `"audio": { "auto": true }` — the scene derives SFX cues from its own timing
  (whoosh on every `cut`, a reveal hit on every sting) and the mixer beds `assets/music.wav` under
  it. Pure: cue times are a function of the JSON, and it never touches `renderFrame` (frames stay
  snap-identical, audio is a separate track). Assets: `assets/sfx/{whoosh,reveal,tick,…}.wav`.
- **Muted-social captions**: `captionMode: "pop"` — big bold bottom-third burned-in subtitles (accent on
  `<b>…</b>`), the style social autoplay needs. `make captions D=<file> TEXT="First line. The <b>payoff</b>."`
  auto-times a script into the `captions` array (time ∝ word count, deterministic). Watches fine on mute.

## Icons & images — real assets first, in this order

1. `make brandkit` / favicon + `make capture` (real product UI, pixel-faithful, animatable)
2. `make lookbook URL=… NAME=…` — study shots (art direction, not for rendering)
3. Brand logos: `curl https://cdn.simpleicons.org/<slug>/<hex>` → `assets/icons/` (free)
4. Flags: `flagcdn.com/<iso2>.svg` (public domain) → `assets/flags/`
5. Photos: `make photos Q="…" NAME=brand` — Openverse cc0/pdm/by, attribution auto-recorded in
   `credits.json`; use ONLY in clipped frames with `ken` (CC-BY needs visible credit)
6. Drawn icons: `svgIcon(name)` — `file check shield bolt dollar link cube agent braces globe arrowRight spark plug clock layers`
7. Generated topic cards: `make assets D=…` (deterministic palette cards)
8. Emoji — last resort. **Never** copyrighted posters/stills/paid stock.

## Light, depth & density (July 11 — the "looks like the site" vocabulary)

- `elevation: 1–4` on rect/group/text-chips → inset hairline ring + lit top edge + STACKED
  decreasing-blur shadows (linear.app's real recipe; one flat shadow reads as a flat div).
  `glow: "#hex"|true` adds a 64px ambient halo. `on:"light"` flips the ring for light surfaces.
- `{type:"glow"}` layer → radial center-glow; `beam:"right|left|up|down"` → directional color
  Wave 1 adds `preset` — five light phenomena: `bloom` (energy at a point) · `halation` (film-warm
  ring) · `diffusion` (area veil) · `rimLight` (edge crescent) · `spotlight` (aimable cone, `angle`).
  Optional `pulse` (sine period, seconds) breathes opacity, amplitude clamped ≤ 0.15, pure in t.
  trail (roadmap-bar look). Pure gradient divs; place on a low track.
- `fade: "right|left|top|bottom|edges"` → static edge mask on any layer. **Exclusive with `cut`**
  (cuts reset mask each frame) — the builder throws.
- `reflect: 0.05–0.3` → floor reflection (`-webkit-box-reflect`).
- `{type:"board", cols:[{title,count,cards:[{id,title,labels:[{t,c}]}]}]}` → populated mini-Kanban
  from data (≤4×5), elevation-1 cards; dim + fade it behind a foreground card for real density.
- `{type:"doc", filename, diff, blocks:[…]}` → a markdown/source FILE card from pure data: header
  (filename + green diff chip) then blocks — `{h,accent}` heading w/ accent left-bar · `{body}` mono
  lines · `{code}` · `{bullets:[…]}`. Auto-height, theme-styled (`--surface`/`--line`/fonts). ONE
  layer instead of hand-placing rect+filename+chip+bar+body. Sizes: `nameSize/hSize/bodySize`.
- `{type:"clip", src:"/assets/gen/<name>/manifest.json", x, y, w, loop?, speed?, fit?, radius?}`
  → a generated/any **video played DETERMINISTICALLY** as a preloaded PNG frame sequence. `make gen-video
  Q="…" NAME=<name>` (kie.ai) or `make gen-clip IN=any.mp4 NAME=<name>` extracts frames + a manifest;
  `renderFrame(n)` swaps a preloaded `<img>` src per frame (no `<video>`, no async decode → purity holds).
  `loop` wraps, `speed` scales playback. Generated imagery: `make gen-image Q="…" NAME=<name>` → a normal
  `image` layer. (Generation needs `KIE_API_KEY`; `gen-clip` works on any local mp4 with no key.)
- `{type:"lottie", src:"/assets/lottie/<name>.json", x, y, w, h, loop?, speed?, fit?}`
  → an **After Effects (Bodymovin) animation played DETERMINISTICALLY**. The runtime (lottie-web SVG,
  MIT, loaded only when a scene uses it) is driven by ABSOLUTE seek — `goToAndStop((t-start)*fr, true)`
  per frame — so `renderFrame(n)` stays pure and order-independent (`make probe`). Brings real vector
  motion (animated logos, spinners, checkmarks, confetti) you can't author from primitives. `loop` wraps,
  `speed` retimes, `fit:"contain"` letterboxes (default fills). A missing lib/src degrades to an empty
  layer, never a crash. Drop `.json` exports into `assets/lottie/`.
- `{type:"html", html:"<div…>", x, y, w}` → **raw hand-authored HTML/CSS as one layer** — full design
  freedom for a rich "money-shot" beat (custom grids, gradients, mixed faces), still positioned and
  animated (`anim`/motion tracks) by the engine. MUST be static: `<script>` is stripped so purity
  holds. Use theme vars (`var(--font-sans)`, `var(--accent)`) to stay on-brand. The whole block
  animates as ONE unit (use atomic layers when you want per-element choreography). **Preview standalone
  first (`make preview HTML=frag.html`) and gate the markup (`make slop`)** — hand HTML regresses to slop.
- Optical tracking: themes with `type.optical: true` get size-scaled letter-spacing via
  `trackingFor(px)` (−0.008em body → −0.022em hero). Variable weights (510/590) pass through.
- **Animated site sections**: `make capture-scene URL=… SEL="section" NAME=b LABEL=x PARTS="s1,s2"`
  captures parts + relative geometry to `scenes/<label>.json` and prints layer stubs; re-stage the
  site's animation with windows/cuts (`component` + `part:"p1"`). Re-type text by overlaying our
  own `type`-preset layer. Icons/dots must be DOM shapes, never out-of-face glyphs.

## The open canvas (`formats/scene/`)

**Each primitive lives in its own file** — `core/layers/<type>.js`, exporting `build(kit, el, L)` (DOM)
and optionally `frame(kit, el, L, t)` (per-frame). `core/layers/index.js` is the registry; `scene.html`
is a thin orchestrator (bg/camera/stings/timing) that dispatches to it. **Adding a primitive = adding a
file** (no scene.html edit); shared helpers (styleText/chipBox/layoutGroup/…) live in `core/layers/util.js`.

Layer types `text` (kinetic splits, `fit` auto-size, ink-aware color, `typing`) · `image` (+ `ken`) ·
`component` (captured real UI) · `rect` (cards/pills/slabs) · `count` (count-up) · `glow` · `board` ·
`doc` · `html` · `clip` · `cursor` (pointer `path` + `clicks`) · `group` (layout box — see below). Per
layer: window (`start/duration`), `track` z-order, `cut`+`dir`, `anim/out`, `motion[]` (keyframe track).
Global `bg[]`, `stings[]`, `camera[]`, `captions[]`.
Schema: `formats/scene/schema.json`.

**Layout by containment — `group` is the DEFAULT for anything with a spatial relationship.** A group is
a flex OR grid box; its children flow with `gap` so a label+value, a logo row, or a card grid can never
collide (the another engine/another engine flex-not-pixels rule, in JSON). Reach for a group *before* hand-placing
absolute `x/y` layers — absolute placement is only for free composition + `motion` choreography.
- `layout: "row" | "column" | "grid"` (canonical; `direction` is a legacy alias); `gap`, `items`
  (align-items; `align2` is a legacy alias), `justify` (justify-content), `wrap`.
- grid: `gridCols`, `colGap`, `rowGap`, `colw`.
- children are `text`/`image`/`count` OR a **nested `group`** (real layouts — a card = a column-group in a
  row/grid-group); per-child `grow`/`basis`/`w`/`h`. Children animate on the root group's window.
- the group box itself is chip-styleable (`bg`/`elevation`/`glow`/`radius`/`pad`) and takes `motion`.

## Capture-first: reflect the real sections, don't rewrite them

Hand-written HTML leaks the site's taste — the real page already has the assets, gradients, real
logos and dense real UI. So the default for any hero surface is **capture, then re-animate**:

1. `make sections URL=… NAME=b` → one screenshot per major block + `sections.json` (a stable
   selector + a ready-to-paste `make capture` command per section). This is the anti-omission step:
   every section is on the table, so you can't silently ignore the ones you didn't think of.
2. **Storyboard = one beat per section, in the site's own order.** For each beat, `make capture`
   (static hero) or `make capture-scene` (animated section → parts) the REAL block — its logos,
   shadows, gradients, copy come along for free. Stage it as a `component` layer and animate OUR way:
   window + cut + camera push + staggered parts; re-type text by overlaying our own `type` layer,
   never by editing captured glyphs (purity + font faithfulness).
3. **Hand-write HTML only for connective tissue** — kinetic-type title/CTA cards, number counters.
   If you're hand-building a product card or a testimonial again, capture it instead.

## The verification ladder (what keeps freedom from becoming slop)

**Look before you render** (answers "is my HTML doing what I want?"):
- `make preview HTML=frag.html THEME=b` → one hand fragment (or a captured component JSON) rendered
  STANDALONE on the theme bg → `/tmp/preview.png`. Read it; fix; repeat — before the 900-frame render.
- `make beats D=video.json [VS=b]` → first/mid/last frame of every beat in one sheet → `/tmp/beats.png`.
  `VS=b` stacks each beat beside its source-section shot: a side-by-side fidelity diff. Read it every render.

Then the gates: `make validate` (schema + no-emdash) → `make probe` (purity) → `make audit`
(overlap/safe-zone/text+image WCAG contrast) → `make motion` (holds/settles/monotonic/typing) →
`make similar`/`make ledger` (cross-video sameness) → `make feature-audit` (are you reaching for the
best primitive, or defaulting?) → eyeball hook, payoff, CTA.

## Prefer the better primitive (don't default)

`make feature-audit` exists because the framework's vocabulary keeps outrunning what videos reach for.
When two primitives can do the job, prefer the one on the right:

| Instead of… | Reach for… | Why |
|---|---|---|
| absolute `x`/`y` on each of a row/grid of layers | a **`group`** (`layout: 'row'\|'grid'`, `gap`, `items`) | layout-by-containment; one edit re-flows the set, no hand-math |
| `ease: 'easeOutBack'` on every settle | **`ease: 'spring'`** / `spring-bouncy` on the `motion`/count track | organic overshoot+settle, not a canned curve |
| hand-sizing a headline so it won't clip | **`fitH`** (binary-search multi-line fit) | can't clip; survives a font substitution |
| `preset: 'up'` on every entrance | **vary it** across the 25 presets (`decode`/`tilt`/`riseClip`/`highlight`…) | the "all text rises" tell; monotony is flagged |
| a still `image` layer | add **`ken`** (Ken Burns) | dead stills read as slop; a slow push gives life |

Rule of thumb: if `make feature-audit` says a primitive is *never adopted*, that's usually a gap in the
video, not the framework. It's a WARN, not a blocker — but treat a flag as "prove you chose, not defaulted."

## The no-template doctrine

Study the site (`make lookbook`), inventory every section (`make sections`), name its design
language in words, trace every choice to an observation, pull copy from the site's own words, then
**capture its real sections and re-animate them**; compose connective tissue from THIS vocabulary.
Structure is designed per product; nothing here decides your story for you.


## Colour-grade filter presets (any layer)

`filter:` accepts a raw CSS filter string OR a named grade (core/filters.js): `duotone` · `tritone` ·
`gradientMap` · `posterize` · `sepia` · `vignette` · **`chromaGlow`**, with params after a colon
(`duotone:#141414,#7cffd4`, `posterize:5`, `sepia:0.6`, `vignette:0.55`, `chromaGlow:4,9`). Bare names
derive their colours from the theme (ink shadows, accent highlights). Vignette is honestly an overlay,
not a filter. SVG defs inject once at build, so the render stays pure in n.
- **`chromaGlow`** (`size`, default 1) is the "chromatic glow": a soft neon bloom in the layer's OWN
  shape, just a stacked CSS `drop-shadow` chain (each follows the glyph alpha) — white → warm → cool
  halos at growing radii, plus a 1px warm-top / cool-bottom fringe for the chromatic hint. No SVG, no
  per-frame work. Put it on a `text` layer over a dark bg for a neon sign; composes with any entrance
  preset (try `chroma`). `chromaGlow:1.5` for a bigger bloom on large display type.

## Composite looks (`core/looks.js`) — named filter stacks on any layer

A **look** is a named stack of pure passes in canonical order (`distort → color → glow → texture →
vignette`), applied via `filter:` like any grade. All pure CSS (filter functions + inset overlay divs)
— no SVG, no per-frame work → deterministic. Tier A (20): **glow** `neon` `dreamyHaze` `halationFilm`
`angelic` `hologram` `glitchGlow` · **analog** `vhs` `super8` `crt` `filmNoir` `fadedPolaroid`
`nostalgia` · **sci-fi** `cyberpunk` `nightVision` `thermal` · **camera** `lomo` `droneCinematic`
`vintageAnamorphic` · **hit** `impact` `timeFreeze` · **distort** (static feDisplacementMap) `glassWarp`
`heatWarp` `melt` `watercolor` `dreamSequence` `rippleGlass`.
- **Customization (defaults just work):** every look reskins to the theme with zero config. Quick:
  `filter: "neon:0.9"` (the one positional arg is always `strength` 0..1). Full: `filter: "neon"` +
  **`lookOpts: { color, color2, strength, grain, vignette, warmth }`**. `strength` is a master dial —
  one number scales bloom radius, overlay alpha, grain and chromatic px together.
- **Colours** default to `var(--accent)`/tokens, so a look matches the brand; looks whose identity is a
  fixed palette (`cyberpunk` teal/magenta, `nightVision` green, `thermal` ramp) default to that but take
  overrides. Apply a full-frame look to a `group`/full-frame layer; a text look (`neon`, glow) to the text.
  Reel: looks-reel.mp4. (More looks needing Canvas/WebGL passes are wave-4.)

## Canvas image passes (`core/canvas-fx.js`) — `canvasFx` on an image layer

Per-pixel Tier-2 looks BAKED ONCE at build (in boot's awaited image-preload) into a static PNG, so
the pixels never change per frame → deterministic by construction (probe/snap prove it). Set
`canvasFx` on an `image` layer: a name or `{ fx, cell, ink, paper, seed, … }`.
- **Base passes**: `halftone` (ink dots by darkness) · `dither` (Bayer newsprint 2-tone) · `mosaic`
  (pixelate) · `stipple` (seeded dot density) · `ascii` (glyph ramp) · `edgeDetect` (Sobel) · `crosshatch`
  · `pixelSort` (sort bright spans by luma per scan line → glitch smear; `thresh`, `vertical`).
- **Stylized presets** (base pass + tuned colours): `blueprint` (edges on blue) · `comic` (black
  halftone) · `risograph` (pink halftone) · `sketch` (crosshatch) · `matrix` (green ascii) · `newsprint`
  (sepia dither). `canvasFx:"blueprint"` or override: `{ fx:"comic", cell:5, ink:"#111" }`.
- Only bakes local/same-origin images (cross-origin taints `getImageData` → the raw image shows).
  Best on static images; pairs with a `filter:` grade for extra colour. Reel: canvasfx-reel / tierc-reel.

## Layer as texture (`core/resample-fx.js`) · `resample` on a raster layer

A layer whose content is **already a raster** (an `image` layer's `<img>`, or the canvas a `paint` or
`shader` layer draws into) is bound as a WebGL texture and re-sampled through a fragment shader. This
is the one thing the sting/ambient shaders structurally cannot do: they are fullscreen veils generated
from uniforms, with no access to any pixels. Radial blur, spin blur, fisheye, bit-crush, macroblocking
and glass refraction are all "read the neighbouring pixels of an existing image", so they all arrive at
once the moment a layer can be sampled.

```jsonc
{ "type":"image",  "src":"/assets/x.png", "w":900, "h":600, "resample":{ "fx":"zoomBlur", "amount":0.5 } }
{ "type":"paint",  "paint":"waves",  "resample":"refract" }                                // string shorthand
{ "type":"shader", "shader":"flow",  "resample":{ "fx":"dissolve", "amount":[0.05, 0.95] } }
```

- **Spec**: `fx` (required, one of the 8) · `amount` (0..1; or `[from, to]`, eased across the layer's own
  window with a smoothstep) · `speed` (time multiplier, default 1) · `seed`.

| `fx` | What it does |
|---|---|
| `zoomBlur` | radial smear outward from centre · speed, impact, "the frame is rushing at you" |
| `spinBlur` | rotational smear around centre; the pivot itself stays sharp |
| `fisheye` | `amount` > 0.5 barrel bulge, < 0.5 pincushion, 0.5 is the identity transform |
| `bitCrush` | colour-depth quantisation; each 0.25 of `amount` halves the depth (32 · 16 · 8 · 4 · 2 levels) |
| `macroblock` | the block artefacts of a starved codec, chroma smear and dropped blocks |
| `dissolve` | noise-thresholded erosion with an ember-lit burn front |
| `refract` | liquid glass: bends pixels along a noise gradient, with per-channel dispersion |
| `chromaShift` | radial RGB separation |

**Constraints (all validator-enforced, all fail loud):**
1. **Raster layers only**: `image` · `paint` · `shader`. A `text`/`rect`/`group`/`component` layer owns
   no pixels to sample, so `resample` there is a validation error, never a silent no-op.
2. **`resample` on an image requires explicit `w` and `h`.** The GL buffer is sized at build time and
   an unsized `<img>` has no dimensions until it loads.
3. **`ken` and `resample` cannot combine** on the same image layer. `ken` is a CSS transform on the
   `<img>` and never reaches the sampled pixels, so it would be silently dropped. Pick one.
4. **One WebGL context per resampled layer.** This is a hero-shot effect; do not put it on fifty layers.
5. **Determinism**: pure in local `t`. The source is either static or drawn from `lt` *before* it is
   sampled, and nothing ever samples its own previous output (no feedback). Proven by `make probe` +
   `make canvas-purity`.

Not the same as its neighbours, and the difference is what to reach for:
- **vs `canvasFx`**: baked once at build into a static PNG. Static by construction, so it cannot move,
  animate, or take an `amount` ramp. Use `canvasFx` for a treated still, `resample` when the treatment
  itself is the motion.
- **vs `filter:` / composite looks**: CSS-level, so each output pixel is a function of itself alone.
  They tint, grade, bloom and posterize; they cannot reach a neighbouring pixel, which is why zoom
  smear, spin smear and codec blocking cannot be expressed there.
- **vs `glass`**: `backdrop-filter` reads what is *behind* a layer, but only through the CSS filter
  functions: it can blur and saturate that backdrop uniformly. It cannot **bend** it. `glass` for a
  frosted panel over a scene, `resample:"refract"` when the pixels should displace like real glass.

## Raymarched 3D (`core/raymarch-fx.js`) · the `raymarch` layer type — 5 scenes

Real 3D without a 3D engine. A fullscreen quad plus a signed distance field IS a renderer: march a ray
per pixel, hit an implicit surface, shade it from its normal. No geometry, no scene graph, no
dependency, and no new determinism story, because a raymarched frame is already a pure function of
(uv, time) exactly like every other shader here.

```jsonc
{ "type": "raymarch", "raymarch": "chromeGlass", "x": 600, "y": 240, "w": 720, "h": 720,
  "start": 1, "duration": 5, "colors": ["#7cc4ff"], "spin": 1, "intensity": 1 }
```

| scene | what it is |
|---|---|
| `metaballs` | soft glossy blobs that merge and separate, orbiting closed-form |
| `mandelbulb` | the fractal, its power breathing slowly |
| `chromeGlass` | a mirror-metal torus and sphere reflecting a studio environment |
| `caustics` | a water surface with light caustics agreeing with its own waves |
| `holoFoil` | a bounded disc of iridescent foil, thin-film colour over metal |

**Dials.** `colors` tints the scene (first entry is the primary), `intensity` is a brightness and
alpha dial, `seed` shifts the noise. `speed` and `spin` are separate on purpose: `speed` scales the
SUBJECT's animation, `spin` scales the CAMERA's orbit, and `spin: 0` holds the camera still while the
subject keeps moving. A metaball churning under a locked camera is a different shot from the camera
circling a frozen one, and an author wants both.

**Sizing.** This is a lit subject with a silhouette, not an ambient field: give it a box roughly the
size the object should occupy and let its transparent surround do the compositing. `caustics` is the
exception, being a surface rather than an object, and is happy filling its box.

**Cost.** The most expensive primitive in the engine: every pixel marches up to 72 steps. Use it for
ONE hero shot, size the layer to what it needs, and do not put two on screen at once.

**What it cannot do.** An SDF cannot import a font outline or a mesh, so extruded 3D text, device
showcases, point clouds and cloth are NOT in reach here. That half of Tier 4 is the only place a
three.js dependency would earn itself; see `docs/ROADMAP.md`.

## Caption styles

`captionStyle:` layers a word-timed treatment on the pop caption layout (core/captions.js):
`highlight` · `pillKaraoke` · `weightShift` · `clipWipe`. Per-line `words:[{t0,t1}]` gives real
karaoke timing; without it, windows distribute across the line proportional to word length, so
`make captions` output still reads as intentional. Inactive words dim via colour mix toward the bg,
never opacity — the styled plate keeps every state above WCAG 4.5:1.

## Baked simulation (`sims/` · `make sim`) — the stateful tier, run offline

`renderFrame(n)` is a pure function of `n`: eight workers, arbitrary order, byte-identical output.
A simulation is the exact opposite — frame 412 exists only because 411 ran first — so nothing
iterative can live inside a layer. Physics, particles, fluid, softbody, frame feedback are all
excluded by the same one sentence.

They are not excluded from the videos, only from the renderer. A sim runs **offline, in its own
process, in frame order, as stateful as it likes**, and emits a PNG frame sequence; the scene plays
that sequence back through the existing `clip` layer. Non-determinism is confined to bake time and
the renderer keeps exactly one contract. Same shape as `canvasFx` (an image pass baked once at boot)
and `make spectrum` (band energy baked to a table the render reads by row).

```bash
make sim D=sims/ember-burst.mjs WRITE=1     # → assets/baked/ember-burst/{f0001.png…,manifest.json,meta.json}
make sim-audit                              # seeded? bake fresh against its source? sequence intact?
```

```json
{ "type": "clip", "src": "/assets/baked/ember-burst/manifest.json",
  "x": 110, "y": 90, "w": 620, "start": 0.2, "duration": 2.6 }
```

The baker emits the `clip` manifest itself, so an author references one path and never restates the
frame count: `clip` derives its index from `t`, `manifest.fps` and `speed`. Frames are cleared to
**transparent**, so one bake composites over any scene. `loop: true` wraps; without it the last frame
holds.

Determinism moved to bake time, it did not disappear. A sim draws every random number from
`sims/lib/rng.mjs`, seeded by its exported `seed`; `make sim-audit` fails any sim that reaches for
`Math.random` or the wall clock, any bake whose sim has been edited since (the frames would silently
keep playing the previous version of the effect), and any sequence with a hole in it. Full contract:
`sims/README.md`. Shipped: `ember-burst` · `ink-bloom` · `shatter`.
