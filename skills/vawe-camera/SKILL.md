---
name: vawe-camera
description: "Camera moves for a vawe scene: slowPush, diveIn, travel, truck, panFollow, workspaceZoomOut, orbit, multiPhase, plus depth parallax via the plane modifier. Load while authoring a scene JSON when a beat should move the viewer through space, or when the camera itself should be the transition."
codes: no-camera
stage: direct
effort: low
---

# vawe-camera: smooth, calculated camera work

Camera movement contributes as much as any effect. The global camera is `[{t,s,x,y,rx,ry,ease}]`
interpolated by `cameraAt` (`core/timeline/sequence.js`); author it with the calculated generators in
`core/camera-moves/index.js` rather than hand-typing keyframes.

## The sugar

```json
"cameraMove": { "move": "diveIn", "start": 1.0, "dur": 2.2, "tx": 960, "ty": 420, "to": 1.6 }
```

At the scene ROOT (not a layer). It bakes into `data.camera` at load (`bakeCameraMove`, core/engine/produce.js). Pass an array of specs to chain
several moves across the film. Each generator emits interior `ease:"linear"` automatically for a
velocity-continuous path.

**Legs must chain back to back over the film, not just at the start.** A recipe's own camera leg (e.g.
`window-dolly`) JOINS whatever hand-authored `cameraMove` legs the film already has; it does not replace
covering the rest of the film. `recipes/expand.mjs` appends the recipe leg after the hand legs, so a film
with legs only in its opening seconds holds still (at the last leg's pose) for everything after, even
though the plan asked for camera travel throughout. `make choreo` warns (`camera-coverage-floor`) when the
resolved legs cover under 40% of a film over 6s long.

**A move HOLDS its end pose, forever, until another move changes it.** `cameraAt` holds the last keyframe
past its own window; nothing resets the camera at a cut, a recipe seam, or the film's own end. A `diveIn`
to `to:1.6` at 1s-2.6s is still at scale 1.6 at 10s if nothing says otherwise. To return to the normal
frame, author the return as its own leg: `{"move":"slowPush","to":1}` (or any move ending `to:1` with no
`tx`/`ty`), or, off a `window-dolly` recipe, a later one naming `zoomTo:1`. `make storyboard-check` and
`make choreo` both warn (never block) when a later beat plans the normal/full-frame camera while an
earlier push is still open.

## The moves (all in `core/camera-moves/index.js`, all pure, all lib-tested)

- **slowPush** `{from,to,dur}`: a gentle continuous zoom in. The default "the frame is alive" move; keep it
  small (to ≈ 1.08-1.15) under content.
- **diveIn** `{tx,ty,to,dur}`: zoom INTO a target point; it travels to centre as the scale grows (pan math:
  translate by (W/2-tx, H/2-ty) centres at any scale). Pair with a `cinematicZoom` seam for the dive-in feel.
- **panFollow** `{dx,dy,dur}`: the camera translates to track content growing downward (terminal types while
  the camera pans down). Linear, so it tracks at constant speed.
- **workspaceZoomOut** `{from,to,tx,ty,dur}`: start pushed in on a detail, pull back to reveal the whole. The
  opposite of diveIn; a strong opener or a payoff-to-context move.
- **orbit** `{deg,dur,s}`: a gentle 3D swing (ry through 0). Depth for a dimensional beat; keep deg ≤ 15.
- **multiPhase** `{legs:[{dur,s,x,y}]}`, chain legs into one journey (push → hold-with-drift → settle). Interior
  legs stay linear so a "hold" still creeps; only the last leg eases out. Legs are raw x/y DELTAS, if you
  are naming points on the stage, you want `travel`.
- **travel** `{stations:[{tx,ty,s,dur,dwell}]}`. The station-to-station journey, and **the camera move that
  IS a transition**: fly in on element A, cross to element B, pull out to the whole board, one unbroken
  flight. Each station is a point in STAGE coords and the generator does the `W/2 - tx` centring for you.
  Station 0 is where the flight begins (its `dur` is unused), so author the wide shot there to open full-frame.
  Every axis carries forward: a station with only `s` zooms in place, one with only `tx/ty` pans at the scale
  it arrived with. `dwell` holds at a station. Only the final arrival settles.
- **truck** `{dx,dur,s}`: the plain lateral move, linear, so it reads as the camera tracking rather than a lurch.

## Camera by element (no more guessing pixels)

A `diveIn`, or any `travel` station, can name the layer to look at instead of hand-typed `tx`/`ty`:

```json
"cameraMove": { "move": "diveIn", "start": 1.0, "dur": 2.2, "target": "#cta", "margin": 0.1 }
```

`bakeCameraMove` (core/engine/produce.js) resolves `"#<layer id>"` off the layer's own authored box
(it needs a numeric `x`/`y` and a declared `w`/`h` or `size`), centres on it, and picks the largest
scale that still keeps the box plus `margin` (a fraction of the frame, default 0.06) inside the canvas.
It prints what it resolved: `resolved camera target #cta at 3.2s -> tx 960 ty 852 s 1.2`. Raw `tx`/`ty`
on the same spec still win, and a target with no measurable size (a `text` layer with no `w`/`h`) is
refused by name rather than guessed. A `[data-part="..."]` selector needs a live render to measure and
is not resolvable this way; give that camera its `tx`/`ty` by hand.

A `diveIn` whose `to` would push a KNOWN-size target (`targetW`/`targetH`, whether hand-declared or
resolved from a `target`) past the frame no longer refuses: it clamps to the largest scale that keeps
the subject in frame and prints `adapted diveIn-headroom: to 1.05 -> 0.88 (no crop declared)`.
`"crop": true`, or a `headroom` raised above its 0.88 default, is the explicit opt-in that keeps `to`
exactly as authored.

## The camera as the transition (what you asked the cuts to do, done with the lens)

A cut, a sting and a seam are all LOCAL: they own a window around a boundary. The camera is CONTINUOUS and
GLOBAL, and it does not reset at a cut. That is the whole device. Lay the beats out as STATIONS on a canvas
larger than the frame, then let `travel` visit them. The transition is the flight, and there is no cut at all.

Two films here are built this way, and they are the reference: `linear-journey.json` (a 3x2 station grid on
5760x2160, 12 camera keys, **zero** cuts) and `playhead.json` (16s, 20 keys, `s` climbing 1 → 2.66 while `x`
travels 656 → -848). Both hand-typed their keyframes because `travel` did not exist. Do not copy that.

**Pair it with depth or it is a slide, not a move.** Every layer sits at z = 0 unless you say otherwise, and
a camera trucking past a flat plane moves every layer by exactly the same amount: a picture of a scene, not a
scene. Parallax is a DIFFERENCE of depth, so it cannot exist while there is only one depth to have. Stand
layers apart with the `plane` modifier, `"modifiers": [{ "plane": -600 }]` behind, `{ "plane": { "z": 240 } }`
in front. Sign is the CSS one. Measured under a 600px truck at a 1600px lens (`harness/dev/spike-depth.mjs`):

| layer | z | moves |
|---|---|---|
| near | +300 | 738px |
| mid | 0 | 600px |
| far | -900 | 384px |

354px of differential displacement across one move. A layer at depth also changes apparent SIZE, by
`lens / (lens - z)`, and it must: depth without magnification is a translation, not a distance. Author the
layer at the size the distance asks for. `plane` turns the 3D rig on by itself, exactly as `tilt` does.

## Camera-journey doctrine

- **One camera, one journey.** Don't fight cuts with the camera; the camera moves the whole beat as one plane.
  When the camera IS the transition (`travel`, above), the right number of cuts is usually zero.
- **Smoothness rule (#125).** A chained ease-in-out pulses (accelerate→stop→accelerate = the "shaking zoom").
  The generators already emit interior `ease:"linear"`; if you hand-write keyframes, do the same on interior ones.
- **Z-budget.** Keep 3D tilt modest (`rx`/`ry` small, ≤ ~15deg) so the composition stays legible; big tilts
  come apart. `perspective` is on the camera root so every layer shares one vanishing point.
- **Vary the verb per leg.** push, then hold, then settle, not three identical pushes. Motion order = story.
- **Calm and calculated beats frantic.** A slow push under a payoff reads premium; a fast whip everywhere reads cheap.

Feel of the easing: `vawe-animation`. Effects to move over: `vawe-effects`. Depth: [`engine-doctrine/CRAFT/DIRECTION.md`](../../engine-doctrine/CRAFT/DIRECTION.md).

## Gotchas

- Perspective (`rx`/`ry`/`p`) is a CAMERA property, applied once on the camera root; setting it on a
  layer breaks the shared vanishing point. `engine-doctrine/MISTAKES.md #59`.
- `cameraAt` can ease EVERY segment of a multi-leg move, zeroing velocity at each keyframe and reading
  as a shake instead of one smooth arc; check the eased points, not just the endpoints. `engine-doctrine/MISTAKES.md #128`.
