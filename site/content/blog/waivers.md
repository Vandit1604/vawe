---
title: "Lint waivers that must name a place and a number"
description: "Our audit found 13 waivers in 8 of 36 film pages, 2 of them dead. A waiver reason must now say where and what was measured, or it waives nothing at all."
date: 2026-10-10
section: agent-experience
tags: "lint waivers, quality gates, ai agents, checks"
keywords: "lint waivers, suppress lint warnings, waive a check, ai agent quality gates, check suppression reason"
hero: /blog/waivers/hero.svg
heroAlt: "A waiver before and after. Before it names no place and no number and hides every finding of its code. After it is scoped to 2.25 s and names the measured 4.4:1 against the 4.5:1 limit."
---

A reason of "approved, and the threshold is an open decision" is not a reason, and our harness now knows it. We audited the lint waivers in 36 film pages and found 13 of them in 8 pages. Three sat in our own gold example and hid a whole code film-wide. Two waived a code that no check had ever emitted. This post covers the rule we wrote after the audit: a waiver must say where and what was measured, or it waives nothing.

## The problem: a waiver is a lie you can write in one line

[vawe](https://github.com/Vandit1604/vawe) checks a film page with many rules, and the checks advise instead of refusing. When an author breaks a rule on purpose, they declare it in the page, in a small JSON block, with a reason. That is the whole escape hatch, and we like it that way: the reason travels with the page, nowhere else.

The trouble was how little the harness asked of that reason. A waiver named only a code, such as `text-low-contrast`, and one `_why` string longer than 12 characters. A bare code covers every finding of that code in the film. A waiver written for one word at 2.25 seconds would also hide a contrast failure at second nine, and nobody could tell from the page.

Three checks (`still-limit`, the unverified-final gate and `anim-traps`) each vetted a reason in their own way. Some waivers waived codes that no check emitted at all, so they recorded an intention and did nothing. One code, `dead-air`, covered four different checks at once: the static window, the sheet tile run, the tail tiles and the world-held limit. A waiver written for one hid all four.

## What the audit found

We wrote a read-only audit that asks each check one question: what is the cheapest change that turns it green? (The bigger story is in [the post on agents cheating our checks](/blog/loophole-audit).) For waivers, it counted the following in 36 film pages:

- 13 waiver entries in 8 pages.
- 5 of them were `dead-air` over a range, which hid four checks each.
- 3 sat in the gold example agents copy: `text-low-contrast`, `attractor` and `display-tracking`, all bare and film-wide, with reasons that said a person had approved the choice and that a threshold was an open decision.
- 2 codes, `glow` and `off-colour`, that no check on `main` emits.

The last point is the one that stuck. Agents copy examples. A gold example with film-wide waivers and a reason that names no place and no number teaches every new film to do the same.

## What we built

Length was the only vetting, and an agent can write 60 characters of nothing. So the rule moved from how long a reason is to what it says. The commits are [ecb537a](https://github.com/Vandit1604/vawe/commit/ecb537a46) and [7ee9506](https://github.com/Vandit1604/vawe/commit/7ee9506ec), both on 2026-10-10.

One vetting for every check. `entryHasReason` in `harness/lib/waivers.mjs` is the only place that decides whether a reason counts. The three checks that did their own vetting now call it.

One code per check, scoped to seconds. A waiver is `code@second` or `code@a-b` for a range. `dead-air` is retired, and using it prints which four codes to choose from. A scoped waiver does not cover a finding that has no second.

A reason must name where and what was measured. `reasonProblem` runs five tests: at least 12 characters; not generic ("intentional", "by design", "deliberate", "stylistic", "fine", "ok" and "as intended" are removed and what is left must still have three real words); a place, meaning a world id of this page or a second; a measured value with its unit, such as `4.4:1` or `42%`; and no more than two copies of one reason on a page. A refusal prints the missing part, for example "the reason names no measured value: write the number the check printed, with its unit".

![The five tests a waiver reason must pass.](/blog/waivers/diagram.svg)

The judge sees every waiver. A waiver no longer hides a decision from the fresh-session judge that scores the film.

The result is visible in the public example film `colour-sting`. Its contrast waiver used to be a bare code. Now it reads:

```
"text-low-contrast@2.25": "world hot, 2.25 s: 'nsen' crosses the dye flood
mid-move at 4.4:1 against the 4.5:1 limit and lands readable by 2.5 s"
```

It names the world, the second, the measured ratio and the limit. A reviewer can open the film at 2.25 s and check it in ten seconds. We rewrote the `tracking-hud` example in the same spirit in [cd90a43](https://github.com/Vandit1604/vawe/commit/cd90a438e). One of its reasons says that at 1.95 s a 4k px² readout relocks to its glyph in 0.05 s, while a 1k px² caret types for 0.69 s, so the label jumps to its new lock and does not travel.

## The measured result

The audit gives the before-count: 13 waivers in 8 of 36 pages, 3 film-wide in the gold example, 2 dead codes, and one code that covered four checks. We have not run a second audit, so we have no after-count over the same 36 pages. What we do have is a unit test file, `tests/lib/waivers.test.mjs`, that pins the behaviour: generic reasons are refused however long, a world id that is not on the page does not count as a place, a second alone is a place and not a measure, the same reason on three waivers fails and two passes, and a retired code is refused even with a good reason.

One finding from the audit did not change. No waiver hid the camera drift or the synth bed trick the checks missed. Those passed without a waiver at all. A waiver rule fixes the hatch, not the hole next to it. For that we built the fixtures described in [the loophole audit post](/blog/loophole-audit).

## What we would tell you if you build the same thing

Put the waiver in the file it excuses and keep the reason next to it. Scope it: a waiver with no location is a switch for the whole file. Make one function decide whether a reason counts, and have every check call it. Refuse reasons by their content, since length is easy to satisfy. Print a refusal that says what to write, so the agent can fix it in one step. And fix the examples first, because agents copy the first waiver they see.

The [quality gates docs](/docs/quality-gates) list the checks and how waivers work in practice, and [the page contract](/docs/the-page) shows the authoring block. For the larger rule behind this, that guards should adapt and not block, see [advise on everything, refuse on exactly three things](/blog/advise-refuse).

## In the code

- `harness/lib/waivers.mjs`: `reasonProblem`, `entryHasReason`, `isWaived` and `RETIRED_CODES`.
- `tests/lib/waivers.test.mjs`: the tests for each refusal.
- `films/examples/colour-sting/page.html`: the gold example with scoped waivers.
- Commits: [ecb537a](https://github.com/Vandit1604/vawe/commit/ecb537a46) (one code per check, reasons vetted), [7ee9506](https://github.com/Vandit1604/vawe/commit/7ee9506ec) (one vetting for every check), [a2646fa](https://github.com/Vandit1604/vawe/commit/a2646fa14) (anim-traps), [cd90a43](https://github.com/Vandit1604/vawe/commit/cd90a438e) (measured reasons in an example).
