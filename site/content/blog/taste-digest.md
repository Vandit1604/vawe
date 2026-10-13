---
title: "AGENTS.md at 2,239 words: one digest instead of 98 rules"
description: "Our weaker agents skipped long taste docs. We cut AGENTS.md reading to 2,239 words with a one-page digest, then watched the number creep back to 4,602."
date: 2026-10-05
section: taste
tags: "agents.md, agent instructions, context budget, taste rules, read-load"
keywords: "AGENTS.md, agent instructions length, ai agent context budget, taste rules for agents, read-load ratchet"
hero: /blog/taste-digest/hero.svg
heroAlt: "Large number 2,239 with the caption words an author reads, after the one-page digest, down from 2,654"
---

On 1 October we cut what a vawe author reads before it writes a film from 2,654 words to 2,239. The cut came from moving our AGENTS.md pitfalls into one page, the taste digest. Four days later we had 98 rule files behind that page, and the digest, about 400 words long today, was still the only list an author has to read. The rest of this post is why we did it, what the number did afterwards (it did not stay down), and the format we use for a rule that an agent has to obey.

## The problem: AGENTS.md rules that do not fire

Our taste rules lived in long documents. They were accurate and nobody read them. Evidence from one weaker-model film sits in the commit message of `4246a6a53`: the film named its brand Vesper and drew a banded disc, although the taste card lists both as attractors (the things a model reaches for by default). It skipped the stills judge. It read advice lines as blocking errors. And the judge flipped its own advice between rounds.

In each case the rule existed and the agent did not meet it at the moment it needed it.

## What we tried

Our first move was to print the rules at the step where they matter. On 30 September `dev` and `ship --status` started printing 5 to 8 "do X, not Y" lines for their own step (concept, motion, sound, before the verdict). Each line quotes its row in the taste card, and a test fails when a quote leaves the card, so the copy cannot drift (`dc36222cf`). We checked the cost of printing: a draft render of a 4 s starter took 4.3 s wall clock, unchanged.

The second move was to fix how advice reads. A weaker model took every line as blocking, so every advice line now starts with `advice:` and a block that stops starts with `error:` (`4246a6a53`). We also added an attractor check that names the cliche hero shapes and the light-poetry brand names in a brand name and in each direction.

The third move was to delete reading. On 1 October the pitfalls from AGENTS.md and the page-writing skill went into one list in the taste digest, and both documents got shorter (`aefdda74e`). The same day's token diet added a compact moves index and shorter judge and ship output (`457d87145`).

## What we built: one folder, one rule per file

On 5 October the rules got an owner. `taste/rules/` holds one file per rule, 98 of them at that commit. Each file carries the same fields: an id, the step it applies at, a principle, a limit, the measured range, when it may be broken, what to do instead, the check that enforces it, a judge question, and what it prevents. A generator, `harness/dev/taste-build.mjs`, writes everything else: the card, the digest, `steps.json` and `limits.json`. The old card, the old digests and the guides moved to `taste/craft` with their numbers replaced by links to rule ids, and ten conflicts between the old files were resolved (`e09a5f569`).

This is the exits rule, shortened:

```
id: exits-shorter
step: motion
principle: An exit is a launch: it runs shorter than its entrance and accelerates.
limit: an exit shorter than its entrance
range: exit 0.35 to 0.6 of the entrance duration
break-when: the exit is a settle or a hand-off and the page says so
instead: exit on EASE.launch with leave(el) from core/motion/presets.js
check: exit-length
digest: Exits are faster than entrances: shorter, on EASE.launch.
```

The digest line is the only text an author has to hold in its head. The rest is there when a check fires and prints the rule behind it. Twelve draft checks read the page from the DOM, and each cites its taste rule and the number from `limits.json` (`378aeea9f`). The [loophole audit](/blog/loophole-audit) later found 21 of 107 rules with no check at all.

## The measured result, and what went wrong

The read-load is a number a bench script computes: the words in the root pointer file, AGENTS.md, the taste digest, the page-writing skill and the starter page that `vawe new` writes. A ratchet file stores the last stamp, and the bench warns when the number grows. We re-stamp it by hand in a commit, so every increase is a decision.

<figure>
<img src="/blog/taste-digest/read-load.svg" alt="Bar chart of the read-load stamp: 2,654 words before the diet, 2,239 after, then 2,768, 3,420, 3,947, 4,444 and 4,602 by 11 October" width="720" height="400" loading="lazy">
<figcaption>The stamp in <code>bench-ratchet.json</code> at each re-stamp commit. The diet is the second bar.</figcaption>
</figure>

The diet worked: 2,654 words and about 3,530 tokens became 2,239 words and 2,978 tokens (`aefdda74e`). Then we kept building. The process phases for the brief, the skill ladder, the lens and `vawe see` verbs, the transitions skill and the idea method each added reading, and each was followed by a re-stamp of the ratchet. By 11 October the stamp was 4,602 words, more than double the low point.

We think that is the honest shape of the work. A ratchet cannot stop growth. It makes growth visible, and it makes a person pay for a new rule in public. A fix we have not made yet is to move new reading out of the always-read set and into the step that needs it.

We also do not have the number we would like most. A trace review of six weaker-model films on 10 October found a median of 13 drafts, a median first judged total of 45 and none of the six passing the judge. That measures the whole harness on that day. It is not a digest-only before and after, and we cannot say how much of any change belongs to the digest.

## What we would tell someone building the same thing

Put each rule where it fires. A rule that prints at the step where it applies gets read. The same rule in a long document does not.

Give the agent one list and make everything else generated. Hand-editing a digest and a card and a README guarantees they disagree. Our ten conflicts between old files were the proof.

Make the advice tone machine-readable. A weaker model reads a polite suggestion as a requirement unless the line says `advice:`.

Measure the read-load and ratchet it, and expect it to grow anyway. Read [the weaker-model harness post](/blog/weaker-model) for the other half: what we ran next to the stronger model each round. For how we judge the films the digest produces, see [the judge design](/blog/judge-design).

## In the code

- `taste/rules/`: one file per rule, plus `taste/README.md`
- `taste/build/DIGEST.md`: the generated list authors read
- `harness/dev/taste-build.mjs`: the generator
- `harness/dev/bench.mjs` and `quality/baselines/bench-ratchet.json`: the read-load ratchet
- [`e09a5f569`](https://github.com/Vandit1604/vawe/commit/e09a5f569): one folder, one rule per file, everything else generated
- [`aefdda74e`](https://github.com/Vandit1604/vawe/commit/aefdda74e): the pitfalls diet, read-load 2,239 words
- [`4246a6a53`](https://github.com/Vandit1604/vawe/commit/4246a6a53): advice that a weaker model reads right, and the attractor check
- [`dc36222cf`](https://github.com/Vandit1604/vawe/commit/dc36222cf): each step prints its own rules

The repo is [Vandit1604/vawe](https://github.com/Vandit1604/vawe). The agent docs live under [/ai-agents](/ai-agents).
