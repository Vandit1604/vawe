---
name: vawe-review-loop
description: "Reviews a rendered film, fixes what is wrong, and repeats until it stops improving, wrapping the gates, the critic roster, and make judge into one loop with a written stopping rule. Load after a scene JSON renders, for any film about to ship, when it needs to be good rather than merely valid."
stage: judge
effort: high
---

# vawe-review-loop: make it, look at it, fix it, again

Every piece this loop uses already exists. What did not exist is the **stopping rule**, and that absence
is the whole reason review here has been unreliable: a pass ends when the author runs out of patience, so
a film is declared done at whatever quality round one happened to reach. This skill is the loop and the
rule. It adds no new checks.

## The one thing to understand first

**Green gates do not mean the film is good.** `make author-check` reads structure. It cannot see murk, a
weak focal point, a beat that lands wrong, or a frame that is merely type on a background. The gates are
the floor. This loop is what happens above the floor, and skipping the second half below is the failure
mode it exists to prevent:

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
dimensions in `engine-doctrine/JUDGE.md` (readability · hierarchy · composition · brand fidelity · asset
fidelity · produced-not-generated · value), 1 to 5, and write the issue AND the fix for anything at 3 or
below.

For a full pass, launch the critics from `engine-doctrine/CRAFT/SUBAGENTS.md` in PARALLEL, one job each:
**beat · bg-motion · reveal · fidelity · copy · seam**. Each gets one input path and returns a fixed
verdict shape. Overkill for a one-line tweak; required for anything you intend to ship.

**Critics report. You fix. A critic is evidence, never a ruling.**

**The PASS is not yours to self-record.** You authored the film, so your own read of `make judge` is the
one read that cannot be trusted to fail it, a judge scoring its own lineage inflates the score, and that
is a measured bias, not a character flaw. So before `make judge --verdict PASS`, hand
`/tmp/judge/<name>/sheet.png` and the rubric to a SEPARATE critic (a fresh subagent that did not author
the film), and record PASS only when that independent eye agrees. A FIX from either eye keeps the loop
open.

## The stopping rule

Apply in order; the first line that matches ends the loop.

1. **STOP, done.** Two consecutive rounds produced no NEW finding scoring 3 or below.
2. **STOP, converged.** A round's fixes did not raise the LOWEST score on any dimension. More rounds
   are rearranging, not improving.
3. **STOP, hand it back.** Round 5. Five rounds without convergence means the problem is the concept,
   not the execution. Say so plainly and name what you think is wrong with the plan.
4. **CONTINUE.** Anything else.

Two guards, both learned here the hard way:

**The regression guard.** If a round's fix drops a dimension that was previously 4 or 5, revert that fix
and record why. A round must never trade a good frame for a fixed one.

**The gate-is-wrong guard.** `engine-doctrine/MISTAKES.md` #211: *when satisfying a gate requires making
the film worse, suspect the gate.* If a fix means shrinking, recentring or deleting something you can see
is right, stop and read what the gate actually measures.

## Where to look next

| Task | Read |
|---|---|
| Reading/writing the film's own round history, signing a round off | `reference/logging-and-receipt.md` |
| What to fix first, when to skip this loop entirely, its honest limits | `reference/priorities-and-limits.md` |

## Gotchas

- A seam gate can print a pass it never earned when a consumer of the shared `transitions` surface
  falls out of sync; a green `make seam-check` is not proof by itself, sample the boundaries yourself
  on anything you ship. `engine-doctrine/MISTAKES.md #412`.
- The judge sheet's per-beat time label can come from a different moment than the frame actually
  shown; read the picture, don't trust the printed timestamp on its own. `engine-doctrine/MISTAKES.md #630`.
- A preview that animates (a rAF-driven `--t`) cannot be judged from a screenshot; freeze the field
  before scoring it. `engine-doctrine/MISTAKES.md #295`.
