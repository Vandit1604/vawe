# AGENTS.md: authoring videos for this engine

This is the canonical, tool-neutral doctrine for the vawe video engine. It works the same way for
Claude Code, Cursor, Codex, or a human with no agent at all. Where a rule leans on a Claude Code
mechanism (a hook, the Skill tool, a vendored skill), the neutral note beside it says what to do by hand
instead. `CLAUDE.md` is a short pointer to this file, kept only so Claude Code auto-loads it.

This repo turns **one self-describing JSON → one rendered video** (60fps mp4 final, 30fps with
`--draft`; unset `--fps` follows the scene's own `fps` first, `cmd/render/main.go:30`, at any of **five**
canvases: `16:9` 1920×1080 · `9:16` 1080×1920 · `1:1` 1080×1080 · `4:5` 1080×1350 · `4:3` 1440×1080,
the table at `core/layout/safe.js:35`; an unnamed ratio is still honoured, fit to the long edge at
1920). There is exactly **one module: `scene`**, an open canvas of **24 composable layer types**
(`ls core/layers/`) plus camera · transitions · captions. `html` counts as a picture: hand-authored
markup is a picture too, not just text.

## THE EIGHT STAGES, IN ORDER  `[gated: harness/live/stage-gate.mjs]` `[live: harness/live/stage-say.mjs]`

**Read this first.** `make stage D=<film>` says which stage a film is in and the ONE next command.
Read from the files on disk, never from a stored state, so it cannot disagree with the repo.

| # | stage | what happens | the command |
|---|---|---|---|
| 1 | **brief** | ask what the product is, and the four other things a site would have given | `make quiz NAME= URL=` |
| 2 | **plan** | the beat table, the through-line, the spectacle, the exclusions | `make scaffold` → `make storyboard-check` |
| 3 | **approval** | the plan is SHOWN and a person says yes | `make studio D=` (press `1`), then the USER runs `/vawe-approve` |
| 4 | **design** | the theme is settled and every frame the plan named is drawn | stage kit → the reference's grammar → the smallest useful `ui-skills` set → `make preview` → look at it |
| 5 | **assemble** | the frames become a scene | `make assemble D=` |
| 6 | **direct** | motion, then transitions, then sound, in that order | `make critics D= DECIDERS=1` |
| 7 | **render** | | `make ship D=` |
| 8 | **judge** | the only step that SEES | `make judge D=` → `make ledger D=` |

