# AGENTS.md: authoring videos for this engine

Canonical, tool-neutral doctrine for the vawe video engine: works the same for Claude Code, Cursor, Codex, or a human with no agent. A rule leaning on a Claude Code mechanism (a hook, the Skill tool, a vendored skill) carries a neutral by-hand note. `CLAUDE.md` only points here.

This repo turns **one self-describing JSON → one rendered video** (60fps mp4 final, 30fps with `--draft`, `renderer/cmd/render/main.go:30`; five canvases, `core/layout/safe.js:35`: `16:9` `9:16` `1:1` `4:5` `4:3`, an unnamed ratio fit to the long edge at 1920). Exactly **one module: `scene`**, an open canvas of **24 layer types** (`ls core/layers/`) plus camera · transitions · captions; `html` is a picture.

## The repo, in seven domains  `[eye]`

21 top-level folders, each with its own README for the detail. This table groups them into seven concerns.

| domain | folders | what it covers |
|---|---|---|
| engine | `core` `blocks` `registry` `generators` `grammar` `directions` `themes` | the capability vocabulary and the data packs it reads |
| renderer | `renderer` `cli` | the Go render pipeline and its npm wrapper |
| authoring | `harness` `scripts` `recipes` `studio` | the tools and loop used to write and iterate on one film |
| quality | `quality` | every gate a scene or the repo itself is checked against |
| content | `films` `assets` | the videos themselves and the standing assets they load |
| knowledge | `engine-doctrine` `skills` `docs-site` | doctrine, on-demand skills, and the docs site that publishes it |
| apps | `site` `mcp` | the marketing site and the MCP server around the engine |

## THE EIGHT STAGES, IN ORDER  `[gated: harness/live/stage-gate.mjs]` `[live: harness/live/stage-say.mjs]`

`make stage D=<film>` reads the files on disk, so it can never disagree with the repo, and reports which stage a film is in and the one next command.

| # | stage | what happens | the command |
|---|---|---|---|
| 1 | **brief** | ask what the product is, and the four other things a site would have given | `make quiz NAME= URL=` |
| 2 | **plan** | the beat table, the through-line, the spectacle, the exclusions | `make ideate` → write the storyboard (`engine-doctrine/CRAFT/STORYBOARD-TEMPLATE.md`) → `make storyboard-check` → `make plan-judge` |
| 3 | **design** | the theme is settled and every frame the plan named is drawn | stage kit → `make design-spec` → the reference's grammar → the smallest useful `ui-skills` set → `make preview` → look at it |
| 4 | **approval** | the drawn frames are shown and a person says yes | `make studio D=`, share `http://127.0.0.1:8799/studio` with the approval request, then the user runs `/vawe-approve` |
| 5 | **assemble** | the frames become a scene | `make assemble D=` |
| 6 | **direct** | motion, then transitions, then sound, in that order | `make critics D= DECIDERS=1` |
| 7 | **render** | | `make ship D=` |
| 8 | **judge** | the only step that sees | **vawe-audit** composes `make check`/`audio-check`/`audit`/`beats`/`reveal`/`judge`/`ledger` into one verdict; **vawe-review-loop** owns the fix loop and the stopping rule (STOP-done · STOP-converged · STOP-hand-it-back); a PASS is never self-recorded |

Three transitions are hook-refused rather than requested: a fragment no storyboard claims, `layers` into an unapproved film, and writing `approved:` (the user's signature only, never an agent's). `harness/live/stage-gate.mjs` denies these at write time with its own reason; the fix is the missing artefact, never a flag. `stage-say.mjs` restates the open stage each turn; `make next D=<film>` runs its step.

**No templates**: compose each video from `engine-doctrine/PRIMITIVES.md`, write a scene JSON, capture the real assets it needs, then render; do not edit `scene.html` or the Go renderer unless asked. Reflecting a brand: `make sections` + `make palette` builds colours, fonts and favicon (`engine-doctrine/DESIGN-DATABASE.md`) from the site's own colours only.

