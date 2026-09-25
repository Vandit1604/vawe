---
when: "you want a motion-design technique one practitioner states the dials for, and the engine word for it"
answers: "12 techniques studied from one After Effects channel · the ordered recipe and the step nobody guesses · the values that practitioner states, which are settings and not standards · where each one lands in this engine · default or per-film option"
group: reference
---

# AE-TECHNIQUES: twelve techniques, studied from a working motion designer

## AGENT SUMMARY

- 12 named After Effects techniques below, each with its recipe, the exact numbers the source states, and where it lands in this engine (HAVE / one dial away / new vocabulary needed).
- `[eye]`: a reference catalog, not a gate. Cross-check `make arsenal Q="…"` before building any of these by hand; `hang` easing, the `weight` text preset, and the `upright` modifier already ship.
- Checkable action: for the recipe you want, is its ENGINE MAPPING already HAVE, one dial away, or a genuinely new primitive?

Source of the study: the **Stephan Zammit** YouTube channel, <https://www.youtube.com/@stephanzammit>.
Forty videos listed; twelve watched for technique. Nothing below is quoted. Every recipe is rewritten
from what the work shows.

**Read every NUMBERS field as one practitioner's setting.** These figures are values one designer said
out loud while working, not measurements and not a standard. They are useful because a stated dial is a
place to start arguing from, and they carry no more authority than that. Where a number here decides
something in the engine, it needs a source of its own.

Read this beside `engine-doctrine/CRAFT/AFTER-EFFECTS-TECHNIQUES.md`, which already carries 26 named AE recipes with
a HAVE/PARTLY/LACK verdict each. This file does not repeat those. It adds the techniques that come from
watching somebody DECIDE, rather than from a named effect: where the cut goes, why a loop is boring,
what a range selector is really for.

**Read the fifth field before you touch anything.** Ten of the twelve are options. A changed default has
to survive `quality/gates/snap-scenes.mjs`, which asserts shipped scenes are byte-identical, so a default
change is an argued piece of work and never a line edit.

---

## 1. The velocity-hidden cut (the source calls it the "kinetic cut")

**THE SWAP IS A HARD CUT AND NOTHING ABOUT IT ANIMATES.** Shot A ends and shot B begins at one
instant, in place: no slide, no fade, no crossfade. The move that hides it is not on either shot, it
is on a SHARED PARENT covering both, and it runs straight through the seam. Two readers in a row
built this as two texts sliding past each other and both were wrong: if the copy moves, you have
written a transition, not this. The parent moves; the copy is replaced.

