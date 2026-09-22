# AGENTS.md: authoring videos for this engine

Canonical, tool-neutral doctrine for the vawe video engine: works the same for Claude Code, Cursor, Codex, or a human with no agent. A rule leaning on a Claude Code mechanism (a hook, the Skill tool, a vendored skill) carries a neutral by-hand note. `CLAUDE.md` only points here.

This repo turns **one self-describing JSON → one rendered video** (60fps mp4 final, 30fps with `--draft`, `renderer/cmd/render/main.go:30`; five canvases, `core/layout/safe.js:35`: `16:9` `9:16` `1:1` `4:5` `4:3`, an unnamed ratio fit to the long edge at 1920). Exactly **one module: `scene`**, an open canvas of **24 layer types** (`ls core/layers/`) plus camera · transitions · captions; `html` is a picture.

## The repo, in seven domains  `[eye]`

Twenty-one top-level folders, flat by choice; each carries its own README with the detail. This table
groups them so a reader sees seven concerns, not twenty-one names.

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

**Read this first.** `make stage D=<film>` reads the files on disk, so it can never disagree with the repo, and says which stage a film is in and the ONE next command.

| # | stage | what happens | the command |
|---|---|---|---|
| 1 | **brief** | ask what the product is, and the four other things a site would have given | `make quiz NAME= URL=` |
| 2 | **plan** | the beat table, the through-line, the spectacle, the exclusions | `make ideate` → `make scaffold` → `make storyboard-check` |
| 3 | **approval** | the plan is SHOWN and a person says yes | `make studio D=`, share `http://127.0.0.1:8799/studio` with the approval request, then the USER runs `/vawe-approve` |
| 4 | **design** | the theme is settled and every frame the plan named is drawn | stage kit → `make design-spec` → the reference's grammar → the smallest useful `ui-skills` set → `make preview` → look at it |
| 5 | **assemble** | the frames become a scene | `make assemble D=` |
| 6 | **direct** | motion, then transitions, then sound, in that order | `make critics D= DECIDERS=1` |
| 7 | **render** | | `make ship D=` |
| 8 | **judge** | the only step that SEES | **vawe-audit** composes `make check`/`audio-check`/`audit`/`beats`/`reveal`/`judge`/`ledger` into one verdict; **vawe-review-loop** owns the FIX loop and the stopping rule (STOP-done · STOP-converged · STOP-hand-it-back); a PASS is never self-recorded |

**Three transitions are refused, not requested** (agents have run this order backwards before: `make arsenal MISTAKES=1 Q="stage order"`): `harness/live/stage-gate.mjs` denies, at `PreToolUse`, a fragment no storyboard claims · `layers` into an unapproved film · writing `approved:` at all, the user's signature and never an agent's. The way out is the missing artefact, never a flag. `harness/live/stage-say.mjs` re-states the open stage every turn; `make next D=<film>` runs its step.

**No templates**: compose each video from `engine-doctrine/PRIMITIVES.md`, write a scene JSON, capture the real assets it needs, then render; do **not** edit `scene.html` or the Go renderer unless asked. Reflecting a brand? `make sections` + `make palette` builds colours + fonts + favicon (`engine-doctrine/DESIGN-DATABASE.md`), using ONLY the site's colours.

## Skill router (stages 1, 2, 4)  `[eye]`

Skills live in `skills/` as plain docs; Claude Code loads them on demand, others open the doc in the last column. Full index: `engine-doctrine/CRAFT/README.md`; one-page router by frontmatter: `vawe-docs`.

`make stage`/`make next` also name the ONE skill the open stage wants, next to the command, on a line reading `skill: <name>`. That line is generated from each skill's own `stage:` frontmatter (`harness/lib/skill-stages.mjs`), never a second hand-kept table; a skill with no `stage:` is cross-cutting and just does not appear there.

| You are about to… | Claude Code skill | Everyone: the doc |
|---|---|---|
| **Write any layer** (first move, every time) | **vawe-scene-authoring** | [`engine-doctrine/RULES/INDEX.md`](engine-doctrine/RULES/INDEX.md) |
| Plan a new video, or one from scratch | **vawe-video-planning** | [`AUTHORING-WALKTHROUGH.md`](engine-doctrine/CRAFT/AUTHORING-WALKTHROUGH.md) |
| **Direct** it, not just plan it: the ambition pass every type needs, not only a launch | **vawe-creative** | [`TASTE.md`](engine-doctrine/TASTE.md) |
| Make a specific TYPE (launch, explainer, talking-head, sting, demo, recreation) | **vawe-type-`<type>`** | `engine-doctrine/CRAFT/ROUTING.md` maps a request to its type |
| **Hand-write any HTML**, or fix "looks AI" | **taste-skill** → **impeccable** | [`HTML-FRAGMENTS.md`](engine-doctrine/CRAFT/HTML-FRAGMENTS.md) |
| Reflect a website or a film | n/a | `make sections`/[`RECREATION.md`](engine-doctrine/CRAFT/RECREATION.md); `make study`/[`REFERENCE-STUDY.md`](engine-doctrine/CRAFT/REFERENCE-STUDY.md) |
| Direction, captions, sound, theme defaults | n/a | [`DIRECTION.md`](engine-doctrine/CRAFT/DIRECTION.md) · [`CAPTIONS.md`](engine-doctrine/CRAFT/CAPTIONS.md) · [`THEME-LOOK.md`](engine-doctrine/CRAFT/THEME-LOOK.md) |

