---
when: routed here by `engine-doctrine/CRAFT/ROUTING.md`, or a request wants to prove one mechanism works, not ship a film
answers: "the demo intake questions and why the deliverable is disposable scaffolding, not a shippable film"
group: crosscutting
---

# Route: demo

- **Input:** a mechanism, effect, or blueprint that needs proving, not a subject that needs selling.
  No brief about audience or payoff; the audience is the author checking the engine.
- **Output:** a ten-second specimen that proves ONE thing works. Not a showcase, not a contact sheet.
- **Trigger:** "show me this effect", "prove this blueprint works", "a quick test render", "specimen
  for X". If the ask instead wants a shippable film about a real product or topic, route to
  `launch-video.md` or `explainer.md`; a demo is disposable scaffolding, not a deliverable.

## Intake (ask before authoring)

- **The one mechanism**: name exactly what is being proven (one effect, one blueprint, one layer
  type). A demo that proves two things proves neither.
- **The subject must be a picture**, not a blank rectangle: a debug-harness grid with nothing pictorial
  in it is the failure mode `engine-doctrine/CRAFT/SPECIMEN.md` exists to prevent.
- **FX**: which effect/blueprint key, if already known (`make arsenal Q="…"` to find it).

## Blueprint family + docs

- **`make demo Q="…" [NAME=…] [FX=…] [SUBJECT=…]`** writes the archetype and runs the dev loop
  directly; read `engine-doctrine/CRAFT/SPECIMEN.md` first for why the subject is fixed and every constant is
  fixed, and when the honest answer is `make site X=catalog` (browse the existing block registry) instead of
  a new demo.
- No storyboard, no lock sheet, no ship ladder: a demo never runs `make ship`.
