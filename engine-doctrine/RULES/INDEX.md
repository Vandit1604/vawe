---
when: before writing a page, to load the shared contract and pick the rules the beat needs
answers: "the contract every page obeys, plus the table of atomic rules: when to reach for each one, and what enforces it"
group: crosscutting
---
# The contract every page obeys

Read this before writing a page. Then load only the rule files the current beat needs, from the table
below. The page contract itself (seek, clock, aspect) is in `AGENTS.md`.

1. **Deterministic.** The same page at the same frame renders the same pixels. No randomness that is
   not seeded, no wall-clock time.
2. **Seek-safe.** Any frame can be requested out of order. CSS `@keyframes`, `element.animate()` and
   `window.seek(t)` are all fine: the renderer sets the time. Timers and the wall clock are not.
3. **One cut family.** A film keeps one transition family for most seams, and earns 2-3 accents by
   naming what each one means.
4. **The backdrop turns.** The background changes tone per beat. One backdrop for the whole runtime
   is a slide with effects on it.
5. **Something continuous crosses every cut.** One object survives a cut and changes across it, or the
   film names what else holds it together.

## The rules

| rule | when | holds |
|---|---|---|
| [`ease-direction`](ease-direction.md) | choosing an ease for an entrance, exit, or move | eye |
| [`stagger-total`](stagger-total.md) | a group arrives with a stagger | eye |
| [`first-arrival`](first-arrival.md) | a layer's first entrance in a beat | eye |
| [`speed-bands`](speed-bands.md) | choosing a duration | eye |
| [`video-scale`](video-scale.md) | sizing a hero graphic or type | eye |
| [`text-on-flat`](text-on-flat.md) | placing a headline over a background fx | reports: `bin/vawe check page-check` |
| [`one-cut-family`](one-cut-family.md) | choosing the cut between two beats | eye |
| [`world-turns`](world-turns.md) | authoring the background | eye |
| [`continuous-object`](continuous-object.md) | deciding what holds the film across cuts | eye |
| [`banned-defaults`](banned-defaults.md) | choosing type, colour, or layout | eye, in the critique |
| [`payoff-last`](payoff-last.md) | ordering beats and the hook | eye |
| [`logo-prominence`](logo-prominence.md) | placing a brand mark | eye |
| [`paired-directional-exit`](paired-directional-exit.md) | choosing the exit for a sliding layer | eye |
| [`readable-hold`](readable-hold.md) | a clip, card, or line of text holds still | reports: `bin/vawe check page-check` |
| [`no-jolt`](no-jolt.md) | a layer or the camera changes speed between frames | reports: `bin/vawe check page-check` |
| [`blur-out-dense`](blur-out-dense.md) | exiting a face, card, or dense grid | eye |

The phone-feed safe strips for captions are in `engine-doctrine/CRAFT/CAPTIONS.md`.
