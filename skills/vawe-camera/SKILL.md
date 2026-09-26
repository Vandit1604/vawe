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

At the scene ROOT (not a layer). It bakes into `data.camera` at load (`bakeCameraMove`,
core/engine/produce.js). Pass an array of specs to chain several moves across the film. Each
generator emits interior `ease:"linear"` automatically for a velocity-continuous path.

**Legs must chain back to back over the film, not just at the start.** A recipe's own camera leg (e.g.
`window-dolly`) JOINS whatever hand-authored `cameraMove` legs the film already has; it does not
replace covering the rest of the film. A film with legs only in its opening seconds holds still (at the
last leg's pose) for everything after. `make choreo` warns (`camera-coverage-floor`) when the resolved
legs cover under 40% of a film over 6s long.

**A move HOLDS its end pose, forever, until another move changes it.** `cameraAt` holds the last
keyframe past its own window; nothing resets the camera at a cut, a recipe seam, or the film's own end.
A `diveIn` to `to:1.6` at 1s-2.6s is still at scale 1.6 at 10s if nothing says otherwise. To return to
the normal frame, author the return as its own leg: `{"move":"slowPush","to":1}` (or any move ending
`to:1` with no `tx`/`ty`), or, off a `window-dolly` recipe, a later one naming `zoomTo:1`.
`make storyboard-check` and `make choreo` both warn (never block) when a later beat plans the
normal/full-frame camera while an earlier push is still open.

## Where to look next

| Task | Read |
|---|---|
| Every move's params and behaviour (`slowPush`, `diveIn`, `travel`, `truck`...), targeting a layer by id | `reference/moves-catalogue.md` |
| Using `travel` as the transition itself, and pairing camera moves with real depth/parallax | `reference/depth-and-transitions.md` |

## Camera-journey doctrine

- **One camera, one journey.** Don't fight cuts with the camera; the camera moves the whole beat as one plane.
  When the camera IS the transition (`travel`, see reference), the right number of cuts is usually zero.
- **Smoothness rule (#125).** A chained ease-in-out pulses (accelerate→stop→accelerate = the "shaking zoom").
  The generators already emit interior `ease:"linear"`; if you hand-write keyframes, do the same on interior ones.
- **Z-budget.** Keep 3D tilt modest (`rx`/`ry` small, ≤ ~15deg) so the composition stays legible; big tilts
  come apart. `perspective` is on the camera root so every layer shares one vanishing point.
- **Vary the verb per leg.** push, then hold, then settle, not three identical pushes. Motion order = story.
- **Calm and calculated beats frantic.** A slow push under a payoff reads premium; a fast whip everywhere reads cheap.

Feel of the easing: `vawe-animation`. Effects to move over: `vawe-effects`. Depth doctrine:
[`engine-doctrine/CRAFT/DIRECTION.md`](../../engine-doctrine/CRAFT/DIRECTION.md).

## Gotchas

- Perspective (`rx`/`ry`/`p`) is a CAMERA property, applied once on the camera root; setting it on a
  layer breaks the shared vanishing point. `engine-doctrine/MISTAKES.md #59`.
- `cameraAt` can ease EVERY segment of a multi-leg move, zeroing velocity at each keyframe and reading
  as a shake instead of one smooth arc; check the eased points, not just the endpoints. `engine-doctrine/MISTAKES.md #128`.
