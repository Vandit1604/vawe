---
when: "you are about to build a new effect and want to know whether SaaS product films actually use it"
answers: "20 effects ranked by how many independent sources name them · the numbers each source states · SHIPPED/PARTLY/MISSING against this engine · a three-item build queue · what purity forbids"
group: reference
---

# SAAS MOTION DEMAND: what product films actually use, ranked

## AGENT SUMMARY

- Before building a new effect, check the ranked table below: 20 techniques ranked by how many
  independent sources name them, each marked SHIPPED / PARTLY / MISSING against this engine, with the
  file:line that already does it.
- The build queue has three MISSING rows in demand order: depth-map reveal transition (5 sources), 3D
  carousel (3 sources), proximity hover (1 source), each with the one step nobody guesses.
- The engine refuses five techniques by construction (`renderFrame(n)` purity: no prior-frame feedback,
  no CSS `animation`/`transition` in a fragment, no `opacity`/`filter` in a layer's `css`, no
  real-sampling backdrop blur, no design-file importer), so don't propose them.
- Enforced by `[ref: make arsenal Q="…"]` before inventing anything; no gate. This is a survey of what
  is published, not a measurement of shipped videos, treat the ranking as direction and re-derive any
  figure you intend to quote.
- Confirm: does `make arsenal Q="…"` already have this, and if not, is it in the build queue below
  before you build it from scratch?

## Method, and its honest limit

Eight web searches (SaaS explainer breakdowns, UI animation for product demos, stagger and offset
timing, depth-map displacement, screen-recording auto-zoom, text scramble, product-launch film trends,
motion-design trends 2026) plus one commercial kit's own contents list, read as direct evidence of
demand: a studio does not package a panel button for a technique nobody buys. That kit is
<https://solairmotion.gumroad.com/l/SaaSKit>, a $49 After Effects panel aimed only at software product
demos. Its own description is the one page here I read in full text, and only through the page's meta
description, because the product body is JavaScript-rendered and both WebFetch attempts returned the
title alone. In my own words, it sells: a Figma-to-After-Effects layer-preserving import, a depth-map
reveal transition, a 3D cursor that lands on a chosen layer and makes the button react, a 3D card
carousel, three text reveals (coloured, staggered letters or words, random letters), animated background
gradients, a one-click UI stagger, plus proximity hover, glass panels, a gradient wipe reveal and a text
exploder. Nothing of its wording, packaging or assets is reproduced; the technique names below are
standard field vocabulary and belong to nobody.

**"Ranked by frequency" means: how many of the ~22 sources I saw name the technique.** It is a survey of
what practitioners and vendors PUBLISH, not a measurement of shipped videos, and no page here counted
anything. For every source except the kit page I read the search engine's extracted summary and the
title, not the whole article, so a count is a floor and never a ceiling. Treat the ordering as a
direction, and re-derive any figure you intend to quote.

**Read this beside the two files that already did this work.**
[`AFTER-EFFECTS-TECHNIQUES.md`](AFTER-EFFECTS-TECHNIQUES.md) carries 26 named recipes with a HAVE/PARTLY/LACK
verdict each; [`AE-TECHNIQUES.md`](AE-TECHNIQUES.md) carries 12 studied from one channel. Rows below that
those files already settle are marked and not re-argued. My survey disagrees with them in one place, noted
at row 6.

---

## The ranked table

