---
name: caption-safe-strip
when: shipping to a phone feed (tiktok/reels/shorts) or captioning any video
holds: gated (make audit ASPECT=all; overlap/clipped-text/safe checks read core/layout/safe.js DESTINATIONS)
answers: "the per-destination safe strip a caption or a bottom-anchored headline must clear"
group: density
---
# Set destination, and keep captions inside its safe strip

The safe area is not a property of the aspect ratio, it is a property of where the video ships: a phone
feed paints chrome over the frame, a website does not. Set `"destination"` and the audit checks
placement against that platform's real strip, not the canvas alone. The caption band itself reserves
two lines at the bottom (`CAPTION_LINES = 2` in `core/layout/safe.js`), so a headline placed near the bottom
edge can collide with it even when the caption looks empty in your draft.

| destination | safe strip (right / top / bottom) |
|---|---|
| `tiktok` | 16.7% / 12.5% / 30.2% |
| `reels` | 14% / 10% / 22% |
| `shorts` | 13% / 8% / 16% |
| `broadcast` | 5% every edge |
| `web` (default) | margin only |

Right:
```json
{ "destination": "tiktok", "captions": { "position": "bottom" } }
```

Wrong:
```json
{ "captions": { "position": "bottom" } }
```
