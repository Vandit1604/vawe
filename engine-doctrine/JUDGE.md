---
when: the render is done and something must actually LOOK at it
answers: the 7 scoring dimensions · the verdict contract · why the static gates cannot replace this
group: process
codes: judge-not-ready, no-judge
---

# The vision judge: the gate that SEES

## AGENT SUMMARY

- `make judge` is the only gate that SEES: static gates read the DOM/JSON, this reads the rendered
  key frames against the brand's house-style and a 7-dimension craft rubric.
- Score each frame 1-5 on all 7 dimensions; `PASS` only if every frame clears every dimension,
  otherwise `FIX` + a prioritized list.
- Enforced by `[eye]`: nothing but the agent's own look, opt-in, run on the near-final cut after the
  static ladder is green.
- Checkable action: if your eye catches a flaw, it's a FIX. Never rationalize a flaw you notice.

`validate`/`critique`/`slop`/`audit` are **static**: they read the DOM/JSON. None can see whether the
mascot is faithful, the headline is centered, or an underline hits its word. That needs an eye. `make judge`
is that gate: it preps the key frames + the brand's house-style + a craft rubric, and the **agent-in-the-loop
scores them**. (It leverages the vision model already authoring, no API key, no cost beyond one read.)

```bash
make judge D=films/scene/<file>.json VS=<brand>     # after a near-final render
```

