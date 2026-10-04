---
id: palette-from-brand
step: look
principle: Colours come from the brand or the brief: take them from the real pixels and the real CSS, and declare the palette once as :root custom properties.
limit: none
range: ground, surface, three text levels, one accent
break-when: no brand and the owner says "you choose": invent a palette on purpose, never plain grey
instead: read the site's CSS tokens before an eyedrop: CSS beats pixels for anything declared. Tint the neutrals (a warm ink, a cool grey); never pure `#000`, `#fff` or `#808080` the brief did not ask for.
check: judge
judge: Does every colour trace to the kit or to a stated choice, and is any ground pure black or white?
prevents: doc COLOR.md and banned-defaults: an eyedrop read Creed's accent as the sky photo's blue when the CSS says #2563eb; pure #000 reads as "nothing loaded".
status: active
scored: yes
numbers: {}
craft: color
---

## Example

Ground #16151a, ink #ffffff, accent #0a87ff, each a custom property.

Why and sources: [color](../craft/color.md).
