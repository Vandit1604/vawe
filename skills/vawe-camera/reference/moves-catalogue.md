# The moves (all in `core/camera-moves/index.js`, all pure, all lib-tested)

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
