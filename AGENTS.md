# AGENTS.md: house rules for vawe

vawe is the framework for agent-native motion graphics: one HTML page in, one film out. Write the
page in what you already know (HTML, CSS, Web Animations, SVG, canvas, three.js). This file adds only
what you would get wrong on your own.

## The page contract  `[live: harness/media/render-page.mjs]`

- A film is `films/<name>/page.html` plus its own assets folder, relative paths only.
- `<meta name="duration" content="12.4">` in seconds. Optional `<meta name="fps">` is your frame-table
  rate; the render rate is separate (60 final, 30 draft) and frames are fractional.
- Time is the seek, never the clock: CSS `@keyframes` / `element.animate()` (the renderer sets
  `currentTime`), or `window.seek(t)` in seconds painting frame t as a pure function, or both.
  No timers, no state between frames, no unseeded random: a virtual clock
  (`core/engine/page-clock.js`) owns `Date`, `requestAnimationFrame`, timers and `Math.random`.
- Aspect: `<html data-aspect="16:9">`, `--vw`/`--vh` on `:root` and `window.vawe` are set before your
  scripts run. Lay out with CSS for `16:9 9:16 1:1 4:5 4:3`. Never crop.
- Audio is `<audio>` tags, never played live, mixed offline to -14 LUFS: `src` + `data-at` (s),
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

| # | stage | the command |
|---|---|---|
| 1 | type | `engine-doctrine/CRAFT/ROUTING.md` names the `prompts/` template; copy it, fill its inputs |
| 2 | stills | the five frames that define the look, before any motion |
| 3 | draft | `make dev PAGE=films/<name>/page.html [FROM= TO=]` (half size, 30 fps, silent) |
| 4 | critique | `make critique PAGE= [REF=]` in a session that did not write the page (`vawe-critique`) |
| 5 | fix | re-render only the seconds the critique named: `make dev PAGE= FROM= TO=` |
| 6 | final | `make ship PAGE= [ASPECT=all]` (60 fps, blur, audio) |

Recreating a reference: `make dev-tool X=new TYPE=recreation NAME= REF=` starts it, `make spec REF=`
writes SPEC.md, mark every line KEEP or CHANGE, rebuild, then loop `make next PAGE= REF=` until it
passes (`vawe-reference`); never `make ship` before that loop passes.

Over 60 seconds or more than one session: one guide read first, one chapter file per agent
(`prompts/directors-brief-long-form.md`). Skills: `vawe-page` (write), `vawe-critique` (look),
`vawe-reference` (match), `vawe-audit` (compose the verdict from two judge runs).

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

You will reach for each of these; do the other thing (`engine-doctrine/RULES/banned-defaults.md`).

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

```html
<script type="application/json" id="authoring">
  {"allow": ["dead-air"], "_why": {"dead-air": "the held wordmark IS the last beat"}}
</script>
```

## Changing the engine, not a film  `[live: harness/live/craft-live.mjs]`

Every effect composes; none is a special case: a new look combines things the engine already owns,
never a private code path. A new primitive ships with 2+ `aka` phrases and a `blurb`
(`make check GATE=word-action`). Rules: `engine-doctrine/CRAFT/ENGINE-CHANGES.md`.

## Testing: end to end first  `[ref: make e2e]`

List every way it can fail, then `make e2e` (report in `quality/runs/e2e/<timestamp>/`). A unit test
only for what a render cannot show. Push: `make dev-tool X=verify-batch`, then `git push`.

## Comments  `[eye]`

Only a fact the code cannot show: a contract (units, ranges, side effects), a measured number with
its source, an outside quirk, or a guard that looks safe to delete. Never history or restatement.
A stale comment is a bug.

## Where to look  `[ref: make help]`

`prompts/README.md` (a template per film type), `core/motion/README.md`, `make help`,
`engine-doctrine/JUDGE.md` (how a film is scored).
