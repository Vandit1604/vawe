---
when: you are changing the ENGINE rather than authoring a film: the renderer, the page clock, the audio mix, a measure, the studio, a gate, or anything under core/
answers: "who owns time, audio, measurement and the studio on the page path; the five rules for a change; where a refusal belongs instead of a gate"
group: crosscutting
---

# Changing the engine

A film is one HTML page (`AGENTS.md`). This file is for the code that renders, measures and edits it.
Run `bin/vawe e2e` (about 4 s) before and after every change. Framework agents follow
`harness/dev/AGENT-TASK.md`.

## The goal every change serves

Agent experience first: an agent builds great films with what it already knows (HTML, CSS,
@keyframes, element.animate, SVG, canvas, three.js, a normal shell) and never learns a private format.
Test a change by one question: what would an agent write unprompted, and does this make that work?

- Change the environment, never forbid the habit: if an agent's natural command fails, make it work
  (tools via `bin/vawe doctor`, how agents are launched), do not add a rule or hook against it.
- Give the tool the agent reaches for: agents built their own frame compare until `vawe compare` existed.
- Measure with traces (`node harness/dev/trace-review.mjs`), not impressions: minutes, failed calls,
  input tokens. Keep tasks small; one six-step agent used 106 M input tokens, a one-step agent 3 M.
- Numbers come from code (`vawe spec`), taste from the eye (`vawe compare`, a fresh judge).

## Who owns what

| Concern | Owner | What it decides |
|---|---|---|
| Time | `harness/media/render-page.mjs`, `core/engine/page-clock.js`, `core/engine/page-seek.js` | render-page walks the frames and sets the seek; page-clock replaces `Date`, `performance.now`, `requestAnimationFrame`, timers and `Math.random` before any page script runs; page-seek pauses every animation, sets `currentTime`, calls `window.seek(t)` and sets aspect, `--vw`, `--vh` |
| Page API | `core/engine/page-api.js` | `window.vawe`, the three.js helpers a page imports |
| Audio | `harness/media/page-audio.mjs`, `core/audio/kit.mjs` | reads `<audio>` tags, mixes offline as written (`<meta name="loudness">` opts in to a target), synth voices by `data-synth`; nothing plays live |
| Reference measure | `harness/media/ref-spec.mjs` (pixels), `harness/media/render-spec.mjs` (DOM), `harness/lib/spec-deltas.mjs` (the diff) | SPEC.md, spec.json, deltas.md; `bin/vawe spec` and `critique --ref` call them |
| Views | `harness/media/see.mjs` and `harness/media/see/*.mjs`, `harness/media/see-views.mjs` | grids, probe, look, layout, word events, phone sheet, strip, loop seam |
| Checks | `quality/gates/page-check.mjs`, `anim-traps.mjs`, `judge.mjs` | advise; only determinism and a missing waiver reason refuse |
| Studio | `studio/page-server.mjs`, `studio/page-source.mjs`, `studio/ui/` | live preview; edits the literals in the page source in place; its buttons run `bin/vawe` |
| CLI | `bin/vawe`, `harness/cli/` | one verb table (`verbs.mjs`), one parser (`parse.mjs`); a script gets a verb only when a film needs it |

If a change needs a second owner for one concern (a second clock, a second mixer, a second measure),
stop: extend the owner above. Two ways to say one thing is a fork, and the fork is the bug.

## The five rules

1. **Fix it at the root, or fail there. A gate is the last resort.** A gate belongs only where the
   problem cannot be prevented at the write site without complicating the code. Ask who decided the
   behaviour and how they meant it to be turned off before you add a flag; read the whole function,
   because the opt-out is usually a guard clause above the line you found.
2. **Say what you did and what you withheld.** A part of the harness that decides, refuses or
   advises records it in `out/<film>.runs.jsonl` through `harness/lib/runlog.mjs`. The withheld half is
   usually where the bug is: a thing that never happened leaves no other trace.
3. **Sugar resolves or fails loudly.** An unknown name, a bad flag or a missing asset stops with one
   line that names the fix (`vawe: unknown flag --frm; valid: ...`), never a silent no-op or a
   fallback face.
4. **Every effect composes.** A new look combines things the engine already owns (a unit, a clock, an
   order, a property, an exit). If one half has no owner, add the owner, not the effect. A new
   primitive ships with 2+ `aka` phrases and a `blurb` naming its real default.
5. **Price a change to the capture path.** Put a before and after wall-clock draft render in the
   commit body (`bin/vawe dev` on the same page). Determinism first: the same frame is the same
   pixels in any order (`tests/media/render-page-determinism.test.mjs`).

## Engineering rules

Code the next agent can read once and change safely. The code-quality hook
(`harness/live/code-quality.mjs`) enforces the numbers on every edit; the rest is review.

- **One function, one job.** A function that decodes, measures and writes is three functions. Hook
  limits: 60 lines per function, 6 parameters, depth 4; a file over about 400 lines is split by concern.
- **A pure core, I/O at the edges.** Measuring, fitting and scoring are pure functions of their inputs;
  the browser, ffmpeg, tesseract and the file system are called from a thin outer layer. A library
  function throws; only a CLI `main()` prints and exits.
- **Deterministic.** Same input, same output: no wall clock, no unseeded random, no dependence on
  file order. A number a film depends on comes from code, never from a model's estimate.
- **Loosely coupled, plugin-like.** A new check, measure, verb or film type is a new file in its
  folder, found by name (`quality/gates/`, `prompts/`); editing a central list is the exception. A
  library never imports a gate or a CLI; there are no import cycles.
- **No hidden state.** No mutable module-level variables when a return value can carry the state.
- **One way to say one thing.** Reuse `harness/cli/parse.mjs`, one `die`, one launch-flag list
  (`PAGE_ARGS`). A second copy is a fork, and forks drift.
- **Comments only for facts the code cannot show:** a limit, a measured number, an outside quirk.

## A bug is closed when a check catches it

The check is the record, not a log entry. Close a bug with a check that catches it (a render
invariant, a never-silent error, a page-check rule, a `vawe.assert`). A bug with no check is still
open, because the next agent will meet it again.

## Adding a check

Prefer a refusal at the source (the renderer, the parser) over a gate. When a gate is right:

- Name what you measured, where (the second, the element), and the one next command.
- Adapt instead of block: read the film's context and clamp, tolerate or reclassify. Hard refusals
  are for determinism, a missing waiver reason and data loss.
- Put it in `quality/gates/<name>.mjs`: `bin/vawe check <name>` finds it by file name (`harness/lib/check-gate.mjs`).
- Test it end to end: write down every way it can fail, then `bin/vawe e2e`. A unit test only for
  what a render cannot show.

## Adding a verb

A verb is one entry in `harness/cli/verbs.mjs`: a name, a one-line summary, its flags with type and
default, one example, the steps it runs and the one next command. Keep the parser strict: an unknown
flag exits 2 and names the valid ones. Do not add a verb for a tool a film does not need; run that
tool with `node <path>` and list it in `harness/README.md`.

## After a render

Classify every friction point as an engine bug, a gate gap or an authoring choice. Fix the engine ones
with a check that catches them. Measurements outrank doctrine: change or remove a rule when data shows it helps films.
