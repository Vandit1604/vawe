---
message: "five capabilities the engine already ships and nobody could find: anticipate's opt-out, a motion path, a masked line reveal, a physics scatter, a time remap."
audience: "internal: an engine probe proving quality/baselines/reach.json's six unreachable props actually work end to end"
arc: "hook -> payoff"
format: 1920x1080
theme: "themes/default.json"
duration: 19s
angle: "one caption per beat states the mechanism under test, the layer below it is the only thing that demonstrates it: no brand, no narrative, the render itself is the proof."
threads: "each beat swaps the whole field for the next: the same white ground and caption band carry all five so the only variable from beat to beat is the mechanism named"
spectacle: "beat 4, physics: BOOM's own letters scatter outward under real velocity/gravity/friction, each one visibly independent."
not: "no logo, no voice, no music, no camera move, no image: an engine probe for six schema props, not a shipped film"
craft:
    color: "themes/default.json, untouched"
    density: "one caption plus one demonstrating layer per beat, nothing else"
    direction: "restraint: the caption states the mechanism, the layer is the only proof"
    film-structure: "five flat beats, no through-line beyond the caption naming each one in turn"
    layout: "caption fixed top-left every beat; the demo layer owns the rest of the field"
    motion-craft: "beat 1 compares a default entrance wind-up against the same entrance with `anticipate:false`; beat 2 flies a chip along an authored SVG curve (`motionPath`); beat 3 masks three lines in one after another (`splitText`); beat 4 scatters split characters under `physics`; beat 5 speed-ramps a moving line with `timeRemap:\"whip\"`"
    keyed-motion: "beat 5's line rides a plain linear `motion` key; `timeRemap` is what turns the even rate into a whip"
    imagery: "none: type and one rect chip only"
    show-dont-tell: "each beat's claim is its own mechanism name, and the layer under it is the only evidence offered"
    sound: "silent: an engine probe, never a feed"
    transitions: "cut between beats, no seam: nothing here shares content across a boundary"
    captions: "off: the on-screen caption text already states the point"
    typography: "sans across every beat, sized only by legibility at 1920x1080"
---

## Beat 1: anticipate (0s-3.4s)
- type: hook
- mechanism: two `rise` entrances at the same start; the left names none (gets the theme-derived default wind-up from `core/engine/produce.js` `applyAnticipateDefault`), the right sets `anticipate:false` (the opt-out sentinel)
- onscreen: "anticipate: default vs off" / "default wind-up" / "anticipate: false"
- becomes: two identical entrances become a visible pair, one warped and one flat
- why: reach.json's own evidence names this the opt-out nobody could reach; schema.json's `anticipate` type was `number` only, so the boolean sentinel `produce.js` reads threw at validate before the default-stripping code it exists for ever ran
- duration: 3.4s

## Beat 2: motionPath (3.6s-7.0s)
- type: demo
- mechanism: a `rect` chip's `motionPath` (GSAP MotionPathPlugin) flies it along an authored SVG cubic curve, `curviness` and `autoRotate:false` set
- onscreen: "motionPath: fly a chip along an SVG curve"
- becomes: a static chip becomes one that travels a real curved path, not a straight tween
- why: motionPath is real, validated (`films/scene/scene.js:453`) and GSAP-loaded on the literal key, but named nowhere an author would search
- duration: 3.4s

## Beat 3: splitText (7.2s-10.6s)
- type: demo
- mechanism: a three-line text layer's `splitText` masks each line and slides it up from behind on its own stagger (GSAP SplitText, line-level only)
- onscreen: "splitText: masked line reveal" / "One clock / drives every line / on this layer."
- becomes: three static lines become three independently-masked reveals
- why: same absence as motionPath; its only PRIMITIVES.md-adjacent mention was the unrelated internal `split` helper, a false friend for anyone searching the field's own name
- duration: 3.4s

## Beat 4: physics (10.8s-15.0s)
- type: demo
- mechanism: "BOOM" split to chars, `physics` (GSAP Physics2DPlugin) gives each an index-based angle spread, deterministic velocity/gravity/friction scatter
- onscreen: "physics: velocity/gravity/friction scatter" / "BOOM"
- becomes: four stacked letters become an outward, deterministic explosion
- why: real, validated, zero authored uses; the plan's own confirmed example of an unreachable prop
- duration: 4.2s

## Beat 5: timeRemap (15.0s-19.0s)
- type: payoff
- mechanism: a plain linear `motion` key moves "whip" edge to edge; `timeRemap:"whip"` (the named clock shape, `core/timeline/time.js`) turns the even rate into crawl-then-rush-then-land
- onscreen: "timeRemap: the layer's own clock (whip)" / "whip"
- becomes: an even slide becomes a speed ramp, same two motion keys underneath
- why: closes the set. Named shapes exist and are catalogued, but the field itself answers no search for its own name
- duration: 4s
