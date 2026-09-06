---
name: blur-out-dense
when: exiting a face, a card, or a dense grid of elements
holds: eye (live hook scripts/live/craft-live.mjs on Claude Code; check by hand elsewhere)
answers: "why a dense or face-bearing layer should exit through defocus, not through a slide"
group: look
---
# Blur out when a slide would fight the content

`out:"defocus"` leaves through focus instead of through space. Use it for faces, cards, and dense grids,
where sliding many elements at once reads as chaos rather than an exit.

| content | exit |
|---|---|
| a face, a card, a dense grid | `out: "defocus"` |
| a single simple shape | a directional slide is fine |

Right:
```json
{ "id": "grid", "out": "defocus" }
```

Wrong:
```json
{ "id": "grid", "out": "slide-left" }
```
