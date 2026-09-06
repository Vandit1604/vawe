---
when: a doctrine or engine change touches motion, transitions, backgrounds, type or layout
answers: what `make evals` checks (liveness, not looks) · why there is no aesthetic score · how to run a before/after compare
group: process
---

# Evals: prove a change moved something, before you argue it improved something

## AGENT SUMMARY

- `make evals` renders a fixed set of small brief scenes (`verify/evals/briefs/*.json`) into a
  timestamped run under `verify/evals/runs/`, with a contact sheet per brief and one combined sheet.
- The only thing it asserts by machine is **liveness**: every brief produced an mp4 of the duration and
  dimensions the scene declared. It never scores a film's quality. A human compares the sheets.
- `make evals-compare BEFORE=<run-dir> [AFTER=<run-dir>]` stacks the before/after sheet per brief and
  writes `compare.html` with both mp4s side by side, and opens it.
- **Rule**: a change that touches motion, transitions, backgrounds, type or layout ships with a
  before/after compare linked in the commit or PR body.

## Why no score

another engine's skills-evals and another engine both refuse an aesthetic score, and this harness follows them.
A number that claims to measure "looks better" trains people to chase the number instead of the film.
It also hides real disagreement: two people can watch the same clip and reach different verdicts, and a
single score erases that instead of surfacing it. So the machine checks only what a machine can check
honestly (did it render, at the right shape and length) and a human does the judging every other gate in
this repo already asks for (`make judge`, `docs/JUDGE.md`).

## The four briefs

`verify/evals/briefs/` holds four small (4-9s) real scenes, each exercising a different deliverable so a
change that only affects one family still shows up somewhere:

- **`launch.json`**: a hook, a product still, a CTA; one `becomes` handover; two `bg` windows.
- **`explainer.json`**: kinetic type, a count-up stat grid, a payoff line.
- **`sting.json`**: a 4s logo sting, the wave draws on, the wordmark types in.
- **`recreation.json`**: `sceneUnits` with a continuous object (`acrossBeats` + `kick`) crossing two cuts.

They are fixtures, not showcase films: small, honest, and kept passing `node core/validate.mjs`. Adding
a fifth deliberately widens what the harness watches; do not grow them into full productions.

## Running it

```bash
make evals                                        # render all 4, assert liveness, print the run dir
make evals-compare BEFORE=verify/evals/baseline    # against the committed baseline, fresh AFTER run
make evals-compare BEFORE=<run-a> AFTER=<run-b>    # two specific runs
node scripts/dev/evals.mjs --save-baseline         # render + commit sheets/manifest as the new baseline
```

`verify/evals/runs/` is gitignored (mp4s, scratch). `verify/evals/baseline/` is committed, sheets and
`manifest.json` only: mp4s are too big to carry per change, so a compare against the baseline shows the
"before" side as sheets with a note in place of the missing video, never a broken player.
