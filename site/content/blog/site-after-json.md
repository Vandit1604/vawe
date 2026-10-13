---
title: "A CSS animation library agents can copy: 125 moves"
description: "How our site became a CSS animation library after the engine copy went: 70 moves at launch, 125 now, each a page, a markdown file and a clip under 2 MB."
date: 2026-10-11
updated: 2026-10-13
section: architecture
tags: "css animation library, site, seo, documentation, agents, open source"
keywords: "css animation library, copy paste css animations, motion design moves, easing functions"
hero: /blog/site-after-json/pipeline.svg
heroAlt: "Flow diagram: a move is a markdown file and a demo page. One script builds a JSON index, copies the markdown, writes the llms.txt list and renders clips only when the source hash changed."
---

Two weeks after the repo went public on 2026-09-16, our marketing site still sold a scene format we had deleted. We replaced it with a CSS animation library: a gallery of moves, each one a clip, a short explanation and a snippet you copy. It launched with 70 moves. The current tree has 125, and 120 MP4 clips weigh 24.8 MB in total.

Films had become plain web pages, as the [page contract for rendering HTML to video](/blog/page-contract) describes, and the site had to show that. This is the story of the switch, in the order it happened, including the part we would do differently.

## A home page for a product that no longer existed

After the [205,163-line deletion of the JSON format](/blog/big-deletion), the site still carried the engine copy, the editor, the playground and a `/json-to-video` page. The home page promised JSON scene files, an editor and an MCP server. None of those existed any more. The format had lost [an A/B test against plain HTML](/blog/html-over-json), and films were now one web page each.

Commit [2d5c905fb](https://github.com/Vandit1604/vawe/commit/2d5c905fb) removed the site's engine copy, its data and the pages built on it: 1,792 files changed, 511 lines added and 127,750 removed. It deleted `site/public/{core,blocklib,scenes,themes,vendor,films}` and the `/arsenal`, `/editor`, `/playground` and `/json-to-video` routes, which stay reachable at the git tag `arsenal-final`. The home hero and the film cards now play rendered MP4s instead of booting the engine.

We removed first and built second. In the deletion commit the removed routes redirect to `/`, and `/arsenal` does so only "until the /moves gallery exists". That order worked only because the gallery landed the same day. A redirect to the home page is a hole, and we would land the replacement first next time.

## One move, published three ways

A move is a short, proven piece of motion: a title that rises under a mask, a caret that types, a counter that dives. Each lives in `prompts/moves` as a markdown file with a demo page. Commit [04b5fba46](https://github.com/Vandit1604/vawe/commit/04b5fba46) added the gallery: 298 files, 4,899 lines added.

![Pipeline: a markdown file and demo page become a JSON index, a copy for agents, an llms.txt list and clips](/blog/site-after-json/pipeline.svg)

`scripts/site/moves.mjs` does four jobs. It builds `site/lib/moves.json`. It copies each `.md` to `site/public/moves` so an agent can fetch the move as plain text. It writes the Moves section of `llms.txt`. With `--clips` it encodes an H.264 MP4, a VP9 WebM and a WebP poster per clip. Publishing each move for people and again as markdown for agents costs one copy step in the build.

The gallery filters by group, look and job, and searches by name and job. Clips play only while in view, six at most at a time, and with reduced motion they play on tap. A move page, for example [`/moves/lens`](/moves/lens), shows the clip, the move, a copy button per snippet and the other moves that do the same job. The old `/arsenal` URLs now answer 308 and point to `/moves`.

<figure>
<img src="/blog/site-after-json/move-lens.webp" alt="A still from the lens move: a dark screen filmed with tilt, depth of field and bloom." width="1280" height="720" loading="lazy">
<figcaption>A still from the lens move. The page for it carries the clip and the code to copy.</figcaption>
</figure>

## Keeping 120 clips fresh without rendering 120 clips

Rendering every clip for every edit wastes time when an edit touches one move. Commit [a09d12e71](https://github.com/Vandit1604/vawe/commit/a09d12e71) made `bin/vawe moves` render only stale clips. A source hash for each clip lives in `clips.lock.json`, and `--all` forces every clip.

Later, [ef948c58c](https://github.com/Vandit1604/vawe/commit/ef948c58c) gave each clip a 2 MB budget. A clip over budget is re-encoded at higher CRF steps, and the CRF is logged in the lock file. The largest clip today is 2.2 MB. The [x264 preset benchmark](/blog/encode) covers the encode choices. A size budget is cheaper to set at 70 clips than at 120.

## 44 easing pages generated from the engine

Commit [e32a4f38b](https://github.com/Vandit1604/vawe/commit/e32a4f38b) added `/easing`, with 44 easing pages. Each carries the curve, its velocity, a `linear()` form, a bezier fit and After Effects handle data. The data comes from `core/motion` through `scripts/site/easing.mjs`, so a page cannot disagree with the code. The vawe curves also carry a 2 s rendered clip. The page for [`land`](/easing/land) shows the format, and the [CSS easing functions cheat sheet](/blog/easing) explains the named curves.

## Redirects and search

Commit [390fc6187](https://github.com/Vandit1604/vawe/commit/390fc6187) was the first SEO phase: a redirect map, structured data, a better move page structure, real `lastmod` dates, cache headers and an HTML-to-video page (28 files, 3,718 lines added). Commit [b60f82d4b](https://github.com/Vandit1604/vawe/commit/b60f82d4b) turned `/json-to-video` into a permanent redirect to the HTML to MP4 quickstart, so people who searched for the old page land on the new one.

## The library in numbers

| What | At the gallery commit | In the current tree |
|---|---|---|
| Moves in `moves.json` | 70 | 125 |
| Groups | 6 | 7 |
| Looks | 8 | 10 |
| Jobs | 33 | 59 |

The ten looks come from one shared [motion design system](/blog/ten-looks). The data behind the table lives in `site/lib/moves.json` and `site/lib/easing.json`, both generated.

We did not measure traffic or conversion for this change, and we cannot yet say how many people copy a move. What exists is a site where every move is a page, a markdown file and a clip, with an index agents can read. Every clip is rendered from a page that follows the [HTML to video page contract](/blog/page-contract). For how the render side compares with other tools, see [Remotion alternatives](/remotion-alternatives).
