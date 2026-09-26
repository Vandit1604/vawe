# Animation: pure primitives in `core/motion/motion.js` (no GSAP for scene logic)

GSAP gives no render-speed benefit here (we seek-and-screenshot, not real-time playback), and risks
the purity contract. Use these closed-form, pure-in-`n` helpers instead:

- `interpolate(t, inRange, outRange, { easing, clamp })`: the workhorse. Replaces
  `ease(clamp01((t-s)/d))`. Multi-stop: `interpolate(t, [0,1,4], [0,100,400])`.
- `spring(t, { bounce, settle })`: natural pops; `springSettle(opts)` tells you when it settles
  (size your holds with it). `t` is seconds since the pop started.
- `track(n, fps, beats)`: given `[{name, dur}]`, returns `{ name, t01, localT }` for the active beat.
  Use it instead of hand-rolling `ENTER/GUESS/REVEAL` window math.
- transitions → `{opacity, transform}`: `rise(t)`, `fade(t)`, `pop(t)`, `slide(t,dir)`; apply with
  `applyT(el, rise(t))`.
- easings: `easeOutCubic/Quart/Expo/Back`, `easeInOutCubic`, `easeInCubic`, `easeOutElastic`, `punch`.

**Standard beat structure:** hook → enter (rise/pop in) → hold/guess → reveal (pop + count-up) →
hold → exit. Count-ups: `setVal(el, value * interpolate(t,[r0,r1],[0,1],{easing:easeOutQuart}))`.
`films/scene/scene.html` is the reference. Test primitives with `make test`.

GSAP still runs for hand-authored HTML `parts`, `morph`, `fx`, `splitText` and `motionPath`: those
fields are GSAP-driven by design (see `skills/vawe-scene-authoring/SKILL.md` Gotchas, and
`engine-doctrine/CRAFT/FROM-GSAP.md` for the GSAP-to-vawe translation of each). This file is only
about hand-rolled `renderFrame` logic outside that vocabulary.
