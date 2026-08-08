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

## Seams (`core/seams.js`) — two-scene shader transitions (blend BOTH beats)

A sting paints a generative overlay ON TOP of one beat; a cut transforms ONE root. A **seam** is the
only transition that samples the OUTGOING and INCOMING beats as textures and blends one INTO the other.
The two beats either side of the boundary are rasterised ONCE at build (whole stage → `u_from` / `u_to`)
and a fragment shader keyed on `u_progress` smears / reveals / bends across them. Determinism is intact:
both textures are pure functions of `n` (baked from two fixed frames), so `renderFrame(n)` only samples
them and stays order-independent — `make probe` + `make canvas-purity` pass on a seam scene.
- **JSON seam**: `{ t, fx, dur, dir?, seed?, intensity? }` in a top-level `seams: [...]`. The window is
  `[t, t+dur]`; the leaving beat is baked from the frame just before it, the arriving beat from the
  frame just after. `fx`: `fade` (cross-dissolve, always the fallback) · `crossWarp` (both beats drag to
  centre and swap through a noise front) · `whipPan` (directional smear of BOTH; `dir` = left/right/up/
  down) · `sdfIris` (arriving beat revealed through an expanding seeded polygon iris) · `dispersion`
  (prism channel-split across the seam) · `lens` (a moving optical centre bends both through one lens) ·
  `flashWhite` (leaving beat blows to white, then white resolves to the arriving beat) · `cinematicZoom`
  (dolly: leaving beat pushes in, arriving beat settles from a punched-in frame). `seed` varies the
  noise/shape; `intensity` (1 = default) scales strength; `timing` eases the progress (default `smooth`
  ease-in-out — a seam that MOVES content reads mechanical at `linear`; same curves as a cut).
- **Rasterisation**: in-browser SVG `<foreignObject>` of the stage DOM composited over the live 2D
  background canvas, with fonts + tokens.css + `:root` vars inlined (external CSS/fonts do not apply
  inside the isolated SVG render). **Limitation**: cross-origin `<img>` and captured components may
  render blank in the baked texture; a blank raster (or no WebGL) falls back to a plain cross-fade.

## Unified transitions (`core/transitions-lower.js`) — one field, routed to the right mechanism

The four mechanisms above (`anim` · `cut` · `sting` · `seam`) are the machinery; author through **one
surface** and the engine routes by name (the catalog in `core/transitions.js`). Lowered to the raw
fields at load, so it is pure sugar — determinism and every gate are unchanged.
- **Boundary** `transitions: [{ at, fx, dur?, dir?, timing?, mech? }]` — a transition between two beats.
  `fx` selects the mechanism: seam-only (`whipPan`/`crossWarp`/`cinematicZoom`) → **seam**; `whip`/
  `punch`/`zoom` → **cut**; `glitch`/`chromaticSplit` → **sting**. The ambiguous basics (`fade`/`slide`/
  `wipe`/`dissolve`/`push`/`uncover`) default to a cheap root **cut**; `mech: "seam"` upgrades to the
  two-scene blend.
- **Layer** `{ …, transition: { in, out, dir?, dur? } }` — sugar over `anim`/`out` on a single layer.
- A raw `cuts`/`stings`/`seams`/`anim` value set on the same beat/layer wins; an unroutable `fx` (a
  typo, or a layer-only anim like `pop` used as a boundary) is rejected at validate, never coerced.
- **See any transition before authoring**: `make transition-preview FX=<name> [MECH=…] [DIR=…] [TIMING=…]`
  renders a labelled A→B filmstrip. Decision theory: `docs/CRAFT/TRANSITIONS.md`.

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
- **Cycling** (`"ransom": { "cycle": 0.5 }`): each letter re-rolls into a DIFFERENT cutout of the SAME
  glyph, in place, every `cycle` seconds, with `stagger` offsetting each letter's clock so the note
  shuffles rather than flipping in unison. Pure in n (`variant = floor((t + i*stagger)/cycle)`); the
  tile is repainted only when its variant changes, which is a determinism requirement, not an
  optimisation. Reel: ransom-internal.mp4.
