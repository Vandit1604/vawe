---
name: vawe-brief
description: "Turn a film request into films/<name>/brief.md: ask the person for the details that make a good film (subject, message, what to show, look), then write the brief in the measured anatomy and name the first draft command. Load when a person asks for a film and no brief.md exists yet."
effort: medium
---

# vawe-brief: the interview, then the brief

A better film comes from a better prompt, and a better prompt comes from asking the person for the
details a thin request leaves out. This skill runs that interview once, at the start, and writes the
brief. It is not an approval stage: never ask a person to approve a finished plan.

## 0. Ask for the details

```bash
bin/vawe new <name> --request "<the ask>"
```

When a required detail (subject, message, show, look) is missing, this writes nothing and prints the
open questions, each with its reason and an example. The list is `DETAILS` in
`harness/lib/measured-brief.mjs`; do not keep a copy. Send the person ONE message with only those
questions, and wait for the answers. Put the answers in a file, one `key: value` line each, and run:

```bash
bin/vawe new <name> --request "<the ask>" --answers <file>
```

If the person says "you decide", or no person is there (hill-climb, CI), run the same command with
`--defaults`: it guesses each open detail and names which.

## 1. Pick the template

`engine-doctrine/CRAFT/ROUTING.md` maps the request to a film type and a `prompts/<t>.md`. Two
rules of thumb: a real product from a URL is `brand-launch-from-url`; a song that exists is
`music-video-beat-synced`; a reference mp4 is `reference-rebuild`; no brief at all is
`showreel-one-liner`. Under 15 s most types are one continuous action.

## 2. Start the film

```bash
bin/vawe new <name> --from prompts/<t>.md --answers <file>
```

It prints the template's question bank (five questions, each with its default and its reason, in
the order they change the film) and writes `films/<name>/brief.md` with every default filled in and
marked `[unanswered: default taken]`, and the measured-brief sections with guesses marked `(guess: change me)`.

## 3. Template questions

The template's bank is for what step 0 did not cover. Do not ask it again: take each default. Replace each marker with the answer or keep the default and
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
- Ask each unanswered detail once, in one message. The next step is the draft, not a second round.
- A brief with no anchor in its direction reads as a template; name the genre or the reference.
- `films/<name>/brief.md` is a per-film artefact, not doctrine.
