---
when: implementing or changing a motion primitive, an audio voice, a layout helper or any other named engine capability
answers: "what core/ is: the JS library pages and the renderer read, one subfolder per capability family"
group: engine
---

# core/

The engine's vocabulary, one subfolder per capability family: `motion/` (springs, keyframe tables,
seeded noise: `core/motion/README.md`), `engine/` (the virtual clock `page-clock.js`, the seek
`page-seek.js`, `page-api.js`), `audio/` (the synth voices in `kit.mjs`), `layout/` (aspects),
`color/`, `beats/` (beat detection), `three/` (three.js helpers), `surfaces/` (the shader field) and
`timeline/` (animation overlap checks). Every effect composes from what is here; nothing bypasses it with a private code path
(`AGENTS.md`, "Changing the engine, not a film").

A frame is a pure function of the seek time: no `Date`, no unseeded random, no state between frames.
`bin/vawe check anim-traps <page>` and `tests/media/render-page-determinism.test.mjs` guard that.

Look first: `ls core/`, then the subfolder matching the capability.
