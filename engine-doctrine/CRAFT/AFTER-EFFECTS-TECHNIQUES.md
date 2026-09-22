---
when: "you want the named procedure a motion designer would reach for, and the engine word for it (or the news that there isn't one)"
answers: "26 named After Effects recipes with their real numbers · a HAVE/PARTLY/LACK verdict per recipe against this engine (25 HAVE, 1 PARTLY, 0 LACK as of 2026-09-23) · what is left and where it would live"
group: reference
---

<!-- doc-refs-allow: make choreo · being built now by another agent from the choreography plan, not yet a Makefile target -->

# AFTER EFFECTS RECIPES: the named procedures, and what this engine already does

## AGENT SUMMARY

- 26 named After Effects recipes below, each with its real numbers and a HAVE / PARTLY / LACK verdict against this engine. The TABLE below is the current verdict; where a per-recipe section disagrees with the table, treat that as unresolved drift, not settled fact.
- `[eye]`: a reference catalog, not a gate. Cross-check `make arsenal Q="…"` before building any of these by hand.
- Checkable action: for the recipe you want, does its verdict say HAVE (use it), PARTLY (the shape exists, the dial does not), or LACK (build it, ranked in "The ten to build first")?

This engine ships 559 effects. More atoms are worthless. What a motion designer actually carries in
their head is not a list of effects, it is a list of **recipes**: ordered procedures with names, each
combining several operations over time, each with numbers that practitioners argue about. `overshoot`
is not an effect, it is "pass the target by this much and settle back over that long". `follow-through`
is not an effect, it is "the child property starts late and stops later than the parent".

This file is that list, researched from practitioners rather than listicles, and marked against what
this repo has. **The verdict column is the point.** It decides what gets built. A recipe marked HAVE
needs no work and needs to be USED; one marked PARTLY usually means the engine can do the shape and
not the dial; one marked LACK is a real hole.

Read [`EFFECTS.md`](../EFFECTS.md) for the inventory, [`recipes/README.md`](../../recipes/README.md)
for motion measured off a real film, [`KEYED-MOTION.md`](KEYED-MOTION.md) for how the exemplar actually
moves, and
[`MOTION-CRAFT.md`](../MOTION-CRAFT.md) for the doctrine. This file sits under all of them: it is the
vocabulary those docs assume you already speak.

**One warning about the numbers.** After Effects numbers are stated at 24 or 30fps in frames, seconds
and percent, and they transfer to this engine because this engine is 30fps and second-addressed. But a
number lifted from a tutorial is a starting dial, never a target to satisfy. Every figure below carries
its source so you can go and argue with it.

---

## The table

Ranked by how often the recipe appears in real commercial motion work, most-used first.

| # | recipe | one line | verdict | where it would live here |
|---|---|---|---|---|
| 1 | **Slow in / slow out** | never start or stop at full speed | **HAVE** | `core/motion/motion.js`, the full easing set |
| 2 | **Offset / stagger** | one animation down a list with a delay per item | **HAVE** | `stagger` on `split` text and on `parts` |
| 3 | **Overshoot** | the value passes its target and settles back | **HAVE** | `overshoot: 0.12` on any directional entrance; the settle is `enterDur` |
| 4 | **Motion blur (180 shutter)** | anything moving fast smears along its travel | **HAVE** | automatic above 480 px/s; the film's angle is `shutter` |
| 5 | **Anticipation** | a small move against the travel before the move | **HAVE** | `anticipate: 0.15` on any directional entrance |
| 6 | **Follow-through / overlap** | the trailing part starts late and stops later | **HAVE** | the `lag` modifier |
| 7 | **Kinetic typography** | words scaled and placed to a rhythm, one idea per hold | **HAVE** | 33 text presets, `split`, `wordBlast` |
| 8 | **Write-on** | a mask or stroke reveals type or a path as if drawn | **HAVE** | `draw` preset, `drawOn` part, `logoReveal` |
| 9 | **Camera shake** | a decaying handheld wobble on the whole frame | **HAVE** | `cameraMove: cameraShake`, cut `jitter`, `kick` |
| 10 | **Masked text reveal** | type uncovered in place by a hard edge, no fade | **HAVE** | `clipUp`, `riseClip`, `maskReveal`, `revealUp` |
| 11 | **Squash and stretch** | scale non-uniformly along the travel, volume kept | **HAVE** | the `squash` modifier, read off the layer's own velocity |
| 12 | **2.5D parallax** | flat layers at depths, near ones move further | **HAVE** | `plane` modifier plus a camera move |
| 13 | **Whip pan** | the frame smears sideways and lands on the next shot | **HAVE** | `whipPan` sting/seam, `whip` and `skewWhip` cuts |
| 14 | **Rack focus** | one plane pulls sharp while the other goes soft | **HAVE** | `focusRack` beat, `defocus`, `zoomBlur` |
| 15 | **Counter roll-up** | a number climbs to its value on screen | **PARTLY** | `count` layer counts, digits do not roll |
| 16 | **Light sweep / shine** | a bright bar crosses a mark and leaves | **HAVE** | `beam` layer, `streak` sting and spectacle |
| 17 | **Moving hold** | a "still" frame that never fully stops | **HAVE** | `idle: breathe/drift`, `cameraMove: driftHold` |
| 18 | **Echo / motion trail** | copies of the layer at earlier times | **HAVE** | `ghost` trail mode, `echoRing` beat |
| 19 | **Arcs** | travel on a curve, never a ruler-straight line | **HAVE** | `ease: "through"` on a motion key: neighbour tangents round the corner at every key. Measured, a three-key apex turns 22 degrees where `linear` turns 66 |
| 20 | **Luma matte reveal** | one layer's brightness is another layer's alpha | **HAVE** | the `matte` modifier, and the matte moves |
| 21 | **Shape morph** | one path becomes another, vertex to vertex | **HAVE** | svg `morph`, `morphButton`, and `filter: "goo"` for a metaball morph across several elements |
| 22 | **Match cut on shape** | a silhouette carries across the cut into a new thing | **HAVE** | `cuts[].style: "matchCut"`, one mask carried across the junction |
| 23 | **Trim-paths bar growth** | a bar, ring or rule whose length IS the number | **HAVE** | `growUp`, `widen`, `progress`, `parts` |
| 24 | **Animate on twos** | the clock steps at 12fps inside a 30fps film | **HAVE** | `step: 15` on any layer |
| 25 | **Speed ramp** | the clock itself accelerates and brakes | **HAVE** | `timeRemap` keys for fast-hold-fast, freeze and reverse; `timeWarp: "easeInQuint"`: an easing on the LAYER'S CLOCK, applied in runTracks before any track reads it, so its motion, size, idle, typing and count all ramp together |
| 26 | **Screen dive** | a real product surface pushed into as the subject | **HAVE** | `screenDive` beat, `component` capture, `ken` |

