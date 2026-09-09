---
name: paired-directional-exit
when: choosing anim/out for a layer that slides
holds: eye (live hook harness/live/craft-live.mjs on Claude Code; check by hand elsewhere)
answers: "why an entrance and its exit must travel in one continuous direction, never enter-and-retreat"
group: look
---
# Entrances and exits travel in one direction; never enter-and-retreat

A layer that enters from the right and leaves back to the right reads as a bounce, not a pass-through.
Pair every directional entrance with an exit that continues the same line of travel: enter from the
right, leave to the left. One continuous direction per beat.

| entrance | exit |
|---|---|
| `slide-right` | `slide-left` |
| `slide-up` | `slide-down` |
| never | enter-and-retreat (same side both ways) |

Right:
```json
{ "id": "card", "anim": "slide-right", "out": "slide-left" }
```

Wrong:
```json
{ "id": "card", "anim": "slide-right", "out": "slide-right" }
```
