---
approved: 2026-09-10
message: "This engine has a verb for every move you want, and here are nine of them in twelve seconds."
audience: "Someone who has seen our films look like slide decks and does not believe the engine can do more."
arc: "one continuous action: a cursor works its way down a list of verbs, and each verb is performed on the word that names it, in one unbroken frame"
threads: "a transforming object (the word being worked on) + a bookend (the counter that starts the film finishes it)"
object: "the word under the cursor"
object_t0: "a counter, alone, counting itself down"
object_states: "typed, blurred, trailed, spun, stacked, blown up to fill the frame"
object_last: "the counter again, holding the number of frames it took"
format: 1920x1080
theme: "themes/vawe.json"
duration: 12s
spectacle: "beat 7 (blow it up) · one word at 900px, larger than the frame, motion blurred as it arrives · the film's one loud moment"
not: "no centered slide deck, no second typeface, no stock photography, no gradient hero, no beat that shows a claim instead of performing it"
craft:
    captions: "No captions. Every word on screen IS the label for what is happening to it, so a caption would say the same thing twice."
    color: "Two grounds off the vawe theme, paper and ink, flipped once at the loud beat and flipped back. One cobalt accent, on the cursor chrome only, so the blue always means the cursor is holding something."
    density: "MEASURED against refs/mo1 at 10fps, not guessed from a contact sheet. That film runs a mean luma delta of 5.4, 12.0, 18.3 and 6.9 across its four shots; our best film to date measures 0.85 on the same statistic, so the gap is six to twenty times, not a matter of one more effect. It reaches that by BUILDING rather than stating: its echo stack grows copy by copy, then rotates in 3D and motion-blurs into a cylinder before resolving. Density here is front-loaded the same way, and the last two seconds are allowed to hold."
    direction: "The restraint is one typeface, one scale language, one cursor. The spectacle earns it by being the only moment the word outgrows the frame and the ground flips under it. The reference cuts four times in nine seconds (26.7 per minute, median shot 1.99s), so cutting is not the enemy: cutting with nothing carried across it is. Every cut here has the cursor on both sides of it."
    film-structure: "The cursor holds the film. It is on screen from beat 2 to the last frame and every move happens where it is."
    fragment-exemplars: "No hand-written fragments. Every beat is engine vocabulary (typing, ghost, rotX, parts, count) so the film is a demonstration of the arsenal rather than of my CSS."
    html-fragments: "None used. If a beat needed markup it would be the wrong beat for this film."
    layout: "One baseline, left of centre, held for the whole film. Every verb happens on that line, so the eye never re-finds the subject."
    motion-craft: "Hand-keyed, and every verb BUILDS rather than appears. Read off the reference at 10fps: its stack does not cut to eight copies, it grows to eight and then the whole stack turns and smears. The blur is a fast move with ghost trailing it, the spin turns on rotY through zero, the blow-up decelerates into its size. No preset fires once and stops."
    show-dont-tell: "Every beat performs its own verb on its own name. The word `blur it` is what gets blurred. A beat that only set type would be the failure this film exists to answer."
    sound: "Silence is the decision. Nine verbs in twelve seconds is already a lot to read, and a bed would compete with the cursor for attention."
    typography: "One face, the vawe theme's sans, at display weight throughout. Size is the only variable and it carries the spectacle: 170px baseline, 900px once."
---

<!-- DENSITY IS THE POINT, AND IT IS MEASURED. refs/mo1/make-it-move.mp4 read at 10fps with
     `make study ... STRIPS=3 STRIPFPS=10`, not eyeballed off a contact sheet. Two earlier readings of
     the same film were wrong: at 1fps it appeared never to change composition, at 2fps it plainly
     flipped its ground. Only the dense read shows what it actually does.

     MEASURED: 8.98s, 4 shots, median shot 1.99s, 26.7 cuts per minute, mean luma delta per shot of
     5.39 / 12.03 / 18.28 / 6.92. Our best film to date (one-word.json) measures 0.85 on the same
     statistic. The gap is six to twenty times.

     WHAT THE DENSE READ CHANGED, and each of these corrected a wrong plan:
       - the echo stack is a BUILD, not a state. It grows copy by copy, then the whole stack rotates
         in 3D and motion-blurs into a cylinder before resolving to the next phrase.
       - the closing phrase is ASSEMBLED WORD BY WORD, four separate cursor grabs, each word in its
         own selection box. Read at 2fps it looked like one phrase with one box on it.
       - it CUTS, four times in nine seconds. Cutting is not the slideshow; cutting with nothing
         carried across the cut is. A first draft of this film planned zero cuts on the wrong theory.
       - density is FRONT-LOADED. Its last eleven frames are nearly still, so a film may earn a hold
         at the end without being a slide deck.

     Our first attempt at this grammar (one-word.json) got the composition right and the density
     wrong: one word doing one thing for twelve seconds. This is the same grammar at the measured rate. -->

