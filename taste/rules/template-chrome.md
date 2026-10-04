---
id: template-chrome
step: finish
principle: No template chrome. Structure encodes information or it is absent: no label above a title, no step numbers on a non-sequence, no stripe on a card.
limit: none
range: banned unless the brief asks: a tracked-caps eyebrow above a title; 01 / 02 / 03 step markers; a coloured side-stripe border on a card; a card inside a card; three or more identical sibling cards
break-when: the content is a real sequence (steps the viewer follows) or a real product screen: declare it in the page (authoring.allow with a _why)
instead: drop the eyebrow and let the title carry the beat; number only a true sequence; mark a card with space or a surface step, not a stripe; vary the cards in size and weight.
check: template-chrome
judge: Is any label, number, stripe or card there for the look and not for the information?
prevents: research harnesses 10, 11, 14 to 17 (frontend-design, impeccable, taste-skill): the five template tells of generated pages.
status: active
scored: no
numbers: {"stripe_px_min":3,"identical_cards_min":3,"markers_min":2,"eyebrow_tracking_em_min":0.05,"eyebrow_size_share_max":0.4,"card_radius_px_min_1920":6,"card_size_tolerance":0.05,"card_area_pct_min":3}
craft: failure-modes
---

## Example

Wrong: "FEATURES" in tracked caps above the title, then three equal rounded cards. Right: the title, then one real capture.

Why and sources: [failure-modes](../craft/failure-modes.md).

Draft check: A card has a surface, a radius of 6 px or more, 3 percent of the frame or more, and two or more children.
