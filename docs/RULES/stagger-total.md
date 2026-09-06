---
name: stagger-total
when: a group of items arrives with a stagger
holds: warns (make direct, stagger-total finding; docs/MOTION-CRAFT.md "Arrival rhythm")
answers: "the cap on a staggered group's total arrival time, and why past it the last item lands in a different beat"
group: look
---
# A staggered group's total arrival stays at or under 0.5 seconds

A stagger's total run is `(units - 1) x stagger`. Past 0.5s the last unit lands in a different beat
from the first, so the group stops reading as one arrival and starts reading as a slow trickle. Use the
`{amount}` form of `stagger` so the delay derives from the unit count instead of a fixed per-unit value
that breaks on a long list.

| parameter | value |
|---|---|
| total = `(units - 1) x stagger` | cap 0.5s |
| 8 items at 0.10s each | 0.7s: OVER the cap |
| fix | `"stagger": {"amount": 0.5}` derives the per-unit delay |

Right:
```json
{ "type": "text", "text": "eight bullets", "stagger": { "amount": 0.5, "from": "first" } }
```

Wrong:
```json
{ "type": "text", "text": "eight bullets", "stagger": 0.1 }
```