## Beat 1: Count in (0s-1.3s)
- type: hook
- object: a counter, alone, counting itself down
- onscreen: "3 2 1"
- trigger: the film opens on a clock, so everything after it is on the clock
- mechanism: a `count` layer running 3 to 1, no cut
- becomes: the bare stage becomes "a counter, alone, counting itself down"
- why: open loop, and it sets the rate the rest of the film has to keep
- duration: 1.30s

## Beat 2: Type it (1.3s-2.6s)
- type: product_surface
- object: typed character by character with a caret
- onscreen: "type it"
- trigger: the count reaches one
- mechanism: a `typing` layer, chars per second, blinking caret, no cut
- becomes: "a counter, alone, counting itself down" becomes "typed character by character with a caret"
- why: the first verb performs itself on its own name, which is the rule for every beat after it
- duration: 1.30s

## Beat 3: Blur it (2.6s-3.9s)
- type: product_surface
- object: thrown across the baseline fast enough to smear
- onscreen: "blur it"
- trigger: the typing finishes and the cursor shoves the word
- mechanism: a hand-keyed motion track at speed with `ghost` trailing it, no cut
- becomes: "typed character by character with a caret" becomes "thrown across the baseline fast enough to smear"
- why: speed is the thing being shown, and a trail is the only way a still frame proves speed
- duration: 1.30s

## Beat 4: Spin it (3.9s-5.2s)
- type: product_surface
- object: turned through its own vertical axis
- onscreen: "spin it"
- trigger: the smear lands and the cursor grabs its edge
- mechanism: `rotY` keys through zero on the POSE table, no cut
- becomes: "thrown across the baseline fast enough to smear" becomes "turned through its own vertical axis"
- why: the frame is flat until something turns in it, and one turn is enough to say the space is real
- duration: 1.30s

## Beat 5: Stack it (5.2s-6.5s)
- type: product_surface
- object: repeated down the frame, each copy later and fainter
- onscreen: "stack it"
- trigger: the spin overshoots and leaves copies behind it
- mechanism: `parts` on a selector, staggered by `each`, with opacity falling off down the stack, no cut
- becomes: "turned through its own vertical axis" becomes "repeated down the frame, each copy later and fainter"
- why: a stagger is the cheapest density in the engine and nothing in our library uses it
- duration: 1.30s

## Beat 6: Grab it (6.5s-7.8s)
- type: product_surface
- object: held in a tight cobalt box, dragged off the baseline and back
- onscreen: "grab it"
- trigger: the stack collapses to one copy and the cursor closes on it
- mechanism: a `rect` with `follow` pinned to the word's live box, dragged by the cursor path, no cut
- becomes: "repeated down the frame, each copy later and fainter" becomes "held in a tight cobalt box, dragged off the baseline and back"
- why: the box is never placed, it reads the word's own box every frame, so it cannot drift
- duration: 1.30s

## Beat 7: Blow it up (7.8s-9.1s)
- type: payoff_withheld
- object: at 900px, wider than the frame, the ground flipped to ink under it
- onscreen: "blow it up"
- trigger: the drag releases and the word keeps going
- mechanism: a size key decelerating into 900px with `ghost` on the arrival, the ground flipping to ink on the same frame, no cut
- becomes: "held in a tight cobalt box, dragged off the baseline and back" becomes "at 900px, wider than the frame, the ground flipped to ink under it"
- why: the spectacle, and the only moment the film raises its voice
- duration: 1.30s

## Beat 8: Put it back (9.1s-10.4s)
- type: product_surface
- object: back to 170px on the baseline, the ground back to paper
- onscreen: "put it back"
- trigger: the shout runs out of air
- mechanism: the same size key run backwards with a settle, the ground flipping back on the same frame, no cut
- becomes: "at 900px, wider than the frame, the ground flipped to ink under it" becomes "back to 170px on the baseline, the ground back to paper"
- why: the loud beat has to cost something, and what it costs is the return
- duration: 1.30s

## Beat 9: Count out (10.4s-12s)
- type: payoff_withheld
- object: the counter again, holding the number of frames it took
- onscreen: "720 frames"
- trigger: the word is back where it started, so the clock that opened the film can close it
- mechanism: a `count` layer landing on 720 and holding, no cut
- becomes: "back to 170px on the baseline, the ground back to paper" becomes "the counter again, holding the number of frames it took"
- why: the bookend. 720 is the true frame count of this film at 60fps, so the last thing on screen is a fact the render itself proves
- duration: 1.60s
