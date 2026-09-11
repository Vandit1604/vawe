---
approved: 2026-09-11
message: "vawe lives in your terminal: type a request, and it renders itself."
audience: "Founders and designers who need a launch film and have no motion designer."
reference: "example-madera"
arc: "one unbroken move through the product: the terminal arrives tilted in perspective, an install command completes, a request is typed, the terminal's own ground carries the camera into the timeline it assembles, real films play as the ground takes each one's colour, and the mark forms out of the last line drawn. Nothing cuts. Every change leaves on the axis the next thing arrives on."
attention: "the eye follows the camera as it flattens out of a tilt, then the install command completing, then the cursor and caret that cause every word and every click, then the colour that re-tints the ground as each film plays, and rests only once, on the drawn line that grows into the wordmark."
threads: "a cursor and a caret that cause every change + one exit axis per act (x for the terminal/timeline/films chain, y only for the final rise into the mark) + a ground that takes its colour from whatever is on screen + one continuous camera travel, never still"
format: 1920x1080
theme: "themes/vawe.json"
duration: 14.48s
spectacle: "beat 7 (Your films) · the ground re-tints to each playing film's own colour as the ring browses, live footage not stills · the film's one loud moment"
not: "no hard cut anywhere, no centred slide deck, no gradient hero, no stock photography, no copy vawe cannot back, no second typeface, no sound bed, no swipe-to-pick moment standing beside Your films, no static camera hold longer than a beat needs"
craft:
    captions: "No captions. The only words are prior command lines, an install command completing, a typed request, timeline clip labels, film captions and the vawe wordmark, each on screen long enough to read."
    color: "A dark terminal ground (the theme's own ink, not a foreign black) that crossfades to the theme's white-first ground once the timeline appears, then re-tints to each film's own colour as Your films browses, then settles back to white-first for the mark. Ink for type, cobalt for the cursor's actions and the per-word colour flash while typing."
    density: "A change every half second or less, studied frame by frame off example-madera at 60fps. Each beat carries a camera move, an entrance, an action and an exit, same as the reference."
    direction: "The restraint is that nothing ever cuts and the camera never stops. One continuous travel carries the whole film: tilted and wide at the open, flattening and pushing in as the install and the request type, then panning through the timeline, the films ring and the mark. The spectacle earns its place by being the one place the ground itself changes colour more than once, driven by real content, not a flat brand wash."
    film-structure: "A cursor and a typing caret hold the film and cause each change. Beats join by a fast exit on one axis with motion blur, the next arrival on the same axis, and a frame of empty ground between (example-madera's flow-seam), except the final rise into the mark, which changes axis the way the reference's own closing beat does."
    fragment-exemplars: "vawe-flow-2.terminal.html (beats 1-4, an editor-kind screen), vawe-flow-2.timeline.html (beats 5-6, a dashboard-kind screen), vawe-flow-2.films.html (beat 7, a grid-kind screen). The logo beat (8) is vector mark layers, not an HTML fragment mock."
    html-fragments: "Every move comes from the engine: keyframe tracks for position, rotation and blur, `typing`+`vars` for the per-word colour flash, `parts`/`drawOn` for the logo's line. No CSS animation or transition."
    layout: "Asymmetric while things move: the terminal sits tilted and low at first, widening and flattening as the camera travels; the timeline builds from the left edge; the films ring holds full width; the mark alone is centred at the end."
    motion-craft: "Hand-keyed with real deceleration: arrivals ease out, exits accelerate past 480 px/s so the automatic motion blur smears them, and one continuous camera travel carries every beat, never resetting or holding still mid-film."
    show-dont-tell: "The claim that vawe renders what you write is shown as an install completing, then a request typed in a real terminal, then its own timeline assembling, then real films it produced playing. The determinism claim is not restated in this cut; it is carried entirely by the timeline and films acts."
    sound: "Silence is the decision, as in the reference. The film is carried entirely by motion and colour."
    typography: "One face, the vawe theme's sans, plus its monospace variant (italic for command words) inside the terminal. Interface type at UI size inside the windows, the wordmark at its own weight. Size is the only variable."
