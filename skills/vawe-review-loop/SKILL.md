---
name: vawe-review-loop
description: "Review a film you just made, fix what is wrong, and repeat until it stops improving. Load after a scene JSON renders, when you want the film to be GOOD rather than merely valid. Wraps the gates, the critic roster and make judge into one loop with a written stopping rule, so review ends on evidence instead of on the author getting bored. Use for any film you intend to ship."
---

# vawe-review-loop: make it, look at it, fix it, again

Every piece this loop uses already exists. What did not exist is the **stopping rule**, and that absence
is the whole reason review here has been unreliable: a pass ends when the author runs out of patience, so
a film is declared done at whatever quality round one happened to reach. This skill is the loop and the
rule. It adds no new checks.

## The one thing to understand first

**Green gates do not mean the film is good.** `make author-check` reads structure. It cannot see murk, a
weak focal point, a beat that lands wrong, or a frame that is merely type on a background. CLAUDE.md says
this in four separate places and the library still shipped films that passed everything and read as
slideshows. The gates are the floor. This loop is what happens above the floor.

So the loop always has two halves, and skipping the second is the failure mode it exists to prevent:

| half | who runs it | what it can prove |
|---|---|---|
| mechanical | `make ship` | the film is not broken |
| perceptual | `make judge` + critics + **your eyes** | the film is worth watching |

## The loop

Run rounds until the stopping rule fires. One round is:

```bash
make ship  D=films/scene/<film>.json     # author-check → render → audit → seams
make judge D=films/scene/<film>.json     # writes /tmp/judge/sheet.png + the rubric
make beats D=films/scene/<film>.json     # per beat: first/mid/last
make reveal D=films/scene/<film>.json    # per beat: the ENTER arc, settled, the EXIT arc
```

Then **READ the sheets**. Producing an image is not looking at one. Score every frame on the seven
dimensions in `engine-doctrine/JUDGE.md` (readability · hierarchy · composition · brand fidelity · asset fidelity ·
produced-not-generated · value), 1 to 5, and write the issue AND the fix for anything at 3 or below.

For a full pass, launch the critics from `engine-doctrine/CRAFT/SUBAGENTS.md` in PARALLEL, one job each:
**beat · bg-motion · reveal · fidelity · copy · seam**. Each gets one input path and returns a fixed
verdict shape. Overkill for a one-line tweak; required for anything you intend to ship.

**Critics report. You fix. A critic is evidence, never a ruling.**

**The PASS is not yours to self-record.** You authored the film, so your own read of `make judge` is
the one read that cannot be trusted to fail it: a judge scoring its own lineage inflates the score, and
that is not a character flaw, it is a measured bias. It is why hinge-v1, a slideshow, was recorded PASS
by the agent that wrote it. So before `make judge --verdict PASS`, hand `/tmp/judge/<name>/sheet.png` and
the rubric to a SEPARATE critic (a fresh subagent that did not author the film: the fidelity and beat
critics in `engine-doctrine/CRAFT/SUBAGENTS.md`), and record PASS only when that independent eye agrees. A FIX from
either eye keeps the loop open.

## The stopping rule

This is the part that did not exist. Apply it in order; the first line that matches ends the loop.

1. **STOP, done.** Two consecutive rounds produced no NEW finding scoring 3 or below.
2. **STOP, converged.** A round's fixes did not raise the LOWEST score on any dimension. More rounds
   are rearranging, not improving.
3. **STOP, hand it back.** Round 5. Five rounds without convergence means the problem is the concept,
   not the execution. Say so plainly and name what you think is wrong with the plan.
4. **CONTINUE.** Anything else.

Two guards on the rule, both learned here the hard way:

**The regression guard.** If a round's fix drops a dimension that was previously 4 or 5, revert that fix
and record why. A round must never trade a good frame for a fixed one, and without this the loop happily
oscillates forever.

**The gate-is-wrong guard.** CLAUDE.md, `engine-doctrine/MISTAKES.md` #211: *when satisfying a gate requires making
the film worse, suspect the gate.* If a fix means shrinking, recentring or deleting something you can see
is right, stop and read what the gate actually measures. A gate that measures the wrong thing does not
miss defects, it manufactures them, and the author pays by deforming a good design until a number moves.

## Sign the round off

A receipt makes "somebody looked" checkable, and hashes the scene so editing it silently withdraws its own
sign-off:

```js
import { writeReceipt } from './harness/lib/receipt.mjs';
writeReceipt('review', 'films/scene/<film>.json', { round: 3, lowest: 4, stopped: 'done' });
```

`make beats` and `make reveal` already write theirs, and `beat-check` fails `beats-unseen` when the scene
has moved on since anyone read a sheet. Use the same stage mechanism rather than a second one.

## What to fix first

Rank by what the viewer notices, not by what is easy:

1. **Anything unreadable.** Contrast, clipping, a caption under the platform chrome.
2. **A seam that flashes.** `make seam-check` finds it; it is the worst defect per unit of effort.
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
