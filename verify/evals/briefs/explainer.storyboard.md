---
message: "A frame in this engine is a pure function of time, so any frame renders the same whether it comes first, last, or out of order, which is the same reason the work can be split across many machines at once."
audience: "an author or engineer new to the repo who has heard 'the engine is deterministic' and wants to see what that actually buys"
arc: "hook -> rule -> proof -> mechanism -> payoff -> close"
framework: "PAS (a false assumption named, then removed, then the consequence)"
threads: "a continuous object (the t-readout) + a single running argument that never restates its own premise"
object: "a live t = 0.00s readout, mono, bottom-left, counting the film's own elapsed time"
object_t0: "small caption-sized mono readout, bottom-left, ticking quietly under the hook"
object_states: "holds still and small through the rule/proof/mechanism beats (0.00s -> 14.0s); at the payoff it starts moving inward and growing; at the close it has grown into the hero of the last line"
object_last: "large, near-center, still reading real elapsed seconds, the last thing on screen"
format: 1920x1080
theme: "themes/vawe.json"
duration: 20.0s
pace: "explainer, 3.3s per idea (six ideas across 20.0s, held: no idea gets under 2.5s)"
spectacle: "beat 5 (payoff) - the three block-tracks converging from alternating sides while the headline states the render just split across workers and lost nothing; every other beat holds one idea and one static or single-axis move"
not: "no product, no CTA, no logo, no gradient hero, no centered text, no Inter, no invented numbers"
---

<!--
  THE FLOW USED: read skills/vawe-type-explainer/SKILL.md + docs/CRAFT/HTML-FRAGMENTS.md +
  docs/CRAFT/SHOW-DONT-TELL.md + docs/RULES/INDEX.md first. Theme chosen by reading themes/vawe.json
  directly (its own `motion._exitRatio` note already says "this engine is about determinism and speed"),
  not by a render, because the note is decisive on its own: a white-first, flat-field, mono-numerals
  theme with the fastest exitRatio of the seven is the calm technical register this topic wants, and it
  is the engine's own voice rather than a borrowed one.

  This is a single film authored in one sitting by one author, not a per-scene fan-out: per
  docs/CRAFT/PER-SCENE-FANOUT.md's own "when this is overkill" section, the stagekit/contract/scenes/
  assemble chain exists to lock a shared contract BEFORE several agents write fragments in parallel.
  There is one agent and one film here, so that chain buys nothing; this storyboard supplies the same
  per-beat contract (object_in/object_out, exact copy, start/end) by hand instead, which is what the
  chain would have produced for a fan-out to read.

  Every real number named below was verified in this repo, not invented:
    - 24 layer types: core/layers/index.js `LAYER_TYPES` (REGISTRY keys), confirmed by `ls core/layers/`.
    - the `build(kit, el, L)` / `frame(kit, el, L, t)` signature: the doc comment at core/layers/index.js:1.
    - CSS `animation`/`transition`/`@keyframes` refused at boot: core/type/sanitize-html.js:114 (NO_CSS_CLOCK
      regex) and its comment at :96-98.
    - the render capture shards across worker tabs, each computing its assigned frames from time alone:
      internal/render/render.go `o.Workers`, `Capture(..., o.Workers, ...)`.
  No specific worker COUNT is claimed on screen (Makefile invocations vary: 4 in `make dev`, 2 in
  `make animatic`, 1 required for this render since a sibling agent shares the machine), so beat 5 shows
  three illustrative tracks and states the mechanism, never a specific number of workers.
-->

## Beat 1: A question (0.0s-3.0s)
- type: hook
- object_in: bottom-left@28 (t = 0.00s, ticking)
- object_out: bottom-left@28
- shot: wide, mostly empty paper field
- camera: hold
- picture: none yet; the question stands alone
- mechanism: kinetic word-split entrance on the headline only
- becomes: an empty paper field becomes a question about order
- onscreen: Render frame 240 <b>before</b> frame 1.
- why: opens the false assumption (frames must arrive in order) without stating it as fact, so the next beat can remove it
- duration: 3.0s
- transition_in: cut (film start)

