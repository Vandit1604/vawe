---
when: writing or changing repo maintenance tooling: a gate driver, a capture tool for one film, a
  brand-reflection script, a git hook
answers: "what scripts/ is: repo maintenance and gates, split into brand/ (site reflection: palette, sections, lookbook), hooks/ (git hook library), site/ (docs/marketing-site build helpers)"
group: process
---

# scripts/

Repo maintenance, distinct from `generators/` (bakes standing assets) and `harness/` (per-film
authoring tools and live hooks). `brand/` holds the site-reflection pipeline (`sections.mjs`,
`palette.mjs`, `house-style.mjs`, `lookbook.mjs`, `theme-remix.mjs`) that `make sections`/`make
palette` call. `hooks/` is the git-hook library (`library.mjs`). `site/` builds artifacts the
marketing/docs site consumes (`arsenal-json.mjs`, `blocks-catalog.mjs`, `motion-numbers-catalog.mjs`,
`rules-build.mjs`).

Read by: `make` targets that shell out to a `scripts/*` file, and git itself for `hooks/`.

The one doc: none single; `AGENTS.md` names `make sections`/`make palette` for the brand-reflection
path. Checked by: whichever `make` target wraps the script.

Look first: `scripts/brand/` if reflecting a website, `scripts/site/` if changing a generated doc or
catalog the site consumes.
