---
when: changing the engine itself, not a video
answers: "the system map: JSON → validate → scene.html → renderFrame(n) → Go renderer → mp4, and who owns what"
group: engine
---

# Vawe: architecture codemap

> One self-describing JSON → one rendered Short (1080×1920 / 1920×1080, 30fps, mp4).
> Keep this current as the system grows: it's the shared map. See the
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

## Frame pipeline (the ORDER is the contract)

Two bugs in one week were ordering, not arithmetic: `#464` resolved a handover before the layout
measurement and put a card 401.6px away, `#463` read a box that was composed before the tracks ran and
turned an authored 24px gap into a 24px overlap. Both were governed by a sentence in a file header,
where no gate could see it. The order lives here now, and `lib-test` parses this block, so the doc and
the code cannot drift apart in silence.

Read it as three stages. **BUILD** happens once at boot, on the DOM and the JSON. **FRAME** is
`renderFrame(n)` in `formats/scene/scene.js`, top to bottom. **ACCUMULATE** names the tracks that read
`el.style.transform` back and PREPEND to it: `el.style` is the pipeline's accumulator, not its output,
and the whole composition works only because `driveClips` rewrites the transform from scratch every
frame.

The per-layer half of FRAME is `runTracks`, whose fourteen slots are declared and enforced in
`core/tracks/index.js` (`SLOTS`). That list is not repeated here; a second copy is the drift this
section exists to prevent.

```pipeline
build  measure         el.offsetWidth
build  becomes         resolveBecomes(data, (L) =>
build  childOffsets    const childRel = new Map();

frame  drawBg
frame  driveClips
frame  driveSceneUnits
frame  resolveBoxes
frame  runTracks
frame  drawCaptions
frame  drawCameraAndCut
frame  drawStings
frame  drawSeams
frame  seekAll

accumulate  core/tracks/react.js
accumulate  core/tracks/follow.js
accumulate  core/tracks/motion.js
accumulate  core/tracks/idle.js
```

**THE ACCUMULATOR HAS TO BE EMPTIED, and for a long time nothing did it.** The four tracks above read
`el.style.transform` back and PREPEND to it, which is only safe if the element starts each frame clean.
`driveClips` clears a property only when one of the layer's OWN anims writes it, so a layer entering on
`wipe`, `iris` or `clock` (all clip-path, no transform) composed onto the string left by whichever frame
a worker rendered before. Order-dependent by construction, and invisible until a second accumulator ran
on such a layer. `clipStyleAt` now returns `transform: "none"` unconditionally, ahead of the resting
keys and the composed style, so an anim that does write a transform still wins.

`resolveKeyedProps` is deliberately absent from BUILD: it runs twice, before the measurement and again
after `becomes`, because the handover injects new keys and `core/timeline/sequence.js` holds one rule for a
keyed track (both endpoints state `w`/`h`, or neither). A step that runs twice has no place in an
ordered list, and pinning its first call would pin the wrong one.

**What follows from the order, and what a reader must not assume.** `resolveBoxes` runs before any
track, so `scene.boxOf(id)` is the authored geometry plus the motion track plus the enter/exit pose,
and NOTHING a track wrote. It is not a live read of the DOM. A `follow` therefore cannot chain, and
chaining is refused by name in `core/tracks/follow.js` rather than left to arithmetic.

**The ceiling of the check, stated so nobody trusts it further than it goes.** `lib-test` proves the
call order and the accumulator set from the source text. It cannot prove a track read a fresh value
rather than a stale one: that is a runtime property of one scene at one t, and the things that do see
it are `make probe`, `make canvas-purity` and `make snap-all`.

## Directory map

