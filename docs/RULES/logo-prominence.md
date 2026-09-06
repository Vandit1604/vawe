---
name: logo-prominence
when: placing a brand mark beside a headline, or on the end card
holds: eye (live hook scripts/live/craft-live.mjs on Claude Code; check by hand elsewhere)
answers: "the minimum logo size beside a title and on an end card, so it reads as an element, not punctuation"
group: look
---
# A logo beside a title is at least 100px; on the end card, at least 150px

A mark sized like a bullet next to a headline reads as punctuation, not as the brand. Give it deliberate
size: at least 100px beside a title, and at least 150px on the end card, where it is the last thing the
viewer sees.

| placement | minimum size |
|---|---|
| beside a headline | ≥100px |
| end card | ≥150px |

Right:
```json
{ "type": "image", "src": "assets/logo.svg", "w": 140, "h": 140 }
```

Wrong:
```json
{ "type": "image", "src": "assets/logo.svg", "w": 32, "h": 32 }
```