- **Determinism envelope — read before authoring.** The tiles are rotated and clip-pathed, so each is
  its own compositing layer and the capture can sample mid-raster once there are too many. MEASURED:
  16 glyphs at size 150-170 is byte-identical 3/3; 7 glyphs at 180 is 4/4. But 32 glyphs on screen at
  once varies run to run, and so does 11 glyphs at size 88. **Keep roughly ≤16 glyphs on screen at
  size ≥150** — reveal long copy a line at a time rather than stacking it. Verify with a repeat render,
  never with `make frame` (see MISTAKES #102).
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
  `opts` tunes the preset's baked numbers per video. Four **meta knobs** scale what the preset baked in:
  `{ intensity, dotAlpha, drift, grain }`. Every other key is **passed straight to the fx that reads it**,
  so an fx's own parameters work by name: `liquid` takes `scale` `speed` `warp` `edge0` `edge1` `gloss`
  `res`; dot presets take `spacing` `period` `k` `driftX` `driftY`; `metallic` takes `count` `waves`
  `glow` `sweep`; `particles` takes `count` `speed` `connectDist`. The vocabulary is therefore PER
  PRESET, and a key this preset's fx do not read is an **error** naming the keys they do (it used to be
  accepted and dropped: correct-looking JSON, unchanged render). The accepted set is read out of the fx
  implementations themselves (`FX_PARAMS` in `core/backgrounds.js`), so it cannot go stale.
  Palette still owns colour by default, though `color` is a real fx parameter and may be overridden.
  `ink` draws accent-tinted dots — for a clean flat dark, use `plain` + `value:"dark"`.
- **Seed variation (July 2026):** every preset now takes a `seed` (default = hash of theme name + preset),
  so the SAME preset renders **differently across brands** — aurora/mesh/shapes blobs reposition,
  dot grids shift phase/registration. Kills the "every video's backdrop looks the same" problem. Override per window with `seed`.
- **Theme-owned bg (customize, don't default):** a theme can author its OWN backdrop in `themes/<name>.json`
  as `bgDefault: { preset, value?, opts?, seed? }`; a video then says `bg: [{ use: "theme", from, to }]` and
  gets the brand's authored bg instead of a shared global preset name. Fails loud if the theme never authored
  one (same no-fallback contract as colours/fonts). Clean dark backdrops: `deep` / `dark` presets (no dots).
- **`bg` is REQUIRED.** The engine used to inject one (light brand → `dotmatrix`, dark → `aurora`), which
  made the largest area of the frame the one decision nobody made. Declare a preset, or
  `[{ "preset": "plain" }]` for a deliberately flat field. A window names exactly ONE backdrop.
- **Hand-authored living background**: `{ html: "<style>…</style><div>…</div>", tone: "light"|"dark" }`
  paints raw HTML/CSS as the backdrop instead of a canvas preset — for the backgrounds the preset
  vocabulary can't express (reflecting a real site's hand-written hero CSS). `tone` is required: the
  engine can't read lightness out of your CSS, and without it a layer with no explicit `color` can land
  white-on-white. Markup is sanitised (`core/sanitize-html.js`), same rules as the `html` layer.
  **Animate it with `var(--t)` (seconds) and `var(--p)` (0→1 across the window)**, both written every
  frame and usable inside `calc()`: `transform: rotate(calc(var(--t) * 12deg))`. CSS `animation` and
  `transition` are disabled engine-wide (`core/tokens.css`) because a frame is seeked, not played — the
  validator rejects them by name rather than let them render a dead still. Example:
  `formats/scene/example-html-bg.json`.

### Customization knobs (added July 2026 — most primitives take overrides now)
The primitives ship rich defaults but expose their knobs to the JSON; reach for these instead of
accepting the default:

| Primitive | Set on the layer / spec |
|---|---|
| Cut | `cutTiming` (8 curves) · `cx`/`cy` (iris centre) |
| Kinetic | `presetOpts` `{}` — per-preset colours / px / deg / amp / spring |
| Shader sting | `color` (tint to a brand accent) · `intensity` |
| Background | `opts` — meta `{ intensity, dotAlpha, drift, grain }` + every parameter of the preset's own fx, by name |
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
and optionally `frame(kit, el, L, t, scene)` (per-frame). `scene` is a frozen read-only view of the rest
of the frame — `boxOf(id)` (canvas-space box of any id'd layer at this t, at any depth; see the two
narrow limits below) · `light` · `camera` · `canvas` · `safe`. Every box is resolved before any
primitive's `frame()` runs, so it is never a value left over from the previous frame.
`core/layers/index.js` is the registry; `scene.html`
is a thin orchestrator (bg/camera/stings/timing) that dispatches to it. **Adding a primitive = adding a
file** (no scene.html edit); shared helpers (styleText/chipBox/layoutGroup/…) live in `core/layers/util.js`.

