---
title: "How long should AGENTS.md be? Our data, 2,239 to 4,602"
description: "How long should AGENTS.md be? We measured what agents read before acting: 5,402 words, cut to 2,239, then back to 4,602 in ten days. The data and method."
date: 2026-10-11
updated: 2026-10-13
section: agent-experience
tags: "agents.md, context budget, documentation, ratchet, taste rules"
keywords: "how long should agents.md be, agents.md best practices, agent context budget, read-load ratchet"
hero: /blog/read-load/hero.webp
heroAlt: "Bar chart of words an agent reads before its first layer, from 5,402 on 2026-09-27 down to 2,239 on 2026-10-01 and back up to 4,602 on 2026-10-11."
---

Our answer, from two weeks of measurement: keep what an agent must read before its first action near 2,000 words, and expect it to double anyway. We cut that reading from 5,402 words to 2,239 in four days, then let it grow back to 4,602 in ten. The number we track is not the length of AGENTS.md alone. It is everything an agent reads before it writes the first layer of a film, because that is the cost every session pays.

This page gives the series, how we measure it, what the cuts were, and what the number does not tell you. It is one part of the harness described in [AI agent harness engineering: build for the weaker model](/blog/weaker-model), and the weaker model is where the question started: it skipped our long rule docs.

## Setup: what counts as read-load