---

<!-- REWORKED from the owner's own feedback (2026-09-11): the camera opened too zoomed in on a flat
     terminal, the terminal had no entrance animation, the pace was slow throughout, camera/perspective
     were unused, and the act joins read as dead cuts rather than the camera travel example-madera
     shows. Fix, in order: beat 1 now opens WIDE and TILTED (perspective, easing flat as the camera
     arrives), the prior command lines animate in, a real `npm install -g vawe` types and completes,
     THEN the request types while the camera pushes in. Every beat is retimed to ~2s or under (the
     spectacle alone runs a little longer). One continuous camera travel replaces the old four short,
     disconnected legs. The three act joins keep example-madera's flow-seam grammar (fast exit with
     motion blur, arrival on the same axis, a frame of empty ground between) but now sit inside a film
     that is moving throughout, not only at the joins. Reference: refs/example-madera/pages/ (all 782
     frames at 60fps) and grammar/example-madera.json's per-shot moves. No reference content is used. -->
## Beat 1: Type-only card, grain gradient (0s-1.2s)
- type: type_only
- shot: full-bleed, one line of white type over a still image
- onscreen: "Nothing here looks like a template."
- trigger: the film opens on this image and line, ahead of the terminal, so the two image frames in the film sit apart from each other
- mechanism: a grainy blue gradient with blurred crosses fills the frame with a slow scale drift; the line blurs up into place over it in the theme sans, then exits fast as the camera's one continuous push begins moving across it; the terminal rises out of the same dark ground, tilted and blurred, as the card clears
- eye: the grain gradient drifting in under the line -> the line blurring up and holding -> a fast exit as the terminal rises out of the same ground behind it
- becomes: one held photograph and line becomes the terminal's own tilted, blurred arrival
- why: the owner's own request, to use this non-grid image at the START of the film to space the two image frames apart (the tile-grid card stays mid-film, between the terminal and the timeline); the ground stays one dark field under both, so the join is carried by motion, not a cut
- duration: 1.20s
- object_in: center@1920x1080
- object_out: center@1920x1080/op:0
- archetype: full-bleed-row
- weight: quiet
- picture: the grain-gradient photo, full-bleed, with "Nothing here looks like a template." set large and left-aligned inside the safe margin
- fragment: none, an image + text layer pair (card-b-bg, card-b-text)


## Beat 2: Terminal, wide and tilted (0.95s-2.15s)
- type: hook
- shot: wide, tilted in perspective, subject low and off-centre, settling toward flat and centred
- onscreen: "a macOS terminal window (traffic-light dots, centred title, a left column of timestamps beside prior command lines: an italic monospace command word, then a softly rounded output panel, one success green, one error red), seen at a tilt like a screen turning to face you"
- trigger: the film opens on the product, already showing real prior work, so it arrives already in motion and already leaning into frame
- mechanism: the terminal window opens tilted and small (rotated in depth, blurred, transparent) and eases flat, sharp and full within the beat, while its prior command lines stagger in row by row; the one continuous camera travel begins its push here
- eye: a tilted, blurred terminal easing flat -> each prior command row landing in turn -> the flattened window, sharp, ready for what comes next
- becomes: a turned, half-formed terminal becomes a flat, sharp one with real prior work already inside it
- why: perspective gives the open a sense of arrival instead of a flat screenshot sitting still, and settling flat as the camera keeps moving is what "using camera and perspective" means in this film
- duration: 1.20s
- motion: [data-part="sidebar-row"]@fadeUp:energy
- object_in: center@1920x1080
- object_out: center@1100x700
- archetype: full-bleed-row
- weight: strong
- borrows: "example-madera's window-focus-rack (blurred and tilted at 0s, sharp and closer by 4.54s) -> vawe-flow-2's terminal tilt-to-flat open"
- picture: the terminal window tilted at open, straightening as prior commands land: real prior work, an empty prompt bar waiting below
- design: make screen F=formats/scene/vawe-flow-2.terminal.html KIND=editor REF=example-madera ACT=1
- fragment: formats/scene/vawe-flow-2.terminal.html

