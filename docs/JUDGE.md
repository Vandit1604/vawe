# The vision judge — the gate that SEES

`validate`/`critique`/`slop`/`audit` are **static** — they read the DOM/JSON. None can see whether the
mascot is faithful, the headline is centered, or an underline hits its word. That needs an eye. `make judge`
is that gate: it preps the key frames + the brand's house-style + a craft rubric, and the **agent-in-the-loop
scores them**. (It leverages the vision model already authoring — no API key, no cost beyond one read.)

```bash
make judge D=formats/scene/<file>.json VS=<brand>     # after a near-final render
```

It writes, into a directory named after the film so judging a second one does not destroy the first:
- **`/tmp/judge/<name>/sheet.png`** — one labeled key frame per beat (each beat's representative moment + hook + CTA).
- **`/tmp/judge/<name>/rubric.md`** — the brand `house-style.md` (the scoring key) + the 7 craft dimensions + a verdict template.

Then the agent **reads the sheet against the rubric** and returns a structured verdict.

## The 7 dimensions (score each frame 1-5, name the issue + the fix)
1. **Readability** — legible at size, sufficient contrast.
2. **Hierarchy** — one clear focal; the eye knows where to land.
3. **Composition** — centered/aligned/on-thirds ON PURPOSE. Off-center-by-accident, mis-anchored
   annotations, floating elements = fail. (The argus first-pass class of bug.)
4. **Brand fidelity** — house-style dominance, ONLY brand colours, the real face, signature details present,
   NEVERs absent.
5. **Asset fidelity** — real captured assets, never a recreated-from-memory lookalike.
6. **Produced-not-generated** — crafted density, not a word on empty space.
7. **Value** — the frame earns its place.

## The verdict contract
- **Per frame:** `beat N — <worst dimension>: <issue> → <fix>` (only frames with a real problem).
- **Worst frame overall** + why.
- **`PASS`** only if every frame clears every dimension; otherwise **`FIX`** + a prioritized list.
- **Rule: if your eye catches it, it's a FIX.** "Renders fine / passes the static gates" is not PASS. Do NOT
  rationalize a flaw you notice — that is the exact failure the judge exists to prevent (see MISTAKES.md #15).

## What this judge cannot do: tell you whether an edit HELPED

It sees one film, and the agent running it knows which version it just authored. Both limits are fatal to
the question "is this better than what I had". For that, use the blind A/B judge
([`CRAFT/AB-JUDGE.md`](CRAFT/AB-JUDGE.md)): two cuts, paired beat by beat, arms hidden, three judges.

**N reduces variance, not bias.** Three judges drawn from one model share their blind spots, so a 3-0
there is weaker evidence than the arithmetic suggests, and it is not certainty. The only real control is
the position-swap re-run: if the winner follows the arm it is real, if it follows the position it is void.

For the same reason no score in this file is aggregated anywhere. A 1-5 per dimension is a judge's
*reason*, uncalibrated between judges; averaging them across judges invents a precision none of them
claimed. That was right, and it stays right.

## Where it sits
Opt-in, but the **final taste check before shipping** — run it on the near-final cut, after the static
ladder is green. It catches what the others structurally can't; on the argus film it flagged a stat with a
dropped unit and a scattered beat that `critique` (0 findings) and `slop` (clean) both missed.
