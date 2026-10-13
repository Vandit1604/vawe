---
title: "AI agent harness engineering: build for the weaker model"
description: "AI agent harness engineering should start from the weakest model you will run. Six weaker-model films: median 13 drafts, 0 of 6 passed the judge."
date: 2026-10-11
updated: 2026-10-13
section: agent-experience
tags: "ai agent harness, weaker model, advice, judge, agents"
keywords: "ai agent harness, agent harness engineering, weaker model, llm agent tooling"
hero: /blog/weaker-model/symptoms.webp
heroAlt: "Four rows pairing a weaker-model failure with the harness change that answers it: attractor check, stills judge in dev, advice and error prefixes, and a judge ledger."
---

Design your AI agent harness for the weakest model you expect to run through it. A strong model covers the gaps in your tools: it reads a vague line, guesses right and moves on. A weaker model reads the same line, guesses wrong, and shows you exactly where the harness is thin. We build [vawe](https://github.com/Vandit1604/vawe), a framework where an agent writes one HTML page and gets a film, and since 2026-10-01 we run a weaker model next to the stronger one in every round of harness work.

Harness here means everything around the model: the commands it runs, the lines those commands print, the checks, the judge and the docs it reads first. This page makes the case for the weaker-model rule and links to one post for each part of the harness it shaped.

## Four failures that were harness gaps

On 2026-10-01 we looked closely at one film from a weaker model. Commit [4246a6a53](https://github.com/Vandit1604/vawe/commit/4246a6a53) lists what we saw in its message:

1. It named the brand with a name from our own attractor list, and it drew a banded disc. Both were on the list of things to avoid.
2. It skipped the stills judge.
3. It read advice lines as blocking errors.
4. The judge flipped its advice between rounds.

None of these was a model flaw in the sense that a better prompt would fix it. The attractor list named the traps and nothing checked for them. The advice lines looked like errors. The judge had no memory of what it had said the round before. A stronger model had walked past all four without tripping, so we had never seen them.

![Four failures and the harness change for each](/blog/weaker-model/symptoms.webp)

## What the weaker model made us change

The same commit answered each failure at the point of action, with the fix printed in the line.

The attractor check. `taste/attractors.json` (it lived in `engine-doctrine/` at the time) holds the stock names and hero shapes from the taste card's Attractors section, and a test checks that the card quotes them. The range check, `dev` and `new` flag a match in the brand name and in each direction, and print the fix.

Prefixes that cannot be misread. Every advice line from `dev`, `new` and the stills range check starts with `advice:`, and its block ends with `(advice only: ...)`. An error that stops the run starts with `error:`. `harness/lib/advice.mjs` owns the wording.

The stills judge inside `dev`. `bin/vawe dev` runs the stills judge itself when `brief.md` has three filled directions, once per change of the directions or the slots, and prints its pick in three lines. `--no-judge` skips it.

A judge ledger. The judge gives each fix an id. The next judge marks each open fix as fixed, partly or still before it adds new ones, and it must say why a new fix reverses an old one. The report prints `ledger: N fixed, N partly, N still; N new`. A follow-up, [30579d4af](https://github.com/Vandit1604/vawe/commit/30579d4af), keeps what, now and want on each entry, and after three rounds on one target the ledger prints a stop line.

Motion lint for `window.seek` pages. The five motion rules now also run on element boxes sampled over time (`harness/lib/box-track.mjs`). Canvas contents are out of scope, and the output says so.

Later, repeated judge findings became defaults in the starter page, the moves and the taste digest. The first 5 s sting that passed the fresh judge ([bee932a4b](https://github.com/Vandit1604/vawe/commit/bee932a4b)) became the gold example, [`films/examples/colour-sting`](https://github.com/Vandit1604/vawe/tree/main/films/examples/colour-sting).

## The evidence nine days later

The commit body gives wall-clock numbers after the change, measured with `bin/vawe dev --no-judge`: a 5 s `window.seek` film took 26.1 s in total, 20.2 s of it capture, and a 3 s seek demo took 3.7 s to capture. The suite had 135 passing tests and `bin/vawe e2e` passed in 24.7 s. We have no before numbers for these timings, so they say nothing about speed.

The quality numbers come from a trace review on 2026-10-10. `vawe runs --all` showed six weaker-model films with a median of 13 drafts, a median first judged total of 45, and 0 of 6 PASS.

That review also showed where the new checks did not reach. On one film, 15 of 17 `dev` calls used `--no-judge`, and the one stills judge that ran scored 17 on stills. The acceptance count stayed at 7 of 14 or 15 rows for 10 drafts in a row, and 9 of 12 later drafts fixed no rule that had fired. Nothing counted the skip flag, so `vawe runs` showed "judge -" for every draft.

## The objection: why not just use the strong model?

The fair objection is cost of effort. If the strong model passes, why spend days on failures it never makes?

Our answer is that the strong model's success hides the cause. A loop that works because the model guessed right is a loop that fails on the next model, the next prompt or the next long session where context runs thin. The weaker model gives us those failures now, while each one points at a specific line of harness code. The changes it forced also cost the strong model nothing: `advice:` is two words, and a judge with a ledger is fairer to every author.

There is a second reason. Our target is a first draft that passes a fresh judge, and a fix loop hides weak defaults. A strong model repairs a weak default by the third draft. A weaker one does not, so the default has to be good.

## Where we could be wrong

The 0 of 6 is the uncomfortable number. After nine days of fixes, no weaker-model film passed the judge, so we cannot yet show that designing for the weaker model makes it succeed. What we can show is a list of harness gaps it found that the stronger model did not, each closed by a commit. It is possible that some gaps only matter for weak models and that the effort would pay more elsewhere. We will know more when a weaker-model film passes, and we will count the drafts it took.

## The parts of the harness, one post each

Each of these posts covers one piece of the harness that the weaker-model rule shaped:

- [CLI design for AI agents](/blog/one-binary): why one binary with one verb per step replaced a Makefile and four routers.
- [Agent hooks that print the next command](/blog/stage-say): a hook and the verbs name the next stage, and what a trace showed about whether agents follow it.
- [Shell for AI agents](/blog/shell): the hook we reverted in seven minutes, and why we now change the environment instead of the habit.
- [Clarifying questions before the agent acts](/blog/new-asks): `vawe new` asks five questions and writes nothing until three are answered.
- [Merging a git worktree branch to main](/blog/land): the six-step landing ritual as one command.
- [AI agent guardrails](/blog/advise-refuse): every check advises, and only three things refuse.
- [How long AGENTS.md should be](/blog/read-load): the words an agent reads first, measured and ratcheted.
- [Reading AI agent traces](/blog/trace-reviews): 74% of one session was waiting, and the fixes for the wait.
- [AI agent observability](/blog/run-logs): one JSONL line per command, written by the tool and never by the agent.

The judge side of the loop is covered in [how we designed the LLM judge](/blog/judge-design), and the [moves library](/moves) shows what a passing film is built from.