## Beat 3: Install, typed and done (2.15s-4.0s)
- type: product_surface
- shot: close on the new command row, lower-middle
- onscreen: "npm install -g vawe, then added 1 package in 1.2s / vawe installed. run npx vawe <scene.json> to render"
- trigger: the terminal having landed flat frees the next real line to type
- mechanism: "npm install -g vawe" types in word by word, then its own output panel lands as the install completes, standing in for the real first thing a viewer would do
- eye: "npm" -> "install -g vawe" landing word by word -> the green completion line, then the install note beneath it
- becomes: an empty command slot becomes a finished install, shown as the terminal's own real output
- why: the owner's own instruction: open on installing vawe and show it completing, before any request is typed
- duration: 1.84s
- motion: [data-part="install-word"]@fadeUp:energy; [data-part="install-done"]@popIn:energy
- object_in: center@1100x700
- object_out: center@640x160
- archetype: hero-object
- weight: quiet
- picture: "npm install -g vawe" fully typed, the green "added 1 package" line already landed beneath it
- design: make screen F=formats/scene/vawe-flow-2.terminal.html REF=example-madera ACT=1
- fragment: formats/scene/vawe-flow-2.terminal.html

## Beat 4: Typed prompt, camera zooms in (4.0s-5.62s)
- type: product_surface
- shot: close on the prompt bar, lower third, the camera pushing in as it types
- onscreen: "make a 12 second launch film"
- trigger: the install completing frees the prompt bar for the real request
- mechanism: the request types in while the camera keeps pushing toward the prompt bar, each word flashing its own accent colour through `vars` before settling to ink, a return glyph waiting at the bar's right edge
- eye: "make" -> per-word cobalt flash walks the phrase as the frame tightens -> "launch film", now close and centred
- becomes: the empty prompt bar becomes a typed request, framed close by a camera that has arrived
- why: the owner's own instruction: zoom in as the command types, so the push and the words land together
- duration: 1.62s
- motion: [data-part="prompt-word"]@fadeUp:energy
- object_in: center@640x160
- object_out: center@640x160
- archetype: asymmetric-baseline
- weight: quiet
- picture: the prompt bar mid-type, several words already settled to ink, the current word still in its accent colour, framed tight
- design: make screen F=formats/scene/vawe-flow-2.terminal.html REF=example-madera ACT=1
- fragment: formats/scene/vawe-flow-2.terminal.html

## Beat 5: Send and render (5.62s-6.32s)
- type: product_surface
- shot: close on the return glyph, lower-right
- onscreen: "make a 12 second launch film"
- trigger: the last word settles
- mechanism: a cursor lands on the return glyph and presses it; the bar's last output line pulses success-green, standing in for the render firing
- eye: the last typed word, now ink -> the cursor travels to the return glyph and presses it -> the return glyph's success-green pulse
- becomes: the typed request becomes a fired render, shown as the terminal's own success pulse
- why: the cursor causes the send, so the change has a visible reason, and the terminal itself is the proof the render happened, no separate loading screen needed
- duration: 0.70s
- object_in: center@640x160
- object_out: center@40x40/op:0
- archetype: hero-object
- weight: quiet
- picture: the return glyph under the cursor, the output line pulsing green
- design: make screen F=formats/scene/vawe-flow-2.terminal.html REF=example-madera ACT=1
- fragment: formats/scene/vawe-flow-2.terminal.html