**Gates, one command:** `make author-check D=<file>` (validate · beats · assets · inspect · plan-vs-render always on; style gates report only, `TASTE=1` blocks: `engine-doctrine/TASTE.md`). Then `make probe` → `audit` → `beats` → `ledger` → **`make judge`** (the gate that SEES, required post-render, `engine-doctrine/JUDGE.md`).

## The full command list (stages 2, 5, 7, 8)  `[ref: make list]`

`make list` prints every target grouped by phase, read off the Makefile: never stale (narrative index: `engine-doctrine/CRAFT/README.md`). Beyond the stage table above:

```bash
make dev    D=path/to/video.json  # THE ITERATION LOOP. Build, draft-render, open. No gates, no audit.
make dev    D=path/to/video.json BEAT=<n|name>|JOIN=<n>|FROM=<s> TO=<s>  # only that slice, not the whole film
make probe-frame D=path/to/video.json T=<s> ID=<id>[,<id>...]  # where layer ID is at time T, and what covers it
make check  D=path/to/video.json  # every gate, every finding, ZERO consequence (runs preflight for you)
make screen F=<file> THEME=<t>    # design a product screen: preview + impeccable + content + readiness
make content-check D=<f> REF=<r>  # is this film's content as rich as the reference it studied, per act
make study REF=<url>              # the film-side twin of `make sections`, a reference to hold a film to
```

