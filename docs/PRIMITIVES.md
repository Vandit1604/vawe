# The primitive library — everything you compose videos from

No templates. These are the words; you write the sentences. Counts are exact (from code, July 2026).
Everything is pure in the frame number: same input, same bytes, any render order.

**Vocabulary size: 26 cut presentations × 8 timings × 4 directions, 14 shader stings, 21 kinetic
presets × 3 split modes, 14 easings + 3 velocity ramps, 14 background presets (recolored by every
brand theme), 16 drawn icons + fetchable logos/flags/photos, camera + ken burns + shake + pulse.**
That is millions of distinct combinations before copy, layout, and color even enter.

## Motion math (`core/lib.js`, 56 exports)

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

## Cuts (`core/transitions.js`) — 26 presentations × 8 timings

`cutStyle(name, seqState, {timing, dir, dist, cx, cy})` → full style set (never leaves properties stuck).

- **Geometric**: `slide` `whip` (motion-blurred throw) `punch` (scale burst) `zoom` (push-through)
  `cube` (perspective hinge) `squeeze` (smear-stretch) `roll` `drop` (gravity) `rise` `flip` `jitter` (decaying shake)
  `skewWhip` (sheared throw) `spin` (logo rotate) `collapse` (vertical fold) `riseBlur` (premium defocus arrival)
- **Reveals**: `wipe` `iris` `clock` `barn` `letterbox` `blinds` (slat mask) + feathered `softwipe` `softiris`
- **Optical**: `fade` `blur` (defocus dissolve) · `none`
- **Timings**: `linear` `smooth` `out` `snappy` `pop` + velocity ramps `rush` `brake` `ramp`
- Taste: whip/slide between same-background scenes only; dark↔light cuts want a shader sting over them.

## Shader stings (`core/shaders.js`) — 14 WebGL cover-the-cut effects

`fxo.draw(fx, progress, seed)`, pure in its args: `flash` `burn` (ember front) `leak` (warm light)
`grain` `dissolve` (to white) `ink` (to near-black) `glitch` (RGB slice bars) `streak` (radial
rays, 4-tap motion smear) `pixel` (mosaic) `confetti` (seeded burst) `ripple` (impact rings) `scan`
(CRT sweep) `warp` (barrel pulse) `bokeh` (dreamy discs). Peak them AT the cut; see MOTION-CRAFT
for the when-to-use guide.

## Kinetic type (`core/kinetic.js`) — 21 presets × char/word/line splits

`splitText(el, mode)` (preserves `<b>/<em>`) + `animateUnits(units, t, {preset, stagger, each})`:
`up` `down` `type` `scale` `blur` `bounce` `slide` `wave` (looping) `flip` `fall` `elastic` `skew` `focus`
`decode` (scramble-resolve) `tilt` `stretch` `gradient` (sweep) `highlight` (marker) `underline` `shadow`
(poster lift) `riseClip` (baseline reveal). Reels: cuts-demo.mp4 + type-demo.mp4.

## Backgrounds (`core/backgrounds.js`) — 14 canvas presets, theme-recolored

Light: `paper` `paperShapes` `paperDots` `soft` `accent` `dotmatrix` `plain` · Dark: `ink` `aurora`
`mesh` `constellation` `spotlight` `brandglow` `shapes`. Every preset reads the brand's palette pack;
plain by default, texture only on hook/CTA.

## Clips & adapters (`core/compose.js`)

`driveClips(root, t)` runs any `[data-start]` element's window/enter/exit/z-track (12 anim names);
`registerTimeline`/`seekAll` seek paused GSAP/WAAPI timelines deterministically.

## Cameras

- Global: `camera: [{t, s, x, y}]` keyframes (hyperscene) / per-scene `camera` (demo) — eased pans+pushes.
- Continuous: bg breathe `scale(1.05 + 0.02·sin(t·0.35))` — never resets at cuts.
- Per-image: `ken: true | {from, to, fx, fy}` on image layers — clipped frame, slow zoom.
- Impact: `shake(t - hitT, {seed})` on the camera wrapper at slam moments.

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
- Optical tracking: themes with `type.optical: true` get size-scaled letter-spacing via
  `trackingFor(px)` (−0.008em body → −0.022em hero). Variable weights (510/590) pass through.
- **Animated site sections**: `make capture-scene URL=… SEL="section" NAME=b LABEL=x PARTS="s1,s2"`
  captures parts + relative geometry to `scenes/<label>.json` and prints layer stubs; re-stage the
  site's animation with windows/cuts (`component` + `part:"p1"`). Re-type text by overlaying our
  own `type`-preset layer. Icons/dots must be DOM shapes, never out-of-face glyphs.

## The open canvas (`formats/hyperscene/`)

Layer types `text` (kinetic splits, `fit` auto-size, ink-aware color) · `image` (+ `ken`) ·
`component` (captured real UI) · `rect` (cards/pills/slabs). Per layer: window (`start/duration`),
`track` z-order, `cut`+`dir`, `anim/out`; global `bg[]` windows, `stings[]`, `camera[]`, `captions[]`.
Schema: `formats/hyperscene/schema.json`. All 20 cuts + 9 stings on film: `engine/out/cuts-demo.mp4`.

## The verification ladder (what keeps freedom from becoming slop)

`make validate` (schema + no-emdash) → `make probe` (purity) → `make audit` (overlap/safe-zone/
text+image WCAG contrast) → `make motion` (holds/settles/monotonic/typing) → eyeball hook, payoff, CTA.

## The no-template doctrine

Study the site (`make lookbook`), name its design language in words, trace every choice to an
observation, pull copy from the site's own words, then compose from THIS vocabulary. Structure is
designed per product; nothing here decides your story for you.
