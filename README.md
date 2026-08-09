<div align="center">

# Vawe

### one JSON → one video. deterministic to the frame.

**Vawe** is a deterministic, data-driven motion-graphics engine. You write one self-describing JSON;
it renders one video (mp4, H.264 + AAC, portrait / landscape / square). A Go service drives headless
Chrome to seek an HTML/CSS scene **frame-by-frame** and ffmpeg to encode and mux. No timeline, no
editor — the JSON *is* the video, and the same input always produces byte-identical output.

![Vawe demo](docs/media/vawe-demo.gif)

<sub>*The Vawe wordmark, typed out from a single JSON scene and rendered deterministically to the frame. See more in the [showcase](site/showcase.html).*</sub>

</div>

---

## Why Vawe

- **Deterministic.** `renderFrame(n)` is a pure function of the frame number — same JSON, same bytes,
  any render order. That's what lets frames shard across parallel browser tabs, and what makes every
  video reproducible and diff-able. Guarded by `make probe`.
- **Agent-native.** Built to be authored by an AI agent from a schema + a taste system, not clicked
  together in a UI. One open canvas (`scene`) of composable primitives — **no templates**.
- **Taste built in.** A 100-block component registry, per-brand memory, composition + micro-typography
  systems, and a gate ladder (static + a vision judge) that keeps output on-brand and un-generic.
- **Any aspect, one source.** `--aspect 9:16,1:1,16:9` renders every platform ratio in one pass.

## Quick start

```bash
# prerequisites: Go 1.21+, Node 18+, ffmpeg, a Chrome/Chromium
make build                              # → bin/vawe  (also runs `make fonts` to fetch the free faces)
./bin/vawe formats/scene/sample.json    # → out/sample.mp4
make video D=formats/scene/sample.json  # same, via make  (add --draft for a fast, no-grain preview)
```

A scene is one JSON:

