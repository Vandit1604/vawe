---
when: before writing any layer in a scene, to load the shared contract and pick the rules the beat needs
answers: "the contract every scene obeys, plus the table of atomic rules: when to reach for each one, and what enforces it"
group: crosscutting
---
# The contract every scene obeys

Read this before writing a layer. Then load only the rule files the current beat needs, from the table
below.

1. **Deterministic.** The same JSON at the same frame renders the same pixels. No randomness that is
   not seeded, no wall-clock time.
2. **Seek-safe.** Any frame can be requested out of order. Nothing owns a clock the engine did not give
   it: no CSS `animation` or `transition`, no reliance on the browser's own timers.
3. **The engine owns the clock.** `var(--t)`/`var(--p)` are the only clocks a hand-written fragment
   gets. Motion, opacity, and filter are written by the engine every frame.
4. **Offsets, not absolutes.** A motion track's `x`/`y` move a layer BY that much, from its own base
   position. They are never a target coordinate.
5. **State the canvas.** Every scene declares `aspect`. A scene that does not renders 9:16 with no
   error.
6. **One cut family.** A film keeps one transition family for most seams, and earns 2-3 accents by
   naming what each one means.
7. **The backdrop turns.** `bg` changes tone per beat. One window for the whole runtime is a slide with
   effects on it.
8. **Something continuous crosses every cut.** One object survives a cut and changes across it, or the
   film names in a waiver what else holds it together.

Read `<film>.design.md` before you write a size, radius, shadow or colour: it is the film's own resolved
design, laid over the theme's numbers (`make design-spec D=<film>` seeds it). Reference its
`--kit-<group>-<name>` token instead of a literal; to use a new value, add it there first.

## The rules

| rule | when | holds |
|---|---|---|
| [`motion-offsets`](motion-offsets.md) | writing a motion[] keyframe track | eye |
| [`ease-direction`](ease-direction.md) | choosing an ease for an entrance, exit, or move | eye |
| [`handover-glide`](handover-glide.md) | one layer becomes another | built: `scene.js`, `junctions.js` default 0.9s |
| [`stagger-total`](stagger-total.md) | a group arrives with a stagger | warns: `make direct` |
| [`first-arrival`](first-arrival.md) | a layer's first entrance in a beat | eye |
| [`anticipate-default`](anticipate-default.md) | a directional entrance after the film's opening wave | built: `core/engine/produce.js` |
| [`speed-bands`](speed-bands.md) | choosing a duration | warns: `make direct` |
| [`video-scale`](video-scale.md) | sizing a hero graphic or type | warns: `make audit` |
| [`text-on-flat`](text-on-flat.md) | placing a headline over a background fx | gated: `make audit` |
| [`state-the-canvas`](state-the-canvas.md) | starting any scene | warns: `core/validate/validate.mjs` |
| [`svg-inline`](svg-inline.md) | writing an svg layer or a src path | eye |
| [`no-css-clock`](no-css-clock.md) | hand-writing an html layer | built: `core/layers/html.js` |
| [`one-cut-family`](one-cut-family.md) | choosing the cut between two beats | warns: `make direct` |
| [`world-turns`](world-turns.md) | authoring bg | gated: `backdrop-turn.mjs`, BLOCKS |
| [`continuous-object`](continuous-object.md) | deciding what holds the film across cuts | gated: `direction-floor.mjs`, BLOCKS |
| [`banned-defaults`](banned-defaults.md) | choosing type, colour, or layout | gated: `designspec-check.mjs` |
| [`payoff-last`](payoff-last.md) | ordering beats and the hook | eye |
| [`logo-prominence`](logo-prominence.md) | placing a brand mark | eye |
| [`paired-directional-exit`](paired-directional-exit.md) | choosing anim/out for a sliding layer | eye |
| [`readable-hold`](readable-hold.md) | a clip, card, or line of text holds still | reports: `make direct`, read gate |
| [`no-jolt`](no-jolt.md) | a layer or the camera changes speed between frames | reports: `make speed`, author-check jolt step |
| [`blur-out-dense`](blur-out-dense.md) | exiting a face, card, or dense grid | eye |
| [`caption-safe-strip`](caption-safe-strip.md) | shipping to a phone feed | gated: `make audit` |
