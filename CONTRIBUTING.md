---
when: you want to change this repo rather than use it
answers: the licence you are contributing under, how to run the suite, and the four things this repo pushes back on
group: project
---

# Contributing to Vawe

Thanks for looking. This file is short because the repo explains itself: `AGENTS.md` is the authoring
doctrine (tool-neutral; `CLAUDE.md` is a shim that loads it), `engine-doctrine/INDEX.md` maps every other document, and `engine-doctrine/MISTAKES.md` is the log of what has
already gone wrong and why the guard exists.

## Licence, first, so nobody wastes an afternoon

Vawe is licensed under the **Apache License 2.0**. Use it, change it, ship it, commercially or not:
keep the notices, and the patent grant comes with it. `LICENSE` is the full text and `NOTICE` carries
the third-party attribution a redistribution must keep. Contributions are accepted under the same
licence.

## Getting it running

```bash
npm install
make build          # fetches the free fonts, then builds bin/vawe
./bin/vawe films/scene/sample.json      # → out/sample.mp4
```

If a font is missing the engine refuses to render and names the fix. That is deliberate: a browser
paints a fallback face silently, so an unchecked family renders a plausible frame in the wrong
typeface.

## The one rule that explains most of the codebase

**`renderFrame(n)` is a pure function of `n`.** The same frame number must produce the same pixels
regardless of what was rendered before it, because frames are captured across six parallel workers.
Anything that breaks that is a bug even if it looks right. `make probe` and
`node quality/gates/probe-purity.mjs scene` check it.

## Before you open a PR

```bash
make test                              # the whole test suite (tests/**/*.test.mjs + go test)
node core/validate/validate.mjs                 # every scene still validates
node quality/gates/code-quality.mjs    # nothing got more tangled
```

The last one is a **ratchet, not a threshold**. The repo has known complexity debt recorded in
`quality/baselines/code-quality-baseline.json`; the gate fails only if your change makes a file worse than that
line. Fixing something and running `make check GATE=code-quality WRITE=1` lowers the line permanently.

If you touch a **gate**, run it over the whole scene library before and after and diff the results. The
only acceptable outcomes are "no scene changed" or "these N changed, and here is why each was a false
positive". One scene going from pass to fail is a regression until proven otherwise. This rule exists
because a gate that measures the wrong thing does not merely miss defects, it manufactures them, and
the author pays by deforming good work until a number moves.

## Things this repo will push back on

- **A new gate.** Fix it at the write site if you can. A gate is for what is only knowable after a
  render, across the whole library, or by a human. `AGENTS.md` has the full test, and two gates have
  been deleted here for measuring the wrong thing.
- **A second way to say something the code can already say.** Two mechanisms for one fact is the drift
  that produces most of the bugs in `engine-doctrine/MISTAKES.md`.
- **Sugar that silently does nothing.** An input the engine accepts and then ignores must either work
  or fail loudly by name.
- **Em dashes in on-screen text.** The validator rejects them.

## Assets

Never commit a font, photo or brand mark without a licence and a source. `NOTICE` records every
one, and photos are fetched on demand rather than committed. No recreation of another company's
marketing page ships from here, in any form.

## Reporting something

Open an issue with the scene JSON that reproduces it, or the exact command and its output. If you
believe an asset is misattributed, say so and it will be removed.