**Four types share one primitive.** `paint`, `shader`, `raymarch` and `three` are all "a canvas sized
to the layer box, redrawn every frame from local time", so they are one file — `core/layers/canvas.js`
— with a backend per type in `core/surfaces/`. A backend owns PIXELS and nothing else: the sizing, the
styling, the off-window clear and the dedup stamp are the primitive's, once, for all four. This is
internal. The four names, and every prop they take, are unchanged in scene JSON; there is no `canvas`
type and no `surface` prop. Adding a canvas-drawn look = adding a file to `core/surfaces/` and a line
to `core/layers/index.js`.

**`modifiers: []` — an effect applied to a layer, instead of another layer type.** Any layer (and any
group child) may carry `"modifiers": [{ "mixBlend": "difference" }]`. Each key names a modifier from
`core/fx/`, a registry that mirrors the layer one: a file per modifier exporting `build(kit, el, L, spec)`
and optionally `frame(kit, el, L, t, scene, spec)`, so **adding a modifier = adding a file**. An unknown
name is a hard error listing the known set, never a skipped entry. Modifiers apply in array order and
always last: they are the final SLOT of the per-frame pipeline (`core/tracks/`, below), so a modifier
acts on the finished frame. `transform`, `opacity` and `filter` on the layer element belong to the
tracks and a modifier must not append to them; one that needs a transform gets an element of its own,
or reaches for a CSS property the tracks do not own (`tilt` uses the `rotate` longhand). Note this is
**not** `fx`, which is the named-GSAP-effect slot.

