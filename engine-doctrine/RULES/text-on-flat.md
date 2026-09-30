---
name: text-on-flat
when: placing a headline over a background fx, a blob, or a gradient
holds: reports (`bin/vawe check page-check`, finding `text-low-contrast`)
answers: "why a headline must sit on a flat patch, not a moving blob or gradient hot spot, and the contrast floor"
group: look
---
# A headline sits on a flat patch, never a blob or a gradient hot spot

`page-check` measures contrast on the rendered pixels at the frames where the text holds, not on the
declared colours. A blob or gradient drifts under the headline for its whole hold, so a patch that
passed at frame one can fail by frame thirty. Keep drifting background elements off any text during
its hold, or park the text over a flat, un-animated part of the field.

| text | minimum contrast |
|---|---|
| large (24 px and up, or 18.7 px bold) | 3:1 |
| body | 4.5:1 |
