---
approved: 2026-09-09
message: "You write one JSON file, run one command, and get the same rendered video every time."
audience: "Developers and technical marketers who make product video by hand today."
arc: "hook → write → build → get → range → proof → CTA"
framework: "FAB, chosen because the engine's benefit (determinism) is only credible after the viewer sees the feature (one file in, one mp4 out) actually happen on screen."
threads: "a continuous object (the scene file itself, changing state at every cut) and a bookend (the first frame's blur-resolve returns as the last frame's lockup)"
object: "one vawe scene file, on screen from the first frame to the last, first as text and then as the picture it renders to"
object_t0: "a blurred block of type, unreadable, resolving into the word vawe"
object_states: "b2 it is a leaning code slab being read top to bottom · b3 it is a command in a terminal · b4 it is a rendered 1920x1080 frame · b5 it is that frame five times, one per canvas · b6 it is that frame twice, identical · b7 it is the mark"
object_last: "the mark and the wordmark, still, on white"
format: 1920x1080
theme: "themes/vawe-film.json"
duration: 20s
craft:
  CAPTIONS: "no narration and no captions: every line is on-screen type the viewer reads, and a caption strip under type is a second copy of the same words"
  COLOR: "eyedropped, not invented. themes/vawe-film.json is the real landing page's palette with the surfaces given tone for video; one hue, three grounds in rotation"
  DENSITY: "three roles per frame, background treatment, midground content, foreground metadata. The peak beat is the only one that carries a data row"
  DIRECTION: "the through-line is one object, the scene file, changing state at every cut; the bookend is the write/build/get rail on beats 1 and 7"
  FRAGMENT-EXEMPLARS: "the plate is the reused surface, at 1330, 560 and 300px across beats 4, 6 and 5; everything else is authored once"
  HTML-FRAGMENTS: "every size names a kit role and every shadow a kit elevation; the four hooks are --focus, --typed, --rule and parts, and all four are driven"
  LAYOUT: "seven archetypes, none repeated on adjacent beats, declared per beat as archetype: and checked by make frame-check"
  SOUND: "silent. A twenty-second film about determinism has nothing to say over its own type, and a bed would be decoration"
  TRANSITIONS: "six cuts, one family. The cinematicZoom into beat 4 is the only accent and it lands on the spectacle"
  MOTION-CRAFT: "entrances decelerate (easeOutExpo on the peak landing), the two holds carry a 1% breathe, and no two beats enter alike"
pace: "showreel, 2.9s per idea. Seven ideas, one per beat, none shares a frame with another."
spectacle: "beat 4 · the plate layer · the rendered frame landing hard under the sentence · it is the moment the text the viewer watched being written becomes a picture, and it is the only loud frame in the film"
not: "no Inter or Roboto · no purple or indigo gradient · no centred hero with one CTA · no row of three icon cards · no drop shadow at 0.1 opacity · no gradient hero · no fade on every cut · no stock photography · no invented statistic · no dark surface anywhere · no border where depth does the work · no square corner on a card · no chat UI in a film about a command line"
---

### Reference devices

<!-- A `###` heading, so `blocksOf` does not parse this as a beat. This is the reference decoded into
     its parts, and it belongs in the plan rather than in a chat message: a catalogue that lives in a
     transcript cannot be checked tomorrow, and the first pass took three of these twelve without
     anyone being able to see which nine were missing. Each beat's `borrows:` names the device by id,
     so "which of the reference's moves does this film actually use" is answerable from the file. -->

