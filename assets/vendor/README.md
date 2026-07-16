# Vendored third-party runtimes

## lottie_light.min.js
- **lottie-web** v5.12.2, SVG-only "light" build.
- Source: https://unpkg.com/lottie-web@5.12.2/build/player/lottie_light.min.js
- License: **MIT** (© Airbnb, Inc.) — https://github.com/airbnb/lottie-web/blob/master/LICENSE.md
- Used by `core/layers/lottie.js` to render After Effects (Bodymovin) `.json` animations
  DETERMINISTICALLY: `autoplay:false` + `goToAndStop((t-start)*fr, true)` — an absolute seek per
  frame, so `renderFrame(n)` stays pure and order-independent (verified by `make probe`).