It writes, into a directory named after the film so judging a second one does not destroy the first:
- **`/tmp/judge/<name>/sheet.png`**: one labeled key frame per beat (each beat's representative moment + hook + CTA).
- **`/tmp/judge/<name>/rubric.md`**: the brand `house-style.md` (the scoring key) + the 7 craft dimensions + a verdict template.

Then the agent **reads the sheet against the rubric** and returns a structured verdict.

## The 7 dimensions (score each frame 1-5, name the issue + the fix)
1. **Readability**: legible at size, sufficient contrast.
2. **Hierarchy**: one clear focal; the eye knows where to land.
3. **Composition**: centered/aligned/on-thirds ON PURPOSE. Off-center-by-accident, mis-anchored
   annotations, floating elements = fail. (The argus first-pass class of bug.)
4. **Brand fidelity**: house-style dominance, ONLY brand colours, the real face, signature details present,
   NEVERs absent.
5. **Asset fidelity**: real captured assets, never a recreated-from-memory lookalike.
6. **Produced-not-generated**: crafted density, not a word on empty space.
7. **Value**: the frame earns its place.

## The verdict contract
- **Per frame, for the human reading it:** `beat N, <worst dimension>: <issue> → <fix>` (only frames
  with a real problem). Keep saying this; it is how a person understands what the eye caught.
- **Per frame, for the machine reading it:** `--fix <code>@<beat>`, repeated once per finding, passed to
  `make judge D=<file> --verdict FIX`. `<code>` is one of the seven dimension codes in
  `harness/lib/judge-codes.mjs` (the one place they are defined, so this list is not restated here):
  `readability`, `hierarchy`, `composition`, `brand-fidelity`, `asset-fidelity`, `produced-not-generated`,
  `value`. `<beat>` is the beat number already printed on the sheet (`beat N`). A code outside the seven
  is refused, naming all seven; the free-text `--fixes "<prose>"` form still works for one release and
  prints a line naming `--fix` as its replacement.
- **Worst frame overall** + why.
- **`PASS`** only if every frame clears every dimension; otherwise **`FIX`** + a prioritized list, given
  as both the sentence and the `--fix` codes above.
- **Rule: if your eye catches it, it's a FIX.** "Renders fine / passes the static gates" is not PASS. Do NOT
  rationalize a flaw you notice. That is the exact failure the judge exists to prevent (see MISTAKES.md #15).

## What this judge cannot do: tell you whether an edit HELPED

It sees one film, and the agent running it knows which version it just authored. Both limits are fatal to
the question "is this better than what I had".

**So the PASS is not the author's to self-record.** A judge scoring a film it wrote inflates the score,
a measured bias, not a lapse, and it is why hinge-v1 (a slideshow) was recorded PASS by the agent that
made it. The `--verdict PASS` that gates `ledger-add` must be corroborated by a SEPARATE critic: hand
`/tmp/judge/<name>/sheet.png` and the rubric to a fresh subagent that did not author the film (the
fidelity and beat critics in [`CRAFT/SUBAGENTS.md`](CRAFT/SUBAGENTS.md)) and record PASS only when that
independent eye agrees. This costs nothing but one dispatch and it removes the one bias no rubric can.

For the harder question, whether an edit HELPED, you need a blind A/B judge: two cuts, paired
beat by beat, arms hidden, three judges. **No such judge exists today.** `make ab`, `make ab-record` and
`CRAFT/AB-JUDGE.md` were removed on 2026-08-05 (`cc2dfc2`), along with five other tools that had never
been the reason a video looked better. Until one is built again, tile the two renders with `make compare`
and judge them by eye, knowing you know which arm is which.

<!-- doc-refs-allow: CRAFT/AB-JUDGE.md · named here only to record that this file was built and then cut -->
<!-- doc-refs-allow: make ab · named here only to record that this target was built and then cut -->
<!-- doc-refs-allow: make ab-record · named here only to record that this target was built and then cut -->

**N reduces variance, not bias.** Three judges drawn from one model share their blind spots, so a 3-0
there is weaker evidence than the arithmetic suggests, and it is not certainty. The only real control is
the position-swap re-run: if the winner follows the arm it is real, if it follows the position it is void.

For the same reason no score in this file is aggregated anywhere. A 1-5 per dimension is a judge's
*reason*, uncalibrated between judges; averaging them across judges invents a precision none of them
claimed. That was right, and it stays right.

## The receipt, and the ratchet that reads it

`node quality/gates/judge.mjs <file> --verdict PASS|FIX` is what actually records that the eye ran.
It writes `quality/baselines/approved/judge/<name>.json`: the scene's own content hash (via
`harness/lib/receipt.mjs`, so editing the scene withdraws it), a sha256 of the RENDERED mp4's own
bytes (`renderHash`, so a re-render invalidates it even if the scene JSON never changed), the verdict,
and the date. A receipt is valid only when both hashes still match what is on disk right now.

`make no-judge` (`quality/gates/no-judge.mjs`) counts rendered films (an `out/<name>.mp4` exists) with
no valid receipt, against a ratchet at `quality/baselines/no-judge-ratchet.json` that may only fall.
It is deliberately NOT wired into `make ship` or CI: both `films/scene/*.json` content and
`out/*.mp4` are gitignored, so a thin checkout would report a number about itself, not the library
(the same reason `doc-refs` stays out of CI). Run it on demand, or from `.githooks/pre-push` once an
author wants it enforced there. `--stamp` lowers the ceiling after judging a batch.

## Where it sits
Opt-in, but the **final taste check before shipping**, run it on the near-final cut, after the static
ladder is green. It catches what the others structurally can't; on the argus film it flagged a stat with a
dropped unit and a scattered beat that `critique` (0 findings) and `slop` (clean) both missed.

**What this judge cannot see: whether a film is a TEMPLATE.** A frame can score well on all 7 dimensions
and still be the same shape as the last twenty; "produced-not-generated" asks whether each frame earns
its place, not whether the film reached past the five families every other film already reaches for.
That comparison needs the library, not one film's frames, so it lives before the render, in
`direction-floor.mjs` (`library-top5-only`, `uniform-cadence`; `engine-doctrine/TASTE.md`). Neither check assigns a
score: they report an absence against a measured bar and name what to reach for instead. A judge PASS
still says nothing about sameness across the library; that is `direction-floor`'s question, not this
gate's.

## Provenance

**Do not re-add:** the claim that a blind A/B judge was never built. It shipped (`05a5123`,
2026-07-29) and was removed (`cc2dfc2`, 2026-08-05); this file and
[`CRAFT/SUBAGENTS.md`](CRAFT/SUBAGENTS.md) once described the removal as if it had never existed,
which turns a decision into an oversight.
