---
when: "starting a new film from a proven worked scene, or adding a frozen gold example"
answers: "which frozen examples exist under films/examples, what each one demonstrates, and how make dev-tool X=new copies one"
group: process
---

# films/examples: frozen gold examples

Tracked, worked scenes that pass every brief-conformance claim (`node harness/dev/conform.mjs`) and
`node harness/dev/verify.mjs` clean. Not a scratch film: `films/scene/*.json` is gitignored and is
where new work happens; a file here is a starting point other films copy from
(`make dev-tool X=new TYPE=<name> NAME=<film>`). Every piece of copy and brand word lives in the
scene's own `content` map (`{{key}}` placeholders in the layers), so starting a new film from one of
these means editing `content`, not the layers.

- `sting.json`: a 5s vawe-brand logo sting. Demonstrates typing (kinetic `type` preset), a punctuation
  fly-off on real `motionPath` arcs with `autoOrient`, an axis weight ramp (kinetic `weight` preset),
  an SVG trim draw-on (`draw`), an idle `drift` standing in for a hand-keyed wiggle, and a scene-level
  `rise` cut for the upward exit onto a clean solid-accent end frame.


