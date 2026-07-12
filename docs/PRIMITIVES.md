# The primitive library — everything you compose videos from

No templates. These are the words; you write the sentences. Counts are exact (from code, July 2026).
Everything is pure in the frame number: same input, same bytes, any render order.

**Vocabulary size: 26 cut presentations × 8 timings × 4 directions, 14 shader stings, 21 kinetic
presets × 3 split modes, 14 easings + 3 velocity ramps, 14 background presets (recolored by every
brand theme), 16 drawn icons + fetchable logos/flags/photos, camera + ken burns + shake + pulse.**
That is millions of distinct combinations before copy, layout, and color even enter.

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

## Shader stings (`core/stings.js`) — 22 WebGL cover-the-cut effects

`fxo.draw(fx, progress, seed)`, pure in its args: `flash` `burn` (ember front) `leak` (**seed-generative
multi-hue light leak — every `seed` is a different leak, many multicolour; tint with `color` to force one hue**)
`grain` `dissolve` (to white) `ink` (to near-black) `glitch` (RGB slice bars) `streak` (radial
rays, 4-tap motion smear) `pixel` (mosaic) `confetti` (seeded burst) `ripple` (impact rings) `scan`
(CRT sweep) `warp` (barrel pulse) `bokeh` (dreamy discs). Plus 8 **shape-wipes** adapted from the MIT
gl-transitions catalog into this overlay model (generative, tint/palette-aware): `wipe` (directional,
seed picks the direction) `circle` (disc from centre) `blinds` (venetian bars) `squares` (staggered
grid) `pinwheel` (angular arms) `doors` (panels close) `polka` (dot curtain) `swirl` (rotational
streaks). Peak them AT the cut; see MOTION-CRAFT for the when-to-use guide.
- **JSON sting**: `{ t, fx, dur, seed, color?, intensity? }`. `color` (hex) recolours the effect by
  luminance (tint any effect to a brand accent — e.g. cobalt on a mono reel); omit for native colours.
  `intensity` scales strength (1 = default). The white/grey effects (flash/streak/scan/ripple/bokeh/
  grain/pixel/dissolve) tint cleanly; the coloured ones (leak/burn/glitch/confetti) shift toward the tint.
  `leak` also takes **`colors: ["#..", ...]`** (up to 4) — the leak is built from exactly those hues and
  the `seed` only arranges them (deterministic + art-directable). Omit both → seed-generated multi-hue.

## Kinetic type (`core/type.js`) — 21 presets × char/word/line splits

`splitText(el, mode)` (preserves `<b>/<em>`) + `animateUnits(units, t, {preset, stagger, each})`:
`up` `down` `type` `scale` `blur` `bounce` `slide` `wave` (looping) `flip` `fall` `elastic` `skew` `focus`
`decode` (scramble-resolve) `tilt` `stretch` `gradient` (sweep) `highlight` (marker) `underline` `shadow`
(poster lift) `riseClip` (baseline reveal). Reels: cuts-demo.mp4 + type-demo.mp4.
- **Default feel (July 2026):** entrances (`up`/`down`/`slide`/`tilt`/`riseClip` + the `rise` anim) now
  use **`easeOutSettle`** — a gentle overshoot that lands *exactly* at rest (endpoints snapped, so no
  sub-pixel blur on hold). Premium settle by default vs the old flat cubic.
- **Auto-fit safety (default):** a headline with a `w` that wraps past `maxLines` (5) or overflows its
  box is shrunk to fit (via `fitBox`) so it never clips the frame. Only fires on real overflow.
- **JSON knobs on a layer**: `preset` · `split` · `stagger` · `each` · `dist` · `loop` · **`presetOpts`**
  (per-preset overrides, e.g. `gradient` `{c1,c2}` · `highlight`/`underline` `{color}` · `blur`/`focus`
  `{px}` · `tilt` `{deg}` · `wave` `{amp,phase}` · `bounce`/`elastic` `{bounce,settle}` · `scale`/`stretch` `{from}`).

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
  (whoosh on every `cut`, a reveal hit on every sting) and the mixer beds `engine/assets/music.wav` under
  it. Pure: cue times are a function of the JSON, and it never touches `renderFrame` (frames stay
  snap-identical, audio is a separate track). Assets: `engine/assets/sfx/{whoosh,reveal,tick,…}.wav`.
- **Muted-social captions**: `captionMode: "pop"` — big bold bottom-third burned-in subtitles (accent on
  `<b>…</b>`), the style social autoplay needs. `make captions D=<file> TEXT="First line. The <b>payoff</b>."`
  auto-times a script into the `captions` array (time ∝ word count, deterministic). Watches fine on mute.

## Icons & images — real assets first, in this order

1. `make brandkit` / favicon + `make capture` (real product UI, pixel-faithful, animatable)
2. `make lookbook URL=… NAME=…` — study shots (art direction, not for rendering)
3. Brand logos: `curl https://cdn.simpleicons.org/<slug>/<hex>` → `engine/assets/icons/` (free)
4. Flags: `flagcdn.com/<iso2>.svg` (public domain) → `engine/assets/flags/`
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

Layer types `text` (kinetic splits, `fit` auto-size, ink-aware color) · `image` (+ `ken`) ·
`component` (captured real UI) · `rect` (cards/pills/slabs) · `count` (count-up) · `glow` · `board` ·
`group` (layout box — see below). Per layer: window (`start/duration`), `track` z-order, `cut`+`dir`,
`anim/out`, `motion[]` (keyframe track). Global `bg[]`, `stings[]`, `camera[]`, `captions[]`.
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
| `preset: 'up'` on every entrance | **vary it** across the 21 presets (`decode`/`tilt`/`riseClip`/`highlight`…) | the "all text rises" tell; monotony is flagged |
| a still `image` layer | add **`ken`** (Ken Burns) | dead stills read as slop; a slow push gives life |

Rule of thumb: if `make feature-audit` says a primitive is *never adopted*, that's usually a gap in the
video, not the framework. It's a WARN, not a blocker — but treat a flag as "prove you chose, not defaulted."

## The no-template doctrine

Study the site (`make lookbook`), inventory every section (`make sections`), name its design
language in words, trace every choice to an observation, pull copy from the site's own words, then
**capture its real sections and re-animate them**; compose connective tissue from THIS vocabulary.
Structure is designed per product; nothing here decides your story for you.
