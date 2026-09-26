---
when: "planning a continuous-action storyboard's cuts, motion or hook"
answers: "how to write a transform-not-a-jump cut, tell diegetic motion from decoration, and pay the first-frame hook"
group: skill
---

# Cuts, motion, and the hook

## Every cut is a transform, never a jump

At each seam, write the relationship in one line: "the X becomes the Y." If you cannot write that
sentence, you have a jump cut between two unrelated shots, which is the slideshow.

Three legal seams, cheapest first:

1. **No cut.** The object keeps moving through the seam. The reference does this from 3.0s: the
   button shrinks, sheds its label and rounds into the dot with no cut at all.
2. **Match cut.** Hard cut where the object is in nearly the same place, at nearly the same size,
   on both sides. The eye stitches it.
3. **Hard cut with a carried element.** The background never cuts. The reference runs one
   `liquid` bg window across all 5 seconds, so even the 1.53s hard cut lands on continuous ground.

**The pixel-jump test:** at every seam, name the thing that is in the same place before and after.
No answer means insert a transform or delete the seam.

## Diegetic motion: the product moves itself

Every moving thing on screen has a cause. Ask, for each one: who moved it?

- If the answer is "the user pressed it", "the field is typing", "the request is loading", "the
  list is filtering" - that is **diegetic** motion. It comes from the product doing its job. It
  teaches while it moves.
- If the answer is "the editor slid it in from the left" - that is **decoration**. It is applied
  to a static frame from outside. It teaches nothing.

The slideshow failure mode, by name: a static frame plus an entrance. Card fades up, holds, slides
out. Card two fades up. It passes `make check GATE=direction-floor` if you add enough easing, and it is still a
slideshow, because nothing on screen caused anything else on screen. (That gate is opt-in,
`TASTE=1 make author-check`, which makes this your job rather than a tool's.)

In the reference, count the diegetic moves: the hook types itself and untypes itself (1.14s, 60 cps)
to clear the stage. The prompt field types. The camera pans left because the prompt text ran past
the field and the button is being followed. The button is thrown, bounces, and morphs because it
was pressed. There is not one decorative entrance in 5 seconds. Every fade is a real surface arriving.

One instance of decoration is allowed, and it should be the background.

## The object still owes you a hook

Naming an object does not excuse an unreadable first second. This skill was A/B tested against a
control on the same brief, and the plan built with it opened on a bare screenshot with no words on
it: a viewer had no idea what they were looking at until the command line appeared a second later.
The control, with no object spine at all, opened on "Screenshot any UI." and won that second outright.

So the continuity rule sits under the house rule, it does not replace it: a first-frame hook, twelve
words or fewer, strong word first. Two ways to pay it without breaking the spine:

- **Put the line on the object.** The hook overlays or labels the thing that is about to transform,
  so the words and the subject are the same shot. Best option.
- **Let the object BE the sentence.** Only when its state at t0 is self-evident to the audience you
  are aiming at. A terminal prompt reads instantly to a developer. A screenshot of an unfamiliar
  product does not.

Test it the honest way: show frame 1 to somebody who has never heard of the product. If they cannot
say what this is, the spine is fine and the hook is missing. Fix the hook, keep the spine.

### A carried background is not a licence to hide the object

The ellipsis this skill recommends (hold the background, hard-cut) broke its own law on a real
brief: a root `blur` cut hid the object for six frames, which is the object dying and being replaced.
A transition covering the whole stage breaks the spine for exactly as long as the cover lasts.

Put the cut on something ELSE in the frame (a mail row, a panel, a chip) and let the object ride
through it. Check it: step the frames across the boundary and confirm the object is visible in
every one.

## Show the product working

The UI is the star. Plan the real surfaces first and fit copy around them, never the reverse.

- **Real surfaces**: `make capture` a live component, or a section screenshot as a clipped `image`.
  A hand-built `html` panel is acceptable only when reproducing a measured reference (as a
  recreation does) or the surface does not exist yet.
- **A claim with no UI under it in the same frame is cut.** Not moved later. Cut.
- **Slogans on black are a last resort**, costing the same seconds as a working screen. The
  reference spends 1.4 of its 5 seconds on its only text-on-black beat (naming the product), and
  clears it before the product appears: one line, then get out.
