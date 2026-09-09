---
when: deciding whether a script belongs in generators/ or somewhere else
answers: "what generators/ is: it bakes an asset a film later loads, as opposed to core/ which assembles a frame"
group: engine
---

# generators/

Everything here bakes an asset a film later loads: fonts (`fonts/`, plus `media/fonts.mjs`), the
ransom-note sprite sheet (`ransom/`), a physics simulation's frames (`sim/`), and the geo/globe/gradient/
audio/watermark bakers under `media/`. Run one, get a file in `assets/`, and no film-render or gate
touches these again until the source changes.

This is different from `scripts/`, which is repo maintenance and gates (checks, hooks, the studio,
capture tools that serve one film at a time), and different from the film-making tools that stay under
`scripts/media/` and `scripts/author/` (VO, captions, beat sync, per-film asset wiring): those read or
shape one film's data, they do not bake a standing asset for every film to reuse.
