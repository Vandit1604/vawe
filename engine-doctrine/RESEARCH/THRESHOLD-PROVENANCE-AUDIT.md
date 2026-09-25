---
when: "adding or changing a constant that decides a gate verdict"
answers: "every verdict-deciding constant in the gates, its source category, and the count that carries no source at all"
group: process
---

# Threshold provenance audit

Task 3 of `.claude/plans/rules-from-sources.plan.md`. A sweep of `quality/gates/*.mjs` and
`harness/lib/*.mjs` for numeric constants that decide a verdict, each recorded against the plan's four
legitimate source categories or `NONE`. **This audit does not fix anything.** Wiring the refusal is
Task 4 (`quality/gates/threshold-provenance.mjs`, `make provenance`); fixing the constants below is a
separate, later job.

## The four legitimate categories, restated

1. **Human perception.** Reading speed, fixation time, flicker fusion, contrast ratio.
2. **The medium.** Frame rate, safe area, aspect ratio, colour space.
3. **A published standard or cited craft source**, linked or named, never "the trade says".
4. **A measured EXTERNAL reference**, with enough of them to be a sample.

A threshold justified by our own films is a finding, except `direction-floor`'s `library-top5-only` and
its cadence spread (both push AWAY from the corpus, so the question they ask is inherently relative) and
`coverage.mjs`'s ratchet (a regression guard, not a quality bar). Both are out of scope and untouched.

## Where the threshold/formula line was drawn

A constant only entered the count if this file could see it deciding something: used elsewhere in the
same file with a comparison (`<`, `>`, `<=`, `>=`, `===`, `!==`) or handed to `.fail`/`.warn`/`.push`. A
constant that only feeds a formula, with no comparison anywhere, was never a candidate.

That machine test still let geometry and infrastructure through, because a display size is compared
against nothing but still gets multiplied into a rect. Eighteen more were pulled out by hand after
reading each one, all a unit conversion, a grid or tile size, a loop bound, a port number, or a decode
sample rate for the gate's OWN analysis pipeline, never a bar the film is held to:

`frame-forensics.mjs#N` (sample grid) · `resolve-range.mjs#GRID` (1/60s time-snap) ·
`beat-check.mjs#STEP` (search step) · `compare.mjs#TW/TH` (thumbnail pixels) ·
`direction-floor.mjs#STEP` (1/30s, one frame) · `eye-trace.mjs#B` (histogram buckets) ·
`motion-floor.mjs#GW/GH` (motion-sampling grid) · `motion-split.mjs#GRID/SUB` (grid subdivision) ·
`snap-blocks.mjs#CTX/CAP` (diff display) · `snap-scenes.mjs#BATCH` (perf dial) ·
`snap-signature.mjs#UNIT_CAP` (downsample cap) · `sweep-static.mjs#TILE` (pixel tile) ·
`block-schema.mjs#PROBE` (a port number) · `audio-render-check.mjs#SR` (decode sample rate).

The exclusion list lives in `quality/gates/threshold-provenance.mjs` as `FORMULA`, one entry per name
with its one-line reason, so a name reaches it by being read, not by looking short and boring.
`SPECTACLE_MIN_BOUNDARIES` and `CAMERA_COVERAGE_FLOOR` below look exactly that small, and both stayed
in the count: both decide a verdict, and both are the finding, not the exemption.

`lib-test.mjs` (the lib test runner) was excluded wholesale: its constants are test-fixture values, not
gate thresholds a real film is judged against.

## The count

**93 verdict-deciding constants, across 33 files. 7 cited. 86 with no recorded source.**

7 cited, all in `read-check.mjs` (6: `CPS_WALL`, `MIN_LIFE`, `MAX_HOLD`, `GAP_JOIN`, `GAP_MIN`,
`CUT_SNAP`) and `motion-floor.mjs` (1: `WINDOW_S`). `HOLD_PER_WORD` in `read-check.mjs:117` is also
genuinely cited (ssw.com.au, "read it twice" at 200wpm) but the mechanical scanner cannot see it: it
never appears in a direct comparison, only inside `words.length * HOLD_PER_WORD`, whose RESULT is
compared two lines later. Counted here by hand as cited; the gate's machine count does not see it, which
undercounts "cited" rather than overcounting "sourceless", the safe direction for a ratchet.

