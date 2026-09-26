---
when: "you are about to author a launch/product film and want a real bar for what 'great' looks like, not a memory of it"
answers: "6 launch sites as links only, each with 2-3 named moves mapped to the vawe mechanism that makes them"
group: reference
---

# LAUNCH-REFERENCE: a short ambition list

Links only, no embedded frames or captured stills: this doc names what a site does and where in this
engine that move already lives. Look at the live site before you copy a move; a description is not a
substitute for [`REFERENCE-STUDY.md`](REFERENCE-STUDY.md)'s measure-first habit.

| site | moves | vawe mechanism |
|---|---|---|
| [Apple](https://apple.com) | camera dolly/zoom into the product hero; a clipped reveal that wipes in the next claim | `camera` dolly move (`core/tracks/motion.js`); `clip` layer reveal on entrance |
| [Linear](https://linear.app) | a 3D-tilted product shot that settles flat; hard cuts on the beat, no crossfades | `rotX`/`rotY` pose settling to 0 (`core/tracks/group3d.js`); `transitions[]` cut |
| [Vercel](https://vercel.com) | a terminal/deploy-log typing sequence; monochrome ground with one accent flash | text layer `typing` (`core/layers/text.js`); backgrounds base + fx accent |
| [Stripe](https://stripe.com) | a cursor demo clicking through a real flow; numbers counting up on a stat card | cursor layer + a real click (`core/layers/cursor.js`); `count` layer |
| [Arc](https://arc.net) | a window reveal that grows from a UI chrome element; sidebar items entering staggered | `clip` reveal keyed to a layer's box; `stagger` order (`core/motion/motion.js`) |
| [Raycast](https://raycast.com) | a command-palette cursor demo with instant, snappy transitions; no held dead frames | cursor demo layer; low `durationScale` / fast `cuts` tier |

No copyrighted material is embedded here: every row is a link to the live site, not a captured frame.
