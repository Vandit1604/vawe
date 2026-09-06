---
name: banned-defaults
when: choosing type, colour, or layout for any hand-authored surface
holds: gated (scripts/gates/designspec-check.mjs; off-colour, ruled-grid, and the generic-tell checks)
answers: "the banned-defaults list and the escape valve for when the content genuinely calls for one"
group: look
---
# Ban gradient text, cyan/purple, identical card grids, and Inter by default

These are the tells that read as generated rather than designed, because they are what a model reaches
for with no direction: gradient-filled headline text, a cyan-to-purple gradient, an identical-weight
card grid, everything centered with equal visual weight, Inter or Space Grotesk as the face, and pure
`#000`/`#fff` unless the brief actually says black. `make designspec-check` catches the deterministic
ones. The escape valve is real: if the content genuinely calls for one of these, say so in
`authoring._why` rather than reaching for it by reflex.

| banned by default | escape valve |
|---|---|
| gradient text | `authoring._why` names the reason |
| cyan/purple gradient | same |
| identical-weight card grid | same |
| everything centered, equal weight | same |
| Inter / Space Grotesk (no brand reason) | same |
| pure `#000`/`#fff` (brief did not say black) | write `{"preset":"black"}` when it did |

Right:
```json
{ "authoring": { "allow": ["off-colour"], "_why": { "off-colour": "the brand's own palette is cyan/purple, captured from its site" } } }
```

Wrong:
```json
{ "theme": { "accent": "#8B5CF6", "accent2": "#06B6D4" }, "type": { "sans": "Inter" } }
```
