---
when: "before or after any doctrine change (a new rule, a gate, a scaffold edit): did films actually get better?"
answers: "the eval harness: six fixed briefs, one per video type, rendered to a contact sheet baseline, compared by a human, never scored"
group: reference
---

# Evals: know a rule change made films BETTER

Neither another engine nor another engine score aesthetics. Both keep a small set of fixed inputs, render them
under the current rules, and let a human compare before vs after. This is that harness here.

## The six briefs

`verify/evals/briefs/<type>.json` holds one real scene per video TYPE (`launch`, `explainer`,
`talking-head`, `sting`, `demo`, `recreation`). Each is also that type's WORKED EXAMPLE: the film named
in `skills/vawe-type-<type>/SKILL.md` as proof the type's playbook produces a real film, not a hollow
fixture. A brief that shows nothing (no capability on screen, three frames of a static glass shot) is a
regression to fix, not a baseline to keep: that failure is what these six replaced.

## Running it

```bash
make evals              # render all six briefs, write verify/evals/baseline/
node scripts/dev/evals.mjs           # same, direct
node scripts/dev/evals.mjs launch    # one brief only
```

Output: `verify/evals/baseline/<type>/sheet.png` (a labelled contact sheet, several frames across the
film) and `verify/evals/baseline/manifest.json` (name, duration, aspect, frame count, timestamp, per
brief). No mp4 is kept: a contact sheet is small enough to commit and review in a diff, a rendered video
is not.

## Reading a before/after

1. Make the doctrine change (a rule, a gate, a scaffold edit).
2. `make evals` again.
3. Diff `verify/evals/baseline/<type>/sheet.png` against the committed version (git diff on an image
   shows nothing useful in text; open both and look, or use `git show HEAD:path > /tmp/before.png`).
4. Decide: did this beat land better, worse, or the same. There is no score. A human compares, exactly
   as `skills-evals/compare.ts` does for another engine.

Commit the new baseline only when the films it shows are ones you would ship, since committing it is
the record that says "this is what the rules currently produce."
