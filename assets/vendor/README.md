# Vendored third-party runtimes

A page loads these by relative or absolute path. Keep each file's licence beside it.

| file | what | licence |
|---|---|---|
| `three.module.min.js` + `three.core.min.js` | three.js r185, ES-module build. Both files must sit side by side (the module imports the core). `three` in `package.json` is a devDependency that only produces them; nothing imports it from `node_modules` at run time. | MIT, see `three.LICENSE` |
| `cobe.module.js` | cobe, the WebGL globe | MIT, see `cobe.LICENSE` |
| `lottie_light.min.js` | lottie-web 5.12.2, SVG-only light build, from https://unpkg.com/lottie-web@5.12.2/build/player/lottie_light.min.js. To stay seek-pure, a page calls `goToAndStop(frame, true)` with `autoplay: false`: an absolute seek per frame. | MIT (Airbnb) |
| `gsap.min.js` | GSAP 3.13.0, UMD build (`window.gsap`). **Not committed**: the Standard licence does not clearly allow redistributing the built file in a public repo. `npm install` copies it from `node_modules` (`scripts/vendor-gsap.mjs`, the `postinstall` script); `bin/vawe doctor` reports it missing with the fix. | GreenSock Standard "No Charge" (© GreenSock), https://gsap.com/standard-license |
| `MotionPathPlugin.min.js`, `Physics2DPlugin.min.js`, `SplitText.min.js` | GSAP plugins, free since 3.13. GSAP ships them only as loose files, so they stay vendored here. | GreenSock Standard "No Charge"; do not re-license or redistribute them as a standalone library |

Determinism: a page that uses GSAP must pause its timelines and seek them from `t`, or the frame stops
being a pure function of the seek. three.js: pose every
object from `t`, with no `Clock`, no `AnimationMixer` and no `Math.random`.