| id | the device | this film |
|---|---|---|
| D1 | typewriter with a literal cursor bar riding the end | **beats 1 and 3**, as in the reference, which uses it twice: the wordmark types itself, and later the command does |
| D2 | wordmark with a small pill chip beside it | **beat 1**, `vawe [engine]` |
| D3 | tilted plane running off two frame edges | **beat 2**, the scene file as a plane |
| D4 | two planes at different depths, parallax | **beat 2**, a second plane behind, carrying no content on purpose |
| D5 | a word arrives LARGE and in the accent, then settles into the line in ink | **every beat's sentence.** The signature move, and motion: the resting frame stays settled |
| D6 | list card, bold value over grey label, a check on the selected row | **beat 2** (what the file declares) and **beat 5** (16:9 is checked, because that is what this film renders) |
| D7 | extreme scale push into ONE element, same object at three sizes | **beats 4, 6, 5**: the same plate at 1000px, 560px, 340px |
| D8 | typing into a field, the text scrolling as it overflows | **beat 3**, `--typed` clips the command in whole characters |
| D9 | attach icon and a round accent send button, pushed to fill the frame | **dropped.** Their hero object is a chat input because their product is chat. Ours is a command line, and copying the shape put an AI chat UI into this film for two rounds (engine-doctrine/MISTAKES.md #596) |
| D10 | an icon inside a pale halo of the accent, a badge on it | **beat 7**, the real favicon in a cobalt halo |
| D11 | closing sentence word by word, last phrase in the accent | **beat 7**, "Write it. Run it. Ship it." |
| D12 | ends on black | the film's own outro, not a fragment |

**Ten used, one dropped with a reason, one owned by the film rather than a frame.** The grammar
travels; the objects do not. Any beat that borrows names what the device BECOMES here, or it is
copying a shape without its role.

## Beat 1: Hook (0s-2.6s)
- archetype: centred
- weight: quiet
- type: hook
- object: not readable yet. It is a block of type dissolving into focus.
- shot: medium (the wordmark owns the centre, about 40% of frame width)
- camera: hold
- picture: the wordmark centred with a cobalt pill beside it, and one line under it, on a faintly cool near-white ground
- blueprint: blurResolveHook (Reproduce: type resolves from defocus, no other move)
- fragment: films/scene/_vawe-oblique.hook.html
- motion: .hk-word@fade:cinematic; .hk-claim@fadeUp:professional
- onscreen: "vawe" / "One file in. One video out."
- mechanism: each word arrives LARGE and in the accent, then shrinks into the line in ink · the pill pops after the wordmark lands
- becomes: an empty ground becomes a name, and the name becomes a claim with one word in the accent
- trigger: nothing yet. This beat opens the film.
- layout: the stack is centred and spans about 45% of frame width, the outer thirds deliberately empty so the code plane can enter from the right
- style: the reference grammar opens here, near-white ground, one cobalt word, no card yet
- rest: none, the word by word reveal fills the beat
- why: state the whole promise in six words, so every later beat is proof and not exposition
- duration: 2.6s
- transition_in: fx:none

## Beat 2: Write (2.6s-6.6s)
- archetype: split
- weight: strong
- borrows: D3 + D4 + D6 · a tilted product surface running off the frame -> the film's own scene file, as a plane of real JSON
- type: feature_showcase
- object: the file, now readable, leaning away from the camera and scrolling under a focus bar
- shot: medium (the plane owns the right half, tilted, running off two edges)
- camera: panFollow
- picture: a white plane of real vawe scene JSON, tilted away from the camera and running off the right and bottom edges, with a focus band riding the current line
- blueprint: scrollStory (Reproduce: the html string, the static tilt, the leaning shadow, the absolute scroll stops)
- fragment: films/scene/_vawe-oblique.code.html
- onscreen: "You write the scene."
- motion: .line@fadeUp:professional
- move: drift:professional
- mechanism: static tilt · absolute-stop scroll · line focus bar keyed by index
- becomes: a claim becomes the document that backs it, and a still plane becomes a document being read
- trigger: the hook claims one file, and a claim about a file demands the file on screen
- layout: the plane covers the right half and runs off two edges, the sentence sits left at the margin over the empty half
- style: white plane on the near-white ground, separated by a wide soft shadow and never a border, cobalt on the JSON keys
- rest: the scroll never fully stops between its stops
- why: prove the input is a real readable artifact, not a diagram of one
- duration: 4s
- transition_in: fx:none

## Beat 3: Build (6.6s-10s)
- archetype: other (a left-aligned transcript, no container at all)
- weight: strong
- borrows: D9 (dropped) + D1 + D8 · their chat input pill with a round send button -> nothing. Their hero object is a chat box because their product is chat; ours is a command line, so this beat is a transcript and has no container at all
- type: product_intro
- object: the same file, now named on a command line
- shot: medium (the command as type, left, across most of the frame width)
- camera: hold
- picture: the command itself as the largest type in the frame, in mono with an accent prompt, and the four real output lines small and dim beneath it, the last one in the accent
- blueprint: terminalReveal (Reproduce: the command types itself, output rises, the result lands in the accent)
- fragment: films/scene/_vawe-oblique.term.html
- motion: .tm-line@fadeUp:energy
- onscreen: "One command." / "./bin/vawe films/scene/vawe-oblique.json"
- mechanism: the command types itself under a blinking caret · the output lines rise · the result line lands in the accent
- becomes: a document being read becomes a command being run, and the running command becomes a file on disk
- trigger: the scroll in beat 2 reaches the end of the file, so the file is finished and can be built
- layout: left-aligned at the margin, the command spanning about 72% of frame width, the sentence above and the output under
- style: a transcript, not a window. No chrome, no container, no dark surface: the command is the object
- rest: none, the typing fills the beat
- why: name the one command, because the whole promise is that there is only one
- duration: 3.4s
- transition_in: fx:none

## Beat 4: Get (10s-13.2s)
- archetype: hero-object
- weight: peak
- type: benefit_highlight
- object: the file, now a picture. This is the state change the whole film is about.
- shot: close (the rendered plate fills the middle of the frame)
- camera: hold
- picture: the sentence centred with its last word in cobalt, the size on a quiet label under it, and this film's own first frame as a white plate below
- blueprint: none. This is the html fragment.
- fragment: films/scene/_vawe-oblique.frame.html
- onscreen: "Same input. Same pixels." / "1920 × 1080 · 30 fps"
- motion: .w@growUp:energy; .plate@growUp:energy
- mechanism: hard landing on the plate · each word arriving LARGE and in the accent, then settling to its place in ink (the reference's signature type move)
- becomes: a command becomes the frame it produced, and text becomes a picture
- trigger: the terminal in beat 3 prints its result line, so the artifact now exists
- layout: one column, the plate at the full content width and about 69% of the frame, the sentence above it and the stats in a row under it
- style: the loudest frame of the film. THIS is the spectacle beat.
- rest: none, the landing carries it
- why: pay off the hook. The viewer watched the input and now sees the output, with nothing in between hidden
- duration: 3.2s
- transition_in: fx:cinematicZoom

## Beat 5: Range (13.2s-15.6s)
- archetype: full-bleed-row
- weight: quiet
- type: feature_showcase
- object: the same frame, five times, one per canvas
- shot: medium (five cards fanning across the middle band)
- camera: workspaceZoomOut
- picture: the same plate at all five canvases, on one shared baseline, each labelled with its real pixel size
- blueprint: cardFan (Adapt: the cards are the same rendered frame at five aspect ratios, not five different cards)
- fragment: films/scene/_vawe-oblique.range.html
- motion: .rg-card@growUp:energy
- move: drift:professional
- onscreen: "Five canvases. One file."
- mechanism: fan out from one card · camera pulling back
- becomes: one frame becomes five shapes of the same frame
- trigger: the frame in beat 4 lands, and a landed frame invites the question of what shape it can be
- layout: the fan is centred and spans about 88% of frame width in the middle band, margins clear above and below
- style: the same ground, the plates carrying the only weight, one accent word in the sentence
- rest: a slow drift across the fan
- why: show the range without claiming a number the frame does not show
- duration: 2.4s
- transition_in: fx:none

## Beat 6: Proof (15.6s-17.6s)
- archetype: symmetric-pair
- weight: quiet
- type: feature_showcase
- object: the same frame twice, side by side, identical
- shot: medium (two frames, one per half)
- camera: hold
- picture: two copies of the same plate side by side with one cobalt equals sign between them
- blueprint: viewportTrio (Adapt: two panes, not three, because the claim is a pair being identical)
- fragment: films/scene/_vawe-oblique.proof.html
- onscreen: "Run it twice. Identical."
- motion: .pf-pane@fade:gravity
- move: hold:breathe
- mechanism: the fan collapsing · two panes settling to one alignment
- becomes: five shapes become one pair, and the pair becomes proof that the render is deterministic
- trigger: the fan in beat 5 pulls back far enough that two of its cards line up
- layout: two plates of about 36% of frame width each with the sign between them, the sentence above
- style: quietest frame in the film, no accent except the line that says the two agree
- rest: 1% breathe on both panes together, so they stay identical even while moving
- why: determinism is the only claim here that a viewer cannot check by eye, so show it rather than say it
- duration: 2s
- transition_in: fx:none

## Beat 7: CTA (17.6s-20s)
- archetype: lockup
- weight: quiet
- borrows: D10 + D11 · an icon inside a pale halo of the accent -> the real favicon at the endCardSize the theme names
- type: cta
- object: the mark, which is where the blurred type in beat 1 was heading all along
- shot: medium (the mark inside its halo, centred, about 22% of frame width)
- camera: hold
- picture: the real favicon inside a pale cobalt halo, with one closing line and the address under it
- blueprint: ctaEnd (Reproduce: held to the last frame, no exit)
- fragment: films/scene/_vawe-oblique.cta.html
- motion: .ct-halo@popIn:energy; .ct-url@fadeUp:professional
- onscreen: "Write it. Run it. Ship it." / "vawe.dev"
- mechanism: mark pop · held still
- becomes: the proof becomes an address you can type, and the mark becomes the last frame
- trigger: the two frames in beat 6 agree, so there is nothing left to prove
- layout: halo, line and address stacked at centre, all four margins clear
- style: quiet, one line, the mark and nothing competing
- rest: none. The film stops.
- why: one next step, and it closes the bookend the blurred type opened
- duration: 2.4s
- transition_in: fx:fade
