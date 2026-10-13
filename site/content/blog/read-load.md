---
title: "How long should AGENTS.md be? We ratchet ours"
description: "We cut what our agents read before their first layer from 5,402 words to 2,239 in four days, then let it grow back to 4,602 in ten. A ratchet counts the cost."
date: 2026-10-11
section: agent-experience
tags: "agents.md, context budget, documentation, ratchet"
keywords: "agents.md length, agent context budget, ai agent documentation, read-load ratchet"
hero: /blog/read-load/hero.svg
heroAlt: "Bar chart of words an agent reads before its first layer, from 5,402 on 2026-09-27 down to 2,239 on 2026-10-01 and back up to 4,602 on 2026-10-11."
---

We cut what our agents must read before they write the first layer of a film from 5,402 words to 2,239 in four days. Then we spent ten days giving most of it back: 4,602 words on 2026-10-11, about twice the low. This post is about the question of how long AGENTS.md should be, and the small mechanism that keeps us honest about the answer.

## The problem: every lesson becomes a rule

[vawe](https://github.com/Vandit1604/vawe) is a framework where an agent writes one HTML page and gets a film. Every time a trace review or a failed render taught us something, we added a sentence to AGENTS.md, a skill or the taste digest. Each sentence was correct. The cost was invisible: every agent reads every rule on every film, so one added word is paid once per session by every future agent. A rule that saves one film in fifty can still lose on the other forty-nine.

Nothing counted that cost, so nothing pushed back.

## What we tried

The first attempt was a plain prune, and it was large. Two commits on 2026-09-30 rewrote the craft docs: [8238186](https://github.com/Vandit1604/vawe/commit/8238186a3) touched 27 files and removed 5,258 lines, and [955db3a](https://github.com/Vandit1604/vawe/commit/955db3a62) touched 58 files and removed 7,461 lines. Their messages say they deleted the docs of the old JSON scene format (see [why we deleted it](/blog/html-over-json)), so the prune was easy to justify. The following day [62c6e0c](https://github.com/Vandit1604/vawe/commit/62c6e0c11) pulled the scattered pitfalls into one list in the taste digest and shortened AGENTS.md and the page skill. The stamp read 2,239 words.

Then the number climbed. A new brief stage here, a Board table there, a skill ladder. No single change looked large. The stamp read 2,714 on 10-05, 3,215 on 10-07, 3,947 on 10-09 and 4,602 on 10-11.

## What we built: a ratchet on words read

`harness/dev/bench.mjs` counts the words an author reads before the first layer. Today that is five files: a one-line pointer file, `AGENTS.md`, the taste digest, the page skill and the starter that `vawe new` writes. At the time of writing they hold 21, 1,678, 400, 1,742 and about 794 words, which gives 4,635 live words against a stamped 4,602. The bench turns words into tokens with one fixed factor (1.33), so the token number is an estimate and not a tokenizer count.

The baseline lives in `quality/baselines/bench-ratchet.json`. Both git hooks run the bench, and when the count is above the stamp they print a line like this:

```
read-load grew to 4635 word(s), up from the stamped 4602.
An agent now loads more before writing its first layer.
If deliberate, re-stamp: node harness/dev/bench.mjs fast --stamp
```

The hook warns and never blocks. That was a choice. Our rule is that a guard should adapt to the work, and we expected a hard wall on a word count to invite padding the starter or moving words into a file the bench does not read, though we did not test that. What the warning does is make the cost a decision: the author either prunes or commits a re-stamp on purpose. Twenty-five commits in the history have "re-stamp" in the subject, and each one is a reviewable moment where someone said the words were worth it.

![The ratchet loop: edit a doc, the hooks run the bench, the bench warns when the count grew, the author prunes or re-stamps in a commit.](/blog/read-load/diagram.svg)

We pair it with a second ratchet. `quality/gates/rule-length.mjs` counts rules longer than 500 characters across the agent-facing docs. The stamped ceiling fell from 324 to 42 in [93b9f8c](https://github.com/Vandit1604/vawe/commit/93b9f8c14), on the day we merged duplicate rules. A long rule is more likely to be skimmed, and the character limit is a convention we chose, not a measured threshold.

## The measured result

| Date | Words | Commit |
|---|---|---|
| 2026-09-27 | 5,402 | [bb9bd76](https://github.com/Vandit1604/vawe/commit/bb9bd7612) |
| 2026-10-01 | 2,239 | [62c6e0c](https://github.com/Vandit1604/vawe/commit/62c6e0c11) |
| 2026-10-05 | 2,714 | [2f8ee4f](https://github.com/Vandit1604/vawe/commit/2f8ee4f39) |
| 2026-10-07 | 3,215 | [472ac95](https://github.com/Vandit1604/vawe/commit/472ac9546) |
| 2026-10-09 | 3,947 | [a085824](https://github.com/Vandit1604/vawe/commit/a0858241a) |
| 2026-10-11 | 4,602 | [0724279](https://github.com/Vandit1604/vawe/commit/0724279cb) |

Two caveats matter. First, the file list changed on 2026-09-30, when the JSON format was deleted and the bench stopped counting the old stage skills. So the 5,402 and the 2,239 count different lists of files, and the right reading is the trend and not the exact ratio. Second, on 09-30 the stamp briefly read 987 words, while the old docs were gone and the new ones were not yet written (the next stamps that day read 1,739 and 2,208). A ratchet that only goes down rewards that kind of dip, which is one more reason ours warns and does not gate.

The commit that added the new motion path ([bb9bd76](https://github.com/Vandit1604/vawe/commit/bb9bd7612)) is a good example of the habit. Its message says the change adds 71 words, 1.3 percent of what an agent reads before its first layer. A one-sentence feature with a price tag attached is easier to argue with than a sentence nobody counted.

The pace of regrowth is what surprised us. The pruning took four days and the regrowth took ten. None of the additions was a mistake. Each one answered a real failure. A budget does not stop a good rule from costing something.

## What we would tell you if you build the same thing

Count the words the agent reads first, not the words in the repo. Put the count in the hook the author already runs. Make it warn, and make the fix a commit with a reason, so the history shows who paid for what. Move rules to the moment they apply: we now print a docs line from the verb that needs it (see [a loop that names its own next command](/blog/stage-say)), which costs the agent zero words until the stage arrives. Last, accept that the number will rise. The goal is that every rise is chosen.

Related reading: [the quality gates docs](/docs/quality-gates) explain which checks advise and which refuse, and [our post on one owner per rule](/blog/one-owner) covers the other half of keeping docs short, which is not writing a rule twice. The source is on [GitHub](https://github.com/Vandit1604/vawe).

## In the code

- `harness/dev/bench.mjs`: the read-load and fast-path counts, and the warning text.
- `quality/baselines/bench-ratchet.json`: the stamped numbers.
- `quality/gates/rule-length.mjs` and `harness/lib/rule-length.mjs`: the 500-character rule check.
- `.githooks/pre-commit` and `.githooks/pre-push`: where the bench runs.
- Commits: [8238186](https://github.com/Vandit1604/vawe/commit/8238186a3), [955db3a](https://github.com/Vandit1604/vawe/commit/955db3a62), [62c6e0c](https://github.com/Vandit1604/vawe/commit/62c6e0c11), [93b9f8c](https://github.com/Vandit1604/vawe/commit/93b9f8c14).
