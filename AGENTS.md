# AGENTS.md: authoring videos for this engine

This is the canonical, tool-neutral doctrine for the vawe video engine. It works the same way for
Claude Code, Cursor, Codex, or a human with no agent at all. Where a rule leans on a Claude Code
mechanism (a hook, the Skill tool, a vendored skill), the neutral note beside it says what to do by hand
instead. `CLAUDE.md` is a short pointer to this file, kept only so Claude Code auto-loads it.

This repo turns **one self-describing JSON → one rendered video** (30fps mp4, at any of **five**
canvases: `16:9` 1920×1080 · `9:16` 1080×1920 · `1:1` 1080×1080 · `4:5` 1080×1350 · `4:3` 1440×1080,
the table at `core/layout/safe.js:35`; an unnamed ratio is still honoured, fit to the long edge at
1920). There is exactly **one module: `scene`**, an open canvas of **24 composable layer types**
(`ls core/layers/`) plus camera · transitions · captions. `html` counts as a picture: hand-authored
markup is a picture too, not just text.

**No templates.** You do not pour data into a canned layout; you compose each video from the
vocabulary in `docs/PRIMITIVES.md`. Your job when asked to "make a video about X" is to **write a
scene JSON** (and capture the real assets it needs), then render it. You do **not** edit `scene.html`
or the Go renderer unless explicitly asked.

> **Reflecting a brand/website?** `make sections` + `make palette` builds the colours pack + fonts +
> favicon. Design knowledge: `docs/DESIGN-DATABASE.md`; primitives: `docs/PRIMITIVES.md`; motion:
> `docs/MOTION-CRAFT.md`. **Use ONLY the site's colours** and respect dominance (white-first vs dark).

## Skill router  `[eye]`

Skills live in `skills/` as plain docs any agent can read. Claude Code loads them on demand with the
Skill tool; any other agent opens the doc in the last column and follows it as a checklist, which is
the real content in every row.

| You are about to… | Claude Code skill | Everyone: the doc |
|---|---|---|
| **Write any layer** (first move, every time) | **vawe-scene-authoring** | [`docs/RULES/INDEX.md`](docs/RULES/INDEX.md) |
| Plan a new video, or one from scratch | **vawe-video-planning** | storyboard/ledger; [`docs/CRAFT/AUTHORING-WALKTHROUGH.md`](docs/CRAFT/AUTHORING-WALKTHROUGH.md) if there's no brand site |
| Make a specific TYPE (launch, explainer, talking-head, sting, demo, recreation) | **vawe-type-`<type>`** | `docs/CRAFT/ROUTING.md` maps a request to its type |
| Fix "not directed", or decide what holds a film across cuts | n/a | [`docs/CRAFT/DIRECTION.md`](docs/CRAFT/DIRECTION.md) · [`docs/CRAFT/FILM-STRUCTURE.md`](docs/CRAFT/FILM-STRUCTURE.md) |
| **Hand-write any HTML**, or judge/fix "looks AI" | **taste-skill** → **impeccable** | design read + 3 dials, then the 41-rule detector |
| Reflect a website or a film | n/a | `make sections` → [`docs/CRAFT/RECREATION.md`](docs/CRAFT/RECREATION.md); `make study` → [`docs/CRAFT/REFERENCE-STUDY.md`](docs/CRAFT/REFERENCE-STUDY.md) |
| Captions, a phone feed, or a theme's whole-film default | n/a | [`docs/CRAFT/CAPTIONS.md`](docs/CRAFT/CAPTIONS.md) · [`docs/CRAFT/THEME-LOOK.md`](docs/CRAFT/THEME-LOOK.md) |

**Anti-slop (non-negotiable).** Hand-authored HTML is where generic "AI slop" enters. Claude Code
loads **taste-skill** and sets the three dials (`DESIGN_VARIANCE`/`MOTION_INTENSITY`/`VISUAL_DENSITY`);
other agents read the same dials by hand. Prefer to **capture** a real surface over inventing one, then
gate it clean: `make designspec-check D=<file>`. Name ONE art direction ("clean modern SaaS" is
banned); asymmetry and scale contrast are defaults; type is distinctive.

**Gates, one command:** `make author-check D=<file>` (validate · beats · assets · inspect ·
plan-vs-render, always on; the style gates report only, `TASTE=1` makes them block,
[`docs/TASTE.md`](docs/TASTE.md)). Then the eye rungs: `make probe` → `make audit` → `make beats` →
`make ledger` → **`make judge`** (the gate that SEES, required post-render; `docs/JUDGE.md`).

## The loop  `[ref: make list]`

Every target belongs to one of ten phases (preflight → dev → check → ship → judge → ledger → study →
engine → site → maintenance); `make list` (alias `make help`) reads the Makefile itself and prints
every target grouped that way, so it is the one front page and cannot drift from the real target list.
Every one of those targets is `.PHONY`: this is a command catalogue, not a build graph, on purpose
([`docs/MAKEFILE-AUDIT.md`](docs/MAKEFILE-AUDIT.md)).

