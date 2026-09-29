---
name: vawe-brief
description: "Turn a film request into films/<name>/brief.md: pick the prompts/ template, ask its five questions in order, take the default for any skipped answer, write the brief in the six-section anatomy, and name the first draft command. Load when a person asks for a film and no brief.md exists yet."
effort: medium
---

# vawe-brief: the interview, then the brief

A better film comes from a better prompt, and a better prompt comes from asking the right five
questions. This skill runs that interview and writes the brief. It never waits: a skipped question
takes the template's default (the owner removed approval stages).

## 1. Pick the template

`engine-doctrine/CRAFT/ROUTING.md` maps the request to a film type and a `prompts/<t>.md`. Two
rules of thumb: a real product from a URL is `brand-launch-from-url`; a song that exists is
`music-video-beat-synced`; a reference mp4 is `reference-rebuild`; no brief at all is
`showreel-one-liner`. Under 15 s most types are one continuous action.

## 2. Start the film

```bash
bin/vawe new <name> --from prompts/<t>.md
```

It prints the template's question bank (five questions, each with its default and its reason, in
the order they change the film) and writes `films/<name>/brief.md` with every default filled in and
marked `[unanswered: default taken]`.

## 3. Ask the bank

Ask the questions as printed, in one message, defaults shown. Do not add questions. When the answer
arrives, or the person says "go", replace each marker with the answer or keep the default and
delete the marker. Never reopen a question; a wrong default is fixed at the critique.

## 4. Write the brief

`brief.md` already has the anatomy's shape (`prompts/ANATOMY.md`): inputs, direction, structure,
build, gotchas, start. Fill in what only this film knows:

- **direction**: the genre or reference anchor in the first line (the one feature the corpus rewards),
  then the numbers (hex, fraction of frame height, seconds per beat), then the ban list.
- **structure**: the beat table (`prompts/beat-sheet.md`), cuts on the beat or two frames early.
- **gotchas**: keep the template's; add the ones this film's assets create.
- **start**: name the stills (three to five times in seconds) to show before the full render.

Decide the pole (`prompts/ANATOMY.md`, "The two poles"): a number that already exists is written
down; a number that does not is left to the draft and caught at the critique.

## 5. Name the first draft

End the interview turn with the one next command:

```bash
bin/vawe dev films/<name>/page.html
```

Then load `vawe-page` to write the page, and `vawe-critique` in a fresh session to look at it.

## Gotchas

- A default is a real value, never "ask again". If a template default does not fit, say the value
  you took and why, in the brief.
- Five questions at most. The sixth is the draft.
- A brief with no anchor in its direction reads as a template; name the genre or the reference.
- `films/<name>/brief.md` is a per-film artefact, not doctrine.
