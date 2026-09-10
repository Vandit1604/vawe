---
message: "vawe lives in your terminal: type a request, and it renders itself."
audience: "Founders and designers who need a launch film and have no motion designer."
reference: "example-madera"
arc: "one unbroken move through the product: a request is typed in a terminal, the terminal's own ground carries the camera into the timeline it assembles, real films play as the ground takes each one's colour, and the mark forms out of the last line drawn. Nothing cuts. Every change leaves on the axis the next thing arrives on."
attention: "the eye follows the camera into the terminal, then the cursor and caret that cause every word and every click, then the colour that re-tints the ground as each film plays, and rests only once, on the drawn line that grows into the wordmark."
threads: "a cursor and a caret that cause every change + one exit axis per act (x for the terminal/timeline/films chain, y only for the final rise into the mark) + a ground that takes its colour from whatever is on screen"
format: 1920x1080
theme: "themes/vawe.json"
duration: 13.03s
spectacle: "beat 6 (Your films) · the ground re-tints to each playing film's own colour as the ring browses, live footage not stills · the film's one loud moment"
not: "no hard cut anywhere, no centred slide deck, no gradient hero, no stock photography, no copy vawe cannot back, no second typeface, no sound bed, no swipe-to-pick moment standing beside Your films (folded into beat 6, see its note)"
craft:
    captions: "No captions. The only words are a typed request, timeline clip labels, film captions and the vawe wordmark, each on screen long enough to read."
    color: "A dark terminal ground (the theme's own ink, not a foreign black) that crossfades to the theme's white-first ground once the timeline appears, then re-tints to each film's own colour as Your films browses, then settles back to white-first for the mark. Ink for type, cobalt for the cursor's actions and the per-word colour flash while typing."
    density: "A change every half second or less, studied frame by frame off example-madera at 60fps. Each beat carries a camera move, an entrance, an action and an exit, same as the reference."
    direction: "The restraint is that nothing ever cuts and the camera never stops. The spectacle earns it by being the one place the ground itself changes colour more than once, driven by real content, not a flat brand wash."
    film-structure: "A cursor and a typing caret hold the film and cause each change. Beats join by a fast exit on one axis with motion blur, the next arrival on the same axis, and a frame of empty ground between (example-madera's flow-seam), except the final rise into the mark, which changes axis the way the reference's own closing beat does."
    fragment-exemplars: "vawe-flow-2.terminal.html (beats 1-3, an editor-kind screen), vawe-flow-2.timeline.html (beats 4-5, a dashboard-kind screen), vawe-flow-2.films.html (beat 6, a grid-kind screen). The logo beat (7) is vector mark layers, not an HTML fragment mock."
    html-fragments: "Every move comes from the engine: keyframe tracks for position, rotation and blur, `typing`+`vars` for the per-word colour flash, `parts`/`drawOn` for the logo's line. No CSS animation or transition."
    layout: "Asymmetric while things move: the terminal sits tilted and low at first, widening as the camera travels; the timeline builds from the left edge; the films ring holds full width; the mark alone is centred at the end."
    motion-craft: "Hand-keyed with real deceleration: arrivals ease out, exits accelerate past 480 px/s so the automatic motion blur smears them, and the camera drifts or dollies continuously underneath, never resetting mid-beat."
    show-dont-tell: "The claim that vawe renders what you write is shown as a request typed in a real terminal, then its own timeline assembling, then real films it produced playing. The determinism claim is not restated in this cut; it is carried entirely by the timeline and films acts."
    sound: "Silence is the decision, as in the reference. The film is carried entirely by motion and colour."
    typography: "One face, the vawe theme's sans, plus its monospace variant (italic for command words) inside the terminal. Interface type at UI size inside the windows, the wordmark at its own weight. Size is the only variable."
---

<!-- PLANNED from a studied reference, not from memory: refs/example-madera/pages/ (all 782 frames at
     60fps, 689 of them unique, page-by-page in refs/example-madera/pages.md) and grammar/example-madera.json's
     per-shot onScreen/moves/trigger. example-madera never cuts: each act leaves fast on one axis with
     motion blur and the next arrives on the same axis, the ground crossfades and takes its colour from
     the content, the camera never stops. This film keeps that grammar and tells vawe's own terminal
     story with vawe's own material. No reference content is used. -->