Single-shot: `./bin/vawe path/to/video.json` (`--draft` = fast), JSON starting `"module": "scene"`, saved as `films/scene/<topic>.json`. Read `sample.json` and an existing video first, never copy a structure wholesale. **On demand:** `make arsenal Q="…"` searches every effect/block (`MISTAKES=1` the mistake log, `THEME=<name>` a theme's look); `make demo Q="…"` writes a ten-second film about one thing (`engine-doctrine/CRAFT/SPECIMEN.md`). Making something good: `engine-doctrine/TASTE.md`. **A hand-built device (a CSS caret, a raw progress bar) saved with no recent `make arsenal` search first is nudged to search before it ships**: `harness/live/arsenal-nudge.mjs`.

## Direction: deciders write, critics report (stage 6)  `[ref: make critics]`

**A CRITIC only reports; a DECIDER writes into the film and owns ONE exclusive write scope**, so two deciders can't collide. Full roster, order, write scopes: `engine-doctrine/CRAFT/SUBAGENTS.md`. `make critics D=<file> DECIDERS=1` prints the six deciders as briefs for that film; bare, the six standing critics. **Usually overkill** below a full authoring pass, a recreation, or anything you'll ship: one well-briefed agent beats a fan-out for anything sequential (`engine-doctrine/CRAFT/SUBAGENT-BUDGET.md`).

## Stage 1, brief: ask before you build  `[gated: quality/gates/author-check.mjs#no-storyboard]`

Claude Code loads `vawe-video-planning`; others read `engine-doctrine/CRAFT/AUTHORING-WALKTHROUGH.md`. Do not open a JSON file first: nothing renders until the plan is LOCKED and the user signs off, presented as `make studio D=<file>.json`, `plan` state (real hand-written fragments, live, never grey boxes), and you wait. Five lines carry the whole request, any may be missing (SUBJECT, DATA, PAYOFF, AUDIENCE, FEELING); everything else is yours to decide. Plus two you fill yourself, unasked: `SPECTACLE` (the ONE exaggerated moment, named) and `NOT` (what this film explicitly does not do, derived from recent films by `make preflight D=<file>` rather than memory; waivable per-beat with `_why`).

**Never hand-author from a blank JSON**: `make ideate` writes the film's prompt first (`engine-doctrine/CRAFT/IDEATE.md`), then `make scaffold` writes the storyboard sidecar and scene shell; compose motion from `recipes/` or `make arsenal Q="…"`.

## Built-in rules (checked everywhere)  `[built: core/validate/validate.mjs:764]`
- No em-dashes (U+2014) in any on-screen text: the validator rejects them. Use a comma, period, or ·.
- First-frame hook ≤ ~12 words, front-load the strong word, ≤ 1 emoji.
- `{"preset": "black"}` (`core/backgrounds/presets.js:117`) is solid `#000000`, no grain, unlike every other dark preset, which carries a tint or wash.
- Author a boundary through `transitions[]` only: `cuts`/`stings`/`seams` are its lowered internal form and the validator refuses them written directly (`harness/author/migrate-junctions.mjs` converts an old scene).

## Stage 4, design: craft rules the gates can't fully see  `[eye]`

- **HTML first**, no CSS `animation`/`transition`/`opacity`/`filter`: use `parts` for a seeked entrance. [`HTML-FRAGMENTS.md`](engine-doctrine/CRAFT/HTML-FRAGMENTS.md).
- **Name the effect before you build it**, don't approximate by eye. Claude Code loads `vawe-name-the-effect`; others read that skill under `skills/`.
- **Show, don't only tell.** [`SHOW-DONT-TELL.md`](engine-doctrine/CRAFT/SHOW-DONT-TELL.md). **Empty space is a decision.** [`LAYOUT.md`](engine-doctrine/CRAFT/LAYOUT.md).
- **Real assets first, emoji last**: `make capture`/`make assets` (never a bare `curl`); never embed copyrighted material. [`IMAGERY.md`](engine-doctrine/CRAFT/IMAGERY.md). **Enforced, not just stated**: `make storyboard-check` blocks a beat that names a screen or a photo with no real source, the same precondition `/vawe-approve` already runs.
- **Content is measured against the reference, per act**, never a fixed bar. [`CONTENT.md`](engine-doctrine/CRAFT/CONTENT.md).
- **Launch videos:** crawl EVERY page, real logo size, pair entrances with exits directionally. [`HTML-FRAGMENTS.md`](engine-doctrine/CRAFT/HTML-FRAGMENTS.md).

## Stage 7, render: waivers  `[gated: quality/gates/author-check.mjs]`

`authoring.allow` + `_why` is the one mechanism, and it covers two different cases with the one
sentence, never two mechanisms: a rule broken for cause, and a chosen absence a static rule cannot
otherwise see (no continuous object, a still frame, no transition, an ending with nothing after it).
Neither is an apology. Measured across the library, half of real waiver use is the second case, an
author declaring "I chose this", not "I broke this" (`no-continuous-object`, `dead-air`,
`plain-slideshow`, `static-bg`, `no-transition`, `ends-on-nothing` are the codes this shows up on
most). The `_why` is what turns a reflex into a recorded decision either way, the same split
`quality/gates/audio-check.mjs` already draws for sound: chosen quiet and an audio block nobody
considered are not the same finding, and a waived rule and a declared absence are not the same finding
either, even though both are written with the one field. A waiver with no `_why` blocks:

```json
"authoring": { "allow": ["dead-air"], "_why": { "dead-air": "the held frame IS the beat" } }
```

The only door out of a fired rule is a reason written in the scene, whether that reason is "I broke
this on purpose" or "I chose this absence on purpose."

## Changing the ENGINE, not a film?  `[live: harness/live/craft-live.mjs]`

**EVERY EFFECT COMPOSES; NONE IS A SPECIAL CASE.** A new look is a combination of things the engine already owns (a unit, a clock, an order, a property, an exit), never a private code path that owns its own timing, its own colour ramp or its own reveal. The test before writing: name which existing mechanism each half of the effect uses. If one half has no owner yet, add the owner, not the effect. Measured cost of ignoring this: `typing` was built as its own path, so it could use none of the 32 kinetic presets, no transform, no filter and no exit, and its per-word colour ramp was a private copy of `colorWave`. The gaps that produced (per-character colour, a scattered exit) read as missing features and were one missing composition (`engine-doctrine/CRAFT/KEYED-MOTION.md`, `core/type/type.js` stagger orders, `core/tracks/units.js` exits).

Five rules govern any change to `core/`, `internal/`, a gate, or the capture path, plus what this engine took from the agent harness: `engine-doctrine/CRAFT/ENGINE-CHANGES.md`. Two are decidable from a path and the hook says them at the keystroke; elsewhere, read the doc by hand. Touched motion, backgrounds, type or layout? Ship a before/after: `make evals-compare` (`engine-doctrine/EVALS.md`). Editing `scene.html`? Claude Code reads `vawe-scene-authoring` first, others read that skill under `skills/`; system map `engine-doctrine/CODEMAPS/ARCHITECTURE.md`; run `make probe` after.

