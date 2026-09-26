---
when: setting up or navigating the reference-recreation loop for the first time
answers: what lives in this folder · how the queue and ledger fit together · what the loop reuses
group: process
---

# quality/refs: the reference loop

Drop 10-15 reference videos here. An agent works them beat by beat, closing the gap between this
engine's recreation and each reference, and records every pass in `ledger.jsonl`. The loop prompt
itself is `LOOP.md`; the order to work references and beats in is `queue.md`.

This reuses only what already exists: `harness/media/match.mjs` (recreation score), `harness/media/
light-fit.mjs` (beat background), `harness/dev/verify.mjs` (hard numbers), `make look`, `make judge`.
Nothing here is a new gate.

## Layout

```
quality/refs/<ref-name>/
  source.url    the reference's URL, one line, plain text
  beats.md      time ranges + technique names, hand-written (see below)
  study/        generated: light maps, per-beat measurements (gitignored)
  drafts/       generated: scene JSON drafts and their renders (gitignored)
  grid/         generated: reference-vs-fit comparison grids (gitignored)
```

The reference video itself is never committed. Fetch it (or record it) as `source.mp4` in the
reference's own directory; `.gitignore` keeps it, `study/`, `drafts/` and `grid/` local-only. Only
`source.url`, `beats.md`, `queue.md` and `ledger.jsonl` are tracked, because those are the record of
what was decided and measured, not the footage.

## beats.md

One `## Beat <n>: <label>` heading per beat, in order, each carrying a `- window: <start>-<end>s`
line and a line naming the technique:

```markdown
## Beat 1: logo zoom-in
- window: 0.0-2.9s
- technique: scale + light bloom, no cut
```

`harness/dev/ref-beat.mjs` reads exactly these two facts (the window, for `light-fit`; the heading
number, to find the beat). Everything else in the file is for the person reading it.

## ledger.jsonl

One JSON object per line, one line per beat pass:

```json
{"ref": "stripe-launch", "beat": 3, "label": "logo zoom-in", "pass": 2,
 "at": "2026-09-27T00:00:00.000Z",
 "scores": {"before": {"ssim": 0.61, "deltaE": 12.0, "combined": 0.71, "light": 9.4},
            "after":  {"ssim": 0.74, "deltaE": 6.1,  "combined": 0.84, "light": 4.2}},
 "judges": [8, 9],
 "minutes": 14, "renders": 3, "tokens": 41000,
 "friction": "light-fit's bloom pick chose a blown highlight, not the light's own hue"}
```

`scores.before` is carried forward automatically: `ref-beat.mjs` reads the prior pass's `after` for
the same `ref`/`beat` and uses it as this pass's `before`. `judges` holds the two fresh structured
judge scores (`make judge STRUCT=1 RUNS=A,B`) once a beat is close enough to ask for them. `friction`
is one sentence naming what actually slowed the pass down, or `null`; see `LOOP.md` for what to do
with it.

## harness/dev/ref-beat.mjs

Runs one beat's measurement in order and appends its ledger line:

```
node harness/dev/ref-beat.mjs REF=<ref-name> BEAT=<n> [D=<film.json>]
```

Without `D`, it only fits the beat's light (`light-fit.mjs`) and names the file to author next.
With `D=<film.json>`, it also scores that film against the reference (`match.mjs`, `LIGHT=1`) and
runs the hard-number check (`verify.mjs`), then writes the ledger line and prints the next action:
two fresh judges once `combined >= 0.70`, otherwise the worst beat row to fix next.
