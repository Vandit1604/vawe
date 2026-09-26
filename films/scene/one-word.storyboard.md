---
approved: 2026-09-10
message: "The same file renders the same pixels, every time, and you can watch it happen to one word."
audience: "Engineers who have been burned by a render that came back different the second time."
arc: "one continuous action: one word sits on one stage, a cursor grabs and throws it, and it lands back in the exact frame it started in"
threads: "a transforming object (the word) + a bookend (the word's first pose is its last pose, and that IS the claim)"
object: "the word on the stage"
object_t0: "set huge and still, a cursor approaching from off frame"
object_states: "seized by the cursor, a tight selection box around it, thrown across the stage"
object_last: "released, and it settles into exactly the frame it opened in"
format: 1920x1080
theme: "themes/vawe.json"
duration: 12s
spectacle: "beat 7 (prove) · the word lands back on its opening pose and a second copy of the frame drops on top of it, pixel for pixel · the film's one loud moment"
not: "no centered slide deck, no new composition per beat, no gradient hero, no stock photography, no second typeface, no cut to a different ground"
craft:
    captions: "No captions. This film has three words of on-screen copy and no narration, so a caption track would restate what the frame already says."
    color: "Two values off the vawe theme and nothing else: the paper ground and the ink. One cobalt accent, used on the selection box only, so the blue always means the cursor is holding something."
    density: "Deliberately thin. The hero is one word at display size; the support is the selection chrome; the metadata is a single frame counter. Density here would fight the claim, which is that one thing is exactly reproducible."
    direction: "The restraint is that the composition never changes: one ground, one word, one scale, for twelve seconds. The spectacle earns it by being the only moment two frames occupy the stage at once."
    film-structure: "The word holds the film. It is on screen from the first frame to the last and never leaves, so there is nothing to cut away to."
    fragment-exemplars: "One fragment for the whole film. It refuses a second composition, a second face, and any ground change."
    html-fragments: "The word and the selection chrome are markup; every move comes from the engine's motion track and the cursor's path, never a CSS animation or transition."
    layout: "Asymmetric: the word sits left of centre and low, so the throw has somewhere to go and the return is legible as a return."
    motion-craft: "Hand-keyed. The throw carries real physics: it overshoots, settles, and the settle is what sells the landing. No named preset fires once and stops."
    sound: "Silence is the decision. The claim is about pixels being identical, and a sound bed would give the eye something else to attend to at the exact moment the two frames overlap."
    typography: "One face, the vawe theme's own sans, at display weight. One size for the word from the first frame to the last, because a scale change would break the claim that the last pose equals the first."
---

<!-- ONE COMPOSITION, twelve seconds. Studied off refs/mo1/make-it-move.mp4: a single ground, a single
     heavy face at display scale, one accent, and editor chrome (a cursor, a selection box) giving every
     move a visible CAUSE. That film never changes composition; the words move inside it. This one does
     the same with a single word, and spends the difference on a claim that is true and checkable:
     `make check GATE=probe` proves renderFrame(n) is pure, so the closing frame really is the opening frame. -->

## Beat 1: Land (0s-1.4s)
- type: hook
- object: set huge and still, alone on the stage
- onscreen: "deterministic"
- trigger: the film opens, so the word arrives before anything can question it
- mechanism: hand-keyed motion track, no cut, the word settles onto its pose and stops dead
- becomes: the bare stage becomes "set huge and still, alone on the stage"
- why: open loop, the word claims something the film has not yet earned
- duration: 1.40s

## Beat 2: Approach (1.4s-2.9s)
- type: product_surface
- object: still set huge, a cursor now travelling toward it
- onscreen: "deterministic"
- trigger: a claim sitting unchallenged invites somebody to test it
- mechanism: hand-keyed motion track, no cut, only the cursor moves and the word holds
- becomes: "set huge and still, alone on the stage" becomes "still set huge, a cursor now travelling toward it"
- why: the cause of every later move arrives on screen before the moves do
- duration: 1.50s

## Beat 3: Seize (2.9s-4.3s)
- type: product_surface
- object: held by the cursor, a tight cobalt selection box snapped around it
- onscreen: "grab it"
- trigger: the cursor reaches the word
- mechanism: hand-keyed motion track, no cut, the selection box follows the word's own box rather than being placed
- becomes: "still set huge, a cursor now travelling toward it" becomes "held by the cursor, a tight cobalt selection box snapped around it"
- why: the blue means the cursor is holding something, and it will mean only that for the rest of the film
- duration: 1.40s

## Beat 4: Throw (4.3s-5.8s)
- type: product_surface
- object: flung across the stage, the box stretching with it
- onscreen: "throw it"
- trigger: the grab, released with speed
- mechanism: hand-keyed motion track, no cut, real physics on the throw, the box lagging a frame behind the word
- becomes: "held by the cursor, a tight cobalt selection box snapped around it" becomes "flung across the stage, the box stretching with it"
- why: the one violent move in a film about nothing changing
- duration: 1.50s

## Beat 5: Overshoot (5.8s-7.2s)
- type: product_surface
- object: past its origin, turning back
- onscreen: "throw it"
- trigger: the throw carries further than the stage allows
- mechanism: hand-keyed motion track, no cut, the turn happens at the key rather than at the edge
- becomes: "flung across the stage, the box stretching with it" becomes "past its origin, turning back"
- why: the overshoot is what makes the settle read as physics instead of a snap
- duration: 1.40s

## Beat 6: Settle (7.2s-8.6s)
- type: product_surface
- object: landing back on its opening pose, the box releasing
- onscreen: "let go"
- trigger: the turn runs out of energy
- mechanism: hand-keyed motion track, no cut, the settle decelerates onto the exact opening coordinates
- becomes: "past its origin, turning back" becomes "landing back on its opening pose, the box releasing"
- why: the audience should suspect it landed in the same place before the film says so
- duration: 1.40s

## Beat 7: Prove (8.6s-10.1s)
- type: payoff_withheld
- object: the opening frame dropped on top of it at full opacity
- onscreen: "same pixels"
- trigger: the landing looks identical, and a claim that looks true has to be shown true
- mechanism: hand-keyed motion track, no cut, a second render of frame 0 arrives over the settled word and nothing beneath it shifts
- becomes: "landing back on its opening pose, the box releasing" becomes "the opening frame dropped on top of it at full opacity"
- why: the throw had a consequence and the consequence is that nothing changed. Shown, not stated
- duration: 1.50s

## Beat 8: Rest (10.1s-12s)
- type: payoff_withheld
- object: two frames resolved into one, no seam anywhere on the stage
- onscreen: "same pixels"
- trigger: the dropped frame finds no edge to disagree with
- mechanism: hand-keyed motion track, no cut, the top frame's opacity is already full so the only change is the selection chrome leaving
- becomes: "the opening frame dropped on top of it at full opacity" becomes "two frames resolved into one, no seam anywhere on the stage"
- why: the last thing on screen is the word alone again, which is where it started, and that is the film
- duration: 1.90s
