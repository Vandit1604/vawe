# Approval stops — show the work before it is finished

Three points in the pipeline where the author **stops**, shows one screen, and does not start the next
phase until the person who asked for the film answers: approve, deny, or change it.

This is not a gate. Nothing here is automated and nothing here passes or fails. It is the studio's
client review, written down, because the tooling for it already existed and was never used.

## Why this exists, with the receipts

Every one of these was rejected **after** the whole thing was built, and every one was visible far
earlier and far cheaper:

| what was rejected | the stop that would have caught it | cost there |
|---|---|---|
| "wtf concept was that" — a glass film that was four frosted rectangles drifting | **concept** | one line of text |
| Instrument Serif, a saturated AI-default face | **style frames** | one token |
| an explainer whose first slide carried nothing | **style frames** | one element |
| a scroll-driven deck whose motion was the point and was wrong | **concept** | a sentence |

Four rejections, four rebuilds, none of which needed to happen. The pattern is always the same:
momentum carried the work past the moment when redirecting it was free.

## The three stops

### 1. Concept — before any JSON exists

Show **three genuinely different directions**, one line each and one frame each. Different in
structure, not only in colour: a different message, a different object, a different shape.
`make concept` produces them and `make compare` tiles them.

The reviewer picks one, kills one, or says none of these. A wrong call costs minutes.

Do not show one direction and ask whether it is good. That is not a choice, it is a request for
permission, and it gets approved by default.

### 2. Style frames — before any motion exists

Show two or three stills at **final quality** via `make styleframes`. The reviewer approves the LOOK:
palette, face, composition, density, how much is on screen.

`make styleframes` states the case in its own help text: `onefile` passed every gate with a backdrop
that rendered as loud blue blooms, and one still showed it in three seconds.

A wrong call here costs a theme edit. The same wrong call found after animating costs the film.

### 3. The 85% draft — structure and timing locked, polish open

`make draft D=<scene.json> STAGE=85`. It records the bar cleared **and every warning carried to clear
it**, so the reviewer reads what was knowingly accepted instead of re-deriving it, and does not flag
the placeholder photo as a defect.

Review against a declared level of finish. A reviewer who thinks they are seeing a ship candidate
flags things that were deliberately left; a reviewer who thinks they are seeing a rough cut lets a
real defect through. Both waste the pass.

Then 95%, then `make judge`, then ship.

## The rules that make it real

- **A stop is a picture, not a report.** One screen. If it needs a paragraph of explanation to be
  judged, it is not ready to be shown.
- **Stopping means stopping.** Do not begin the next phase while waiting. The point is to not have
  built the thing that gets rejected.
- **Three options, or it is not a choice.** One option with a question mark is a request for
  permission.
- **Record the answer.** `make approve STAGE=<stage> D=<file>` writes a hash receipt, so editing the
  file withdraws its own approval. An approval that outlives what it approved is worse than none,
  because it reads as verified.
- **This applies to subagents.** An agent told to "build the film" will build the whole film. The
  stops belong in its brief, or they do not happen.

## What this costs

It is slower per attempt and much faster per finished thing. The deck in `docs/animation.html` was
built four times. Two stops would have made it one.
