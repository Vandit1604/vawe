---
message: "Halyard: the knot that holds."
audience: "anyone who would watch a studio's own bumper before its reel: a postable sting, judged in half a second"
arc: "one move: gather, draw, resolve. No hook/build/payoff structure at all"
format: 1920x1080
theme: "themes/mercury.json"
duration: 6.5s
angle: "Mercury's near-black graphite, ivory-on-onyx, one cobalt accent, zero-bounce motion by default is the register for a single decisive move: nothing overshoots except the one deliberate snap this film authors on purpose, so that snap reads as the whole point rather than as house style. `bg` is written literal black per AGENTS.md's BLACK MEANS #000000, since a sting's black is a stated brief, not the theme's own tinted graphite."
threads: "the eye-splice mark as a continuous object across both beats, and a bookend (open on an empty black field, close on the mark named and signed)"
object: "the Halyard eye-splice mark"
object_t0: "an undrawn outline, invisible on the black field"
object_states: "at 1.2s it has drawn on, coiled and snapped through its anticipation, and resolved as a held cobalt outline"
object_last: "breathing at 1.0 to 1.03 scale under its own wordmark and descriptor, the studio's mark signed and named"
spectacle: "the anticipation snap at 0.42-0.68s: the mark coils to 0.82 scale, holds, then springs to a 1.06 overshoot on easeOutBack and settles to 1.0, all while the stroke is still drawing itself on. That is the one exaggerated moment; everything else (the wordmark, the tagline) only fades"
not: "no second beat, no cuts, no build sequence, no gradient, no hardcoded hex, no music bed under the type (one cue is the whole sound decision here), no slogan beyond the one descriptor line"
craft:
    color: "themes/mercury.json untouched: var(--accent) for the mark, var(--text) for the wordmark, var(--dim) for the descriptor, all on a literal true-black bg per BLACK MEANS #000000"
    density: "three layers, one subject: the mark is the picture, the wordmark and descriptor are the only text"
    direction: "restraint is the device everywhere except the one snap: one hand-keyed scale/rotation track on one layer carries the whole film's motion"
    film-structure: "none held across a cut, because there is no cut: under 8s the no-continuous-object floor does not fire (skills/vawe-type/reference/sting.md)"
    layout: "centered on the canvas, mark above, wordmark and descriptor stacked below on the same axis: the eye moves down once and stops"
    motion-craft: "a hand-keyed motion track carries anticipation (coil at 0.82 scale, hold, snap to 1.06 on easeOutBack, settle to 1.0 on easeOutCubic, all inside 0.68s) ahead of the mark's own draw-on completing at 1.2s, then a barely-there 1.0-to-1.03 breathe on easeInOutSine through the hold. Not a named preset: AUTHOR THE MOTION"
    keyed-motion: "the anticipation-then-settle track is the one hand-keyed motion in the film; the coil-to-snap segment is dense enough (0.2s) that a curve, not a linear chain, is the right call because it is a physical spring, not a mechanical drag"
    imagery: "the mark itself is the only picture: an inline svg path (d + viewBox), never a rasterised file (engine-doctrine/RULES/svg-inline.md)"
    show-dont-tell: "n/a at this length: a sting shows the mark, it does not argue a claim"
    sound: "one cue: `swell` (audio.cues[0], t=0.4, gain=0.7) rides the coil-and-draw and collapses on its own decay exactly as the stroke finishes resolving at ~1.2s, so the anticipation is felt as well as seen and the landing has a real sound decision behind it, not silence by default"
    transitions: "none: one beat, no seam to author"
    captions: "n/a: no speech, no claim in need of a caption"
    typography: "wordmark at weight 560, intermediate rather than bold per mercury's own note; the descriptor drops to the theme mono at low emphasis"
---

<!-- films/scene/post-halyard.json: a postable sting for the fictional studio Halyard. Keeps the
     eval fixture's eye-splice mark (quality/runs/evals/briefs/sting.json) because it is a genuinely apt
     rope-studio mark, but corrects the eval's own missing anticipation (School of Motion's twelfth
     animation principle, standard in logo reveals) and gives the landing a real sound cue instead of
     staying mute. One continuous shot, no cut: these two beats are the same take's two narrative
     halves (the JSON authors no transition between them), not two shots stitched together.
     Do not edit quality/runs/evals/**: that fixture is the frozen measuring instrument. -->

## Beat 1: the gather (0s-1.2s)
- type: sting
- blueprint: hand-keyed anticipation track on an svg draw-on (no blueprint fits a coil-and-snap; this is
  the authored-motion register KEYED-MOTION.md argues for, not a preset)
- onscreen: the Halyard mark coiling to 0.82 scale, holding, then snapping to a 1.06 overshoot as its
  stroke draws itself on
- mechanism: from 0 to 0.68s the mark coils to 0.82 scale, holds briefly, then springs to a 1.06
  overshoot on easeOutBack and settles to 1.0 on easeOutCubic. This anticipation runs concurrently with
  the stroke's own draw-on (1.0s), so the snap reads as the shape gathering itself into its own reveal
  rather than as a stutter before motion starts. A `swell` cue (t=0.4) builds under the coil and draw
  and collapses on its own 22ms decay exactly as the stroke finishes, landing the sound with the mark.
- becomes: an empty black field becomes the drawn, resolved eye-splice mark, held as a cobalt outline
  (a filled resolve would drop the line, which has no area of its own, to a bare dot)
- object: undrawn at 0s, coiling and drawing through the beat, resolved as a held outline by 1.2s
- trigger: the film opens; there is nothing before it
- why: the anticipation makes the one arrival land as a considered gesture instead of a flat reveal,
  and the sound cue makes that landing felt as well as seen
- duration: 1.2s

## Beat 2: the settle (1.2s-6.5s)
- type: sting
- blueprint: staggered fade-in over a held subject (no second move: the mark itself only breathes)
- onscreen: "Halyard" fading in below the resolved mark, then "the knot that holds" fading in below that,
  while the mark breathes very slightly through to the end
- mechanism: the wordmark fades in at 1.3s, the descriptor at 1.6s, both on a 0.5s fade; the descriptor
  fades back out at 5.6s so the film's last second holds only the mark and its name, not three lines
  of type; the mark's scale drifts 1.0 to 1.03 on easeInOutSine so the hold does not read as a freeze-frame
- becomes: the resolved mark alone becomes the mark named and signed off, the wordmark and descriptor
  reading as the credit under a still-alive shape
- object: held, breathing 1.0 to 1.03 scale, unchanged in shape while its name settles in beneath it
- trigger: the mark's draw-on and anticipation finish resolving at 1.2s
- why: a sting's job is brand recognition inside 8 seconds, and the name has to register once the
  mark has already earned the eye's attention, not compete with it
- duration: 5.3s
