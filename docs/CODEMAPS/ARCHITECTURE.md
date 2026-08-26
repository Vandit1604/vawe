---
when: changing the engine itself, not a video
answers: "the system map: JSON → validate → scene.html → renderFrame(n) → Go renderer → mp4, and who owns what"
group: engine
---

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
which is what makes the sharded capture correct. Guarded per-scene by `make probe` (render-order DOM
purity) + `make canvas-purity` (shader/canvas pixels), and across the WHOLE library by `make snap-all`
(every shipped scene: quarantines any order-dependent scene + diffs a DOM signature vs a saved baseline).

## Directory map

| Path | What | Notes |
|---|---|---|
| `core/motion.js` | shared scene runtime + pure helpers | `boot()`, `icon()`, `preloadImages()`, formatting, the **motion primitives** (`interpolate`/`spring`/`track`/`rise`/`fade`/`pop`/`slide`/`sequence`/`wipe`/`circleWipe`/`clockWipe` + easings + `EASINGS`), **seeded** `random`/`noise`/`hashSeed`/`stagger`, `measureText`/`fitText`, and the **theme system** (`resolveTheme`/`applyTheme`/`motionDefaults`/`DEFAULT_THEME`). All pure in `n`. |
| `core/type.js` | kinetic-typography kit | `splitText()` (char/word/line) + `PRESETS` (up/down/type/scale/blur/bounce/slide/wave) + `animateUnits()`. Pure per-unit staggered reveals. |
| `core/clips.js` | declarative composition (another engine parity) | `clipStyleAt(el,t)` reads `data-start/-duration/-track/-anim/-out` and RETURNS the complete style at t (writes nothing), so the engine can be asked what a layer looks like at a time it is not drawing; `driveClips(clips,t)` is that, performed, over the frozen set `collectClips(root)` took at build. `registerTimeline`/`seekAll(t)` = seekable **animation-adapter interface** that drives paused WAAPI + `gsap.globalTimeline` per frame. |
| `core/preload.js` | awaited readiness phase (extracted from `boot`) | one async pass per asset kind BEFORE the virtual clock: images, spectrum, three, canvasFx, components, clips, ransom sprites, **GSAP** (`preloadGsap`: loads on demand for `gsap`/`morph`/`fx`/`fxOut`/`motionPath`/`physics`/`splitText`, stops the ticker, registers effects+plugins), lottie. Whatever it puts on `window.__*` is a static table by render time, so `renderFrame(n)` stays pure. |
| `core/gsap-effects.js` + `core/morph.js` | GSAP as an INTERNAL tween engine | `gsap-effects.js` = a NAMED effect library (`registerGsapEffects`): entrances/text/loops referenced from JSON by `fx`, exits by `fxOut` (`GSAP_FX`/`EXIT_FX`/`FX_DUR` exports). `morph.js` = TextMorph (letters migrate A→B). GSAP is vendored (`assets/vendor/gsap.min.js` 3.13 + MotionPath/Physics2D/SplitText); scenes can't bring JS, so GSAP is engine-internal, seeked per frame → pure. |
| `core/seams.js` · `core/stings.js` · `core/cuts.js` | beat-to-beat transitions | `seams.js` = two-scene GPU blends (`SEAM_FX`, incl. `portal`); `stings.js` = single-scene shader FX (`SHADER_FX`); `cuts.js` = hard-cut timing. All shader-based → guarded by `make canvas-purity`. |
| `blocks/` | build-time BLOCK/COMP sugar | `index.mjs` = the assembly point + registry (`BLOCKS`); factories live in family siblings sharing `kit.mjs` (`charts`/`dev`/`social`/`ui`/`app`/`interact`), plus `catalog.mjs` (variants). A `type:"block"` layer (pointer/kpiRow/browserFrame/…) carries the BLOCK's own props, expanded by `make expand` into real layers. Block props are validated by `make blocks-audit`, NOT the base layer schema (validate.mjs exempts block/comp). |
| `core/tokens.css` | design system | color (themeable `--bg/--accent/…` + `--font-*`), **type scale** (`--fs-*`), **spacing scale** (`--sp-*`), radii/shadows, safe-zone vars, `.stage/.act/.safe` scaffold, `.debug-safe` overlay, `html.alpha` transparent-export mode. |
| `themes/<name>.json` | brand kits / taste | palette + gradient + fonts + motion personality. `data.theme` = name or inline object. `default.json` = current look. |
| `core/theme-contract.js` | required theme keys (no default look) | `themeErrors()` — shared by validate (node) + applyTheme (browser). |
| `formats/<name>/scene.html` | one format's HTML/CSS/JS | exposes `window.__engine`; builds `{fps, duration, stings, sfx, segments, renderFrame}`. Mark key text `data-layer="critical"`. |
| `formats/scene/schema.json` | field schema | the authoring vocabulary; `make schema-check` asserts the engine reads nothing undefined. |
| `formats/<name>/sample.json` + siblings | data JSONs | `sample.json` is the reference; topics are siblings. |
| `formats/scene/` | generic data-driven format | layered composition from `data.layers[]` (text/image/block/… + timing + `anim`/`out` + kinetic `split`/`preset` + GSAP `fx`/`fxOut`/`gsap`/`morph`/`motionPath`/`physics`/`splitText` + `circle`/`ransom`) + `cuts`/`seams`/`stings` + `data.captions[]`. No per-topic code — the JSON is the video. |
| `core/validate.mjs` | data + theme validator | `validateData`/`validateTheme`/`validateAll`/`fxErrors`/`lintData` against `schema.json`; runs in `boot()` pre-first-frame (fail fast) + `make validate`. Browser-safe (boot imports it). |
| `cmd/render` (Go) | CLI entry | `--data/--module/--out`, `--all`, `--list`, `--workers`, `--alpha` (transparent VP9 `.webm` overlay). |
| `internal/scene` (Go) | frame capture | parallel tabs; relies on purity. |
| `internal/encode` (Go) | ffmpeg wrapper | H.264 + grain; `Mux` adds audio. |
| `internal/audio` (Go) | PCM mixer | music loop + named sfx at cue times + **VO ducking** + sting + limiter. |
| `internal/queue` (Go) | concurrency runner | foundation for batch (wired to `--all`). |
| `scripts/` | authoring tools + gates | `scripts/author/` (preview/storyboards/captions), `scripts/media/` (assets/audio/music/beatsync), `scripts/site/` (gallery). **Gates live in `scripts/gates/`**: `probe-purity`, `lib-test`, `lint-test`, `snap-scenes` (`make snap-all`), `canvas-purity`, `schema-drift`, `blocks-audit`, `motion-audit`, `dead-branch`, `docs-drift`. |
| `verify/` | review tooling | `run.js` (`make verify`: integrity + safe-zone + contact sheets), `audit.mjs` (`make audit`: overlap/overflow/spacing), `review.mjs` (`make review`: fast snapshot). |
| `scripts/media/kie.mjs` | **planned AI-media client** (kie.ai) | createTask → poll → download for `tts / music / gen-image / gen-video / transcribe`. **Intentional future infra** for another engine-level output (sound, vocals, generated imagery) — no consumers yet; do not delete as "dead code". |
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
make validate [D=…]       # data + theme against schema.json (boot runs it too)
make lib-test             # motion-primitive + easing asserts (instant)
make lint-test            # regression asserts for validate's lint/fx/ease/block rules (instant)
make audit [M=…]          # overlap/overflow/safe-zone/spacing  → /tmp/audit/<fmt>.png
make probe [M=…] [D=…]    # render-order purity, one scene (protects sharded render)
make snap-all [SAVE=1]    # WHOLE-LIBRARY: determinism screen + regression diff over every scene
make verify               # render integrity + safe-zone + contact sheets (heavy)
make review               # fast snapshot: lib-test + audit + master sheet (/tmp/review.png)
```

## What runs where (CI)

Four workflows in `.github/workflows/`. Every one of them runs a `make` target you can run yourself;
there is no CI-only command, because a second path is how the two drift apart.

| workflow | trigger | runs | billed |
|---|---|---|---|
| `gates.yml` | push to main · PR | `make schema-check lib-test craft-coverage arsenal-check` (0.4s of gate) | 1 min |
| `scene-check.yml` | push · PR, only when `formats/scene/**.json` changed | `make author-check D=<file>` on each changed scene (1.6s each) | 2 min |
| `audit-scenes.yml` | Monday 06:17 UTC · manual | `make audit-all` (1m46s over 34 scenes) | 3 min |
| `snap-scenes.yml` | manual only | `make fonts` then `make snap-all SAVE=1` (16s) | 2 min |

The repo is private, so the free allowance is 2,000 Linux minutes a month. Measured against this
repo's own rate, 467 commits in the last 30 days and 173 of them touching `formats/scene`, the
worst case where every commit is its own push comes to about 830 minutes. Batched pushes land nearer
300. Both workflows cancel a superseded run on the same ref, which is what keeps a burst of commits
from billing for every one of them.

Nothing renders video. `make all` is the two-hour job and no workflow starts it.

**The browser is puppeteer's own Chromium, not the runner's.** Every launch site in `scripts/gates/`
calls `puppeteer.launch()` with no `executablePath`, so `npm ci` fetches the browser and the workflows
cache it against `package-lock.json`. `CHROME_BIN` steers `allocOpts` in `internal/scene/scene.go`, and
that path belongs to the Go renderer, which no workflow invokes.

**`doc-refs` is missing from CI on purpose, and it is not a softened gate.** `formats/scene/*.json` is
gitignored, so a clone carries 40 of the 146 scenes a maintainer's tree holds. `doc-refs` resolves every
repo path the docs cite, and on a fresh clone 20 of its 22 findings are scene files no clone will ever
have. It keeps its teeth in `.githooks/pre-push`, where the author has the content on disk.

**Snapshot comparison does not work in CI, and `snap-scenes.yml` says so in its own header.** Two
reasons, both structural. `verify/snap/` is gitignored, so a runner starts with no baselines and diff
mode has nothing to diff. And a baseline is only valid inside one font state, while
`scripts/media/fonts.mjs` fetches from jsDelivr with no version in any URL, so two machines can hold
different bytes under identical filenames. `SAVE=1` still proves something font-independent: it renders
each scene ascending and descending and quarantines any scene whose signature depends on the order.
Read a green run as "every scene is deterministic", never as "nothing changed". Pinning the fetcher to
exact Fontsource versions is what would make cross-machine comparison mean anything.