| # | effect | sources | what it is | key numbers | status | where it lives / what it would take |
|---|---|---|---|---|---|---|
| 1 | **Stagger / offset reveal** | 8 | one entrance run down a list with a per-item delay | 40 to 120ms between items (ripplix, superfiles); Framer Motion `staggerChildren` 0.1s, Motion examples 0.05s (motion.dev); never stagger more than 5 or 6, bring the rest in together (aninix) | **SHIPPED** | `parts` `{select, stagger, each}` (`core/motion/parts.js:27`), `split` + stagger on text, falloff drives in `core/motion/effector.js:37` |
| 2 | **Snappy ease with overshoot** | 6 | scale up fast, pass the target, settle back | Easy Ease is influence 33.33 / speed 0; practitioners push the outgoing handle to 75 (`AFTER-EFFECTS-TECHNIQUES.md`); UI motion under 300ms; `cubic-bezier(0.23, 1, 0.32, 1)` | **SHIPPED** | `overshoot: 0.12`, whole easing set in `core/motion/motion.js`. Settled by recipes #1, #3 |
| 3 | **Cursor + click micro-interaction** | 6 | a pointer travels a path and the click reads as a physical press | our own: the dip is scale 0.78 at the half-cycle over 0.11s, the ripple runs 0.45s (`core/layers/cursor.js:20-21`). No source publishes numbers | **PARTLY** | `cursor` layer with `path` and `clicks` (`core/layers/cursor.js:1`). The pointer reacts; the TARGET does not. A `pressTarget` would have to scale the clicked layer, not the pointer |
| 4 | **Auto-zoom on the click** | 5 | the camera follows the pointer and magnifies the target before it is hit | no source states a duration or a scale; all four tools describe it only as "smooth easing" and "configurable". Ours are chosen by rendering: it ARRIVES 0.18s before the press (about five frames, the shortest lead at which the frame has settled when the ripple fires), pushes for 0.9s to 1.35x, holds 0.6s and releases over 0.8s | **SHIPPED** | `"cameraMove": {"move":"followCursor","cursor":"<layer id>"}` reads that cursor layer's OWN `path` and `clicks` (`core/camera-moves/index.js` followCursor, bound at boot by `bindCursorCamera` in `core/engine/produce.js`), so the pointer is the single owner of where the camera goes and nobody types the coordinates twice. Restraint is derived, not authored: presses closer together than `dwell + release + dur + lead` share one continuous flight and presses within 160px share one framing, so six clicks are never six crash zooms |
| 5 | **Depth-map reveal transition** | 5 | a flat UI frame parts in depth as the camera pushes, near pixels moving before far ones | none published. Tutorials state only "keyframe the displacement intensity" | **MISSING** | Nearest is `displace` (`core/looks/index.js:109`, turbulence freq 0.012, scale 14), which is noise-driven, and `uiParallax` (`core/surfaces/three-fx.js:225`), which needs the planes pre-split by hand |
| 6 | **2.5D multi-plane parallax** | 5 | flat layers at depths, near ones travel further | `depth: back` is 0.73x (its own blurb) | **SHIPPED** | `plane` modifier + a camera move; `uiParallax` (`core/surfaces/three-fx.js:225`) dollies a stack of captured planes. Recipes #12 agrees |
| 7 | **Text scramble / random letters** | 5 | characters cycle through junk and resolve into the word | resolve left to right; our scramble advances in 24 steps across the window (`core/type/type.js:390`) | **SHIPPED** | `decode` (`core/type/type.js:202`), deterministic so a seek is exact |
| 8 | **Device mockup reveal** | 4 | the shot pulls back and the UI turns out to be inside a laptop or phone | none published | **SHIPPED** | `deviceShowcase` with `device: 'laptop'` and a real captured screen texture (`core/surfaces/three-fx.js:193`), plus the `workspaceZoomOut` camera move |
| 9 | **Animated background gradient** | 4 | a slow mesh gradient that never stops moving behind the UI | none published | **SHIPPED** | 18 ambient shaders, `flow` first (`core/surfaces/shaders-ambient.js:30`) |
| 10 | **Logo reveal / motion identity** | 4 | the mark draws or assembles, one short system reused everywhere | none published | **SHIPPED** | `logoReveal` beat, `draw` type preset (`core/type/type.js:267`) |
| 11 | **Glass panel** | 4 | a frosted surface that blurs the moving field behind it | our default is `blur(14px) saturate(1.35)` (`core/layers/util.js:271`) | **SHIPPED** | `glass` on any layer (true, a px radius, or `'refract'`) (`core/layers/util.js:266`); 7 glass blocks in `blocks/glass.mjs` |
| 12 | **Coloured / gradient text reveal** | 3 | colour sweeps through the letterforms as the line lands | `linear-gradient(100deg)` at `backgroundSize: 250%`, position swept 100% to 0 (`core/type/type.js:214`) | **SHIPPED** | `gradient` and `colorWave` (`core/type/type.js:214`, `:232`) |
| 13 | **3D carousel / card stack** | 3 | cards on a ring, the front one facing the viewer, the ring turning | none published | **MISSING** | `make arsenal Q="3d carousel of cards rotating"` returns `cardCascade`, `flip` and `flipInY`, none of them rotational. Would be a `three-fx` scene beside `uiParallax` |
| 14 | **Motion blur (180 shutter)** | 3 | anything fast smears along its travel | automatic above 480 px/s here; the film's angle is `shutter` | **SHIPPED** | Settled by recipes #4 |
| 15 | **Gradient wipe reveal** | 2 | a feathered band, not a hard edge, uncovers the next beat | the band is 20% of the travel wide (`core/cuts/index.js:117`) | **SHIPPED** | `softwipe`, and `softiris` for the circular form (`core/cuts/index.js:117`, `:122`) |
| 16 | **Text exploder** | 2 | letters fly in from scattered positions and land | dist 220, spin 65 degrees, shuffle 0.4, 6px travel blur (`core/type/type.js:363`) | **SHIPPED, different name** | `assemble`. Do not build "exploder": it exists |
| 17 | **Whip pan / velocity-hidden cut** | 2 | the frame smears sideways and lands on the next shot | influence 75 both sides (`AE-TECHNIQUES.md` §1) | **SHIPPED** | `whip`, `skewWhip` cuts; `whipPan` sting. Recipes #13 |
| 18 | **Counter roll-up** | 2 | a number climbs on screen, digits rolling | none published | **SHIPPED** | `count` layer, `"roll": true`: an odometer mode, one wheel per digit (`core/layers/count.js`) |
| 19 | **Proximity hover** | 1 | elements swell or lift as the pointer passes near them | none published | **MISSING** | The falloff maths already exists: `sphere` in `core/motion/effector.js:43` computes a radial weight. It is driven by an item index, not by a cursor position |
| 20 | **Figma to AE layer import** | 1 | a design file becomes animatable layers without redrawing | vendor claims one click, layer for layer | **N/A, different architecture** | We do not import a design file; `make capture` and the `component` layer take the LIVE surface instead, which is a better source than a design file. Nothing to build |