**`core/tracks/` — the per-frame pipeline, and where the line falls.** A cross-cutting job the engine
runs for EVERY layer on every frame is a **track**: one file exporting the `slot` it runs in and a
`frame()`, listed once in order in `core/tracks/index.js`. That list is the composition order, a slot
holds exactly one track, and two tracks claiming one slot is an error the engine refuses to start with.
The order, top to bottom: `enter` (a declared cut's styling) · `split` (kinetic units) · `glyphs`
(ransom cycle) · **`primitive` (the layer type's own `frame()`)** · `orbit` (borderTrail) · `spin`
(circular text) · `vars` · `react` (audio) · `box` (w/h/depth) · `follow` · `transform` (motion +
motion blur) · `post` (modifiers). Note where `primitive` sits: a layer type's `frame()` runs in the
MIDDLE, which is why a `cursor` may overwrite a cut's transform and why the motion track still
composes on top of it.
**Track or modifier?** A modifier is opt-in per layer, runs last, and may not touch `transform` /
`opacity` / `filter`. If a feature must land between two existing jobs, or must write one of those
three, it is a track. Otherwise it is a modifier, and modifiers are cheaper.

**`follow: { id, edge, gap, dx, dy }` — pin to another layer's LIVE box, every frame.** `anchor` places
a layer against the canvas and `becomes` hands one layer's final pose to another; both resolve ONCE at
build, against numbers. Neither can keep a label under a card that is moving, because the card's
position after its motion track is only known at `t`, so authors copied the card's keys into the label
and re-copied them by hand at every retime. `edge` is `center` (default) · `above` · `below` · `left` ·
`right`, with `gap` the space outside that edge; `dx`/`dy` nudge. Centres are matched, not corners.

```json
{ "id": "caption", "type": "text", "text": "live users",
  "follow": { "id": "card", "edge": "below", "gap": 24 } }
```

The pin lands in the `follow` slot, **before** this layer's own `transform`, so a follower may still
carry its own motion track and that choreography plays about the pinned position. The follower needs an
`id` (it is placed by its own measured size). An unknown target, a missing `id` and an unknown `edge`
are hard errors naming the known set. One limit, by arithmetic rather than by a check: a box is where a
layer's own geometry puts it, so following a layer that is itself following a third pins you to the
middle one's **unpinned** position. Follow the layer that actually moves.

**What a modifier can see.** `frame()`'s 5th argument is a **frozen read-only view of the whole frame**,
resolved before any layer draws, so a modifier can never read a value another layer left behind and
`renderFrame(n)` stays pure in `n`:

| field | what it is |
|---|---|
| `boxOf(id)` | any layer's canvas-space box at `t` (x/y/w/h/cx/cy/scale/rot/opacity/visible), or null |
| `specOf(id)` | that layer's own authored JSON, deep-frozen, plus its `z` (paint order) |
| `ids` | every layer that declares an `id`, sorted by `z` |
| `clock` | `{ t, frame, fps, duration }` — how far through the FILM this frame is |
| `theme` | `{ name, palette }` — the film's locked colours, by role |
| `bg` | the backdrop at `t`: `{ light, accent, authored }` (`light: null` = authored with no `tone`) |
| `marks` | the film's joints, `[{ t, kind }]` for every cut · seam · sting, sorted |
| `light` · `camera` · `canvas` · `safe` | the scene's key light, the camera at `t`, the canvas size, the safe box |

Font roles are deliberately absent: a face is written at build by the primitive that lays the text out,
and nothing in the registry could consume one per frame.

**A group child is a full layer here.** `boxOf`/`specOf`/`ids` cover group children at any depth: a child
is laid out, so its offset inside the group is measured ONCE at build and composed with the group's
per-frame box, and `occlude` and `shadow` work on one. Its `z` is its group's, because a group paints as
one element. Two limits, both narrow and both loud: a group whose motion track keys `w`/`h` reflows its
children, so their boxes are null and the modifiers that need one say exactly that; and `mixBlend` is
refused on a child, because CSS blends against the nearest stacking context and the group is one.

**`shadow` — cast away from the scene's light.** Declare `"lighting": {"x": 540, "y": 120}` at the top
level (canvas px, plus optional `intensity`), then `{"shadow": 30}` or
`{"shadow": {"dist": 40, "blur": 50, "color": "accent", "opacity": 0.3}}`. Every other drop shadow in
the engine (`elevation`, `L.shadow`) is a fixed offset written once at build, so it points the same way
on every layer forever; this one is computed per layer from the light to that layer's centre, so two
cards either side of the light throw their shadows in **opposite** directions and one scene-level number
re-lights the film. It rides `box-shadow`, which follows the layer's **box, not its glyphs** — right for
cards, panels and images, wrong for a bare headline (use `L.filter: "drop-shadow(...)"` there). Refuses
alongside `elevation`/`shadow`/`glow` (same CSS property). It works **on a group child** — each card in
a group throws its own shadow away from the light, which is what a row of objects on a surface does; put
it on the group when the group should read as one solid thing.
`color` defaults to **`"auto"`**, which reads the backdrop at `t` — the theme's ink over a light field,
black over a dark one, the accent over an accent field — and also takes a **palette role name**
(`"accent"`, `"ink"`, `"line"`), so the shadow moves with the brand instead of pinning a hex the theme
already owns into a second place. Any other string is a plain CSS colour.

**`occlude` — hide this layer where another layer covers it.** `{"occlude": "cardId"}`,
`{"occlude": "above"}`, or `{"occlude": {"by": ["a","b"], "pad": 12, "invert": true}}`. `"above"` and
`"below"` mean every layer painted in front of / behind this one, read from the scene's paint order, so
the set is never a hand-written list that silently rots when a layer is added or re-tracked. z-index can
only say "in front or behind,
always"; this says "behind THAT, right now", so a caption can disappear under a card as the card slides
across it. The hole follows the occluder's motion track exactly, rotation and scale included, and closes
while the occluder is outside its own window. `invert` keeps only the overlap. Both layers need an `id`
(it is `scene.boxOf` that answers "where is the other layer"). It refuses on a layer whose `cut` animates
clip-path (`barn`, `letterbox`), which it would win silently and cancel.

**`tilt` — turn a layer out of the picture plane.** `{"tilt": {"y": 26}}` leans the layer about its own
centre in 3D; `x`/`y`/`z` are degrees. Every tilted layer sharing a parent is projected through **one
camera**, so a row of cards recedes toward one vanishing point instead of each leaning at its own
(`docs/MISTAKES.md` #59 rejected per-layer 3D on exactly that failure, having used the `perspective()`
transform *function*, which puts the camera on each layer; the *property* on the shared parent is the fix,
proved by `scripts/dev/spike-3d.mjs`). `dist` is that camera's distance in px (default 1600, smaller = a
wider lens) and `origin` its vanishing point (`"center"` or `[x, y]` in canvas px); siblings that disagree
about either are a hard error, because one parent is one camera. On a **group child** the camera belongs
to the group, so tilted children share a vanishing point local to the group and `origin` defaults to the
group's centre; to tilt a whole group as one plane, put `tilt` on the group layer. A scene that declares
no tilt has no camera written anywhere and renders byte-identical.

**`kick` — hit the layer on the film's own joints.** `{"kick": true}`, or
`{"kick": {"on": "cut", "scale": 1.08, "frames": 6}}`. On every cut, seam or sting (`on` picks the
kinds, default all three) the layer takes a scale kick that settles over `frames` FRAMES — the unit an
edit is specified in, and the one that keeps the same snap at 60fps. The times come from the scene's own
`cuts`/`seams`/`stings`, so moving a cut re-times every kick in the film; a hand-copied list of times
would be silently wrong the moment anything moved. Named `kick` because `punch` is already a whole-frame
cut style. It rides the `scale` longhand, so it composes over whatever the motion track wrote.

**`progress` — the film's own clock, as a number your markup can draw.** `{"progress": true}` writes
`--film` (0 at the first frame, 1 at the last) onto the layer; `{"progress": "--bar"}` or
`{"progress": {"var": "--bar", "ease": "easeInOutCubic"}}` name it and shape it. Every descendant
inherits it, so a runtime bar is `width: calc(var(--film) * 840px)` and a closing ring is one
`stroke-dashoffset`. Not `vars`, which runs over the LAYER's window: this is the SCENE's, so nothing has
to restate the runtime inside the layer and re-cutting the film re-times the bar for free.

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
- `make beats D=video.json [VS=b]` → first/mid/last frame of every beat in one sheet → `/tmp/beats/<name>.png`.
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

**Glow is a luminance bloom, not a drop-shadow.** The six glow-family looks (`neon`, `dreamyHaze`,
`halationFilm`, `angelic`, `hologram`, `glitchGlow`) threshold the layer's own brightness, blur that,
and add it back: light leaves the bright parts of the picture and a dark region emits nothing. Two
consequences worth knowing before you author:

- On a **photo or any opaque box**, the glow appears inside the image, around its highlights. It does
  NOT trace the layer's rectangle. (It used to, because the pass was a stack of `drop-shadow`s, which
  blur the alpha channel. See docs/MISTAKES.md #112.)
**The relief family reads neighbouring pixels.** `emboss`, `letterpress`, `chrome`, `edgeGlow` and
`fatten` are built on `feConvolveMatrix`, `feMorphology` and the SVG lighting primitives, so unlike
every other look they change a layer's apparent SURFACE rather than its colour. They need texture to
bite: excellent on a photo or heavy display type, nearly invisible on a flat fill. `letterpress` and
`chrome` light a bump map made from the picture's own brightness, which is why a low-contrast source
lights as one featureless slab.

- On **dark content there is nothing to glow.** If a glow look looks like a no-op, the subject is
  below the threshold, not the look failing. Raise the subject's exposure, or pick a look from the
  colour or texture family instead.

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
   no pixels to sample, so `resample` there is a validation error, never a silent no-op. `raymarch` and
   `three` own a canvas but not a sampleable one (they hold their own WebGL context), and they now
   refuse `resample` by name — until the canvas types were collapsed they accepted it and ignored it.
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
- **vs `filter:` / composite looks**: mostly CSS-level, so most passes make each output pixel a
  function of itself alone. They tint, grade, bloom and posterize. The three SVG-backed passes
  (`bloom`, `displace`, `gradientMap`) do read neighbours, but only through a fixed kernel or noise
  field, so they cannot express a directional zoom smear, spin smear or codec blocking.
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
