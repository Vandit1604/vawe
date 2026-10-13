---
title: "HTML to video beat our own JSON scene format"
description: "We built a 24-type JSON format for agents, then a blind A/B test showed plain HTML to video finished in 5.9 minutes against 10.75. So we deleted the format."
date: 2026-10-07
section: architecture
tags: "html to video, json, agents, web animations, architecture"
keywords: "html to video, json video format, agent-native motion graphics, web animations api, css keyframes"
hero: /blog/html-over-json/hero.svg
heroAlt: "Bar chart. The JSON arm took 10.75 minutes and scored 5 and 4.5 from two judges. The HTML arm took 5.9 minutes and scored 8 and 7.5."
---

We built a scene format for agents with 24 layer types, presets and a Go renderer. Then we gave the same brief to two fresh agents, one on our JSON and one on a single HTML file, and the HTML arm finished in 5.9 minutes against 10.75. Two blind judges scored the HTML film 8 and 7.5. They scored the JSON film 5 and 4.5. This post is about that test and why we stopped building a private format. If you are choosing how an agent should describe a video, HTML to video is where we ended up.

## The problem: a format no model was trained on

vawe makes films from a description. Early on we gave agents a JSON vocabulary: 24 layer types, named presets, size roles, and a Go renderer that turned the JSON into frames. It was tidy. It was also something no model had seen during training.

The agents paid for that in two ways. They spent time finding the right preset name for a plain-English idea ("make the letters flip"). And they used the format in a narrow way anyway. Our layer data showed that 4 of the 24 layer types made up 87% of all layers. Of 314 text elements that had a size, 0 used a size role. The vocabulary was large and mostly unused.

## What we tried

We ran one blind A/B test on 2026-09-27. The setup was the same for both arms:

- One brief for a 6 second kinetic sting.
- A fresh agent per arm, with no memory of the other.
- A limit of 45 minutes and 5 renders.
- Two blind judges who scored both films, in opposite order.

Arm A used the JSON route from our AGENTS.md. Arm B wrote one HTML file with `element.animate` and CSS keyframes, and rendered it with a 40-line puppeteer script that seeks the page to each frame time and takes a screenshot.

![Two pipelines side by side. The JSON arm learns a vocabulary, writes JSON and hands it to a Go renderer. The HTML arm writes one page and a short script seeks and screenshots it.](/blog/html-over-json/diagram.svg)

## The measured result

| | JSON (Arm A) | HTML (Arm B) |
|---|---|---|
| Time | 10.75 min | 5.9 min |
| Renders used | 4 | 3 |
| Judge scores | 5 and 4.5 | 8 and 7.5 |

We have one run per arm. That makes this a signal, not a statistic, and we do not claim a rate from it. What made us act was that the faults in the JSON run were about the format itself. A `flap` preset showed random glyphs that read as noise, and about 8 of the 10.75 minutes went into finding preset names for devices the agent could already describe in words.

The HTML run had one trap, and it cost 8 minutes. A Web Animations keyframe list with no end value slides back to the element's resting state, so the element snaps back instead of holding its last value. That is ordinary Web Animations behaviour, and the agent could look it up like any other web question.

## What we built instead

We decided on 2026-09-29 to remove JSON and make every film one HTML page. The framework keeps its renderer, its checks and its harness. It drops the private language.

The rule we wrote for ourselves is short: if something an agent would naturally write fails, that is a framework bug, not an agent mistake. A page can use CSS keyframes, `element.animate`, SVG, canvas or three.js. The renderer's job is to make time a seek instead of a clock, which we cover in [Time is the seek, never the clock](/blog/page-clock) and [Making CSS animations seekable](/blog/seekable-css). The same idea drives the [page contract](/blog/page-contract): a film is a web page with a few agreed `meta` tags.

Deleting the old format was its own piece of work, and it was bigger than writing the new one. We cover it in [The biggest commit is a deletion](/blog/big-deletion).

## What we would tell you if you are building the same thing

- Test the format on a fresh agent before you invest in it. A cheap blind test beats a long design review.
- Count what agents actually use. A 24-type vocabulary where 4 types carry 87% of the load is a hint that the surface is too wide.
- Prefer a language the model already writes well. Agents handle HTML, CSS and the Web Animations API without a guide, and a missing end keyframe is a problem you can look up.
- Keep the part that is yours. Our renderer, quality checks and judge are still ours. Only the input language moved to the web.
- Be honest about sample size. One run per arm tells you where to look, not how big the gap is. We later ran films on a weaker model too, which we describe in [Building the harness for the weaker model](/blog/weaker-model).

If you came here from a search for an alternative to a React-based video tool, see how we compare on [/remotion-alternatives](/remotion-alternatives) and [/hyperframes-alternatives](/hyperframes-alternatives). The code is open at [github.com/Vandit1604/vawe](https://github.com/Vandit1604/vawe), and the page format is described in the [docs](/docs/the-page).

## In the code

- `harness/media/render-page.mjs`: the renderer that seeks a page and captures frames.
- `AGENTS.md`: the page contract agents read first.
- [`7baa223b9`](https://github.com/Vandit1604/vawe/commit/7baa223b9) (2026-09-27): CSS animation, transition and Web Animations are seeked, not killed.
- [`c193aa32f`](https://github.com/Vandit1604/vawe/commit/c193aa32f) (2026-09-28): a page's own `vawe.onFrame` drives real WebGL, with no new attribute language.
- [`ef1da265d`](https://github.com/Vandit1604/vawe/commit/ef1da265d) (2026-09-30): the commit that deleted the JSON format.
