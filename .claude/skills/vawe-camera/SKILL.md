---
name: vawe-camera
description: "Add smooth, calculated camera movement to a vawe scene: slowPush, diveIn (zoom into a target), panFollow (terminal types while the camera pans down), workspaceZoomOut, orbit, multiPhase. Load while authoring a scene JSON when a beat should move the viewer through space. Uses the pure generators in core/camera-moves.js via the cameraMove sugar, and enforces the velocity-continuous multi-keyframe rule (#125)."
---

# vawe-camera — smooth, calculated camera work

Camera movement contributes as much as any effect. The global camera is `[{t,s,x,y,rx,ry,ease}]`
interpolated by `cameraAt` (`core/sequence.js`); author it with the calculated generators in
`core/camera-moves.js` rather than hand-typing keyframes.

## The sugar

```json
"cameraMove": { "move": "diveIn", "start": 1.0, "dur": 2.2, "tx": 960, "ty": 420, "to": 1.6 }
```

At the scene ROOT (not a layer). `make expand` turns it into `data.camera`. Pass an array of specs to chain
several moves across the film. Each generator emits interior `ease:"linear"` automatically for a
velocity-continuous path.

## The moves (all in `core/camera-moves.js`, all pure, all lib-tested)

- **slowPush** `{from,to,dur}` — a gentle continuous zoom in. The default "the frame is alive" move; keep it
  small (to ≈ 1.08-1.15) under content.
- **diveIn** `{tx,ty,to,dur}` — zoom INTO a target point; it travels to centre as the scale grows (pan math:
  translate by (W/2-tx, H/2-ty) centres at any scale). Pair with a `cinematicZoom` seam for the dive-in feel.
- **panFollow** `{dx,dy,dur}` — the camera translates to track content growing downward (terminal types while
  the camera pans down). Linear, so it tracks at constant speed.
- **workspaceZoomOut** `{from,to,tx,ty,dur}` — start pushed in on a detail, pull back to reveal the whole. The
  opposite of diveIn; a strong opener or a payoff-to-context move.
- **orbit** `{deg,dur,s}` — a gentle 3D swing (ry through 0). Depth for a dimensional beat; keep deg ≤ 15.
- **multiPhase** `{legs:[{dur,s,x,y}]}` — chain legs into one journey (push → hold-with-drift → settle). Interior
  legs stay linear so a "hold" still creeps; only the last leg eases out.

## Doctrine (another engine camera-journey, adapted)

- **One camera, one journey.** Don't fight cuts with the camera; the camera moves the whole beat as one plane.
- **Smoothness rule (#125).** A chained ease-in-out pulses (accelerate→stop→accelerate = the "shaking zoom").
  The generators already emit interior `ease:"linear"`; if you hand-write keyframes, do the same on interior ones.
- **Z-budget.** Keep 3D tilt modest (`rx`/`ry` small, ≤ ~15deg) so the composition stays legible; big tilts
  come apart. `perspective` is on the camera root so every layer shares one vanishing point.
- **Vary the verb per leg.** push, then hold, then settle — not three identical pushes. Motion order = story.
- **Calm and calculated beats frantic.** A slow push under a payoff reads premium; a fast whip everywhere reads cheap.

Feel of the easing: `vawe-animation`. Effects to move over: `vawe-effects`. Depth: [`docs/CRAFT/DIRECTION.md`](../../../docs/CRAFT/DIRECTION.md).
