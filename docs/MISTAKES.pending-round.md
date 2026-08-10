---
when: "you are about to fold the round-shapes and placement pass into docs/MISTAKES.md"
answers: "why the envelope had no round curve and no position, why the shadow had a bearing but no place, and why the committed HTML fragments were stale"
group: look
title: Pending mistakes, lightfield round pass
what: Findings from the pass that gave the envelope circular shapes and gave the shadow and the mass a position. Fold into docs/MISTAKES.md.
---

# Pending: the lightfield round pass

Four findings. Three are the same class the lightfield keeps producing, a vocabulary gap wearing the
mask of a value problem. The fourth is a stale artefact nobody regenerates.

## 1. Every curve in the envelope was a sine or a straight line

**What.** A user looked at `colonnade` and said the dark mass was an angular ridge, a jagged V of
straight segments, and asked for round. The dial they needed was `envelope.kind`, and it held `full`,
`ramp`, `arch`, `valley` and `wave`. Only `arch` and `valley` curve at all, and both are sines.

**Root cause.** The shapes were added one at a time to serve a reference, and every reference so far
wanted a slope or a hump. `arch` was treated as "the round one" because it is not straight. It is
not round: a sine leaves the baseline at a finite slope and its shoulders sag, so a mass built on it
reads as a bump with sloping sides. A circle leaves the baseline UPRIGHT. That single property is
most of what the eye calls round, and no value of `from`, `to`, `jitter` or `softness` could add it,
because it is a property of the function and not of its range. The angular ridge the user saw was
`valley` plus `jitter` 0.3 plus noise: a sine with corners shaken into it.

**Fix.** Four kinds built from circular arcs and gaussians rather than from sines: `circle` (the exact
unit semicircular arc, symmetric), `crescent` (one arc with an equal arc bitten out of it), `scallops`
(five semicircles in a row) and `hills` (three unequal gaussians summed). No new plumbing: `mass`
already turns any curve into a silhouette, which is the design working.

**Which gate catches it.** `lightfield-test.mjs` now asserts the circle against the circle's own
equation, sample by sample, rather than asserting that it looks like a hump. It also asserts every
round kind reaches 1 at its ceiling, so `from` and `to` keep one meaning across the table.

**What was NOT added, and why.** A round valley, because `from` above `to` already runs any curve
backwards and `circle` reversed IS the bowl. A lens or a vesica, because an envelope is anchored to
an edge and therefore cannot describe a floating form; the only part of a lens an anchored envelope
can express is its upper arc, which is a slightly pointier circle. A kind that draws a picture
another kind already reaches is a dial nobody needs.

## 2. `shadow.direction` is a bearing, and a bearing is not a place

**What.** The light could be moved anywhere in the frame with `colour.originX/originY`. The shadow it
cast could not be moved at all. Eleven direction keywords say which WAY the dark lies and never how
far off centre it sits, and the radial centre, the lit band and the vignette were all nailed to the
middle of the frame in the source.

**Root cause.** The same one as `colour.spread` and `colour.lobes` before it: a number fitted to one
photograph, then imposed on every field after it. `at 50% 50%` and `at 50% 46%` are literals in
`paintShadow`, and they were right for the references that were in front of the author.

**Fix.** `shadow.originX` / `shadow.originY`, the same units and the same name as the light's pair,
default 50/50 which is exactly the unmoved position. What it reaches depends on the shape
`direction` names: the whole vector for a radial, the axis it runs on for a paired band, and for a
one-way bearing the component along the fall (which delays or advances it) plus the whole vector on
the vignette. That limit is a property of a linear gradient, which has a direction and no centre, and
it is written into the option comment and the doc rather than left for someone to discover.

## 3. The silhouette had no position, so authors picked its shape for the wrong reason

**What.** `envelope.from` and `to` say how TALL the mass is and `kind` says what SHAPE it is. Nothing
said WHERE. So an author who wanted the crest three quarters of the way across had to hunt for a kind
that happens to peak there.

**Root cause.** The envelope grew out of "an extent as a function of position", and a function has no
position of its own. Nobody noticed that the missing dial was the one the light already had.

**Fix.** `envelope.originX` / `envelope.originY`, same units, same name, default 50/50 unmoved.
`originX` slides the sample point, so the crest moves. `originY` always moves the silhouette's free
edge DOWN the frame as it rises, whichever edge `anchor` holds, so it means one thing from both sides.

**The general lesson.** Three things in this generator can be somewhere: the light, the dark, and the
mass. One of them had a position, one had only a bearing, and one had nothing, and they were asked
for in three different languages. When an API can place one thing, check every other thing of the
same kind before shipping.

## 4. The committed HTML fragments were stale, and nothing said so

**What.** `formats/scene/_lightfield-ember.html` and `_lightfield-colonnade.html` in the tree did not
match what their own presets generate. Colonnade's committed fragment still carried the `center`
radial shadow that the preset moved off to `top-and-bottom`, which is the change that took its block
error from 21.5 to 19.1. Anyone reading the committed file was reading a picture the library no longer
produces.

**Root cause.** The fragments are generated by hand with `scripts/author/lightfield.mjs --out`, and a
pass that changes a preset has no reason to remember them. `lightfield-check.mjs` renders from the
preset in memory, so it is green either way and cannot see the drift.

**Fix in this pass.** Regenerated all three. **Not fixed:** nothing regenerates or verifies them. The
cheap gate is a check that re-renders each `formats/scene/_lightfield-*.html` from its preset and
fails on a diff, which is the same shape as the receipt `make beats` already uses. That belongs in the
Makefile, which this pass was not allowed to touch.
