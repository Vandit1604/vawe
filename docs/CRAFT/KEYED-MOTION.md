# KEYED MOTION — how the exemplar actually moves

`formats/scene/higgsfield-recreation.json` is cited across this repo as the exemplar, and everything
written about it so far is about its **grammar**: one object, on screen from the first frame, and every
cut is that object changing state ([`../../.claude/skills/vawe-continuous-action/SKILL.md`](../../.claude/skills/vawe-continuous-action/SKILL.md)).
That is the *what*. This file is the *how* — the motion mechanics that make it read as a product film
rather than a competent slideshow, stated as numbers you can check in the JSON rather than as taste.

**Read this when** a film has the right structure and still feels amateur, or when you are recreating a
reference and cannot work out why yours drifts while the original snaps.

> **This is a REGISTER, not a floor.** Everything below is expensive: the exemplar is 5 seconds and
> carries 73 hand-written motion keys. Most films should not pay that. Choose it deliberately, for a
> hero beat or a recreation, and know what you are buying. Nothing here is gated and nothing should be.

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
them. Easing appears only where the motion genuinely settles — `easeOutCubic` at the arrival keys,
`easeInOutSine` on the one slow drift at the start.

`ring` is the deliberate opposite: 5 keys, zero linear, all cubic. It is a physical bloom, not a
mechanical move, so it gets curves.

**The failure this prevents.** Two keys plus `easeInOutCubic` is the default reach, and it produces a
glide. Glide is right for a card arriving and wrong for anything a hand or a machine is doing.

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
- `exitDur: 0` on `hook` and `gen` — cut, not faded.
- The scrim is **asymmetric**: `enterDur: 0.32`, `exitDur: 0.07`. It arrives as a fade and leaves as a
  snap.

A fade-out is the default and it is a way of declining to decide how something leaves. Ask what the
object would actually do.

---

## 6. Motion blur, once

`motionBlur: 0.16` appears on exactly one layer — `btn`, the fast traveller. Blur on everything is
mud; blur on the one thing moving fast enough to smear is physics.

---

## 7. Two colours and no third

From `themes/higgsfield.json`: *"Everything is black or lime: there is no third colour and no mid-grey
surface except the app chrome."* The restraint is written into the theme so it cannot drift later.

---

## The checklist

When a film has the right spine and still feels cheap, in order of how often it is the answer:

1. Is every move two keys and a curve? Key the mechanical ones densely and go linear between.
2. Do things that belong to the same surface move together, or does each drift on its own timing?
3. Is there a state change that position cannot express, being faked with position?
4. Are all the timings round?
5. Does anything just fade out that could leave the way it arrived?

## See also

- [`../../.claude/skills/vawe-continuous-action/SKILL.md`](../../.claude/skills/vawe-continuous-action/SKILL.md) — the grammar: one object, every cut a state change
- [`../MOTION-CRAFT.md`](../MOTION-CRAFT.md) — which curve, which cut, when
- [`DIRECTION.md`](DIRECTION.md) — pacing and restraint, and the gates that enforce them
- [`../MISTAKES.md`](../MISTAKES.md) #164 — this film trips the continuity gate at its sensitive threshold; the exemplar is not gate-clean, and that is a fact about the gate