## Beat 5b: Type-only card, tile grid (6.32s-7.22s)
- type: type_only
- shot: full-bleed, one line of white type over a still image
- onscreen: "Every film here fits in one file."
- trigger: the terminal's send pulse clears the frame, ahead of the timeline
- mechanism: a blue tilted tile-grid photo fills the frame with a slow scale drift; the line blurs up into place over it in the theme sans, then exits fast; the camera keeps its one push moving through the card, never stopping
- eye: the terminal's exit -> the tile-grid image drifting in under the line -> the line blurring up and holding -> a fast exit into the timeline's own arrival
- becomes: the terminal's ink ground becomes one held photograph and line, which becomes the timeline
- why: the owner's own request, to use this image as a background for a short type-only moment here; the ground change (dark terminal ink to the image, then to the timeline's paper ground) is a declared change, not a flash, and the film's own site copy (site/app/page.tsx:195) supplies the line
- duration: 0.90s
- object_in: center@1920x1080
- object_out: center@1920x1080/op:0
- archetype: full-bleed-row
- weight: quiet
- picture: the tile-grid photo, full-bleed, with "Every film here fits in one file." set large and left-aligned inside the safe margin
- fragment: none, an image + text layer pair (card-a-bg, card-a-text)

## Beat 6: Terminal chains to timeline (7.22s-8.02s)
- type: product_surface
- shot: wide, empty ground with one track entering left
- onscreen: "(the terminal's own ink ground, motion-blurring away, as a single timeline track and one clip slide in from the left)"
- trigger: the send pulse fires the terminal's exit
- mechanism: the whole terminal window exits with motion blur past 480 px/s while its own ink ground is what the first track's dark background grows out of, so the cut never reads as a cut; the first track and clip arrive from the LEFT
- eye: the terminal window -> a fast exit with motion blur carries the eye left as the ink ground itself becomes the timeline's -> the first track and clip arriving from the left
- becomes: the terminal becomes empty ink ground, then the first timeline track and clip
- why: "the terminal ground can chain to the next scene with camera movement" is the owner's own line: the boundary is carried by the ground's own colour and the camera's own travel, not a wipe
- duration: 0.80s
- recipe: flow-seam at=4.7 out=terminal in=timeline axis=x
- object_in: center@40x40/op:0
- object_out: center@480x270
- archetype: full-bleed-row
- weight: quiet
- borrows: "example-madera's flow-seam (axis x, right-entry) -> vawe-flow-2's flow-seam (axis x, left-entry, direction named by the owner)"
- picture: an almost-empty timeline: one dark track, one clip block, most of the frame still the terminal's own ink
- design: make screen F=formats/scene/vawe-flow-2.timeline.html KIND=dashboard REF=example-madera ACT=2
- fragment: formats/scene/vawe-flow-2.timeline.html

## Beat 7: Timeline assembles from the left (8.02s-9.97s)
- type: product_surface
- shot: medium-wide, timeline filling from the left, camera panning with it
- onscreen: "(vawe's own multi-track timeline: tracks, clip thumbnails, a playhead)"
- trigger: the first track and clip having landed frees the rest to keep arriving
- mechanism: more tracks and clips keep entering from the left, stacking downward one at a time with a small landing bounce on each, while the camera keeps travelling across the build, then a brief static beat lets the assembly read just before the next exit
- eye: the first track and clip -> each new track and clip pops in and stacks downward, staggering one after another as the camera moves with them -> the fully built timeline panel
- becomes: the almost-empty timeline becomes vawe's own fully populated multi-track editor
- why: "show timeline elements coming together and assemble from the left side" is the owner's own line, and a real multi-track build is the one thing this film can show that a home-page screenshot cannot
- duration: 1.95s
- object_in: center@480x270
- object_out: center@1600x820
- motion: [data-part="clip"]@popIn:energy
- archetype: asymmetric-baseline
- weight: strong
- picture: the fully assembled timeline, several tracks deep, real clip thumbnails and labels
- design: make screen F=formats/scene/vawe-flow-2.timeline.html REF=example-madera ACT=3
- fragment: formats/scene/vawe-flow-2.timeline.html

