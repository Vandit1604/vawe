# AGENTS.md: authoring videos for this engine

Canonical, tool-neutral doctrine for the vawe video engine: works the same for Claude Code, Cursor, Codex, or a human with no agent. A rule leaning on a Claude Code mechanism (a hook, the Skill tool, a vendored skill) carries a neutral by-hand note. `CLAUDE.md` only points here.

This repo turns **one self-describing JSON → one rendered video** (60fps mp4 final, 30fps with `--draft`, `cmd/render/main.go:30`; five canvases, `core/layout/safe.js:35`: `16:9` `9:16` `1:1` `4:5` `4:3`, an unnamed ratio fit to the long edge at 1920). Exactly **one module: `scene`**, an open canvas of **24 layer types** (`ls core/layers/`) plus camera · transitions · captions; `html` is a picture.

## THE EIGHT STAGES, IN ORDER  `[gated: harness/live/stage-gate.mjs]` `[live: harness/live/stage-say.mjs]`

**Read this first.** `make stage D=<film>` reads the files on disk, so it can never disagree with the repo, and says which stage a film is in and the ONE next command.

| # | stage | what happens | the command |
|---|---|---|---|
| 1 | **brief** | ask what the product is, and the four other things a site would have given | `make quiz NAME= URL=` |
| 2 | **plan** | the beat table, the through-line, the spectacle, the exclusions | `make ideate` → `make scaffold` → `make storyboard-check` |
| 3 | **approval** | the plan is SHOWN and a person says yes | `make studio D=` (press `1`), then the USER runs `/vawe-approve` |
| 4 | **design** | the theme is settled and every frame the plan named is drawn | stage kit → the reference's grammar → the smallest useful `ui-skills` set → `make preview` → look at it |
| 5 | **assemble** | the frames become a scene | `make assemble D=` |
| 6 | **direct** | motion, then transitions, then sound, in that order | `make critics D= DECIDERS=1` |
| 7 | **render** | | `make ship D=` |
| 8 | **judge** | the only step that SEES | `make judge D=` → `make ledger D=` |

**Three transitions are refused, not requested** (agents have run this order backwards before: `make arsenal MISTAKES=1 Q="stage order"`): `harness/live/stage-gate.mjs` denies, at `PreToolUse`, a fragment no storyboard claims · `layers` into an unapproved film · writing `approved:` at all, the user's signature and never an agent's. The way out is the missing artefact, never a flag. `harness/live/stage-say.mjs` re-states the open stage every turn; `make next D=<film>` runs its step.

**No templates**: compose each video from `docs/PRIMITIVES.md`, write a scene JSON, capture the real assets it needs, then render; do **not** edit `scene.html` or the Go renderer unless asked. Reflecting a brand? `make sections` + `make palette` builds colours + fonts + favicon (`docs/DESIGN-DATABASE.md`), using ONLY the site's colours.

## Skill router (stages 1, 2, 4)  `[eye]`

Skills live in `skills/` as plain docs; Claude Code loads them on demand, others open the doc in the last column. Full index: `docs/CRAFT/README.md`; one-page router by frontmatter: `vawe-docs`.

| You are about to… | Claude Code skill | Everyone: the doc |
|---|---|---|
| **Write any layer** (first move, every time) | **vawe-scene-authoring** | [`docs/RULES/INDEX.md`](docs/RULES/INDEX.md) |
| Plan a new video, or one from scratch | **vawe-video-planning** | [`AUTHORING-WALKTHROUGH.md`](docs/CRAFT/AUTHORING-WALKTHROUGH.md) |
| Make a specific TYPE (launch, explainer, talking-head, sting, demo, recreation) | **vawe-type-`<type>`** | `docs/CRAFT/ROUTING.md` maps a request to its type |
| **Hand-write any HTML**, or fix "looks AI" | **taste-skill** → **impeccable** | [`HTML-FRAGMENTS.md`](docs/CRAFT/HTML-FRAGMENTS.md) |
| Reflect a website or a film | n/a | `make sections`/[`RECREATION.md`](docs/CRAFT/RECREATION.md); `make study`/[`REFERENCE-STUDY.md`](docs/CRAFT/REFERENCE-STUDY.md) |
| Direction, captions, sound, theme defaults | n/a | [`DIRECTION.md`](docs/CRAFT/DIRECTION.md) · [`CAPTIONS.md`](docs/CRAFT/CAPTIONS.md) · [`THEME-LOOK.md`](docs/CRAFT/THEME-LOOK.md) |

**Gates, one command:** `make author-check D=<file>` (validate · beats · assets · inspect · plan-vs-render always on; style gates report only, `TASTE=1` blocks: `docs/TASTE.md`). Then `make probe` → `audit` → `beats` → `ledger` → **`make judge`** (the gate that SEES, required post-render, `docs/JUDGE.md`).

## The full command list (stages 2, 5, 7, 8)  `[ref: make list]`

`make list` prints every target grouped by phase, read off the Makefile: never stale (narrative index: `docs/CRAFT/README.md`). Beyond the stage table above:

```bash
make dev    D=path/to/video.json  # THE ITERATION LOOP. Build, draft-render, open. No gates, no audit.
make check  D=path/to/video.json  # every gate, every finding, ZERO consequence (runs preflight for you)
make screen F=<file> THEME=<t>    # design a product screen: preview + impeccable + content + readiness
make content-check D=<f> REF=<r>  # is this film's content as rich as the reference it studied, per act
make study REF=<url>              # the film-side twin of `make sections`, a reference to hold a film to
```

