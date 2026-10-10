---
id: entrance-origin
step: motion
principle: Motion explains: one entrance per beat, and it says where the thing came from (origin at its trigger, a wipe on the motion, a match on a shape). Vary the origin across elements.
limit: none
range: origins: from left, from right, from scale, opacity only, letter-spacing, from the trigger
break-when: never
instead: set transform-origin to the point the thing came from. Do not enter everything from one direction with translateY(30px) plus a fade.
check: judge, entrance-direction
judge: Name each entrance's direction or origin. Is every element an opacity fade?
prevents: doc banned-defaults: "everything fading in". A 28 s film shipped with a fade on nearly every one of 31 hand-written layers. feedback: "one element carries through".
status: active
scored: yes
numbers: {"same_direction_min":3}
print-motion: make each entrance a move with an origin, not everything fading in
craft: motion-craft
---

## Example

A popover scales from the button that opened it.

Why and sources: [motion-craft](../craft/motion-craft.md).

Draft check: The draft check counts a stagger as one entrance and fires on three or more entrances in a scene that all start from one side.
