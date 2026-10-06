---
id: reveal-mask-pad
step: finish
principle: A reveal mask clears the glyphs. Never letters cut by their own reveal.
limit: pad the clip box at least 0.3 em below the baseline and above the cap height
range: none
break-when: never
instead: pad the mask box 0.3 em past the glyph bounds, or reveal with blur and translate and no clip edge.
check: judge
judge: On a full frame mid-reveal, is every descender whole?
prevents: feedback: "letters cut by their reveal". judge1: sting-5s 2.5 s, descenders chopped (anti-pattern B).
status: active
scored: yes
numbers: {"mask_pad_em":0.3}
print-check: pad each reveal mask 0.3 em past the glyphs, not letters cut by their own reveal
craft: failure-modes
---

## Example

clip-path inset(-0.3em 0 -0.3em 0) on a rising line.

Why and sources: [failure-modes](../craft/failure-modes.md).
