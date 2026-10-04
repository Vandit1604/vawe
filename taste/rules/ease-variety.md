---
id: ease-variety
step: motion
principle: Vary eases like you vary font weights, and offset layers that move together.
limit: none
range: one to two eases per scene; two layers moving in one beat differ in duration or offset; the signature's main-ease dial picks the scene ease
break-when: two layers share an ease and are offset: that is fine
instead: pick the scene ease from the signature (a punchy brand tightens durations and stagger, a calm one stretches them; set it once as :root custom properties).
check: judge
judge: How many eases does each scene use? Do two layers in one beat move in lockstep?
prevents: doc speed-bands and TASTE-RULES: "no more than two" independent tweens share one ease; the presets give every enter the same land ease.
status: active
scored: no
numbers: {"eases_per_scene_min":1,"eases_per_scene_max":2}
craft: failure-modes
---

## Example

Scene 2 uses EASE.land and EASE.glide only.

Why and sources: [failure-modes](../craft/failure-modes.md).