| Path | What | Notes |
|---|---|---|
| `core/motion/motion.js` | shared scene runtime + pure helpers | `boot()`, `icon()`, `preloadImages()`, formatting, the **motion primitives** (`interpolate`/`spring`/`track`/`rise`/`fade`/`pop`/`slide`/`sequence`/`wipe`/`circleWipe`/`clockWipe` + easings + `EASINGS`), **seeded** `random`/`noise`/`hashSeed`/`stagger`, `measureText`/`fitText`, and the **theme system** (`resolveTheme`/`applyTheme`/`motionDefaults`/`DEFAULT_THEME`). All pure in `n`. |
| `core/type/type.js` | kinetic-typography kit | `splitText()` (char/word/line) + `PRESETS` (up/down/type/scale/blur/bounce/slide/wave) + `animateUnits()`. Pure per-unit staggered reveals. |
| `core/timeline/clips.js` | declarative composition (another engine parity) | `clipStyleAt(el,t)` reads `data-start/-duration/-track/-anim/-out` and RETURNS the complete style at t (writes nothing), so the engine can be asked what a layer looks like at a time it is not drawing; `driveClips(clips,t)` is that, performed, over the frozen set `collectClips(root)` took at build. `registerTimeline`/`seekAll(t)` = seekable **animation-adapter interface** that drives paused WAAPI + `gsap.globalTimeline` per frame. |
| `core/engine/preload.js` | awaited readiness phase (extracted from `boot`) | one async pass per asset kind BEFORE the virtual clock: images, spectrum, three, canvasFx, components, clips, ransom sprites, **GSAP** (`preloadGsap`: loads on demand for `gsap`/`morph`/`fx`/`fxOut`/`motionPath`/`physics`/`splitText`, stops the ticker, registers effects+plugins), lottie. Whatever it puts on `window.__*` is a static table by render time, so `renderFrame(n)` stays pure. |
| `core/engine/gsap-effects.js` + `core/motion/morph.js` | GSAP as an INTERNAL tween engine | `gsap-effects.js` = a NAMED effect library (`registerGsapEffects`): entrances/text/loops referenced from JSON by `fx`, exits by `fxOut` (`GSAP_FX`/`EXIT_FX`/`FX_DUR` exports). `morph.js` = TextMorph (letters migrate A→B). GSAP is vendored (`assets/vendor/gsap.min.js` 3.13 + MotionPath/Physics2D/SplitText); scenes can't bring JS, so GSAP is engine-internal, seeked per frame → pure. |
| `core/timeline/seams.js` · `core/stings/index.js` · `core/cuts/index.js` | beat-to-beat transitions | `seams.js` = two-scene GPU blends (`SEAM_FX`, incl. `portal`); `stings.js` = single-scene shader FX (`SHADER_FX`); `cuts.js` = hard-cut timing. All shader-based → guarded by `make canvas-purity`. |
| `core/transitions/` | the unified transition surface | `catalog.js` = THE TRANSITION DATABASE, one entry per transition across `anim`/`cut`/`sting`/`seam`, derived from the four registries above so it can't drift; `lower.js` lowers an author's one `transitions:[]` field to the correct raw mechanism; `energy.js` = the shared speed-vs-drama dial; `units.js`/`units-house.js` = the GPU-blend seam primitives seams.js reads. |
| `core/` root is orphan-free (W9, done) | every file lives in a dedicated package | The root held 30 one-line re-export shims and 38 real singletons after the first W9 pass; both are gone now. The 30 shims (root-level `transitions.js`, `backgrounds.js`, the five `audio-*.js` files, …) were deleted outright and every importer rewritten straight to the real path (`core/transitions/catalog.js`, `core/backgrounds/index.js`, `core/audio/*.js`, …); nothing re-exports them any more. The 38 real singletons were sorted by concern into seven new packages, each with an `index.js` barrel: `engine/` (boot·preload·produce·src-url·fonts·gsap-effects·webgl·idle: the render page's load path), `registry/` (registry·vocab·props·prop-audit·knobs·theme-contract: what an author may write), `timeline/` (sequence·time·junctions·seams·clips·velocity-cut·spectacle: the clock, joints and cuts in time), `motion/` (motion·effector·morph·parts: keyframes and element choreography), `type/` (type·on-screen-text·sanitize-html·captions·ransom: words on screen), `layout/` (safe·generators·bg-html·icons·pan-resolve: the frame and what fills it), `validate/` (validate.mjs alone: it has no sibling it exclusively owns, since nearly every other package is ITS import, not the reverse). Two more folded into an EXISTING package rather than a new one: `color.js` (the `token()`/`literal()` theme-resolution markers, a different vocabulary from `core/color/`'s own colour maths, both exported from the same `index.js`) and `filters.js` (named colour-grade filters, a sibling vocabulary to `core/looks/`'s composited looks, sharing its `filter` slot). The FIRST W9 pass grouped `core/audio/`, `core/resample/`, `core/canvas/`, `core/beats/` the same way (bridges·cues·kit·select·tactile; the layer-resample wiring + GL registry + DOM→canvas serialiser; Canvas-2D passes + context kind; the beat-grid binder + pulse detector), and folded a handful of single-consumer files straight into their one importer's package: `fx/ancestor-kills.js`, `layers/{frame-settle,path-morph}.js`, `tracks/spectrum.js`, `backgrounds/gradient-recipes.js`, `surfaces/{paint-fx,raymarch-fx,shaders-ambient,three-fx,three-scenes,globe-dots}.js`. |
| `blocks/` | build-time BLOCK/COMP sugar | `index.mjs` = the assembly point + registry (`BLOCKS`); factories live in family siblings sharing `kit.mjs` (`charts`/`dev`/`social`/`ui`/`app`/`interact`), plus `catalog.mjs` (variants). A `type:"block"` layer (pointer/kpiRow/browserFrame/…) carries the BLOCK's own props, expanded by `make expand` into real layers. Block props are validated by `make blocks-audit`, NOT the base layer schema (validate.mjs exempts block/comp). |
| `core/layers/adjust.js` | ONE grade over everything BENEATH | `{ "type":"adjust","kind":"blur" }`. Grades every layer with a LOWER `track` and leaves everything above crisp, so `track` (already the z-index) IS the z-order contract. Built on the same `backdrop-filter` the GLASS look uses. Keyed through the `vars` track on `--adjust`, never a mechanism of its own. |
| `core/fx/plane.js` | DEPTH, and its named planes | The modifier stands a layer off the picture plane so a camera move gives parallax instead of turning the frame as one pane. `depth: "back"` is the reachable spelling: four names, each a FRACTION of the film's lens, baked to the modifier by `bakeDepth` in `core/engine/produce.js` (and `core/engine/boot.js` throws if one survives). |
| `core/engine/idle.js` | how a layer LIVES between its ramps | `clipStyleAt` computes an entrance ramp and an exit ramp and has no branch for the middle, so stillness was the shape of the data model rather than anyone's decision. `motionDefaults` carries `idle`, resolved layer → scene → theme → engine default. |
| `core/tokens.css` | design system | color (themeable `--bg/--accent/…` + `--font-*`), **type scale** (`--fs-*`), **spacing scale** (`--sp-*`), radii/shadows, safe-zone vars, `.stage/.act/.safe` scaffold, `.debug-safe` overlay, `html.alpha` transparent-export mode. |
| `themes/<name>.json` | brand kits / taste | palette + gradient + fonts + motion personality. `data.theme` = name or inline object. `default.json` = current look. |
| `core/registry/theme-contract.js` | required theme keys (no default look) | `themeErrors()`, shared by validate (node) + applyTheme (browser). |
| `formats/<name>/scene.html` | one format's HTML/CSS/JS | exposes `window.__engine`; builds `{fps, duration, stings, sfx, segments, renderFrame}`. Mark key text `data-layer="critical"`. |
| `formats/scene/schema.json` | field schema | the authoring vocabulary; `make schema-check` asserts the engine reads nothing undefined. |
| `formats/<name>/sample.json` + siblings | data JSONs | `sample.json` is the reference; topics are siblings. |
| `formats/scene/` | generic data-driven format | layered composition from `data.layers[]` (text/image/block/… + timing + `anim`/`out` + kinetic `split`/`preset` + GSAP `fx`/`fxOut`/`gsap`/`morph`/`motionPath`/`physics`/`splitText` + `circle`/`ransom`) + `cuts`/`seams`/`stings` + `data.captions[]`. No per-topic code, the JSON is the video. |
| `core/validate/validate.mjs` | data + theme validator | `validateData`/`validateTheme`/`validateAll`/`fxErrors`/`lintData` against `schema.json`; runs in `boot()` pre-first-frame (fail fast) + `make validate`. Browser-safe (boot imports it). |
| `cmd/render` (Go) | CLI entry | `--data/--module/--out`, `--all`, `--list`, `--workers`, `--alpha` (transparent VP9 `.webm` overlay). |
| `internal/scene` (Go) | frame capture | parallel tabs; relies on purity. |
| `internal/encode` (Go) | ffmpeg wrapper | H.264 + grain; `Mux` adds audio. |
| `internal/audio` (Go) | PCM mixer | music loop + named sfx at cue times + **VO ducking** + sting + limiter. |
| `internal/queue` (Go) | concurrency runner | foundation for batch (wired to `--all`). |
| `scripts/` | authoring tools + gates | `scripts/author/` (preview/storyboards/captions), `scripts/media/` (assets/audio/music/beatsync), `scripts/site/` (gallery). **Gates live in `scripts/gates/`**: `probe-purity`, `lib-test`, `lint-test`, `snap-scenes` (`make snap-all`), `canvas-purity`, `schema-drift`, `blocks-audit`, `motion-audit`, `dead-branch`, `docs-drift`. |
| `verify/` | review tooling | `run.js` (`make verify`: integrity + safe-zone + contact sheets), `audit.mjs` (`make audit`: overlap/overflow/spacing), `review.mjs` (`make review`: fast snapshot). |
| `scripts/media/kie.mjs` | **planned AI-media client** (kie.ai) | createTask → poll → download for `tts / music / gen-image / gen-video / transcribe`. **Intentional future infra** for another engine-level output (sound, vocals, generated imagery). No consumers yet; do not delete as "dead code". |
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
make look D=… / frame D=… N=…   # storyboard / one frame
make validate [D=…]       # data + theme against schema.json (boot runs it too)
make census               # every named population in formats/scene, and the question each answers
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
gitignored, so a clone carries a fraction of the scenes a maintainer's tree holds (`make census` prints
both numbers, and names which population each answers, because four different counts of this directory
are all true and mean different things). `doc-refs` resolves every
repo path the docs cite, and on a fresh clone 20 of its 22 findings are scene files no clone will ever
have. It keeps its teeth in `.githooks/pre-push`, where the author has the content on disk.

