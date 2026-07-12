# Shortwave

A deterministic, data-driven motion-graphics engine. **One self-describing JSON → one rendered video**
(30 fps, H.264 + AAC, portrait 1080×1920 or landscape 1920×1080). A Go service drives headless Chrome
to seek an HTML/CSS scene frame-by-frame and ffmpeg to encode (+ film grain) and mux audio.

There is exactly **one module: `scene`** — an open canvas of composable primitives
(text · image · component · rect · group · glow · count + camera · cuts · shader stings · captions).
**No templates.** You compose each video from the vocabulary in [`docs/PRIMITIVES.md`](docs/PRIMITIVES.md);
the JSON *is* the video.

## One JSON → one video

```jsonc
{ "module": "scene",
  "orientation": "landscape",       // or omit for portrait
  "theme": "linear",                // palette + fonts (themes/<name>.json) — use ONLY the brand's colours
  "layers": [ /* text/image/rect/group/count … see formats/scene/schema.json */ ],
  "stings": [ /* shader transitions */ ],
  "audio": { "auto": true } }       // auto sound-design (whoosh on cuts, hits on stings, music bed)
```

```
make list                              # module + its schema/sample
./bin/shortwave path/to/video.json     # → engine/out/<name>.mp4  (add --draft for fast no-grain)
make video D=path/to/video.json        # same, via make
```

**Authoring:** ask Claude Code to write the JSON, grounded in `formats/scene/schema.json` (the field
contract), `sample.json` (a working example), and [`docs/PRIMITIVES.md`](docs/PRIMITIVES.md). Reflecting a
real brand? `make sections URL=… NAME=…` screenshots every section and `make palette IMG=…` **eyedrops the
real pixels** (dominant colours + light/dark), which you author into `themes/<brand>.json` — then verify the
video reads as the same brand with `make beats VS=<brand>`. Full loop + doctrine live in [`CLAUDE.md`](CLAUDE.md).

## Determinism

`renderFrame(n)` is a **pure function of `n`** — the same JSON renders byte-identical frames regardless of
render order (which is what lets frames shard across parallel tabs). Guarded by `make probe` (purity) and
`make snap` (DOM signature diff). No wall-clock, no un-seeded randomness.

## Layout

```
core/            the primitives (pure, browser+node): motion.js (math) + boot.js (scene runtime), type.js, cuts.js,
                 stings.js, backgrounds.js, clips.js, sequence.js, theme-contract.js, tokens.css
formats/scene/  scene.html (the renderer) · schema.json (field contract) · sample.json (reference)
themes/          brand palettes + fonts (theme-contract.js defines the required shape; no fallback look)
cmd/render, internal/   the Go render service (chromedp capture + ffmpeg encode + PCM audio mixer + queue)
scripts/         authoring + gate tools (preview, beats, palette, captions, assets, validate, probe …)
verify/          integrity + safe-zone + WCAG-contrast checks
engine/assets/   fonts · sfx · music.wav · brand asset packs
docs/            PRIMITIVES.md (vocabulary) · MOTION-CRAFT.md · DESIGN-DATABASE.md · CODEMAPS/ARCHITECTURE.md
```

## Commands

```
make video D=…            render one JSON → engine/out/<name>.mp4   (--draft / --no-grain flags)
make list                 the module + schema/sample paths
make look M=scene    storyboard key frames        make beats D=…   first/mid/last of every beat
make validate [D=…]       schema + no-emdash check      make schema-check   engine↔schema drift
make probe [M=…]          render-order purity           make snap M=… [SAVE=1]  DOM signature diff
make audit [M=…]          overlap / clip / safe-zone / WCAG contrast
make motion [M=…]         motion contract (holds, monotonic reveals, settles, no shimmer)
make lib-test             pure-JS asserts for the motion primitives
make slop D=…             anti-slop detector            make feature-audit   primitive utilisation report
make captions D=… TEXT=…  auto-timed burned-in subtitles (muted-social)
make sections / palette / capture   eyedrop a real site's colours + capture its sections & live UI
make ledger D=… / similar cross-video sameness gates    make review   fast health snapshot
node scripts/gen-audio.mjs   regenerate the procedural music bed + sfx
```

## The scene contract

`formats/scene/scene.html` imports `boot` from `/core/motion.js` and calls `boot(build)`, where
`build(data, fps, theme)` returns `{ fps, duration, stings, sfx, renderFrame(n) }`. The page exposes
`window.__engine.{meta, renderFrame}`; the Go renderer reads `meta` and drives `renderFrame(n)` per frame.
Editing `scene.html` or `core/`? Read the `shortwave-scene-authoring` skill and run `make probe` + `make review`.
