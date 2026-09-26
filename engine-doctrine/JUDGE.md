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
- Enforced by `[eye]`: nothing but the agent's own look, run on the near-final cut after the static
  ladder is green. `make ship` now refuses to finish without a fresh receipt for the film it just
  rendered (see "The receipt, and the ratchet that reads it" below): the eye is invited by `make dev`,
  required by `make ship`.
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

## The full loop: look, then motion, then verify, then two fresh judges

One agent scoring its own film PASS is not the only failure this file guards against. A single vision
judge repeats its own rating on the same clip only about two times in three (Video-Bench), so one
judging pass, by one agent, is a coin with a thumb on it, not a verdict. Four pieces close that, run in
this order:

1. **Look review, before any motion work.** `make look D=<file> LOOKS=1` renders one styleframe per
   beat AT ITS HOLD (light, colour, type, camera; no render needed, a live-page grab like the rest of
   `make look`) and tiles them into `/tmp/preview_scene_looks.png`. Studios review the LOOK on
   styleframes before a single frame of motion is built; this is that pass. It samples the same beat
   model `make judge` does (`quality/gates/beats-of.mjs`), so a look approved here and a judge run
   later never disagree about where a beat starts.
2. **Motion review, separately**, once the look passes: `make dev-tool X=critics D=<file> DECIDERS=1`
   (the motion director) and `make judge D=<file> STRUCT=1` (below), whose MOTION axis is scored on
   its own.
3. **`node harness/dev/verify.mjs D=<file> [REF=<ref.mp4>]`: hard numbers, no eye.** Paste the printed
   block VERBATIM before any judging happens (the discipline HyperFrames enforces with `w2h-verify.mjs`:
   an agent skips a required step unless the raw numeric output is put in front of it, not summarized).
   It reports frame coverage (beats inspected vs the film's real length), exposure range per beat, the
   light-map distance to a reference when `REF` is given (mean CIE76 ΔE, reusing `harness/media/match.mjs`'s
   own colour-distance code), beat timing against the storyboard, asset use (referenced vs present on
   disk), a count of text clipped at the frame edge (`quality/audit.mjs`'s own findings, not
   re-detected), and a blank-seam count (`quality/gates/seams.mjs`'s own findings). It exits non-zero
   ONLY on an objective failure: no render, or a referenced asset missing on disk. Everything else is a
   measurement for the eye to weigh, never a verdict the script hands down itself.
4. **Two independent structured judges.** `make judge D=<file> STRUCT=1` writes a rubric PER RUN
   (`/tmp/judge/<name>/structured-A.md`, `structured-B.md`) whose required answer is JSON, one entry
   per criterion, `{score, evidence, t}`, split into **LOOK** (light, colour, type, camera, composition)
   and **MOTION** (timing, easing, transitions, continuity), scored as separate axes
   (`harness/lib/judge-axes.mjs`). A criterion with no evidence is refused, not recorded:
   `node quality/gates/judge.mjs <file> --verdict-json <run>.json --run A` checks every criterion for a
   real `evidence` string and a `t` before it writes anything down. Run it again from a second, fresh
   agent/session with `--run B`, then
   `node quality/gates/judge.mjs --compare <A>.json <B>.json` flags any criterion where the two runs
   disagree by more than 2 points, so a real disagreement gets a third opinion instead of averaging
   itself away.

**Evidence must be specific, not filler.** A non-empty `evidence` string is not the same as a real
observation: `{"score": 2, "evidence": "readability looks fine"}` passed the old check and recorded
nothing anyone could act on. `harness/lib/evidence-lint.mjs` refuses it before `--verdict-json`
writes anything: name a concrete visual observation (an element or text, plus one of position, size,
colour, motion or timing), never just echo the criterion's own name, agree in sign (a score of 1-2
needs a named defect), and never repeat the identical string across two criteria in one verdict.

Good, real observations:
- `the CTA button sits 40px left of centre, off its grid column` (element + position)
- `headline text fades in 0.3s late against the beat 2 @1.4s hold` (element + timing)
- `the background is washed out grey where the house style calls for cobalt` (element + colour)

Bad, filler that the linter refuses:
- `readability looks fine` (no element, no property, just the verdict restated)
- `hierarchy is good` (same failure under a different criterion's name)
- `looks fine (composition)` (echoes the criterion label back as its own content)

**One page for all of it**: `node harness/author/review-server.mjs D=<file> [REF=<ref.mp4>] [PORT=8802]`,
served like `make tune`. It shows a frame grid per beat with a time slider, the reference side by side
when `REF` is given, the verify block, and whatever structured judge JSON already exists for this cut,
so nobody has to open four tools to review one render. `--screenshot <out.png>` takes one headless shot
and exits, for a non-interactive check.

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
been the reason a video looked better. Until one is built again, tile the two renders with `make dev-tool X=compare`
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

`make dev-tool X=no-judge` (`node quality/gates/ledger.mjs unjudged`) counts rendered films (an `out/<name>.mp4`
exists) with no valid receipt, against a ratchet at `quality/baselines/no-judge-ratchet.json` that may
only fall. This CORPUS scan is deliberately NOT wired into CI: both `films/scene/*.json` content and
`out/*.mp4` are gitignored, so a thin checkout would report a number about itself, not the library (the
same reason `doc-refs` stays out of CI). Run it on demand, or from `.githooks/pre-push` once an author
wants it enforced there. `--stamp` lowers the ceiling after judging a batch.

`ledger.mjs` also has a SINGLE-FILM mode (`node quality/gates/ledger.mjs judged <scene.json>`, no
flags), and `make ship` calls exactly that as its last step. It was opt-in until 2026-09: `make ship` only ever
echoed a suggestion to run `make judge`, and the corpus ratchet measured the result: 121 rendered films
with no receipt against 1 that had one. Opt-in lost the eye 121 times out of 122, so the decision
reversed. `make ship` now refuses to finish without a fresh receipt for the film it just rendered, and
names the exact `make judge D=<file>` command plus which condition failed (no receipt at all, the
scene changed since, or the mp4 changed since). There is no flag to skip it, only the missing artefact:
a `FIX` verdict still ships, because this only asks whether the eye ran, exactly as the corpus ratchet
already does. `make dev` and `make check` are untouched and stay completely ungated.

## Where it sits
Required by `make ship`, on the near-final cut, after the static ladder is green. It catches what the
others structurally can't; on the argus film it flagged a stat with a dropped unit and a scattered beat
that `critique` (0 findings) and `slop` (clean) both missed.

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
