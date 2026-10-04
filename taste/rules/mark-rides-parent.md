---
id: mark-rides-parent
step: finish
principle: Every mark rides the thing it belongs to. A mark that sits still while its parent moves, or points at nothing, is a stray.
limit: none
range: none
break-when: never
instead: tie the mark to the thing that moves, or delete it the moment it points at nothing.
check: judge
judge: For any small mark: name its parent and confirm it moves with it.
prevents: feedback: "The blue dot is stationary." judge2: still dot 1.0 to 1.6 s, stray dot at 4.6 s (anti-pattern C).
status: active
scored: yes
numbers: {}
print-preship: let every mark ride its parent, not a mark that points at nothing
craft: failure-modes
---

## Example

The dot sits on the arch's sweep and moves with it.

Why and sources: [failure-modes](../craft/failure-modes.md).
