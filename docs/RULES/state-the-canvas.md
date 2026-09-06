---
name: state-the-canvas
when: starting any scene JSON
holds: warns (core/validate/validate.mjs noAspectWarns)
answers: "why every scene must state aspect, and what it renders as when it does not"
group: look
---
# State the canvas, or the film renders portrait

`core/engine/boot.js` resolves the canvas as `?aspect=` > `data.aspect` > `orientation`, and the orientation
fallback is portrait. A scene that states neither `aspect` nor `orientation` renders 9:16 with no
error: a 16:9 film authored that way looked like a broken layout bug (a panel "vanishing" when its
track started) before anyone checked the actual canvas width.

| parameter | value |
|---|---|
| valid `aspect` values | `16:9` · `9:16` · `1:1` · `4:5` · `4:3` |
| a scene with no `aspect` and no `orientation` | renders `9:16` |

Right:
```json
{ "module": "scene", "aspect": "16:9", "layers": [] }
```

Wrong:
```json
{ "module": "scene", "layers": [] }
```