```jsonc
{ "module": "scene",
  "theme": "argus",                 // palette + fonts (themes/<name>.json) — only the brand's colours
  "aspect": "16:9",                 // 16:9 · 9:16 · 1:1 · 4:5  (or --aspect a,b,c for all at once)
  "layers": [                       // the open canvas — see formats/scene/schema.json
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

Ask an agent to write the scene, grounded in `formats/scene/schema.json` (the contract), the primitive
vocabulary ([`docs/PRIMITIVES.md`](docs/PRIMITIVES.md)), and the taste system ([`docs/TASTE.md`](docs/TASTE.md)).
Reflecting a real brand? `make brandspec URL=…` reads its real CSS, `make sections`/`make palette` capture
and eyedrop it, and `make house-style NAME=…` persists the brand's Design Read so the next video stays
on-brand automatically.

## What makes the output good — the taste system

Static engines make *technically-correct, visually-generic* video. Vawe's differentiator is a taste
system that fights that:

| Layer | What it does |
|---|---|
| **[Blocks](docs/BLOCKS.md)** | a 100-entry component registry (charts, cards, code, tweets, terminals, KPIs…) — vetted, deterministic, and **theme-aware** (they reskin to any brand). `make catalog` to browse. |
| **[Per-brand house style](docs/TASTE.md)** | `make house-style` persists a brand's dominance / faces / palette / signature details / NEVERs so taste is *remembered*, not re-derived each time. |
| **Composition** | `pin:"thirds-*"`, a 12-column grid, and optical centering — beats are well-composed by default, not by eyeballing pixels. |
| **Micro-typography** | optical tracking by size, balanced/pretty wrapping, real kerning + ligatures — on every text layer. |
| **Motion director** | `make direct` picks cuts/stings per transition from the brand's motion personality — restraint by default. |
| **Gate ladder** | `validate` → `critique` (value) → `slop` (anti-slop) → `audit` (contrast/overlap) → **`make judge`** — a vision gate that *sees* the rendered frames and scores composition + brand fidelity, catching what static gates can't. See [`docs/JUDGE.md`](docs/JUDGE.md). |

## Determinism

`renderFrame(n)` is pure in `n`: no wall-clock, no un-seeded randomness (a virtual clock coerces
`Date`/`rAF`/`Math.random` to frame-time). The same JSON renders byte-identical frames regardless of
order — verified by `make probe` (renders sampled frames in scrambled order and diffs the DOM).

## Architecture

Two halves. Go orchestrates and knows nothing about design; the browser owns everything about how a
frame looks. They meet at exactly one function.

```
  formats/scene/<name>.json          one self-describing file: layers · timing · theme · bg · audio
          │
          ▼
  cmd/render (Go)                    parse flags · resolve scene · plan the shard
          │                          --workers (capped at 4) · --fps · --draft · --ss · --alpha
          ▼
  internal/scene (Go) ──► chromedp ──► N headless Chrome tabs, each seeking a DIFFERENT part
          │                            of the timeline at the same time
          │                                    │
          │                                    ▼
          │                            formats/scene/scene.html + core/*
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
          │                          (silent by default — audio is opt-in per scene)
          ▼
  encode.Mux ──► out/<name>.mp4
```

**Parallel capture is only correct because `renderFrame(n)` is pure in `n`** — frame 400 is
byte-identical whether it is rendered first or last, and whether frame 399 was ever rendered at all.
That single invariant is what every gate ultimately protects. See
[Determinism](#determinism) below, and [`docs/architecture.html`](docs/architecture.html) for the
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
core/            THE ENGINE — pure, browser+node, self-contained (imports nothing outside core/):
                 motion.js (math + 39 easings), boot.js (runtime + virtual clock), type.js (kinetic
                 presets), cuts.js, stings.js, backgrounds.js, sequence.js, validate.mjs (the schema
                 validator — boot.js imports it, so it is engine code, not tooling), theme-contract.js
core/layers/     the LAYER REGISTRY — one file per primitive (text/image/rect/glow/group/count/clip/
                 cursor/component/html/board/doc/shader/lottie), each exporting build()/frame()
blocks/          the taste library: manifest-driven component registry (index.mjs + catalog.mjs)
formats/scene/   scene.html (thin orchestrator) · schema.json (the contract) · sample.json
themes/          brand palettes + fonts + motion personality (theme-contract.js defines the shape)
cmd/render,      the Go render service: chromedp capture · ffmpeg encode/mux · audio mixer · queue
  internal/
assets/          fonts · icons · vendored runtimes (lottie) · music/sfx · brand packs
                 (served at /assets/… — the browser fetches fonts from here)
out/             rendered mp4s (gitignored)

scripts/         CLI tooling, grouped by WHAT YOU ARE DOING:
  gates/           prove it is good — lib-test · motion-audit · slop · snap · probe · judge · ledger · schema-drift
  brand/           study a real site — brandspec · sections · lookbook · palette · house-style · photos
  media/           fetch or make assets — fonts · sfx · gen-audio · assets · cards
  author/          compose a scene — beats · expand · batch · captions · preview · capture-*
  site/            build the website — site-assets · site-engine · rules-build · blocks-*
docs/            TASTE.md · PRIMITIVES.md · BLOCKS.md · MOTION-CRAFT.md · JUDGE.md · CRAFT/ · CODEMAPS/
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
make slop D=…                           anti-slop detector (brand-face aware)
make audit [M=…]                        overlap / clipped text / safe-zone / WCAG contrast
make judge D=… VS=<brand>               THE VISION GATE — rubric + house-style, agent scores the frames
make probe [M=…]                        render-order purity (determinism)

# author
make beats D=… VS=<brand>               first/mid/last of every beat beside the source
make expand D=…                         expand {type:block}/{type:comp} sugar → real layers
make compare / scrub / batch            variant selection · contact sheet · data-driven variants

# publish
make site-assets [RENDER=1] [CHECK=1]   engine renders → site/public/assets (+posters), ratio-preserving
```

## Docs

Start at **[`docs/TASTE.md`](docs/TASTE.md)** (how to make something good), then
[`docs/PRIMITIVES.md`](docs/PRIMITIVES.md) (the vocabulary), [`docs/BLOCKS.md`](docs/BLOCKS.md) (the
registry), [`docs/MOTION-CRAFT.md`](docs/MOTION-CRAFT.md) (motion rules), and
[`docs/JUDGE.md`](docs/JUDGE.md) (the vision gate). System map: [`docs/CODEMAPS/ARCHITECTURE.md`](docs/CODEMAPS/ARCHITECTURE.md).

## Status & license

Vawe is under active development. It's released under the **[Vawe Company License 1.0](LICENSE)** — a
source-available license in the spirit of Fair Source and the another engine model:

> **Free for individuals and teams of 3 developers or fewer. Larger companies need a paid license for
> production use.** Rendering your own videos, even inside your own product, is always permitted.

See the plain-English **[License FAQ](LICENSE-FAQ.md)** for who pays and who doesn't, and
**[CREDITS.md](CREDITS.md)** for third-party attribution. Contributions and issues welcome.

For a commercial license (teams over 3 developers), contact the maintainer via the GitHub repo.
