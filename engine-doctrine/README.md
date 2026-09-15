---
when: you cannot find the doctrine you need from AGENTS.md's routing table alone
answers: "what engine-doctrine/ is: the ~120-file doctrine corpus (craft rules, mistakes log, codemaps, rules index), indexed not memorised"
group: reference
---

# engine-doctrine/

The doctrine corpus: craft rules (`CRAFT/`), the enforced-vocabulary rulebook (`RULES/`), the mistake
log and bug records (`BUGS/`, design notes under `DESIGN-NOTES/`), system maps (`CODEMAPS/`), and
research notes (`RESEARCH/`), plus top-level references like `EFFECTS.md` and `TASTE.md`.

Read by: a human or agent authoring or judging a film, routed here from `AGENTS.md` rather than by
browsing; `media/` and `design/` also feed generated views.

The one doc: `engine-doctrine/INDEX.md`, the generated repo-wide map (every file carries its own
`when`/`answers`/`group` frontmatter, which is what generates it). Checked by: `make doc-index`
(regenerates the index) and `make craft-coverage` (keeps it honest).

Look first: `engine-doctrine/INDEX.md`.
