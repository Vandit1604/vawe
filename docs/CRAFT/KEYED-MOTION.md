---
when: a film has the right structure and still feels amateur, or a recreation drifts where the original snaps
answers: "how the exemplar actually MOVES, as numbers from its JSON: dense keys with linear between them · layers sharing one pan · `--p` carrying what position cannot · traced timings · diegetic exits. A register you choose, not a floor, and deliberately ungated"
group: crosscutting
codes: beat-holds-still, beats-held-open, beats-wrapped-as-units, held-through-the-change, junction-is-static, no-authored-motion
---

# KEYED MOTION: how the exemplar actually moves

`formats/scene/higgsfield-recreation.json` is cited across this repo as the exemplar, and everything
written about it so far is about its **grammar**: one object, on screen from the first frame, and every
cut is that object changing state ([`../../skills/vawe-continuous-action/SKILL.md`](../../skills/vawe-continuous-action/SKILL.md)).
That is the *what*. This file is the *how*. The motion mechanics that make it read as a product film
rather than a competent slideshow, stated as numbers you can check in the JSON rather than as taste.

**Read this when** a film has the right structure and still feels amateur, or when you are recreating a
reference and cannot work out why yours drifts while the original snaps.

> **This is a REGISTER, not a floor.** Everything below is expensive: the exemplar is 5 seconds and
> carries 73 hand-written motion keys. Most films should not pay that. Choose it deliberately, for a
> hero beat or a recreation, and know what you are buying. Nothing here is gated and nothing should be.

**Three of these are now DEFAULTS: you get them without asking:**

| mechanic | how it became automatic |
|---|---|
| linear between dense keys | `motionAt` interpolates a segment shorter than `DENSE_KEY_SEC` (0.14s, ~4 frames) linearly unless you name an `ease`. Dense keys mean mechanical. |
| motion blur on fast movers | applies itself above `AUTO_BLUR_FLOOR` (16px/frame) at a gentle `AUTO_SHUTTER` of 0.16. The exemplar author's own hand-picked value. `motionBlur: false` opts out; a number overrides the shutter. |
| exits faster than entrances | `theme.motion.exitRatio` scales the default exit. Defaults to `1` so no theme changes until it opts in; `themes/higgsfield.json` sets `0.45`. |

**Two more are one line away:** `panWith` (below) and the `typedHook` / `morphButton` blueprints.

**The rest cannot be defaults and pretending otherwise would be dishonest.** Traced timings come from
measuring a video; 73 hand-written keys cost hours per five seconds; two-colours-no-third is a decision
you make once in a theme. Those stay yours.

---

## The shape of the file

Five seconds. Eight layers. **No `cuts`, no `stings`, no `camera`, no `cameraMove`, no blueprints, no
blocks.** Not one preset transition. Every frame of movement is a `motion` track written by hand.

That is the first thing to absorb. The engine's whole transition vocabulary is sitting there unused,
because a cut is a thing that happens *between* shots and this film never leaves its shot.

---

## 1. Dense keys, linear between them

| layer | keys | interior keys with `ease:"linear"` |
|---|---|---|
| `btn` | 22 | 12 of 21 |
| `ui` | 7 | 5 of 6 |
| `prompt` | 7 | 5 of 6 |
| `gen` | 6 | 4 of 5 |
| `spin` | 6 | 5 of 5 |
| `ring` | 5 | 0 of 4 |

Through the cursor drag, `btn`'s keys land **every 2 frames at 30fps**: gaps of
`0.06, 0.07, 0.06, 0.07, 0.07, 0.07, 0.07, 0.06, 0.07`.

The rule this encodes: **a curve is a decision about a whole span, and a mechanical motion has no such
span.** A cursor does not ease. It moves where the hand moved. So you key it densely and interpolate
linearly, and the shape of the motion comes from *where the keys are*, not from a curve fitted over
them. Easing appears only where the motion genuinely settles, `easeOutCubic` at the arrival keys,
`easeInOutSine` on the one slow drift at the start.

