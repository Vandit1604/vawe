---
id: seam-variety
step: transitions
principle: Each moving seam changes axis or direction from the previous moving seam, and the same moving seam never appears twice. A hard cut is exempt.
limit: no full-frame transition move twice in a row
range: moving seams: wipes, pushes, whips, zooms; rotate inside one family (soft, motion, shape, spatial)
break-when: never
instead: change the axis or direction (a wipe on x after a push on y), or cut.
check: seam-repeat
judge: Compare the last frame before and the first frame after each moving seam: direction and axis.
prevents: feedback vawe-flow-2: "Monotonous." doc banned-defaults, TRANSITIONS and MOTION-CRAFT: adjacent transitions that both push left read as a stutter; the same seam move twice reads as a template, even in another direction.
status: active
scored: yes
numbers: {}
print-motion: change axis or direction at every moving seam, not the same seam move twice
digest: Each moving seam changes axis or direction; a hard cut is exempt.
craft: transitions
---

## Example

Push up, then wipe left, then zoom in.

Why and sources: [transitions](../craft/transitions.md).
