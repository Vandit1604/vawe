# AGENTS.md: house rules for vawe

vawe is the framework for agent-native motion graphics: one HTML page in, one film out. Write the
page in what you already know (HTML, CSS, Web Animations, SVG, canvas, three.js): you never learn a
private format, and if something you would naturally write fails, that is a framework bug to report.
This file adds only what you would get wrong on your own. One command runs everything: `bin/vawe --help`
(`bin/vawe <verb> --help` lists flags; a wrong flag exits 2 with the valid ones). Start with
`bin/vawe new <name>`: it writes `films/<name>/page.html` (a valid starter) and `brief.md`.
`films/examples/three-star/page.html` is a worked page.

## The page contract  `[live: harness/media/render-page.mjs]`

- A film is `films/<name>/page.html` plus its own assets folder, relative paths only.
- `<meta name="duration" content="12.4">` in seconds. Optional `<meta name="fps">` is your frame-table
  rate; the render rate is separate (60 final, 30 draft) and frames are fractional.
- Time is the seek, never the clock: CSS `@keyframes` / `element.animate()` (the renderer sets
  `currentTime`), or `window.seek(t)` in seconds painting frame t as a pure function, or both.
  No timers, no state between frames, no unseeded random: a virtual clock
  (`core/engine/page-clock.js`) owns `Date`, `requestAnimationFrame`, timers and `Math.random`.
- Aspect: `<html data-aspect="16:9">`, `--vw`/`--vh` (px lengths) on `:root` and `window.vawe` are set
  before your scripts run. Lay out with CSS for `16:9 9:16 1:1 4:5 4:3`. Never crop.
- Audio is `<audio>` tags, never played live, mixed offline as written (no normalising, about -20 LUFS at default gains; `<meta name="loudness" content="-14">` opts in to a delivery target): `src` + `data-at` (s),
  `data-gain` (dB), `data-fade-out`; `loop` is the music bed; `data-synth="whoosh"` picks a voice
  from `core/audio/kit.mjs`; `data-role="vo"` ducks the bed.
- Every tunable number is a literal in the page (a `[[f, v]]` table, a keyframe stop, a `:root`
  custom property); the studio edits those literals in place.
- `<meta name="message">`: the one thing to remember. `<meta name="spectacle">`: the second of the
  one big moment; put quiet before it. One focal point per frame.
- Springs, keyframe tables, seeded noise: `core/motion/springs.js` (`core/motion/README.md`).

## The loop  `[live: harness/live/stage-say.mjs]`

Brief or reference -> stills -> draft -> critique in a fresh session -> fix only the affected
seconds -> final. A hook names the next command for the page film you edited last.
Read `engine-doctrine/TASTE-CARD.md` before the stills: 15 rules and 5 anti-patterns, and the judge scores against it.

| # | stage | the command |
|---|---|---|
| 1 | type | `engine-doctrine/CRAFT/ROUTING.md` names the `prompts/` template; `bin/vawe new <name> --from prompts/<t>.md` |
| 2 | stills | three directions in `brief.md`, their key frames side by side in `directions.html`; pick one, then the five frames that define the look |
| 3 | draft | `bin/vawe dev <page> [--from s --to s]` (half size, 30 fps, silent) |
| 4 | critique | `bin/vawe critique <page> [--ref mp4]` in a session that did not write the page (`vawe-critique`) |
| 5 | fix | re-render only the seconds the critique named: `bin/vawe dev <page> --from s --to s` |
| 6 | final | `bin/vawe ship <page>` renders (60 fps, motion blur, audio), checks the final and runs a fresh judge; `bin/vawe ship --status <page> --wait` gives the verdict. Iterate on drafts, not finals: fix what it names, `bin/vawe dev`, `bin/vawe judge <draft mp4> --fresh`, until PASS, then ship once more |

Recreating a reference: `bin/vawe new <name> --ref <ref.mp4>` writes SPEC.md; mark every line KEEP
or CHANGE, rebuild, then loop `bin/vawe critique <page> --ref <ref.mp4>` until it passes
(`vawe-reference`). `ship` refuses until that loop passes.

Over 60 seconds or more than one session: one chapter file per agent
(`prompts/directors-brief-long-form.md`). Skills: `vawe-page` (write), `vawe-critique` (look),
`vawe-reference` (match). Score with `bin/vawe judge <page|mp4> --runs A,B` in a fresh session; a
PASS is never self-recorded.

## Motion rules that are not your defaults  `[eye]`

- Arrive fast, land soft: `approach(f, from, to, k)`, k 0.12 to 0.19 (share of the remaining
  distance closed per frame), not `ease-out` on everything.
- Exits run faster and shorter than entrances.
- Stagger siblings 30 to 80 ms; never let a group land on one frame.
- Blur follows motion: a moving thing may blur, a still thing never does.
- Text holds `words x 0.6 s`, floor 1.2 s (`engine-doctrine/RULES/readable-hold.md`). Fix a fast read
  with a hold, never a slower move.
- The slowest beat is at least 3x the fastest (`engine-doctrine/RULES/speed-bands.md`).
- Cut on the beat, or two frames early. A declared hold is allowed and is not dead air.
- Adjacent transitions change axis or direction.

## Banned first-draft defaults  `[eye]`

You will reach for each of these; do the other thing (`engine-doctrine/RULES/banned-defaults.md`). A brief that asks for one overrides the ban.

- A centred title on a gradient. Compose off-centre, on a real surface.
- Everything fades in. One entrance per beat, and make it a move.
- Corner labels and frame borders. Nothing decorates the edge.
- Glow on UI text or chrome, particle bursts, RGB split, camera shake, bouncy overshoot.
- A crossfade as the only transition. Cut, wipe on the motion, or match on a shape.
- Fake product UI. A capture of the real thing, or nothing.
- A random gradient, gradient text, cyan to purple, Inter or Space Grotesk with no brand reason.
- Two things fighting for attention. One focal point, one accent colour.
- An em dash on screen (the validator rejects it). A first-frame hook over 12 words.

## Waivers  `[live: harness/media/render-page.mjs]`

A rule broken for cause is declared in the page with its reason, nowhere else; no `_why`, no waiver.
Checks advise; only determinism and a missing reason refuse.
`<script type="application/json" id="authoring">{"allow": ["dead-air"], "_why": {"dead-air": "the held wordmark IS the last beat"}}</script>`

## Changing the engine, not a film  `[ref: engine-doctrine/CRAFT/ENGINE-CHANGES.md]`

Every effect composes; none is a special case. Test end to end: list every way it can fail, then
`bin/vawe e2e` (about 4 s). A unit test only for what a render cannot show. Framework agents:
`harness/dev/AGENT-TASK.md`. The pre-push hook runs e2e.

## Comments  `[eye]`

Only a fact the code cannot show: a contract (units, ranges, side effects), a measured number with
its source, an outside quirk, or a guard that looks safe to delete. Never history or restatement.
A stale comment is a bug.

Where to look: `prompts/README.md` (a template per film type), `prompts/moves/README.md` (moves to copy,
with clips; `prompts/moves/RECIPES.md` chains them into short films), `core/motion/README.md`, `engine-doctrine/JUDGE.md` (scoring), `harness/README.md` (every script).
