---
title: "Puppeteer default viewport: the 800x600 bug in our renders"
description: "Puppeteer's default 800x600 viewport reset a running render tab when another process called browser.pages(). Wrong frames fell from 5 or 6 to 0."
date: 2026-10-01
updated: 2026-10-13
section: measurement
tags: "puppeteer, headless chrome, llm judge, render bug, debugging"
keywords: "puppeteer default viewport, puppeteer browser.pages 800x600, puppeteer shared browser tabs, llm judge false positives"
hero: /blog/judge-defect/hero.webp
heroAlt: "Large text 3 times with the caption the judge said echo, and three times we said it misread"
---

| | |
|---|---|
| Date | 30 September to 1 October 2026 |
| Impact | Final renders carried an 800x600 copy of the page in the top-left corner, or 800x600 tiles blended into the motion blur. Two films named in the fix commit were affected. |
| Cause | `browser.pages()` in a second process attached to the render's tab, and Puppeteer gave it the default 800x600 viewport. |
| Fix | Find warm tabs by URL through `browser.targets()` and attach only to our own ([`60de4a7aa`](https://github.com/Vandit1604/vawe/commit/60de4a7aa)). |
| Detection | Our automated judge reported the defect three times. We dismissed it three times. |

The bug produced wrong frames that looked like render drift, so it is one item on our [deterministic rendering checklist for headless Chrome](/blog/determinism).

## How the 800x600 frames got into a final

On 30 September our automated film judge reported a corner box that shrinks, a tiled "echo" in the motion blur, and a shrink at 2.8 s. The judge is a fresh, read-only agent that looks at a deterministic contact sheet and six change-peak frames of a film and scores it. It is described in [LLM as a judge for video](/blog/judge-design).

1. The judge reports the three defects on finals.
2. We read the reports and decide the judge misread the contact sheet. A model looking at a grid of small tiles and seeing patterns that are not there is a common failure, so the prior seemed reasonable. A person watching the film also saw the glitches, which should have stopped us.
3. We open the frames at the seconds the judge named. One film shows an 800x600 copy of the page in the top-left corner and ink everywhere else, at 2.8 s and again at 4.1 to 4.35 s. In the other film, 800x600 tiles are blended into the motion blur at 0.8, 2.1, 3.15 and 3.7 s. Those are the "box" and the "echo".
4. We find the trigger. The bug only shows when two things run together: an agent had started `vawe compare --page`, which looks at a page in the shared browser, while a final render was capturing frames in the same browser. A render on its own was clean.

## Root cause: browser.pages() and the default viewport

The warm-tab lookup used `browser.pages()`. In Puppeteer that call creates a `Page` object for every tab in the browser, and each new `Page` gets the connection's default viewport, which is 800x600.

So when the compare run listed its warm tabs, it also attached to the render's tab and re-laid it out at 800x600 for a few frames. The render kept capturing, and those frames came out wrong.

## The fix: list targets, attach only to your own

Warm tabs now carry a marker in their URL. The code reads `browser.targets()`, which lists tabs without creating a `Page` for them:

```js
export const WARM_HASH = '#vawe-warm';

const tabs = browser.targets()
  .filter((t) => t.type() === 'page' && t.url().endsWith(WARM_HASH));
const warm = (await Promise.all(tabs.map((t) => t.page().catch(() => null)))).filter(Boolean);
```

Only warm tabs get a `Page` on the looking connection, and a render's tab is never one of them. The code is `takeWarmPage` in `harness/media/preview-server.mjs`.

<figure>
<img src="/blog/judge-defect/bug.webp" alt="Diagram: before, browser.pages() attaches to every tab and resets the render tab to 800x600. After, warm tabs are found by URL and the render tab is untouched." width="720" height="410" loading="lazy">
<figcaption>Before and after the change in <code>preview-server.mjs</code>.</figcaption>
</figure>

## How we confirmed the fix

We rendered a 66-frame window of one film beside a compare loop, twice before the fix and twice after. Before, both runs had 5 or 6 wrong frames. After, both had none. Then we re-rendered both full finals. The first film had 14 frame-to-frame luma jumps over 20 before the fix and none after, and the second had no wrong-viewport frame. The capture path itself did not change.

<figure>
<img src="/blog/judge-defect/numbers.webp" alt="Bars: wrong frames in a 66-frame window fell from 5 to 6 to 0, and luma jumps over 20 in a final fell from 14 to 0" width="720" height="280" loading="lazy">
<figcaption>The same renders before and after. Two runs for the window, one full final for the luma count.</figcaption>
</figure>

We did not count how many earlier finals carried the same defect, so we cannot say how many shipped drafts it touched.

## Why we missed it for three reports

We trusted our prior about the reviewer over the frames, three times. Full-size frames at the named seconds settled the question as soon as we opened them.

The same week showed a second way two instruments can disagree. The judge counted "5 near-identical tail tiles (limit 4)" on one film in 7 of 9 rounds, while our own draft check found nothing. The draft check read pixel statistics, and a slow push moves pixels without changing a 288 px tile. The two read different inputs, and neither was broken.

## Follow-ups

- The draft check now reads the sheet the judge reads, at 5 fps and 288 px, with the same limits ([`60d485cce`](https://github.com/Vandit1604/vawe/commit/60d485cce)). It prints 5 tail tiles on that film, 15 on another where the judge had written "about 15", and nothing on a third.
- A defect the judge reports is real until full-size frames at those seconds say otherwise. A contact-sheet grid is not an echo, so the grid itself does not count, but the prompt never rules a defect class out ([`b394dd450`](https://github.com/Vandit1604/vawe/commit/b394dd450), `5b2041b6f`).
- A shared browser needs an owner for each tab. Two more bugs came from the same preview server. A final's own page sat idle in the daemon, the daemon quit after 5 idle minutes, and the audio step failed with "Attempted to use detached Frame" ([`76180aeab`](https://github.com/Vandit1604/vawe/commit/76180aeab)). A stray tab could also keep an idle daemon alive, so it now exits after 10 idle minutes (`2bfe6ec1a`).

The rule we took from it: do not call `browser.pages()` on a browser that other processes share. Other ways a headless render can produce different pixels are collected in our [deterministic rendering checklist for headless Chrome](/blog/determinism), and a related layout bug is in [Puppeteer deviceScaleFactor: lay out big, capture small](/blog/drafts-lie). The measured bar the judge compares against is in [average shot length in motion graphics](/blog/quality-bar).
