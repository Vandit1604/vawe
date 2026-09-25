---
name: vawe-audit
description: "Audits a finished, rendered film against every repo check in one fixed order and hands the owner one composed verdict with evidence. Use after `make ship`, or when asked whether a film passes, is ready, or still needs work. Routes make check/audit/audio-check/beats/reveal/judge/ledger; never records a PASS itself."
stage: judge
---

# vawe-audit: one verdict, composed from what already exists

Eighteen skills serve this engine. Eight of them serve one stage: plan. The back half of a film's
life, where it is judged, gets one skill (`vawe-review-loop`), and nothing today composes `make
check`, `make audit`, `make judge`, `make ledger`, `make beats`, `make probe` into a single verdict
with one meaning. This skill is that composition. **It owns the ORDER and how to read each output.
It does not own a single fact a gate already owns**: if you find yourself writing a rule about what
counts as a defect, stop, that rule belongs in the gate, not here.

## When to use this, vs `vawe-review-loop`

They read the same evidence and end at the same rule, but they answer different questions:

- **`vawe-review-loop`** is the FIX loop: make it, look at it, fix it, repeat, while you still have the
  scene open and are iterating rounds.
- **`vawe-audit`** (this skill) is the CHECK: one pass, after the film is already shipped or thought
  finished, that answers "does this pass, right now, against everything the repo checks" and lays out
  the evidence for a human to decide. Use it when nobody has looked yet, or when someone hands you a
  film and asks whether it is done.

If a step below finds something wrong, you are back in `vawe-review-loop` territory: fix it, re-ship,
audit again. This skill never fixes; it only reports.

## The order

Run every step. Do not skip one because an earlier one was clean, each looks at a different fact and
none subsumes another.

```bash
make check       D=films/scene/<film>.json                 # every static gate, zero consequence
make audio-check D=films/scene/<film>.json STRICT=1          # is the silence a decision or an omission; bed licence
make audit       D=films/scene/<film>.json ASPECT=<ratio>   # layout: overlap/overflow/safe-zone, per canvas shipped
make beats       D=films/scene/<film>.json                  # contact sheet: first/mid/last of every beat
make reveal      D=films/scene/<film>.json                  # contact sheet: how each beat ARRIVES
make judge       D=films/scene/<film>.json VS=<brand>       # the only gate that SEES: writes sheet.png + rubric.md
make ledger      D=films/scene/<film>.json                  # cross-film memory: does this repeat a shipped shape
make plan-check  D=films/scene/<film>.json                  # plan vs render: did it land where the storyboard promised
```

`make check` already runs `author-check`, the DOM/JSON audit, and generated-file drift in one summary;
do not re-run those individually. `make audio-check` is the sound gate
(`quality/gates/audio-check.mjs`): WARN by default, `STRICT=1` here so a silent film without a
`_why` actually stops the audit rather than sliding past as a warning nobody reads.

## The requirement that is not negotiable: look, don't infer

A film was shown to the owner with audibly wrong sound while `author-check` reported exit 0. Exit 0
from a static gate is not evidence about sound, motion, or craft, it is evidence about structure. So:

- **Open `/tmp/judge/<name>/sheet.png`, `/tmp/beats/<name>.png`, and `/tmp/reveal/<name>.png` with
  vision** (Read the image files) before writing a single line of verdict. Producing an image is not
  looking at one, `engine-doctrine/JUDGE.md` says this and it is the whole reason `make judge` exists
  next to the DOM-reading gates.
- Score every judge frame on the 7 dimensions in `engine-doctrine/JUDGE.md` (readability, hierarchy,
  composition, brand fidelity, asset fidelity, produced-not-generated, value). Anything at 3 or below
  gets the issue AND the fix named, in the verdict contract format that file specifies.
- `make audio-check` tells you whether a track exists and where it came from; it cannot tell you the
  mix is not clipping or the bed does not clash with the VO. If the film has a VO or music track,
  actually listen to the rendered `out/<name>.mp4` (or its extracted audio) before calling sound clean.

## The stopping rule: not yours to invent

`vawe-review-loop` and `engine-doctrine/JUDGE.md` already own this; read them, do not restate them here:

- The **stopping rule** (STOP-done, STOP-converged, STOP-hand-it-back) lives in `vawe-review-loop`.
- **A PASS is never self-recorded.** `engine-doctrine/JUDGE.md`: the thread that authored the film is
  the one read that cannot be trusted to fail it. This skill's own output is never a PASS, it is a
  compiled set of findings (or their absence) handed to the owner, or to a fresh critic per
  `engine-doctrine/CRAFT/SUBAGENTS.md`, for the actual call. `node quality/gates/judge.mjs <file>
  --verdict PASS|FIX` is the only thing that writes the receipt, and it must be run by whoever did the
  independent look, never by this skill on the audited film's own author's say-so.

## What to hand back

One line per step above: which gate, PASS/FIX/finding-count, and (for `judge`) the per-frame issues at
3 or below with the fix named. Close with the evidence bundle's paths
(`/tmp/judge/<name>/sheet.png`, `/tmp/beats/<name>.png`, `/tmp/reveal/<name>.png`, `/tmp/audit/...png`)
and a plain statement: this is what the repo's checks and one look found; the PASS call belongs to the
owner or a separate critic, not to this pass.

## When NOT to use this

A one-line tweak you can verify by eye in one frame: run `make dev` and look, this skill is for a full
pass on a film someone might ship or already has. For the iteration loop itself, once you are already
fixing rounds, use `vawe-review-loop` instead, this skill would just repeat its own steps every round.
