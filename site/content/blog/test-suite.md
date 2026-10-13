---
title: "How to speed up e2e tests: 175 s down to 4.3 s"
description: "How to speed up e2e tests by asking what they guard: our run fell from about 175 s to 4.3 s once the file format it mostly tested was deleted."
date: 2026-10-11
updated: 2026-10-13
section: speed
tags: "testing, end-to-end tests, ci, agents, rendering"
keywords: "how to speed up e2e tests, e2e test speed, fast pre-push hook, parallel render tests"
hero: /blog/test-suite/hero.svg
heroAlt: "Bar chart of seconds per command: make e2e about 175 s before and 4.3 s after, make test about 95 s, page tests about 15 s."
---

In late September our `make e2e` took about 175 seconds and failed on a busy laptop for reasons unrelated to the code. Two weeks later the same command took 4.3 seconds. We did no tuning. Most of the old run exercised a file format we were about to delete, and once it was gone we rebuilt e2e around what was left: one render per page of the [HTML to video page contract](/blog/page-contract).

<figure>

![Seconds per command before and after: e2e from about 175 s to 4.3 s, make test unchanged at about 95 s](/blog/test-suite/hero.svg)

<figcaption>The 175 s, 95 s and 4.3 s figures come from our own timing notes, not from a commit message.</figcaption>
</figure>

## A suite that guarded code on its way out

By late September, `make test` took about 95 seconds and `make e2e` about 175. Most of that time went to the old JSON scene format: its engine, its Go renderer, its gates. We had already decided to drop all of it after [a blind A/B test of HTML against our JSON video format](/blog/html-over-json). The suite was slow in proportion to the code that was about to disappear, and no profiler would have told us that share.

Slowness also made it flaky. On 2026-09-26 more than ten agents were running at once. The laptop's load average sat near 18, and e2e runs failed on timeouts. Our timing tests compared a measured number to a fixed limit, so a busy machine could fail them.

We chose not to tune the old suite, since tuning code about to be deleted is wasted work. Until [the 205,163-line deletion commit](/blog/big-deletion) landed, we ran only the page tests per merge (about 15 seconds) and planned to rebuild e2e afterwards.

## The rebuilt run: render every page, check one fact

After the format was gone, commit [777ec0da5](https://github.com/Vandit1604/vawe/commit/777ec0da5) rewrote `harness/dev/e2e.mjs`. It has two parts.

First it runs the page tests with `node --test`: determinism, page audio and the motion tests. Then it finds every `films/**/page.html` and every page in `tests/fixtures/pages/`, and renders each one as a half-size draft. A small pool runs 2 to 4 renders at once, depending on the core count.

Each render gets one cheap check. The mp4 must exist and be non-empty, and its duration must match the page's `<meta name="duration">` within 0.15 seconds. That is the whole assertion. Pixel-level behaviour has its own tests, listed in the [deterministic rendering checklist](/blog/determinism), and a full-size film is a poor place to compare pixels anyway.

The run never stops at the first failure. It collects every result and writes `report.json` and `report.md` under `quality/runs/e2e/`, so one run shows everything that is broken instead of three runs for three failures.

<figure>

![Flow of make e2e: page tests and a pool of half-size draft renders, each checked with ffprobe, then one report](/blog/test-suite/flow.svg)

</figure>

The 4.3 seconds needs a caveat. At that commit the repository had one example film page and two fixture pages, so the run rendered three pages. It grows with the number of films, and we do not claim 4.3 seconds holds at fifty. What changed for good is the shape of the work: a real render of every page, in parallel, in place of a long run that mostly exercised a dead path.

## Timing tests that measure the machine first

A fixed limit fails under load. In [250b7a3d5](https://github.com/Vandit1604/vawe/commit/250b7a3d5) we made the two timing tests measure the machine before they judge it.

The check-budget test (`tests/media/check-budget.test.mjs`) stores the seconds each draft check took, plus how long the capture of its fixture took on the stamping run. On a later run it divides this run's capture time by the stamped one. If the machine is 2x slower, each check gets a 2x limit. The stall test (`tests/media/render-stall.test.mjs`) does the same: it renders the page once with no stall, then sets its stall limit to twice that capture time, with a floor of 1.5 seconds.

A real regression still fails, because a check that grows without the capture growing is not explained by load.

## Hooks, and one e2e per merge

The same week we cut the Makefile down to thin aliases for `bin/vawe` verbs and rewrote the git hooks ([b4be7483b](https://github.com/Vandit1604/vawe/commit/b4be7483b), 70 files, +158 and -2,481). Pre-commit runs fast checks. Pre-push runs fast checks plus e2e. Later [685fe284b](https://github.com/Vandit1604/vawe/commit/685fe284b) wrapped the ritual into one verb, `vawe land`: fetch, rebase onto origin/main, scan for big files, run the tests, then push with an ssh keep-alive. The tutorial on [merging a git worktree branch to main in one command](/blog/land) covers it.

Our rule is one e2e per merge. Agents do not run it per branch, because ten agents each running a render suite is how the laptop reached a load of 18.

## Before and after

| Command | Before | After |
| --- | --- | --- |
| `make e2e` | about 175 s | 4.3 s |
| `make test` | about 95 s | about 95 s (unchanged) |
| page tests | n/a | about 15 s |

`make test` did not get faster. It still runs the full unit suite, and we left it alone. We have not yet timed e2e with many more films in the tree, so the open question is how the parallel pool scales as the count grows. The format this run now protects is the [page contract for rendering HTML to video](/blog/page-contract), and [/remotion-alternatives](/remotion-alternatives) compares that approach with other tools.
