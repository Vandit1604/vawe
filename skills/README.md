---
when: adding a new Claude Code skill, or looking for which skill covers a step in authoring
answers: "what skills/ is: one folder per authored Claude Code skill (vawe-brief, vawe-page, vawe-critique, vawe-reference) plus the vendored impeccable, each a SKILL.md loaded on demand"
group: reference
---

# skills/

One folder per skill, each holding a `SKILL.md` that Claude Code loads on demand by its `description`
frontmatter. A tool without the skill mechanism reads the same file by path.

| skill | load it when |
|---|---|
| `vawe-brief` | a person asks for a film and no `brief.md` exists |
| `vawe-page` | you write or edit a `page.html` |
| `vawe-critique` | a draft is rendered and needs a fresh, default-reject look |
| `vawe-reference` | a reference mp4 must be matched |
| `impeccable/` | vendored; product UI craft, not film work |

A skill nothing routes to is never loaded: `bin/vawe check skill-reach` fails on it. Route a new skill
from `AGENTS.md` or another skill.
