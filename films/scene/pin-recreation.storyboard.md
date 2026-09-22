---
message: "One box can hold the whole six seconds: a scene brief typed in, and nothing else moving."
audience: "engine reviewers judging whether vawe can hold restraint, not just spectacle"
arc: "one continuous action: an empty scene-brief pill sits still, becomes a pill holding a typed scene description, and becomes a lit, held box with the brief inside it, payoff withheld"
threads: "a transforming object (the scene-brief pill) plus one open question: what will vawe render from this brief? the last frame never answers it"
object: "the vawe scene-brief pill"
object_t0: "a narrow, empty rounded pill, centered low in the frame, placeholder text only"
object_states: "at the turn: the pill widens and grows a second line as a one-line scene brief types into it, and gains a soft violet glow at its border"
object_last: "the same pill, now holding the full typed brief, glow settled, held completely still. no render shown."
format: 1920x1080
theme: "themes/default.json"
duration: 6.04s
spectacle: "the pill's own expansion and border glow as the brief finishes typing, the one moment in six seconds where anything moves fast"
not: "no camera move, no second surface, no cut, no logo card, no CTA, no centered slide-deck layout beyond the one pill itself"
craft:
    color: "near-black ground (#141414-ish), one eyedropped violet/magenta haze as atmosphere, never a subject"
    density: "one hero (the pill) with its own heading above it as support; no metadata row, this film is intentionally sparse"
    direction: "restraint is the whole film: 0.21-0.25 delta everywhere except the write beat, which alone should read as loud"
    film-structure: "a single continuous object across three states (empty, writing, held) holds the film, not a cut"
    layout: "the pill sits low-center on an otherwise empty, asymmetric dark field; nothing else claims the frame"
    motion-craft: "the pill's width/height and border glow are hand-keyed off the measured reference timing (about 1.8s to 3.5s), no preset fired once and left alone"
---

<!-- Recreation benchmark: motion grammar only (one continuous shot, one event near the 35% mark,
     median frame delta ~0.23, dark-dominant, accent-as-atmosphere) taken from
     refs/pin-890657263828171584.mp4 (grammar/pin-prompt-expand.json). Subject, copy, layout and
     brand are ours: vawe's own scene-brief pill, not the reference's product or wording. -->

## Beat 1: Empty (0s-1.8s)
- type: hook
- object: the pill fades up empty, centered low, with a heading held above it
- onscreen: "Describe the shot."
- mechanism: heading and pill both fade in over the first ~0.6s (opacity only, no slide), then hold completely still; background haze keeps drifting underneath
- becomes: the bare dark field becomes the heading and the empty pill
- trigger: the film opens; nothing before it
- why: name the surface, then go still, so the write beat has something to be loud against
- duration: 1.8s

## Beat 2: Write (1.8s-3.9s)
- type: product_surface
- object: the pill widens and grows a second line as a scene brief types into it; a soft violet glow rises on its border as it settles
- onscreen: "a slow dolly into a rain-lit street, neon signs reflecting in the wet asphalt"
- mechanism: the brief types character by character at a measured rate (not instant); the pill's width and height track the growing text (CSS var morph, matching the reference's measured box-grow timing); the border glow ramps in as the box reaches its held size
- becomes: the empty pill becomes a pill holding a typed scene brief, lit at its edge
- trigger: the empty pill has held long enough to read as waiting; the brief starts because the wait is now the point
- why: this is the one real event in the film. everything before and after is quiet so this reads as loud
- duration: 2.1s

## Beat 3: Hold (3.9s-6.04s)
- type: payoff_withheld
- object: the same pill, now full, glow settled, completely still
- onscreen: "a slow dolly into a rain-lit street, neon signs reflecting in the wet asphalt"
- mechanism: no motion at all beyond the drifting background haze; camera and pill both hold
- camera: hold
- eye: the pill's border glow -> holds, nothing else to pull it -> the pill as a whole, left to sit
- becomes: the writing pill becomes a held, finished pill. the brief sits there, unrendered
- trigger: the brief has finished typing; the box has nothing left to grow into
- why: withhold the payoff. the viewer's curiosity (what will this become?) is highest right here, and the film ends before answering it
- duration: 2.14s
