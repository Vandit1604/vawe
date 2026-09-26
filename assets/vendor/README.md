# Vendored third-party runtimes

## lottie_light.min.js
- **lottie-web** v5.12.2, SVG-only "light" build.
- Source: https://unpkg.com/lottie-web@5.12.2/build/player/lottie_light.min.js
- License: **MIT** (© Airbnb, Inc.). Https://github.com/airbnb/lottie-web/blob/master/LICENSE.md
- Used by `core/layers/lottie.js` to render After Effects (Bodymovin) `.json` animations
  DETERMINISTICALLY: `autoplay:false` + `goToAndStop((t-start)*fr, true)`, an absolute seek per
  frame, so `renderFrame(n)` stays pure and order-independent (verified by `make check GATE=probe`).

## three.module.min.js + three.core.min.js
- **three.js** r185 (v0.185.1), minified ES-module build. Both files are required: `three.module.min.js`
  imports `./three.core.min.js`, so they must sit side by side.
- Source: the npm `three` package's `build/` directory. It is a **devDependency**, present only to
  produce these two files; nothing imports `three` from `node_modules` at runtime.
- License: **MIT** (© three.js authors), see `three.LICENSE`.
- Loaded by `core/engine/boot.js` as `window.THREE`, a GLOBAL, via `await import(...)` in the awaited
  readiness phase, and ONLY when the scene declares a `three` layer. Two reasons, both load-bearing:
  a static import would make `core/surfaces/three-fx.js` unloadable in Node, which takes the whole layer
  registry down with it (`make check GATE=schema-check` crashed exactly that way); and awaiting it means a
  `three` layer can build synchronously without racing the module load, which would otherwise render
  empty on whichever workers got there first. That is a purity break, not a glitch.
- Used by `core/surfaces/three.js` DETERMINISTICALLY: every object is posed absolutely from local time,
  never accumulated, with no Clock, no AnimationMixer and no Math.random. `make lib-test` enforces the
  banned-API list; `make check GATE=canvas-purity` proves the pixels match across render orders.

## gsap.min.js (+ MotionPathPlugin / Physics2DPlugin / SplitText)
- **GSAP** v3.13.0, UMD build (`window.gsap`). The three plugin files are the formerly-paid bonus
  plugins, which became free with GSAP 3.13.
  - `MotionPathPlugin.min.js`: animate a layer along an SVG path (`motionPath` field).
  - `Physics2DPlugin.min.js`: velocity/gravity/friction scatter (`physics` field).
  - `SplitText.min.js`: line-aware splitting, used ONLY for line-level reveals (`splitText` field);
    char/word splitting stays with the engine's own `split`.
- License: **GreenSock Standard "No Charge" license** (© 2025 GreenSock),
  https://gsap.com/standard-license. Free for this use (rendering our own videos); the header in each
  file states the terms. NOT MIT, do not re-license or redistribute the plugins as a standalone lib.
- **`gsap.min.js` itself is NOT committed** (unlike the three plugin files above): the Standard license
  does not clearly allow redistributing the built file in a public Apache-2.0 repo. It is a real npm
  dependency (`package.json`, pinned `3.13.0`) and `scripts/vendor-gsap.mjs` copies
  `node_modules/gsap/dist/gsap.min.js` here on every `npm install` (its `postinstall` script);
  `make doctor` reports it missing with the fix command. The plugin files have no such npm package of
  their own (GSAP ships them only as loose bonus files), so they stay vendored directly.
- The engine strips `<script>` from scene HTML by design, so GSAP is an INTERNAL tween engine, never
  an author-JS hatch. Loaded on demand by `core/engine/preload.js` (`preloadGsap`) ONLY when a scene uses a
  `gsap`/`morph`/`fx`/`fxOut`/`motionPath`/`physics`/`splitText` field. Made DETERMINISTIC by stopping
  the ticker (`gsap.ticker.sleep()`) and pausing + seeking the global timeline per frame in
  `seekAll(t)`: every tween is a pure function of `t`, proven by the dedup pass + `make check GATE=probe`.
- Named effects live in `core/engine/gsap-effects.js` (referenced from JSON by name via `fx`/`fxOut`).