## Beat 8: Your films (9.97s-12.97s)
- type: payoff_withheld
- shot: wide, full-bleed wall, camera drifting then pushing to centre
- onscreen: "(a wall of six real vawe films, all playing at once, then a push into vawe launch)"
- trigger: the timeline finishing its build frees the frame for what it produced
- mechanism: the assembled timeline exits left with motion blur; a wall of six real vawe films fills the frame edge to edge, all six PLAYING at once (moving footage, never a still, no fast switching between them); the camera drifts slowly across the wall, left toward right, then pushes straight into vawe launch at the wall's own centre and holds; as the push lands, the ground takes vawe launch's own colour
- eye: the assembled timeline -> the whole wall of six playing films as the camera drifts across it -> vawe launch at the wall's centre, held as the push lands
- becomes: the timeline becomes a wall of six real films playing together, then just vawe launch, held, as the ground takes its colour
- why: the owner removed the ring's fast film switching and asked for one slower move instead, a wall of six playing films with a slow drift, then a push into vawe launch, so the proof that vawe's output is real reads as one held look rather than a series of quick swaps
- duration: 3.00s (before the film's own slower 0.85 tempo)
- recipe: flow-seam at=7.3 out=timeline in=films axis=x
- object_in: center@1600x820
- object_out: center@960x716
- motion: [data-part="films-wall"]@widen:cinematic; [data-part="film-card"][data-film*="vawe-launch"]@growUp:professional
- archetype: full-bleed-row
- weight: peak
- borrows: "example-madera's card-ground-retint (a swipe deck picking between options) -> vawe-flow-2's films-wall ground (playing together, not picking, not switching)"
- picture: the wall's six films playing at once, then held on vawe launch alone at full-bleed, its own colour washed across the ground behind it
- design: make screen F=formats/scene/vawe-flow-2.films.html REF=example-madera ACT=5
- fragment: formats/scene/vawe-flow-2.films.html

<!-- NOTE on the cut pick/cards act: example-madera's own swipe-card act (its original act 3) is not
     reproduced here as a literal "choose between three options" moment. The owner's brief never asks
     the viewer to pick; it asks for real films to play while the ground takes vawe launch's own colour
     once the wall drifts and the camera pushes in. That is exactly the card act's one load-bearing
     device (per-item ground retint), so the device is kept and reused inside beat 8 above, and the
     literal swipe-to-choose framing is cut. Keeping both would mean vawe appears to pick a film for the
     viewer twice, once literally and once as a device, which is the duplicate this film explicitly
     excludes (see `not:` above). -->

## Beat 9: The mark (12.97s-14.78s)
- type: payoff_withheld
- shot: medium close, mark and wordmark centred
- onscreen: "(the vawe mark, drawn as a line, then the wordmark growing out of it)"
- trigger: the last film's exit clears the frame for the close
- mechanism: small cobalt marks gather from off-frame and trace the vawe mark's outline as a line that draws itself on; as the last stroke lands, the wordmark "vawe" grows out from the mark's own position to its resting size beside it, then holds; the camera's one continuous travel comes to rest here, its only stop in the film
- eye: scattered marks gathering off-frame -> the drawn line traces the vawe mark's outline -> the wordmark growing out beside it, held
- becomes: scattered marks become a drawn line, which becomes the vawe mark with its wordmark grown out beside it, held still
- why: the only still moment in the film, earned by everything before it moving; "text should come out of the logo as well" is the owner's own line
- duration: 1.82s
- recipe: flow-seam at=9.6 out=films in=logo axis=y
- object_in: center@160x160
- object_out: center@640x180
- motion: [data-part="mark-stroke"]@drawOn:gravity; [data-part="wordmark-letter"]@popIn:energy
- archetype: lockup
- weight: quiet
- picture: the drawn mark with the wordmark grown out beside it, held centred
- design: this beat is vector mark/wordmark layers, not a product screen; `make screen` does not apply here the way it does to beats 1, 5-7
- fragment: formats/scene/vawe-flow-2.mark.html
