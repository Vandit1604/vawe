---
name: vawe-brief
description: "Turn a film request into films/<name>/brief.md: pick the prompts/ template, ask its five questions in order, take the default for any skipped answer, write the brief in the measured anatomy, and name the first draft command. Load when a person asks for a film and no brief.md exists yet."
effort: medium
---

# vawe-brief: the interview, then the brief

A better film comes from a better prompt, and a better prompt comes from asking the right five
questions. This skill runs that interview and writes the brief. It never waits: a skipped question
takes the template's default.

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
marked `[unanswered: default taken]`, and the measured-brief sections with guesses marked `(guess: change me)`.

## 3. Ask the bank

Ask the questions as printed, in one message, defaults shown. Do not add questions. When the answer
arrives, or the person says "go", replace each marker with the answer or keep the default and
delete the marker. Never reopen a question; a wrong default is fixed at the critique.

## 4. Write the brief

`brief.md` already has the measured brief's shape (`prompts/ANATOMY.md`): task, directions, look, spec,
acceptance, gates, pitfalls, deliver. Every field the request did not answer holds a guess marked
`(guess: change me)`. Replace each guess with a number:

- **look**: hex for ground, ink and accent, typeface and weight, cap height as a percent of frame height.
- **spec**: the Shots, Words and Objects tables (times in seconds, positions as a percent of the frame).
  Start a 20 to 30 s film from a RECIPES.md chain, and turn its `invent` row into the film's own moment.
- **acceptance**: pre-filled; keep the rows, fill the measured value after each draft.

A director's brief (a music video, a story) may leave the tables to the first draft; it keeps task,
acceptance and gates (`prompts/ANATOMY.md`, "When a director's brief wins").

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