**THE NAME IS THAT CHANNEL'S, NOT THE FIELD'S.** Searching "kinetic cut" returns "kinetic editing"
(a fast-cut editorial style) and "cutting on action" (hiding a cut inside a movement), and neither is
a velocity envelope. So the phrase is used here only to point back at the source video
(<https://youtu.be/daa5hKgo0Tw>); the technique is filed under what it does. Do not go looking for a
wider recipe under that name, and do not put it in a blurb: this file's own doctrine is that a wrong
name sends the next author hunting for a recipe that does not exist.

The parts that ARE standard vocabulary: keyframe **influence** and **speed** are the two numbers AE's
Keyframe Velocity dialog takes, per side, on every key. Easy Ease is influence 33.33 with speed 0. The
value practitioners state for a snappy swap is **influence 75 both sides**, and that is the number
`hang` carries.

**RECIPE**
1. Parent both shots to ONE null and animate any transform of that null ACROSS the seam, so a single
   curve spans both shots. Neither shot gets a keyframe of its own. Scale is used in the demonstration;
   position or rotation work the same. In this engine the parent that covers both shots is the CAMERA
   (a `group` cannot: its children share its window, so they cannot abut at a seam).
2. Ease both keys, then open the speed graph and drag the handles so the curve is flat at both ends and
   near vertical in the middle. The move now starts slow, rushes, and settles.
3. Put the cut on the frame where the graph is steepest, not at a round second and not where the copy
   ends.
4. Carry the SAME velocity shape onto the next shot's own property. The demonstration hands a fast
   rotation from a cursor to a chair: the second element inherits the speed and decelerates.

**The step nobody guesses:** the cut is placed FROM the speed graph. The eye cannot resolve a join that
happens at peak velocity, so the graph is the thing you read to find the frame. Most authors ease the
move and then cut on a beat, which puts the seam exactly where the motion is slowest and most visible.

**NUMBERS** null scale 100 to 200 percent across the seam. Ease both keys, then pull the in and out
handles flat so the interior is near vertical. Cut at the steepest frame.

**ENGINE MAPPING** All three parts are reachable now.

*The shape.* `speedRamp(t, {peak, sharp})` (`core/motion/motion.js`) owns the symmetric flat-ends,
steep-middle curve and is exposed as `ease: "ramp"` and as a cut timing. **Do not write a second one.**
Measured: a symmetric keyframe-handle pair at influence 55, speed 0 reproduces `ramp` to within 0.0037
over the whole segment. What `ramp` cannot do is be ASYMMETRIC, and that is the half this technique
needs. Per-key, per-side handles (`easeOut` / `easeIn`, `core/motion/motion.js handleCurve`) give it: `hang`
leaving a key is the flat, held half, and something faster arriving at the next is the other. The doses,
as peak slope in multiples of the segment's average velocity, so nobody has to pick by feel:

| | peak slope |
|---|---|
| `easyEase` both sides (influence 33.3, speed 0) | 1.50x |
| `ease: "ramp"` (speedRamp, sharp 2.4) | 2.40x |
| `easeInOutCubic`, the engine's own default | **3.00x** |
| `hang` both sides (influence 75, speed 0) | 4.00x |

Read the third row before reaching for the second: the DEFAULT is steeper than `ramp`, so naming
`ramp` to make a move snappier makes it softer.

*The placement.* `core/timeline/velocity-cut.js` reads `velocityAt` at each junction and reports a cut sitting
in a velocity trough; `harness/author/motion-director.mjs` prints it. It reads authored handles for
free, because it derives from the one velocity owner rather than re-implementing it. It reads the
CAMERA too, and it used to not: a seam whose whole move lived on the null scored 0 px/s, so the
advisory called this technique's own construction a dead frame.

*The worked example.* `films/scene/_kinetic-cut.json`, with `_kinetic-cut-plain.json` as the twin
that differs in ONE number (the camera's second `x`). Two `text` layers with abutting windows,
`anim: "none"` and `out: "none"` so nothing fades, `cuts: [{ t: 1.4, style: "none" }]` to declare the
seam, and a camera keyed `x: 460 -> -460` on `hang` handles either side. The advisory reads the seam at
**1812 px/s and names it the film's own peak**.

Measured, as the mean absolute luma change between each pair of frames. In the PLAIN film the swap
pair reads 3.679 against a floor of 0.043, so it is **85x the median frame and the only event in the
film**; its neighbours are 0.041 and 0.029. In the KINETIC film the swap pair reads 3.273 and its
neighbours read 3.463 and 2.495: it sits INSIDE the run, **7 of the film's other 59 frame pairs change
more than it does**. The seam is not smaller, the neighbourhood is 31x louder, which is the whole
mechanism.

**Pan, do not zoom, when the subject is centred.** Built first as `s: 1 -> 2`, the same seam scored 3x
its neighbours instead of 0.9x, because a zoom's displacement is ZERO at the frame centre and that is
where copy sits. A translation moves every pixel by the same amount.

**The pan now smears, and that is most of why the cut disappears.** `"cameraBlur": true` reads camera
velocity into the layer's own motion blur. The velocity that smears is the one RELATIVE TO THE CAMERA,
so the pan streaks the frame and a layer
travelling with the camera stays sharp; the film's `shutter` says how much. Off by default, because it
puts a `filter` on layers that have never carried one. Turn it on for a velocity-hidden cut: at the
peak the frame is already unresolvable, which is the condition the technique is built on.

*The handoff.* **No mechanism, and that is the finding, not a gap.** The second shot's first key takes
an `easeOut` whose `speed` is the incoming velocity, so the picture leaves the cut still travelling and
decelerates. What is NOT expressible is absolute velocity continuity across the join: `speed` is a
multiple of each segment's OWN average velocity, so `speed: 3` on both sides of a cut hands the same
SHAPE across and not the same degrees per second. Measured on a worked handoff: shot A arrives at
762.8 deg/s and shot B leaves at 269.9 deg/s from the same authored 3. Matching them absolutely is
arithmetic the author does (B's fraction = A's arriving speed / B's own average, 8.08 in that case),
not a cross-layer binding the engine owns.

**DEFAULT OR OPTION** Option per film, but the CHECK deserves to be standing. A film whose cuts all land
in troughs is a slideshow with easing on it.

---

## 2. The broken loop

**RECIPE**
1. Build the loop as three keys of one separated axis, then loop it.
2. Drive the loop through a `timing` value rather than playing it at a fixed rate.
3. Keyframe `timing` linearly first, so the loop is even. It is even and it is dead.
4. Add ONE interior key on `timing`, set it to auto bezier, and pull it DOWN in the speed graph. The
   loop now has a slow lobe and a fast lobe while staying a loop.

**The step nobody guesses:** the interior key is on the loop's CLOCK, not on the loop's geometry. You
never touch the three position keys again. Changing the shape is the obvious move and it breaks the
cycle; changing the rate keeps the cycle and kills the screensaver feeling.

**NUMBERS** `amount` 1. `timing` keyed 0 at the start to 5 at 7 seconds. One interior auto-bezier key
pulled below the straight line. Seven duplicates of the shape, then staggered.

**ENGINE MAPPING** `core/engine/idle.js` has exactly three idles: `none`, `breathe`, `drift`. All three are
uniform in time, which is the boredom this technique names. The engine already owns the fix in another
vocabulary: `ease: "through"` (`core/registry/vocab.js:99`, `core/timeline/sequence.js:202`) reads a key's neighbours so a
travel across several keys is one gesture. A `timeWarp` for an idle would be the same idea applied to a
loop's phase. Nothing in `make arsenal Q="loop that speeds up and slows down"` matches.

**DEFAULT OR OPTION** Option. But three uniform idles for a whole engine is thin, and a rate-warped idle
is the cheapest new one.

---

## 3. Offset stagger across duplicates

**RECIPE**
1. Duplicate the animated element. Seven copies read as one object, not seven, until step 2.
2. Slide each copy's whole keyframe block a fixed step later than its neighbour.
3. The loop's own rate variation now becomes visible, because you can see it travelling across the row.

**The step nobody guesses:** the stagger is what makes the RATE readable. On one element a slow lobe and
a fast lobe look like a slightly odd loop. On seven staggered copies the same lobes read as a wave, and
the animation you already made becomes legible for the first time.

**NUMBERS** seven duplicates. A constant per-copy offset (dragged, not typed, in the source).

**ENGINE MAPPING** Present under another name. `motionDefaults.stagger` defaults to **0.045s**
(`DEFAULT_MOTION`, `core/motion/motion.js:779`), which is 1.35 frames at 30fps, and `parts` carries a per-element `stagger` into
hand-authored HTML (`core/motion/parts.js`). The gap is that stagger is a scalar here, and the technique wants
it applied to a set of layers that are copies of one thing. See entry 4.

**DEFAULT OR OPTION** Already a default. Worth knowing 0.045s is fast: at seven elements the whole wave
is over in 0.27s.

---

## 4. The effector: a moving point that drives many clones, with dynamics

**RECIPE**
1. Clone a layer into a grid, a circle, or along a path, with a stated count.
2. Link every clone's transforms to one EFFECTOR: a point with a falloff radius.
3. Move the effector. Each clone reads its own distance to the point and offsets position, scale,
   rotation, opacity, colour, corner radius, whatever was linked, in proportion.
4. Turn on dynamics. `overshoot` makes each clone keep moving after the effector has passed.
   `sticky` holds each clone at its affected value for a delay, so the effector PAINTS a trail.

**The step nobody guesses:** the animation has no keyframes on any clone. One point is keyed and the
falloff is the whole choreography. Everyone reaches for a stagger first, which can only express a
one-dimensional order; a falloff expresses distance in two dimensions, so the same rig gives a wave, a
ripple from a centre, and a brush stroke without changing anything but the path of the point.

**NUMBERS** grid 4x4 and 8x1; circle 16 and 24 clones. Overshoot frequency raised to 4 for a springier
settle. Sticky delay 1 second, which is what turns the pass into a drawn trail. Linked corner radius 0
to 50; linked size 80 at rest.

**ENGINE MAPPING** Shipped. `core/tracks/effector.js` is a track, not a `parts` mode: a `parts` timeline
is scheduled once at build time, while an effector's per-child transform is a function of the point's
CURRENT position and has to be computed every frame, so it composes with `parts` (bring the grid in
pose-to-pose, then wash the effector across it) rather than replacing it. `springEase({response,
dampingFraction})` (`core/motion/motion.js`) is the overshoot; `sticky` is a per-element hold on the same
eased value.

**DEFAULT OR OPTION** Option. It makes "many things react to one thing" authorable, where this library's
median film gave 6 percent of its layers to picture partly because a field of reacting elements had to
be hand-written before this shipped.

---

## 5. The range selector: shape, smoothness, amount, randomize order

**RECIPE**
1. Add a text animator with the properties you want the glyphs to arrive FROM.
2. Animate only the range selector's `offset`, never the properties.
3. Set `shape` to say how the selection falls off across the glyphs: `smooth` gives a wave that reads as
   one body of motion, `ramp up` gives a fall in one direction.
4. Set `smoothness` to say whether a glyph transitions or SWAPS. 0 percent means each glyph jumps
   between states with no interpolation.
5. Set `amount` below 100 percent, duplicate the animator, and give the copy a different random seed, so
   two populations of glyphs behave differently within one line.

**The step nobody guesses:** `smoothness: 0`. It is the difference between a font that scales away and a
font that vanishes, and it is what makes entry 7 possible at all. Nobody arrives at it by tuning easing,
because it is not an easing: it is whether the selector interpolates between selected and unselected.

**NUMBERS** offset keyed -100 to 100 for a single wave; 0 to 100 for a straight reveal; 100 to -100 with
`shape: ramp up` for a fall. Amount 50 percent on the duplicated animator, random seed 50. Melt example:
position 140 down, rotation 45 on the first animator and -75 on the duplicate, tracking +50.

**ENGINE MAPPING** Partly present. `core/type/type.js` PRESETS carries 33 kinetic presets, and `assemble` is
described in the arsenal as the AE text-animator-plus-randomize-order reveal. What is missing is that
`shape`, `smoothness` and `amount` are DIALS on the selector, and here they are baked into whichever
preset you name. `splitText` and `unitProgress` in `core/type/type.js` are where the selection is computed,
so that is where a falloff shape and an amount would live.

**DEFAULT OR OPTION** Option. Exposing the three dials would widen every existing preset without changing
one rendered frame, which is the rare shape of change that snap-scenes will accept.

---

## 6. Variable font axis as an animator

**RECIPE**
1. Set the line in a variable font.
2. Add a `variable font axis` animator on `weight`.
3. Animate the range selector offset 0 to 100 so a crest of weight travels the line.
4. Drop smoothness and turn on randomize order so it lands per glyph rather than as a sweep.

**The step nobody guesses:** none. This one is honest and direct. Its value is that it is the one text
register a static face cannot fake.

**NUMBERS** weight animated to 700 from the face's light default. Offset 0 to 100. Smoothness reduced,
order randomized.

**ENGINE MAPPING** HAVE. `preset: "weight"` in `core/type/type.js`, and `make arsenal` reports it in **144
scenes**, the most used kinetic preset in the library. `wght` is exported from `core/type/type.js` directly.
Nothing to build.

**DEFAULT OR OPTION** Already effectively a default. Listed so nobody rebuilds it.

---

## 7. Font morph by tracking crossfade

**RECIPE**
1. Set the word once. Every other copy pick-whips its source text from that one, so the rig survives a
   copy change.
2. Put a tracking animation on all copies: 0 to 30, hold, 30 to 0.
3. Each copy gets a `transition` animator holding scale 0 with **smoothness 0**.
4. Copy N hides by animating the selector `start` 0 to 100. Copy N+1 reveals by animating `end` 0 to 100
   over the same frames.
5. Give each face its own tracking value so the two words occupy the same width at the swap.

**The step nobody guesses:** the tracking animation is not decoration. It is what conceals the width
change between two faces. Two different fonts set the same word at two different widths, so a straight
crossfade shifts every glyph sideways at the swap. Letter-spacing everything apart during the swap hides
the shift inside a motion the viewer reads as intentional.

**NUMBERS** tracking 0 to 30 and back to 0. Smoothness 0 percent. Per-face tracking correction stated as
18 for one face against the reference. Three faces chained.

**ENGINE MAPPING** Absent as such. `filter: "morph"` (`core/looks/filters.js`) is dilate and erode on pixels,
not a font swap, and `morphButton` is a blueprint beat. This is a new `core/type/type.js` preset, `fontMorph`,
and it needs one thing the engine has: `trackingFor` is already exported from `core/motion/motion.js` (it is
asserted in `tests/motion/lib-test.motion.test.mjs`).

**DEFAULT OR OPTION** Option. It is a spectacle device, and a film should have one of those, not four.

---

## 8. Stylised procedural motion blur (echo through an edge matte)

**RECIPE**
1. Precompose the text and fill it flat.
2. Duplicate it and apply a choker to eat the edge inward.
3. Duplicate again, set matte from the choker layer, source **effects and masks**, inverted. You now have
   an outline of the glyph only.
4. Echo that outline backward in time.
5. Roughen the edges of the echo and drive the roughen evolution from time.
6. Fill the result in a second colour and composite under the type.

**The step nobody guesses:** the matte source must be **effects and masks**, not layer source. Set to
source, the matte reads the layer before the choker ran, the outline is never produced, and every
downstream value looks correct while the result is wrong. This is a silent-wrong-value bug in another
tool, and the same class this repo logs as its worst failure mode.

**NUMBERS** choker 5 (8 in the melt build). Echo count 60, echo time -0.003, decay 0.95. Second build:
20 echoes at -0.001, decay 0.95. Roughen border 3, edge sharpness 10, scale 10, complexity 1; melt build
uses border 5, sharpness 10, scale 30. Evolution driven as time times 50.

**ENGINE MAPPING** `FILTER_PRESETS` in `core/looks/filters.js` holds sepia, duotone, tritone, gradientMap,
thermalBlur, posterize, chromaGlow, displace, bloom, chromaSplit, convolve, morph, goo, relief, vignette.
There is no echo. `make arsenal Q="echo trail motion blur repeated copies"` returns blur cuts, blur
presets and `echoRing`, a blueprint beat that replays a path one beat late: adjacent, not this. Note the
engine already has real motion blur, sampled from the motion track's own velocity above **480 px/s**
with a default shutter of **0.16 of a frame, about 58 degrees** (`core/tracks/motion.js`). This technique
is the STYLISED alternative, for type, where real blur only makes the word illegible, which is the
argument the source makes too. New `FILTER_PRESETS` entry.

**DEFAULT OR OPTION** Option, per beat. Never a default: it is a look.

---

## 9. Grain keyed to a layer's own alpha edge

**RECIPE**
1. Draw a rough shape over the region that should carry the grain and matte it to the subject.
2. Apply roughen edges with a very large border, so the "edge" becomes a wide dissolving band rather than
   a crisp outline.
3. Animate the evolution from time so the band crawls.
4. Repeat with three or four such shapes in different colours at different border widths, so the grain
   reads as depth rather than as an overlay.
5. Parent them to the subject so the grain travels with it.

**The step nobody guesses:** the border is pushed far past the value that makes a rough edge. At 200 to
350 the roughen stops being an edge treatment and becomes a gradient of noise across the shape. The
useful range is nowhere near the plausible one.

**NUMBERS** border 200, then 250 and 350 on siblings; edge sharpness 10, scale 10, complexity 10;
evolution as time times 20. The particle variant: rectangles at 2 and 4 px, repeater 10 copies, repeater
rotation 45 degrees, wiggle at 15 per second with amplitude 25 wrapped in a posterize-time, then the
whole repeater duplicated.

**ENGINE MAPPING** `core/backgrounds/fx.js:271` has `grain(ctx, w, h, t, o)`, seeded per frame and index,
holding each pattern for **2 frames by default** because per-frame grain crawls on static type. That is
FRAME grain. This technique is LAYER grain, shaped by one layer's alpha, coloured per band, and parented
to the subject. `make arsenal Q="grain noise texture over the whole frame"` returns the `grain` sting
(18 scenes) and flat background presets, all frame-wide. A new filter that reads the layer's own alpha
is the mapping.

**DEFAULT OR OPTION** Option. The frame-wide grain default is correct and should not change.

---

## 10. A gradient built from moving blobs and a directional blur

**RECIPE**
1. Draw four ellipses, each filled with a linear gradient whose second stop drops to about 40 percent
   opacity, in four brand colours.
2. Animate their positions with matched easing, so the whole set shares one speed shape.
3. Put an adjustment layer over them and chain: a small box blur, then a very large directional blur,
   then a twirl, then a lens distortion.
4. Keyframe the blur amounts from nothing at the start, so the film opens on discrete drops of colour
   that BECOME the gradient.
5. Parent the ellipses to a null and rotate it, so the gradient turns as well as travels.

**The step nobody guesses:** the directional blur at roughly 500, an order of magnitude past a normal
blur. That single value is what converts four visible ellipses into a continuous field. A big isotropic
blur just gives you four soft ellipses; the direction is what smears them into each other.

**NUMBERS** box blur 4, rising to 30 as the film opens. Directional blur 500 in the radial build, 600 in
the linear build. Twirl radius 30. Null rotation 0 to 180 over about 5 seconds. Turbulent displace in the
linear build: amount 600, size 350, complexity 3, evolution as time times 50.

**ENGINE MAPPING** Adjacent things exist and none is this construction. `core/backgrounds/index.js` ships
`blobs` (5 scenes), `gradientWash` (12 scenes) and `mesh`; `core/looks/filters.js` ships `gradientMap`. The
value of the entry is the RECIPE for authoring a brand-specific one: an html layer with four positioned
radial gradients plus a filter chain is reachable today, since `filter` applies to an `html` layer like
any other. Worth adding as a background preset only if a film needs the colours keyed to its own brand.

**DEFAULT OR OPTION** Option. Note that most gate-visible scenes paint one background window for the
whole runtime (112 of 134, last measured; run `node quality/gates/waiver-drift.mjs` for the current
count), so the real lever is binding windows to cuts, not a richer single window.

---

## 11. The light rig: one light that directs the eye and doubles as the matte

**RECIPE**
1. Duplicate the animated line, thicken its stroke, and apply a radial fast blur so it throws light.
2. Stack two glows: a tight one, then a second with a raised threshold so only the brightest core
   blooms. The threshold is the dial that decides what KIND of light it is.
3. Duplicate the radial blur, set the second to a brightest-pixel mode, and OFFSET its centre in Y. Two
   centres means two light sources, which is what reads as depth.
4. Add a wide dim glow underneath to seat it.
5. Drive both blur centres from ONE null via expression, so the light has a single position owner.
6. Use the light layer as a track matte on the type. The text is revealed by the light, so where the eye
   should go and what is legible are the same decision.
7. Dim the light to zero across the switch, with the dip squeezed tight in the speed graph, and change
   the word while it is dark.
8. Gradient the stroke to give the light more than one colour.

**The step nobody guesses:** the second radial blur's centre is offset in Y. That one offset is the whole
difference between a flat glow and a light with volume, and no amount of glow tuning finds it.

**NUMBERS** stroke 10. Radial fast blur amount 95 percent. Glow one: radius 0, intensity 0.6. Glow two:
threshold raised slightly, intensity 0.8. Final seating glow: radius 100, intensity 0.1. Both blur
centres zeroed, then expression-added to the null position. Opacity keyed 100, 0, 100 across the switch.

**ENGINE MAPPING** The pieces are here and the RIG is not. There is a `glow` layer type, `LOOKS` carries
`edgeGlow` and `halationFilm`, `core/looks/filters.js` has `bloom` and `chromaGlow`, and `modifiers` carries a
`matte`. `make arsenal Q="light sweep reveals text through a mask"` returns `maskReveal`, `highlight` and
the `lightLeak` shader, all of which are sweeps, not sources. Step 5 is the part this repo would insist
on regardless: one fact, one owner. A light whose position is written in two effect centres is the same
drift `engine-doctrine/MISTAKES.md` warns against elsewhere: one value, kept in two places, will disagree.

**DEFAULT OR OPTION** Option. But "what is lit is what is read" belongs in `engine-doctrine/CRAFT/EYE-TRACE.md` as
doctrine, not just as a look.

---

## 12. Counter-rotation on a carried layer

**RECIPE**
1. Arrange the elements around a centre and parent them to one null.
2. Rotate the null.
3. Set each carried element to orient toward the viewer, so it stays upright while its position travels.

**The step nobody guesses:** that this is the default you want and not the one you get. Parenting gives
you rotation for free and it is almost always wrong: photographs and words carried around a circle turn
upside down at the bottom, and the layout stops being readable exactly when the motion peaks. The fix is
one flag, and the reason to write it down is that the broken version looks like the intended behaviour of
parenting rather than like a mistake.

**NUMBERS** none stated. The demonstration also swings the parent on a second axis and the elements stay
upright, which is the test that the flag is doing the work.

**ENGINE MAPPING** SHIPPED, as the `upright` modifier (`core/fx/upright.js`). A rotating `group` with
children IS the null-and-parented-photos rig: the group carries a `motion` track and its children ride
its transform, so left alone they turn with it. `"modifiers": [{ "upright": "wheel" }]` on a child names
the rotating carrier and cancels its rotation, and nothing else: the carrier still swings the child
around its centre, only the child's orientation is held.

It reads the carrier's OWN keyframes through `motionAt`, exactly as `core/fx/lag.js` reads its leader,
never the rendered transform, so the correction stays a pure function of the frame index and does not
depend on which layer the loop reached first. It writes the `rotate` longhand, which is why it is
refused alongside `tilt`, the other modifier that owns that property.

**IT IS ROTATION ONLY.** Not scale, not skew. A carrier that scales is a rig moving toward the eye and
its contents are meant to come with it, and `plane` already owns holding apparent size at a distance.

**THE WORKED EXAMPLE** `films/scene/_auto-orient.json`, with `_auto-orient-plain.json` as the twin
that differs in exactly one key. Six brand marks on a 300px circle inside a group keyed
`rot: 0 -> 360` over four seconds. Compared at frames 45 and 90: the marks sit at the SAME six
positions in both films, and in the plain twin the Google wordmark stands vertical, Netflix leans and
nvidia is on its side, while in the upright twin every mark reads level. The arrangement turns and its
contents do not, which is the whole claim.

**DEFAULT OR OPTION** OPTION, per layer, and the "candidate default" this entry argued for is now a
decision against. A rig usually wants most children upright and one deliberately tumbling, and neither
a changed inheritance default nor a group-level switch can say that: both are all children or none.
Turning it on by default would also have had to be proven byte-identical across the library by
`quality/gates/snap-scenes.mjs`, and it cannot be, because the whole point is that it changes pixels.

---

## What the study says about this engine

Three findings, in the order they matter.

**The engine's easing vocabulary is finished and its PLACEMENT vocabulary is not.** `core/motion/motion.js` has
every Penner family in In, Out and InOut, a closed-form spring, a speed ramp and a Hermite mode that
carries velocity through a key. Not one of the twelve techniques wanted a curve the engine lacks. Three
of them wanted to know WHERE to put something: the cut (1), the interior rate key (2), the effector's
path (4). That is where the next work is.

**Four of the twelve are one dial away.** Smoothness on a range selector (5), a rate warp on an idle (2),
a falloff amount (4), an inherited-rotation flag (12). None needs a new subsystem.

**The effector (4) shipped since this study**, as `core/tracks/effector.js`. It was the one entry here
that needed a genuinely new vocabulary rather than a dial or a look; everything else in this file
already existed in one of those two forms.

## Provenance

Source: the **Stephan Zammit** YouTube channel, <https://www.youtube.com/@stephanzammit> (forty videos
listed, twelve watched for technique). Every stated number is that practitioner's own setting, not a
standard. Companion reference: `engine-doctrine/CRAFT/AFTER-EFFECTS-TECHNIQUES.md`, which carries the 26
named recipes; this file is cited by entry NUMBER from `core/timeline/velocity-cut.js`, `core/fx/upright.js`,
`core/motion/effector.js`, `core/type/type.js` and `films/scene/schema.json`, so entries are never renumbered.

**Do not re-add:** framing entry 1's camera-blur fix or entry 1's velocity-cut mechanism as an open gap
still to close, or entry 1's "two of the three arrived after this entry was first written" as live
status. All three parts of the velocity-hidden cut (the ramp shape, `cameraBlur`, the placement advisory)
ship today.