## Skill router (stages 1, 2, 4)  `[eye]`

Skills live in `skills/` as plain docs; Claude Code loads them on demand, others open the doc named in the last column. Full index: `engine-doctrine/CRAFT/README.md`; ask a question directly: `make docs Q="…"`.

`make stage`/`make next` also print the one skill the open stage wants, on a line reading `skill: <name>`, generated from each skill's own `stage:` frontmatter (`harness/lib/skill-stages.mjs`) rather than a second hand-kept table.

| You are about to… | Claude Code skill | Everyone: the doc |
|---|---|---|
| **Write any layer** (first move, every time) | **vawe-scene-authoring** | [`engine-doctrine/RULES/INDEX.md`](engine-doctrine/RULES/INDEX.md) |
| Plan a new video, or one from scratch | **vawe-video-planning** | [`AUTHORING-WALKTHROUGH.md`](engine-doctrine/CRAFT/AUTHORING-WALKTHROUGH.md) |
| **Direct** it, not just plan it: the ambition pass every type needs, not only a launch | **vawe-creative** | [`TASTE.md`](engine-doctrine/TASTE.md) |
| Make a specific TYPE (launch, explainer, talking-head, sting, demo, recreation) | **vawe-type-`<type>`** | `engine-doctrine/CRAFT/ROUTING.md` maps a request to its type |
| **Hand-write any HTML**, or fix "looks AI" | **taste-skill** → **impeccable** | [`HTML-FRAGMENTS.md`](engine-doctrine/CRAFT/HTML-FRAGMENTS.md) |
| Reflect a website or a film | n/a | `make sections`/[`RECREATION.md`](engine-doctrine/CRAFT/RECREATION.md); `make study`/[`REFERENCE-STUDY.md`](engine-doctrine/CRAFT/REFERENCE-STUDY.md) |
| Direction, captions, sound, theme defaults | n/a | [`DIRECTION.md`](engine-doctrine/CRAFT/DIRECTION.md) · [`CAPTIONS.md`](engine-doctrine/CRAFT/CAPTIONS.md) · [`THEME-LOOK.md`](engine-doctrine/CRAFT/THEME-LOOK.md) |

**Gates, one command:** `make author-check D=<file>` (validate · beats · backdrop-turn · assets · inspect · plan-vs-render always on; style gates report only, `TASTE=1` blocks: `engine-doctrine/TASTE.md`). Then `make probe` → `audit` → `beats` → `ledger` → **`make judge`** (the gate that sees, required post-render, `engine-doctrine/JUDGE.md`).

## The full command list (stages 2, 5, 7, 8)  `[ref: make list]`

`make list` prints every target, grouped by phase, each with its own one-line help and argument syntax: never stale (narrative index: `engine-doctrine/CRAFT/README.md`). Two you'll run constantly, beyond the stage table above: `make dev D=path/to/video.json` (the iteration loop: build, draft-render, open, no gates, no audit; `BEAT=`/`JOIN=`/`FROM=`&`TO=` slices it to one part) and `make check D=path/to/video.json` (every gate, every finding, zero consequence).

Single-shot: `./bin/vawe path/to/video.json` (`--draft` = fast), JSON starting `"module": "scene"`, saved as `films/scene/<topic>.json`. Read `sample.json` and an existing video first, never copy a structure wholesale.

**On demand:** `make arsenal Q="…"` searches every effect/block (`MISTAKES=1` the mistake log, `THEME=<name>` a theme's look, `AT=block.<family>` one block's dials with their ranges, defaults and notes); `make demo Q="…"` writes a ten-second film about one thing (`engine-doctrine/CRAFT/SPECIMEN.md`). Making something good: `engine-doctrine/TASTE.md`. Search before building anything by hand: see "Changing the ENGINE, not a film?" below, the same rule covers a film device and an engine primitive.

Know the feeling, not the engine name? [`VOCABULARY.md`](engine-doctrine/CRAFT/VOCABULARY.md) (`make vocab`): plain words (feel, duration, camera, comparative) the engine resolves in a real slot.

