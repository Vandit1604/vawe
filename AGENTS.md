# AGENTS.md: authoring videos for this engine

Canonical, tool-neutral doctrine for the vawe video engine: the same for Claude Code, Cursor, Codex,
or a human with no agent. A Claude Code mechanism (a hook, the Skill tool, a vendored skill) carries a
neutral note. `CLAUDE.md` only points here.

This repo turns **one self-describing JSON → one rendered video** (60fps mp4 final, 30fps with
`--draft`, `renderer/cmd/render/main.go:30`; five canvases, `core/layout/safe.js:35`: `16:9` `9:16`
`1:1` `4:5` `4:3`, an unnamed ratio fit to the long edge at 1920). Exactly **one module: `scene`**, an
open canvas of **24 layer types** (`ls core/layers/`) plus camera · transitions · captions.

The settled frame is HTML; the JSON animates it, never CSS. Author motion through `parts`, `motion`
and `vars`.

## THE SEVEN STAGES, IN ORDER  `[live: harness/live/stage-say.mjs]`

`make stage D=<film>` reads the repo, so it can never disagree with it, and says which stage a film
is in and the one next command; `make next D=<film>` runs that step.

| # | stage | the command |
|---|---|---|
| 1 | brief | `make quiz NAME= URL=` |
| 2 | plan | `make ideate` → write the storyboard → `make storyboard-check` → `make plan-judge` |
| 3 | design | `make preview` → `make design-spec` → `make studio D=` |
| 4 | assemble | `make assemble D=` writes the scene JSON |
| 5 | direct | `make critics D= DECIDERS=1` |
| 6 | render | `make ship D=` |
| 7 | judge | `make judge D=` → **vawe-audit** composes one verdict; **vawe-review-loop** owns the fix loop; a PASS is never self-recorded |

No sign-off step: the draft render at the design stage (`make dev`) is where the owner looks and
redirects, before a full render is spent.

**No templates**: compose from `engine-doctrine/PRIMITIVES.md` and real captured assets; `make assemble`
writes the scene JSON, `make ship` renders it. Reflecting a brand: `make sections` + `make palette`
build colours, fonts and a favicon from the site's own colours only.

## Where to look  `[ref: make help]`

`make help` prints every target, grouped by phase: never stale. `make arsenal Q="…"` searches every
effect and block before you hand-build one (`harness/live/arsenal-nudge.mjs` nudges this at save).

Claude Code loads a skill on demand; `make stage`/`make next` name the one the open stage wants. Load
`vawe-scene-authoring` before writing any layer. Everyone else reads `engine-doctrine/CRAFT/ROUTING.md`,
which also maps a request to its film type and the one `vawe-type` skill for it. Hand-writing HTML, or
fixing "looks AI": `taste-skill`, then `impeccable`.

## Built-in rules  `[built: core/validate/validate.mjs:74]`

- No em-dashes (U+2014) on screen: the validator rejects them.
- First-frame hook ≤ ~12 words, front-load the strong word, ≤ 1 emoji.
- `{"preset": "black"}` (`core/backgrounds/presets.js:118`) is solid `#000000`, no grain, unlike every
  other dark preset, which carries a tint or wash.
- Author a boundary through `transitions[]` only: `cuts`/`stings`/`seams` are its lowered internal
  form, and the validator refuses them written directly.
- Name the effect before building it, don't approximate by eye (Claude Code: `vawe-name-the-effect`).

## Waivers  `[gated: quality/gates/author-check.mjs]`

`authoring.allow` + `_why` is the one waiver mechanism: a rule broken for cause. A waiver with no
`_why` blocks:

```json
"authoring": { "allow": ["dead-air"], "_why": { "dead-air": "the held frame IS the beat" } }
```

## Changing the engine, not a film?  `[live: harness/live/craft-live.mjs]`

**Every effect composes; none is a special case.** A new look is a combination of things the engine
already owns (a unit, a clock, an order, a property, an exit), never a private code path with its own
timing or colour ramp. If one half has no owner, add the owner, not the effect. A new primitive ships
with its words too: 2+ `aka` phrases and a `blurb` naming its real default, enforced by
`make word-action`. Five rules govern any change to `core/`, `internal/`, a gate, or the capture path:
`engine-doctrine/CRAFT/ENGINE-CHANGES.md`.

## Testing: end to end first  `[ref: make e2e]`

Never write unit tests after the code. Write down every way a system can fail, then test end to end:
`make e2e` runs six checks in one command (snapshot digests, renderFrame purity, a real MCP-drafted
scene, the browser engine, the whole authoring ladder) and leaves one artefact,
`quality/runs/e2e/<timestamp>/report.md`. A known-broken tracked scene is excused by name in
`quality/baselines/e2e-known-broken.json`, never by loosening what counts as a pass.