---

## 1. Slow in / slow out

**Aliases:** easing, easy ease, ease in-out, the graph editor.

**What it does.** Real things accelerate from rest and decelerate into rest. Nothing in the physical
world starts at full speed or stops dead, so linear interpolation reads as machinery.

**In After Effects.** Select the keyframes, F9 for Easy Ease, then open the Graph Editor and shape the
speed graph by hand. The precise control is right-click, Keyframe Velocity, and typing an **influence**
percentage: Easy Ease is 33% in and out, and practitioners routinely push the outgoing handle to 75%
or higher for a snappier landing. The house rule everywhere: **entrances decelerate, exits accelerate**.
Web practice puts the same numbers in milliseconds: UI motion under 300ms, a strong ease-out written as
`cubic-bezier(0.23, 1, 0.32, 1)`, on-screen movement as `cubic-bezier(0.77, 0, 0.175, 1)`.

**When it is wrong.** A tracking camera and a scrolling surface both want linear: an eased pan reads as
a lurch. `truck` and `recordedPan` are linear here on purpose.

**Verdict: HAVE.** `core/motion/motion.js` carries the whole easeIn/Out/InOut set across Back, Bounce, Circ,
Cubic, Elastic, Expo, Quad, Quart, Quint and Sine, plus `easeOutSettle`, `easeOutSnap` and `springEase`.
Nothing to build.

**Sources:** https://motiondesign.school/blog/keyframe-velocity/ ·
https://github.com/emilkowalski/skills/blob/main/skills/review-animations/STANDARDS.md

---

## 2. Offset / stagger

**Aliases:** sequence, cascade, delay, "offset and delay".

**What it does.** The same animation applied down a list with a fixed delay per item, so a group arrives
as a wave rather than a slab.

**In After Effects.** Two routes. Keyframe Assistant → Sequence Layers for whole layers, or a text
animator with a Range Selector where **Delay** in the Advanced group sets the per-character offset. The
numbers people actually use: **30 to 80ms between items** for UI, **50 to 100ms** for a page-load
sequence, and gaps over **150ms** read as sluggish. Keep the whole sequence under 1 to 2 seconds.
Direction is a decision, not a default: top-to-bottom, left-to-right, or centre-outward.

**When it is wrong.** More than about seven items, where a wave becomes a queue. Then stagger a few
representative items and bring the rest as one block.

**Verdict: HAVE.** `stagger` and `each` on any `split` text layer, `stagger` on `parts` for hand-written
markup, and `cardCascade` and `chipGrid` as whole beats. Worth noting the measured gap: only 6 of 161
scenes used `parts` when it was audited, so this is under-used rather than missing.

**Routed from the plan today.** The `word-by-word` recipe (`recipes/recipes.json`): a line arrives one
word after another, each rising into place, in place of one block sliding in.
**Measured on the reference.** `<measured on example-madera by make choreo>`

**Sources:** https://www.svgator.com/blog/offset-delay-motion-design/ ·
https://blog.frame.io/2023/12/13/insider-tips-how-to-create-a-staggered-layer-sequence-in-after-effects/

---

## 3. Overshoot

**Aliases:** bounce-back, settle, excite, spring.

**What it does.** The value travels past its target, comes back, and rings down to rest. It is the
single loudest signal that something has weight.

**In After Effects.** Three routes, and the numbers differ per route.

*By hand, on keyframes.* Animate to a value past the target at the midpoint, then back, alternating and
halving. A worked sequence for scale: **120, 90, 105, 97.5, 101.25, 100**. A coarser one from the same
family: **50 → 150 → 75 → 100**. The rule under both is that each oscillation is shorter in time and
smaller in amplitude than the one before it.

