---
when: "you want a motion-design technique with the numbers a practitioner actually states, and the engine word for it"
answers: "12 techniques studied from one After Effects channel · the ordered recipe and the step nobody guesses · the stated values · where each one lands in this engine · default or per-film option"
group: reference
---

# AE-TECHNIQUES: twelve techniques, studied from a working motion designer

Source of the study: the **Stephan Zammit** YouTube channel, <https://www.youtube.com/@stephanzammit>.
Forty videos listed; twelve watched for technique. Nothing below is quoted. Every recipe is rewritten
from what the work shows, and every number is one the videos state out loud.

Read this beside `docs/CRAFT/AFTER-EFFECTS-RECIPES.md`, which already carries 26 named AE recipes with
a HAVE/PARTLY/LACK verdict each. This file does not repeat those. It adds the techniques that come from
watching somebody DECIDE, rather than from a named effect: where the cut goes, why a loop is boring,
what a range selector is really for.

**Read the fifth field before you touch anything.** Ten of the twelve are options. A changed default has
to survive `scripts/gates/snap-scenes.mjs`, which asserts shipped scenes are byte-identical, so a default
change is an argued piece of work and never a line edit.

---

## 1. The velocity-hidden cut (the source calls it the "kinetic cut")

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
1. Parent both shots to one null and animate any transform of that null across the seam. Scale is used
   in the demonstration; position or rotation work the same.
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

**ENGINE MAPPING** All three parts are reachable now, and two of the three arrived after this entry
was first written.

*The shape.* `speedRamp(t, {peak, sharp})` (`core/motion.js`) owns the symmetric flat-ends,
steep-middle curve and is exposed as `ease: "ramp"` and as a cut timing. **Do not write a second one.**
Measured: a symmetric keyframe-handle pair at influence 55, speed 0 reproduces `ramp` to within 0.0037
over the whole segment. What `ramp` cannot do is be ASYMMETRIC, and that is the half this technique
needs. Per-key, per-side handles (`easeOut` / `easeIn`, `core/motion.js handleCurve`) give it: `hang`
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

*The placement.* `core/velocity-cut.js` reads `velocityAt` at each junction and reports a cut sitting
in a velocity trough; `scripts/author/motion-director.mjs` prints it. It reads authored handles for
free, because it derives from the one velocity owner rather than re-implementing it.

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

**ENGINE MAPPING** `core/idle.js` has exactly three idles: `none`, `breathe`, `drift`. All three are
uniform in time, which is the boredom this technique names. The engine already owns the fix in another
vocabulary: `ease: "through"` (`core/vocab.js:99`, `core/sequence.js:202`) reads a key's neighbours so a
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
(`core/motion.js:718`), which is 1.35 frames at 30fps, and `parts` carries a per-element `stagger` into
hand-authored HTML (`core/parts.js`). The gap is that stagger is a scalar here, and the technique wants
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

**ENGINE MAPPING** Absent. `make arsenal Q="stagger a grid of clones with a falloff from a point"`
returns `chipGrid`, `gridPixelateWipe` and `iris`: a blueprint, a sting, and a cut. None of them is a
falloff. This is the one entry in this file that is a genuinely new vocabulary, and it should be built
with `defineRegistry` (`core/vocab.js`) plus the `createKit(ctx)` injection point in
`core/layers/util.js`, so the falloff reaches every layer builder with no signature change. The dynamics
half is already solvable: `springEase({response, dampingFraction})` in `core/motion.js` is the overshoot,
and `sticky` is a per-element hold on the same eased value.

**DEFAULT OR OPTION** Option, and a large one. But it is the highest-value item here, because it makes
"many things react to one thing" authorable at all, and this library's median film gives 6 percent of its
layers to picture partly because a field of reacting elements is currently hand-written or not written.

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

