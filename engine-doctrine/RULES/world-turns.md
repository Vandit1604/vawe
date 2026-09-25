---
name: world-turns
when: authoring the bg block of any scene
holds: gated (quality/gates/backdrop-turn.mjs#backdrop-never-turns, wired into author-check.mjs's LADDER; BLOCKS)
answers: "why the backdrop must change tone per beat, and the 82% of the library that ships one window"
group: look
codes: [backdrop-never-turns]
---
# The backdrop changes tone per beat, or the film is a slide with effects on it

`bg` is required, so the backdrop is always a decision, never a default. List backdrop windows in the
order the film turns and give none of them a `from`/`to`: the engine binds window i to the cut after
it, so the cuts already written own the timing. 82% of gate-visible scenes paint one window for the
whole runtime. A pictorial beat on a dead backdrop is still a slide.

| parameter | value |
|---|---|
| library scenes with one bg window for the whole film | 82% |
| bg windows should bind to | the film's own cuts (list them, no `from`/`to`) |

Right:
```json
{ "bg": { "windows": [
  { "preset": "black" },
  { "preset": "softwash", "tint": "accent" },
  { "preset": "black" }
] } }
```

Wrong:
```json
{ "bg": { "preset": "black" } }
```