Single-shot: `./bin/vawe path/to/video.json` (`--draft` = fast), JSON starting `"module": "scene"`, saved as `formats/scene/<topic>.json`. Read `sample.json` and an existing video first, never copy a structure wholesale. **On demand:** `make arsenal Q="…"` searches every effect/block (`MISTAKES=1` the mistake log, `THEME=<name>` a theme's look); `make demo Q="…"` writes a ten-second film about one thing (`docs/CRAFT/SPECIMEN.md`). Making something good: `docs/TASTE.md`.

## Direction: deciders write, critics report (stage 6)  `[ref: make critics]`

**A CRITIC only reports; a DECIDER writes into the film and owns ONE exclusive write scope**, so two deciders can't collide. Full roster, order, write scopes: `docs/CRAFT/SUBAGENTS.md`. `make critics D=<file> DECIDERS=1` prints the six deciders as briefs for that film; bare, the six standing critics. **Usually overkill** below a full authoring pass, a recreation, or anything you'll ship: one well-briefed agent beats a fan-out for anything sequential (`docs/CRAFT/SUBAGENT-BUDGET.md`).

## Stage 1, brief: ask before you build  `[gated: quality/gates/author-check.mjs#no-storyboard]`

Claude Code loads `vawe-video-planning`; others read `docs/CRAFT/AUTHORING-WALKTHROUGH.md`. Do not open a JSON file first: nothing renders until the plan is LOCKED and the user signs off, presented as `make studio D=<file>.json`, `plan` state (real hand-written fragments, live, never grey boxes), and you wait. Five lines carry the whole request, any may be missing (SUBJECT, DATA, PAYOFF, AUDIENCE, FEELING); everything else is yours to decide. Plus two you fill yourself, unasked: `SPECTACLE` (the ONE exaggerated moment, named) and `NOT` (what this film explicitly does not do, derived from recent films by `make preflight D=<file>` rather than memory; waivable per-beat with `_why`).

**Never hand-author from a blank JSON**: `make ideate` writes the film's prompt first (`docs/CRAFT/IDEATE.md`), then `make scaffold` writes the storyboard sidecar and scene shell; compose motion from `recipes/` or `make arsenal Q="…"`.

## Built-in rules (checked everywhere)  `[built: core/validate/validate.mjs:764]`
- No em-dashes (U+2014) in any on-screen text: the validator rejects them. Use a comma, period, or ·.
- First-frame hook ≤ ~12 words, front-load the strong word, ≤ 1 emoji.
- `{"preset": "black"}` (`core/backgrounds/presets.js:117`) is solid `#000000`, no grain, unlike every other dark preset, which carries a tint or wash.
- Author a boundary through `transitions[]` only: `cuts`/`stings`/`seams` are its lowered internal form and the validator refuses them written directly (`harness/author/migrate-junctions.mjs` converts an old scene).

## Stage 4, design: craft rules the gates can't fully see  `[eye]`

- **HTML first**, no CSS `animation`/`transition`/`opacity`/`filter`: use `parts` for a seeked entrance. [`HTML-FRAGMENTS.md`](docs/CRAFT/HTML-FRAGMENTS.md).
- **Name the effect before you build it**, don't approximate by eye. Claude Code loads `vawe-name-the-effect`; others read that skill under `skills/`.
- **Show, don't only tell.** [`SHOW-DONT-TELL.md`](docs/CRAFT/SHOW-DONT-TELL.md). **Empty space is a decision.** [`LAYOUT.md`](docs/CRAFT/LAYOUT.md).
- **Real assets first, emoji last**: `make capture`/`make assets` (never a bare `curl`); never embed copyrighted material. [`IMAGERY.md`](docs/CRAFT/IMAGERY.md).
- **Content is measured against the reference, per act**, never a fixed bar. [`CONTENT.md`](docs/CRAFT/CONTENT.md).
- **Launch videos:** crawl EVERY page, real logo size, pair entrances with exits directionally. [`HTML-FRAGMENTS.md`](docs/CRAFT/HTML-FRAGMENTS.md).

## Stage 7, render: waivers  `[gated: quality/gates/author-check.mjs]`

A rule you deliberately break is waived IN THE SCENE, with a reason. A waiver with no `_why` blocks:

```json
"authoring": { "allow": ["dead-air"], "_why": { "dead-air": "the held frame IS the beat" } }
```

`authoring.allow` + `_why` is the one excuse mechanism: a rule fires or not, and the only door out is a reason written in the scene.

## Changing the ENGINE, not a film?  `[live: harness/live/craft-live.mjs]`

Five rules govern any change to `core/`, `internal/`, a gate, or the capture path, plus what this engine took from the agent harness: `docs/CRAFT/ENGINE-CHANGES.md`. Two are decidable from a path and the hook says them at the keystroke; elsewhere, read the doc by hand. Touched motion, backgrounds, type or layout? Ship a before/after: `make evals-compare` (`docs/EVALS.md`). Editing `scene.html`? Claude Code reads `vawe-scene-authoring` first, others read that skill under `skills/`; system map `docs/CODEMAPS/ARCHITECTURE.md`; run `make probe` after.

