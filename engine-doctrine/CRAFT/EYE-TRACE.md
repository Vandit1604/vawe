---
when: a cut moves the subject across the frame
answers: "where the eye is at each cut · the attention ranking · our 0.30 threshold and where it came from · why it reports"
group: look
codes: eye-trace, camera-aimed-at-nothing
---

# Eye-trace: where the viewer is looking when you cut

## AGENT SUMMARY

- At each cut, put the incoming subject at or near the screen point the eye was on before the cut. Do not make the eye cross the frame at a junction.
- `[ref: node quality/gates/eye-trace.mjs <scene.json>]` (code: `eye-trace`). It REPORTS only and never blocks: Murch ranks eye-trace 4th of 6, at 7%, below emotion/story/rhythm, so a cut that serves the story is allowed to cost the eye a journey. `camera-aimed-at-nothing` is a related but separate finding, owned by `quality/gates/beat-check.mjs`, not this gate: it fires when the camera has travelled off content that is still alive.
- Checkable action: where is the eye at the start of this shot, where should it be at the end, and what moves it?

Murch ranks eye-trace fourth of six, at 7%, under emotion (51%), story (23%) and rhythm (10%).
`quality/gates/eye-trace.mjs` measures it.

Read the ranking before you read anything else here. Murch's instruction is to **sacrifice upward from
the bottom**: a cut that serves the story is allowed to cost the eye a journey. So this is a REPORT.
It prints a number and stops nobody. A gate that blocked on the 7% item would make it the one thing a
film cannot spend, which inverts the ranking it came from.

```bash
node quality/gates/eye-trace.mjs films/scene/<topic>.json     # one film
node quality/gates/eye-trace.mjs --selftest                     # the scorer's own fixtures
node quality/gates/eye-trace.mjs --census [--worst]             # the whole library
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

## The eye is STEERED, not only ranked

Everything above answers one question: at the instant of a cut, who wins. That is a ranking taken on a
single frame, and it is the whole of what a static gate can ask.

It is not the whole of the craft, and the gap is not small. A ranking says where the eye lands. It says
nothing about **moving the eye on purpose while the shot is running**, which is what a motion designer
means by controlling a viewer. The instrument for that is almost always light: you make one thing the
brightest thing in the frame, then you move which thing that is. The eye follows because it has no
choice.

**All four ranked terms are animatable.** The ranking is `brighter > larger > in focus > moving`.

| term | how you move it | where |
|---|---|---|
| brighter | a glow whose intensity, radius AND colour key over the shot: cold to hot, wide to tight | `--glow-i` · `--glow-r` · `--glow-c` |
| larger | travel in Z rather than scale, so the thing grows by approaching and stays crisp | `depth` + `--plane-z` |
| in focus | the camera's own focus, racked from one plane to another | camera `f` and `a` |
| moving | a hand-keyed track, or a beam of light that sweeps and reveals what it touches | `motion` · `beam` + `matte` |

**"In focus" is one keyframe pair.** A camera focus rack (camera `f` and `a`) moves what is sharp, and
the whole cast reacts by where it stands, no per-layer blur keyed by hand.

### How to actually use it

Three moves, in the order they are worth reaching for:

1. **Light the subject, then move the light.** Not a glow parked on the hero for the whole beat, which
   the eye stops seeing within a second. A glow that arrives cold and wide, tightens, and goes hot as
   the beat resolves. The change is the instrument; the light on its own is decoration.
2. **Rack, do not cut.** When two things share a frame and the second one matters now, focusing on it
   moves the eye without moving the camera or spending a cut. Murch's ranking is why this is worth
   knowing: a cut costs you the top of the list, and a rack costs nothing.
3. **Reveal with the light rather than under it.** A beam used as a matte means the words do not fade
   in, they are *found*. The eye is already tracking the light, so it is looking at each word as it
   arrives instead of being handed a finished line.

### What no gate here will ever tell you

`eye-trace.mjs` scores the junctions. It cannot see the journey **between** them, because a journey is
a sequence of intentions and the gate reads one frame at a time. A beat can pass every junction and
still leave the viewer's eye parked in the middle of the frame for four seconds because nothing ever
asked it to move.

So the question this document cannot answer for you, and the one worth asking of every beat: **where is
the eye at the START of this shot, where should it be at the END, and what moves it.** If the answer is
"it stays where the cut put it", that is a legitimate choice on a held beat and a failure on any other.

## The two constants, and both are ours

No source publishes a distance threshold. Every one says "avoid making the eye travel" and none says
how far. So these came from this library, not from a citation, and they must never be cited to one.

**`JUMP_FAR = 0.30`** of the frame diagonal. It was the 90th percentile of the junctions where the focal
SUBJECT actually changes, measured when the library was smaller; re-run `--census` before quoting a
distribution here; a stale percentile becomes a threshold nobody re-checked. As of this audit, 288
junctions across 177 scenes, 163 (57%) hold one subject and travel zero by construction; the other 125
distribute median 0.064, p75 0.171, p90 0.327, max 3.739, with 15 of them (12%) over `JUMP_FAR`.

**`RECOVER = 0.30s`** for a full-diagonal jump, scaled linearly with distance. The sources say
re-acquisition costs "a fraction of a second" and publish no number.

## Debt: the shape, not the moment

Re-acquisition costs time, so a run of short beats each demanding a jump never lets the viewer catch
up. Three ways to measure that, and only two of them discriminate.

- **`reacquire`**: the share of runtime the eye spends travelling. This separates films. The busiest
  in this library sits at 7.11% (`together-recreation`); most sit under 1%.
- **`peak`**: the classic running debt in seconds, a jump adding cost and the next beat paying it off.
  It is **INERT** here and probably everywhere: it peaks at 1.41s across the whole library, because one
  saccade never outruns one beat. Kept and printed so nobody rebuilds it expecting it to fire.
- **`no-time-to-catch-up`**: a jump over `JUMP_FAR` followed by a beat SHORTER than that film's own
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

- Derek Lieu, "Good Eye Trace For Smooth Editing": https://www.derek-lieu.com/blog/4/6/good-eye-trace-for-smooth-editing
- EditMentor, "Eye Trace in Filmmaking": https://editmentor.com/blog/eye-trace-in-filmmaking-a-visual-journey/
- Murch's Rule of Six, via PremiumBeat: https://www.premiumbeat.com/blog/when-and-where-to-make-the-cut-inspired-by-walter-murchs-in-the-blink-of-an-eye/
- A challenge to the Rule of Six's treatment of eye-trace exists and is recorded here unread,
  https://nofilmschool.com/2018/08/editing-eye-trace-mind-rule-six-incorrect