**Three of those transitions are refused rather than requested**, because this order was written here,
printed by `make critics`, and still run backwards by an author who could quote it
(`docs/MISTAKES.md` #591, #595). `harness/live/stage-gate.mjs` denies, at `PreToolUse`, before any
permission mode: writing a fragment no storyboard claims · writing `layers` into an unapproved film ·
writing `approved:` at all, which is the user's signature and never an agent's. The way out of each is
the missing artefact, and there is no flag, because a flag would be a way to skip the step.

**And the order is re-stated every turn**, not read once: `harness/live/stage-say.mjs` names the open
stage and its one next command at `UserPromptSubmit`. A rule read at session start is a rule that fails
late in a long session, which is exactly when it matters. `make next D=<film>` runs a stage's one step.

Everything below is reference. Each heading names the stage that sends you there.

**No templates.** You do not pour data into a canned layout; you compose each video from the
vocabulary in `docs/PRIMITIVES.md`. Your job when asked to "make a video about X" is to **write a
scene JSON** (and capture the real assets it needs), then render it. You do **not** edit `scene.html`
or the Go renderer unless explicitly asked.

> **Reflecting a brand/website?** (stages 2, 4) `make sections` + `make palette` builds the colours
> pack + fonts + favicon. Design knowledge: `docs/DESIGN-DATABASE.md`; primitives:
> `docs/PRIMITIVES.md`; motion: `docs/MOTION-CRAFT.md`. **Use ONLY the site's colours** and respect
> dominance (white-first vs dark).

## Skill router (stages 1, 2, 4)  `[eye]`

Skills live in `skills/` as plain docs any agent can read. Claude Code loads them on demand with the
Skill tool; any other agent opens the doc in the last column and follows it as a checklist, which is
the real content in every row.

| You are about to… | Claude Code skill | Everyone: the doc |
|---|---|---|
| **Write any layer** (first move, every time) | **vawe-scene-authoring** | [`docs/RULES/INDEX.md`](docs/RULES/INDEX.md) |
| Plan a new video, or one from scratch | **vawe-video-planning** | storyboard/ledger; [`docs/CRAFT/AUTHORING-WALKTHROUGH.md`](docs/CRAFT/AUTHORING-WALKTHROUGH.md) if there's no brand site |
| Make a specific TYPE (launch, explainer, talking-head, sting, demo, recreation) | **vawe-type-`<type>`** | `docs/CRAFT/ROUTING.md` maps a request to its type |
| Fix "not directed", or decide what holds a film across cuts | n/a | [`docs/CRAFT/DIRECTION.md`](docs/CRAFT/DIRECTION.md) · [`docs/CRAFT/FILM-STRUCTURE.md`](docs/CRAFT/FILM-STRUCTURE.md) |
| **Hand-write any HTML**, or judge/fix "looks AI" | **taste-skill** → **impeccable** (vendored third-party, Apache 2.0) | design read + 3 dials, then its rendered-page detector |
| Reflect a website or a film | n/a | `make sections` → [`docs/CRAFT/RECREATION.md`](docs/CRAFT/RECREATION.md); `make study` → [`docs/CRAFT/REFERENCE-STUDY.md`](docs/CRAFT/REFERENCE-STUDY.md) |
| Captions, a phone feed, or a theme's whole-film default | n/a | [`docs/CRAFT/CAPTIONS.md`](docs/CRAFT/CAPTIONS.md) · [`docs/CRAFT/THEME-LOOK.md`](docs/CRAFT/THEME-LOOK.md) |

**Anti-slop (non-negotiable).** Hand-authored HTML is where generic "AI slop" enters. Three checks
answer it and only ONE of them is this repo's: `harness/live/craft-live.mjs` reads a fragment's source
for sizes and shadows that do not trace to the stage kit, and `quality/gates/frame-check.mjs` compares
the plan with the frames built from it. **`impeccable` is neither.** It is a vendored third-party skill
(v3.5.0, Apache 2.0, `skills/impeccable/LICENSE`) and it is the only thing here that opens a browser
and measures what actually RENDERED. Do not call our own checks by its name, and do not credit it with
what they catch. Claude Code
loads **taste-skill** and sets the three dials (`DESIGN_VARIANCE`/`MOTION_INTENSITY`/`VISUAL_DENSITY`);
**every hand-written frame takes ONE route: stage kit → the reference's grammar → the smallest useful
`ui-skills` set → `make preview` → your own eye** ([`docs/CRAFT/HTML-FRAGMENTS.md`](docs/CRAFT/HTML-FRAGMENTS.md);
`DESIGN.md` records which skills were used and which were refused);
other agents read the same dials by hand. Prefer to **capture** a real surface over inventing one, then
gate it clean: `make designspec-check D=<file>`. Name ONE art direction ("clean modern SaaS" is
banned); asymmetry and scale contrast are defaults; type is distinctive.

**Gates, one command:** `make author-check D=<file>` (validate · beats · assets · inspect ·
plan-vs-render, always on; the style gates report only, `TASTE=1` makes them block,
[`docs/TASTE.md`](docs/TASTE.md)). Then the eye rungs: `make probe` → `make audit` → `make beats` →
`make ledger` → **`make judge`** (the gate that SEES, required post-render; `docs/JUDGE.md`).

## The full command list (stages 2, 5, 7, 8)  `[ref: make list]`

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

Reaching `make judge` is not the stop: load `vawe-review-loop` for when to stop iterating.

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

> Making something good: read [`docs/TASTE.md`](docs/TASTE.md) first.

## Direction: deciders write, critics report (stage 6)  `[ref: make critics]`

One agent holding the whole film does every part of it worse. Authoring needs several DIFFERENT
judgements (what this beat shows, what moves, what a cut means, what the copy earns) and they do not
fit in one context at once. So a real film is made by a roster, and the roster has two kinds of member
that must never be confused.

**A DECIDER writes into the film. A CRITIC only reports.** A critic that can fix will fix instead of
finding, and six agents writing to one file produce a film nobody chose. That separation is the whole
safety of the arrangement.

**A decider owns ONE exclusive write scope and touches nothing else.** Two deciders then cannot
collide, and a decision that turns out wrong reverts in one field instead of being tangled through the
film. **A role earns its place only if the engine cannot already decide it**: type, colour, layout and
backdrop all resolve from the theme, so a decider there re-decides what the brand already decided.

| Order | Decider | Writes | Because |
|---|---|---|---|
| 1 | **storyboard** | the storyboard file | it decides the film as a whole. Every role below transcribes it |
| 2 | **subject** | a beat's subject slot | what a beat SHOWS is the one thing the engine must never choose alone (`docs/MISTAKES.md` #159) |
| 3 | **scene** (one per scene) | one fragment file | HTML renders instantly, so the agent iterates against its own work with no render. It runs THIRD, never first: the beat table decides how many fragments exist and names the selectors they must expose (MISTAKES #591) |
| 4 | **motion** | `motion[]` and `idle` | nothing moves that nobody asked to move, so every keyed track is a decision. **The film may not stop**: `make motion-floor D=<file>` measures content motion per half second, and the fix for a hole is OVERLAP, never `idle` (the gate counts only small-region change, so ambience cannot satisfy it, and that was tested) |
| 5 | **transition** | `transitions[]` | the engine narrows the cut by structure; the rhetorical relationship between two beats is not in the data |
| 6 | **sound** | the audio block | cue punctuation is automatic; choosing a bed is a register decision |

**`make critics D=<file> DECIDERS=1` prints these six as briefs, in order, filled in for that film**: its beats,
its fragments, its theme, and whether a storyboard exists yet. The scene deciders are the one row that
runs in parallel, one per fragment; every other row reads what the row above it decided.

**The order is a dependency, not a preference,** and the one non-obvious link is motion before
transitions: the content-aware cut reads the velocity at a joint as its strongest signal, so a cut
chosen before the motion exists is choosing against a still frame.

**Then the critics, in ONE parallel message,** each handed an artifact the author has not already
seen: beat, bg-motion, reveal, fidelity, copy, seam. `make critics D=<file>` emits them as ready-to-run
prompts with the real sheet paths filled in. A critic is EVIDENCE, never a ruling: look before you act,
and if your own eye confirms the flaw, that is a fix and never a rationalisation.

**This is not free, and it is usually overkill.** A measured fan-out here ran to 87 agents and 5.66M
tokens, and the finding was that one well-briefed agent beats a fan-out for anything sequential
([`docs/CRAFT/SUBAGENT-BUDGET.md`](docs/CRAFT/SUBAGENT-BUDGET.md), read it first). Choosing three cuts
for a three-cut film is not worth an agent. **The roster earns its cost on a film with real scenes:
a full authoring pass, any recreation, anything you intend to ship.** Below that, do it yourself.

Full roster, verdict shapes, and the six brief lines a fan-out pays for by omitting:
[`docs/CRAFT/SUBAGENTS.md`](docs/CRAFT/SUBAGENTS.md).

## Stage 1, brief: ask before you build  `[gated: quality/gates/author-check.mjs#no-storyboard]`

Claude Code loads `vawe-video-planning`; other agents read
[`docs/CRAFT/AUTHORING-WALKTHROUGH.md`](docs/CRAFT/AUTHORING-WALKTHROUGH.md). Do not open a JSON file
first. Nothing renders until the plan is LOCKED and the user signs off; if you find yourself trying
things in the JSON, the plan was not locked. The lock sheet (per-beat copy, colours, fonts, layout,
treatment, cuts, CTA) is the artefact, not the storyboard: present it and wait.

**Present it as `make studio D=<file>.json`, in its `plan` state**, one page on the studio server carrying each
beat beside its real hand-written fragment, live. Not loose html files opened out of `/tmp`, and not
grey boxes: `make panels` sizes a box from `shot:` and cannot say what is in the frame, which is the
only question the person signing off can answer (MISTAKES #592).

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
insurance: most generic output is an un-excluded default, not a wrong decision. Do not write it from
memory: `make preflight D=<file>` derives it from what recent films actually used
(`node quality/gates/ledger.mjs not <theme>`), so it excludes the real pattern, not whatever the author
happens to think of. It is a constraint, not a ban: a beat with a real reason to repeat a value still
can, waived in the scene with `_why`.

**Do not hand-author a film from a blank JSON.** Write the film's prompt first (`make ideate`), then
<!-- doc-refs-allow: make ideate · being built in parallel with the blueprints retirement, not yet wired into the Makefile -->
`make scaffold` writes the storyboard sidecar and an empty-layers scene shell; compose the motion from
`recipes/` (recipes/README.md) or `make arsenal Q="…"`. Never quote a library statistic from memory: run
`node harness/dev/library-stats.mjs` and cite what it prints. Content spine: hook → suspense → payoff.
Never spoil the payoff; order beats toward the most counterintuitive moment; be honest, on-screen
copy must be true, and a specific fact beats a dry number.

## Built-in rules (checked everywhere)  `[built: core/validate/validate.mjs:764]`
- No em-dashes (U+2014) in any on-screen text: the validator rejects them. Use a comma, period, or ·.
- First-frame hook ≤ ~12 words, front-load the strong word, ≤ 1 emoji.
- `{"preset": "black"}` (`core/backgrounds/presets.js:117`) is solid `#000000`, no grain: it means
  black, unlike every other dark preset, which carries a tint or wash.
- Author a boundary through `transitions[]` only. `cuts`, `stings` and `seams` are its lowered
  internal form and the validator refuses them when written directly;
  `harness/author/migrate-junctions.mjs` converts an old scene.

## Stage 4, design: craft rules the gates can't fully see  `[eye]`

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
- **Launch videos:** crawl EVERY page, not the homepage. Give the logo real size (~100px+ beside a
  title, 150px+ on the end card). Pair entrances with exits directionally (`slide-right` leaves
  `slide-left`). Blur out (`out:"defocus"`) when moving would fight dense content. Put a changing
  word in a fixed-width chip so nothing after it reflows.

## Stage 7, render: waivers  `[gated: quality/gates/author-check.mjs]`

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
quality/gates/rung.mjs --list` prints the worklist. Highest rung wins:

```
[built]  the engine makes it true          a wrong value cannot be written
[gated]  a gate refuses it                 the push stops
[live]   something says it while you write a hook speaks at the keystroke (Claude Code; elsewhere, check by hand)
[ref]    a command answers it on demand    you have to ask
[eye]    nothing but the sentence          you have to remember
```

| the harness does | this engine does | where |
|---|---|---|
| PostToolUse hooks that speak mid-task | a hook reads what you just saved and answers | `harness/live/*.mjs` |
| a PreToolUse deny, evaluated before permission mode | the authoring ORDER refuses a write that skips a stage | `harness/live/stage-gate.mjs` |
| UserPromptSubmit context injection | the open stage and its next command, re-stated every turn | `harness/live/stage-say.mjs` |
| `[live]` capability discovery, PUSHED instead of searched | a beat with real duration and no `move`/`motion` is named at the moment its storyboard is saved, and told the exact `move:` line to add; `make surface D=<storyboard>` is the neutral on-demand form | `harness/live/beat-surfacer.mjs` |
| deferred tools, fetched by search | `make arsenal Q="…"`, `make schema AT=…` | `harness/author/` |
| skills loaded only when needed | `docs/CRAFT/*.md`; a finding NAMES the doc that settles it | `docs/TASTE.md` |
| refusing an invalid call at the boundary | refusing at the WRITE SITE, so a bad state is unrepresentable | `core/registry/registry.js` |

A gate is the LAST resort: if the bad value has a write site, the refusal goes there. Where a clean
state can't be reached today, the number goes in a ratchet (`quality/baselines/*-ratchet.json`), never rising.

## Changing the ENGINE, not a film?  `[live: harness/live/craft-live.mjs]`

Five rules govern any change to `core/`, `internal/`, a gate, or the capture path:
[`docs/CRAFT/ENGINE-CHANGES.md`](docs/CRAFT/ENGINE-CHANGES.md). Two are decidable from a path, and the
hook says them at the keystroke; elsewhere, read the doc and check by hand. Touched motion,
backgrounds, type or layout? Ship a before/after with `make evals-compare` ([`docs/EVALS.md`](docs/EVALS.md)).

> **Editing `scene.html`?** Claude Code reads the `vawe-scene-authoring` skill first; other agents read
> `skills/vawe-scene-authoring/` directly. System map: `docs/CODEMAPS/ARCHITECTURE.md`. Run `make
> probe` after scene-logic changes.
