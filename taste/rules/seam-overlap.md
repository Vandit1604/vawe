---
id: seam-overlap
step: transitions
principle: The outgoing beat ends at the seam and the incoming beat starts at it. The frame never goes empty across a joint.
limit: none
range: a persistent morph element is the exception and spans the cut
break-when: a morph element spans the cut
instead: a blend that mixes the frame before and the frame after turns copy into an unreadable double: end the outgoing text at the seam. A full-bleed layer above a moving layer must not start mid-move and hide it: start the cover after the move ends, or raise the mover.
check: judge
judge: At each seam, is old and new copy on screen together, or is the frame empty?
prevents: doc TRANSITIONS: a one-frame luminance dip is a flash; several frames of emptiness mean the outgoing beat left before the incoming one arrived.
status: active
scored: no
numbers: {}
craft: transitions
---

## Example

The outgoing line exits 0.1 s before the cut; the next line enters at the cut.

Why and sources: [transitions](../craft/transitions.md).
