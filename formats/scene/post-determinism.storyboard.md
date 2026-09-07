---
message: "A frame in this engine is a pure function of time, so a render can split across many machines and still be one exact film."
audience: "developers curious how this engine (or any deterministic renderer) actually works; no product, no CTA"
arc: "hook -> rule -> show(order) -> refusal -> show(parallel) -> show(proof) -> payoff"
format: 1920x1080
theme: "themes/vawe.json"
duration: 43s
threads: "a continuous accent mark: a tiny corner tick at the hook, walking corner to corner as the film moves through its beats, landing centre and growing large only at the proof beat, then holding as the backdrop the payoff line sits on. The bookend: the hook asks whether frame 900 can be drawn before frame 1; the payoff answers it."
spectacle: "beat 6 (the proof) - two renders of the same scene, two file sizes, landing on the same digit at the same instant. The one loud moment; everything else stays quiet."
not: "no product, no CTA, no gradient hero, no Inter, no centered slide-deck layout, no stock icons"
craft:
    captions: "silent-safe copy, no captions needed for web; destination is not a phone feed"
    color: "vawe's own white-first cobalt tokens only (--accent, --ink, --dim, --up/--down), no invented colour"
    density: "every build/show beat carries eyebrow + headline + one real artifact (code line, tile grid, file card), never a bare line of type"
    direction: "one loud beat (the proof); every other beat holds a single idea and lets it sit"
    html-fragments: "every fragment moves through `parts` + var(--t)/var(--p), no CSS transition/animation"
    layout: "off-centre stage column (x:160), asymmetric weight, no centered deck"
    motion-craft: "the accent mark is a hand-keyed motion track across all 7 beats, not a preset"
    show-dont-tell: "3 of 7 beats show an artifact instead of stating a claim: the order-test tiles, the worker split, the byte-identical file cards"
    sound: "audio.auto:true, cues fall on the beat joints automatically from the transitions"
    transitions: "dissolve for the calm build beats, a harder cut into the proof beat since it is the spectacle"
    typography: "vawe theme's own mono for eyebrows/code, sans for headlines; no swapped face"
---

<!-- Hand-authored via the per-scene fan-out chain: make stagekit, this storyboard's contract,
     make scenes (briefs), fragments written + previewed, make assemble. -->

## Beat 1: The question (0s-5.5s)
- type: hook
- onscreen: "A QUESTION" / "Could you draw frame 900 before frame 1, and get the right picture?"
- mechanism: kinetic word-wipe headline over a bare stage
- becomes: silence becomes a question
- object_in: bottom-left@14x14
- object_out: bottom-left@14x14
- why: open the loop the payoff answers; no claim yet, just the puzzle
- duration: 5.5s

## Beat 2: The rule (5.5s-11.5s)
- type: build
- onscreen: "THE RULE" / "Every layer reads one input: <b>t</b>, the current time." / "frame(kit, el, layer, t)"
- mechanism: real code line from core/layers/count.js's own signature, set as a card
- becomes: the question becomes a mechanism
- object_in: bottom-left@14x14
- object_out: bottom-right@14x14
- why: name the thing that makes the rest possible before showing its consequence
- duration: 6s

## Beat 3: Show, the order test (11.5s-18s)
- type: show
- onscreen: "THE TEST" / "Draw them in this order: 900, 037, 512, 148." / "Same four pixels either way."
- mechanism: a numbered-tile grid that shuffles into place, each tile settling on the identical mark
- becomes: an order becomes irrelevant
- object_in: bottom-right@14x14
- object_out: top-right@14x14
- why: SHOW the pure-function claim instead of stating it; the tiles converge regardless of draw order
- duration: 6.5s

## Beat 4: The refusal (18s-24s)
- type: build
- onscreen: "THE REFUSAL" / "So the engine kills its own shortcut." / "transition: none !important;"
- mechanism: a struck-out CSS line (a wall-clock animation) beside the line that replaces it (a `--t`-driven calc)
- becomes: a convenience becomes a liability, and gets refused
- object_in: top-right@14x14
- object_out: top-left@14x14
- why: the purity in beat 2 is not a happy accident, it is enforced against the one thing that would break it
- duration: 6s

## Beat 5: Show, the split (24s-30.5s)
- type: show
- onscreen: "THE SPLIT" / "So four machines can draw one film at once." / "Each one owns a slice of the clock."
- mechanism: four worker lanes, each capturing a different frame range, sliding into one continuous filmstrip
- becomes: one clock becomes four workers and back into one film
- object_in: top-left@14x14
- object_out: center@14x14
- why: SHOW the payoff mechanism (parallel capture) as a real diagram, not a claim
- duration: 6.5s

## Beat 6: Show, the proof (30.5s-37s)
- type: show
- onscreen: "THE PROOF" / "Render it twice." / "2,892,399 bytes. 2,892,399 bytes." / "Not close. Identical."
- mechanism: two file cards, each counting up to the same byte figure, landing together on a checkmark
- becomes: a claim becomes a measured fact
- object_in: center@14x14
- object_out: center@900x420
- why: the spectacle beat, the one loud moment; a verified real number, not an invented one
- duration: 6.5s

## Beat 7: The payoff (37s-43s)
- type: payoff
- onscreen: "So frame 900 owes nothing to frame 1." / "Which is the only reason a film can render in pieces and still be one film."
- mechanism: the grown accent panel from beat 6 becomes the backdrop the closing line sits on
- becomes: the mechanism becomes the reason the whole engine can be fast
- object_in: center@900x420
- object_out: center@900x420
- why: land the answer to beat 1's open loop last, on the most counterintuitive framing (splitting loses nothing)
- duration: 6s
