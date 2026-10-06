---
id: typeface-default
step: look
principle: Use the kit's face and surface for a brand, or a face the direction chose. Do not pick Inter, Space Grotesk or another generator default by habit.
limit: none
range: banned as defaults: Inter, Roboto, Open Sans, Noto Sans, Lato, Source Sans, PT Sans, Nunito, Poppins, Outfit, Sora, Playfair Display, Cormorant Garamond, Bodoni Moda, EB Garamond, Cinzel, Prata, Syne, Space Grotesk. Also not by default: Bricolage Grotesque, Instrument Serif, Fraunces, Archivo Black, DM Serif Display, Fredoka
break-when: the brand's real site uses the face (declare it, with the reason)
instead: run `node scripts/brand/kit.mjs <url> <name> --init` and use the kit's face; with no brand, look at the bundled faces in assets/fonts, name the signal you want and reject your first instinct.
check: judge
judge: Does the face trace to the brand kit or to a stated direction?
prevents: feedback: Instrument Serif was picked for a real film and rejected as "a saturated AI-default face". Measure the real weight: Creed's headline is 600, authored as 800 by eye and shipped wrong.
status: active
scored: yes
numbers: {}
print-frames: use the kit's face and ground or a face the direction chose, not Inter or Space Grotesk by habit
digest: Use the kit's face and ground, or a face the direction chose; not Inter or Space Grotesk by habit.
craft: typography
---

## Example

Right: the brand site's real font at the weight its CSS sets. Wrong: Inter 800 because the headline looked heavy.

Why and sources: [typography](../craft/typography.md).
