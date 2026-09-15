---
when: a doctrine or engine change touches motion, transitions, backgrounds, type or layout
answers: what `make evals` checks (liveness, not looks) · why there is no aesthetic score · how to run a before/after compare
group: process
---

# Evals: prove a change moved something, before you argue it improved something

## AGENT SUMMARY

- `make evals` renders a fixed set of small brief scenes (`quality/runs/evals/briefs/*.json`) into a
  timestamped run under `quality/runs/evals/runs/`, with a contact sheet per brief and one combined sheet.
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
this repo already asks for (`make judge`, `engine-doctrine/JUDGE.md`).

## The six briefs

`quality/runs/evals/briefs/` holds six small (6-13s) real scenes, each exercising a different deliverable so a
change that only affects one family still shows up somewhere. Every one is **HTML-first**: wherever the
brief used to hand-stack a group of `rect`/`text` for a card, a row of chips, or a stat panel, it is now
one `html` layer with `parts` driving the reveal (`engine-doctrine/CRAFT/HTML-FRAGMENTS.md`). What stays native is
what genuinely is not a picture: a `count` layer's live figure, a `cursor` layer's path, `typing`, an
`acrossBeats` spine.

- **`demo.json`**: the `cursor` layer proving a real click has a real consequence. The card is one html
  layer; `Exported.` is a second `parts` group that stays hidden until the click lands.
- **`explainer.json`**: kinetic type walking through "a frame is a pure function of time", a live
  `count` layer reading the film's own elapsed seconds (linear, on purpose: it displays a clock), a
  payoff line landing last.
- **`launch.json`**: a hook, a captured product still (Ken Burns, left as an `image` layer on purpose:
  a real screenshot is not group-of-rect debt), a five-canvas chip row (html+parts), and a wordmark that
  now actually carries `acrossBeats: true` across all three cuts.
- **`talking-head.json`**: the face-safe placeholder circle, word-timed captions on a `shorts`
  destination, and a B-roll stat card (html+parts around a native `count`).
- **`sting.json`**: a 6s logo sting, the wave draws on frame 1, the wordmark fades in behind it. No
  group-of-rect here to convert: "type and mark" is the whole brief.
- **`recreation.json`**: `sceneUnits` with a continuous object (the pricing card, `acrossBeats`,
  now one html+parts layer) crossing a cut, then the reference's own "it is really finished" payoff, a
  three-viewport row (also html+parts).

Every brief opens with its hook visible on frame 1 (`start: 0`, first arrival by ~0.2s). Each carries an
`authoring.allow` waiver, with a `_why` per code, for the process-ladder findings a fixed fixture cannot
clear the way a planned film does (`no-storyboard`/`no-preflight`/`craft-unvisited`) plus whatever
house-style finding was already true of that brief's own design before this pass (documented per-brief
in its `_why`, e.g. `static-bg`+`no-transition` on the sting's true-black bumper).

They are fixtures, not showcase films: small, honest, and kept passing `node core/validate/validate.mjs`. Adding
a seventh deliberately widens what the harness watches; do not grow them into full productions.

## Running it

```bash
make evals                                        # render all 6, assert liveness, print the run dir
make evals-compare BEFORE=quality/runs/evals/baseline    # against the committed baseline, fresh AFTER run
make evals-compare BEFORE=<run-a> AFTER=<run-b>    # two specific runs
node harness/dev/evals.mjs --save-baseline         # render + commit sheets/manifest as the new baseline
```

The renderer refuses a path under `quality/runs/`: to render one brief by hand (not through `make evals`),
copy it to `formats/scene/_eval-<name>.json`, render/gate that copy, then delete it.

`quality/runs/evals/runs/` is gitignored (mp4s, scratch). `quality/runs/evals/baseline/` is committed, sheets and
`manifest.json` only: mp4s are too big to carry per change, so a compare against the baseline shows the
"before" side as sheets with a note in place of the missing video, never a broken player.
