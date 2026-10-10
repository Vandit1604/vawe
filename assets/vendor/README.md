# Vendored third-party runtimes

A page loads these by relative or absolute path. Keep each file's licence beside it.

| file | what | licence |
|---|---|---|
| `three.module.min.js` + `three.core.min.js` | three.js r185, ES-module build. Both files must sit side by side (the module imports the core). `three` in `package.json` is a devDependency that only produces them; nothing imports it from `node_modules` at run time. | MIT, see `three.LICENSE` |
| `cobe.module.js` | cobe, the WebGL globe | MIT, see `cobe.LICENSE` |
| `lottie_light.min.js` | lottie-web 5.12.2, SVG-only light build, from https://unpkg.com/lottie-web@5.12.2/build/player/lottie_light.min.js. To stay seek-pure, a page calls `goToAndStop(frame, true)` with `autoplay: false`: an absolute seek per frame. | MIT (Airbnb) |

Determinism: three.js: pose every object from `t`, with no `Clock`, no `AnimationMixer` and no `Math.random`.

vawe does not use GSAP and ships none of it.