`ring` is the deliberate opposite: 5 keys, zero linear, all cubic. It is a physical bloom, not a
mechanical move, so it gets curves.

**The failure this prevents.** Two keys plus `easeInOutCubic` produces a glide. Glide is right for a
card arriving and wrong for anything a hand or a machine is doing. `easeInOutCubic` also zeroes velocity
at BOTH ends of every segment, so a dense chain accelerates and stops once per key and the move pulses.
The same defect fixed for the camera in [`../MISTAKES.md`](../MISTAKES.md) #125 and left standing as the
per-layer default until now. **This is automatic below 0.14s per segment.**

---

## 2. Layers share one pan, and the file says it six times

This is the most load-bearing mechanic in the film and the least visible in the JSON.

```
ui      start 1.55   x-deltas [0,-30,-155,-133,-159,-95]   abs times [1.55, 2, 2.2, 2.33, 2.5, 2.67]
prompt  start 1.85   x-deltas [0,-30,-155,-133,-159,-95]   abs times [1.55, 2, 2.2, 2.33, 2.5, 2.67]
btn     start 1.55   x-deltas [0,-30,-155,-133,-159,-95]   abs times [1.55, 2, 2.2, 2.33, 2.5, 2.67]
```

Identical deltas at identical absolute times, written out three times from three different origins.
`prompt` starts 0.3s later than the other two, so **its track opens at `t: -0.3`** to cancel its own
start and land on the same wall clock.

There is a second one:

```
gen     x-deltas [0, 30, 72, 85, 41, 27]   abs times [4.22, 4.53, 4.63, 4.73, 4.83, 4.97]
spin    x-deltas [0, 30, 72, 85, 41, 27]   abs times [4.22, 4.53, 4.63, 4.73, 4.83, 4.97]
```

Five of the six moving layers belong to one of two shared pans. This is a **camera move performed in
layer space**, and it is done that way for a reason: a real camera move transforms the whole frame,
including the scrim and the things that are meant to stay put. Panning three chosen layers moves the
*page* while the frame holds still.

**The cost, and it is the point.** The engine gives you no way to SAY this, so the author typed the
same six deltas three times and kept them in sync by hand. A time-shift error in one of them is
invisible in the JSON and obvious on screen. See `panWith` in [`../PRIMITIVES.md`](../PRIMITIVES.md);
before that existed, this was the sharpest edge in the file.

---

## 3. `--p` carries what position cannot

The generate button becomes the loading dot. Position keys cannot express that, so the morph runs on a
single progress variable with a **different curve per property**:

```
width:         calc(392px - (var(--p)*0.35 + var(--p)² * 0.65) * 205px)   ← eased shrink
height:        calc(222px - var(--p) * 35px)                              ← linear
border-radius: calc(30px + var(--p)³ * 900px)                             ← late, sudden rounding
label opacity: calc(1 - var(--p)² * 3.2)                                  ← gone by ~p 0.55
```

Declared as `vars: {"--p":[0,1]}, varsDelay: 1.45, varsDur: 0.4, varsEase: "linear"`.

The insight: **one clock, many curves.** `--p` advances linearly and each property shapes its own
response by its power. The radius stays square until late and then snaps round, because cubing keeps it
near zero for most of the run. The label leaves early because `3.2×` a squared term crosses 1 fast.
Trying to do this with four separate tweens would need four delays kept in sync; here there is one.

---

## 4. Nothing lands on a round number

Starts: `0.11, 1.5, 1.55, 1.85, 3.25, 4.22, 4.38`. Durations: `1.42, 1.64, 1.21, 0.91, 0.66, 1.0`.

These are **traced off a reference at frame accuracy**, not designed on a grid. A film whose beats all
start on tenths reads as authored; this one reads as recorded. If you are recreating something, take the
timings from the thing, and do not round them to feel tidy.

