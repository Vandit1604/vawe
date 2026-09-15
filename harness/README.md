---
when: writing or changing a per-film authoring tool (VO, captions, beat sync, assembly, critics) or
  a live PreToolUse hook
answers: "what harness/ is: the film-making tools, split into author/ (per-film scripts), dev/ (local dev tools), lib/ (shared helpers), live/ (hooks), media/ (VO/captions/asset wiring)"
group: engine
---

# harness/

Tools that read or shape ONE film's data, as opposed to `generators/` (bakes a standing asset every
film reuses) or `scripts/` (repo maintenance and gates). Five subfolders: `author/` (assemble, beats,
critics, storyboard, arsenal search, and their tests), `media/` (VO, captions, per-film asset wiring),
`dev/` (local dev-only tools like the no-em-dash check), `lib/` (shared helpers, e.g. finding-codes,
the render harness), `live/` (PreToolUse/PostToolUse hooks: `stage-gate.mjs`, `stage-say.mjs`,
`craft-live.mjs`, `arsenal-nudge.mjs`).

Read by: an authoring agent or human running a `make` target, and Claude Code itself for the `live/`
hooks.

The one doc: `AGENTS.md`, which names the relevant `harness/*` script beside each stage. Checked by:
whichever gate wraps the script (see `make list`).

Look first: `AGENTS.md`'s stage table to find which subfolder owns the step you're doing.
