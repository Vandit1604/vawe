# vawe-rules.md: how to write a scene.json

Paste this whole file into Claude (or any model) and ask for a scene. Paste the JSON it returns into
the editor at **/editor** and watch it render live in your browser. Nothing is uploaded; the engine
runs client-side.

> GENERATED from the engine (`node scripts/site/rules-build.mjs`). If it is in this file, it is real.

## The one idea

**One self-describing JSON → one video.** `renderFrame(n)` is a pure function of the frame number,
so the same JSON always produces byte-identical output. There is no timeline and no editor UI: the
JSON *is* the video.

## Skeleton

```json
{
  "module": "scene",
  "aspect": "16:9",
  "theme": "vawe",
  "duration": 6,
  "audio": { "silent": true },
  "layers": [
    {
      "type": "text",
      "text": "Motion graphics <b>from data</b>.",
      "x": 210, "y": 440, "w": 1500, "align": "center",
      "size": 104, "weight": 700, "color": "var(--text)",
      "split": "word", "preset": "up", "stagger": 0.08, "each": 0.5,
      "start": 0.3, "duration": 5.4
    }
  ]
}
```

- `module` is always `"scene"`. `aspect` **must be in the JSON** (`16:9` · `9:16` · `1:1` · `4:5`).
  A scene that needs a CLI flag to come out right is not reproducible.
- The frame is **1920×1080** at `16:9` (1080×1920 at `9:16`). All `x`/`y`/`size` are real frame pixels.
- `start`/`duration` are **seconds**. 30fps.

## Layer types

`text` · `count` · `image` · `video` · `group` · `rect` · `glow` · `beam` · `svg` · `cursor` · `clip` · `html` · `component` · `board` · `doc` · `shader` · `lottie` · `paint` · `raymarch` · `three` · `globe` · `particles` · `composition` · `adjust`

## The props you will actually use