## Direction: deciders write, critics report (stage 6)  `[ref: make critics]`

**A CRITIC only reports; a DECIDER writes into the film and owns ONE exclusive write scope**, so two deciders can't collide. Full roster, order, write scopes: `engine-doctrine/CRAFT/SUBAGENTS.md`.

`make critics D=<file> DECIDERS=1` prints the six deciders as briefs for that film; bare, the six standing critics. Usually overkill below a full authoring pass, a recreation, or anything you'll ship: one well-briefed agent beats a fan-out for anything sequential (`engine-doctrine/CRAFT/SUBAGENT-BUDGET.md`).

## Stage 1, brief: ask before you build  `[gated: quality/gates/author-check.mjs#no-storyboard]`

Nothing renders until the plan is locked and the user signs off, shown as `make studio D=<file>.json` in `plan` state (real hand-written fragments, live, never grey boxes). Claude Code loads `vawe-video-planning`; others read `engine-doctrine/CRAFT/AUTHORING-WALKTHROUGH.md`.

Five lines carry the whole request, any may be missing: SUBJECT, DATA, PAYOFF, AUDIENCE, FEELING; everything else is yours to decide. Fill two more yourself, unasked, only when the human left them out: `SPECTACLE` (the one exaggerated moment, named) and `NOT` (what this film explicitly does not do, derived from recent films by `make preflight D=<file>` rather than memory; waivable per-beat with `_why`).

A human-given SPECTACLE or NOT carries through untouched. Pass it to `make scaffold SPECTACLE="…" NOT="…"`: the storyboard records it as `spectacle_by: human`/`not_by: human`, and no later step may overwrite a line marked `human`.

**Never hand-author from a blank JSON**: `make ideate` writes the film's prompt first (`engine-doctrine/CRAFT/IDEATE.md`), then the agent writes the storyboard by hand from `engine-doctrine/CRAFT/STORYBOARD-TEMPLATE.md`; no scene JSON exists until `make assemble` runs post-approval. Compose motion from `recipes/` or `make arsenal Q="…"`.

## Built-in rules (checked everywhere)  `[built: core/validate/validate.mjs:74]`
- No em-dashes (U+2014) in any on-screen text: the validator rejects them. Use a comma, period, or ·.
- First-frame hook ≤ ~12 words, front-load the strong word, ≤ 1 emoji.
- `{"preset": "black"}` (`core/backgrounds/presets.js:118`) is solid `#000000`, no grain, unlike every other dark preset, which carries a tint or wash.
- Author a boundary through `transitions[]` only: `cuts`/`stings`/`seams` are its lowered internal form and the validator refuses them written directly (`harness/author/migrate-junctions.mjs` converts an old scene).

## Stage 4, design: craft rules the gates can't fully see  `[eye]`

- **HTML first**, no CSS `animation`/`transition`/`opacity`/`filter`: use `parts` for a seeked entrance. [`HTML-FRAGMENTS.md`](engine-doctrine/CRAFT/HTML-FRAGMENTS.md).
- **Name the effect before you build it**, don't approximate by eye. Claude Code loads `vawe-name-the-effect`; others read that skill under `skills/`.
- **Show, don't only tell.** [`SHOW-DONT-TELL.md`](engine-doctrine/CRAFT/SHOW-DONT-TELL.md). **Empty space is a decision.** [`LAYOUT.md`](engine-doctrine/CRAFT/LAYOUT.md).
- **Real assets first, emoji last**: `make capture`/`make assets` (never a bare `curl`); never embed copyrighted material. [`IMAGERY.md`](engine-doctrine/CRAFT/IMAGERY.md). `make storyboard-check` blocks a beat that names a screen or a photo with no real source, the same precondition `/vawe-approve` already runs.
- **Content is measured against the reference, per act**, never a fixed bar. [`CONTENT.md`](engine-doctrine/CRAFT/CONTENT.md).
- **Launch videos:** crawl every page, real logo size, pair entrances with exits directionally. [`HTML-FRAGMENTS.md`](engine-doctrine/CRAFT/HTML-FRAGMENTS.md).

