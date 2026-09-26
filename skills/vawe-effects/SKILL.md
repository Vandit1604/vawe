---
name: vawe-effects
description: "Lists the full effect arsenal to choose from by need, instead of defaulting to rise+fade: kinetic reveals, living backgrounds, border-beam/shine, shape-morph logos, paint fields (aurora/meteor/matrix), cuts/stings/seams. Load while authoring a scene JSON when an effect must be chosen. Points at the generated `engine-doctrine/EFFECTS.md`."
stage: design
effort: low
---

# vawe-effects: pick from the whole arsenal, don't default

The proven failure: with hundreds of effects available (`make effects` prints the live count), authoring
from a blank JSON still regresses to `rise`+`fade`.
This skill is the map. **Read [`engine-doctrine/EFFECTS.md`](../../engine-doctrine/EFFECTS.md) first** (regenerate with `make effects`);
it is generated from the engine registries, so every effect that exists is listed and nothing is invented.

## Pick by what you need (the mechanism table)

| You need… | Reach for |
|---|---|
| A key line to LAND with motion | a kinetic text preset (`split`+`preset`) or a GSAP char fx (`fx:"charOvershoot"`) |
| A number to read | `{ "type":"count" }` (it counts up) |
| To move between beats | a cut family + at most 1-3 seams; a sting on a background jump |
| To zoom into a product/UI | a `cinematicZoom` seam + `ken` push, or a camera `diveIn` (see `vawe-camera`) |
| A LIVING background | a moving `bg` preset (aurora/constellation/paperShapes) OR a `paint` field |
| A border to glow / a sheen to sweep | the `beam` layer: `{"type":"beam","mode":"border"}` / `"mode":"shine"` |
| A full-canvas animated field | `{"type":"paint","paint":"aurora｜meteor｜matrix｜starfield｜waves"}` |
| A one-shot light bloom on a beat | a `glow` with `"flash":{attack,decay,peak}` (peak ≤0.45) |
| A logo to APPEAR | the `logoReveal` beat, or `{"type":"svg","draw":{...}}` (draws on) / `"morph":{"to":…}` (melts) |
| directed motion for a beat | a recipe (see `vawe-creative` + recipes/README.md) |

## The three per-frame mechanisms (know which one moves)

- **`paint` fields** (`core/surfaces/paint-fx.js`): generative full-canvas, closed-form in t, **can move** (aurora
  drifts, meteor streaks, matrix rains). Author `{"type":"paint","paint":"<name>", ...opts}`.
- **`beam` / `glow` / `svg` layers**: DOM effects driven per frame by their `frame()` hook (border-beam
  angle, sheen position, glow flash envelope, svg draw/morph). Pure in t, dataset-stamped.
- **`canvasFx` / `filter` looks**: baked ONCE, **cannot move** (halftone, dither, colour grades). Static only.

If you want motion, never reach for a `canvasFx`/`filter` and expect it to animate, it is frozen by design.

## Rules

- **Determinism is not the blocker.** Every animated effect here is a pure function of the frame (border-beam
  = conic angle f(n); morph = point-lerp f(n)). You get the premium web-motion look AND parallel rendering.
- **Restraint.** The `effect-soup` gate is the ceiling: one cut family per film, seams reserved for the
  payoff, a background pattern is seasoning (1-2 beats) not wallpaper. The `direction-floor` is the other
  wall (too plain). Directed lives between.
- **Back every claim with the effect on screen** (engine-doctrine/MISTAKES.md value gate). "22 stings" must SHOW stings.

Depth: [`engine-doctrine/CRAFT/DIRECTION.md`](../../engine-doctrine/CRAFT/DIRECTION.md) · snippets: [`engine-doctrine/MOTION-SNIPPETS.md`](../../engine-doctrine/MOTION-SNIPPETS.md) · motion feel: `vawe-animation` · camera: `vawe-camera`.

## Gotchas

- A backtick inside a GLSL comment can silently end the shader source; the render then times out
  with nothing useful in the log instead of a named compile error. `engine-doctrine/MISTAKES.md #308`.
