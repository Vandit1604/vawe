---
title: "How we sped up end-to-end tests 40x by deleting a file format"
description: "Our end-to-end run fell from about 175 s to 4.3 s after we deleted the JSON scene format it mostly tested. See what the new run checks and what it costs."
date: 2026-10-11
section: speed
tags: "testing, end-to-end tests, ci, agents, rendering"
keywords: "speed up end-to-end tests, e2e test speed, fast pre-push hook, parallel render tests"
hero: /blog/test-suite/hero.svg
heroAlt: "Bar chart of seconds per command: make e2e about 175 s before and 4.3 s after, make test about 95 s, page tests about 15 s."
---

We wanted to speed up end-to-end tests, and the fix was a deletion. `make e2e` took about 175 seconds. After we removed the file format it mostly tested, the same command took 4.3 seconds.

<figure>

![Seconds per command before and after: e2e from about 175 s to 4.3 s, make test unchanged at about 95 s](/blog/test-suite/hero.svg)

<figcaption>The 175 s, 95 s and 4.3 s figures come from our own timing notes, not from a commit message.</figcaption>
</figure>

## The problem: a suite that guarded code we were about to remove

By late September, `make test` took about 95 seconds and `make e2e` about 175 seconds. Most of that time went to the old JSON scene format: its engine, its Go renderer, its gates. We had already decided to drop all of it after [a blind A/B test](/blog/html-over-json). The suite was slow in proportion to the amount of code that was about to disappear.

The slowness also made the tests unreliable. On 2026-09-26 more than ten agents were running at once. The laptop's load average sat near 18, and e2e runs failed on timeouts that had nothing to do with the code under test. Our timing tests compared a measured number to a fixed limit, so a busy machine could fail them.

We did not tune the old suite. Tuning code that is about to be deleted is wasted work. Until [the deletion commit](/blog/big-deletion) landed, we ran only the page tests per merge (about 15 seconds) and rebuilt e2e afterwards.

## What the new e2e run does

After the JSON format was gone, commit `777ec0da5` rewrote `harness/dev/e2e.mjs`. The new run has two parts.

First it runs the page tests with `node --test`: determinism, page audio and the motion tests. Second it finds every `films/**/page.html` and every page in `tests/fixtures/pages/`, and renders each one as a half-size draft. A small pool runs 2 to 4 renders at once, depending on the core count.

Each render gets one cheap check. The mp4 must exist and be non-empty, and its duration must match the page's `<meta name="duration">` within 0.15 seconds. That is the whole assertion. We do not compare pixels here. Pixel-level behavior has its own tests, such as the [determinism tests](/blog/determinism).

The run never stops at the first failure. It collects every result and writes `report.json` and `report.md` under `quality/runs/e2e/`, so one run tells you everything that is broken.

<figure>

![Flow of make e2e: page tests and a pool of half-size draft renders, each checked with ffprobe, then one report](/blog/test-suite/flow.svg)

</figure>

One caveat belongs next to the 4.3 seconds. At that commit the repository had one example film page and two fixture pages, so the run rendered three pages. It grows with the number of films, and we do not claim 4.3 seconds holds at fifty films. The comparison that matters is the shape of the work: a real render of every page, in parallel, against a long run that mostly exercised a dead path.

## Timing tests that read the machine first

A fixed limit fails under load. In `250b7a3d5` we made the two timing tests measure the machine before they judge it.

The check-budget test stores the seconds each draft check took, plus how long the capture of its fixture took on the stamping run. On a later run it divides this run's capture time by the stamped one. If the machine is 2x slower, each check gets a 2x limit. The stall test does the same: it renders the same page once with no stall, then sets its stall limit to twice that capture time, with a floor of 1.5 seconds.

This keeps the tests honest in both directions. A real regression still fails, because a check that grows without the capture growing is not explained by load.

## The rest of the loop

The same week we cut the Makefile down to thin aliases for `bin/vawe` verbs and rewrote the git hooks (`b4be7483b`, 70 files, +158 and -2,481). Pre-commit runs fast checks. Pre-push runs fast checks plus e2e. Later `vawe land` (`685fe284b`) wrapped the whole ritual into one verb: fetch, rebase onto origin/main, scan for big files, run the tests, then push with an ssh keep-alive. We wrote about it in [cheap waiting](/blog/cheap-wait).

Our rule is one e2e per merge. Agents do not run it per branch, because ten agents each running a render suite is how the laptop got to a load of 18 in the first place.

## Result

| Command | Before | After |
| --- | --- | --- |
| `make e2e` | about 175 s | 4.3 s |
| `make test` | about 95 s | about 95 s (unchanged) |
| page tests | n/a | about 15 s |

`make test` did not get faster. It still runs the full unit suite, and we left it alone. The speedup came from changing what e2e covers. We did no tuning.

## What we would tell someone building the same thing

- Ask what share of your suite exercises code you plan to remove. Ours was most of it, and no profiler would have said so.
- Make the end-to-end assertion small and about an artifact: it exists, it is not empty, and it has the right length. A full-size film is a poor place to compare pixels.
- If a test compares a time to a limit, run a control on the same machine first and scale the limit by it.
- Let one run report everything. Stopping at the first failure turns a three-failure problem into three runs.

If you are building a render pipeline around plain web pages, see how [the page contract](/docs/the-page) keeps the checks simple, and how this compares with [Remotion](/remotion-alternatives). The code is at [github.com/Vandit1604/vawe](https://github.com/Vandit1604/vawe).

## In the code

- `harness/dev/e2e.mjs`: the page tests plus parallel draft renders.
- `tests/media/check-budget.test.mjs` and `tests/media/render-stall.test.mjs`: timing tests scaled by a control run.
- Commit [777ec0da5](https://github.com/Vandit1604/vawe/commit/777ec0da5): the new e2e.
- Commit [250b7a3d5](https://github.com/Vandit1604/vawe/commit/250b7a3d5): timing tests that scale with the run.
- Commit [b4be7483b](https://github.com/Vandit1604/vawe/commit/b4be7483b): thin Makefile and fast hooks.
- Commit [685fe284b](https://github.com/Vandit1604/vawe/commit/685fe284b): `vawe land`.
