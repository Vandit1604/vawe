---
when: checking whether a claim about how reference films move is actually supported by evidence
answers: "what grammar/ is: mined motion data from real reference films, and the claims tested against it"
group: reference
---

# grammar/

Data mined from real reference films (`_mined-shapes.json`, `_patterns.json`, `_gaps.json`), the
doctrine claims tested against that data (`_claims.json`), and per-reference recipe sources
(`example-madera.json` and its `.prompt.md`, `arc-*.json`, `framer-hero.json`, `ours-*.json`,
`make-it-move.json`). This is where `recipes/` gets its measured defaults from.

Read by: `harness/author/claims.mjs` (evaluates `_claims.json`) and anyone mining a new reference into
a `recipes/` entry.

The one doc: the `_` field at the top of `grammar/_claims.json`, which explains the claim format.
Checked by: `make claims`.

Look first: `grammar/_claims.json` for the claim format, `grammar/example-madera.json` for a worked
mined reference.
