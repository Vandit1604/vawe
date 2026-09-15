---
name: logo-prominence
when: placing a brand mark beside a headline, or on the end card
holds: eye (live hook harness/live/craft-live.mjs on Claude Code; check by hand elsewhere)
answers: "why a mark must read as the brand, not as punctuation, beside a title and on the end card"
group: look
---
# A mark reads as the brand, next to the title and on the end card

A mark sized like a bullet next to a headline reads as punctuation, not as the brand. Give it
deliberate prominence: it must read clearly next to the title, and it is the last thing the viewer
sees on the end card, so it earns real weight there too.

| placement | what it must do |
|---|---|
| beside a headline | read as the brand, not a bullet |
| end card | carry the frame alone, the last thing the viewer sees |

Right:
```json
{ "type": "image", "src": "assets/logo.svg", "w": 140, "h": 140 }
```

Wrong:
```json
{ "type": "image", "src": "assets/logo.svg", "w": 32, "h": 32 }
```
