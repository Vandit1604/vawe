---
name: speed-bands
when: choosing a duration for an entrance, an exit, or a keyed move
holds: warns (make direct, tempo-flat / motion-monotony findings; docs/MOTION-CRAFT.md Rule 1)
answers: "the four named speed bands, the 3x rule between the slowest and fastest beat, and why no two independent layers share an ease in one beat"
group: look
---
# Pick a named speed band; the slowest beat is at least 3x the fastest

Duration is a voice, not a constant. Four bands cover the range a film speaks in, and a film that uses
only one band reads as monotone narration. The slowest beat in a film must run at least 3x the fastest
beat's duration, and no two layers moving independently in the same beat share one ease curve.

| band | duration |
|---|---|
| energy | 0.15 - 0.3s |
| professional | 0.3 - 0.5s |
| gravity | 0.5 - 0.8s |
| cinematic | 0.8 - 2.0s |
| slowest beat vs fastest beat | at least 3x |

Right:
```json
{ "beats": [
  { "id": "hook", "layers": [{ "id": "a", "enterDur": 0.25 }] },
  { "id": "reveal", "layers": [{ "id": "b", "enterDur": 1.0 }] }
] }
```

Wrong:
```json
{ "beats": [
  { "id": "hook", "layers": [{ "id": "a", "enterDur": 0.45 }] },
  { "id": "reveal", "layers": [{ "id": "b", "enterDur": 0.45 }] }
] }
```
