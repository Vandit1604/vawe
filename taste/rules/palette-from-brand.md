---
id: palette-from-brand
step: look
principle: Colours come from the brand or the brief: take them from the real pixels and the real CSS, and declare the palette once as :root custom properties.
limit: none
range: a family (warm neutral, cool neutral, saturated, mono plus accent, duotone) with a ground, a surface, three text levels and one accent
break-when: no brand and the owner says "you choose": invent a palette on purpose, never plain grey
instead: read the site's CSS tokens before an eyedrop: CSS beats pixels for anything declared. Tint the neutrals (a warm ink, a cool grey); never pure `#000`, `#fff` or `#808080` the brief did not ask for.
check: judge, pure-black-white
judge: Does every colour trace to the kit or to a stated choice, and is any ground pure black or white?
prevents: doc COLOR.md and banned-defaults: an eyedrop read Creed's accent as the sky photo's blue when the CSS says #2563eb; pure #000 reads as "nothing loaded".
dial: palette
status: active
scored: yes
numbers: {"ground_area_pct_min":80}
print-frames: read the brand CSS tokens and tint the neutrals, not pure #000, #fff or a guessed palette
craft: color
---

## Example

Ground #16151a, ink #ffffff, accent #0a87ff, each a custom property.

Why and sources: [color](../craft/color.md).

Draft check: The draft check reads a ground as an element over 80 percent of the frame, and names pure #000 or #fff there.
