# Shortwave — architecture codemap

> One self-describing JSON → one rendered Short (1080×1920 / 1920×1080, 30fps, mp4).
> Keep this current as the system grows — it's the shared map. See the
> `shortwave-scene-authoring` skill for *how to write* scenes.

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
                              internal/encode.Mux ──► engine/out/<name>.mp4
```

The **load-bearing invariant**: `renderFrame(n)` is pure in `n` (byte-identical regardless of order),
which is what makes the sharded capture correct. Guarded by `make probe`.

## Directory map

| Path | What | Notes |
|---|---|---|
| `core/lib.js` | shared scene runtime + pure helpers | `boot()`, `icon()`, `preloadImages()`, formatting, and the **motion primitives** (`interpolate`/`spring`/`track`/`rise`/`fade`/`pop`/`slide` + easings). All pure in `n`. |
| `core/tokens.css` | design system | color, **type scale** (`--fs-*`), **spacing scale** (`--sp-*`), radii/shadows, safe-zone vars, `.stage/.act/.safe` scaffold, `.debug-safe` overlay. |
| `core/visuals.css` | opt-in visual treatments | `.ic-ring/-duotone/-glow`, `.tex-grain`, `.badge/.chip`, `.frame-gradient`. |
| `formats/<name>/scene.html` | one format's HTML/CSS/JS | exposes `window.__engine`; builds `{fps, duration, stings, sfx, segments, renderFrame}`. Mark key text `data-layer="critical"`. |
| `formats/<name>/schema.json` | field schema | drives the studio quick-edit panel (not a validator yet). |
| `formats/<name>/sample.json` + siblings | data JSONs | `sample.json` is the reference; topics are siblings. |
| `cmd/render` (Go) | CLI entry | `--data/--module/--out`, `--all`, `--list`, `--workers`. |
| `internal/scene` (Go) | frame capture | parallel tabs; relies on purity. |
| `internal/encode` (Go) | ffmpeg wrapper | H.264 + grain; `Mux` adds audio. |
| `internal/audio` (Go) | PCM mixer | music loop + named sfx at cue times + **VO ducking** + sting + limiter. |
| `internal/queue` (Go) | concurrency runner | foundation for batch (wired to `--all`). |
| `scripts/` | authoring tools | `cards.mjs` (parametric topic cards), `assets.mjs` (auto-source icons), `preview.mjs` (storyboards), `probe-purity.mjs`, `lib-test.mjs`, `hooks.mjs` (copy variants), `gen-posters.mjs`. |
| `verify/` | review tooling | `run.js` (`make verify`: integrity + safe-zone + contact sheets), `audit.mjs` (`make audit`: overlap/overflow/spacing), `review.mjs` (`make review`: fast snapshot). |
| `studio/` | in-browser editor | live preview + timeline (editable pacing) + audio preview. `check.mjs` = headless health check (pre-push gate). **Not the current focus.** |
| `.githooks/pre-push` | pre-push gate | runs `make studio-check`; install with `make install-hooks`. |

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
make video D=…            # render one JSON → engine/out/<name>.mp4
make assets D=… [WRITE=1] # fill missing icons (flag/logo/card)
make look M=… / frame M=… N=…   # storyboard / one frame
make lib-test             # motion-primitive asserts (instant)
make audit [M=…]          # overlap/overflow/safe-zone/spacing  → /tmp/audit/<fmt>.png
make probe [M=…]          # render-order purity (protects sharded render)
make verify               # render integrity + safe-zone + contact sheets (heavy)
make review               # fast snapshot: lib-test + audit + master sheet (/tmp/review.png)
```