## Beat 2: The rule (3.0s-6.5s)
- type: build
- object_in: bottom-left@28
- object_out: bottom-left@28
- shot: medium, left-anchored
- camera: hold
- picture: the two real function signatures from core/layers/index.js, `t` highlighted, plus six of the 24 real layer type names as chips
- mechanism: `parts`, two groups: the signature lines fade up first, the chips pop in staggered after
- becomes: the question becomes an answer: every layer type takes one input
- onscreen: Every layer type takes one input: <b>time</b>.
- why: names the actual mechanism (a pure function of `t`) before asking the viewer to believe its consequence
- duration: 3.5s
- transition_in: dissolve

## Beat 3: The proof (6.5s-10.5s): SHOW, not tell
- type: proof
- object_in: bottom-left@28
- object_out: bottom-left@28
- shot: medium, dark field so the grid reads as the subject
- camera: hold
- picture: six frame numbers, deliberately out of numeric order (512, 037, 288, 431, 104, 019), each landing in scrambled arrival order, then every one of their marker dots appearing in the same instant
- mechanism: `parts`, chips scramble in with a stagger; the six dots then pop together with near-zero stagger, so the arrival order visibly disagrees with the numeric order while the mark on every one lands at once
- becomes: an abstract claim becomes a picture: order of arrival does not change the result
- onscreen: Any order. Same pixel.
- why: this is the beat that SHOWS the idea rather than states it (docs/CRAFT/SHOW-DONT-TELL.md): a claim about order is illustrated by literally scrambling the order
- duration: 4.0s
- transition_in: dissolve

## Beat 4: The mechanism (10.5s-14.0s)
- type: build
- object_in: bottom-left@28
- object_out: bottom-left@28
- shot: medium, dark ink field (a code-editor register)
- camera: hold
- picture: a two-line code panel: `animation: fade 1s ease;` struck through, then `width: calc(var(--t) * 40px);` allowed beneath it
- mechanism: `parts`, the refused line fades up, a `widen` strike draws across it, then the allowed line rises in
- becomes: the abstract proof becomes a concrete refusal in the engine's own validator
- onscreen: So the engine refuses its own shortcut.
- why: grounds "pure function of time" in an actual rule (CSS `animation`/`transition` refused at boot) instead of leaving it as an assertion
- duration: 3.5s
- transition_in: cinematicZoom (the one accent cut, into the payoff run)

## Beat 5: The payoff (14.0s-17.5s)
- type: payoff
- object_in: bottom-left@28
- object_out: bottom-left@40 (starts moving inward and growing)
- shot: wide, the brand accent field, the loudest beat in the film
- camera: hold
- picture: three block-tracks (illustrating parallel workers) sliding in from alternating sides and landing together
- mechanism: `parts`, three `.track` groups entering from alternating directions with near-zero stagger between them
- becomes: a rule about single frames becomes a claim about the whole render: it can be split and reassembled
- onscreen: So the render splits across workers, mid-film, and nothing breaks.
- why: this is the counterintuitive fact, and it is ordered last on purpose: it only makes sense once beats 2-4 have established that no frame depends on the one before it
- duration: 3.5s
- transition_in: dissolve

## Beat 6: Close (17.5s-20.0s)
- type: close
- object_in: bottom-left@40
- object_out: center@140 (the t-readout finishes the film as the hero of the last line)
- shot: close, paper field, quiet
- camera: hold
- picture: none but the growing readout itself
- mechanism: the continuous object's motion track completes its move and scale, arriving centered and large
- becomes: an argument about machines becomes one plain fact, restated as itself
- onscreen: Same input. Same output. Every time.
- why: closes on the same object the whole film has been ticking since frame one, so the "continuous object" is not decoration, it is the proof, made literal
- duration: 2.5s
- transition_in: fade