## Beat 1: Terminal, wide (0s-2.2s)
- type: hook
- shot: wide, settling to medium, subject centred
- onscreen: "a macOS terminal window (traffic-light dots, centred title, a left column of timestamps beside prior command lines: an italic monospace command word, then a softly rounded output panel, one success green, one error red)"
- trigger: the film opens on the product, already showing real prior work, so it arrives already in motion
- mechanism: the camera opens WIDE on the whole terminal ("show it all") then a slow continuous dolly travels down toward where the prompt bar will be, tightening the frame the whole beat
- eye: the whole terminal window, shown wide -> the camera dollies down and tightens the frame -> where the prompt bar will be
- becomes: the bare ink ground becomes a wide terminal window, then a closer one framing the space the prompt bar will fill
- why: open on the thing itself, shown whole, so the eye already knows what kind of software this is before the camera decides where to look
- duration: 2.20s
- recipe: window-dolly from=0 to=2.2 target=terminal
- object_in: center@1920x1080
- object_out: center@640x160
- motion: [data-part="sidebar-row"]@fadeUp:energy
- archetype: full-bleed-row
- weight: strong
- borrows: "example-madera's window-focus-rack -> vawe-flow-2's terminal wide-to-prompt travel"
- picture: the terminal window itself: real prior commands, real success/error output panels, an empty prompt bar waiting at the bottom
- design: make screen F=formats/scene/vawe-flow-2.terminal.html KIND=editor REF=example-madera ACT=1

## Beat 2: Typed prompt (2.2s-3.6s)
- type: product_surface
- shot: close on the prompt bar, lower third
- onscreen: "make a 12 second launch film"
- trigger: the camera arrives at the prompt bar, so the caret is free to start
- mechanism: the request types in, and each word flashes its own accent colour through `vars` before settling to ink, a return glyph waiting at the bar's right edge
- eye: "make" -> per-word cobalt flash walks the phrase, one word settling to ink before the next -> "launch film"
- becomes: the empty prompt bar becomes a typed request, one word landing at a time
- why: the request IS the product demonstration, and word-by-word colour reads as intent arriving, not just text appearing
- duration: 1.40s
- object_in: center@640x160
- object_out: center@640x160
- motion: [data-part="prompt-word"]@fadeUp:energy
- archetype: asymmetric-baseline
- weight: quiet
- picture: the prompt bar mid-type, several words already settled to ink, the current word still in its accent colour
- design: make screen F=formats/scene/vawe-flow-2.terminal.html REF=example-madera ACT=1

## Beat 3: Send and render (3.6s-4.54s)
- type: product_surface
- shot: close on the return glyph, lower-right
- onscreen: "make a 12 second launch film"
- trigger: the last word settles
- mechanism: a cursor lands on the return glyph and presses it; the bar's last output line pulses success-green, standing in for the render firing
- eye: the last typed word, now ink -> the cursor travels to the return glyph and presses it -> the return glyph's success-green pulse
- becomes: the typed request becomes a fired render, shown as the terminal's own success pulse
- why: the cursor causes the send, so the change has a visible reason, and the terminal itself is the proof the render happened, no separate loading screen needed
- duration: 0.94s
- object_in: center@640x160
- object_out: center@40x40/op:0
- archetype: hero-object
- weight: quiet
- picture: the return glyph under the cursor, the output line pulsing green
- design: make screen F=formats/scene/vawe-flow-2.terminal.html REF=example-madera ACT=1

## Beat 4: Terminal chains to timeline (4.54s-6s)
- type: product_surface
- shot: wide, empty ground with one track entering left
- onscreen: "(the terminal's own ink ground, motion-blurring away, as a single timeline track and one clip slide in from the left)"
- trigger: the send pulse fires the terminal's exit
- mechanism: the whole terminal window exits with motion blur past 480 px/s while its own ink ground is what the first track's dark background grows out of, so the cut never reads as a cut; the first track and clip arrive from the LEFT (the owner's own named direction, not the reference's right-entry)
- eye: the terminal window -> a fast exit with motion blur carries the eye left as the ink ground itself becomes the timeline's -> the first track and clip arriving from the left
- becomes: the terminal becomes empty ink ground, then the first timeline track and clip
- why: "the terminal ground can chain to the next scene with camera movement" is the owner's own line: the boundary is carried by the ground's own colour, not a wipe
- duration: 1.46s
- recipe: flow-seam at=4.54 out=terminal in=timeline axis=x
- object_in: center@40x40/op:0
- object_out: center@480x270
- archetype: full-bleed-row
- weight: quiet
- borrows: "example-madera's flow-seam (axis x, right-entry) -> vawe-flow-2's flow-seam (axis x, left-entry, direction named by the owner)"
- picture: an almost-empty timeline: one dark track, one clip block, most of the frame still the terminal's own ink
- design: make screen F=formats/scene/vawe-flow-2.timeline.html KIND=dashboard REF=example-madera ACT=2