```bash
make list                        # every target, grouped by phase: the spine below, always current
make formats                     # the scene module + its schema/sample (was `make list`)
make preflight D=<file>          # the 9 decisions before any JSON (docs/CRAFT/README.md)
make dev   D=path/to/video.json  # THE ITERATION LOOP. Build, draft-render, open. No gates, no audit.
make studio D=path/to/video.json # the same scene with a frame scrubber + a timeline
make check D=path/to/video.json  # every gate, every finding, ZERO consequence (runs preflight for you)
make ship  D=path/to/video.json  # preflight (if needed) → author-check → render → audit ASPECT=all → seams
make judge D=path/to/video.json  # the eye, MANDATORY post-render, the only step that SEES
make ledger D=path/to/video.json # prove it is not a repeat; ledger-add after the user approves
```

`make ship` DECLARES its own ladder before it runs; every other doc names these same phases the same
way. Reaching `make judge` is not the stop: load `vawe-review-loop` for when to stop iterating.

Single-shot: `./bin/vawe path/to/video.json` (JSON → `out/<name>.mp4`, `--draft` = fast); `make video
D=<file>` (author-check → render → audit; `NOCHECK=1`/`NOAUDIT=1` skip a half). Every JSON **must**
start with `"module": "scene"`, saved as `formats/scene/<topic>.json`. Read `sample.json` and an
existing video first, then compose, never copy a structure wholesale.

What no gate can do, so you must: read the sheets (`make beats`, `make reveal`); QA the seams
(`make seam-check`); audit every canvas you ship (`make audit M=<file> ASPECT=all`, `"destination"`
for a phone feed); eyeball real frames (`make look D=<file>` / `make frame D=<file> N=<n>`); pace a
narrated film (`make pace-from-vo VO=<file>.words.json`).

**On demand, ONE front door:** `make arsenal Q="…"` searches every named effect/block. The same
command folds what used to be six others: `AT="layers[].motion[]"` answers what is legal at one path,
`SHAPE=pan|blast|drift|enter|exit` emits a hand-keyed motion track, `BLUEPRINTS=1` catalogs the
directed-motion beats, `PREVIEWS=1`/`PRESETS=1` open their rendered sheets, `MISTAKES=1 Q="…"` asks
the mistake log, `THEME=<name>` renders one theme's look. The old separate targets still work (they
print where they moved) for one release. `make demo Q="…"` writes a ten-second film about one thing
([`docs/CRAFT/SPECIMEN.md`](docs/CRAFT/SPECIMEN.md)). Full index: [`docs/CRAFT/README.md`](docs/CRAFT/README.md).

> Fan-out: [`docs/CRAFT/SUBAGENT-BUDGET.md`](docs/CRAFT/SUBAGENT-BUDGET.md) first (fewer, larger
> agents). Shipping a real video: dedicated subagents, one job each, in parallel
> ([`docs/CRAFT/SUBAGENTS.md`](docs/CRAFT/SUBAGENTS.md), a critic is evidence, never a ruling). Making
> something good: read [`docs/TASTE.md`](docs/TASTE.md) first.

## "LET'S MAKE A VIDEO" IS A REQUEST TO ASK QUESTIONS  `[gated: scripts/gates/author-check.mjs#no-storyboard]`

Claude Code loads `vawe-video-planning`; other agents read
[`docs/CRAFT/AUTHORING-WALKTHROUGH.md`](docs/CRAFT/AUTHORING-WALKTHROUGH.md). Do not open a JSON file
first. Nothing renders until the plan is LOCKED and the user signs off; if you find yourself trying
things in the JSON, the plan was not locked. The lock sheet (per-beat copy, colours, fonts, layout,
treatment, cuts, CTA) is the artefact, not the storyboard: present it and wait.

## THE BRIEF: what the requester says, and what is YOUR job  `[eye]`

The requester should never have to name a colour, an easing, a layer type or a preset. Their whole
request is five lines, and any may be missing:

```
SUBJECT   what it is about, in one line
DATA      where the facts come from (a URL, a file, an API, or "here they are")
PAYOFF    the one thing to remember, and it lands LAST
AUDIENCE  who watches, and where they see it
FEELING   one reference, or one word ("brew act 1", "cinematic", "loud")
```

Everything else, palette to pacing, is yours to decide and defend. If a missing field would change
the film, ask before building, not after. Two more lines are yours to fill, every time, unasked:

```
SPECTACLE  the ONE exaggerated moment, named: which beat, which layer, which device
NOT        what this film explicitly does not do (no narration, no stock photos, no gradient hero)
```

Naming the spectacle is also a promise every other beat stays restrained. The `NOT` line is cheap
insurance: most generic output is an un-excluded default, not a wrong decision.

**Do not hand-author a film from a blank JSON.** Compose from `make blueprints`; pick one by SEEING it
(`make previews`). Never quote a library statistic from memory: run `node
scripts/dev/library-stats.mjs` and cite what it prints. Content spine: hook → suspense → payoff.
Never spoil the payoff; order beats toward the most counterintuitive moment; be honest, on-screen
copy must be true, and a specific fact beats a dry number.

