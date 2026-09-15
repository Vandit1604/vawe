---
message: "Halyard: a small studio, held taut."
audience: "the doctrine's own before/after harness (engine-doctrine/EVALS.md); nobody signs off on a fixture"
arc: "one move, no hook/build/payoff at all"
format: 1920x1080
theme: "themes/mercury.json"
duration: 6.0s
angle: "Mercury's near-black graphite canvas, ivory-on-onyx, one cobalt accent, and motion tuned to zero bounce is the register a single decisive move needs: nothing overshoots, so the one move reads as considered rather than springy. `bg` is still written literal `black` per AGENTS.md, since a sting's black is a stated brief, not the theme's own tinted graphite."
threads: "none: a single continuous beat has nothing to hand off across, so `engine-doctrine/CRAFT/PER-SCENE-FANOUT.md`'s contract (object_in/object_out chaining across beats) does not apply here"
spectacle: "the mark: a taut line resolving into a spliced loop, stroke-drawn then filled, breathing very slightly at the very end so the hold does not read as a freeze-frame"
not: "no cuts, no second beat, no slogan beyond the one descriptor line, no gradient, no hardcoded hex (every colour is a theme var), no stagekit/contract/scenes fan-out (one scene, nothing to fan out per PER-SCENE-FANOUT.md's own overkill clause)"
craft:
    color: "themes/mercury.json untouched: var(--accent) for the mark, var(--text) for the wordmark, var(--dim) for the descriptor, all on a literal true-black bg per BLACK MEANS #000000"
    density: "three layers, one subject: the mark is the picture, the wordmark and descriptor are the only text"
    direction: "restraint is the whole device: one hand-keyed scale track on one layer, nothing else moves independently"
    film-structure: "none held across a cut, because there is no cut: a sting under 8s needs no continuous-object waiver (`no-continuous-object`'s floor does not fire under 8s, skills/vawe-type-sting/SKILL.md)"
    layout: "centered on the canvas, mark above, wordmark and descriptor stacked below it on the same axis: the eye moves down once and stops"
    motion-craft: "draw-on (1.3s) doubles as the entrance; a hand-keyed scale track (0.7 to 1.0 on easeOutExpo, matching the theme's own easing, then a barely-there 1.03 breathe on easeInOutSine) is the authored motion, not a named preset"
    keyed-motion: "the mark's scale track is the one hand-keyed motion in the film, per AUTHOR THE MOTION. DO NOT NAME IT"
    imagery: "the mark itself is the only picture: an inline svg path, never a rasterised file (engine-doctrine/RULES/svg-inline.md)"
    show-dont-tell: "n/a at this length: a sting shows the mark, it does not argue a claim"
    sound: "silent, waived: one cue could carry the mark's resolve, but this fixture stays a liveness proof, not a sound decision (engine-doctrine/CRAFT/SOUND.md)"
    transitions: "none: one beat, no seam to author"
    captions: "n/a: no speech, no claim in need of a caption"
    typography: "wordmark at weight 560, intermediate rather than bold, because mercury's own note says the theme's type never goes bold; the descriptor drops to the theme mono at low emphasis"
---

<!-- quality/runs/evals/briefs/sting.json: the thinnest of the six eval briefs (engine-doctrine/EVALS.md), and the
     worked example skills/vawe-type-sting/SKILL.md points to. One beat, on purpose. -->

## Beat 1: the move (0s-6s)
- type: sting
- onscreen: the Halyard mark, then "Halyard", then "small studio. held taut."
- mechanism: the mark's line-and-loop draws on stroke by stroke over 1.3s and holds as a cobalt outline
  (a filled resolve would drop the line, which has no area of its own, down to a bare dot), scaling in
  from 0.7 to full size on a hand-keyed track (easeOutExpo, matching the theme);
  the wordmark and descriptor fade in behind it, staggered by 0.8s, while the mark holds and breathes
  very slightly (scale 1.0 to 1.03) through to the end
- becomes: an empty black field becomes the resolved mark
- trigger: the film opens; there is nothing before it
- why: the whole job of a sting is brand recognition inside 6 seconds, so the mark needs real size,
  real time on screen, and one considered arrival, not a build
- duration: 6.0s
