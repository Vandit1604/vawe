---
when: implementing or changing a motion primitive, layer type, background, transition or any other
  named engine capability
answers: "what core/ is: the JS motion/layout/effect library renderFrame(n) reads; one subfolder per capability family"
group: engine
---

# core/

The engine's own vocabulary: one subfolder per capability family (`layers/` the layer types `ls core/layers/` lists,
`kinetic/` text presets, `camera-moves/`, `transitions/`, `backgrounds/`, `type/`, `color/`, `layout/`,
`audio/`, and more). Every effect in the engine composes from what is here; nothing bypasses it with a
private code path (`AGENTS.md`, "EVERY EFFECT COMPOSES; NONE IS A SPECIAL CASE").

Read by: the renderer, which calls `renderFrame(n)` and expects a pure function of `n` with no
Date/random; and any agent naming an effect before building it.

The one doc: `AGENTS.md` for the composition rule, `engine-doctrine/CODEMAPS/ARCHITECTURE.md` for the
system map. Checked by: `make check GATE=probe` (structural purity), `make check GATE=canvas-purity` (pixel purity for
canvas/shader layers), `core/validate/validate.mjs` (the built-in rules run on every scene).

Look first: `engine-doctrine/CODEMAPS/ARCHITECTURE.md`, then the subfolder matching the capability.
