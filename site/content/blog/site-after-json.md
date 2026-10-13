---
title: "A CSS animation library for agents: the vawe moves site"
description: "After we deleted the JSON engine copy (127,750 lines) we built a CSS animation library: 70 moves at launch, 125 now, 44 easing pages and one markdown file each."
date: 2026-10-11
section: architecture
tags: "css animation library, site, seo, documentation, agents, open source"
keywords: "css animation library, copy paste css animations, motion design moves, easing functions"
hero: /blog/site-after-json/pipeline.svg
heroAlt: "Flow diagram: a move is a markdown file and a demo page. One script builds a JSON index, copies the markdown, writes the llms.txt list and renders clips only when the source hash changed."
---

The repo went public on 2026-09-16. Two weeks later the marketing site still sold a scene format that no longer existed. We had deleted the format, so the front door needed a new thing to show. We built a CSS animation library: a gallery of moves, each one a clip, a short explanation and a snippet you copy. It launched with 70 moves. The current tree has 125.

This post covers how the site changed after the JSON format went away, what we got wrong on the way, and the small pipeline that keeps 120 clips fresh.

## The problem: a site that sold something we deleted

After [we deleted the scene format](/blog/big-deletion), the site still carried the engine copy, the editor, the playground and a `/json-to-video` page. Copy on the home page promised JSON scene files, an editor and an MCP server. None of those existed any more.

Commit [2d5c905fb](https://github.com/Vandit1604/vawe/commit/2d5c905fb) removed the site's engine copy, its data and the pages built on it: 1,792 files changed, 511 lines added and 127,750 removed. It deleted `site/public/{core,blocklib,scenes,themes,vendor,films}` and the `/arsenal`, `/editor`, `/playground` and `/json-to-video` routes. They stay reachable at the git tag `arsenal-final`. The home hero and the film cards now play rendered MP4s instead of booting the engine.

We removed first and built second. In the deletion commit the removed routes redirect to `/`, and `/arsenal` does so only temporarily, "until the /moves gallery exists". That order worked because the gallery landed the same day. A redirect to the home page is not a replacement for the page it hides.

## What we built: one move, three outputs

A move is a short, proven piece of motion: a title that rises under a mask, a caret that types, a counter that dives. Each lives in `prompts/moves` as a markdown file with a demo page. Commit [04b5fba46](https://github.com/Vandit1604/vawe/commit/04b5fba46) added the gallery: 298 files, 4,899 lines added.

![Pipeline: a markdown file and demo page become a JSON index, a copy for agents, an llms.txt list and clips](/blog/site-after-json/pipeline.svg)

`scripts/site/moves.mjs` does four jobs. It builds `site/lib/moves.json`. It copies each `.md` to `site/public/moves` so an agent can fetch the move as plain text. It writes the Moves section of `llms.txt`. With `--clips` it encodes an H.264 MP4, a VP9 WebM and a WebP poster per clip.

The gallery filters by group, look and job, and searches by name and job. Clips play only while in view, six at most at a time, and with reduced motion they play on tap. A move page, for example [`/moves/lens`](/moves/lens), shows the clip, the move, a copy button per snippet and the other moves that do the same job. The old `/arsenal` URLs now answer 308 and point to `/moves`.

<figure>
<img src="/blog/site-after-json/move-lens.webp" alt="A still from the lens move: a dark screen filmed with tilt, depth of field and bloom." width="1280" height="720" loading="lazy">
<figcaption>A still from the lens move. The page for it carries the clip and the code to copy.</figcaption>
</figure>

## Re-render only what changed

Rendering every clip for every edit wastes time when an edit touches one move. Commit [a09d12e71](https://github.com/Vandit1604/vawe/commit/a09d12e71) made `bin/vawe moves` render only stale clips. A source hash for each clip lives in `clips.lock.json`, and `--all` forces every clip.

Later, commit [ef948c58c](https://github.com/Vandit1604/vawe/commit/ef948c58c) gave each clip a 2 MB budget. A clip over budget is re-encoded at higher CRF steps, and the CRF is logged in the lock file. We cover the encode choices in a [separate post on the encode budget](/blog/encode).

## The easing pages

Commit [e32a4f38b](https://github.com/Vandit1604/vawe/commit/e32a4f38b) added `/easing`, with 44 easing pages. Each page carries the curve, its velocity, a `linear()` form, a bezier fit and After Effects handle data. The data comes from `core/motion` through `scripts/site/easing.mjs`, so the page cannot disagree with the code. The vawe pages also carry a 2 s rendered clip. The easing names are the vocabulary we explain in [easing as a vocabulary](/blog/easing). You can read the page for [`land`](/easing/land) to see the format.

## Search and agents

Commit [390fc6187](https://github.com/Vandit1604/vawe/commit/390fc6187) was the first SEO phase: a redirect map, structured data, a better move page structure, real `lastmod` dates, cache headers and an HTML-to-video page. 28 files changed, 3,718 lines added.

Commit [b60f82d4b](https://github.com/Vandit1604/vawe/commit/b60f82d4b) turned `/json-to-video` into a permanent redirect to the HTML to MP4 quickstart. People who searched for the old page land on the new one.

## The result

| What | At the gallery commit | In the current tree |
|---|---|---|
| Moves in `moves.json` | 70 | 125 |
| Groups | 6 | 7 |
| Looks | 8 | 10 |
| Jobs | 33 | 59 |

Two other numbers are fixed: 44 easing pages, and 120 MP4 clips that together weigh 24.8 MB, the largest at 2.2 MB.

We did not measure traffic or conversion for this change in this post. We can say what exists: a site where every move is a page, a markdown file and a clip, and an index that agents can read. We cannot yet say how many people copy a move.

## What we would tell someone building the same thing

Build the replacement before you delete the page, or land both together. A redirect to `/` is a hole.

Publish each unit twice: as a page for people and as plain markdown for agents. The cost is one `copy` step in the build script, and the `llms.txt` list makes the files easy to find.

Generate pages from the same data the code uses. Our easing pages come from `core/motion`, so they cannot drift from the real curves.

Hash the source of anything slow. A `clips.lock.json` with one hash per clip turns a 70-clip render into a one-clip render.

Put a size budget on media on day one. It is much cheaper to set a 2 MB limit when you have 70 clips than when you have 120.

For the render side, the page on [Remotion alternatives](/remotion-alternatives) compares us with other tools, and the repo is at [github.com/Vandit1604/vawe](https://github.com/Vandit1604/vawe).

## In the code

- `scripts/site/moves.mjs`: the moves index, the markdown copies, the `llms.txt` section and the clips.
- `scripts/site/easing.mjs`: the 44 easing pages.
- `site/lib/moves.json` and `site/lib/easing.json`: the generated data.
- [2d5c905fb](https://github.com/Vandit1604/vawe/commit/2d5c905fb): the site engine copy removed.
- [04b5fba46](https://github.com/Vandit1604/vawe/commit/04b5fba46): the moves gallery.
- [e32a4f38b](https://github.com/Vandit1604/vawe/commit/e32a4f38b): 44 easing pages.
- [a09d12e71](https://github.com/Vandit1604/vawe/commit/a09d12e71): hash lock for clips.
