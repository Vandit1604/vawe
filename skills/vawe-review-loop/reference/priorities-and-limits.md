---
when: "deciding what to fix first in a review round, or whether to run this loop at all"
answers: "the fix-priority order, when a one-line tweak does not need the full loop, and the loop's honest limits"
group: skill
---

# What to fix first, when to skip the loop, and its honest limits

## What to fix first

Rank by what the viewer notices, not by what is easy:

1. **Anything unreadable.** Contrast, clipping, a caption under the platform chrome.
2. **A seam that flashes.** `make check GATE=seam-check` finds it; it is the worst defect per unit of effort.
3. **A beat with no focal point.** The eye does not know where to land.
4. **A beat that is only type.** Ask what it could SHOW: a bar whose length IS the number, the real
   product surface, a diagram. `engine-doctrine/CRAFT/SHOW-DONT-TELL.md`.
5. **A dead backdrop.** Most films in this library paint one window for the whole runtime. Bind windows
   to the cuts and the world turns with the edit.
6. **Copy tells.** Weak hook, restated headline, marketing jargon, a big number set as flat text.

## When NOT to run this

A one-line tweak, a caption typo, a colour swap you can verify in one frame. Run `make dev` and look.
The loop is for a full pass, a recreation, or anything going in front of other people.

## Honest limits

- It cannot tell you the film is good. Nothing can. It structures the judgement; you still make it.
- The seven dimensions are a checklist, and a film can score well on all seven and still be boring.
  Dimension 7 (value: the frame earns its place) is the one that catches that, and it is the hardest
  to score honestly about your own work. This is why the critics are separate agents.
- Two consecutive quiet rounds is a heuristic, not a proof. A defect nobody looked for stays invisible
  however many rounds run.
