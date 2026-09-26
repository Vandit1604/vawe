---
when: adding a new Claude Code skill, or looking for which skill covers a step in authoring
answers: "what skills/ is: one folder per vendored/authored Claude Code skill, each a SKILL.md loaded on demand"
group: reference
---

# skills/

One subfolder per Claude Code skill (`vawe-scene-authoring/`, `vawe-video-planning/`, the `vawe-type-*`
playbooks, `vawe-name-the-effect/`, `vawe-creative/`, plus the vendored `impeccable/`), each holding a
`SKILL.md` Claude Code loads on demand by its `description` frontmatter. Every other tool (a human, or
an agent without the Skill mechanism) reads the doc named in `AGENTS.md`'s skill-router table instead.

Read by: Claude Code, on demand, matched against the request.

The one doc: `AGENTS.md`'s skill-router table. Which DOC settles a question is `make site X=docs Q="…"` (the generated doc map
as a skill). Checked by: `make check GATE=skill-reach` (is every `SKILL.md` actually routed to from somewhere).

Look first: `AGENTS.md`'s skill-router table to find the right skill by task, not this folder directly.
