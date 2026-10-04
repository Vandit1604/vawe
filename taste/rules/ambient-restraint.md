---
id: ambient-restraint
step: motion
principle: Ambient motion keeps a held frame alive without asking to be watched. It is the smallest of the three motion levels and never near text being read.
limit: none
range: a different ambient per scene (slow pan, subtle rotation, scale push, colour shift) or none; fields at about 0.3 intensity; one overlay per film (VHS, CRT, film grain, light leak) at 0.6 to 0.9, never behind small body copy, never two together
break-when: never
instead: do not put an ambient zoom on every scene. Do not loop anything near text being read. Ambient padding to look busy raises global motion and costs the film.
check: judge
judge: Is the same ambient on every scene, or does anything loop near text?
prevents: doc TASTE-RULES: cheap aliveness near text being read; MOTION-CRAFT: ambient padding to look busy.
status: active
scored: no
numbers: {}
craft: failure-modes
---

## Example

Scene 1 a slow pan, scene 2 a colour shift, scene 3 none.

Why and sources: [failure-modes](../craft/failure-modes.md).
