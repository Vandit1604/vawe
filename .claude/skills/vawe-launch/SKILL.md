---
name: vawe-launch
description: "The gated end-to-end pipeline for a product-launch / promo video in this repo, adapted from another engine: brief → capture → design-system (preset remix) → storyboard proposal → local narration → author from blueprints → build (optionally one sub-agent per beat) → finalize (author-check · seam-check · judge · render). Load when the user wants a launch/promo/feature video and you want the full orchestrated flow. Run each step, pass its gate, then continue; user-gated at Step 0, 3, 6."
---

# vawe-launch: the orchestrated launch-video pipeline

You are the orchestrator. Run each step **in order**, verify its gate, and only then continue. Three steps
are **user-gated**: 0 (brief), 3 (storyboard proposal), 6 (final render). Everything else you do yourself.
This is the another engine Step 0-6 flow adapted to our engine, tools, and gates.

Save the video at `formats/scene/<topic>.json`. One scene JSON → one mp4.

## Step 0: Brief (user-gated)
Lock a tiny brief. First pick a **mode**: *collaborative* (confirm key choices) or *autonomous* (decide
everything, state each with its reason). Then lock: **message** (the ONE sentence the video communicates),
**audience**, **angle/arc**, **length** (30-90s), **destination** (YouTube/embed → 16:9 · X/LinkedIn/IG → 1:1
· Shorts/TikTok → 9:16, sets `destination` + aspect), **narrated or silent**.
**Gate:** the brief fields are locked.

## Step 1: Capture (real assets are the ground truth)
If there's a URL: `make sections URL=… NAME=<brand>` (inventory every section), `make palette IMG=…`
(eyedrop dominance + hexes), `make brandspec URL=…` (real fonts + weights + colour tokens), `make capture`
(live UI clusters). Read the shots. State the brand in one sentence.
**Gate:** brand captured (or, no-site: colours/fonts stated from the brief).

## Step 2: Design system (pick a preset, remix onto the brand)
Pick the `presets/*.json` whose look fits (editorial · technical · bold · warm), then:
`make theme-remix PRESET=<name> BRAND=<brand> BG=<#hex> ACCENT=<#hex> [TEXT=<#hex>]` → a complete,
contrast-checked `themes/<brand>.json`. Don't hand-author a theme unless a mapping truly needs it.
**Gate:** `themes/<brand>.json` exists and validates.

## Step 3: Storyboard proposal (user-gated)
Start from the real sections, not a blank page: `make storyboard-draft NAME=<brand> [MSG="…" DUR=30]`
skeletons one beat per captured section (in site order, pre-wired with type + capture command + a suggested
blueprint) → `assets/brands/<brand>/STORYBOARD.md`. Then **sharpen** it: fill the `<…>` fields, the
`message` and each beat's **why**: using `docs/CRAFT/STORYBOARD-TEMPLATE.md` (Reproduce/Adapt · mechanism ·
emotion · transition_in). No site? Copy the template and write beats by hand. Then
`make storyboard-check SB=<file>`. Present it: open with **"This video tells <audience> that <message>"**,
then the beat table. Weight cues into the back ~50% (the reveal model). Get sign-off. Once approved, export
the value contract: `make intent SB=<file> D=formats/scene/<topic>.json` writes `<topic>.intent.json` from
the beats' whys, so Step 6's `inspect` VERIFIES the render delivers each beat's on-screen copy + motion.
**Gate:** storyboard-check passes AND the user approved (autonomous: post it as a heads-up).

## Step 3.1 (Narration (local, optional) skip if silent)
`make tts SCRIPT=<narration.txt> OUT=formats/scene/<topic>.vo [VOICE=<name>]`, offline macOS-`say` TTS →
`<topic>.vo.wav` + `<topic>.vo.words.json`. Wire into the scene: `"audio": { "vo": "<topic>.vo.wav",
"voWords": "<topic>.vo.words.json", "music": "auto" }`. **Pace to the voice:** `make pace-from-vo
VO=<topic>.vo.words.json` proposes each beat's start + duration from the narration, transcribe those onto
the beats in Step 4 so the reveals land on the words.
**Gate:** VO generated, or the video is silent.

## Step 4: Author from blueprints (obey the spec)
Compose the scene JSON from `{type:"beat"}` blueprints (`make blueprints`) + brand content, on the remixed
theme, transcribing the storyboard exactly. Reach for the arsenal (`make effects` → `docs/EFFECTS.md`):
kinetic reveals, a living bg, border-beam/paint, svg draw/morph, `cameraMove`, dense per-child figures via
`parts`. For a **hero beat** whose choreography `parts`/blueprints can't express (overlapping tweens, a
token travelling a path while a counter ticks and a check draws), author a bespoke **`composition`**.
A first-party hand-authored per-beat GSAP timeline in `core/compositions/index.js`, named from the JSON
(`{type:"composition",comp:"…",props:{…}}`); see [AUTHOR-THE-FRAME.md](../../../docs/CRAFT/AUTHOR-THE-FRAME.md).
Load `vawe-creative` + `vawe-effects` + `vawe-animation` + `vawe-camera`. `make expand` to lower
beats/cameraMove into layers. **Iterate live** without rendering: `make studio D=<file>` serves the scene
with a frame scrubber: scrub/step, edit the JSON, reload, before you ever render an mp4.
**Gate:** every storyboard beat is authored; `make validate` passes.

## Step 5: Build (optionally parallel, one sub-agent per beat)
For a large video, decompose it: hand each beat to a sub-agent to author its layer fragment, then merge.
The workflow `.claude/workflows/beats-parallel.mjs` (run via the Workflow tool, opt-in) does exactly this.
For a normal video, author inline. Either way the output is one expanded scene JSON.
**Gate:** the scene JSON is complete and expanded.

## Step 6: Finalize (user-gated)
`make author-check D=<file>` (validate · critique · direct · **floor: front-load + monotony** · slop ·
**designspec** (off-palette colours / non-role fonts) · **copy** (hook/jargon/restatement tells; these
three are opt-in, run `TASTE=1 make author-check`) ·
**assets** (referenced files exist) · **inspect** (the intent contract from Step 3)) →
`make video D=<file>` (renders; author-check runs first) → `make audit` (layout/contrast) →
**`make seam-check D=<file>`** (sample the transition overlaps for flashes, the class the other gates miss) →
`make judge D=<file> VS=<brand>` (read the sheet, score every frame; a flaw you notice is a FIX) →
`make ledger D=<file>` (anti-sameness). Pause for review, then ship. **Framework harvest** after (CLAUDE.md).
**Gate:** all gates green, user approved, mp4 verified.

---

Doctrine behind each step: brief/story [FRAME-SPEC.md](../../../docs/CRAFT/FRAME-SPEC.md) · design
[SURFACES.md](../../../docs/CRAFT/SURFACES.md) · motion [DIRECTION.md](../../../docs/CRAFT/DIRECTION.md) ·
bespoke frames [AUTHOR-THE-FRAME.md](../../../docs/CRAFT/AUTHOR-THE-FRAME.md). Skills: `vawe-video-planning`
(the lock-sheet detail), `vawe-creative`, `vawe-effects`, `vawe-animation`, `vawe-camera`.