## Built-in rules  `[built: core/validate/validate.mjs:764]`
- No em-dashes (U+2014) in any on-screen text: the validator rejects them. Use a comma, period, or ·.
- First-frame hook ≤ ~12 words, front-load the strong word, ≤ 1 emoji.
- `{"preset": "black"}` (`core/backgrounds/presets.js:117`) is solid `#000000`, no grain: it means
  black, unlike every other dark preset, which carries a tint or wash.
- Author a boundary through `transitions[]` only. `cuts`, `stings` and `seams` are its lowered
  internal form and the validator refuses them when written directly;
  `scripts/author/migrate-junctions.mjs` converts an old scene.

## Launch-video rules  `[eye]`

Crawl EVERY page, not the homepage. Give the logo real size (~100px+ beside a title, 150px+ on the
end card). Pair entrances with exits directionally (`slide-right` leaves `slide-left`). Blur out
(`out:"defocus"`) when moving would fight dense content. Put a changing word in a fixed-width chip so
nothing after it reflows.

## Craft rules the gates can't fully see  `[eye]`

- **HTML first.** If CSS already does the thing, write the CSS. No CSS `animation`/`transition`/
  `opacity`/`filter` (the engine owns the clock); use `parts`, a selector giving every matched element
  a seeked, staggered entrance. [`docs/CRAFT/HTML-FRAGMENTS.md`](docs/CRAFT/HTML-FRAGMENTS.md).
- **Name the effect before you build it.** Find its name and read its recipe; don't approximate by eye
  and iterate. Claude Code loads `vawe-name-the-effect`; others read the same skill under `skills/`.
- **Show, don't only tell.** DECORATION dresses the frame; EXPLANATION does work words can't. No gate
  scores this; `make judge` and your eyes are the check. [`docs/CRAFT/SHOW-DONT-TELL.md`](docs/CRAFT/SHOW-DONT-TELL.md).
- **Empty space is a decision.** Name what it's doing in one clause; if enlarging the subject removes
  it and improves the frame, it was never working. [`docs/CRAFT/LAYOUT.md`](docs/CRAFT/LAYOUT.md).
- **Real assets first, emoji last.** `make capture` for real UI, `make assets` for logos (never a bare
  `curl`, a 404 writes a zero-byte file). Never embed copyrighted material. [`docs/CRAFT/IMAGERY.md`](docs/CRAFT/IMAGERY.md).

## Waivers  `[gated: scripts/gates/author-check.mjs]`

A rule you deliberately break is waived IN THE SCENE, with a reason. A waiver with no `_why` blocks:

```json
"authoring": {
  "allow": ["dead-air"],
  "_why": { "dead-air": "the held frame IS the beat: the room empties and nothing replaces it" }
}
```

`authoring.allow` + `_why` is the one excuse mechanism: a rule fires or it does not, and the only door
out is a reason written in the scene.

## WHAT THIS ENGINE TOOK FROM THE AGENT HARNESS  `[ref: make rung]`

Several Claude Code mechanisms answer problems this repo also has, adopted one at a time. When you
adopt another, add its row and give it a rung. `make rung` prints the current distribution; `node
scripts/gates/rung.mjs --list` prints the worklist. Highest rung wins:

```
[built]  the engine makes it true          a wrong value cannot be written
[gated]  a gate refuses it                 the push stops
[live]   something says it while you write a hook speaks at the keystroke (Claude Code; elsewhere, check by hand)
[ref]    a command answers it on demand    you have to ask
[eye]    nothing but the sentence          you have to remember
```

| the harness does | this engine does | where |
|---|---|---|
| PostToolUse hooks that speak mid-task | a hook reads what you just saved and answers | `scripts/live/*.mjs` |
| deferred tools, fetched by search | `make arsenal Q="…"`, `make schema AT=…` | `scripts/author/` |
| skills loaded only when needed | `docs/CRAFT/*.md`; a finding NAMES the doc that settles it | `docs/TASTE.md` |
| refusing an invalid call at the boundary | refusing at the WRITE SITE, so a bad state is unrepresentable | `core/registry/registry.js` |

A gate is the LAST resort: if the bad value has a write site, the refusal goes there. Where a clean
state can't be reached today, the number goes in a ratchet (`verify/*-ratchet.json`), never rising.

## Changing the ENGINE, not a film?  `[live: scripts/live/craft-live.mjs]`

Five rules govern any change to `core/`, `internal/`, a gate, or the capture path:
[`docs/CRAFT/ENGINE-CHANGES.md`](docs/CRAFT/ENGINE-CHANGES.md). Two are decidable from a path, and the
hook says them at the keystroke; elsewhere, read the doc and check by hand. Touched motion,
backgrounds, type or layout? Ship a before/after with `make evals-compare` ([`docs/EVALS.md`](docs/EVALS.md)).

> **Editing `scene.html`?** Claude Code reads the `vawe-scene-authoring` skill first; other agents read
> `skills/vawe-scene-authoring/` directly. System map: `docs/CODEMAPS/ARCHITECTURE.md`. Run `make
> probe` after scene-logic changes.
