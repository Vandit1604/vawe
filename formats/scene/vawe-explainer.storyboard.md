---
message: "A vawe video is one JSON file: you write a scene, and the engine renders the film."
audience: "developers and technical founders on X / LinkedIn, autoplaying muted in a feed"
arc: "hook -> build -> proof -> payoff -> CTA"
format: 1920x1080
theme: "themes/vawe.json"
duration: 22s
angle: "The file is the film. No dashboard, no timeline: a text file types itself and, on the last beat, becomes the picture. The engine demonstrates itself."
threads: "a ONER with no cuts, matching the reference (refs/pinref: 45s, no hard cut). Held by a CONTINUOUS OBJECT: the scene JSON panel, born in beat 2, slides aside and shrinks while its reach counts up, and at 14s BECOMES the rendered frame, which carries the spine to the end card + a living field: three brand-colour blobs (cobalt, ice-blue, green) drift on keyed tracks and shift hue per phase, so the world turns without a cut + a bookend: the hook asks where the video is, the payoff answers: it is the file"
spectacle: "beat 4 (payoff) · the JSON panel · a `becomes` handover: the text file turns into a rendered picture while the cobalt blob swings in behind it. Every other beat stays restrained: type arriving on a light, slowly drifting field."
not: "no dashboard, no cursor clicking a UI, no gradient hero, no texture or dots on the field, no stock photos, no VO, no Inter, no centered slide deck, no emoji"
craft:
    color: "the palette is themes/vawe.json, derived from the real site (white-first, one cobalt accent); the reference's mint off-white becomes the brand's own #f6f8fb, nothing invented"
    density: "each beat carries one hero (the sentence, the file, the numbers, the picture, the mark) with a small support line and no metadata clutter, on purpose: the reference is whitespace-first and so is the brand"
    direction: "restraint everywhere except beat 4: the hook is one sentence arriving word by word on an empty field, and the one loud moment is the file becoming the picture"
    layout: "asymmetric, one hero per frame: the hook sits low-left like the reference, the file lives in the left half with active empty space right, the numbers build left while the file waits right, the picture is off-centre"
    motion-craft: "the panel rides a hand-keyed track (shrinks aside on the cut into beat 3, becomes the picture on the cut into beat 4); the theme's motion personality (easeOutExpo, fast exits) governs every arrival"
    keyed-motion: "one authored track on the continuous object, four keys, and a `becomes` handover the engine computes; nothing else is keyed, on purpose"
    imagery: "the payoff picture is a real vawe-rendered frame (assets/brands/vawe/stills/glass-hero.png, the REFRACTION glass-lens effect from vawe-glass-hero), not a recreated lookalike, and it is brand-pure: ink, white, and an optical fringe, no second accent; the proof counts 693 effects and the file becomes one of them; the end card draws the canonical wave mark"
    show-dont-tell: "the claim 'one JSON is the whole film' is not set in type first: the file visibly BECOMES the picture, then the line lands"
    sound: "cues only, no bed: the feed autoplays muted, so the film must read silent; with sound on, the type arrivals tick and the match cut carries one hit"
    captions: "no captions: there is no VO, the film is silent-first for a muted feed, and every line is already on-screen type at reading size; there is nothing to caption and no safe strip to respect at 16:9 on X / LinkedIn"
    typography: "Anybody, the site's real face, for every display line (chosen for its wdth+wght range, not a default), and JetBrains Mono for the file and every number; one scale held across beats: 88 hook, 150 counts, 64 payoff, 40 captions, 30 labels, 120 wordmark"
    transitions: "none: a oner, matching the reference, which has no hard cut in 45s. Every phase change is carried by motion instead: the panel slides aside (into the proof), the panel BECOMES the picture (into the payoff), the picture defocuses while the mark draws on (into the end card). No effect is sprayed on a seam because there are no seams"
---

<!-- Transcribed from the LOCK SHEET signed off in session (16:9, payoff "One JSON. That's the whole film.").
     Composed to the shape of formats/scene/saas-hero-launch.json (a white-first SaaS launch, hook to CTA).
     Reference: a kinetic-type crypto SaaS explainer (Pinterest), read from its cover frame: one word low-left on a pale field. -->

## Beat 1: hook (0s-4s)
- type: hook
- blueprint: kinetic type, hand-authored (split: word)
- onscreen: "No timeline. No editor. So where's the video?"
- mechanism: one sentence arrives word by word, low-left, on an empty flat field; the strong word first
- becomes: the empty stage becomes a question
- trigger: the film opens; nothing precedes it
- why: pose the open loop the payoff will close, without spoiling it: the viewer is told what is missing and asked where the video is
- duration: 4s

## Beat 2: build (4s-9s)
- type: build
- blueprint: typing text, hand-authored (the continuous object is born)
- onscreen: the scene JSON types itself: "module": "scene", "duration": 22, "layers": [ ... ] · caption "You write a scene."
- mechanism: a mono text layer with `typing`, left half, on the flat field; the caption rises under it
- becomes: the question becomes a file
- trigger: the hook asked where the video is; the answer starts to be written, literally, in front of the viewer
- why: show the whole authoring surface: it is a text file, and you can read every line of it
- duration: 5s

## Beat 3: proof (9s-14s)
- type: build
- blueprint: count layers, hand-authored (the panel shrinks aside on its keyed track)
- onscreen: 24 layer types · 693 effects · 56 families · 22 gates · caption "Zero templates."
- mechanism: the file slides right, shrinks and tilts into perspective (a state change, no cut); four counts build in a 2x2 on the left, staggered, while the green blob swings in behind them
- becomes: the file becomes its reach
- trigger: the file is written; the viewer needs to know what that one file can reach before the payoff claims it is the whole film
- why: earn the payoff with true figures, read live from the registry; without this beat "one file" sounds like a limitation
- duration: 5s

## Beat 4: payoff (14s-19s)
- type: benefit_highlight
- blueprint: match cut (`becomes`), hand-authored
- onscreen: the panel becomes a rendered frame ("Refraction, in CSS. one displacement map." with the glass lens off the letters over the dark split, a real vawe effect frame) · "One JSON. That's the whole film."
- mechanism: `becomes` carries the panel's final pose onto the picture, which opens there and settles into its own geometry with a slow ken push; the cobalt blob swings in behind it so the field turns without a cut; "One JSON." lands in cobalt, then "That's the whole film." in ink, word by word at ~17s
- becomes: the file becomes the picture
- trigger: the numbers said what the file reaches; now the file itself turns into the thing it reaches, and the hook's question is answered
- why: the SPECTACLE, and the honest claim: the viewer watches the text file become a picture, then reads the line; the best fact lands last, at 77-82% of runtime
- duration: 5s

## Beat 5: cta (19s-22s)
- type: cta
- blueprint: end card, hand-authored (the wave mark draws itself, the wordmark types)
- onscreen: the wave mark · "vawe" · npx vawe scene.json --draft · vawe.dev
- mechanism: the canonical wave draws on (`draw` preset), the wordmark types out (the README's own claim), the command and the address rise
- becomes: the film becomes an address the viewer can type
- trigger: the payoff closed the loop; the only thing left is where to go
- why: one clear next step with zero risk: one command, one URL, the mark at end-card size
- duration: 3s
