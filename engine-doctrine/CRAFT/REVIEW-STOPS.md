---
when: "\"we built the whole thing and then it was rejected\""
answers: "the points where the work gets shown before it is finished: concept, storyboard, style frames, the 85% draft"
group: crosscutting
---

# Review stops: show the work before it is finished

Show one screen at each point below, then take the reaction before the next phase. Nothing here is a
gate and nothing is recorded. The draft render is the record, and a new one replaces the old one.

Every rejection below was found after the whole film was built. Every one was visible earlier and cheaper:

| what was rejected | the stop that catches it | cost there |
|---|---|---|
| a glass film that was four frosted rectangles drifting | concept | one line of text |
| a saturated AI-default serif | style frames | one token |
| an explainer whose first slide carried nothing | style frames | one element |
| a scroll-driven deck whose motion was the point, and missed | concept | a sentence |
| a film whose first two seconds held one character | storyboard | one line of markdown |

Momentum carried each one past the moment when redirecting was free.

## The stops

1. **Concept.** Three directions, one line and one frame each. They differ in structure, not palette: a
   different message, object or shape. The reviewer picks one, kills one or says none. If you build the
   one you like and ask "is this good?", that is a request for permission, not a choice. The method for
   getting off the median is `PITCH.md`.
2. **Storyboard.** A rough beat sheet or grey blocking frame per beat shows where things sit and how big
   they are. It cannot show a look (grey on purpose) or motion. A beat whose picture reads "a nice shot
   of the product" is a true report of an empty plan.
3. **Style frames.** Two or three stills at final quality, before any motion: palette, face,
   composition, density. A wrong call costs a token edit here and the whole film after animating. Render
   a hand-written fragment on its own (`bin/vawe compare --page <page> --at t`) before it goes into a film.
4. **The 85% draft.** Structure and timing locked, polish open. State the level of finish and the
   warnings you knowingly carry, so the reviewer does not flag the placeholder photo, and does not wave a
   real defect through thinking it is a rough cut. Then 95%, then a fresh critique (`bin/vawe critique`),
   then `bin/vawe ship`.

## Rules

- A stop is a picture, not a report. If it needs a paragraph to be judged, it is not ready.
- Three real options, or it is not a choice.
- Subagents told to "build the film" build the whole film. Put the stops in their brief.
- The owner rule stands: show the first draft, never wait for a yes. A stop shows the work and takes
  the reaction. It does not block on a sign-off step.