The same discipline shows in the chrome: the app UI is hand-authored HTML at measured pixel coordinates
(`left:210px; top:308px; width:118px; height:116px`), traced element by element.

---

## 5. Exits are diegetic, or they are cuts

- The hook **types in at 33 cps and un-types at 60 cps** (`typing: 33, untype: 1.03, untypeRate: 60,
  caret: true`). It erases itself, faster than it arrived. It does not fade.
- `exitDur: 0` on `hook` and `gen`, cut, not faded.
- The scrim is **asymmetric**: `enterDur: 0.32`, `exitDur: 0.07`. It arrives as a fade and leaves as a
  snap.

A fade-out is the default and it is a way of declining to decide how something leaves. Ask what the
object would actually do.

---

## 6. Motion blur, once

`motionBlur: 0.16` appears on exactly one layer, `btn`, the fast traveller. Blur on everything is
mud; blur on the one thing moving fast enough to smear is physics.

---

## 7. Two colours and no third

From `themes/higgsfield.json`: *"Everything is black or lime: there is no third colour and no mid-grey
surface except the app chrome."* The restraint is written into the theme so it cannot drift later.

---

## Authoring these without typing numbers

`make studio D=<scene.json>` now **writes**. Turn on `key` mode, click a layer's bar in the timeline,
scrub to a frame, and drag the layer on the stage: that writes a motion keyframe at that frame. Existing
keys show as ticks on the bar. `undo` walks back through the session.

Why it works on tracked files: edits are **surgical text patches**, never a re-serialise
(`scripts/author/patch-motion.mjs`). A save that changes nothing is a zero-byte diff, moving one key
changes one line, and the file's hand formatting, including which of the three keyframe layouts it
uses: survives. `lib-test` holds that invariant across four scenes.

The honest limit: this is one interaction. There is no curve editor, no motion path, no onion skin, and
no key deletion in the UI yet. It makes dense keys cheap to place, which is the thing that was stopping
anyone from placing them.

## Connecting two scenes, rather than putting a video between them

Worth being precise about what the boundary machinery actually does:

| | what it does | what it does not |
|---|---|---|
| `cuts` | transforms ONE root: the frame slides, blurs, punches | the two scenes never touch |
| `seams` | genuinely samples both scenes as textures and blends in a shader | bakes ONE frame either side, so it blends two **frozen stills** |

So a seam is a real merge of two photographs. Neither joins the *content*, and the thing that actually
makes a boundary disappear is a form the eye can follow across it.

`becomes: "<layerId>"`, declared on the OUTGOING layer, is how you say so:

```json
{ "id": "card", "w": 640, "h": 380, "becomes": "dot", "becomesDur": 0.5 },
{ "id": "dot",  "w": 80,  "h": 80 }
```

The incoming layer opens on the outgoing one's **final pose**, centres matched, size matched by scale,
rotation carried, then animates away into its own geometry. Exact by construction instead of two sets
of coordinates you aligned by hand and hoped stayed aligned.

Centres, not corners: two boxes of different sizes sharing a top-left corner visibly jump. And the
centre uses the UNSCALED half-width, because CSS scales about the element's own centre so scaling does
not move it. Getting that wrong put a handover 160px out and it still looked *almost* right, which is
the worst kind of wrong for a match cut.

A form that states no `w`/`h` is measured, not assumed. A `text` layer's box is its glyphs, so the most
natural match cut anyone writes, a word becoming a card, has nothing to declare; the handover reads the
box the browser laid out, the same measurement `boxOf` answers from. It has to be measured rather than
retyped, because the real width of a word depends on the theme's face: the same 180px `LATENCY` measures
781px in `vawe`, 837px in `linear` and 796px in `higgsfield`, and no number an author types tracks all
three. Until 2026-08 an unsized side scored 0x0 instead: the scale collapsed to 1 and the centre landed
on the layer's top-left corner, so the handover was wrong and said nothing (`docs/MISTAKES.md` #461).
A form that measures nothing on either axis is now refused by name.

