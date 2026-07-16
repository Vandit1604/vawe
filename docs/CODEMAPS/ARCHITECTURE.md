# Vawe — architecture codemap

> One self-describing JSON → one rendered Short (1080×1920 / 1920×1080, 30fps, mp4).
> Keep this current as the system grows — it's the shared map. See the
> `vawe-scene-authoring` skill for *how to write* scenes.

## Pipeline (one render)

```
data.json ──► cmd/render (Go) ──► chromedp: N headless Chrome tabs
                                     │   each seeks renderFrame(n) → screenshots PNG
                                     ▼
                              internal/scene  (capture, sharded, purity-dependent)
                                     ▼
                              internal/encode (ffmpeg: PNG seq → H.264 + film grain)
                                     ▼
                              internal/audio  (Go PCM mixer: music + sfx cues + VO duck)
                                     ▼
                              internal/encode.Mux ──► out/<name>.mp4
```

The **load-bearing invariant**: `renderFrame(n)` is pure in `n` (byte-identical regardless of order),
which is what makes the sharded capture correct. Guarded by `make probe`.

## Directory map

| Path | What | Notes |
|---|---|---|
| `core/motion.js` | shared scene runtime + pure helpers | `boot()`, `icon()`, `preloadImages()`, formatting, the **motion primitives** (`interpolate`/`spring`/`track`/`rise`/`fade`/`pop`/`slide`/`sequence`/`wipe`/`circleWipe`/`clockWipe` + easings + `EASINGS`), **seeded** `random`/`noise`/`hashSeed`/`stagger`, `measureText`/`fitText`, and the **theme system** (`resolveTheme`/`applyTheme`/`motionDefaults`/`DEFAULT_THEME`). All pure in `n`. |
| `core/type.js` | kinetic-typography kit | `splitText()` (char/word/line) + `PRESETS` (up/down/type/scale/blur/bounce/slide/wave) + `animateUnits()`. Pure per-unit staggered reveals. |
| `core/clips.js` | declarative composition (another engine parity) | `driveClips(root,t)` reads `data-start/-duration/-track/-anim/-out` → timed multi-layer clips w/ enter/exit + z-order; `registerTimeline`/`seekAll(t)` = seekable **animation-adapter interface** (GSAP/WAAPI/custom). |
| `core/tokens.css` | design system | color (themeable `--bg/--accent/…` + `--font-*`), **type scale** (`--fs-*`), **spacing scale** (`--sp-*`), radii/shadows, safe-zone vars, `.stage/.act/.safe` scaffold, `.debug-safe` overlay, `html.alpha` transparent-export mode. |
| `themes/<name>.json` | brand kits / taste | palette + gradient + fonts + motion personality. `data.theme` = name or inline object. `default.json` = current look. |
| `core/theme-contract.js` | required theme keys (no default look) | `themeErrors()` — shared by validate (node) + applyTheme (browser). |
| `formats/<name>/scene.html` | one format's HTML/CSS/JS | exposes `window.__engine`; builds `{fps, duration, stings, sfx, segments, renderFrame}`. Mark key text `data-layer="critical"`. |
| `formats/scene/schema.json` | field schema | the authoring vocabulary; `make schema-check` asserts the engine reads nothing undefined. |
| `formats/<name>/sample.json` + siblings | data JSONs | `sample.json` is the reference; topics are siblings. |
| `formats/scene/` | generic data-driven format | layered composition from `data.layers[]` (text/image + timing + anim + kinetic split/preset) + `data.captions[]`. No per-topic code — the JSON is the video. |
| `scripts/validate.mjs` | data + theme validator | `validateData`/`validateTheme`/`validateAll` against `schema.json`; runs in `boot()` pre-first-frame (fail fast) + `make validate`. |
| `cmd/render` (Go) | CLI entry | `--data/--module/--out`, `--all`, `--list`, `--workers`, `--alpha` (transparent VP9 `.webm` overlay). |
| `internal/scene` (Go) | frame capture | parallel tabs; relies on purity. |
| `internal/encode` (Go) | ffmpeg wrapper | H.264 + grain; `Mux` adds audio. |
| `internal/audio` (Go) | PCM mixer | music loop + named sfx at cue times + **VO ducking** + sting + limiter. |
| `internal/queue` (Go) | concurrency runner | foundation for batch (wired to `--all`). |
| `scripts/` | authoring tools | `cards.mjs` (parametric topic cards), `assets.mjs` (auto-source icons), `preview.mjs`/`beats.mjs` (storyboards), `captions.mjs` (auto-timed subtitles), `gen-audio.mjs` (regenerate the music bed + sfx), `probe-purity.mjs`, `lib-test.mjs`, `schema-drift.mjs`, `feature-audit.mjs`. |
| `verify/` | review tooling | `run.js` (`make verify`: integrity + safe-zone + contact sheets), `audit.mjs` (`make audit`: overlap/overflow/spacing), `review.mjs` (`make review`: fast snapshot). |
| `scripts/kie.mjs` | **planned AI-media client** (kie.ai) | createTask → poll → download for `tts / music / gen-image / gen-video / transcribe`. **Intentional future infra** for another engine-level output (sound, vocals, generated imagery) — no consumers yet; do not delete as "dead code". |
| `.githooks/pre-push` | pre-push gate | runs `make schema-check lib-test`; install with `make install-hooks`. |

## Contracts (don't break these)

- **Purity:** `renderFrame(n)` pure in `n`; primitives + scene logic must be closed-form, no state.
  `make probe`.
- **Animated props:** `transform`/`opacity`/`clip-path`/`filter` only. No per-frame layout props.
- **`data-layer="critical"`:** marks the elements the safe-zone + layout audit check. Mark new
  hero text/cards/values.
- **Color semantics:** `--up`/`--down` = data; `--accent` (lime) = brand chrome only; `--accent-2`
  (cyan) = decor only.
- **Images:** real licensed → generated card → emoji. Never copyrighted media in a published video.

## Command ladder

```
make list                 # formats + where schema/sample live
make video D=…            # render one JSON → out/<name>.mp4
make assets D=… [WRITE=1] # fill missing icons (flag/logo/card)
make look M=… / frame M=… N=…   # storyboard / one frame
make lib-test             # motion-primitive asserts (instant)
make audit [M=…]          # overlap/overflow/safe-zone/spacing  → /tmp/audit/<fmt>.png
make probe [M=…]          # render-order purity (protects sharded render)
make verify               # render integrity + safe-zone + contact sheets (heavy)
make review               # fast snapshot: lib-test + audit + master sheet (/tmp/review.png)
```
