---
title: "Suppression comments must name a place and a number"
description: "Lint suppression comments should name where and what was measured. Our audit found 13 waivers in 8 of 36 pages, 2 dead, so we now refuse vague reasons."
date: 2026-10-10
updated: 2026-10-13
section: agent-experience
tags: "lint waivers, suppression comments, quality gates, ai agents, checks"
keywords: "lint suppression comments, waive a check, suppress lint warnings, check suppression reason"
hero: /blog/waivers/hero.webp
heroAlt: "A waiver before and after. Before it names no place and no number and hides every finding of its code. After it is scoped to 2.25 s and names the measured 4.4:1 against the 4.5:1 limit."
---

A suppression comment that names no place and no number should suppress nothing. That is the rule vawe enforces now for its waivers, the in-page way to break a check on purpose, and we think it applies just as well to an `eslint-disable` line or any other lint suppression comment.

We came to it after an audit. In 36 film pages we found 13 waivers in 8 pages. Three of them sat in our own gold example and hid a whole code for the entire film, with a reason that said a person had approved the choice and the threshold was an open decision. Two waived a code that no check had ever emitted. This post makes the case for the rule, with the audit as evidence. It belongs to the series on [how we judge generated video](/blog/judge-design).

## How a waiver works in vawe

[vawe](https://github.com/Vandit1604/vawe) checks a film page against many rules, and the checks advise instead of refusing. When an author breaks a rule on purpose, they declare it in the page itself, in a small JSON block, with a reason. The reason travels with the page and lives nowhere else. We like that design and kept it.

What we did not like was how little the harness asked of the reason. A waiver named only a code, such as `text-low-contrast`, plus one `_why` string longer than 12 characters. A bare code covered every finding of that code in the film. A waiver written for one word at 2.25 seconds also hid a contrast failure at second nine, and nobody could tell from the page.

## The evidence from 36 film pages

The audit was the same read-only pass described in [reward hacking in AI agents](/blog/loophole-audit), which asked each check for its cheapest green change. For waivers it counted:

- 13 waiver entries in 8 pages.
- 5 of them were `dead-air` over a range. That one code covered four checks at once (the static window, the sheet tile run, the tail tiles and the world-held limit), so each of the 5 hid four checks.
- 3 sat in the gold example that agents copy: `text-low-contrast`, `attractor` and `display-tracking`, all bare and film-wide.
- 2 codes, `glow` and `off-colour`, that no check on `main` emits. They recorded an intention and did nothing.

The vetting was scattered too. Three checks, `still-limit`, the unverified-final gate and `anim-traps`, each judged a reason in its own way.

The gold example is the finding that stuck. Agents copy examples. A gold example with film-wide waivers and a reason with no place and no number teaches every new film to write the same.

## What a reason must contain now

Length was the only test, and an agent can write 60 characters of nothing. So the rule moved from how long a reason is to what it says ([ecb537a](https://github.com/Vandit1604/vawe/commit/ecb537a46) and [7ee9506](https://github.com/Vandit1604/vawe/commit/7ee9506ec), both on 2026-10-10).

One function decides. `entryHasReason` in `harness/lib/waivers.mjs` is the only place that decides whether a reason counts, and the three checks that vetted on their own now call it ([a2646fa](https://github.com/Vandit1604/vawe/commit/a2646fa14) moved anim-traps over).

One code per check, scoped to seconds. A waiver is `code@second` or `code@a-b` for a range. `dead-air` is retired, and using it prints the four codes to choose from instead. A scoped waiver does not cover a finding that has no second.

`reasonProblem` runs five tests on the text:

1. At least 12 characters.
2. Not generic. "intentional", "by design", "deliberate", "stylistic", "fine", "ok" and "as intended" are removed, and what is left must still hold three real words.
3. A place: a world id of this page, or a second.
4. A measured value with its unit, such as `4.4:1` or `42%`.
5. No more than two copies of one reason on a page.

A refusal prints the missing part, for example "the reason names no measured value: write the number the check printed, with its unit". The agent can fix it in one step.

![The five tests a waiver reason must pass.](/blog/waivers/diagram.webp)

The judge sees every waiver as well. A waiver no longer hides a decision from the fresh-session judge that scores the film.

## What a good reason looks like

The public example film `colour-sting` shows it. Its contrast waiver used to be a bare code. Now it reads:

```
"text-low-contrast@2.25": "world hot, 2.25 s: 'nsen' crosses the dye flood
mid-move at 4.4:1 against the 4.5:1 limit and lands readable by 2.5 s"
```

It names the world, the second, the measured ratio and the limit. A reviewer can open the film at 2.25 s and check it in ten seconds. We rewrote the `tracking-hud` example the same way in [cd90a43](https://github.com/Vandit1604/vawe/commit/cd90a438e). One of its reasons says that at 1.95 s a 4k px² readout relocks to its glyph in 0.05 s, while a 1k px² caret types for 0.69 s, so the label jumps to its new lock and does not travel.

## The objection: why not ban waivers?

Because some rules should be broken. A film can hold a word at low contrast for a beat on purpose, and a check that cannot be waived turns a deliberate choice into a fight with the tool. Our wider rule is that guards should adapt and not block, and that only three things refuse; [AI agent guardrails](/blog/advise-refuse) explains why. A waiver that has to state its evidence keeps the escape hatch and makes each use reviewable.

## Where we could be wrong

We have no after-count. We did not run a second audit over the same 36 pages, so we cannot show that waivers got better in practice. What we have is `tests/lib/waivers.test.mjs`, which pins the behaviour: generic reasons are refused however long, a world id that is not on the page is not a place, a second alone is a place but not a measure, the same reason on three waivers fails while two passes, and a retired code is refused even with a good reason.

A waiver rule also does nothing about checks that pass without a waiver. In the same audit, no waiver hid the camera drift or the synth bed. Those films passed the checks outright. The fix for that was the fixture pages in the [reward hacking audit](/blog/loophole-audit), and the judge's rubric in [our LLM-as-a-judge design](/blog/judge-design).

The [quality gates docs](/docs/quality-gates) list the checks and how waivers work in practice, and [the page contract](/docs/the-page) shows the authoring block.
