---
name: vawe-type
description: "Playbook picker for a video's TYPE in this engine: a product-mechanism demo (cursor, click, consequence), an explainer (no product, real counted figures), a SaaS/product launch (captured UI, continuous object), a recreation of a reference film or site, a motion-graphic sting/bumper (one move, the mark), or a talking-head/narrated presenter video. Load when the route table (engine-doctrine/CRAFT/ROUTING.md) matches demo, launch-video, explainer, or motion-graphic, or the request names a recreation, or a narrated/voiceover/presenter video."
stage: plan
effort: low
---

# vawe-type: pick the playbook, then read one page

Six deliverables, one skill: each has its own spine, its own motion to reach for, and its own worked
example, kept in `reference/<type>.md`. This page is the picker and the spine every type shares.

## Pick the type

`engine-doctrine/CRAFT/ROUTING.md` is the route table: match the request to a deliverable there
first (priority order, first matching row wins), then open the matched type's reference page.
Talking-head is not in that priority table; it is reached directly on request wording ("narrated",
"voiceover", "presenter", "talking head").

| Type | Reference | One line |
|---|---|---|
| demo | `reference/demo.md` | prove one mechanism: cursor, click, consequence, a zoom |
| explainer | `reference/explainer.md` | no product, counted figures, payoff last |
| launch | `reference/launch.md` | captured UI, a continuous object, logo prominence |
| recreation | `reference/recreation.md` | the reference's own grammar, never its frames |
| sting | `reference/sting.md` | one move, the mark, 4-8s |
| talking-head | `reference/talking-head.md` | VO + captions, face-safe layout, B-roll rhythm |

## The shared spine: duration picks the shape, the type picks the content

Every type below ~15s (`CONTINUOUS_ACTION_MAX_S`, `harness/author/type-spines.mjs`) defaults to ONE
CONTINUOUS ACTION ([`vawe-continuous-action`](../vawe-continuous-action/SKILL.md)), not the multi-beat
spine its reference page describes for a longer film. `talking-head` and `recreation` are the two
exceptions and say so on their own page: their content is not held by one transforming prop, so they
keep the beat spine at every length. Each reference page states its own beat spine and continuous-action
threshold; write the storyboard to the shape the page names, not from memory.

## Before writing JSON

Load the matched type's reference page for: the beat spine at this length, the motion to reach for
(by role, searchable with `make arsenal Q="…"`), the rules that matter most for this type, how to get
its assets, what the judge weighs, and a worked example under `quality/runs/evals/briefs/`.

`vawe-video-planning` still runs the brief -> spec table -> JSON chain for whichever type this page
names; this skill picks and directs the type, it does not replace that planning contract.

## Resolve common ambiguities

- A request that names a site but wants to sell nothing (no product, no CTA) is `recreation`, not
  `launch`: the reference IS the subject there, a product is the subject here.
- A short sting cut FROM a captured site (e.g. a 6s logo reveal for a real brand) is still `sting`
  when length and "unnarrated, motion is the message" both hold; a generic "make a video from this
  site" with no length constraint is `launch`.
- Data with a real company or product behind it still routes to `launch` if the ask is to market
  that product; route to `explainer` only when nothing is being sold.