**ENGINE MAPPING** Partly present. `core/type.js` PRESETS carries 31 kinetic presets, and `assemble` is
described in the arsenal as the AE text-animator-plus-randomize-order reveal. What is missing is that
`shape`, `smoothness` and `amount` are DIALS on the selector, and here they are baked into whichever
preset you name. `splitText` and `unitProgress` in `core/type.js` are where the selection is computed,
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

**ENGINE MAPPING** HAVE. `preset: "weight"` in `core/type.js`, and `make arsenal` reports it in **144
scenes**, the most used kinetic preset in the library. `wght` is exported from `core/type.js` directly.
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

**ENGINE MAPPING** Absent as such. `filter: "morph"` (`core/filters.js`) is dilate and erode on pixels,
not a font swap, and `morphButton` is a blueprint beat. This is a new `core/type.js` preset, `fontMorph`,
and it needs one thing the engine has: `trackingFor` is already exported from `core/motion.js` (it is
asserted in `scripts/gates/lib-test.mjs`).

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

**ENGINE MAPPING** `FILTER_PRESETS` in `core/filters.js` holds sepia, duotone, tritone, gradientMap,
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

**ENGINE MAPPING** `core/backgrounds.js:276` has `grain(ctx, w, h, t, o)`, seeded per frame and index,
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

**ENGINE MAPPING** Adjacent things exist and none is this construction. `core/backgrounds.js` ships
`blobs` (5 scenes), `gradientWash` (12 scenes) and `mesh`; `core/filters.js` ships `gradientMap`. The
value of the entry is the RECIPE for authoring a brand-specific one: an html layer with four positioned
radial gradients plus a filter chain is reachable today, since `filter` applies to an `html` layer like
any other. Worth adding as a background preset only if a film needs the colours keyed to its own brand.

**DEFAULT OR OPTION** Option. Note that **112 of 134 gate-visible scenes paint one background window for
the whole runtime**, so the real lever is binding windows to cuts, not a richer single window.

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
`edgeGlow` and `halationFilm`, `core/filters.js` has `bloom` and `chromaGlow`, and `modifiers` carries a
`matte`. `make arsenal Q="light sweep reveals text through a mask"` returns `maskReveal`, `highlight` and
the `lightLeak` shader, all of which are sweeps, not sources. Step 5 is the part this repo would insist
on regardless: one fact, one owner. A light whose position is written in two effect centres is exactly the
drift `docs/MISTAKES.md` #423 describes.

**DEFAULT OR OPTION** Option. But "what is lit is what is read" belongs in `docs/CRAFT/EYE-TRACE.md` as
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

**ENGINE MAPPING** The engine has `group` (a box and a clock) and `camera`, and a `follow` track
(`core/tracks/follow.js`). Whether a followed or grouped layer inherits its carrier's rotation is decided
in those files, and this is the entry most likely to be a genuine DEFAULT question rather than a feature.

**DEFAULT OR OPTION** Candidate default, and the only one here worth arguing for. "Carried, but upright
unless asked" is what an author means nearly every time. It is still a real piece of work: any change to
inheritance must be proven byte-identical across the library by `scripts/gates/snap-scenes.mjs`, or the
change is a regression wearing a fix's clothes.

---

## What the study says about this engine

Three findings, in the order they matter.

**The engine's easing vocabulary is finished and its PLACEMENT vocabulary is not.** `core/motion.js` has
every Penner family in In, Out and InOut, a closed-form spring, a speed ramp and a Hermite mode that
carries velocity through a key. Not one of the twelve techniques wanted a curve the engine lacks. Three
of them wanted to know WHERE to put something: the cut (1), the interior rate key (2), the effector's
path (4). That is where the next work is.

**Four of the twelve are one dial away.** Smoothness on a range selector (5), a rate warp on an idle (2),
a falloff amount (4), an inherited-rotation flag (12). None needs a new subsystem.

**One is a new vocabulary and it is the effector (4).** Everything else in this file either exists,
is a look, or is a dial. The effector is the only entry that makes a class of film authorable that is not
authorable now.
