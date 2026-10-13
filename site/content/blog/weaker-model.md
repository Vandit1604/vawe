---
title: "Building an AI agent harness for the weaker model"
description: "A strong model hides harness gaps and a weaker one shows them. Six weaker-model films: median 13 drafts, median first judged total 45, and 0 of 6 PASS."
date: 2026-10-11
section: agent-experience
tags: "ai agent harness, weaker model, advice, judge, agents"
keywords: "ai agent harness, weaker model, llm agent tooling, agent feedback loop"
hero: /blog/weaker-model/symptoms.svg
heroAlt: "Four rows pairing a weaker-model failure with the harness change that answers it: attractor check, stills judge in dev, advice and error prefixes, and a judge ledger."
---

A strong model hides the gaps in your tools. It reads a vague line, guesses right and moves on. A weaker model reads the same line, guesses wrong, and shows you the gap. We found that out when we ran a weaker model through our video framework, vawe, and watched what it did with an AI agent harness built for a stronger one.

This post lists what the weaker model did, what we changed, and what the numbers say after nine days.

## What the weaker model did

On 2026-10-01 we looked at one film from a weaker model. Four things stood out, and we wrote them into the body of commit [61ac19259](https://github.com/Vandit1604/vawe/commit/61ac19259):

1. It named the brand with a name from our own attractor list, and it drew a banded disc. Both were listed as things to avoid.
2. It skipped the stills judge.
3. It read advice lines as blocking.
4. The judge flipped its advice between rounds.

We read each of these as a harness gap, not a model flaw. The attractor list named the traps and nothing checked for them. The advice lines looked like errors. The judge had no memory of what it had said before.

![Four failures and the harness change for each](/blog/weaker-model/symptoms.svg)

## What we tried

We set one rule: make the weaker model succeed, and run it next to the stronger one in each hill-climb round. The aim is that the first draft passes the fresh judge, not the tenth. A fix loop hides weak defaults, and the weaker model does not fix them for you.

Our answer was to move each check to the point of action, with the exact fix printed in the line.

## What we built

All of this went into one commit.

An attractor check. `taste/attractors.json` (it lived in `engine-doctrine/` at the time) holds the stock names and hero shapes that sit next to the taste card's Attractors section. A test checks that the card quotes them. The range check, `dev` and `new` flag a match in the brand name and in each direction, and print the fix.

Advice that cannot be misread. Every advice line from `dev`, `new` and the stills range check starts with `advice:`. Its block ends with `(advice only: ...)`. An error that stops the run starts with `error:`. The code is in `harness/lib/advice.mjs`.

The stills judge inside `dev`. `bin/vawe dev` runs the stills judge itself when `brief.md` has three filled directions. It runs once per change of the directions or the slots, and prints its pick in 3 lines. `--no-judge` skips it.

A judge ledger. The fresh judge gives each fix an id. The next judge marks each open fix as fixed, partly or still before it adds new ones, and it must say why a new fix reverses an old one. The report prints a line such as `ledger: N fixed, N partly, N still; N new`. A follow-up, [1810fc14a](https://github.com/Vandit1604/vawe/commit/1810fc14a), stops a target from being asked back and forth: after three rounds the ledger prints a stop line.

Motion lint for `window.seek` pages. The same five motion rules now run on element boxes sampled over time (`harness/lib/box-track.mjs`). Canvas contents are out of scope, and the output says so.

The principle behind it is short. Put defaults in code. Put checks at the moment of action, with the exact fix. Give each step one command.

Later, repeated judge findings became upstream defaults in the starter page, the moves and the taste digest. The first 5 s sting to pass the fresh judge became the gold example. It is [`films/examples/colour-sting`](https://github.com/Vandit1604/vawe/tree/main/films/examples/colour-sting) in the repo.

## The measured result

The commit body gives the wall clock after the change, measured with `bin/vawe dev --no-judge`. A 5 s `window.seek` film took 26.1 s in total, 20.2 s of it capture. A 3 s seek demo took 3.7 s to capture. The test suite had 135 passing tests, and `bin/vawe e2e` passed in 24.7 s. We have no before number for these timings, so we make no claim about speed.

The quality numbers come from a trace review on 2026-10-10. `vawe runs --all` showed six weaker-model films with a median of 13 drafts, a median first judged total of 45, and 0 of 6 PASS. None of the six passed the judge, so the harness is not done.

The review also found where the new checks did not reach. On one film, 15 of 17 `dev` calls used `--no-judge`. The one stills judge that ran scored 17 on stills. The acceptance count then stayed at 7 of 14 or 15 rows for 10 drafts in a row, and 9 of 12 later drafts fixed no rule that had fired. The flag that skips the judge had no counter, so `vawe runs` showed "judge -" for every draft. We read this as a harness gap, not as a model flaw, and it fed the next round of fixes. The run-log story is in [Run logs: every verb writes one line](/blog/run-logs).

## What we would tell someone building an AI agent harness

Run your weakest realistic reader through the loop, early. The stronger model will pass a loop that has holes in it, and you will not know.

Print the prefix. `advice:` and `error:` cost nothing and removed a whole class of misreads. If a line can be read as a stop, someone will read it as a stop.

Do not give the judge a free hand. A judge with no ledger will reverse itself. Give each fix an id and make the next judge answer for it. [How we designed the judge](/blog/judge-design) goes into the rest.

Treat a skip flag as a signal. If a check can be turned off with one flag, count the flag.

Last, watch the length of your docs. Weaker models skipped our long rule docs. We kept the list short in [Taste as a one-page digest](/blog/taste-digest).

The framework is open source at [github.com/Vandit1604/vawe](https://github.com/Vandit1604/vawe). The [moves library](/moves) is the best place to see what a passing film is built from.

## In the code

- `harness/lib/advice.mjs`: the `advice:` and `error:` wording.
- `taste/attractors.json` and `taste/rules/attractors.md`: the attractor list and its rule.
- `harness/lib/box-track.mjs`: the box sampler for the motion lint.
- [61ac19259](https://github.com/Vandit1604/vawe/commit/61ac19259): advice, attractor check, stills judge in `dev`, judge ledger, motion lint.
- [1810fc14a](https://github.com/Vandit1604/vawe/commit/1810fc14a): ledger entries keep what, now and want.
- [2c292300f](https://github.com/Vandit1604/vawe/commit/2c292300f): the first sting that passed the fresh judge.
