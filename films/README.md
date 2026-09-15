---
when: finding, saving, or reading a scene JSON, or the per-video artifacts that go with it
answers: "what films/ holds: one 'module: scene' JSON per video plus its sidecar storyboard/design/brief files, under films/scene/"
group: process
---

# films/

Every film's own data: `films/scene/<topic>.json` is the self-describing scene the renderer reads, and
each carries per-video sidecars beside it: `.storyboard.md`, `.design.md`, `.brief.md`, `.lock.md`,
`.treatment.md`, `.prompt.md`. These are per-film artifacts, not doctrine, and are excluded from the
doc index for that reason.

Read by: the renderer (the `.json`), and the stage gates that track a film's progress through the eight
authoring stages.

The one doc: `AGENTS.md`, the eight-stages table. Checked by: `make stage D=<film>` (which stage a film
is in) and `harness/live/stage-gate.mjs` (refuses an out-of-order transition).

Look first: `films/llms.txt` for the scene-format primer, then `films/scene/` for an existing film to
read before writing a new one.
