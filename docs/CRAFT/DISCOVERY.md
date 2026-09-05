---
when: you are about to author and want to reach past the default slice into the full vocabulary
answers: "how to use the whole palette (24 layer types, 693 effects, 56 families, blueprints, cuts): the always-visible primer, the search, the gap report, and the name-three-reject-the-first discipline; and why the search stays token-overlap, not embeddings"
group: crosscutting
---

# DISCOVERY: use the whole vocabulary, not the slice you remember

## AGENT SUMMARY

- The vocabulary is far larger than any one author reaches for: 24 layer types, 693 effects across 56
  families, blueprints, cuts/seams/stings, camera, kinetic type. The failure is not missing capability, it
  is defaulting to a thin slice (rise+fade, text on a flat field). Reach wider on purpose.
- Four moves, cheapest first: (1) read `formats/llms.txt`, the always-visible primer (one when-to-use line
  per layer type + the families); (2) `make arsenal Q="<plain english>"` to search all 778 named things;
  (3) `make arsenal --for <scene>` to see the families this film has NOT reached for; (4) the discipline
  below.
- Enforced by: `feature-poverty` (blocks a film that reaches into too few families) and, after render,
  `sweep-static` / `make judge` (the pixels must actually move).

## The discipline: name three, reject the first

Mode collapse is real: a post-trained model returns its one safe default unless asked to diverge. The
[pitch round](PITCH.md) applies this to the whole film's CONCEPT. Apply the same move to every BEAT's
technique choice: before you write a beat's motion, its layer, its transition, name THREE ways it could be
done, and reject the first (it is the median). "How could this beat SHOW its claim: a `component` capture,
a `board` of the real data, a `count` that ticks, a hand-keyed reveal?" The first answer is rise+fade; the
third is usually the film. This is the engine's own continuity rule ("name three ways this film could hold
its subject, and reject the first one") generalized from structure to vocabulary.

## Why the search stays token-overlap (a decision, with evidence)

`make arsenal` ranks by token overlap over name + kind + blurb, not embeddings. That is deliberate and it
stays: no controlled study found shows semantic/embedding retrieval beating keyword retrieval for
capability search (the one comparison that exists pits semantic against hierarchical discovery, where
semantic wins only on simple single-shot lookups and loses on complex ones). Swapping in embeddings would
add a model dependency, a build step, and drift, for no measured gain. The evidenced wins are cheaper and
already in place: an always-visible index (the registry's mandatory blurbs, surfaced by `llms.txt`), a
search that becomes the rational move because the full surface is not preloaded (`make arsenal`), and a
gap report at author time (`--for`). See Anthropic's tool-search work (deferred tools, ~85% token
reduction) and the llms.txt convention for the pattern this mirrors.

## Provenance

Sources: Anthropic advanced tool use (deferred / searchable tools), llmstxt.org (progressive disclosure),
verbalized-sampling / mode-collapse research (name multiple candidates to escape the default), and a
tool-discovery cost study (hierarchical vs semantic). Captured in `.claude/notes/repo-learnings.md`. Do not
re-add: an embedding rewrite of `make arsenal`, unless a measured win on `lib-test`'s labeled query sets
justifies it.
