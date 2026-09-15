---
when: picking or writing a named design direction (colour, type, motion feel) for stage 4, design
answers: "what directions/ is: named style packs (bold, editorial, glass, mesh, mono, technical, warm), one JSON each"
group: look
---

# directions/

Named design-direction packs: one JSON per direction (`bold.json`, `editorial.json`, `glass.json`,
`mesh.json`, `mono.json`, `technical.json`, `warm.json`), each setting a base palette, type stack and
motion easing an author picks from at stage 4 (design) rather than inventing from scratch.

Read by: the design stage of authoring (a human or agent choosing a look) and any script that reads a
direction by name.

The one doc: `AGENTS.md`, stage 4 row ("the reference's grammar → the smallest useful `ui-skills`
set"). No dedicated gate; a chosen direction still has to pass the same validator every scene does.

Look first: one of the JSON files, they are short and self-describing (`name`, `dominance`, `desc`,
`base`, `type`, `motion`).
