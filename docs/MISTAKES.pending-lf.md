---
when: "a fidelity metric passes something a human rejects, or a generator can only draw one picture"
answers: "four lightfield findings waiting to be folded into docs/MISTAKES.md: a metric blind to shadows, a colour role doing two jobs, a constant fitted to one image, and a prominence filter that gave up"
group: look
title: Lightfield findings, pending
what: Findings from templatizing the lightfield generator, staged for docs/MISTAKES.md.
---

# Lightfield findings, pending

Four findings from making one lightfield generator reach three different reference photographs.
They belong in `docs/MISTAKES.md` and are staged here because another agent held that file.

---

## A. A fidelity metric that samples only the lit half

**What happened.** The `ref` preset scored a mean sample distance of 12.7 against
`refs/lightfield-ref.jpg`, every other number agreed, and the human who asked for it said it did not
match. The reference's shadows are cool: `rgb(0,2,11)` navy down the right third, `rgb(23,12,35)`
violet in the dark lower left. The render's were `rgb(11,4,4)` and `rgb(83,5,12)`, both warm.

**Root cause.** All four sample points had been chosen in bright areas, because that is where a
palette is easiest to read. Everything else the tool printed was a mean over the whole frame, and a
mean over a mostly-lit picture is a report on the lit part. There was no number anywhere that could
come out wrong when the shadows were wrong.

**Why the fix was not obvious.** Adding shadow sample points would have fixed this image and nothing
else, because a sample point is a coordinate and coordinates do not transfer between references.

**Fix.** `lightfield-compare.mjs` now cuts the frame into an 8x5 grid and splits the cells into
shadow, mid and highlight bands using the REFERENCE's luma, never the render's, so a field that lost
its shadows cannot redefine what a shadow is and then pass. Each band reports dE, its worst cell, and
warmth as `r - b` for both pictures. Warmth is reported because dE cannot tell a violet miss from a
green one, and warm-versus-cool is the axis an eye grades a shadow on.

**The number that proves the old number was empty.** After the defect was fixed, the mean sample
distance went from 12.7 to 12.4. It never had an opinion. The shadow band's warmth error went from
+14.8 to +6.5, and the right-edge sample from `#050403` (r-b +1.5, warm) to `#06060d` (r-b -7.1),
against a reference at -9.0.

**Which gate now catches it.** `lightfield-compare.mjs`, TONAL BANDS. Every mean is printed beside
its worst cell.

**The general rule.** This is `docs/MISTAKES.md` #262 in a third costume. A metric that averages, or
that samples where the subject is easy to read, cannot see the defect it was written to catch. When a
human rejects something every number passed, the first suspect is the sampling, not the render.

---

## B. One colour role doing two jobs, and the measurement that proved it

**What happened.** The obvious fix for warm shadows was to make `ground`, the colour the light falls
away into, violet. It made the temperature right and the picture worse.

| `ground` | shadow band warmth error | shadow band dE | brightest mid cell, r-b |
|---|---|---|---|
| `#000202` | +14.8 | 28.0 | 133 |
| `#12082a` | -2.6 | **42.2** | **55** |

**Root cause.** `ground` is not only the backdrop. It is also the far stop of the body gradient,
mixed with `deep` at 35% and 70% across the frame, so a violet ground drags the LIT field violet too.
One name, two jobs, and the two jobs want different colours.

**Fix.** A new role, `colour.shade`: ambient fill, blended with `screen`, sitting above the colour
field and below the pattern because fill is light and the blind occludes it like any other light.
Screen lifts black to exactly that colour and leaves white exactly white, which is the physical
reason real photographs have warm light and cool shadows at once. `#000000` is the exact identity, so
the dial removes itself at its default and emits no layer.

**What it does not do.** It cannot fix a region that is red because of where the blobs are. The worst
cell in `ref` is unchanged: `#1a0818` in the reference against `#5c0817` here, because the `deep`
blob genuinely sits in that corner.

**The general rule.** When a dial fixes the thing you asked about and breaks two things you did not,
check how many jobs it has. A role used in two places is not a dial, it is a coupling.

---

## C. A constant fitted to one image, imposed on every image after it

**What happened.** Two of three reference photographs came out with three hard-edged ellipses across
them that nothing in the palette could hide.

**Root cause.** How fast a bloom lobe fades was a module constant, `RAMP = { mid: 0.85, pos: 30, end:
80 }`, and it carried a comment saying it was deliberate and measured: on `refs/lightfield-ref.jpg` a
tight ramp scored 18.13 where a gentle one scored 18.60. That comment was true. That image really
does have lobes with edges you can point at. The constant was correct and the generalisation was
never made, so every later field inherited one photograph's lighting.

**Fix.** `colour.spread`, 0 to 1, where 0 is the fitted ramp exactly and 1 melts the lobes into one
mass. The field the constant was chosen for does not move by a byte.

**The general rule.** A fitted constant is a fitted constant even when the comment above it is
excellent. The comment records that it measured better THERE; it is not evidence about anywhere else.
When a generator can only draw one picture, look first at whatever was measured once and then frozen.

---

## D. A prominence filter with a fixed pass count

**What happened.** The new band-counting metric reported 292 bands for a picture with twelve panels.

**Root cause.** It counts local maxima in a column-luma profile and collapses the extrema chain until
every remaining swing clears a prominence floor, and the collapse loop was written
`for (let pass = 0; pass < 64; pass++)`. A profile made of solid silhouettes has flat plateaus, a flat
plateau throws off hundreds of near-equal extrema, and 64 passes left most of them in. The loop hit
its cap and returned a number as if it had finished.

**Fix.** Bound the loop by the number of extrema, which is the real bound, since each pass removes
two. The same picture then reported 10 against the reference's 12.

**The general rule.** An iteration cap that can be reached in normal use is a silent wrong answer.
Bound a loop by the thing that makes it terminate, or make hitting the bound loud.

---

## Also found, not fixed

`scripts/author/lightfield-fit.mjs` imported `open`, `W` and `H` from `lightfield-render.mjs`, which
exported none of them, so the tool could not run at all and nothing said so. `open()` now exists (one
browser, many option sets, one screenshot decoded at every requested size) and `lightfield-shot.mjs`
shares its page shell rather than writing a second copy: two pages is two pictures the moment either
copy is edited. The rest of `lightfield-fit.mjs` has not been re-run end to end and its cost function
still has no shadow term.

The `make lightfield` loop hardcodes `for p in ref tide fern` and does not know about the two new
presets. The Makefile was out of this pass's territory.
