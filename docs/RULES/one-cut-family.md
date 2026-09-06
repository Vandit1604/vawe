---
name: one-cut-family
when: choosing the cut between two beats
holds: warns (make direct / make critique, cut-families; 3+ families fails, TASTE=1 blocks)
answers: "why a film keeps one transition family and earns only 2-3 accents by meaning"
group: story
---
# One transition family per film; earn 2-3 accents by meaning

A film that mixes wipes, dissolves, whip pans, and hard cuts with no reason reads as indecisive. Pick
one family (a hard cut is a valid family) and use it for most seams; reserve 2-3 accent transitions for
seams that carry real meaning, a tone flip, a time jump, and be able to say which meaning each one
serves. `make direct`/`make critique` fail at 3 or more families in one film.

| parameter | value |
|---|---|
| transition families per film | 1, plus 2-3 named accents |
| a seam serving neither continuity nor contrast | a hard cut, not an invented wipe |

Right:
```json
{ "cuts": [{ "at": "beat:1", "type": "hard" }, { "at": "beat:2", "type": "hard" }, { "at": "beat:3", "type": "whip", "why": "the tone flips from problem to product" }] }
```

Wrong:
```json
{ "cuts": [{ "at": "beat:1", "type": "wipe" }, { "at": "beat:2", "type": "dissolve" }, { "at": "beat:3", "type": "whip" }] }
```
