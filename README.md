---
when: you have never run this repo
answers: what vawe is, how to install it, and the one command that turns a JSON into an mp4
group: project
---

<div align="center">

# Vawe

### one JSON → one video. deterministic to the frame.

**Vawe** is a deterministic, data-driven motion-graphics engine. You write one self-describing JSON;
it renders one video (mp4, H.264 + AAC, portrait / landscape / square). A Go service drives headless
Chrome to seek an HTML/CSS scene **frame-by-frame** and ffmpeg to encode and mux. No timeline, no
editor: the JSON *is* the video, and the same input always produces byte-identical output.

![Vawe demo](engine-doctrine/media/vawe-demo.gif)

<sub>*The Vawe wordmark, typed out from a single JSON scene and rendered deterministically to the frame. See more in the [showcase](https://vawe.dev/showcase).*</sub>

</div>

---

## Why Vawe

- **Deterministic.** `renderFrame(n)` is a pure function of the frame number, same JSON, same bytes,
  any render order. That's what lets frames shard across parallel browser tabs, and what makes every
  video reproducible and diff-able. Guarded by `make probe`.
- **Agent-native.** Built to be authored by an AI agent from a schema + a taste system, not clicked
  together in a UI. One open canvas (`scene`) of composable primitives, **no templates**.
- **Taste built in.** A 100-block component registry, per-brand memory, composition + micro-typography
  systems, and a gate ladder (static + a vision judge) that keeps output on-brand and un-generic.
- **Any aspect, one source.** `--aspect 9:16,1:1,16:9` renders every platform ratio in one pass.

## Install

Three ways in. Pick by what you already have on the machine.

**npm**: needs Node 18+, a Chrome or Chromium, and ffmpeg (either on `PATH`, or
`npm i ffmpeg-static` for a bundled copy). The published package carries a renderer binary built for
**linux x64**, the platform the release job publishes from; on any other platform the CLI says so and
tells you to build it. Scenes that reference your own image files are not supported yet, the render
server only serves paths inside the engine (`cli/vawe.mjs`).

```bash
npx vawe my-scene.json --draft     # renders into the current directory
```

**Docker**: needs nothing but Docker. Chrome, ffmpeg and the free faces are inside the image.

```bash
docker build -f Dockerfile.cli -t vawe-cli .
docker run --rm -v "$PWD:/work" vawe-cli my-scene.json --draft
# on Linux, add --user "$(id -u):$(id -g)" so the mp4 lands owned by you
```

The image pins its base images by digest and its Chrome (151.0.7922.173) and ffmpeg (5.1.9) by exact
version, so the same tag renders with the same browser, encoder and fonts. It does **not** pin the
GPU: nothing in the Chrome flags selects software rasterisation, so rasterised output can still
differ between hosts. Three of the large variables are fixed. Renders are not byte-identical across
machines.

**From source**: needs Go 1.26+, Node 18+, ffmpeg, and a Chrome or Chromium.

```bash
make build                              # → bin/vawe  (also runs `make fonts` to fetch the free faces)
./bin/vawe films/scene/sample.json    # → out/sample.mp4
make video D=films/scene/sample.json  # same, via make  (add --draft for a fast, no-grain preview)
```

A scene is one JSON:

```jsonc
{ "module": "scene",
  "theme": "argus",                 // palette + fonts (themes/<name>.json), only the brand's colours
  "aspect": "16:9",                 // 16:9 · 9:16 · 1:1 · 4:5  (or --aspect a,b,c for all at once)
  "layers": [                       // the open canvas, see films/scene/schema.json
    { "type": "text", "text": "one JSON, one video", "pin": "center", "size": 96 },
    { "type": "block", "block": "barChart", "x": 1080, "y": 300, "start": 1, "dur": 4 }
  ],
  "audio": { "silent": true } }
```

## The loop

```
author the JSON  →  make author-check / audit  →  make judge (the vision gate)  →  make video
                   (TASTE=1 adds critique · direct · floor · slop · designspec · copy)
```

Ask an agent to write the scene, grounded in `films/scene/schema.json` (the contract), the primitive
vocabulary ([`engine-doctrine/PRIMITIVES.md`](engine-doctrine/PRIMITIVES.md)), and the taste system ([`engine-doctrine/TASTE.md`](engine-doctrine/TASTE.md)).
Reflecting a real brand? `make brandspec URL=…` reads its real CSS, `make sections`/`make palette` capture
and eyedrop it, and `make house-style NAME=…` persists the brand's Design Read so the next video stays
on-brand automatically.

## What makes the output good: the taste system

Static engines make *technically-correct, visually-generic* video. Vawe's differentiator is a taste
system that fights that:

| Layer | What it does |
|---|---|
| **[Blocks](engine-doctrine/BLOCKS.md)** | a 100-entry component registry (charts, cards, code, tweets, terminals, KPIs…). Vetted, deterministic, and **theme-aware** (they reskin to any brand). `make catalog` to browse. |
| **[Per-brand house style](engine-doctrine/TASTE.md)** | `make house-style` persists a brand's dominance / faces / palette / signature details / NEVERs so taste is *remembered*, not re-derived each time. |
| **Composition** | `pin:"thirds-*"`, a 12-column grid, and optical centering. Beats are well-composed by default, not by eyeballing pixels. |
| **Micro-typography** | optical tracking by size, balanced/pretty wrapping, real kerning + ligatures, on every text layer. |
| **Motion director** | `make direct` picks cuts/stings per transition from the brand's motion personality, restraint by default. |
| **Gate ladder** | `validate` → `critique` (value) → `slop` (anti-slop) → `audit` (contrast/overlap) → **`make judge`**. A vision gate that *sees* the rendered frames and scores composition + brand fidelity, catching what static gates can't. See [`engine-doctrine/JUDGE.md`](engine-doctrine/JUDGE.md). |

## Determinism

`renderFrame(n)` is pure in `n`: no wall-clock, no un-seeded randomness (a virtual clock coerces
`Date`/`rAF`/`Math.random` to frame-time). The same JSON renders byte-identical frames regardless of
order: verified by `make probe` (renders sampled frames in scrambled order and diffs the DOM).

## Architecture

Two halves. Go orchestrates and knows nothing about design; the browser owns everything about how a
frame looks. They meet at exactly one function.

```
  films/scene/<name>.json          one self-describing file: layers · timing · theme · bg · audio
          │
          ▼
  cmd/render (Go)                    parse flags · resolve scene · plan the shard
          │                          --workers (capped at 4) · --fps · --draft · --ss · --alpha
          ▼
  internal/scene (Go) ──► chromedp ──► N headless Chrome tabs, each seeking a DIFFERENT part
          │                            of the timeline at the same time
          │                                    │
          │                                    ▼
          │                            films/scene/scene.html + core/*
          │                            window.__engine.renderFrame(n) → screenshot
          │                            ── layers built · motion tracks evaluated
          │                            ── clips driven · transitions composited
          │                                    │
          ▼                                    │
  frame sequence  ◄───────────────────────────┘
          │
          ▼
  internal/encode (Go)               ffmpeg: frames → H.264 (+ film grain, box-filter downsample)
          │
          ▼
  internal/audio (Go)                PCM mixer: music bed · sfx cues · VO ducking · limiter
          │                          (silent by default: audio is opt-in per scene)
          ▼
  encode.Mux ──► out/<name>.mp4
```

**Parallel capture is only correct because `renderFrame(n)` is pure in `n`**, frame 400 is
byte-identical whether it is rendered first or last, and whether frame 399 was ever rendered at all.
That single invariant is what every gate ultimately protects. See
[Determinism](#determinism) below, and [`engine-doctrine/architecture.html`](engine-doctrine/architecture.html) for the
long-form walkthrough (layer vocabulary, the gate ladder, the render cost model, and the known-weak
places worth pushing on).

The quality ladder wraps the render rather than living inside it:

```
  storyboard ─► script ─► animatic ─► style frames ─► JSON ─► author-check ─► RENDER ─► seam-check ─► judge
   plan the     words in   does it    is this the      the     11 static      mp4      flash at a      a human
   beats        two cols   FIT the    film you want    scene   checks                  transition      reads it
                           clock?     to have made?
```

Each stage catches something the next cannot, so a green ladder is **necessary and not sufficient**:
the static gates cannot see composition or fidelity, which is what `make judge` and your eyes are for.

```
core/            THE ENGINE: pure, browser+node, self-contained (imports nothing outside core/):
                 motion.js (math + 39 easings), boot.js (runtime + virtual clock), type.js (kinetic
                 presets), cuts.js, stings.js, backgrounds.js, sequence.js, validate.mjs (the schema
                 validator: boot.js imports it, so it is engine code, not tooling), theme-contract.js
core/layers/     the LAYER REGISTRY: one file per primitive (text/image/rect/glow/group/count/clip/
                 cursor/component/html/board/doc/shader/lottie), each exporting build()/frame()
blocks/          the taste library: manifest-driven component registry (index.mjs + catalog.mjs)
films/scene/   scene.html (thin orchestrator) · schema.json (the contract) · sample.json
themes/          brand palettes + fonts + motion personality (theme-contract.js defines the shape)
cmd/render,      the Go render service: chromedp capture · ffmpeg encode/mux · audio mixer · queue
  internal/
assets/          fonts · icons · vendored runtimes (lottie) · music/sfx · brand packs
                 (served at /assets/…: the browser fetches fonts from here)
out/             rendered mp4s (gitignored)

scripts/         CLI tooling, grouped by WHAT YOU ARE DOING:
  gates/           prove it is good: lib-test · motion-audit · slop · snap · probe · judge · ledger · schema-drift
  brand/           study a real site: brandspec · sections · lookbook · palette · house-style · photos
  media/           fetch or make assets: fonts · sfx · gen-audio · assets · cards
  author/          compose a scene: beats · expand · batch · captions · preview · capture-*
  site/            build the website: site-assets · site-engine · rules-build · blocks-*
engine-doctrine/            TASTE.md · PRIMITIVES.md · BLOCKS.md · MOTION-CRAFT.md · JUDGE.md · CRAFT/ · CODEMAPS/
```

## Command reference

```bash
# render
make video D=<file> [ASPECT=9:16,1:1]   render one JSON → out/<name>.mp4  (--draft / --no-grain)
make list                               formats + their schema/sample

# taste
make catalog [THEME=<brand>]            browse the 100-block registry, reskinned to a brand
make house-style NAME=<brand>           persist a brand's Design Read
make direct D=<file> [WRITE=1]          motion director: pick cuts/stings per transition
make brandspec URL=… / sections / palette   read a real site's CSS + eyedrop its colours

# gates
make validate [D=…]                     schema + no-em-dash + build-time sugar checks
make critique D=…                       value gate (hollow/scattered/mis-centre beats)
make designspec-check D=…                           anti-slop detector (brand-face aware)
make audit [M=…]                        overlap / clipped text / safe-zone / WCAG contrast
make judge D=… VS=<brand>               THE VISION GATE: rubric + house-style, agent scores the frames
make probe [M=…]                        render-order purity (determinism)

# author
make beats D=… VS=<brand>               first/mid/last of every beat beside the source
make expand D=…                         debug: print the {type:block}/{type:beat}/{type:comp} expansion (auto at render)
make compare / scrub / batch            variant selection · contact sheet · data-driven variants

# publish
make site-assets [RENDER=1] [CHECK=1]   engine renders → site/public/assets (+posters), ratio-preserving
```

## Docs

New here and want to author? Start at **[`QUICKSTART.md`](QUICKSTART.md)** (blank file to rendered
video in one page), then **[`AGENTS.md`](AGENTS.md)** for the full, tool-neutral authoring doctrine.

Start at **[`engine-doctrine/TASTE.md`](engine-doctrine/TASTE.md)** (how to make something good), then
[`engine-doctrine/PRIMITIVES.md`](engine-doctrine/PRIMITIVES.md) (the vocabulary), [`engine-doctrine/BLOCKS.md`](engine-doctrine/BLOCKS.md) (the
registry), [`engine-doctrine/MOTION-CRAFT.md`](engine-doctrine/MOTION-CRAFT.md) (motion rules), and
[`engine-doctrine/JUDGE.md`](engine-doctrine/JUDGE.md) (the vision gate). System map: [`engine-doctrine/CODEMAPS/ARCHITECTURE.md`](engine-doctrine/CODEMAPS/ARCHITECTURE.md).

## Status & license

Vawe is under active development. It's released under the **[Apache License 2.0](LICENSE)**, a
permissive open source license with no paid tier and no team-size limit:

> **Free to use, modify, and distribute, for any purpose, including production and commercial use.**

See the **[LICENSE](LICENSE)** for the full text and the patent grant, and **[NOTICE](NOTICE)** for
third-party attribution. Contributions and issues welcome.
