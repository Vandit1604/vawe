---
title: "HTML vs a custom JSON video format: our A/B test"
description: "A custom JSON video format lost a blind A/B test to one HTML page: 10.75 minutes against 5.9, and judge scores of 5 and 4.5 against 8 and 7.5."
date: 2026-10-07
updated: 2026-10-13
section: architecture
featured: true
featuredOrder: 1
tags: "json video format, html to video, agents, web animations, architecture"
keywords: "json video format, html vs json for video, agent-native motion graphics, web animations api"
hero: /blog/html-over-json/hero.webp
heroAlt: "Bar chart. The JSON arm took 10.75 minutes and scored 5 and 4.5 from two judges. The HTML arm took 5.9 minutes and scored 8 and 7.5."
---

Short answer: for an agent that writes video, plain HTML beat our own JSON video format on every number we took. Given the same brief, the HTML arm finished in 5.9 minutes against 10.75, used one render fewer, and two blind judges scored its film 8 and 7.5 against 5 and 4.5. We decided to drop the JSON format two days later and deleted it on 2026-09-30. What replaced it is the [page contract for rendering HTML to video](/blog/page-contract).

The test was one run per arm, so treat it as a strong signal and not a rate. This page sets out the two options side by side, then each criterion, then when a private format could still be the right call.

## The two formats side by side

| | JSON scene format (Arm A) | One HTML page (Arm B) |
|---|---|---|
| What the agent writes | JSON with 24 layer types, named presets and size roles | `element.animate`, CSS keyframes, SVG, canvas |
| Renderer | A Go renderer that turns JSON into frames | A 40-line puppeteer script that seeks the page and takes a screenshot per frame |
| Seen in training | No | Yes |
| Time to a film | 10.75 min | 5.9 min |
| Renders used (limit 5) | 4 | 3 |
| Blind judge scores | 5 and 4.5 | 8 and 7.5 |

![Two pipelines side by side. The JSON arm learns a vocabulary, writes JSON and hands it to a Go renderer. The HTML arm writes one page and a short script seeks and screenshots it.](/blog/html-over-json/diagram.webp)

The test ran on 2026-09-27. Both arms got one brief for a 6 second kinetic sting, a fresh agent with no memory of the other arm, a limit of 45 minutes and 5 renders, and two blind judges who scored both films in opposite order. Arm A followed the JSON route in our AGENTS.md at the time.

## Vocabulary the agent must learn

The JSON format was tidy, and no model had seen it during training. The agent spent time finding a preset name for a plain-English idea such as "make the letters flip". About 8 of the 10.75 minutes went into finding preset names for devices the agent could already describe in words.

HTML needs no lookup for that. The agent writes the flip in CSS the way it would on any website.

## How much of the format gets used

Our layer data showed that 4 of the 24 layer types made up 87% of all layers. Of 314 text elements that had a size, 0 used a size role. A large vocabulary that is mostly unused costs reading time and buys little.

## Failure modes

The faults in the JSON run came from the format. A `flap` preset showed random glyphs that read as noise, and the agent could not search the web for why.

The HTML run had one trap, and it cost 8 minutes. A Web Animations keyframe list with no end value slides back to the element's resting state, so the element snaps back instead of holding its last value. That is ordinary Web Animations behaviour, and the agent could look it up like any other web question. We later made the renderer handle cases like this, which the [tutorial on seeking CSS animations](/blog/seekable-css) walks through.

## What the framework keeps either way

Moving the input language to the web did not move the rest. The renderer (`harness/media/render-page.mjs`), the quality checks, the judge and the harness stay ours. Two commits made the web side complete before the switch: [d6b380d7c](https://github.com/Vandit1604/vawe/commit/d6b380d7c) (2026-09-27) seeks CSS animations, transitions and Web Animations instead of killing them, and [b454e78ce](https://github.com/Vandit1604/vawe/commit/b454e78ce) (2026-09-28) lets a page's own `vawe.onFrame` drive real WebGL with no new attribute language.

The renderer's main job is to make time a seek instead of a clock. The [virtual clock reference](/blog/page-clock) covers `Date`, timers and `Math.random`.

## When to choose which

Choose a web page when the author is a language model. It already writes HTML, CSS and the Web Animations API well, and a bug in that code is a bug the web has already answered. That is our case, and on 2026-09-29 we decided that every film is one HTML page. The house rule we wrote then: if something an agent would naturally write fails, that is a framework bug and not an agent mistake. The result is the small [page contract for rendering HTML to video](/blog/page-contract): a web page with a few agreed `meta` tags and one `data-world` attribute per beat.

A private format can still make sense when people, not models, author through a UI that writes the file for them, or when you need a vocabulary the web cannot express. Test it on a fresh agent before you invest in it, since a blind test is cheaper than a long design review. Count which parts get used, too. And state your sample size: one run per arm tells you where to look, not how big the gap is. We later ran films on a weaker model as well, in the post on [building an AI agent harness for the weaker model](/blog/weaker-model).

Deleting the old format was bigger work than writing the new one. Commit [420928c23](https://github.com/Vandit1604/vawe/commit/420928c23) (2026-09-30) removed it, and [how to delete dead code safely](/blog/big-deletion) describes the order we used. If you came here looking for an alternative to a React-based video tool, see our pages on [Remotion alternatives](/remotion-alternatives) and [HyperFrames alternatives](/hyperframes-alternatives). The page format is in the [docs](/docs/the-page).