Three `FPS = 30` constants (`eye-trace.mjs:76`, `motion-audit.mjs:68`, `read-check.mjs:116`) are
arguably category 2, the medium: this engine renders at a fixed 30fps in draft and 60fps final
(`AGENTS.md`), so the render's own frame rate is about as sourced as a number gets. None carries a
comment saying so in place, so the mechanical count leaves all three in `NONE`; noted here so a future
pass fixing them can cite `AGENTS.md`'s own frame-rate line rather than treat it as undecided.

`pace-check.mjs`'s `FLOOR` and `HOLD` are listed for completeness (this is a repo-wide sweep) but not
further assessed: that file is Task 2's territory in the same plan and this task was told not to touch
it.

## Ten worst offenders

The plainest failures are not the constants with no comment at all: several of THOSE are honest about
having nothing to say. The worse failures are the ones argued with real prose that still cites nothing
but this repo's own footage, which is precisely the defect class `harness/lib/genre-pacing.mjs`'s
`UNCALIBRATED_MAX_S` was (one film, doubled) and the plan opens by naming.

1. **`choreo.mjs:248` `CAMERA_COVERAGE_FLOOR`/`CAMERA_COVERAGE_MIN_DURATION`** ("read off the one
   measured regression: vawe-flow-2, 4.2s of legs over 13.3s"). One clip, not a sample.
2. **`seams.mjs:97-99` `GHOST_FLOOR`/`GHOST_RATIO`/`RES_FLOOR`** ("pixel readings on
   out/demo.mp4 that fixed each number"). One render, not a sample.
3. **`motion-floor.mjs:51` `LOCAL_SHARE`** ("both real films measured 3-4%; 8% is a wide margin around
   that"). Two films.
4. **`motion-floor.mjs:48` `DEAD`** and **`eye-trace.mjs:86` `JUMP_FAR`**, both explicitly corpus-
   percentile language in their own comments, the same shape `pace-check.mjs`'s `FLOOR` already is.
5. **`plan-vs-render.mjs:124` `SPECTACLE_MIN_BOUNDARIES`/`SPECTACLE_MIN_DUR`** ("The two dials were
   chosen against that measurement: ... 18 distinct films"). Argued well, sourced from us.
6. **`mistakes-dupes.mjs:76` `THRESHOLD`** ("0.75 sits with a wide margin above that noise floor"), a
   self-derived similarity cutoff with no external anchor at all.
7. **`critique.mjs:254` `CAMERA_PUSH_S`**, whose own comment calls it "an arbitrary but named 'clearly
   pushed in' floor". The file says it is arbitrary; the audit agrees.
8. **`direction-floor.mjs:455` `CONTINUITY_MAX_DUR`**, a bare `15` with no reasoning of any kind beyond
   a restated definition ("above this, chaptered structure is legitimate").
9. **`storyboard-check.mjs:156` `SPINE_MAX_S`**, a bare `15` with zero surrounding comment.
10. **`harness/lib/contract.mjs:613` `FULL_FRAME_OBJECT_AREA`**, the one entry here that is close to
    legitimate (derived from the five real canvas resolutions, `AGENTS.md`) but is phrased as an
    internal derivation rather than a citation to the medium, so it still reads `NONE` under the
    mechanical rule. Listed as the "nearly there" case, not a peer of the other nine.

## Full table

93 rows. `NONE` means no cited source found by the rule above; `CITED` means a nearby comment carried a
URL or one of the category-1/2/3 keywords. This table is a snapshot from
`node quality/gates/threshold-provenance.mjs --list` (plus the hand-added `CITED` note on
`HOLD_PER_WORD` above); the live count is whatever that command reports today.

| file:line | name | value | source |
|---|---|---|---|
| quality/gates/audio-render-check.mjs:123 | ONSET_DB | 8 | NONE |
| quality/gates/audio-render-check.mjs:123 | NOISE_FLOOR_DB | -45 | NONE |
| quality/gates/audio-render-check.mjs:123 | MERGE_S | 0.1 | NONE |
| quality/gates/audio-render-check.mjs:135 | TOL_S | 0.15 | NONE |
| quality/gates/beat-check.mjs:92 | DEAD_AIR | 0.4 | NONE |
| quality/gates/beat-check.mjs:93 | TAIL | 0.2 | NONE |
| quality/gates/beats-of.mjs:22 | CLUSTER | 1.6 | NONE |
| quality/gates/choreo.mjs:60 | FAST_RATIO | 0.6 | NONE |
| quality/gates/choreo.mjs:69 | SPEED_EPS | 1 | NONE |
| quality/gates/choreo.mjs:248 | CAMERA_COVERAGE_FLOOR | 0.4 | NONE |
| quality/gates/choreo.mjs:248 | CAMERA_COVERAGE_MIN_DURATION | 6 | NONE |
| quality/gates/choreo.mjs:256 | CAMERA_TRAILING_FREEZE | 3 | NONE |
| quality/gates/covered-move.mjs:66 | EPS | 0.001 | NONE |
| quality/gates/covered-move.mjs:131 | VISIBLE_STEPS | 24 | NONE |
| quality/gates/covered-move.mjs:153 | OPAQUE_STEPS | 24 | NONE |
| quality/gates/critique.mjs:165 | MIN_TYPE_HOLD | 0.4 | NONE |
| quality/gates/critique.mjs:220 | TILT_TOL | 0.05 | NONE |
| quality/gates/critique.mjs:220 | TILT_TIME_TOL | 0.05 | NONE |
| quality/gates/critique.mjs:254 | CAMERA_PUSH_S | 1.15 | NONE |
| quality/gates/critique.mjs:254 | CAMERA_MOVE_PX | 4 | NONE |
| quality/gates/designspec-check.mjs:134 | TOL | 0.14 | NONE |
| quality/gates/designspec-check.mjs:134 | NEUTRAL_SAT | 0.12 | NONE |
| quality/gates/direction-floor.mjs:455 | CONTINUITY_MAX_DUR | 15 | NONE |
| quality/gates/direction-floor.mjs:456 | EPS | 0.15 | NONE |
| quality/gates/direction-floor.mjs:640 | TURNOVER_MIN | 2 | NONE |
| quality/gates/seams.mjs:50 | VISIBLE | 0.15 | NONE |
| quality/gates/seams.mjs:51 | MUDDY | 0.12 | NONE |
| quality/gates/seams.mjs:52 | STEPS | 101 | NONE |
| quality/gates/docker-context.mjs:28 | BUDGET_MB | 60 | NONE |
| quality/gates/eye-trace.mjs:76 | FPS | 30 | NONE (arguably medium, see above) |
| quality/gates/eye-trace.mjs:86 | JUMP_FAR | 0.30 | NONE (corpus-percentile in its own comment) |
| quality/gates/eye-trace.mjs:267 | SEARCH | 1.5 | NONE |
| quality/gates/frame-check.mjs:57 | SCALE_DRIFT_MAX | 7 | NONE |
| quality/gates/ground-arc.mjs:28 | LIGHT | 150 | NONE |
| quality/gates/ground-arc.mjs:28 | DARK | 105 | NONE |
| quality/gates/mistakes-dupes.mjs:76 | THRESHOLD | 0.75 | NONE |
| quality/gates/motion-audit.mjs:68 | FPS | 30 | NONE (arguably medium, see above) |
| quality/gates/motion-audit.mjs:69 | HOLDW | 0.5 | NONE |
| quality/gates/motion-audit.mjs:623 | TRAIL_WINDOW | 0.4 | NONE |
| quality/gates/motion-floor.mjs:45 | WINDOW_S | 0.5 | CITED |
| quality/gates/motion-floor.mjs:48 | DEAD | 0.13 | NONE (corpus-derived in its own comment) |
| quality/gates/motion-floor.mjs:51 | LOCAL_SHARE | 0.08 | NONE (corpus-derived in its own comment) |
| quality/gates/motion-floor.mjs:61 | RIGID_EXPLAIN | 0.5 | NONE |
| quality/gates/motion-floor.mjs:69 | RIGID_EXTENT | 0.5 | NONE |
| quality/gates/motion-sound-check.mjs:90 | BUCKET_S | 0.2 | NONE |
| quality/gates/motion-sound-check.mjs:122 | SILENCE_DB | -40 | NONE |
| quality/gates/motion-sound-check.mjs:144 | STILL_FLOOR | 0.06 | NONE |
| quality/gates/motion-sound-check.mjs:144 | LOUD_DB | -28 | NONE |
| quality/gates/pace-check.mjs:37 | FLOOR | 1.0 | NONE (Task 2 territory, not assessed here) |
| quality/gates/pace-check.mjs:38 | HOLD | 4.0 | NONE (Task 2 territory, not assessed here) |
| quality/gates/plan-vs-render.mjs:90 | NEAR | 0.5 | NONE |
| quality/gates/plan-vs-render.mjs:91 | STILL | 2.5 | NONE |
| quality/gates/plan-vs-render.mjs:92 | DRIFT | 0.6 | NONE |
| quality/gates/plan-vs-render.mjs:93 | OVERRUN | 0.5 | NONE |
| quality/gates/plan-vs-render.mjs:124 | SPECTACLE_MIN_BOUNDARIES | 2 | NONE (corpus-derived, argued) |
| quality/gates/plan-vs-render.mjs:124 | SPECTACLE_MIN_DUR | 12 | NONE (corpus-derived, argued) |
| quality/gates/plan-vs-render.mjs:494 | BEAT_TOL | 0.05 | NONE |
| quality/gates/prop-probe.mjs:340 | PER_SCENE | 12 | NONE |
| quality/gates/read-check.mjs:116 | FPS | 30 | NONE (arguably medium, see above) |
| quality/gates/read-check.mjs:117 | HOLD_PER_WORD | 0.6 | CITED (by hand; see note above) |
| quality/gates/read-check.mjs:118 | CPS_WALL | 20 | CITED |
| quality/gates/read-check.mjs:119 | MIN_LIFE | 25 / FPS | CITED |
| quality/gates/read-check.mjs:120 | MAX_HOLD | 5 | CITED |
| quality/gates/read-check.mjs:121 | GAP_JOIN | 3 / FPS | CITED |
| quality/gates/read-check.mjs:122 | GAP_MIN | 15 / FPS | CITED |
| quality/gates/read-check.mjs:123 | CUT_SNAP | 0.5 | CITED |
| quality/gates/read-check.mjs:124 | PROSE_WORDS | 4 | NONE (argued from reading behaviour, uncited) |
| quality/gates/read-check.mjs:125 | PROSE_SIZE | 28 | NONE (argued from reading behaviour, uncited) |
| quality/gates/read-check.mjs:131 | OTHER_WPS | 3 | NONE |
| quality/gates/scene-timing.mjs:50 | SPECK | 0.08 | NONE |
| quality/gates/scene-timing.mjs:276 | EPS | 1e-6 | NONE |
| quality/gates/scene-timing.mjs:457 | FULL_FRAME_SHARE | 0.8 | NONE |
| quality/gates/scene-timing.mjs:458 | REST_S_EPS | 0.02 | NONE |
| quality/gates/scene-timing.mjs:458 | REST_PX_EPS | 1 | NONE |
| quality/gates/scene-timing.mjs:458 | REST_DEG_EPS | 1 | NONE |
| quality/gates/scene-timing.mjs:483 | HANDOFF_WINDOW | 0.25 | NONE |
| quality/gates/seams.mjs:97 | GHOST_FLOOR | 4 | NONE (one render, "out/demo.mp4") |
| quality/gates/seams.mjs:98 | GHOST_RATIO | 1.3 | NONE (one render, "out/demo.mp4") |
| quality/gates/seams.mjs:99 | RES_FLOOR | 4 | NONE (one render, "out/demo.mp4") |
| quality/gates/sfx-audit.mjs:41 | AUDIBLE | 10 ** (-45 / 20) | NONE |
| quality/gates/storyboard-check.mjs:156 | SPINE_MAX_S | 15 | NONE (bare, no comment) |
| quality/gates/study-verify.mjs:85 | TOL | 0.12 | NONE |
| quality/gates/sweep-static.mjs:27 | MIN_DURATION_FOR_CHECK | 3 | NONE |
| quality/gates/sweep-static.mjs:34 | CHANGE_THRESHOLD | 0.005 | NONE |
| quality/gates/sweep-static.mjs:38 | SAMPLE_COUNT | 10 | NONE |
| quality/gates/waiver-drift.mjs:127 | DRIFT | 0.15 | NONE |
| harness/lib/contract.mjs:550 | REST_S_EPS | 0.02 | NONE |
| harness/lib/contract.mjs:550 | REST_PX_EPS | 1 | NONE |
| harness/lib/contract.mjs:550 | REST_DEG_EPS | 1 | NONE |
| harness/lib/contract.mjs:613 | FULL_FRAME_OBJECT_AREA | 1_400_000 | NONE (derived from the medium, uncited) |
| harness/lib/png-diff.mjs:84 | NOISE | 1 | NONE |
| harness/lib/reference-bars.mjs:39 | MIN_REFERENCES | 5 | NONE (a sample-size floor on the bank itself, not a corpus-derived quality bar) |
| harness/lib/safeguards.mjs:72 | SHORT_FILM_FLOOR_SEC | 12 | NONE |
| harness/lib/waivers.mjs:42 | MIN_REASON_LEN | 12 | NONE |

## How to reproduce

```bash
node quality/gates/threshold-provenance.mjs          # summary + ratchet check
node quality/gates/threshold-provenance.mjs --list    # the sourceless worklist
```

## Task 1 (`.claude/plans/numbers-out-principles-in.plan.md`): the three-way split

The 86 sourceless constants above are not one kind of thing. Split by what each one decides:

- **Group A, motion design judgement.** A craft opinion about how a film should look or move: a hold
  length, a camera speed, a coverage floor, a pacing floor. In scope for this plan.
- **Group B, measurement machinery.** A sampling step, a floating-point epsilon, a pixel-diff noise
  floor, a bucket size, a QA tolerance between the plan and the render. Makes a measurement WORK; judges
  nothing about a film. Out of scope.
- **Group C, signal thresholds with a real standard nearby.** Audio dB floors, colour/saturation
  tolerances. A separate pass (published loudness and colour standards), out of scope here.

Counts: **34 Group A, 45 Group B, 7 Group C.** Every constant is named below with a one-line reason.
Three could not be placed by the mechanical A/B/C read alone and are called out as findings, not folded
in by a coin toss: `MIN_REASON_LEN`, `waiver-drift.mjs`'s `DRIFT`, and `mistakes-dupes.mjs`'s
`THRESHOLD` are not about a film at all (a waiver's prose length, how much of the library shares a
waiver code, how similar two mistake-log headings are); they are grouped with B on the closest fit
(they decide a verdict the same mechanical way B's constants do) but are process/text machinery, not
motion measurement. Two infrastructure limits (`docker-context.mjs`'s `BUDGET_MB`, a build-context size
cap, and `prop-probe.mjs`'s `PER_SCENE`, a WebGL context-count ceiling) are grouped with B for the same
reason: neither is motion design, neither is out of scope for any reason but domain.

### Group A: 34 constants, researched in `TIMING-SOURCES.md` (Task 2) and changed in Task 3

| file:line | name | value | one-line reason it is a craft opinion |
|---|---|---|---|
| beat-check.mjs:92 | DEAD_AIR | 0.4 | how long a content gap reads as a breath vs a stall |
| beat-check.mjs:93 | TAIL | 0.2 | how much of the closing frame must carry content |
| choreo.mjs:69(60) | FAST_RATIO | 0.6 | how much faster an exit must be than its entrance to read as emphasised |
| choreo.mjs:248 | CAMERA_COVERAGE_FLOOR | 0.4 | how much of the runtime the camera must actually travel |
| choreo.mjs:248 | CAMERA_COVERAGE_MIN_DURATION | 6 | film length below which camera coverage isn't judged |
| choreo.mjs:256 | CAMERA_TRAILING_FREEZE | 3 | how long the camera may hold still before the ending reads as unfinished |
| critique.mjs:165 | MIN_TYPE_HOLD | 0.4 | how long a typed line must hold after finishing before the cut |
| critique.mjs:254 | CAMERA_PUSH_S | 1.15 | how much camera scale counts as "pushed in" during typing |
| critique.mjs:254 | CAMERA_MOVE_PX | 4 | how much camera pan counts as "tracking" the typing |
| direction-floor.mjs:455 | CONTINUITY_MAX_DUR | 15 | film length above which chaptered (no-single-spine) structure is legitimate |
| direction-floor.mjs:640 | TURNOVER_MIN | 2 | how many layers must turn over at once to count as a scene-change boundary |
| seams.mjs:50 | VISIBLE | 0.15 | opacity at which a glyph is legible enough to muddy the one behind it |
| seams.mjs:51 | MUDDY | 0.12 | how much overlap in a dissolve reads as illegible mush |
| eye-trace.mjs:86 | JUMP_FAR | 0.30 | how far a cut may move the eye before the jump itself is unusual |
| eye-trace.mjs:267 | SEARCH | 1.5 | how long the eye is given to find the new focal point after a cut |
| frame-check.mjs:57 | SCALE_DRIFT_MAX | 7 | how many distinct literal sizes a film's fragments may use before it stops reading as one film |
| motion-audit.mjs:69 | HOLDW | 0.5 | how long a payoff must sit steady before its exit counts as "settled" |
| motion-audit.mjs:623 | TRAIL_WINDOW | 0.4 | how soon after a leader stops a trailing layer's own motion still reads as follow-through |
| motion-floor.mjs:48 | DEAD | 0.13 | how little pixel change in a window counts as "nothing happening" |
| motion-floor.mjs:51 | LOCAL_SHARE | 0.08 | how concentrated a change must be to read as "arrived here" vs ambient |
| motion-sound-check.mjs:144 | STILL_FLOOR | 0.06 | how little visual change counts as "the frame is not moving" |
| pace-check.mjs:37 | FLOOR | 1.0 | events/second below which a film reads as asleep |
| pace-check.mjs:38 | HOLD | 4.0 | how long nothing may arrive or leave before a hold reads as a stall |
| plan-vs-render.mjs:124 | SPECTACLE_MIN_BOUNDARIES | 2 | declared boundaries above which a film is expected to nominate a spectacle peak |
| plan-vs-render.mjs:124 | SPECTACLE_MIN_DUR | 12 | runtime above which a film is expected to nominate a spectacle peak |
| read-check.mjs:124 | PROSE_WORDS | 4 | word count above which a text event is graded as "read", not "glanced at" |
| read-check.mjs:125 | PROSE_SIZE | 28 | type size above which a text event is graded as prose, not reference material |
| read-check.mjs:131 | OTHER_WPS | 3 | reading rate for a short label, distinct from the read-twice rate |
| scene-timing.mjs:457 | FULL_FRAME_SHARE | 0.8 | how much of the canvas a beat's content must fill to justify a held camera pose |
| scene-timing.mjs:483 | HANDOFF_WINDOW | 0.25 | how close an exit and the next entrance must land to count as one handoff |
| storyboard-check.mjs:156 | SPINE_MAX_S | 15 | film length below which a named holding device (thread/object) is required |
| harness/lib/contract.mjs:613 | FULL_FRAME_OBJECT_AREA | 1,400,000 | px² above which a centred object counts as "full frame" evidence for a normal-camera shot |
| harness/lib/safeguards.mjs:72 | SHORT_FILM_FLOOR_SEC | 12 | film length below which "not enough features" stops being a fair question |

(33 rows; `motion-floor.mjs:48`'s `DEAD` and `:51`'s `LOCAL_SHARE` are exported and used a second time by
`choreo.mjs`, which is why the file only needed one entry each above despite two call sites; counted once.)

### Group B: 45 constants, out of scope, untouched

Sampling/epsilon/bucket machinery that makes a measurement work, never itself a craft bar:
`covered-move.mjs` `EPS` `VISIBLE_STEPS` `OPAQUE_STEPS`; `scene-timing.mjs`/`contract.mjs`'s shared
`REST_S_EPS`/`REST_PX_EPS`/`REST_DEG_EPS` (both files); `scene-timing.mjs` `EPS` (1e-6); `direction-floor.mjs`
`EPS` (0.15, ~4 frames); `seams.mjs` `STEPS`; `png-diff.mjs` `NOISE`; `choreo.mjs` `SPEED_EPS`;
`critique.mjs` `TILT_TOL`/`TILT_TIME_TOL`; `motion-floor.mjs` `RIGID_EXPLAIN`/`RIGID_EXTENT` (camera-vs-
content classification math, not a "how much motion is good" bar); `motion-sound-check.mjs` `BUCKET_S`;
`audio-render-check.mjs` `MERGE_S`/`TOL_S`; `beats-of.mjs` `CLUSTER` (a fallback heuristic's own merge
window, only used when no storyboard exists to read the real beat table from); `eye-trace.mjs`/
`motion-audit.mjs`/`read-check.mjs`'s three `FPS = 30` (the render's own fixed frame rate, arguably
medium/category-2 rather than unsourced, see the note above this section).

Render-fidelity QA (does the render match the plan, an engineering tolerance, not a perceptual one):
`plan-vs-render.mjs` `NEAR`/`STILL`/`DRIFT`/`OVERRUN`/`BEAT_TOL`; `study-verify.mjs` `TOL`.

Self-referential pipeline/artifact detection (measuring OUR OWN renderer or diffing tool, not craft):
`seams.mjs` `GHOST_FLOOR`/`GHOST_RATIO`/`RES_FLOOR` (one render, `out/demo.mp4`, fixed a real
ghosting bug, not a taste call); `sweep-static.mjs` `MIN_DURATION_FOR_CHECK`/`CHANGE_THRESHOLD`/
`SAMPLE_COUNT` (frozen-render bug detection, all three parts of one detector).

Process/statistics, not motion at all: `reference-bars.mjs` `MIN_REFERENCES` (a sample-size floor on
the reference bank itself); `waivers.mjs` `MIN_REASON_LEN` (a waiver's prose length); `waiver-drift.mjs`
`DRIFT` (how much of the library shares one waiver code); `mistakes-dupes.mjs` `THRESHOLD` (text
similarity between two mistake-log headings).

Infrastructure, not motion design or a film measurement of any kind: `docker-context.mjs` `BUDGET_MB`
(a build-context size cap); `prop-probe.mjs` `PER_SCENE` (a WebGL context-count ceiling, "the number is
load-bearing" per its own comment, unrelated to any film's quality).

### Group C: 7 constants, a separate pass, untouched

`audio-render-check.mjs` `ONSET_DB`/`NOISE_FLOOR_DB`; `motion-sound-check.mjs` `SILENCE_DB`/`LOUD_DB`;
`sfx-audit.mjs` `AUDIBLE`; `designspec-check.mjs` `TOL`/`NEUTRAL_SAT`; `ground-arc.mjs` `LIGHT`/`DARK`.
(That is 9 named constants across 7 decision points; `designspec-check.mjs` and `ground-arc.mjs` each
carry two on one line.) Signal/colour domain: real standards exist nearby (EBU R128, ITU-R BT.601/709,
WCAG contrast) but mapping them is a colour/loudness research pass, not this one; see `TIMING-SOURCES.md`
part 4 for the two it already touched (`SILENCE_DB`/`LOUD_DB` against EBU R128, wrong unit; `NOISE_FLOOR_DB`/
`AUDIBLE` share one unsourced number, an internal-consistency note).

**Nothing was left unclassified after this pass**; the three called out above (`MIN_REASON_LEN`,
`waiver-drift.mjs`'s `DRIFT`, `mistakes-dupes.mjs`'s `THRESHOLD`) are placed in Group B on the "decides a
verdict the same mechanical way" test, flagged as not really about motion so the placement is not read as
silent.
