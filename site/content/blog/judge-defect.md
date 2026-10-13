---
title: "Puppeteer default viewport: how 800x600 broke our renders"
description: "Our judge reported a shrinking box three times and we called it a misread. The Puppeteer default viewport (800x600) was resetting render tabs. Here is the fix."
date: 2026-10-01
section: measurement
tags: "puppeteer, headless chrome, llm judge, render bug, debugging"
keywords: "puppeteer default viewport, puppeteer browser.pages() 800x600, headless chrome render video, llm judge false positives, shared browser tabs"
hero: /blog/judge-defect/hero.svg
heroAlt: "Large text 3 times with the caption the judge said echo, and three times we said it misread"
---

On 30 September our automated film judge reported a corner box that shrinks, a tiled "echo" in the motion blur and a shrink at 2.8 s. We read the reports and decided the judge had misread the contact sheet. It had not. A Puppeteer call was resetting the viewport of our render tabs to 800x600 while a final render was running, and the Puppeteer default viewport put an 800x600 copy of the film in the top-left corner of real frames. We chased the wrong theory first, and the fix was a small change in how we find tabs.

## The problem: a judge says echo, we say misread

The judge is a fresh, read-only agent that looks at a deterministic contact sheet and six change-peak frames of a film and scores it. On finals it reported three defects. A corner box shrank. Tiles looked like an echo. Something shrank at 2.8 s.

Our first reading was the one an engineer makes about a model output: the judge is looking at a grid of small tiles and seeing patterns that are not there. That is a common failure for a model, so the prior was reasonable. But a person watching the film saw the glitches too.

## What we tried: look at the frames

When we opened the frames at the seconds the judge named, the film showed an 800x600 copy of the page in the top-left corner and ink everywhere else, at 2.8 s and again at 4.1 to 4.35 s in one film. In the other film, 800x600 tiles were blended into the motion blur at 0.8, 2.1, 3.15 and 3.7 s. Those are the "box" and the "echo".

The trigger was that the bug only showed when two things ran together. An agent had started `vawe compare --page`, which looks at a page in the shared browser, while a final render was capturing frames in the same browser. A render on its own was clean.

## The cause: the Puppeteer default viewport on every tab

The warm-tab lookup used `browser.pages()`. In Puppeteer that call creates a `Page` object for every tab in the browser, and each new `Page` gets the connection's default viewport, which is 800x600. So when the compare run listed its warm tabs, it also attached to the render's tab and re-laid it out at 800x600 for a few frames. The render kept capturing. Those frames came out wrong.

The fix finds tabs by URL and never attaches to a tab it does not own. Warm tabs carry a marker in their URL, and the code reads `browser.targets()`, which lists tabs without creating a `Page` for them:

```js
export const WARM_HASH = '#vawe-warm';

const tabs = browser.targets()
  .filter((t) => t.type() === 'page' && t.url().endsWith(WARM_HASH));
const warm = (await Promise.all(tabs.map((t) => t.page().catch(() => null)))).filter(Boolean);
```

Only warm tabs get a `Page` on the looking connection now, and a render's tab is never one of them.

<figure>
<img src="/blog/judge-defect/bug.svg" alt="Diagram: before, browser.pages() attaches to every tab and resets the render tab to 800x600. After, warm tabs are found by URL and the render tab is untouched." width="720" height="410" loading="lazy">
<figcaption>Before and after the change in <code>preview-server.mjs</code>.</figcaption>
</figure>

## The measured result

We rendered a 66-frame window of one film beside a compare loop, twice before the fix and twice after. Before, both runs had 5 or 6 wrong frames. After, both had none. Then we re-rendered both full finals. The first film had 14 frame-to-frame luma jumps over 20 before the fix and none after, and the second had no wrong-viewport frame. The commit message records the numbers (`eaef43da2`), and the capture path itself did not change.

<figure>
<img src="/blog/judge-defect/numbers.svg" alt="Bars: wrong frames in a 66-frame window fell from 5 to 6 to 0, and luma jumps over 20 in a final fell from 14 to 0" width="720" height="280" loading="lazy">
<figcaption>The same renders before and after. Two runs for the window, one full final for the luma count.</figcaption>
</figure>

Two films named in the commit were affected. We did not count how many earlier finals carried the same defect, so we cannot say how many shipped drafts it touched.

## The judge and our check had to agree

The same week showed a second way two instruments can disagree. The judge counted "5 near-identical tail tiles (limit 4)" on one film in 7 of 9 rounds, while our own draft check found nothing. The draft check read pixel statistics, and a slow push moves pixels without changing a 288 px tile. We changed it to read the sheet the judge reads, at 5 fps and 288 px, with the same limits (`12d203f22`). It now prints 5 tail tiles on that film, 15 on another film where the judge had written "about 15", and nothing on a third.

We also changed how we treat a judge's report. The rule is that a defect the judge reports is real until full-size frames at those seconds say otherwise. A contact-sheet grid is not an echo, so the grid itself does not count, but the prompt never rules a defect class out (`faa44d37f`, `44951917f`).

## What we would tell someone building the same thing

Do not use `browser.pages()` on a browser that other processes share. It attaches to every tab, and the default 800x600 viewport arrives with it. List targets, filter by URL, and attach only to your own.

Check the frames before you decide the reviewer is wrong.

Give two instruments the same input. A judge that reads a 288 px sheet and a check that reads raw pixels will disagree for reasons that are neither of their faults.

A shared browser needs an owner for each tab. We hit two more bugs in the same preview server. A final's own page sat idle in the daemon, the daemon quit after 5 idle minutes, and the audio step failed with "Attempted to use detached Frame" (`a570bbcd8`). A stray tab could also keep an idle daemon alive, so it now exits after 10 idle minutes (`92b8fdc99`). The fixes were small.

For the judge itself, see [how we designed it](/blog/judge-design). For the measured bar it compares with, see [the quality bar post](/blog/quality-bar). The render path this protects is described on [the determinism page](/determinism).

## In the code

- `harness/media/preview-server.mjs`: `takeWarmPage` and `WARM_HASH`
- `harness/lib/`: the draft check that now reads the judge's sheet
- [`eaef43da2`](https://github.com/Vandit1604/vawe/commit/eaef43da2): find warm tabs by URL, never attach to another process's tabs
- [`12d203f22`](https://github.com/Vandit1604/vawe/commit/12d203f22): count near-identical tiles on the judge's own sheet
- [`faa44d37f`](https://github.com/Vandit1604/vawe/commit/faa44d37f): confirm a sheet defect on a full-size frame, never rule an echo out
- [`a570bbcd8`](https://github.com/Vandit1604/vawe/commit/a570bbcd8): keep the daemon up while a render holds a tab

The repo is [Vandit1604/vawe](https://github.com/Vandit1604/vawe).
