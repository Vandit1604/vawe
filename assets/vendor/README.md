# Vendored third-party runtimes

## lottie_light.min.js
- **lottie-web** v5.12.2, SVG-only "light" build.
- Source: https://unpkg.com/lottie-web@5.12.2/build/player/lottie_light.min.js
- License: **MIT** (© Airbnb, Inc.) — https://github.com/airbnb/lottie-web/blob/master/LICENSE.md
- Used by `core/layers/lottie.js` to render After Effects (Bodymovin) `.json` animations
  DETERMINISTICALLY: `autoplay:false` + `goToAndStop((t-start)*fr, true)` — an absolute seek per
  frame, so `renderFrame(n)` stays pure and order-independent (verified by `make probe`).

## three.module.min.js + three.core.min.js
- **three.js** r185 (v0.185.1), minified ES-module build. Both files are required: `three.module.min.js`
  imports `./three.core.min.js`, so they must sit side by side.
- Source: the npm `three` package's `build/` directory. It is a **devDependency**, present only to
  produce these two files; nothing imports `three` from `node_modules` at runtime.
- License: **MIT** (© three.js authors) — see `three.LICENSE`.
- Loaded by `core/boot.js` as `window.THREE`, a GLOBAL, via `await import(...)` in the awaited
  readiness phase, and ONLY when the scene declares a `three` layer. Two reasons, both load-bearing:
  a static import would make `core/three-fx.js` unloadable in Node, which takes the whole layer
  registry down with it (`make schema-drift` crashed exactly that way); and awaiting it means a
  `three` layer can build synchronously without racing the module load, which would otherwise render
  empty on whichever workers got there first. That is a purity break, not a glitch.
- Used by `core/layers/three.js` DETERMINISTICALLY: every object is posed absolutely from local time,
  never accumulated, with no Clock, no AnimationMixer and no Math.random. `make lib-test` enforces the
  banned-API list; `make canvas-purity` proves the pixels match across render orders.