`validate` fails a `becomes` whose two layers do not meet at the boundary, naming the gap in seconds. A
match that drifts is exactly the failure this exists to remove, so it is checked rather than trusted.

## The checklist

When a film has the right spine and still feels cheap, in order of how often it is the answer:

1. Is every move two keys and a curve? Key the mechanical ones densely and go linear between.
2. Do things that belong to the same surface move together, or does each drift on its own timing?
3. Is there a state change that position cannot express, being faked with position?
4. Are all the timings round?
5. Does anything just fade out that could leave the way it arrived?

## See also

- [`../../skills/vawe-continuous-action/SKILL.md`](../../skills/vawe-continuous-action/SKILL.md). The grammar: one object, every cut a state change
- [`../MOTION-CRAFT.md`](../MOTION-CRAFT.md), which curve, which cut, when
- [`DIRECTION.md`](DIRECTION.md): pacing and restraint, and the gates that enforce them
- [`../MISTAKES.md`](../MISTAKES.md) #164: this film trips the continuity gate at its sensitive threshold; the exemplar is not gate-clean, and that is a fact about the gate

## The box track (`w` / `h`): resizing is not scaling

`scale` magnifies a layer and everything drawn in it. A **box track** changes the frame the content
lives in and lets the content re-fit. That is the difference between zooming a photo grid and
reflowing one, and it is what a collapsing sidebar, an expanding card and every FLIP transition are
made of. Before it existed the only ways to attempt those were to scale (the picture stretches) or to
cross-fade two layouts (a slideshow across a cut). See `docs/MISTAKES.md` #206.

```json
{ "type": "image", "src": "…", "x": 540, "y": 150, "w": 374, "h": 250, "radius": 6,
  "motion": [
    { "t": 0,    "x": 0,   "y": 0,   "w": 374, "h": 250 },
    { "t": 0.35, "x": -314, "y": -16, "w": 480, "h": 261, "ease": "brake" }
  ] }
```

Three rules, all enforced:

1. **The layer needs a resting `w`/`h`.** A width has no identity constant the way `x` has 0, so a key
   that animates a box the layer never declared has nothing to animate from. Hard error.
2. **State it on one key and every key inherits it.** `resolveBoxes` fills the rest from the layer, so
   `motionAt` keeps one interpretation rule: both endpoints carry the value or neither does.
3. **An image needs `radius` or `ken`** or the photograph stretches with the box instead of re-cropping
   inside it. `radius: 0` is enough; it is what switches the `<img>` to cover-fit. Flagged at validate.

Working example: `scripts/author/build-zerochrome.mjs` → `formats/scene/zerochrome.json`.

### A reflow has a speed floor

`w`/`h` are **layout** properties, and the browser compositor snaps layout to whole device pixels while
transforms (`x`, `y`, `scale`, `rot`) interpolate sub-pixel. So a box track that moves less than about
one device pixel per frame does not crawl, it **holds for several frames and then jumps**.

Measured on this engine: a rect widening 40px over 4s at 60fps (0.167 px/frame) produced 81 distinct
edge positions across 240 frames, against 155 for an identical `x` tween. Steps of 0, 0, 0, then 0.5px.

Two things follow:

- **Keep a reflow brisk.** The `zerochrome` and `onefile` reflows move ~4.8 px/frame, thirty times the
  quantum, and are perfectly smooth. A slow, luxurious box settle is the case that stutters. If you want
  a slow size change on something whose contents may distort, use `scale` instead and accept that the
  contents scale with it; if the contents must re-fit, the box must move quickly.
- **The steps are 0.5px, not 1px, and that is `ss=2` doing a second job.** Supersampling halves the
  layout-snap quantum as well as anti-aliasing edges. It was documented as only doing the second.

The rule this borrows from is another engine', which forbids animating layout properties outright and lints
for it. vawe does not need the lint: `motionAt` returns transforms, so 91% of the library's motion keys
are transforms by construction. The box track is the deliberate exception, and this is its cost.