---

## The build queue

Ordered by demand over cost. Only the MISSING rows are here.

**Row 4 is BUILT, and it was the binding this section predicted.** `followCursor` derives the camera
keys from a `cursor` layer's own `path` and `clicks` (`core/camera-moves/index.js`, bound at boot by
`bindCursorCamera` in `core/engine/produce.js`), which closed the most-published SaaS demo technique of the last
two years for one generator and one resolver. **Row 3 is still one binding away and is now the cheapest
thing here**: the pointer reacts to its own press, the TARGET does not, and a `pressTarget` naming a
layer id would scale that layer instead of the arrow. It is the same shape as row 4 and the same size.

### 1. Depth-map reveal transition (5 sources)

A greyscale depth map of the same UI frame drives a displacement, and the map's scale is animated while
the camera pushes, so near pixels part before far ones and the frame opens rather than warps.

**The step nobody guesses: the displacement source is a depth map of the picture itself, not noise.**
Every approximation reaches for turbulence, because turbulence is the displacement source that ships in
every tool, and turbulence has no idea which pixels are near. That is why a noise version wobbles the
whole frame evenly and never parts it. Our `displace` (`core/looks/index.js:109`) is exactly that wrong shape,
so having it is not having this.

### 2. 3D carousel (3 sources)

Cards on a common cylinder, the ring turning about a vertical axis, the front card readable.

