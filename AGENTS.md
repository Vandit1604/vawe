# AGENTS.md: house rules for vawe

vawe is the framework for agent-native motion graphics: one HTML page in, one film out. Write the
page in what you already know (HTML, CSS, Web Animations, SVG, canvas, three.js): you never learn a
private format, and if something you would naturally write fails, that is a framework bug to report.
This file adds only what you would get wrong on your own. One command runs everything: `bin/vawe --help`
(`bin/vawe <verb> --help` lists flags; a wrong flag exits 2 with the valid ones). Start with
`bin/vawe new <name> --request "<the ask>"`: it picks the template and writes `films/<name>/page.html`
(a valid starter) and `brief.md`. `films/examples/three-star/page.html` shows structure, not a look. `films/examples/colour-sting/` is a judged-PASS, owner-approved 5 s colour-led sting (brief, directions, page): study how it moves, then make your own direction.

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
- Audio is `<audio>` tags, mixed offline as written (about -20 LUFS at default gains): `src` + `data-at`
  (s), `data-gain` (dB), `data-fade-out`; `loop` is the music bed; `data-synth="pluck"` picks a voice
  from `core/audio/kit.mjs`; `data-role="vo"` ducks the bed.
- Every tunable number is a literal in the page (a `[[f, v]]` table, a keyframe stop, a `:root`
  custom property); the studio edits those literals in place.
- `<meta name="message">`: the one thing to remember. `<meta name="spectacle">`: the second of the
  one big moment; put quiet before it. One focal point per frame.

## The loop  `[live: harness/live/stage-say.mjs]`

Each command prints the taste rules for its step (`engine-doctrine/TASTE-CARD.md`, which the judge
scores against). A hook names the next command for the page film you edited last.

| # | stage | the command |
|---|---|---|
| 1 | type | `bin/vawe new <name> --request "<the ask>" [--length s]`, or `--from prompts/<t>.md` (`engine-doctrine/CRAFT/ROUTING.md`) |
| 2 | stills | three directions in `brief.md`, their key frames side by side in `directions.html`; pick one, then the five frames that define the look |
| 3 | draft | `bin/vawe dev <page> [--from s --to s]` (half size, 30 fps, silent) |
| 4 | critique | `bin/vawe critique <page> [--ref mp4]` in a session that did not write the page (`vawe-critique`) |
| 5 | fix | re-render only the seconds the critique named: `bin/vawe dev <page> --from s --to s` |
| 6 | final | `bin/vawe ship <page>`, then `bin/vawe ship --status <page> --wait` for the verdict; iterate on drafts until PASS |

Recreating a reference: `bin/vawe new <name> --ref <ref.mp4>` writes SPEC.md; mark every line KEEP
or CHANGE, rebuild, then loop `bin/vawe critique <page> --ref <ref.mp4>` until it passes
(`vawe-reference`). `ship` refuses until that loop passes.

Over 60 seconds or more than one session: one chapter file per agent
(`prompts/directors-brief-long-form.md`). Skills: `vawe-page` (write), `vawe-critique` (look),
`vawe-reference` (match). Score with `bin/vawe judge <page|mp4> --runs A,B` in a fresh session; a
PASS is never self-recorded.

## Gotchas from real runs  `[eye]`

- 4 of 8 agent films invented one brand (Vesper, a dusk sun that becomes a crescent) and all 8 had one
  glowing circle. Choose the hero from the direction, never from the card's Attractors list.
- A flat disc with no light source reads as clip art. If light is the idea, give it a source and a surface.
- Judges name template devices: light beams, lens streaks, sheen bands, accent bars, rule lines. One per film.
- The same seam move twice reads as a template, even in another direction. Change the move.
- A crossfade between two busy frames goes grey and muddy. Cut, or wipe on the motion.
- First drafts score about 6/10 on motion: one move per beat at one speed. Move with
  `core/motion/presets.js` (`enter`, `leave`, `stagger`, `layer`, `BANDS`), as the starter does.
- Agents read the card once and forget it: read the lines each command prints before the next edit.
- Also banned unless the brief asks: a centred title on a gradient, corner labels, glow on UI text,
  particles, camera shake, gradient text, fake product UI, an em dash on screen, a hook over 12 words.

## Waivers  `[live: harness/media/render-page.mjs]`

A rule broken for cause is declared in the page with its reason, nowhere else; no `_why`, no waiver.
Checks advise; only determinism and a missing reason refuse.
`<script type="application/json" id="authoring">{"allow": ["dead-air"], "_why": {"dead-air": "the held wordmark IS the last beat"}}</script>`

## Changing the engine, not a film  `[ref: engine-doctrine/CRAFT/ENGINE-CHANGES.md]`

Every effect composes; none is a special case. Run `bin/vawe e2e` (about 4 s) before and after.
Framework agents: `harness/dev/AGENT-TASK.md`. Comments hold only a fact the code cannot show.

Where to look: `prompts/README.md` (a template per film type), `prompts/moves/README.md` (moves to copy,
with clips; `prompts/moves/RECIPES.md` chains them), `core/motion/README.md` (springs, curves, noise),
`engine-doctrine/JUDGE.md` (scoring), `harness/README.md` (every script).
