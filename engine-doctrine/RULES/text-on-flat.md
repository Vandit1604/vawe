---
name: text-on-flat
when: placing a headline over a background fx, a blob, or a gradient
holds: gated (make check GATE=audit, contrast; HARD fail per engine-doctrine/CRAFT/COLOR.md)
answers: "why a headline must sit on a flat patch, not a moving blob or gradient hot spot, and the 3:1 floor it is measured against"
group: look
---
# A headline sits on a flat patch, never a blob or a gradient hot spot

`make check GATE=audit` measures contrast on the COMPOSITED pixels, at the exact frame the text holds, not on the
declared colours. A blob or a gradient drifts under the headline for its whole hold, so a patch that
passed at frame one can fail by frame thirty. Keep drifting background elements off any text during its
hold, or park the text over a flat, un-animated part of the field.

| parameter | value |
|---|---|
| large text (≥24px, or ≥18.7px bold) | 3:1 minimum |
| body text | 4.5:1 minimum |
| where it is measured | composited pixels, across the text's whole hold |
| a 150px headline under 3:1 | fails `make check GATE=audit` (HARD) |

Right:
```json
{ "bg": { "preset": "softwash" } },
{ "type": "text", "text": "Ship faster", "x": 200, "y": 860, "color": "#fff" }
```

Wrong:
```json
{ "bg": { "fx": "blobs", "motion": "drift" } },
{ "type": "text", "text": "Ship faster", "x": 200, "y": 860, "color": "#fff" }
```
