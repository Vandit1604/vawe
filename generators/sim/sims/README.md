---
when: reaching for a physics or particle simulation inside a beat
answers: the simulation harness, what it guarantees about determinism, and how a sim reaches the frame
group: engine
---

# `generators/sim/sims/`: stateful simulation, baked offline

`renderFrame(n)` is a pure function of `n`. Eight workers render frames in arbitrary order and the
bytes must match. A simulation is the opposite of that: it is iterative, frame 412 exists only
because frames 0..411 ran first. The two cannot share a process.

So they do not. A sim runs **offline, in its own process, in frame order, as stateful as it likes**,
and emits a PNG frame sequence. The scene plays that sequence back through the existing `clip` layer,
which preloads a manifest and swaps an `<img>` src per frame. Non-determinism is confined to bake
time; the renderer keeps exactly one contract.

This is the same shape as two things already in the repo: `core/canvas/effects.js` bakes a per-pixel image
pass once at boot, and `make spectrum` bakes FFT band energy to a per-frame table the render reads by
row.

```bash
make sim D=generators/sim/sims/ember-burst.mjs WRITE=1     # bake → assets/baked/ember-burst/
make sim-audit                              # seeded? bake fresh? sequence intact?
```

## The module contract

A sim is an ES module in `generators/sim/sims/`. Everything is a plain export:

```js
export const dims   = { w: 900, h: 900 };  // pixel size of the emitted PNGs
export const fps    = 30;                  // frames per second the sequence is authored at
export const frames = 90;                  // how many frames to emit
export const seed   = 0x5EED;              // the seed. Change it and you get a different bake.

export function setup(ctx) {}              // build initial state. Called once, before frame 0.
export function step(ctx, i) {}            // advance state by ONE frame. i = 0..frames-1.
export function draw(ctx) {}               // paint the CURRENT state onto ctx.g.
```

The runner calls `setup`, then for each frame `step(ctx, i)` followed by `draw(ctx)`, then writes the
canvas out. `step` and `draw` are split so that "advance the world" and "look at the world" stay
separable: a sim that draws inside `step` still works, but cannot be re-rendered at a different size
without re-simulating.

### `ctx`

| field | what it is |
|---|---|
| `ctx.g` | the destination `CanvasRenderingContext2D`, `dims.w × dims.h`, cleared to transparent before each `draw` |
| `ctx.W`, `ctx.H` | `dims.w`, `dims.h` |
| `ctx.fps`, `ctx.frames`, `ctx.seed` | as exported |
| `ctx.rng` | a seeded PRNG (`generators/sim/sims/lib/rng.mjs`), already constructed from `seed` |
| `ctx.state` | yours. Put particles, grids, buffers here. |
| `ctx.frame` | the index most recently passed to `step` |

`ctx.g` is cleared to **transparent** before every `draw`, not to a colour. A baked sequence composites
over whatever the scene puts behind it, which is what makes one bake reusable across videos.

### What a sim MAY do

Hold state across frames. Accumulate into an `OffscreenCanvas` and read it back next frame. Integrate
physics, advect a fluid, resolve collisions, run 400 sub-steps per frame. All of it. That is the
entire point of moving the work offline.

### What a sim MUST NOT do

- `Math.random()`, use `ctx.rng` (or `rng(seed)` from `generators/sim/sims/lib/rng.mjs`).
- `Date.now()`, `new Date()`, `performance.now()`: a bake that depends on when it ran is not a bake.
- `crypto.getRandomValues()`, same reason.

`make sim-audit` fails on all of these by static scan, because the failure mode otherwise is silent:
the sequence still renders, still plays, and simply differs every time somebody re-bakes it.

## Playback

The baker writes both files the two consumers need:

- `manifest.json`, `{fps, w, h, count, frames: [url…]}`, the shape `core/engine/boot.js` preloads and
  `core/layers/clip.js` plays. Author it straight into a scene:

  ```json
  { "type": "clip", "src": "/assets/baked/ember-burst/manifest.json",
    "x": 90, "y": 300, "w": 900, "start": 1.0, "duration": 3.0 }
  ```

  The clip layer derives its own frame index from `t`, `manifest.fps` and `speed`, so nothing in the
  scene has to restate the frame count. `loop: true` wraps; without it the last frame holds.

- `meta.json`: provenance. fps, count, dims, seed, and a SHA-256 of the sim source **and every local
  module it imports**. `make sim-audit` recomputes that hash and fails if it moved, because a bake
  that silently keeps playing the frames of a sim you have since edited is the exact shape of failure
  this repo keeps writing gates against.

## Shipped sims

| file | what it looks like |
|---|---|
| `ember-burst.mjs` | a burst of embers thrown outward and dragged down by gravity, cooling white → amber → ash, with velocity-stretched trails |
| `ink-bloom.mjs` | ink dropped into water: a semi-Lagrangian advected density field curling outward on a divergence-free noise flow |
| `shatter.mjs` | a panel disintegrating, shards taking an impulse from the point of impact, tumbling and falling out of frame |
