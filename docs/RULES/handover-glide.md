---
name: handover-glide
when: one layer becomes another across a cut or a beat boundary
holds: built (formats/scene/scene.js and core/timeline/junctions.js default becomesDur 0.9, becomesEase easeInOutCubic)
answers: "how long a becomes handover must glide so the viewer sees the object travel, not cut"
group: look
---
# A becomes handover glides 0.8 to 1.0 seconds, or it reads as a cut

`becomes` opens the incoming layer on the outgoing layer's final pose, then animates it into its own
geometry. The schema's own default, `becomesDur: 0.42` with `easeOutCubic`, is too fast: at under half
a second the eye reads two stills, not one object travelling. Set `becomesDur` between 0.8 and 1.0 with
`becomesEase: "easeInOutCubic"` so the settle is visible.

| parameter | value |
|---|---|
| `becomesDur` | 0.8 - 1.0s |
| `becomesEase` | `easeInOutCubic` |
| schema default (too fast) | 0.42s / `easeOutCubic` |

Right:
```json
{ "id": "card", "w": 640, "h": 380, "becomes": "dot", "becomesDur": 0.9, "becomesEase": "easeInOutCubic" },
{ "id": "dot", "w": 80, "h": 80 }
```

Wrong:
```json
{ "id": "card", "w": 640, "h": 380, "becomes": "dot" },
{ "id": "dot", "w": 80, "h": 80 }
```
