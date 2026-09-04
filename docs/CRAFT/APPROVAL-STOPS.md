---
when: "\"we built the whole thing and then it was rejected\""
answers: "the points where the work gets shown before it is finished: concept · storyboard panels · a hand-written fragment · style frames · the 85% draft"
group: crosscutting
codes: all-median, beats-unseen, close-pace, no-preflight, options-collapse, stale-variant, tell-lost-its-source, unscorable
---

# Approval stops: show the work before it is finished

## AGENT SUMMARY

- Stop and show one screen at each of four points (concept, storyboard panels, hand-written fragment,
  style frames) plus the 85% draft, and wait for approve/deny/change before starting the next phase.
  Three genuinely different options, or it is not a choice.
- Not a gate: nothing here is automated, nothing passes or fails. `make approve STAGE=<stage> D=<file>`
  records the answer as a hash receipt; editing the file withdraws its own approval.
- Checkable action: did the reviewer see this stop before the next phase began, and was it three real
  options, not one option with a question mark?

Points in the pipeline where the author **stops**, shows one screen, and does not start the next
phase until the person who asked for the film answers: approve, deny, or change it.

This is not a gate. Nothing here is automated and nothing here passes or fails. It is the studio's
client review, written down, because the tooling for it already existed and was never used.

## Why this exists, with the receipts

Every one of these was rejected **after** the whole thing was built, and every one was visible far
earlier and far cheaper:

| what was rejected | the stop that would have caught it | cost there |
|---|---|---|
| "wtf concept was that": a glass film that was four frosted rectangles drifting | **concept** | one line of text |
| Instrument Serif, a saturated AI-default face | **style frames** | one token |
| an explainer whose first slide carried nothing | **style frames** | one element |
| a scroll-driven deck whose motion was the point, and it missed | **concept** | a sentence |
| a film whose first two seconds held one character | **storyboard panels** | one line of markdown |

Five rejections, five rebuilds, none of which needed to happen. The pattern is always the same:
momentum carried the work past the moment when redirecting it was free.

## The stops

### 1. Concept, before any JSON exists

Show **three genuinely different directions**, one line each and one frame each. Different in
structure, not only in colour: a different message, a different object, a different shape.
`make concept` produces them and `make compare` tiles them.

The reviewer picks one, kills one, or says none of these. A wrong call costs minutes.

**You will build the one direction you already like, show it, and ask whether it is good. Don't.** That is
not a choice, it is a request for permission, and it gets approved by default. Three genuinely different
directions or you have not run this stop. And "different" is measured, not asserted: `make concept` scores
how likely each direction is to be the FIRST thing anybody proposes for the brief, and **throws the round
away unless two of them score under 0.10** ([SELECTION.md](SELECTION.md) Part 3). Asked for three, a
generator produces the first thing three times in three palettes.

### 1a. Storyboard panels, before any JSON exists

`make panels SB=<storyboard.md>` draws one rough grey still per beat and tiles them into a sheet.

The storyboard was the stop that broke the rule below. A storyboard here is prose, so the reviewer was
handed `picture:` and `onscreen:` in English and asked to approve a film. `onefilm` was approved that
way and rejected later on its beats sheet, for a two-second opening that held one character. Nothing
about that needed the JSON to exist.

A panel draws what the plan states and nothing else. `shot:` sizes the subject box, so a wide and a
close are different pictures. Any placement the prose names ("on the left", "the lower third") moves
the box, and a beat that names none says so on the panel. A beat that names no `picture:` is a red
dashed box.

**What a panel is not:**

- **It is blocking, not drawing.** Boxes and flat type, grey on purpose. It answers where things sit
  and how big they are. Never approve a LOOK from one; that is style frames, and the grey is there so
  nobody tries.
- **It cannot show motion.** One held still per beat says nothing about how a thing arrives or how
  long it takes. `make animatic` is the clock, `make reveal` is the entrance.
- **It is only as good as the storyboard.** A beat whose `picture:` reads "a nice shot of the product"
  draws a grey box with that sentence in it. That is a true report, and often the most useful thing a
  panel does.
- **It cannot judge what the plan never states.** If no beat says where anything sits vertically, every
  box is centred by this tool and the empty band is the tool's convention. The panel labels that case,
  so read the label before reading the emptiness.

`storyboard-check` warns when no panels exist for a storyboard, or when they were drawn from an older
version of it. It never blocks: panels are advisory, and a gate that blocks on advice gets waived.

### 1b. The hand-written fragment, before it goes into a film

Every `html` layer and every hand-authored `bg` is somebody's raw HTML. It is the least reviewed thing
in the pipeline and the easiest to review: one file, one command, one picture.

```
make preview HTML=formats/scene/hero.html THEME=<brand>      →  /tmp/preview.png
```

Put the fragment in a FILE and point the layer at it with `src` instead of escaping it into the scene:

```json
{ "type": "html", "src": "formats/scene/hero.html", "x": 200, "y": 400, "w": 1200 }
```

`html` and `src` are alternatives, never both. A `src` that is not on disk stops the render, naming the
path and the roots the server serves: a fragment is the whole beat, so there is nothing to degrade to.

The preview runs `impeccable`'s anti-pattern detector over the file on its way to the PNG and prints
what it finds. That is the half of this stop a picture cannot do: it is what caught the flat type
hierarchy and the cobalt glow in `docs/animation.html`.

**Two things the file does not change, and both bite:**

- **A relative path inside the fragment resolves against the PAGE, not against the fragment's folder.**
  Moving markup into `formats/scene/` does not make `./logo.svg` mean the file beside it. Write asset
  paths from the repo root.
- **`sanitizeHtml` strips any absolute `src`/`href`** (`core/sanitize-html.js`), so an `<img src="/…">`
  that renders in your browser renders empty in the film. The preview shows the fragment BEFORE the
  sanitiser, so a picture that is right here can still be wrong in the render. Check the beats sheet.

### 2. Style frames, before any motion exists

Show two or three stills at **final quality** via `make styleframes`. The reviewer approves the LOOK:
palette, face, composition, density, how much is on screen.

`make styleframes` states the case in its own help text: `onefile` passed every gate with a backdrop
that rendered as loud blue blooms, and one still showed it in three seconds.

A wrong call here costs a theme edit. The same wrong call found after animating costs the film.

### 3. The 85% draft, structure and timing locked, polish open

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
