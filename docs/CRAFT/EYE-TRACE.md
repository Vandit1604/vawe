# Eye-trace: where the viewer is looking when you cut

Murch ranks eye-trace fourth of six, at 7%, under emotion (51%), story (23%) and rhythm (10%). Three
docs in this repo discussed it and nothing measured it. `scripts/gates/eye-trace.mjs` measures it.

Read the ranking before you read anything else here. Murch's instruction is to **sacrifice upward from
the bottom**: a cut that serves the story is allowed to cost the eye a journey. So this is a REPORT.
It prints a number and stops nobody. A gate that blocked on the 7% item would make it the one thing a
film cannot spend, which inverts the ranking it came from.

```bash
node scripts/gates/eye-trace.mjs formats/scene/<topic>.json     # one film
node scripts/gates/eye-trace.mjs --selftest                     # the scorer's own fixtures
node scripts/gates/eye-trace.mjs --census [--worst]             # the whole library
```

## The rule, in one sentence

Read the focal point of the frame before the cut. Put the incoming subject at or near that same screen
point. Do not make the eye cross the frame at a junction.
([Derek Lieu](https://www.derek-lieu.com/blog/4/6/good-eye-trace-for-smooth-editing))

## What makes it computable

The eye ranks targets in a fixed order: **brighter > larger > in focus > moving > eyes > mouth**
([EditMentor](https://editmentor.com/blog/eye-trace-in-filmmaking-a-visual-journey/)). Eyes and mouth
need a face and have no subject in a built frame, so four terms remain. The focal point is therefore a
**scored winner among the live layers**, not what you meant it to be.

The gate scores all four from the JSON, weighted 0.35 / 0.30 / 0.20 / 0.15 in that order, each term
normalised against the largest value among the layers alive in that frame.

| term | what the gate reads |
|---|---|
| brighter | **contrast against the backdrop**, not luminance. The ground comes from `bgPreset()`, which is the code that paints it. A layer colour is a hex, an `rgb()`, or a `var(--token)` resolved through the theme palette. Anything else (a `color-mix`, a gradient, an inherited colour) is UNKNOWN and dropped, never guessed. |
| larger | the declared box, clipped to the camera's view, refusing to invent an undeclared axis |
| in focus | the `blur` channel of the motion track, plus a declared blur filter |
| moving | per-frame centroid displacement, plus a nominal while a layer is inside its entrance or exit ramp |

**Why contrast and not brightness.** The source assumed film, where bright is bright. In a built frame
white type on a white field is the brightest thing in the scene and nobody looks at it. Contrast
against the ground is the question that transfers.

**What the gate cannot see, stated plainly.** It scores JSON, not pixels. It does not know a captured
component's internal composition, what an `html` fragment paints, or where a face is. About 40% of the
layers it scores carry a colour it cannot resolve, and it says so on every verdict. If it disagrees
with your eyes, your eyes win: `make beats`.

## The two constants, and both are ours

No source publishes a distance threshold. Every one says "avoid making the eye travel" and none says
how far. So these came from this library, not from a citation, and they must never be cited to one.

**`JUMP_FAR = 0.30`** of the frame diagonal. It is the 90th percentile of the junctions in this library
where the focal SUBJECT actually changes. Of 185 junctions across 135 scenes, 132 hold one subject
across the cut and travel zero by construction; the other 53 distribute median 0.15, p75 0.19,
p90 0.30, max 0.53. So one junction in ten in a normal film here is expected to clear it. Re-derive it
with `--census` when the library grows.

**`RECOVER = 0.30s`** for a full-diagonal jump, scaled linearly with distance. The sources say
re-acquisition costs "a fraction of a second" and publish no number.

## Debt: the shape, not the moment

Re-acquisition costs time, so a run of short beats each demanding a jump never lets the viewer catch
up. Three ways to measure that, and only two of them discriminate.

- **`reacquire`** — the share of runtime the eye spends travelling. This separates films. The busiest
  in this library sits at 1.8%; most sit under 1%.
- **`peak`** — the classic running debt in seconds, a jump adding cost and the next beat paying it off.
  It is **INERT** here and probably everywhere: it peaks at 0.38s across the whole library, because one
  saccade never outruns one beat. Kept and printed so nobody rebuilds it expecting it to fire.
- **`no-time-to-catch-up`** — a jump over `JUMP_FAR` followed by a beat SHORTER than that film's own
  median. This is the pairing the source names and it fires. Two films in this library trip it.

Grading each film against its own median beat is deliberate. A wall-clock constant would grade a 3s
manifesto and a 0.9s metric-cut list film by the same rhythm, and one of them would always be wrong.

## What to do when it fires

In order of how cheap it is.

1. **Move the incoming subject.** The one advantage a built film has over a shot one: you can place the
   next beat's headline where the last beat's focal point was, exactly, for free.
2. **Aim the outgoing beat at it.** Better than matching. A layer travelling toward the corner the next
   beat opens in, a camera move ending on the next subject, a wipe pointing at it.
3. **Give the next beat more time.** A jump you want to keep is a jump the viewer needs a longer beat
   to absorb.
4. **Keep the jump and say why.** A cut that serves the story outranks the eye four times over. Waive
   it with a reason: `{"authoring":{"allow":["eye-jumps-the-frame"],"_why":{...}}}`.

## Known limits

- **A side with one live layer.** When only one layer is on screen, the winner won by being alone. The
  gate marks the row `← 1 layer on screen`. On a persistent corner watermark that is dead air, and
  `beat-check` owns it; fix the hole before you move a headline.
- **The ink centre of wide type is estimated.** A text layer declares a box and CSS puts the glyphs at
  one end of it; `align` is unset for 511 of the 1215 sized text layers here, and CSS defaults to left.
  So the centroid uses a 0.55em advance estimate CLAMPED to the declared box. It touches the centroid
  only. The `large` term still reads the declared box, unestimated, so the term that got
  `visual-vocabulary` deleted for squaring an unknown axis is not fed by a guess.
- **It proves nothing about whether the cut is good.** It measures how far the eye travels, never
  whether the travel was worth it.

## Sources

- Derek Lieu, "Good Eye Trace For Smooth Editing" — https://www.derek-lieu.com/blog/4/6/good-eye-trace-for-smooth-editing
- EditMentor, "Eye Trace in Filmmaking" — https://editmentor.com/blog/eye-trace-in-filmmaking-a-visual-journey/
- Murch's Rule of Six, via PremiumBeat — https://www.premiumbeat.com/blog/when-and-where-to-make-the-cut-inspired-by-walter-murchs-in-the-blink-of-an-eye/
- A challenge to the Rule of Six's treatment of eye-trace exists and is recorded here unread —
  https://nofilmschool.com/2018/08/editing-eye-trace-mind-rule-six-incorrect
