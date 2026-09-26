---
message: "A vawe video is one JSON file: you write a scene, and the engine renders the film."
audience: "developers and technical founders on X / LinkedIn, autoplaying muted in a feed"
arc: "hook -> build -> proof -> payoff -> CTA"
format: 1920x1080
theme: "themes/vawe.json"
duration: 22s
angle: "The file is the film. No dashboard, no timeline: the scene file writes itself, its reach builds as rows, one real frame shows at three canvases, and the payoff lands last."
threads: "a CONTINUOUS OBJECT: the accent rule that rides every cut on a hand-keyed track (acrossBeats under sceneUnits), travelling right through the build and back for the close + a bookend: the hook asks where the video is, the payoff answers: it is the file"
spectacle: "beat 5 (wordBlast) · 'One JSON.' oversized, arriving on the punch cut after the three-canvas picture. Every other beat stays restrained: type and chips on a turning light field."
not: "no dashboard, no cursor clicking a UI, no gradient hero, no stock photos, no VO, no Inter, no centered slide deck, no emoji, no invented numbers"
craft:
    color: "the palette is themes/vawe.json, derived from the real site (white-first, one cobalt accent); the field cycles the goldSet exemplar's own light presets, nothing invented"
    density: "each beat carries one hero (the sentence, the filling frame, the rows, the picture, the word, the mark) with one support line; the fixed frame in beat 2 is the constant and the chips are the variable"
    direction: "restraint everywhere except beat 5: the hook resolves from blur, the file fills, rows build, a picture holds; the one loud moment is the oversized payoff word on the punch"
    layout: "asymmetric, one hero per frame, anchored left at 200px like the exemplar; the three viewports centre as one row; the close is centred on purpose as the end card"
    motion-craft: "the accent rule rides a hand-keyed track across every cut; the beats' own motion is mined from studied references (blur-resolve, container fill, row build, viewport trio, word blast) and each is timed inside the type's pace band"
    keyed-motion: "one authored track on the continuous object, three keys; the mined beats key their own arrivals from the reference grammar"
    imagery: "one real vawe-rendered frame (assets/brands/vawe/stills/glass-hero.png, the refraction effect from vawe-glass-hero) shown at three sizes; brand-pure, no second accent; the wave mark is the canonical path"
    show-dont-tell: "the '5 canvases' claim is shown as one frame at three sizes before the payoff states anything; the file is shown filling before 'you write a scene' is said"
    sound: "cues only, no bed: the feed autoplays muted, so the film reads silent; with sound on, arrivals tick and the payoff carries one hit"
    transitions: "one family, dissolves, with one punch into the payoff (contrast) and a dissolve to the end card (new act); chosen by the type spine, not habit"
    captions: "no captions: no VO, every line is on-screen type at reading size, 16:9 on X / LinkedIn has no safe strip"
    typography: "Anybody for every display line (the site's real face), JetBrains Mono for the file chips and the rows; one scale held: 108 hook, 72 payoff line, 44 caption, 40 rows, 38 chips"
---

<!-- ACCEPTANCE RUN, 2026-09-06: the same lock sheet as vawe-explainer, re-authored from scratch on the new
     doctrine (route -> vawe-type (reference/explainer.md) -> scaffold TYPE=explainer -> engine-doctrine/RULES), counting renders. -->

## Beat 1: hook (0.2s-3.67s)
- type: hook
- blueprint: blurResolveHook
- onscreen: "No timeline. No editor." then "So where's the video?"
- mechanism: the sentence arrives smeared with motion blur and snaps into focus (blur-resolve, mined from three references); the sub line lands after the resolve
- becomes: the empty stage becomes a question
- trigger: the film opens; nothing precedes it
- why: pose the open loop the payoff will close without spoiling it
- duration: 3.47s

## Beat 2: build (3.67s-7.33s)
- type: build
- blueprint: containerFill
- onscreen: a fixed frame fills with the scene file, chip by chip: "module": "scene" · "aspect": "16:9" · "duration": 22 · "layers": [ ... ] · caption "You write a scene."
- mechanism: the frame never moves while its contents fill in one at a time (container fill, mined from four references); the caption rises under it
- becomes: the question becomes a file
- trigger: the hook asked where the video is; the answer starts being written in front of the viewer
- why: show the whole authoring surface, a text file, before naming it
- duration: 3.66s

## Beat 3: proof (7.33s-11s)
- type: build
- blueprint: listBuildRows
- onscreen: rows build under a rule: text · count · image · video / html · svg · component · cursor / shader · three · particles · globe / and 12 more layer types
- mechanism: one row lands after another, the list never resets (row build, mined from pinref shots 11-15)
- becomes: the file becomes its reach
- trigger: the file is written; the viewer needs to know what one file can reach before the payoff claims it is the whole film
- why: earn the payoff with the real vocabulary, 24 layer types, read from the registry
- duration: 3.67s

## Beat 4: proof (11s-14.67s)
- type: build
- blueprint: viewportTrio
- onscreen: one real rendered frame ("Refraction, in CSS.") at three sizes · caption "One scene. Five canvases, from one file."
- mechanism: the same subject at three sizes at once (viewport trio, mined from framer-hero's payoff shot)
- becomes: the reach becomes a picture
- trigger: the rows named the vocabulary; now a real frame proves the file renders, and at every canvas
- why: the show-dont-tell beat: a picture carries the '5 canvases' fact before any line states it
- duration: 3.67s

## Beat 5: payoff (14.67s-18.33s)
- type: benefit_highlight
- blueprint: wordBlast
- onscreen: "One JSON." oversized · then "That's the whole film."
- mechanism: the punch cut lands the oversized word; the line arrives word by word under it
- becomes: the picture becomes the answer
- trigger: the picture proved the file renders; the hook's question is answered in the fewest words
- why: the SPECTACLE and the honest claim, last, at 67-83% of runtime
- duration: 3.66s

## Beat 6: cta (18.33s-22s)
- type: cta
- blueprint: logoReveal
- onscreen: the wave mark draws on · "vawe" · npx vawe scene.json --draft · vawe.dev
- mechanism: the canonical wave path draws itself, the wordmark settles, the command and the address rise
- becomes: the film becomes an address the viewer can type
- trigger: the payoff closed the loop; the only thing left is where to go
- why: one clear next step, one command, one URL, the mark at end-card size
- duration: 3.67s