## Beat 5: Timeline assembles from the left (6s-8.12s)
- type: product_surface
- shot: medium-wide, timeline filling from the left
- onscreen: "(vawe's own multi-track timeline: tracks, clip thumbnails, a playhead)"
- trigger: the first track and clip having landed frees the rest to keep arriving
- mechanism: more tracks and clips keep entering from the left, stacking downward one at a time with a small landing bounce on each, until the panel is most of the way built, then a brief static hold lets the assembly read
- eye: the first track and clip -> each new track and clip pops in and stacks downward, staggering one after another -> the fully built timeline panel, held
- becomes: the almost-empty timeline becomes vawe's own fully populated multi-track editor
- why: "show timeline elements coming together and assemble from the left side" is the owner's own line, and a real multi-track build is the one thing this film can show that a home-page screenshot cannot
- duration: 2.12s
- recipe: window-dolly from=4.54 to=8.12 target=timeline
- object_in: center@480x270
- object_out: center@1600x820
- motion: [data-part="clip"]@popIn:energy
- archetype: asymmetric-baseline
- weight: strong
- picture: the fully assembled timeline, several tracks deep, real clip thumbnails and labels
- design: make screen F=formats/scene/vawe-flow-2.timeline.html REF=example-madera ACT=3

## Beat 6: Your films (8.12s-11.08s)
- type: payoff_withheld
- shot: wide, full-bleed ring centred
- onscreen: "(a ring of real vawe films, playing, with captions)"
- trigger: the timeline finishing its build frees the frame for what it produced
- mechanism: the assembled timeline exits left with motion blur; a ring of real vawe films enters from the right, each one PLAYING (moving footage, never a still); as the ring turns to the next film, the ground crossfades to a blurred wash of that film's own dominant colour, then the ring holds one beat longer on its last film before exiting left
- eye: the assembled timeline -> each playing film pulls the eye as the ground re-tints to its own colour -> the ring's last film, held one beat longer
- becomes: the timeline becomes a ring of real films, each one recolouring the ground as it plays, then empty ground again
- why: this is the spectacle, and the proof that vawe's output is real, shown as films actually running rather than photographed
- duration: 2.96s
- recipe: flow-seam at=8.12 out=timeline in=films axis=x
- object_in: center@1600x820
- object_out: center@160x160
- motion: [data-part="film-card"]@fadeUp:professional
- archetype: full-bleed-row
- weight: peak
- borrows: "example-madera's card-ground-retint (a swipe deck picking between options) -> vawe-flow-2's films-ring ground (playing, not picking)"
- picture: a real vawe film mid-play inside the ring, its own colour washed across the ground behind it
- design: make screen F=formats/scene/vawe-flow-2.films.html KIND=grid REF=example-madera ACT=5

<!-- NOTE on the cut pick/cards act: example-madera's own swipe-card act (its original act 3) is not
     reproduced here as a literal "choose between three options" moment. The owner's brief never asks
     the viewer to pick; it asks for real films to play while the ground takes each one's colour as the
     ring browses. That is exactly the card act's one load-bearing device (per-item ground retint), so
     the device is kept and reused inside beat 6 above, and the literal swipe-to-choose framing is cut.
     Keeping both would mean vawe appears to pick a film for the viewer twice, once literally and once
     as a device, which is the duplicate this film explicitly excludes (see `not:` above). -->

## Beat 7: The mark (11.08s-13.03s)
- type: payoff_withheld
- shot: medium close, mark and wordmark centred
- onscreen: "(the vawe mark, drawn as a line, then the wordmark growing out of it)"
- trigger: the last film's exit clears the frame for the close
- mechanism: small cobalt marks gather from off-frame and trace the vawe mark's outline as a line that draws itself on; as the last stroke lands, the wordmark "vawe" grows out from the mark's own position to its resting size beside it, then holds
- eye: scattered marks gathering off-frame -> the drawn line traces the vawe mark's outline -> the wordmark growing out beside it, held
- becomes: scattered marks become a drawn line, which becomes the vawe mark with its wordmark grown out beside it, held still
- why: the only still moment in the film, earned by everything before it moving; "text should come out of the logo as well" is the owner's own line
- duration: 1.95s
- recipe: flow-seam at=11.08 out=films in=logo axis=y
- object_in: center@160x160
- object_out: center@640x180
- motion: [data-part="mark-stroke"]@drawOn:gravity; [data-part="wordmark-letter"]@popIn:energy
- archetype: lockup
- weight: quiet
- picture: the drawn mark with the wordmark grown out beside it, held centred
- design: this beat is vector mark/wordmark layers, not a product screen; `make screen` does not apply here the way it does to beats 1, 4-6
