---
when: "verifying a video after authoring it"
answers: "the author-then-verify ladder and the differentiation rules that keep brands distinct"
group: skill
---

# Author, then verify (non-negotiable ladder)

This runs the `check` -> `ship` -> `judge` -> `ledger` phases of the one spine in AGENTS.md.
`author-check`, `video`, `beats`, `reveal` and `ledger` below are the steps those phases run, not a
separate ladder.

`make check GATE=validate` -> `make video` -> `make check GATE=motion --data <file>` -> `make check GATE=audit M=<fmt>` (text AND
image contrast) -> **`make dev-tool X=beats D=<file> VS=<brand>`** (fidelity gate, stacks each beat beside its
source section; wrong dominance, off colours, untasteful imagery all show here, mandatory) ->
**`make dev-tool X=ledger D=<file>`** (cross-video sameness vs every shipped design, SAME fails; fix by changing
>=2 of cut family / beat structure / layout archetype) -> eyeball hook / payoff / CTA frames. Fix
data, re-render.

**Final taste check (the gate that SEES):** on the near-final cut, `make judge D=<file> VS=<brand>`
-> read `/tmp/judge/sheet.png` against `/tmp/judge/rubric.md` and score every frame (readability ·
hierarchy · composition · brand + asset fidelity · produced-not-generated · value).

A flaw your eye catches is a FIX, never a rationalization. This is the gate the static ladder above
structurally can't be: `engine-doctrine/JUDGE.md`. Once a video ships: `make dev-tool X=ledger-add D=<file>`
logs it to the design memory (`quality/ledger/ledger.json`) so future videos are checked against it.
<!-- doc-refs-allow: quality/ledger/ledger.json · gitignored, written on first `make dev-tool X=ledger-add` -->

## Differentiation rules (why outputs differ per user/brand)

- NO em-dashes in any on-screen copy (validator-enforced). Use a comma, period, or ·.
- Use the brand's REAL iconography and images wherever the site does: favicon, product UI captures,
  inline logos, semantic chips. A text-only video for an icon-rich brand fails the site study.
- Colors ONLY from the brand's theme pack; dominance decides light-first vs dark-first.
- Copy ONLY from the brand's own words (dna headings/tagline), polish, don't invent.
- Motion personality derived from the site study above; pacing from the brief.
- Same input -> byte-identical output; different brand -> visibly different video. Both are
  features. If two brands ever look alike, the site study was skipped, redo the study, not the JSON.
