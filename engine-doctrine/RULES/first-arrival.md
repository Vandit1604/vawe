---
name: first-arrival
when: a layer's first entrance in a beat
holds: eye (no gate checks a zero-delay first arrival)
answers: "why nothing should arrive at t=0, and the offset that fixes it"
group: look
---
# Nothing arrives at t=0

A layer whose entrance starts the instant its beat starts reads as a jump cut, because the viewer has
had no time to register the beat before something moves in it. Offset the first entrance by 0.1 to
0.3 seconds so the beat itself registers first.

| parameter | value |
|---|---|
| first entrance delay | 0.1 - 0.3s |
| zero delay | reads as a jump cut |

Right:
```json
{ "id": "headline", "start": 0.2, "anim": "rise" }
```

Wrong:
```json
{ "id": "headline", "start": 0, "anim": "rise" }
```