**The step nobody guesses: the front card's own ring rotation is cancelled so it faces the camera flat.**
Build it as a plain ring and the hero card arrives skewed at the exact moment the viewer is meant to read
it, which is the failure that makes a home-made carousel look home-made. `uiParallax`
(`core/surfaces/three-fx.js:225`) is the right neighbour to build beside: same texture plumbing, different pose.

### 3. Proximity hover (1 source)

Elements react to how near the pointer is, continuously.

**The step nobody guesses: it is a field, not an event.** Every element evaluates the same distance
function every frame; no element has a trigger, an enter or a leave. Built as hover events it would be
un-seekable and therefore impure. Built as a field it is `f(cursorXY, elementXY)` and `renderFrame(n)`
stays a pure function of `n`. `core/motion/effector.js:43` already has the falloff half.

---

## What this engine will not do, and why

- **Anything that reads the previous frame.** `renderFrame(n)` is a pure function of `n`, so a real
  feedback echo, an accumulating trail, a particle sim carrying state and a frame-buffer displacement are
  all out by construction. The engine's `ghost` trail is not an exception: it re-evaluates the layer at
  earlier times rather than stepping from the last frame.
- **CSS animation or transition inside a hand-written fragment.** `core/type/sanitize-html.js` refuses both at
  boot, because they run on a clock the renderer does not own and a seeked frame would be wrong. `parts`
  is the sanctioned way to give hand-written HTML the engine's clock.
- **`opacity` and `filter` in a layer's `css`.** The engine writes both every frame (the enter and exit
  envelope, and the velocity blur), so the validator refuses them by name.
- **Backdrop blurs that need real sampling.** `glass` and `progressiveBlur` work because
  `backdrop-filter` is a browser capability; radial, zoom and spin blur on the BACKDROP still need a
  sampler the shader path does not have (`core/layers/util.js:265`).
- **A design-file importer.** Row 20. We capture the live product instead, and a live capture carries the
  real fonts, gradients and copy that a re-drawn design file loses.

---

## Sources

Kit contents: <https://solairmotion.gumroad.com/l/SaaSKit>.
Stagger and offset numbers: <https://www.svgator.com/blog/offset-delay-motion-design/> ·
<https://www.aninix.com/wiki/how-to-create-a-good-stagger-in-the-ui-animation> ·
<https://motion.dev/docs/stagger> · <https://www.ripplix.com/blog/principles-of-animation-ui-design> ·
<https://superfiles.in/motion-design-principles-for-ui.php>.
SaaS explainer craft: <https://www.skillshare.com/en/classes/saas-explainer-animation-from-ui-design-to-motion-in-after-effects/1147733669> ·
<https://www.udemy.com/course/create-a-full-saas-explainer-video-in-adobe-after-effects/> ·
<https://trydemotion.com/blog/motion-graphics-secrets> · <https://trydemotion.com/blog/figmotion-animation-tool> ·
<https://www.designinmotionschool.com/saas-explainer-pro>.
Shot inventories: <https://advids.co/blog/30-inspiring-animated-ui-demo-video-examples-for-product-showcase> ·
<https://advids.co/blog/saas-ui-demo-videos> · <https://advids.co/blog/product-walkthrough-animation>.
Displacement: <https://borisfx.com/blog/displacement-mapping-in-after-effects/> ·
<https://pixflow.net/blog/how-to-create-stunning-displacement-map-effects-in-after-effects/>.
Auto-zoom and cursor: <https://screen.studio/> · <https://focusee.imobie.com/features/auto-zoom-and-cursor-animation.htm> ·
<https://getrapidemo.com/> · <https://www.screenify.studio/blog/2026-04-16-best-screen-recorder-auto-zoom>.
Scramble: <https://framer.university/blog/how-to-create-a-text-scramble-effect-in-framer> ·
<https://www.plainlyvideos.com/after-effects-expressions-library/text-scramble>.
Trends: <https://elements.envato.com/learn/motion-design-trends> ·
<https://www.renderforest.com/blog/logo-animation-trends> · <https://vidico.com/news/best-product-launch-videos/> ·
<https://graphicdesignjunction.com/2026/01/video-and-motion-creative-trends-2026/>.
