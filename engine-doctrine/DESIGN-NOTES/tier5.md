---
when: you want an effect the engine refuses to ship
answers: the effects blocked on a determinism story, and what each would cost to unblock
group: engine
---

# Tier 5 design notes: the effects blocked on a determinism story

These are not "hard", they are **unsolved for this engine**: shipping them naively breaks the one
invariant the product is built on: `renderFrame(n)` is **pure in n** (same input, same bytes, any
order, so frames can shard across tabs/machines). `make probe` is the judge. This note is the required
gate before any Tier 5 line of code (ROADMAP: "Everything in Tier 5 gets a design note first").

The test each idea must pass: **can frame 412 be computed without first computing frames 0..411, using
no wall clock and no unseeded randomness?** If not, it needs one of the carve-outs below.

## The three carve-outs (in increasing cost)
1. **Closed-form**: re-derive the effect as a pure function of n. Cheapest, keeps full frame-sharding.
   Works when motion has an analytic form (a spring settle, a sine, a bell). Most Tier 3 shaders and the
   Tier 2 canvas passes already live here (the canvas passes go further: baked ONCE at build → static).
2. **Baked buffer keyed by frame**: precompute the per-frame state offline into an asset the scene
   reads by n (no stepping at render time). Keeps sharding. This is how audio-reactivity should ship.
3. **In-order render carve-out**: a declared "these layers render sequentially" escape hatch. Correct
   but **costs frame sharding** for any scene that uses it (the renderer can no longer split the frame
   range across workers). Reserve for sims that have no closed form and no practical bake.

## Per-family notes

### Audio-reactive (recommended first: highest value, cleanest determinism)
Beat-driven scale/flash, spectrum bars, kick-triggered glitch. **Pure-in-n is achievable via carve-out
2**: FFT the track OFFLINE (a build step, `scripts/`), bake per-frame frequency bins + onset flags into
the scene JSON (or a sidecar keyed by n), and let layers read `bins[n]` at render time. No stepping, no
clock: a pure lookup. This is a **pipeline feature, not an effect**, and a good one: it makes music
videos trivial. Shape (proposed, not built): `make audio-bake IN=track.wav` → `{ fps, bins:[[...]], onsets:[n,…] }`; a
`reactive` binding on any numeric prop (`scale`, `intensity`) samples it. Ship this before any sim.

<!-- doc-refs-allow: make audio-bake · a target this note proposes, deliberately not built yet -->

### Particle / fluid sims (smoke, fog, ink diffusion, reaction-diffusion, boids, disintegration)
Iterative by nature, state at n depends on n-1. Options, best-first:
- **Closed-form particles** (carve-out 1): give each particle an analytic path `p(n) = f(seed, n)`
  (ballistic + noise field sampled at n, not integrated). Covers confetti/embers/sparks/starfields,
  already how the `confetti`/`bokeh` stings work. Enough for most "particle" asks; do this, not a sim.
- **Baked buffer** (carve-out 2): precompute the sim offline to a frame-indexed sprite/flow sheet.
  Good for a fixed hero sim (one fluid plume); bad for anything parameterised per scene.
- **In-order carve-out** (carve-out 3): only for true fluid/reaction-diffusion with no closed form.
  Gate it behind an explicit `simOrder: true` scene flag that disables sharding for that render, and
  document the cost. Not worth it until a showcase demands it.

### True motion blur
Sub-frame accumulation: render k sub-frames per output frame and average. This is a **render-pipeline
change** (the Go side + boot's frame loop), not a shader. It multiplies render time by k. Pure in n
(each sub-frame is n + j/k, still a pure function), so it does NOT need a carve-out, only cost tolerance.
The per-layer `motionBlur` we ship today is the cheap velocity-streak approximation; real accumulation is
a separate opt-in (`--subframes k`). Build when a showcase needs buttery 24fps slow-mo, not before.

### Depth estimation (2.5D parallax from a flat photo)
Needs a monocular-depth model in the pipeline (offline): bake a depthmap asset next to the image, then a
pure `parallax` layer displaces by depth × camera-offset(n). Determinism is fine (baked depth + pure
camera); the cost is a model dependency in the asset pipeline, not the renderer.

### Chroma / luma / difference key
Per-pixel and trivially pure. The real question is **where source video enters a scene at all**. The
`clip` layer (frame-sequence manifests) is the entry point; a key would be a canvas pass over clip
frames (like `canvasFx`, but per-frame on a clip rather than baked once). Deterministic if the clip
frames are static assets. Small, buildable when a scene needs to composite footage.

## Verdict / order
1. **Audio-bake**: pipeline feature, clean determinism, unlocks music videos. First.
2. **Closed-form particles**: covers 80% of "particle" requests with zero determinism risk.
3. **Clip key**: small, once footage compositing is actually needed.
4. **Sub-frame motion blur**: cost-gated, no determinism issue; on demand.
5. **Baked/in-order sims, depth**: last, and only when a showcase can't be built without them.