## Stage 7, render: waivers  `[gated: quality/gates/author-check.mjs]`

`authoring.allow` + `_why` is the one waiver mechanism: a rule broken for cause, or a chosen absence a static rule can't otherwise see (no continuous object, a still frame, no transition, an ending with nothing after it). A waiver with no `_why` blocks:

```json
"authoring": { "allow": ["dead-air"], "_why": { "dead-air": "the held frame IS the beat" } }
```

How this differs from an automatic safeguard adaptation, and which codes it covers most: `engine-doctrine/SAFEGUARDS.md`.

## Changing the ENGINE, not a film?  `[live: harness/live/craft-live.mjs]`

**Search before you build.** Run `make arsenal Q="…"` before hand-building anything, a scene device (a CSS caret, a progress bar) or a new engine primitive (a resample fx, a shader, a kinetic preset): the closest match already in the registry is cheaper than rebuilding it. `harness/live/arsenal-nudge.mjs` nudges this at save.

**EVERY EFFECT COMPOSES; NONE IS A SPECIAL CASE.** A new look is a combination of things the engine already owns (a unit, a clock, an order, a property, an exit), never a private code path that owns its own timing, its own colour ramp or its own reveal. The test before writing: name which existing mechanism each half of the effect uses. If one half has no owner yet, add the owner, not the effect. Cost of skipping this, worked example: `engine-doctrine/RESEARCH/PRIVATE-PATHS-AUDIT.md`.

**Every primitive ships with its words and its action.** The authoring model was never trained on motion, so it reaches a primitive only through the plain words a person says for it and a plain statement of what those words do on screen. On the `defineRegistry` call that owns it: at least 2 `aka` phrases, and a `blurb` with its real default number. `make word-action` enforces it at pre-push; the gaps still open sit on a ratchet that only goes down (`quality/baselines/word-action-ratchet.json`), and the full listing is `engine-doctrine/CRAFT/PRIMITIVES-VOCABULARY.md`.

Five rules govern any change to `core/`, `internal/`, a gate, or the capture path, plus what this engine took from the agent harness: `engine-doctrine/CRAFT/ENGINE-CHANGES.md`. Two are decidable from a path and the hook says them at the keystroke; elsewhere, read the doc by hand.

Touched motion, backgrounds, type or layout? Ship a before/after: `make evals-compare` (`engine-doctrine/EVALS.md`). Editing `scene.html`? Claude Code reads `vawe-scene-authoring` first, others read that skill under `skills/`; system map `engine-doctrine/CODEMAPS/ARCHITECTURE.md`; run `make probe` after.

## Testing: end to end first  `[ref: make snap-all]`

- Never write unit tests after you write code.
- Highly prefer E2E tests as the sole testing mechanism. Use them to verify complex features work. At the end of E2E tests, produce a verifiable and repeatable artifact.
- If you must test a system in isolation, first write down all the ways it could fail, then write the code.

One command runs all six together, in order: `make e2e` (`harness/dev/e2e.mjs`). It leaves one
artifact, `quality/runs/e2e/<timestamp>/report.json` + `report.md`, plus `quality/runs/e2e/latest.json`.
A known-broken tracked scene is excused by name (`quality/baselines/e2e-known-broken.json`), never by
loosening what counts as a pass.

The six entry points, and the artifact each leaves on its own: `make snap-all` and `make snap-blocks`
(a DOM signature per scene and per block, compared against the committed `quality/baselines/snap/digest.json`),
`make probe` (renderFrame purity across render orders), `make mcp-smoke` (a scene drafted through the
real MCP server), `cd site && npm test` (the real engine in a browser), `make author-check D=<scene>`
(the whole authoring ladder on a real film). A gate's own fixtures in `make gate-test` are written with
the gate, as its list of ways to fail, and stay: they prove the gate can still fire.