`harness/dev/bench.mjs` counts the words an author reads before the first layer of a [vawe](https://github.com/Vandit1604/vawe) film. Today that is five files:

| File | Words at the time of writing |
|---|---|
| a one-line pointer file | 21 |
| `AGENTS.md` | 1,678 |
| the taste digest (`taste/build/DIGEST.md`) | 400 |
| the page-writing skill | 1,742 |
| the starter page that `vawe new` writes | about 794 |
| total | 4,635 live, against a stamped 4,602 |

The bench turns words into tokens with one fixed factor, 1.33, so token figures here are estimates and not tokenizer counts.

## Method: a ratchet that warns

The stamped value lives in `quality/baselines/bench-ratchet.json`. Both git hooks (`.githooks/pre-commit` and `.githooks/pre-push`) run the bench, and when the live count is above the stamp they print:

```
read-load grew to 4635 word(s), up from the stamped 4602.
An agent now loads more before writing its first layer.
If deliberate, re-stamp: node harness/dev/bench.mjs fast --stamp
```

The hook warns and never blocks. Our rule for guards is that they adapt to the work, and we expected a hard wall on a word count to invite padding the starter or moving words into a file the bench does not read. We did not test that expectation. What the warning does is turn growth into a decision: the author prunes, or commits a re-stamp on purpose. Twenty-five commits in the history have "re-stamp" in the subject.

![The ratchet loop: edit a doc, the hooks run the bench, the bench warns when the count grew, the author prunes or re-stamps in a commit.](/blog/read-load/diagram.webp)

A second ratchet counts rules longer than 500 characters across the agent-facing docs (`quality/gates/rule-length.mjs`, with the logic in `harness/lib/rule-length.mjs`, stamped in `quality/baselines/rule-length-ratchet.json`). The 500-character limit is a convention we chose. We assume a long rule is more likely to be skimmed, but we did not measure that.

## Results: the read-load series

| Date | Words | Commit |
|---|---|---|
| 2026-09-27 | 5,402 | [0c9f48b](https://github.com/Vandit1604/vawe/commit/0c9f48b64) |
| 2026-10-01 | 2,239 | [aefdda7](https://github.com/Vandit1604/vawe/commit/aefdda74e) |
| 2026-10-05 | 2,714 | [8646d96](https://github.com/Vandit1604/vawe/commit/8646d96ac) |
| 2026-10-07 | 3,215 | [3d1a494](https://github.com/Vandit1604/vawe/commit/3d1a49464) |
| 2026-10-09 | 3,947 | [5bf9010](https://github.com/Vandit1604/vawe/commit/5bf9010d5) |
| 2026-10-10 | 4,450 | |
| 2026-10-11 | 4,602 | [ca8ba7f](https://github.com/Vandit1604/vawe/commit/ca8ba7fbb) |

Other re-stamps in between read 2,768, 3,420 and 4,444 words. In tokens, the low point was 2,978 and the 2026-10-11 stamp was 6,121. From 1 to 9 October the count rose 76%, and by 11 October it was more than twice the low.

<figure>
<img src="/blog/taste-digest/read-load.webp" alt="Bar chart of the read-load stamp: 2,654 words before the diet, 2,239 after, then 2,768, 3,420, 3,947, 4,444 and 4,602 by 11 October" width="720" height="400" loading="lazy">
<figcaption>The stamp in <code>bench-ratchet.json</code> at each re-stamp commit. The diet is the second bar.</figcaption>
</figure>

The rule-length stamp moved the other way: from 324 rules over 500 characters to 42, in one commit ([439b20b](https://github.com/Vandit1604/vawe/commit/439b20b86)), on the day we merged duplicate rules.

![Words an agent reads before starting: 2,239 on Oct 1, 2,714 on Oct 5, 3,215 on Oct 7, 3,947 on Oct 9, 4,450 on Oct 10, 4,602 on Oct 11. Rules over 500 characters: 324 before, 42 after.](/blog/data-over-rules/hero.webp)

## How the cut from 5,402 to 2,239 happened

Most of it was deletion. Two commits on 2026-09-30 rewrote the craft docs: [a006f67](https://github.com/Vandit1604/vawe/commit/a006f6707) touched 27 files and removed 5,258 lines, and [941ae59](https://github.com/Vandit1604/vawe/commit/941ae5901) touched 58 files and removed 7,461. They deleted the docs of our old JSON scene format, which made the prune easy to justify ([HTML vs a custom JSON video format](/blog/html-over-json) explains why it went).

The last step was a merge of lists. On 2026-10-01, [aefdda7](https://github.com/Vandit1604/vawe/commit/aefdda74e) moved the pitfalls in AGENTS.md and the page-writing skill into one list in the taste digest, and both documents got shorter. Measured on that commit alone, the read-load went from 2,654 words (about 3,530 tokens) to 2,239 words (2,978 tokens). The same day, [457d87145](https://github.com/Vandit1604/vawe/commit/457d87145) added a compact moves index and shorter judge and ship output.

Two other changes moved reading out of the always-read set. From 30 September, `dev` and `ship --status` print 5 to 8 "do X, not Y" lines for their own step (concept, motion, sound, before the verdict), each quoting its row in the taste card, and a test fails when a quote leaves the card ([dc36222cf](https://github.com/Vandit1604/vawe/commit/dc36222cf)). A draft render of a 4 s starter took 4.3 s wall clock with the lines printed, unchanged. And on 5 October the rules got one owner ([e09a5f569](https://github.com/Vandit1604/vawe/commit/e09a5f569)): `taste/rules/` holds one file per rule, 98 of them at that commit, and a generator (`harness/dev/taste-build.mjs`) writes the card, the digest, `steps.json` and `limits.json`. The old card, digests and guides moved to `taste/craft` with their numbers replaced by rule ids, and ten conflicts between the old files were resolved. This is one rule, shortened:

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

Only the `digest` line is in the always-read set. The rest prints when a check fires: twelve draft checks read the page from the DOM, and each cites its taste rule and the number from `limits.json` ([378aeea9f](https://github.com/Vandit1604/vawe/commit/378aeea9f)).

## How rules changed: cite the measurement

The rule-length drop came from a working rule about rules: when you change a rule, cite the measurement in the commit. The rule also allows adding a hard gate, as long as the number says it helps.

It started with a rule that worked too well. One line in our docs said "keep one thing moving (a slow drift on the ground or the hero)". A grep of 36 films found 18 with a slow push or drift on the camera or ground. The check counted any motion on a hold, the advice said "a slow drift", and agents drifted on every hold. [Reward hacking in AI agents](/blog/loophole-audit) has the full audit, which also found 21 of 107 taste rules with no check at all.

The changes with commits:

- Synth beds banned: the bed, swell-soft and braam voices, the synth-bed module and `data-bpm` were removed, and a page that writes `data-synth="bed"` is refused with the rule and the fix ([1feb1c38b](https://github.com/Vandit1604/vawe/commit/1feb1c38b)). The audit had found synth beds in 4 of 24 audio films.
- Drift removed as the hold: the moving-hold scale drift left the after-effects techniques, recipe chains now close on a still hold with a moving part, and the Ken Burns push on a still picture and two `drift-hold` table rows were removed ([563516725](https://github.com/Vandit1604/vawe/commit/563516725)).
- Duplicates merged: `live-hold` absorbed `no-dead-stop` and `ambient-restraint`, `speed-bands` absorbed `speed-ceiling`, and `gradient-grain` absorbed `gradient-or-flat`. The `dead-stop` and `speed-ceiling` check ids stayed ([5c05c667a](https://github.com/Vandit1604/vawe/commit/5c05c667a)).

A rule that changes in a doc must change in its check too, so a test asserts they agree: `tests/lib/bar-lint.test.mjs` checks that `text-lingers`, `readable-hold` and the world limit give the same answer for lines of 1, 4 and 8 words.

## What the numbers do not show

The file list changed on 2026-09-30, when the JSON format was deleted and the bench stopped counting the old stage skills. So 5,402 and 2,239 count different lists of files, and only the trend is comparable, not the ratio. On 09-30 the stamp also read 987 words for a short time, while the old docs were gone and the new ones were not written yet; the next stamps that day read 1,739 and 2,208. A ratchet that only goes down would reward that kind of dip, which is one more reason ours warns.

The series also does not show whether shorter reading made better films. A trace review of six weaker-model films on 10 October found a median of 13 drafts, a median first judged total of 45 and none passing the judge. That measures the whole harness on that day, and we cannot assign any part of it to the digest.

Fewer long rules did not mean fewer words. The regrowth came from real additions: brief phases, a Board table, the skill ladder, the lens and `vawe see` verbs, a transitions skill, an ideas method and an approval rule. Each answered a failure. The commit that added the new motion path ([0c9f48b](https://github.com/Vandit1604/vawe/commit/0c9f48b64)) shows the habit we want: its message says the change adds 71 words, 1.3 percent of what an agent reads before its first layer.

## Reproduce it

The bench runs in both git hooks of the repo, and the stamp is one command, the one the warning prints:

```
node harness/dev/bench.mjs fast --stamp
```

Count the files your agent must read before its first action, not the whole docs folder. Put the count in a hook the author already runs, and make a re-stamp a commit with a reason. Then move each rule to the step where it applies: our verbs print their docs line at the moment they run (see [agent hooks that print the next command](/blog/stage-say)), which costs the agent nothing until that stage arrives. Not writing a rule twice is the other half, covered in [single source of truth in code](/blog/one-owner). The [quality gates docs](/docs/quality-gates) list which checks advise and which refuse, and the rest of the harness is in [AI agent harness engineering](/blog/weaker-model).
