---
when: the film must hold together and its subject is NOT one object that transforms
answers: "the threads that are not a travelling prop: a sentence completed across cuts, a match cut on shape or motion, a rhythm, a camera that keeps travelling · how each satisfies the continuity floor"
group: crosscutting
---

# Continuity without an object

## AGENT SUMMARY

- A film does not need one object to survive a cut. Carry continuity in TWO OR MORE registers at once
  (unfinished sentence, match cut, camera travel, rhythm, counter, question); a transforming prop is the
  cheapest register and the one Murch ranks last (4%).
- `no-continuous-object` (opt-in, `TASTE=1 make author-check` or `make direction-floor`) sees only the
  prop register. A film held by the other registers needs a waiver with a `_why` naming the thread.
- Checkable action: how many threads carry this film across its cuts, and in which registers?

`no-continuous-object` asks a film to STAY WITH a subject across its cuts. This library has answered that
question the same way eighteen times: keep one rectangle alive and key its `w` and `h`. That satisfies the
gate. It is also the cheapest answer available, and three consecutive films built on it passed every gate
while being visually inert.

This page exists because a reference film in `refs/` holds together across ten cuts in eighteen seconds
without keeping one prop alive through them, and is plainly better than what we build.

MEASURE IT BEFORE YOU COPY IT. A contact sheet undercounts continuity: pulling frames across the light
section of the reference shows a large grey band curving through shot after shot, at 5.7s, 6.3s, 9.0s,
9.7s and 10.4s, dropping out for a black interlude and coming back. Props sit along it and it shifts
between shots, so it reads as a camera travelling one continuous curved surface. The film is MORE
continuous than a contact sheet suggests.

What it actually runs is TWO THREADS AT ONCE:
  - a grammatical one, one clause per shot, none of them finishing;
  - a spatial one, a path the camera moves along, which the black shots deliberately break for emphasis.

That is the lesson, and it is a stronger one than "you can skip continuity". Continuity is not something the
good films do less of. It is something they carry in more than one register at the same time, so no single
register has to be literal. The prop does not need to survive the cut when the sentence and the space
already do.

The pace is worth measuring too: shot lengths run 0.76s to 3.2s with a MEDIAN OF 1.52s. Our films sit at
2.5-4s a beat, which is roughly half the cut rate, and no amount of good composition reads as energetic at
half the cut rate.

## The thread was a sentence, not a thing

The film speaks ONE sentence across many pictures, roughly a clause per shot:

> *You've got the ideas and … but your growth? still stuck … because content without an audience is just
> noise … and the audience is the money.*

No clause is a whole thought. Each one ends mid-breath, so the cut is not a boundary, it is a comma. You
cannot leave, because the sentence is not finished. That is continuity, and it costs nothing in visual
freedom: the picture under a clause can be anything at all.

This is the general principle the object rule is a special case of. **What must survive a cut is an
UNRESOLVED THING.** An object mid-transformation is one kind. A sentence mid-clause is another, and it is
strictly more permissive.

## The forms the thread can take

**You will key `w` and `h` on a rectangle and call it the thread. Don't.** Eighteen short films here have
already answered the question that way, three of them consecutively, and all three passed every gate while
being visually inert. It is the cheapest device available and Murch ranks the register it belongs to LAST,
at 4%. Reach past the first one you think of. If your answer to "what carries the continuity" is always
"the layer resizes", you are writing the gate's minimum, not a film.

| Thread | What survives the cut | Costs you |
|---|---|---|
| **Transforming object** | the prop itself | every beat must contain the prop |
| **Unfinished sentence** | grammar; the clause has no full stop | nothing visual at all |
| **Match cut** | a shape, a line, or a direction of travel | the two frames must rhyme |
| **Camera travel** | one continuous space | the beats must share a world |
| **Counter or progress** | a number climbing, a list filling | one persistent small element |
| **Rhythm** | cuts landing on a steady beat | a fixed cadence |
| **Question** | an open loop the film has not answered | the payoff must actually answer it |

MIX THEM, AND EXPECT THE GOOD FILMS TO. The reference runs three at once: the unfinished sentence, a
travelling path through the light section, and a steady cut rhythm around 1.5s. That redundancy is what
lets it change props, palette and type wholesale without coming apart. A film carrying ONE thread has to
make that thread literal and obvious, which is how we ended up resizing boxes; a film carrying three can
let every one of them be subtle.

So the question to ask of your own film is not "does it have a thread" but "how many, and in which
registers". One is fragile. Two is usually enough. None of them then has to be a box.

## What the redundancy buys, in that reference

Because three threads are carrying continuity, no single frame has to. That film spends the freedom on:

- **Word-level emphasis.** One word inside a line carries the colour, the rest sits grey. Emphasis lives on
  the word, not the line. Our films colour whole lines and lose the stress.
- **A different world per beat.** Light field, then black, then cream. The palette FLIPS instead of holding.
  A held backdrop is a decision; here the changing backdrop is the decision.
- **Props with weight.** A bulb, a briefcase, a keyboard, an index card pinned with a tack. Real objects at
  hero scale, lit and shadowed. Not rounded rectangles.
- **Type that touches the prop.** Words overlap and get occluded by the object rather than sitting in a safe
  lane beside it. Depth, not layout.
- **A list built line by line on one prop.** The card gains a row at a time, so the prop is doing the
  explaining. Compare `engine-doctrine/CRAFT/SHOW-DONT-TELL.md`: this is the same argument, one level up.
- **Emoji at hero scale as the subject.** Deliberately, huge, as the graphic. Our rules put emoji last, and
  that is right for decoration; as the subject at 40% of frame it is a different tool.

## How to use this

State the thread in the storyboard frontmatter next to `object:`. If the thread is a sentence, write the
whole sentence there and the per-beat clause in each beat, so the animatic can hear whether it actually
runs on. Then judge the cuts on one question: **at this cut, is something unfinished?** If yes, the film
can change everything else and still hold.

The gate can only see a prop that survives and moves. It cannot see an unfinished sentence, so a film built
this way needs a waiver and a `_why` that names the thread. That is a limit of the measurement, not a
verdict on the film.

But do not reach for the waiver first. The correction above is the point: a film that reads as free is
usually carrying MORE continuity than it appears to, in registers the gate cannot count. If your only
thread is one the gate cannot see, you have not out-thought the rule, you have taken the riskiest version
of it. Add a second thread the gate CAN see, keep it subtle, and you will not need the waiver at all.

## Measure the reference, do not remember it

A contact sheet samples; it does not measure. A grey path running through half of the reference film only
turned up on a frame-by-frame pull, not on the contact sheet. Before drawing a rule from a reference, pull
the cut list (`ffmpeg select='gt(scene,0.25)'`), get the shot-length distribution, and sample INSIDE the
shots that look empty.
