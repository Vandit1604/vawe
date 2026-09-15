---
name: video-scale
when: sizing a hero graphic or any on-screen type
holds: engine-doctrine/CRAFT/LAYOUT.md and engine-doctrine/CRAFT/TYPOGRAPHY.md
answers: "the hero-ink width band and the type scale a video needs, against the web sizes an agent defaults to"
group: look
---
# Size for video, not for the web

A web-sized element is invisible at video scale. Hero art fills 60-80% of frame width: the library
measures a 40.4% median on landscape, with 82.9% of sampled frames under the 60% floor. Type follows
the same rule: a headline under 84px at a 1920px canvas reads as a caption, not a headline.

| element | size at 1920px canvas |
|---|---|
| hero art width | 60-80% of frame width |
| headline | ≥84px |
| support text | ~44px |
| labels | ~32px |
| a 62px "headline" | web scale, not video scale |

Right:
```json
{ "type": "text", "text": "Ship faster", "fontSize": 96, "w": 1400 }
```

Wrong:
```json
{ "type": "text", "text": "Ship faster", "fontSize": 62, "w": 600 }
```