| prop | type | notes |
|---|---|---|
| `type` | string | Layer type. One of: `text` `count` `image` `video` `group` `rect` `glow` `beam` `svg` `cursor` `clip` `html` `component` `board` `doc` `shader` `lottie` `paint` `raymarch` `three` `globe` `particles` `composition` `adjust` |
| `text` | string | Text (may use <b>/<em>) |
| `x` | number|string | Left: px number, or relative "50%" / "50%-40" / center / left / right (resolve |
| `y` | number|string | Top: px number, or relative "50%" / center / top / bottom (resolved per aspect |
| `w` | number|string | Width: px number or "50%" of canvas |
| `h` | number|string | Height: px number or "50%" of canvas |
| `size` | number | Font size (px). Up to 560 for frame-filling hero words (real launch films let  |
| `weight` | number | Font weight |
| `color` | string|boolean | Glow color / text color (glow accepts true = the theme accent glow) |
| `align` | string | Text align. One of: `left` `center` `right` |
| `font` | string | Face. One of: `sans` `serif` `mono` `num` |
| `split` | string | Kinetic split ('path' = SVG strokes, for the `draw` preset). One of: `char` `word` `line` `path` |
| `preset` | string | Kinetic preset (split text; incl. chroma/swing/unfold) OR glow preset (bloom/h. One of: `weight` `up` `down` `type` `scale` `blur` `bounce` `slide` `wave` `shimmerWave` `flip` `fall` `elastic` `skew` `focus` `decode` `tilt` `stretch` `gradient` `highlight` `colorWave` `underline` `shadow` `riseClip` `draw` `chroma` `swing` `unfold` `strike` `flap` `assemble` `bloom` `halation` `diffusion` `rimLight` `spotlight` `chromatic` `chromaCycle` `confetti` `sparks` `dust` |
| `presetOpts` | object | Per-preset knobs (e.g. gradient c1/c2, highlight color, blur px, tilt deg, wav |
| `stagger` | number|object | Per-unit delay (s), OR the three-dial object form { each, amount, from } that  |
| `each` | number | Per-unit duration (s) |
| `start` | ? | Window start: seconds, or relative "otherId+0.5" / "otherId.end-0.2" |
| `duration` | number|string | Window length (s), or a duration word (core/vocab.js): instant / fast / medium |
| `anim` | string | Enter anim. EXACT names (core/clips.js ANIM): fade / up / rise / pop / scale /. One of: `fade` `up` `rise` `pop` `scale` `lift` `defocus` `slide-left` `slide-right` `slide-up` `slide-down` `wipe` `wipe-right` `wipe-left` `wipe-down` `wipe-up` `iris` `clock` `none` |
| `out` | string | driveClips exit anim. `out` plays an entrance BACKWARDS, so the exit that CONT. One of: `fade` `up` `rise` `pop` `scale` `lift` `defocus` `slide-left` `slide-right` `slide-up` `slide-down` `wipe` `wipe-right` `wipe-left` `wipe-down` `wipe-up` `iris` `clock` `none` |
| `enterDur` | number|string | Enter window (s, cut layers), or a duration word (core/vocab.js): instant / fa |
| `exitDur` | number|string | Exit window (s; 0 = hold to end), or a duration word (core/vocab.js): instant  |
| `pin` | string | Canvas-relative placement: edge/center (center = optical), or a rule-of-thirds. One of: `center` `top` `bottom` `left` `right` `top-left` `top-right` `bottom-left` `bottom-right` `thirds-tl` `thirds-tr` `thirds-bl` `thirds-br` `thirds-t` `thirds-b` `thirds-l` `thirds-r` |
| `critical` | boolean | Force include/exclude from layout audit |
| `track` | number | z-order track |
| `to` | number | Count end value (count) |
| `unit` | string | Count unit appended after the number (e.g. %, k, $B); raw ≥1e6 auto-compacts ( |
| `ease` | string | Count easing (EASINGS name, e.g. ramp) |
| `src` | string | Path to the layer's source file: an image, a captured component (.json), a lot |
| `radius` | number | Corner radius (rect/ken-image) |
| `bg` | string | Fill (rect) |
| `border` | string|boolean | Border (rect) (true = a 1px hairline in var(--line)) |

## Kinetic presets (31)

Set `split` (`char` / `word` / `line` / `path`) to break text into units, then `preset` to animate them.

`weight` · `up` · `down` · `type` · `scale` · `blur` · `bounce` · `slide` · `wave` · `shimmerWave` · `flip` · `fall` · `elastic` · `skew` · `focus` · `decode` · `tilt` · `stretch` · `gradient` · `highlight` · `colorWave` · `underline` · `shadow` · `riseClip` · `draw` · `chroma` · `swing` · `unfold` · `strike` · `flap` · `assemble`

- `split:"path"` + `preset:"draw"` makes an **inline SVG stroke draw itself** (logos, icons, chart
  lines). The SVG must be inline in `text`, an `<img>` has no reachable paths.
- `presetOpts` passes per-preset knobs, e.g. `{"px":30}` for `blur`, `{"ease":"easeOutQuint"}` for `draw`.

## Easings (42)

`linear` · `easeInCubic` · `easeOutCubic` · `easeInOutCubic` · `easeOutQuart` · `easeOutExpo` · `easeOutBack` · `easeOutElastic` · `easeInQuart` · `easeInExpo` · `easeInOutExpo` · `easeInSine` · `easeOutSine` · `easeInOutSine` · `easeOutQuint` · `easeInOutQuart` · `easeInQuad` · `easeOutQuad` · `easeInOutQuad` · `easeInQuint` · `easeInOutQuint` · `easeInCirc` · `easeOutCirc` · `easeInOutCirc` · `easeInBack` · `easeInOutBack` · `easeInElastic` · `easeInOutElastic` · `easeInBounce` · `easeOutBounce` · `easeInOutBounce` · `rush` · `brake` · `ramp` · `spring` · `springStiff` · `hold` · `spring-bouncy` · `spring-stiff` · `springEase` · `settle` · `snap`

Entrances decelerate (`easeOut*`), exits accelerate (`rush`), ambient loops are sinusoidal
(`easeInOutSine`). Never `linear` on a visible move.

## Cuts (27)

`"cuts": [{ "t": 3.2, "style": "punch" }]`, `none` · `fade` · `slide` · `whip` · `punch` · `wipe` · `iris` · `clock` · `flip` · `rise` · `blur` · `zoom` · `cube` · `barn` · `softwipe` · `softiris` · `squeeze` · `roll` · `letterbox` · `drop` · `blinds` · `skewWhip` · `spin` · `collapse` · `riseBlur` · `matchCut` · `jitter`

## Shader stings (35)

`"stings": [{ "t": 3.2, "fx": "flash", "colors": ["#2563eb"], "intensity": 0.5 }]`

`flash` · `burn` · `leak` · `grain` · `dissolve` · `ink` · `glitch` · `streak` · `pixel` · `confetti` · `ripple` · `scan` · `warp` · `bokeh` · `wipe` · `circle` · `blinds` · `squares` · `pinwheel` · `doors` · `polka` · `swirl` · `crossWarp` · `domainWarp` · `sdfIris` · `vortex` · `ridgedBurn` · `lens` · `thermal` · `whipPan` · `chromaticSplit` · `dispersion` · `gridPixelateWipe` · `iridescence` · `cinematicZoom`

A sting is punctuation: put it **on** a reveal or a cut, never as decoration.

## Backgrounds (23)

`"bg": [{ "t": 0, "preset": "plain" }]`, `plain` · `paper` · `paperDots` · `paperShapes` · `soft` · `accent` · `accentPlain` · `dotmatrix` · `aurora` · `mesh` · `constellation` · `brandglow` · `spotlight` · `dark` · `deep` · `ink` · `black` · `metallic` · `metallicSheen` · `gradientWash` · `blobs` · `liquid` · `gradient`

Use the texture the brand actually has. A flat brand gets `plain`. A pattern is a seasoning for one
beat, never the wallpaper.

## Themes (41)

`a24` · `ab-control` · `ab-skill` · `ab2-control` · `ab2-skill` · `ab3-nogate` · `ab4-a-ledgerline` · `ab4-b-ledgerline` · `apple` · `argus` · `bloomberg` · `brew` · `brew-dark` · `cadence` · `default` · `ditherkit` · `duolingo` · `emberyear` · `glassatmos` · `ledgerline-cyber` · `ledgerline-neon` · `lumen` · `mercury` · `merged-ignition` · `neutral` · `nike` · `northwind` · `plainyear` · `plinth` · `plinth-auto` · `preface` · `satara` · `threadcite` · `tpot` · `vawe` · `vawe-dark` · `vawe-inter` · `vawe-night` · `vawe-paper` · `vawe-site` · `vercel`

Colours come from the theme, never hardcoded: `var(--text)` `var(--text-2)` `var(--dim)`
`var(--accent)` `var(--surface)` `var(--line)`. `<b>` inside `text` renders in the accent.

## Hard rules

1. **No em-dashes in on-screen text.** The validator rejects them. Use a comma, a period, or `·`.
2. **`aspect` goes in the JSON.**
3. **A text layer with `w` must set `align`**, or it left-aligns inside its box and reads off-centre.
4. **Every colour must clear 4.5:1** against what is behind it. `make audit` hard-fails below 3:1.
5. **Text under ~26px is unreadable** at 1080p. Headlines are 90px+.
6. Keep layers inside the safe box: `x` 90→1830, `y` 60→1020 at 16:9.

## Taste (this is what separates good from generic)

- **Hook → build → payoff.** Never spoil the payoff. Order beats so the most surprising one is last.
- **Every frame fights for its value.** If cutting a beat loses nothing, it was slop.
- **Show, never say.** A word in a box proves nothing. Do not label your effects ("fade", "flash"),
  let them land. Do not open with an eyebrow naming the topic.
- **Never claim on screen what the video does not show.** An unbacked number invites the viewer to
  notice its absence.
- **One hero motion per beat.** Vary the pace: ambient drifts (0.8–1.2s), payoffs snap (0.25–0.35s).
- **Be honest.** Real numbers only.

## Test it

1. Copy the JSON.
2. Open **/editor**, paste, watch it render live.
3. For a real file with sound and grain: `make video D=scene.json` (clone the repo).
