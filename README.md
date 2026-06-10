# Shortwave

Data-driven render engine for faceless YouTube Shorts / IG Reels. Output: **1080×1920, 30 fps,
H.264 + AAC**, ~18–40s per format. Each **format is a self-contained folder** of HTML/CSS/JS;
a Go service drives headless Chrome to capture frames and ffmpeg to encode (+ film grain) and
mux audio.

## One JSON → one video

A single self-describing JSON controls everything — it names the format and carries the content:

```jsonc
{ "module": "higherlower",          // which format folder renders it
  "hook": "Bet you can't score 5/5",
  "hookSub": "Which app has more users?",
  "rounds": [ /* … fields per formats/higherlower/schema.json … */ ] }
```

```
make list                          # formats + where each schema/sample lives
./bin/shortwave path/to/video.json    # module from the JSON, out → engine/out/<name>.mp4
make video D=path/to/video.json    # same, via make
```

**Authoring workflow:** ask Claude Code to write the JSON — point it at `formats/<name>/schema.json`
(the field contract) and `sample.json` (a working example), then render the file. `--module` /
`--out` are optional overrides; the JSON is the single source of truth.

## Layout

```
core/                     shared, stable (rarely changes)
  tokens.css                design system: tokens, fonts, stage, cards, hook/outro
  lib.js                    helpers (easing, number format) + the boot(build) contract
formats/<name>/           a format = one isolated folder (imports core, never another format)
  scene.html                markup + scoped <style> + renderFrame(n) logic
  schema.json               editable fields (for the future editor)
  sample.json               example data
  assets/                   format-specific music / sfx (falls back to engine/assets)
engine/assets/            global fonts + default sfx + music.wav
cmd/render, internal/     the Go render service (chromedp + ffmpeg + audio mixer + queue)
scripts/                  preview (storyboard), gen-audio, setup-assets  (Node)
verify/                   integrity + safe-zone + contact-sheet checks
```

## Commands

```
make build                 build the Go renderer (bin/shortwave)
make render M=higherlower  render one format → engine/out/<name>.mp4
make all                   render every format (queue)
make look M=barrace        storyboard (key frames) for visual review
make frame M=growth N=560  one exact frame
make assets D=…[WRITE=1]   fill missing icons: country→flag, brand→logo, else a topic card
make audit [M=…]           layout audit: overlap / clipped text / things too close
make lib-test              motion-primitive asserts (core/lib.js)
make probe [M=…]           render-order purity (protects sharded rendering)
make verify                integrity + safe-zone + contact sheets
make review                fast health snapshot (lib-test + audit + master sheet)
node scripts/gen-audio.mjs regenerate procedural sfx/music   (npm run setup:audio)
```

Render flags: `--fps 30 --workers N --draft --no-grain`.

**Authoring scenes:** read the `shortwave-scene-authoring` skill (purity, tokens, motion
primitives, image system, QA loop). Full system map: [`docs/CODEMAPS/ARCHITECTURE.md`](docs/CODEMAPS/ARCHITECTURE.md).

## Add or edit a format

A format only ever touches its own `formats/<name>/` folder. To add one: copy a folder, edit
`scene.html` (it imports `core/`), define `schema.json` + `sample.json`. The renderer finds it
by listing `formats/`. **After any scene edit, check frames** (`make look M=<name>`) before moving on.

### The scene contract

`scene.html` imports `boot` from `/core/lib.js` and calls `boot(build)`, where
`build(data, fps)` returns `{ fps, duration, stings, sfx, renderFrame(n) }`. The page exposes
`window.__engine.{meta, renderFrame}`; the renderer reads `meta` and drives `renderFrame(n)` per frame.

- Mark cross-post-critical text with `data-layer="critical"` (verify asserts it stays inside the safe zone).
- Audio cues: `sfx: [{ t, name }]` (whoosh/tick/reveal/correct), placed at their times over the music bed.
- Outro is shared: phase `cta` hides the body and shows a centered "Subscribe for more" end screen.