**Snapshot comparison in CI is a DIGEST, and knowing which half you have is the point.** This section
used to say the comparison could not work at all, for two structural reasons, and both have since been
answered, in opposite ways.

The font half is simply fixed. `scripts/media/fonts.mjs` now carries an exact version AND a sha256 for
every face (`scripts/media/fonts.lock.json`), and a mismatch FAILS rather than warns, so two machines
hold identical bytes. One pin is deliberately behind the others: GeistMono sits on 5.2.8 because 5.3.0
re-subset the face and the baselines were not saved against it.

The baseline half was a SIZE problem wearing a structural one's clothes. A full signature is ~170KB per
scene and the set is 20MB, most of it describing films that are themselves gitignored, so the baselines
cannot be committed. A hash can. `verify/snap/digest.json` is one sha256 per scene plus the font state,
about 4KB, and it is the single tracked file inside a gitignored directory (`.gitignore` re-includes it
by name). A checkout with no local baselines falls back to it and gets a real verdict.

**What the digest can and cannot say, because the difference is the whole value.** It answers WHETHER a
scene moved. It cannot say what moved inside it, and it says so in the finding rather than implying the
full net ran. The `what` stays local, where the 20MB lives and a person can read a diff. `SAVE=1` still
proves the font-independent thing on top: every scene rendered ascending and descending, with any
order-dependent scene quarantined.