*By expression, Dan Ebberts' overshoot.* An exponentially decaying sine wave, `endVal +
amp*(Math.sin((t-dur)*w)/Math.exp(decay*(t-dur))/w)` with `w = freq*Math.PI*2`, defaults **freq = 3**
oscillations per second and **decay = 5**. Amplitude is not set directly: it comes from the incoming
velocity, so you make an overshoot bigger by arriving faster, not by typing a bigger number.

*By spring.* Apple-style parameters that transfer cleanly to the web: `duration: 0.5s, bounce: 0.2`,
with bounce kept in the **0.1 to 0.3** band. Anything above that is a toy.

Note the distinction the source is emphatic about: **overshoot is not bounce.** Overshoot is a decaying
sine at constant frequency. A bounce is a series of parabolas where the frequency *increases* as energy
drains, defaults **elasticity 0.7, gravity 5000, up to 9 bounces**. Faking a bounce with an absolute-value
sine gets the frequency backwards and reads wrong.

**When it is wrong.** Serious brands, dense grids, anything a viewer must read immediately. An
overshooting paragraph is a paragraph you read twice.

**Verdict: PARTLY.** The engine has the curves: `easeOutBack`, `easeOutElastic`, `easeOutSettle`,
`springEase`, `springStiff`, and named entrances that overshoot (`popIn`, `backIn`, `charOvershoot`,
`spinIn`, `elasticIn`). What it has no word for is the **dial**: an author cannot say "overshoot this by
12% and settle over 0.4s" on an arbitrary layer. They pick a preset and take its baked amount. That is
the gap, and it is the cheapest one on this list to close.

**Sources:** https://motionscript.com/articles/bounce-and-overshoot.html ·
https://mtmograph.com/blogs/tools/the-bounce-and-overshoot-animation-trick-every-motion-designer-should-know ·
https://github.com/emilkowalski/skills/blob/main/skills/review-animations/STANDARDS.md

---

## 4. Motion blur (the 180 degree shutter)

**Aliases:** shutter angle, cinematic blur.

**What it does.** A fast-moving thing smears along its direction of travel, exactly as a film camera
records it. Its absence is why crisp digital motion reads as cheap.

**In After Effects.** Enable motion blur per layer plus the comp-level master switch, then set Composition
Settings → Advanced → **Shutter Angle 180**, which exposes the frame for half its duration and matches a
real 24fps camera at 1/48s. **360** doubles the smear, **90** halves it, and lower angles keep going down
from there. Shutter Phase is normally **-90** so the blur straddles the frame rather than trailing it.

**When it is wrong.** Type you must read at speed. A 180 degree shutter on a fast-travelling headline
makes it unreadable, which is why editorial work often drops to 90 or turns blur off for the text layer
only while leaving it on for everything else.

**Verdict: HAVE.** Motion blur applies automatically above 480 px/s of tracked velocity, with a default
shutter of 0.16 of a frame (about 58 degrees), the same physics as this recipe. `motionBlur: false` opts
a layer out; a number overrides the shutter (`core/tracks/motion.js`). `ghost` in blur mode is the
older, still-available per-layer sampler for layers with an authored `motion` track.

That is a blur that only appears when a layer TRAVELS. The separate After Effects "Directional Blur"
(the effects-panel one you drag onto a still photo, angle and length both set by hand, no motion
required) had no equivalent here: `resample:{ "fx":"directionalBlur", "angle": 15, "amount": 0.6 }`
closes that gap (`core/resample/effects.js`), a straight-line smear at a fixed angle in degrees, the
same distance everywhere in the frame. It shares the `resample` family with `zoomBlur` (radiates from
the centre) and `spinBlur` (an arc), so it needs a real raster to sample and costs a GL context like
the rest of that family.

**Sources:** https://www.provideocoalition.com/tip_create_cinematic_motion_blur_in_after_effects_and_in_life/ ·
https://www.wipster.io/blog/debunking-the-180-degree-shutter-rule

---

## 5. Anticipation

**Aliases:** the wind-up, the counter-move, "back before forward".

**What it does.** A small movement in the OPPOSITE direction before the main move. It tells the eye
where to look a beat before the action arrives, and it gives the action a source.

**In After Effects.** Add one keyframe before the move at a value slightly back along the travel axis.
The classic proportions from the Disney principles as motion designers apply them: the anticipation
covers roughly **10 to 20% of the total move distance** and takes **2 to 4 frames** at 24fps, and it
is followed immediately by the main move with no hold between them. The bigger the payoff, the longer
the wind-up: a heavy object anticipates for longer, a light one barely at all.

**When it is wrong.** Anywhere the viewer is already looking, and on anything informational. Anticipation
buys attention, and buying attention you already have costs you time.

**Verdict: LACK.** Nothing in this engine winds up. `popOut` is described as shrinking "with a small
anticipation swell first", which is one baked exit, and that is the whole of it. Note that the house rule
against enter-and-retreat is about a full round trip, and anticipation is not that: it is a fractional
counter-move that is immediately consumed by the main travel. The two are compatible, and this is the
highest-value hole on the list.

**Sources:** https://aaronbjork.com/12-Principles-of-Animation-for-Motion-Design ·
https://www.howinteractivedesign.com/web-design-resources-technology/12-basic-principles-animation-motion-design/

---

## 6. Follow-through and overlapping action

**Aliases:** drag, lag, secondary action, "breaking the joints".

**What it does.** Parts of a thing do not move together. The trailing part starts LATE, and it stops
LATER than the leading part, overshooting past the resting pose before it settles. This is what separates
an animated object from a moved image.

**In After Effects.** Two routes. The manual one is Richard Williams' offset: parent the trailing element,
then shift its keyframes **1 to 3 frames later** than the parent's, and let it travel a little further
before easing back. The expression route is Dan Ebberts' inertial bounce on the child, defaults
**amp = 0.05, freq = 4.0, decay = 8.0**, in the form
`value + v*amp*Math.sin(freq*t*2*Math.PI)/Math.exp(decay*t)`, where `v` is the velocity at the last
keyframe. Amplitude is the size of the drag, frequency is how often it wobbles, decay is friction.

**When it is wrong.** Rigid objects. A card, a chip and a screenshot are boards, and a board that drags
reads as jelly. This is for things with implied mass or implied flexibility.

**Verdict: HAVE.** Stagger is not follow-through and the difference matters: stagger delays a whole
entrance on a SIBLING, follow-through makes a CHILD lag a parent's continuous motion and overrun its
stop. This engine had no parent-child motion relationship outside the camera and `plane` until
`modifiers: [{ "lag": "card" }]` (`core/fx/lag.js`, built after this recipe was first researched): it
makes one layer follow another's motion late and overrun its stop, `amp 0.05, freq 4, decay 8` after
Ebberts. `kick`, which shoves a layer on the film's joints, remains a different thing: it fires off the
edit, not off another layer's velocity.
**Measured on the reference.** `<measured on example-madera by make choreo>`

**Sources:** https://motionscript.com/articles/bounce-and-overshoot.html ·
https://archive.org/stream/TheAnimatorsSurvivalKitRichardWilliams/The%20Animator's%20Survival%20Kit%20-%20Richard%20Williams_djvu.txt

---

## 7. Kinetic typography

**Aliases:** kinetic type, word-by-word, type as the subject.

**What it does.** Words sized, placed and timed to a rhythm, with one idea per hold, so the type IS the
picture rather than a caption over one.

**In After Effects.** A text layer plus Animator → Position/Scale/Opacity, a Range Selector set to Words
or Characters, and **Advanced → Delay** for the per-unit offset. The craft rules are all about the hold:
one idea per hold, the hold long enough to read (roughly **0.3s plus 0.06s per word** as a floor), and
the emphasised word given scale contrast rather than colour. Stagger inside a line runs 2 to 4 frames per
word at 24fps.

**When it is wrong.** As a substitute for a picture. A film of pure kinetic type is still a film of type,
and this repo's own doctrine is blunt about it: see [`SHOW-DONT-TELL.md`](SHOW-DONT-TELL.md).

**Verdict: HAVE, generously.** 31 kinetic text presets with `split`, `preset`, `each` and `stagger`, plus
`wordBlast`, `kineticHook` and `propSentence` as whole beats. The engine is stronger here than a stock
After Effects install.

**Source:** https://www.svgator.com/blog/after-effects-text-animation/

---

## 8. Write-on

**Aliases:** stroke reveal, trim paths, handwriting reveal, draw-on.

**What it does.** A line, a signature or a headline appears as if being drawn, in the order a hand would
draw it.

**In After Effects.** The canonical procedure, and it is more specific than "animate a mask":

1. Draw a path with the Pen tool that follows the stroke of the letterform or the shape.
2. Effect → Generate → **Stroke**, tick **All Masks** and **Stroke Sequentially**, Paint Style **On
   Transparent**, and set the Brush Size slightly WIDER than the glyph.
3. Set the artwork layer as an **alpha matte** of the stroke solid, so the stroke reveals the real
   letterform rather than showing as a fat line.
4. Keyframe **End** from 0 to 100% across the reveal.

For a shape layer the same thing is one property: Add → **Trim Paths**, keyframe End 0 to 100, and offset
per path for a sequential draw.

**When it is wrong.** Long copy. A write-on forces reading at the machine's pace, and past about six
words the viewer is waiting rather than reading.

**Verdict: HAVE.** `draw` as a text preset, `drawOn` as a part entrance which uses `pathLength=1` so it
needs no measurement, `svg` with `morph`, and `logoReveal` as a whole beat.

**Sources:** https://helpx.adobe.com/th_th/after-effects/how-to/handwritten-title-effects.html ·
https://www.blog.motionisland.com/after-effects-trim-paths/

---

## 9. Camera shake

**Aliases:** handheld, wiggle, impact shake.

**What it does.** Two different things sharing one name. **Handheld** is a continuous low-amplitude
wander that says a person is holding the camera. **Impact shake** is a hard hit that decays to nothing
and says something landed.

**In After Effects.** Handheld is `wiggle(freq, amp)` on the camera or an adjustment layer's Transform
position. School of Motion's demonstrated subtle value is **frequency 1, amplitude 25** pixels; a
frequency of **5** shakes about five times a second and reads as agitation rather than a hand. Impact
shake is the same wiggle multiplied by a decaying envelope, or hand-keyed as a hard offset ringing down
over **6 to 10 frames**. Both need the layer scaled up (**102 to 110%**) or the shake exposes the frame
edge, which is the failure everyone hits once.

**When it is wrong.** Under type you must read, and on more than one beat in a film. Two shakes is a
setting, not an event.

**Verdict: HAVE, both halves.** `cameraMove: cameraShake` is the impact version, pre-sampled at author
time to one key per frame with 0.1s of eased recovery so the frame lands instead of stopping. `driftHold`
is the calm handheld. `jitter` is the cut-level version and `kick` the per-layer one. See
`core/camera-moves/index.js`.

**Sources:** https://schoolofmotion.com/blog/how-to-simulate-camera-shake-adobe-after-effects ·
https://schoolofmotion.com/blog/wiggle-expression

---

## 10. Masked text reveal

**Aliases:** box wipe, clip reveal, the editorial reveal.

**What it does.** Type is uncovered in place by a moving hard edge, with opacity untouched. The letters
never fade, so they never look weak.

**In After Effects.** A rectangular mask on the text layer, keyframe the mask path or the mask's position
from fully covering to fully clear, over roughly **10 to 14 frames** at 24fps with a hard-out ease. The
premium variant adds a short lift: the type rises 10 to 20px WHILE it is uncovered, so it arrives rather
than appears. Feather 0 for editorial, 20 to 40px for soft.

**When it is wrong.** Over a busy photograph, where the moving edge is invisible and the reveal reads as
a pop.

**Verdict: HAVE.** `clipUp`, `revealUp`, `maskReveal`, `riseClip` and the whole `wipe-*` family, plus
`clip` as a layer type.

**Source:** https://filmora.wondershare.com/basic-video-editing/text-reveal-in-after-effects.html

---

## 11. Squash and stretch

**Aliases:** volume conservation, the deform.

**What it does.** Scale non-uniformly along the axis of travel, conserving apparent volume: a thing
moving fast is longer and thinner, a thing landing is shorter and wider.

**In After Effects.** Unlink the Scale dimensions, then key against the motion: at maximum velocity
stretch the travel axis to roughly **110 to 125%** and squeeze the perpendicular axis to the reciprocal
so the area holds; on impact invert it, about **80 to 90%** on the travel axis, recovering over **3 to 5
frames**. The whole point is the reciprocal: scale both axes and it is a zoom, not a squash. Expression
route: drive Scale from `length(velocityAtTime(time), velocityAtTime(time-0.03))`.

**When it is wrong.** Anything with a rigid identity. A logo that squashes is a damaged logo. Text is
usually wrong too, because the letterforms carry the deformation and read as a bad font.

**Verdict: PARTLY.** `stretch` is a text preset that smears horizontally and snaps true, `fall` lands with
a small squash, and `squeeze` is a cut that smears along the travel axis. All three are baked shapes.
There is no modifier that reads a layer's own velocity and deforms from it, which is what makes squash
read as physics rather than as a preset.

**Source:** https://www.clipstudio.net/en/animation/12-principles/

---

## 12. 2.5D parallax

**Aliases:** fake 3D, layer depth, the camera push on flat art.

**What it does.** Flat layers are placed at different Z depths and a camera moves. Near layers travel
further across the frame than far ones, and the flat art reads as a space.

**In After Effects.** Enable 3D on each layer, spread them on Z, then **scale each layer back up to
compensate**, because pushing a layer away shrinks it. The compensation is `scale * (1 + z/cameraZ)`, and
getting it wrong is the classic tell. Then move a camera, not the layers: moving the layers gives you
sliding, moving the camera gives you parallax. Typical spread for a hero: three to five planes across
**-500 to +1500** in Z with a **truck of 40 to 120px**.

**When it is wrong.** With fewer than three planes, where it is just a slide, and on any layer carrying
small type, which the depth-of-field then softens into illegibility.

**Verdict: HAVE.** The `plane` modifier stands a layer at a depth so the camera moves it by a different
amount than its neighbours, which is exactly this recipe, and `dollyZoom` depends on it. Under-used:
`plane` is the prerequisite for the most cinematic move in the engine and most scenes never declare one.

**Sources:** https://motionarray.com/learn/after-effects/animate-flat-2d-images-after-effects/ ·
https://www.filmbro.com/blogs/tutorials/how-to-create-a-2-5d-fake-3d-parallax-effect-in-after-effects

---

## 13. Whip pan

**Aliases:** swish pan, the smear cut.

**What it does.** The frame appears to whip sideways so fast it smears, and lands on the next shot. It
hides a cut inside momentum.

**In After Effects.** The standard build, and it is short: put a **10 frame** window across the cut, five
frames before and five after. On an adjustment layer add **Motion Tile** with **Mirror Edges** on, key
Tile Center hard across the frame, and add a **Directional Blur** on the travel axis keyed to peak at the
midpoint and return to zero. The alternative is practical: take a real 24-frame whip from footage and use
it as the transition. Ease matters: the outgoing whip accelerates, the incoming one decelerates, so the
two halves are not mirror images.

**When it is wrong.** Between beats with different backgrounds, where the smear reveals the seam rather
than hiding it. This engine says the same thing about `whip` and `slide`: same-background beats only.

**Verdict: HAVE.** `whipPan` exists as a sting, as a seam and as a nominated spectacle device, plus
`whip` and `skewWhip` as cuts.

**Sources:** https://www.provideocoalition.com/whip-swish-pans-in-after-effects-premiere/ ·
https://www.premiumbeat.com/blog/create-seamless-transitons-whip-pan/

---

## 14. Rack focus

**Aliases:** focus pull, focus rack.

**What it does.** One plane goes sharp while another goes soft, moving the viewer's attention between two
things in the same frame without a cut and without moving anything.

**In After Effects.** With a real camera, key Focus Distance between the two layers' Z positions over
**12 to 20 frames** with an ease at both ends, and set Aperture wide enough that the out-of-focus plane
actually softens. Faked without a camera: Gaussian Blur keyed **0 → 12px** on one layer and **12 → 0** on
the other, over the same window, with a small **dim of 15 to 25%** on the receding one, because a real
lens loses contrast as well as sharpness.

**When it is wrong.** With only one subject in frame. A rack focus with nothing to rack to is just a blur.

**Verdict: HAVE.** `focusRack` is a beat: one plane pulls sharp on the layer blur channel while the other
blurs AND dims, which is the correct two-channel version. `defocus`, `blurIn` and `zoomBlur` are the
single-layer relatives.

**Source:** https://www.provideocoalition.com/tip_create_cinematic_motion_blur_in_after_effects_and_in_life/

---

## 15. Counter roll-up

**Aliases:** number counter, odometer, slot-machine digits.

**What it does.** A number arrives by climbing to its value, so the size of the number is something you
watch rather than read.

**In After Effects.** Two different recipes wearing one name.

*The count.* Effect → Expression Controls → **Slider Control** on a text layer, then Source Text set to
`Math.round(effect("Slider Control")("Slider"))`, and keyframe the slider from 0 to the value with a
strong ease-out. Typical duration **0.8 to 1.4s**, and the last 30% of the time should cover the last 5%
of the count, which is what makes it land.

*The odometer.* A precomp per digit holding 0 through 9 stacked vertically, revealed through a
one-digit-high track matte, and each digit column driven by **time remapping** or the **Offset** effect
so it rolls. The slot-machine variant ties the remap to a slider with `effect("Slider Control")("Slider") % 10`
so the column lands on a chosen digit. Digits to the right roll faster than digits to the left, which is
the whole illusion.

**When it is wrong.** Small numbers. Counting to 7 is a stunt, not information. Use a unit suffix instead.

**Verdict: PARTLY.** The `count` layer does the first recipe well and compacts at 1e6, and `statReveal` is
the whole beat. Nothing does the second: no per-digit vertical roll anywhere in the engine. `wordSlot` is
its sibling for words and `slotSwap` for whole slots, so the pattern is established and the numeric case
is missing.

**Sources:** https://blog.nobledesktop.com/learn/after-effects/number-counter ·
https://creativecow.net/rolling-number-counter-with-expressions-after-effects-tutorial/

---

## 16. Light sweep

**Aliases:** shine, specular pass, gleam.

**What it does.** A bright bar crosses a mark once and leaves. It is the cheapest way to make flat vector
art read as a material.

**In After Effects.** Two builds. **CC Light Sweep** on the layer, key **Center** from off one edge to off
the other over **20 to 30 frames**, Width around **20 to 40**, Sweep Intensity to taste, Edge Intensity
low. Or the manual one, which controls better: a thin diagonal masked solid on **Add** or **Screen**,
travelling across in about a second, confined by an **alpha matte** of the logo so the gleam stops at the
mark's own edges. Easy Ease both keyframes so the bar does not enter and leave at the same speed.

**When it is wrong.** More than once per film, and on anything that is not a mark. A light sweep across a
paragraph reads as a glitch.

**Verdict: HAVE.** The `beam` layer is border-beam and shine, `streak` is both a sting and a nominated
spectacle device described as "a specular pass over a mark, the cheapest premium peak".

**Sources:** https://effectscollective.com/article/how-to-use-the-cc-light-sweep-effect-in-after-effects/ ·
https://www.ledet.com/after-effects-tip-of-the-week-create-a-cinematic-light-sweep-on-text/

---

## 17. Moving hold

**Aliases:** the living hold, breathing, drift.

**What it does.** A shot that has arrived and is being read still moves, imperceptibly. A truly frozen
frame reads as a dropped render or a slide.

**In After Effects.** Never use a Hold keyframe on a settled pose. Instead put a second keyframe at the
end of the hold with a value **1 to 3% different** in scale or **6 to 14px** different in position, on a
slow ease both ends. Williams' version in classical animation is the same idea in drawings: the character
keeps a slow change through the hold rather than freezing.

**When it is wrong.** On a deliberate freeze that IS the beat, and on precise data (a chart whose bars
drift is a chart that is lying).

**Verdict: HAVE.** `idle: "breathe"` is 1.5% scale over about 4.6s, `idle: "drift"` is roughly 9px on two
periods, and both run across the settled middle only so they never fight an entrance. `driftHold` is the
camera-level version, a sub-12px Lissajous with x and y on different frequencies so it breathes instead of
walking a diagonal. The engine's numbers agree with the practitioners' numbers, which is reassuring.

**Routed from the plan today.** `idle: "breathe"`/`"drift"` on a layer, `cameraMove: "driftHold"` on the
camera; this is the ambient layer in [`MOTION-CRAFT.md`](../MOTION-CRAFT.md#layering-life-and-handoffs),
never the fix for a hole `motion-floor.mjs` finds (ambient padding does not satisfy it).
**Measured on the reference.** `<measured on example-madera by make choreo>`

**Sources:** https://aejuice.com/blog/how-to-hold-keyframe-in-after-effects/ ·
https://www.jakeinmotion.com/animation-principles-for-motion-designers

---

## 18. Echo / motion trail

**Aliases:** trails, ghosting, onion skin.

**What it does.** Copies of the layer drawn at earlier times, so its recent path is visible in the current
frame. Time made into a material.

**In After Effects.** Effect → Time → **Echo**. Real settings from tutorials: **Echo Time -0.060, Number
of Echoes 8, Starting Intensity 1.00, Decay 0.71** for a readable trail, and **Echo Time -0.020, Number of
Echoes 40, Decay 0.90** for a dense smear. Decay is the ratio of one echo's opacity to the previous one,
so 0.5 halves each step. Negative Echo Time trails behind, positive leads ahead, which is occasionally
useful and usually a mistake.

**When it is wrong.** On anything that must stay legible while it moves, and on more than one or two
layers at once, where it becomes soup.

**Verdict: HAVE.** `ghost` is the modifier, and its two modes are exactly the two uses: `trail` leaves
faded copies at poses the layer just left, `blur` samples the same poses inside one frame for a smear.
`echoRing` is the beat-level version, a stroked ring replaying another layer's path one beat late. Real
caveat: `ghost` reads the layer's own **authored motion track**, so a layer with only an `anim` gets
nothing.

**Sources:** https://helpx.adobe.com/ca/after-effects/using/time-effects.html ·
https://nofilmschool.com/2017/09/how-create-isolated-echo-motion-trail-effect-after-effects

---

## 19. Arcs

**Aliases:** curved travel, the arc of action.

**What it does.** Natural movement follows curves. Anything that travels a dead-straight line between two
points reads as mechanical, and this is the most-broken principle in motion graphics because software
interpolates straight by default.

**In After Effects.** Select the position keyframes, switch the motion path to Bezier, and drag the
handles so the path bows. The standard amount is a bow of roughly **10 to 20% of the travel distance**
perpendicular to the line, and the direction of the bow should follow the object's implied weight: a
thing thrown up arcs over, a thing entering from the side arcs down into place.

**When it is wrong.** UI motion, where a curved path reads as drunk, and any travel under about 100px,
where the arc is invisible and only costs frames.

**Verdict: PARTLY.** `alongPath` sets a line of type on a curve and can send it travelling along one,
which is the general case and the only way to bend a headline. But a normal layer's keyed `x`/`y`
interpolate straight between motion keys, so an arc has to be hand-keyed with intermediate points. That
is the same complaint After Effects gets, and it is a smaller hole than it looks, because most beats here
travel short distances.

**Source:** https://www.adobe.com/in/creativecloud/roc/blog/video/animation-principles.html

---

## 20. Luma matte reveal

**Aliases:** track matte, luma key, gradient wipe reveal.

**What it does.** One layer's BRIGHTNESS becomes another layer's alpha. White shows, black hides, and
everything in between is a soft edge. It is the general case that every wipe, iris and reveal is a
special case of.

**In After Effects.** Set the matte layer directly above the target, then in the timeline's TrkMat column
choose **Luma Matte**. The reveal is then animation on the matte, not on the content: a moving gradient
ramp gives a soft directional wipe, a hand-painted greyscale gives an organic one, and animated text gives
a type-shaped hole in a video. The two-layer version of a soft wipe: a Ramp effect on the matte with Start
and End points keyed across the frame, blur **20 to 60px** on it to set the softness of the edge.

**When it is wrong.** When a plain wipe would do. This is the expensive general mechanism, and reaching
for it to get a left-to-right reveal is work you did not need to do.

**Verdict: PARTLY.** `clip` as a layer, `occlude` to hide a layer where another covers it, and the
`wipe-*` / `iris` / `softiris` / `softwipe` family cover the common cases. What is missing is the general
one: naming ANY layer as the luminance source for another layer's alpha. Given that the engine already has
`paint` fields, shader stings and hand-authored html, that general form would compose with a lot.

**Source:** https://elements.envato.com/learn/how-to-make-mattes-in-after-effects

---

## 21. Shape morph

**Aliases:** path morph, vector morph, blob transition.

**What it does.** One outline becomes another by moving its points, so the audience sees a thing CHANGE
rather than a thing being replaced.

**In After Effects.** The hard requirement first: **both paths must have the same number of vertices, in
the same order and direction**, or the interpolation scrambles. Then keyframe the Path property itself.
Vertices interpolate along straight lines toward their targets by default, which is why a morph often
takes an ugly route; the fix is **Create Nulls From Path**, which makes a null per vertex so each point
can be given its own arc. Typical duration for a mark morph: **12 to 20 frames** with a strong ease-out.

**When it is wrong.** Between shapes with genuinely different topology (a hole appearing), where no vertex
mapping is honest and a cut is better.

**Verdict: HAVE, except per-vertex control.** `svg` layers take `morph: { to: ... }` and `logoReveal` melts
a mark from a blob, so the single-layer morph exists. `morphButton` is the beat where the object BECOMES
the next thing. The multi-element case is `filter: "goo"`, a metaball morph on alpha: two shapes grow a
bridge and snap apart. What is still missing is per-vertex control of the route.

**Routed from the plan today.** `svg` layer `morph: { to: ... }` (`core/layers/svg.js`) for the graphic
match/shape morph handoff; the object-becomes-the-next-shot case is `becomes` instead (see
[`MOTION-CRAFT.md`](../MOTION-CRAFT.md#layering-life-and-handoffs)), a different mechanism for a
different question, one shape versus one identity.
**Measured on the reference.** `<measured on example-madera by make choreo>`

**Sources:** https://lesterbanks.com/2017/10/morph-ae-create-nulls-paths/ ·
https://helpx.adobe.com/in/after-effects/desktop/drawing-painting-and-paths/null-controllers/create-nulls-for-positional-properties-and-paths.html

---

## 22. Match cut on shape

**Aliases:** graphic match, form cut.

**What it does.** A shape or silhouette in the last frame before the cut lands in the same place, at the
same size, as a DIFFERENT thing in the first frame after it. The cut disappears and the meaning is the
substitution.

**In After Effects.** It is a composition problem, not an effect. The procedure: freeze the outgoing frame
and the incoming frame side by side, align the two shapes' bounding boxes and centres to within a few
pixels, match their rotation, and only then cut. Practitioners add a **1 to 2 frame** overlap with a
dissolve to hide the residual mismatch, and often a single flash frame on a hard graphic match. The whole
craft is in the alignment: if the shapes are 20px apart the audience sees a jump, not a match.

**When it is wrong.** When the two things have no relationship. A graphic match asserts that A is B, and
asserting that falsely is the loudest way to confuse a viewer.

**Verdict: HAVE.** [`FILM-STRUCTURE.md`](FILM-STRUCTURE.md) names the match cut as one of the spatial
structural devices, and `cuts[].style: "matchCut"` is now the device: both beats are clipped to the same
shape at the junction, and the content swaps at the midpoint rather than crossfading, so the shape belongs
to both shots. Nothing yet MEASURES whether two silhouettes line up; that judgement is still the author's.

**Routed from the plan today.** `cuts[].style: "matchCut"`, the match-cut handoff in
[`MOTION-CRAFT.md`](../MOTION-CRAFT.md#layering-life-and-handoffs). Cut on action, the neighbouring
handoff in that same section, has no matching field: it is a plain hard cut placed on the action frame,
unmeasured for alignment.
**Measured on the reference.** `<measured on example-madera by make choreo>`

**Source:** https://en.wikipedia.org/wiki/Match_cut

---

## 23. Trim-paths bar growth

**Aliases:** the growing bar, the drawing ring, data animation.

**What it does.** A bar, ring or rule whose LENGTH is the number. The one recipe that reliably converts a
statistic from type into a picture.

**In After Effects.** For a stroke: Add → **Trim Paths**, keyframe **End 0 to 100%** with a strong
ease-out over **15 to 25 frames**, and **Offset** to change where the draw starts (a ring that starts at
12 o'clock needs Offset -90). For a filled bar: unlink Scale, key the travel axis 0 to 100, and set the
anchor point to the bar's base so it grows from the axis rather than from its centre. Stagger a row of
bars **3 to 5 frames** apart. The number counts up on the SAME curve as the bar grows, so the two land
together.

**When it is wrong.** Never, for a claim about a quantity. This is the default answer to "what could this
beat show instead of saying".

**Verdict: HAVE.** `growUp` scales from a part's own bottom edge, `widen` from its left edge, `drawOn`
draws a stroke along its own path with `pathLength=1`, and `progress` hands a layer the film's progress as
a CSS property. `parts` binds all of them to the engine clock inside hand-written markup.

**Sources:** https://www.blog.motionisland.com/after-effects-trim-paths/ ·
https://helpx.adobe.com/after-effects/desktop/drawing-painting-and-paths/shapes-and-shape-attributes/use-offset-paths.html

---

## 24. Animate on twos

**Aliases:** stepped animation, posterize time, on 2s, the 12fps look.

**What it does.** The clock steps at a lower rate than the film, so motion updates every second or third
frame. It reads as hand-drawn, and it is the single cheapest way to make digital motion stop looking
digital.

**In After Effects.** Effect → Time → **Posterize Time**, set to **12** inside a 24fps comp, which holds
each frame twice. In a 30fps comp the equivalents are **15** (on twos) and **10** (on threes). Applied per
layer, or on an adjustment layer for a whole group. The classic reference is that Merrie Melodies and most
theatrical cartoons were animated at 12fps and shot two frames per drawing.

**When it is wrong.** On camera moves and on anything sliding across the frame, where stepping reads as
dropped frames rather than as style. It works on character-ish motion, on line work, and on a deliberate
retro register. Mixing stepped elements with smooth ones in one frame is a decision, not an accident: the
stepped thing must be the SUBJECT.

**Verdict: HAVE.** `step` quantises a layer's clock: `step: 15` is on twos in a 30fps film, `step: 10`
is on threes. The schema labels it "ANIMATE ON TWOS".

**Sources:** https://community.adobe.com/t5/after-effects-discussions/after-effects-why-set-posterize-time-to-12-fps-in-24fps-comp/m-p/14382555 ·
https://www.unterfreiemhimmel.net/en/news/fbf-in-ae/

---

## 25. Speed ramp

**Aliases:** time remap, ramp in and out, the speed line.

**What it does.** The CLOCK accelerates and brakes, rather than a property. A shot runs at normal speed,
races, and settles, all within one continuous take.

**In After Effects.** Layer → Time → **Enable Time Remapping**, which puts a keyframe at the first and
last frame holding the source time. Add keyframes in between and ease them: a shallow slope is slow
motion, a steep slope is fast. The standard build for a whip through a dull passage is three keyframes,
normal → **400 to 800%** → normal, with Easy Ease on all three and frame blending or pixel motion on to
smooth the fast section. Whip pans are often built exactly this way, by speeding the tail of a shot
**500 to 4000%**.

**When it is wrong.** On synchronised material. Ramping the picture desynchronises it from the sound, and
in a film with a music bed that is audible immediately.

**Verdict: HAVE.** `timeRemap` takes `[{t, at}]` keys, where `t` is the layer's elapsed second and `at` is
the second it believes it is, plus the named shapes `whip`, `hold`, `freeze` and `rewind`. A repeated `at`
freezes, a falling `at` reverses, and `t` only ever moves forward. The purity worry named here was the
right one and it is answered by construction: the remap is a pure function of `t`, so a seeked frame is
correct. Declaring both `timeRemap` and `timeWarp` on one layer is refused by name.

**Sources:** https://helpx.adobe.com/nz/after-effects/using/speed.html ·
https://www.premiumbeat.com/blog/create-seamless-transitons-whip-pan/

---

## 26. Screen dive

**Aliases:** the UI push, product surface reveal, screen replacement.

**What it does.** A real product surface is the subject, and the camera pushes into the part of it that
proves the claim.

**In After Effects.** Corner Pin or Mocha-tracked screen replacement onto real footage, or the simpler
motion-graphics version: the UI as a flat layer, a camera push of **1.0 → 1.4 scale** over 1.5 to 2.5
seconds on a slow ease, and a mask or highlight that arrives on the exact element being discussed. The
craft rule is that the push must END on the thing the copy names, not merely move toward it.

**When it is wrong.** With a fake or mocked-up UI. The whole value is that it is real, and a viewer who
has used the product spots a fabricated screen instantly.

**Verdict: HAVE.** `screenDive` is the beat, `component` captures live DOM, `ken` pushes an image, and
`make capture` is the documented route to a real surface. This repo's launch doctrine already treats it
as the default.

**Source:** https://www.premiumbeat.com/blog/create-seamless-transitons-whip-pan/

---

## The ten to build first

Ranked by value over cost. Each says which of the three shelves it belongs on, because the shelf decides
who writes it.

> **ITEMS 1 TO 7 ARE BUILT.** The per-recipe sections below still carry the verdict they were
> researched with; the TABLE above is the current one. What shipped, and where it differs from the plan:
> `anticipate` and `overshoot` are one mechanism (both ARE the easing of an entrance, so both are a warp
> of the anim's own curve, `core/motion/motion.js`); `settle` is NOT a second prop, because `enterDur` already
> owns that number and a second spelling of it would be a fork; `step` is a layer prop rather than a
> modifier, because a modifier runs LAST and a clock has to be quantised before anything reads it;
> `squash` deforms along the DOMINANT axis, because an arbitrary axis needs a three-function transform
> and the tracks own `transform`; `matte` takes the source layer's own image or gradient, because a
> browser cannot read one live element's pixels as another's alpha; and motion blur (recipe #4) needed
> only the shutter angle, since the blur itself was already automatic (engine-doctrine/MISTAKES.md #520).
> Items 8, 9 and 10 are not built.

**A new easing or entrance dial. Cheapest shelf, changes every film.**

1. **Anticipation** (#5, LACK). A fractional counter-move before every directional entrance, expressed as
   one number: `anticipate: 0.15` meaning 15% of the travel, back, over 2 to 4 frames, then straight into
   the main move. It is a curve, it needs no new layer type, and it is the loudest missing principle in
   the engine. Build it as an easing plus an entrance flag, in `core/motion/motion.js`.
2. **The overshoot dial** (#3, PARTLY). Every overshooting preset here bakes its own amount. Expose the
   pair the practitioners argue about, `overshoot` (8 to 15% typical) and `settle` (0.3 to 0.5s), on any
   entrance, so an author can tune weight without changing preset. Also `core/motion/motion.js`.

**A per-layer modifier. `core/fx/`, where `ghost` already lives, so the pattern is proven.**

3. **`squash`** (#11, LACK as physics). Read the layer's own velocity, stretch the travel axis and squeeze
   the perpendicular one by the reciprocal. `ghost` already samples the motion track a few frames back, so
   the velocity read is written and can be shared. One fact, one owner.
4. **`step`** (#24, LACK). Quantise a layer's `t` to N updates per second, default 15 in a 30fps film.
   Perhaps ten lines. It opens the entire hand-drawn register, which the engine cannot currently reach at
   all, and it is trivially pure.
5. **`matte`** (#20, PARTLY). Name any layer as the luminance source for this layer's alpha. It is the
   general case of the whole wipe family, and it composes with `paint` fields, shader looks and
   hand-authored html, all of which already exist. High leverage per line.
6. **Motion blur as a scene default** (#4, PARTLY). `ghost` in blur mode is correct and nobody switches it
   on. Give the scene a `shutter` setting that applies the existing sampler to every layer moving faster
   than a threshold, with per-layer opt-out. This is the "fix it at the root" shape: the current design
   asks every author to remember, which is a per-call-site opt-in and therefore not a default at all.
7. **`lag`** (#6, LACK). A layer follows another layer's motion 1 to 3 frames late and overruns its stop,
   `amp 0.05, freq 4, decay 8` after Ebberts. This is the one modifier here that needs a new concept, a
   motion relationship between two layers, so it is the most expensive of the six and still worth it: it
   is half of what makes motion read as animated rather than moved.

**A recipe (recipes/README.md). Motion measured off a real film, applied to layers the author names.**

8. **`odometerStat`** (#15, PARTLY). The digit-roll counter: digits in slots, right column rolling
   faster than left, landing together with a bar or ring whose length is the same number. The engine
   already has `wordSlot` for the non-numeric case, so this fills an obvious gap in an established
   pattern, and needs a real source clip measured (`make study`) before it can become a recipe.

**A composition. A bespoke overlapping timeline in `core/compositions/index.js`, which has only two
entries and should have more.**

9. **`matchCut`** (#22, PARTLY). Two shapes placed in register across a junction, the outgoing one handing
   its silhouette to the incoming one, with the alignment computed rather than eyeballed. It is exactly
   the overlapping-tween case compositions exist for, and it gives the film-structure doctrine a device
   instead of only a paragraph.
10. **`shapeMorphRoute`** (#21, PARTLY). Morph with per-vertex routing, so a mark takes an arc into its
    next form rather than the straight line every vertex takes by default. It needs the same machinery as
    #9 and should follow it.

**Deliberately not on the list.** Speed ramp (#25) is the most interesting missing item and the most
expensive: it touches the render-purity contract, and it should wait until something in a real film
actually needs it. Arcs (#19) are a real gap and a small one, because most beats here travel short
distances where the bow would be invisible.

## Provenance

Each recipe carries its own source links inline. Read alongside [`EFFECTS.md`](../EFFECTS.md) (the
inventory), [`recipes/README.md`](../../recipes/README.md) (structure measured off real video),
[`KEYED-MOTION.md`](KEYED-MOTION.md) and [`MOTION-CRAFT.md`](../MOTION-CRAFT.md) (the doctrine).

**Do not re-add:** recipe #24 (Animate on twos) as LACK, or a note that its verdict disagreed with the
summary table. Both now say HAVE (`step`). Recipe #4 (Motion blur) as PARTLY / opt-in / requiring an
authored motion track: motion blur is automatic above 480 px/s with a default 0.16 shutter
(`core/tracks/motion.js`; `engine-doctrine/MISTAKES.md` #520).

