---
title: "Data over rules: pruning AGENTS.md with measurements"
description: "Our own rulebook was the first thing the data told us to cut. AGENTS.md rules over 500 characters fell from 324 to 42, while the docs agents read still doubled."
date: 2026-10-10
section: measurement
tags: "agents.md, agent rules, ratchet, documentation, harness"
keywords: "AGENTS.md rules, ai agent rules, agent instructions, rule ratchet, ai agent harness"
hero: /blog/data-over-rules/hero.svg
heroAlt: "Two bar charts. Words an agent reads before starting rose from 2,239 on October 1 to 4,602 on October 11. The count of rules over 500 characters fell from 324 to 42."
---

Our own rulebook was the first thing the data told us to cut. One line in our docs said "keep one thing moving (a slow drift on the ground or the hero)". Agents followed it. A grep of 36 films found that 18 of them carried a slow push or drift on the camera or ground. The rule did what it said, everywhere.

This is a post about AGENTS.md rules, and about what happens when you let measurements change them. The short version: we adopted a working rule, cite the measurement when you change a rule, and it forced us to delete more than we added. It did not make the docs shorter overall, and we will show that number too.

## The problem: rules in prose drift from the evidence

An agent reads a rule literally and applies it to everything. A rule written for one case becomes a house style. Our loophole audit ([the agent kept cheating our checks](/blog/loophole-audit)) found that the advice lines for several checks named the trick that turns them green. "Keep one thing moving" is the example. A check counted any motion on a hold, the advice said "a slow drift", and the agents drifted the camera on every hold.

Nobody decided that. It accumulated. Each rule made sense on the day it was written, and no rule had a date by which it had to prove itself.

## The working rule for AGENTS.md changes

We wrote one rule about rules: when you change a rule, cite the measurement. That includes adding a hard gate, which the rule allows as long as the number says it helps.

Then we used it. These are the changes with commits:

- **Ban synth beds.** We removed the bed, swell-soft and braam voices, the synth-bed module and `data-bpm`. A page that writes `data-synth="bed"` is refused with the rule and the fix ([f68dc7df2](https://github.com/Vandit1604/vawe/commit/f68dc7df2)). The audit had counted synth beds in 4 of 24 audio films.
- **Remove "drift as the hold" from the docs.** After-effects techniques lost the moving-hold scale drift. The recipe chains now close on a still hold with a moving part. The Ken Burns push on a still picture and the `drift-hold` rows in two docs-site tables were removed ([e781b8484](https://github.com/Vandit1604/vawe/commit/e781b8484)).
- **Merge duplicate rules.** `live-hold` absorbed `no-dead-stop` and `ambient-restraint`. `speed-bands` absorbed `speed-ceiling`. `gradient-grain` absorbed `gradient-or-flat`. The `dead-stop` and `speed-ceiling` check ids stay ([a1fc2af16](https://github.com/Vandit1604/vawe/commit/a1fc2af16)).
- **One pitfalls list.** The taste digest became the single list, and AGENTS.md and the page-writing skill got shorter ([62c6e0c11](https://github.com/Vandit1604/vawe/commit/62c6e0c11)).

A rule change in a doc has to reach the check too, or the two disagree. So tests assert they agree. One test checks that `text-lingers`, `readable-hold` and the world limit give the same answer for lines of 1, 4 and 8 words (`tests/lib/bar-lint.test.mjs`).

## The measured result

Two ratchets track the effect. Each is a file under `quality/baselines/` that stores a number. The rule-length gate complains when its count goes up, and a doc change re-stamps the read-load number on purpose.

The rule-length ratchet counts rules over 500 characters in the agent-facing docs. Its stamp fell from 324 to 42 in one commit ([93b9f8c14](https://github.com/Vandit1604/vawe/commit/93b9f8c14)).

The read-load ratchet counts the words an agent reads before it starts. It went the other way:

![Words an agent reads before starting: 2,239 on Oct 1, 2,714 on Oct 5, 3,215 on Oct 7, 3,947 on Oct 9, 4,450 on Oct 10, 4,602 on Oct 11. Rules over 500 characters: 324 before, 42 after.](/blog/data-over-rules/hero.svg)

| Date | Read-load (words) |
|---|---|
| Oct 1 | 2,239 |
| Oct 9 | 3,947 |
| Oct 11 | 4,602 |

From Oct 1 to Oct 9, that is a 76% increase. By Oct 11 the stamp was more than double the first one (tokens went from 2,978 to 6,121). Fewer long rules did not mean fewer words. We added new things in the same days: a skill ladder, a transitions skill, an ideas method, an approval rule. Each one was worth its cost on the day, and the stamp is where the cost shows.

In short, data-over-rules made the rules shorter and more consistent, and the pile of docs still grew fast. A ratchet only stops a number from creeping up unseen. It does not make anyone delete.

## What we would tell you if you keep an AGENTS.md

- Put a number behind each rule change, in the commit. If you cannot, you are guessing, and the next person cannot tell the guess from a finding.
- Search for rules your own checks teach. If the advice line tells the agent how to turn a check green, the agent will do it everywhere.
- Merge before you add. We folded duplicate rules together and kept the check ids for dead-stop and speed-ceiling.
- Make docs and checks agree in a test. A rule that lives in two places will drift in one of them.
- Weigh your docs. A ratchet that stamps words read before the first action makes every added paragraph show up in a diff.

The measurement side is in [the measured brief](/blog/measured-brief), where a table of rules fired showed that most drafts fixed none of them. The cost of reading docs is its own story in [documentation as a budget](/blog/read-load). For how vawe is set up for agents in the first place, see [AI agents](/ai-agents).

## In the code

- `quality/baselines/rule-length-ratchet.json` and `quality/gates/rule-length.mjs`: the over-length count, limit 500 characters (`harness/lib/rule-length.mjs`)
- `quality/baselines/bench-ratchet.json`: read-load words and tokens
- `tests/lib/bar-lint.test.mjs`: docs and checks agree
- [f68dc7df2](https://github.com/Vandit1604/vawe/commit/f68dc7df2): ban synth beds
- [e781b8484](https://github.com/Vandit1604/vawe/commit/e781b8484): drift is no longer the hold
- [a1fc2af16](https://github.com/Vandit1604/vawe/commit/a1fc2af16): three rule merges
- [93b9f8c14](https://github.com/Vandit1604/vawe/commit/93b9f8c14): rule-length ratchet falls to 42

The repo is at [github.com/Vandit1604/vawe](https://github.com/Vandit1604/vawe).
