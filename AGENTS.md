# AGENTS.md: house rules for vawe

vawe is the framework for agent-native motion graphics: one HTML page in, one film out. Write the
page in what you already know (HTML, CSS, Web Animations, SVG, canvas, three.js): you never learn a
private format, and if something you would naturally write fails, that is a framework bug to report.
This file adds only what you would get wrong on your own. One command runs everything: `bin/vawe --help`.
Start with `bin/vawe new <name> --request "<the ask>"`: it writes `films/<name>/page.html` (a valid starter)
and `brief.md`. `films/examples/colour-sting/` is a judged-PASS 5 s sting: study how it moves, then make
your own direction.

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
  (s), `data-gain` (absolute dB, replaces the voice default; leave it off), `data-fade-out`; `data-synth="pluck"` picks a short effect voice
  (`bin/vawe sound`, `bin/vawe fonts` list them; `bin/vawe sound <page> --at s | --waveform` checks the cues); `data-role="vo"` ducks a music track. No bed: sound is small effects on actions, a music track only from a file the user gives (`taste/craft/sound.md`); `data-synth="bed"` is refused.
- Every tunable number is a literal in the page (a `[[f, v]]` table, a keyframe stop, a `:root`
  custom property); the studio edits those literals in place.
- Each beat is one element with `data-world="<id>"` (lowercase, the brief's Shots ids); the checks and the judge read the worlds from it.
- Text checks skip `aria-hidden="true"` and `data-chrome` text only when it is texture by measure: cap height under 2% of the frame, the same words 3 or more times, or `data-texture="why"` (12 characters or more). Any other hidden text is checked as copy. A `data-chrome` texture keeps the 2.5% cap floor and no read hold.
- `<meta name="message">`: the one thing to remember. `<meta name="spectacle">`: the second of the
  one big moment; put quiet before it.

## The loop  `[live: harness/live/stage-say.mjs]`

Read `taste/build/DIGEST.md` first: it is the one list of taste pitfalls (every rule: `taste/README.md`). A hook names the
next command for the film you edited last.

| # | stage | the command |
|---|---|---|
| 1 | brief (facts only) | `bin/vawe new <name> --request "<the ask>" [--length s]` asks for missing facts first (write them to a file, answer with `--answers <file>`; unattended: `--defaults`), or `--from prompts/<t>.md` (`engine-doctrine/CRAFT/ROUTING.md`) |
| 2 | reference study | `bin/vawe refs list`, Read the frames at full size, then fill `brief.md` "Taken from": 4 to 6 named frame paths and what each gives. Then how they MOVE: `bin/vawe strip <ref-id> --cuts` on 2 refs, Read the strips, name 3 moves (ref id, cut second) |
| 3 | design system and kit | `films/<name>/DESIGN.md` (palette roles, type, ground and light devices, text treatment, one line per rung of the skill ladder: builder, type, colour, depth, frame) and `films/<name>/kit/` (ground layers; each moving part its own element); format and example in `vawe-page`; the builder rung builds product UI as a real interface; the frame rung rejects web-page patterns; a `Skipped <rung>` line cites a reference frame path or a SPEC.md line |
| 4 | states | one key frame per world, built from the kit: about 1 line and 2 or 3 things, a ground never flat; `bin/vawe frames <page>` |
| 5 | board | `brief.md` "Board": a plan for time, not frames. Rhythm (cuts not all equal: one under 0.4 s, one over 0.9 s), the spectacle second (= `<meta name="spectacle">`, recipe 15), a named move per cut (overlap, camera, what carries the eye, which arrivals overshoot), sound rows (effects on actions, no bed); with a music file the user gave: `vawe sound <file> --cuts <page>` gives the beat grid, the hits and each cut's frame offset |
| 6 | draft | `bin/vawe dev <page> [--from s --to s]` (half size, 30 fps, silent) |
| 7 | motion pass | clean or waived with a reason: overshoot-share, live-hold (a hold lives through an element motion, never a camera drift), constant-camera, seam-variety; `bin/vawe strip <page> --cuts`, Read every cut (for the spectacle also `vawe onion`, `vawe velocity`), fix what reads flat, one row per cut in the brief's "Motion pass" |
| 8 | critique | `bin/vawe critique <page> [--ref mp4]` in a session that did not write the page (`vawe-critique`) |
| 9 | fix | re-render only the seconds the critique named: `bin/vawe dev <page> --from s --to s` |
| 10 | final | `bin/vawe ship <page>`, then `bin/vawe ship --status <page> --wait` for the verdict; fix what the final check and the acceptance rows name on drafts; the judge is read once and never tuned to (its score is not a target); poll once per call and work on the last draft between polls |

Use `bin/vawe` before any raw `ffmpeg`, Chrome or script: run `bin/vawe <verb> --help` first. Look with `vawe see <mp4 | page | ref-id> [--vs <ref>]`, the one command that reads a film completely (shots, motion, light, type, sound, every image with its numbers; `--vs` adds deltas and advice naming the page literal), or with its parts: `vawe refs frames` (reference stills),
`vawe frames` (your page), `vawe strip` (motion through a moment or every cut, a reference or your draft), `vawe spec` (a film measured),
`vawe compare` (side by side). If a verb is missing what you need, say so in your report; do not hand-roll it.

`bin/vawe` names the next stage after each step; `ship` warns, never refuses, while the Board or Motion pass is unfilled. A page over about 25k tokens cannot be Read in one call: Read it with offset and limit.

Every verb logs to `out/<film>.runs.jsonl` (verb, stage, seconds, exit code, slot wait): set `VAWE_AGENT=<name>` (one per agent) and `VAWE_MODEL=<model>` in your shell, then `bin/vawe runs <film>` or `--all` reads the log.

A style from a reference (not a recreation): the brief names the ref and `critique`, `compare` and `judge` default to it (the line `ref: <id>` shows
which). Read the card `bin/vawe refs frames <id>` prints (cuts, flashes, luma, camera, palette), not only the top of SPEC.md, and judge the film
against the ref, not against the generic range.

Recreating a reference: `bin/vawe new <name> --ref <ref.mp4>` writes SPEC.md; mark every line KEEP
or CHANGE, rebuild, then loop `bin/vawe critique <page> --ref <ref.mp4>` until it passes
(`vawe-reference`). `ship` refuses until that loop passes.

## Shell  `[eye: 443 of 5,520 agent Bash calls failed on these]`

- The shell is zsh: quote every glob and `?`, `grep --include='*.mjs'`, `curl 'x?a=b'` (unquoted: `no matches found`).
- One file per `cat` or `head`: a hook rewrites `cat a b` and it breaks. Read the second file in a second call.
- Do not pipe `bin/vawe` into `tail`, `head` or `grep`: the pipe hides the exit code. Every verb ends with `vawe: <verb> ok|FAILED (<reason>) in <s>s`.
- A Bash call over 120 s moves to the background and keeps its render slot: run `dev` alone and strips in a second call.
- Never `sleep`: wait with `bin/vawe ship --status <page> --wait`: one call blocks until the render ends or about 9 minutes, with a progress line each minute. Run it once, never in parallel, and do the work it names before it.
- Run `git` plainly from the worktree: no `git -C`, no `$(...)`, no `for` loop around it.
- macOS has no `timeout`, and `sed -i` needs `''`: `sed -i '' 's/a/b/' f`, or use the Edit tool.

Over 60 seconds or more than one session: one chapter file per agent
(`prompts/directors-brief-long-form.md`). Skills: `vawe-brief` (no `brief.md` yet), `vawe-page` (write),
`vawe-critique` (look), `vawe-reference` (match). A PASS is never self-recorded: score with `bin/vawe judge` in a fresh session.

## Waivers  `[live: harness/media/render-page.mjs]`

A rule broken for cause is declared in the page with its reason, nowhere else. Checks advise; only determinism, banned items
and a reason that does not count refuse. One code per check, scoped to the seconds: `static-window@a-b`, `tile-run@a-b`,
`tail-tiles@a-b`, `world-held@a-b` (the old `dead-air` waives nothing). A reason names where (a world id of the page or a second)
and what was measured (a number with its unit); "intentional", "by design", "deliberate", "stylistic", "fine", "ok" and "as intended"
do not count, and nor does one reason copied to 3 or more waivers. The draft lists every refused waiver; the judge sees every waiver.
`<script type="application/json" id="authoring">{"allow": ["world-held@3.5-6.2"], "_why": {"world-held@3.5-6.2": "world s4, 2.7 s: the wordmark is the last beat and a caret ticks on it"}}</script>`

## Changing the engine, not a film  `[ref: engine-doctrine/CRAFT/ENGINE-CHANGES.md]`

Every effect composes; none is a special case. Run `bin/vawe e2e` (about 4 s) before and after.
Framework agents: the template in `engine-doctrine/CRAFT/ENGINE-CHANGES.md`. Comments hold only a fact the code cannot show.

Where to look: `engine-doctrine/CRAFT/ROUTING.md` (a template per film type), `prompts/moves/README.md` (moves to copy,
with clips; `prompts/moves/RECIPES.md` chains them), `core/motion/README.md` (springs, curves, noise),
`engine-doctrine/JUDGE.md` (scoring), `harness/README.md` (every script), `resources/README.md` (sites for sound, music, footage and fonts).
