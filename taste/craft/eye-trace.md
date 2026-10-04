---
when: a cut moves the subject across the frame, or a beat needs the eye moved on purpose
answers: "where the eye is at each cut · the attention ranking · how to steer it with light, focus and motion · what to do when a cut makes the eye jump"
group: look
---

# Eye-trace: where the viewer is looking when you cut

Nothing measures this. Judge it by eye on the frames on both sides of a cut (`bin/vawe critique`).

## The rule

The rules are [eye-trace](../rules/eye-trace.md) and [eye-path](../rules/eye-path.md).

Read the focal point of the frame before the cut. Put the incoming subject at or near that same screen
point. Do not make the eye cross the frame at a junction
([Derek Lieu](https://www.derek-lieu.com/blog/4/6/good-eye-trace-for-smooth-editing)).

Murch ranks eye-trace fourth of six, at 7 %, under emotion (51 %), story (23 %) and rhythm (10 %). Sacrifice
upward from the bottom: a cut that serves the story may cost the eye a journey. So this is a strong
default, not a wall.

## What the eye picks

The eye ranks targets in a fixed order: brighter, larger, in focus, moving, eyes, mouth
([EditMentor](https://editmentor.com/blog/eye-trace-in-filmmaking-a-visual-journey/)). A built frame has
no face, so four terms remain. The focal point is the winner among the live elements, not what you meant
it to be.

Brighter means contrast against the ground, not luminance. White type on a white field is the brightest
thing in the frame and nobody looks at it.

## The eye is steered, not only ranked

A ranking says where the eye lands at a cut. It says nothing about moving the eye on purpose while the
shot runs. All four ranked terms can be animated:

| term | how you move it |
|---|---|
| brighter | a glow whose intensity, radius and colour change over the shot (CSS custom properties driving a gradient or `filter`): cold to hot, wide to tight |
| larger | travel in Z (a `translateZ` under perspective) instead of scaling, so the element grows by approaching and stays crisp |
| in focus | rack the blur from one plane to another, so the cast reacts by where it stands |
| moving | a keyed path, or a beam of light that sweeps and reveals what it touches (a `mask-image` moving over the words) |

Three moves, in the order they pay off:

1. **Light the subject, then move the light.** A glow parked on the hero for the whole beat stops being
   seen within a second. A glow that arrives cold and wide, tightens and goes hot as the beat resolves is
   the instrument. The change is the instrument, and the light on its own is decoration.
2. **Rack, do not cut.** When two things share a frame and the second matters now, focusing on it moves
   the eye without moving the camera or spending a cut.
3. **Reveal with the light.** A beam used as a mask means the words are found, not faded in. The eye already
   tracks the light, so it reads each word as it arrives.

## Ask this of every beat

Where is the eye at the start of this shot, where should it be at the end, and what moves it? "It stays
where the cut put it" is a fair answer on a held beat and a failure on any other.

## When a cut makes the eye jump

In order of cost:

1. **Move the incoming subject.** Place the next beat's headline where the last beat's focal point was.
   This is free in a built film.
2. **Aim the outgoing beat at it.** An element travelling toward the corner the next beat opens in, a
   camera move ending on the next subject, a wipe pointing at it.
3. **Give the next beat more time.** A jump you keep needs a longer beat to absorb. A run of short beats,
   each demanding a jump, never lets the viewer catch up.
4. **Keep the jump and say why.** A cut that serves the story outranks the eye four times over. Declare it
   in the page's `authoring` block with a reason (`AGENTS.md`, Waivers; [eye-trace](../rules/eye-trace.md)).

No source publishes a distance threshold. Every source says "avoid making the eye travel" and none says how far.
A rough working figure from this repo's old measurements is in [eye-trace](../rules/eye-trace.md): a jump over that share of the frame
diagonal is one the viewer notices, and re-acquiring the subject costs a fraction of a second.

## Sources

- Derek Lieu, "Good Eye Trace For Smooth Editing".
- EditMentor, "Eye Trace in Filmmaking".
- Murch's Rule of Six, via [PremiumBeat](https://www.premiumbeat.com/blog/when-and-where-to-make-the-cut-inspired-by-walter-murchs-in-the-blink-of-an-eye/).
