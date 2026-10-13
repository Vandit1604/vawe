---
title: "Too many headless Chrome processes: slots and a reaper"
description: "Too many headless Chrome processes: 18 Chromes pushed our load to about 18. How to add render slots, a lane budget and a reaper for orphaned Chromes."
date: 2026-10-11
updated: 2026-10-13
section: speed
tags: "headless chrome, concurrency, process management, render queue, agents"
keywords: "too many chrome processes, kill orphaned chrome processes, limit headless chrome, puppeteer concurrency"
hero: /blog/slots-reaper/hero.webp
heroAlt: "Two machine-wide render slots, with slot 1 reserved for drafts, and a reaper that kills Chromes whose owner process died."
---

To cap headless Chrome on a machine that many processes share, you need four parts: a machine-wide slot lock, a slot kept free for short jobs, a lane count from free memory, and a reaper that kills Chromes whose owner died. At the end, the machine runs at most two renders, a quick draft never queues behind a long final, and a killed render leaves nothing behind.

We built it after 2026-09-26, when more than ten agents ran at once with 18 headless Chrome processes between them and the load average sat near 18. The machine overheated and throttled, and end-to-end runs failed on timeouts caused by load rather than by any bug. It is one part of our [headless Chrome render pipeline](/blog/chrome-per-lane), where each render opens one Chrome per capture lane.

<figure>

![Two render slots with slot 1 reserved for drafts, and the reaper flow for orphaned Chromes](/blog/slots-reaper/hero.webp)

</figure>

## What the Chrome cap needs

- A shared directory every render can write to.
- The pid of each render and of each Chrome it launches.
- One measurement of your own: how fast a render gets with 1, 2, 4 and 6 lanes, under load.

Our first attempt only read the process list. A render counted the other renders it could see and lowered its own worker count. That reduced the damage but limited nothing: ten renders at two workers each is still twenty Chromes.

## Step 1: take a slot with an exclusive file create

A slot is a file in the shared directory, `slot-<i>.json`, created with an exclusive create so two renders can never take the same one. It records the pid, start time, kind and who asked. A slot whose pid is dead is taken back. The default is 2 slots for the whole machine, set by `VAWE_RENDER_SLOTS` (commit `7fcf92913`).

A render that cannot get a slot waits and prints one line naming the holder and its age. Print that line on stdout: our render commands promise a single error line on stderr, and a waiting line is progress (commit `6055cc38c`).

## Step 2: keep the last slot for short jobs

Slots fixed the load but created a queue. A final holds a slot for minutes, and an agent that wanted a 30-second draft waited behind it. In one session on 2026-10-11, a draft waited up to 357 seconds behind finals (the number is in a code comment).

Commit `05aa73d9c` stops a final from taking the last free slot. A final may take slots 0 to count minus 2. A draft tries the top slot first and then the others. With the default of 2 slots, a final can only use slot-0, and slot-1 is always free for a draft.

## Step 3: compute the lane count from the machine

Slots limit renders; lanes limit Chromes inside one render. Commit `088b3d1e3` takes the smallest of:

- cores minus 1,
- free memory divided by 1,500 MB,
- free process slots divided by 12,
- a cap of 4.

At least one lane always runs. The 1,500 MB comes from a measurement: a software-composited 1080p Chrome used about 1.5 GB resident and 7 processes while idle.

The cap of 4 also comes from a measurement. On a film called tracking-hud, under load 21, we recorded shots per second at 1, 2, 4 and 6 lanes.

<figure>

![Bar chart of shots per second: 2.5 at 1 lane, 4.7 at 2, 6.4 at 4, 7.0 at 6](/blog/slots-reaper/lanes.webp)

</figure>

A sixth lane adds under 10% for 1.3 GB more memory, so the budget stops at 4. When another render already holds a slot, a new render starts at 2 workers instead of 4 (`COOL_WORKERS`), so the second render starts cool. `VAWE_WORKERS` overrides both.

## Step 4: register every Chrome and reap the orphans

A render stopped with `SIGKILL` runs no handler, so its Chromes keep running. Orphaned `node --test` processes were a problem too; one ran for three hours.

Every Chrome the harness launches writes a file named after its pid, whose content is the pid of its owner. At the next launch, the renderer reads that directory and kills the Chromes whose owner is dead (`088b3d1e3`). A Chrome whose owner is alive is left alone.

Commit `58f289415` extends this to a Puppeteer Chrome whose parent is init, the leftover of code that never registered it. Commit `eea0cc5ee` makes a stop signal close the browsers once and exit. Every signal path closes with a grace limit.

## Check that the cap holds

- Start three renders at once. Two run; the third prints one line naming the holder and its age.
- Start a final while one final runs. The draft slot stays free, and a draft starts at once.
- Kill a render with `SIGKILL`, then start another. Its Chromes are gone after the next launch.
- The tests are `tests/lib/render-slots.test.mjs` and `tests/media/chrome-reaper.test.mjs`.

## When Chromes still pile up

- A Chrome with a live owner is not reaped by design. If the owner is a hung render, see [Puppeteer hangs: a 60 s watchdog that names the step](/blog/stall-watchdog).
- A Chrome launched outside the harness never wrote its pid file. The init-parent rule in `58f289415` catches most of these.
- More lanes did not help: check where your curve flattens. Ours went 2.5, 4.7, 6.4 and 7.0 shots per second.

We did not time how much waiting the slots saved, so we give no number for it.

## Where to go next

The code is in `harness/lib/render-slots.mjs` (slots and the draft reservation), `harness/lib/lane-budget.mjs` (the lane count) and `harness/lib/render-harness.mjs` (Chrome registration and the reaper). Commits: [7fcf92913](https://github.com/Vandit1604/vawe/commit/7fcf92913), [05aa73d9c](https://github.com/Vandit1604/vawe/commit/05aa73d9c), [088b3d1e3](https://github.com/Vandit1604/vawe/commit/088b3d1e3), [58f289415](https://github.com/Vandit1604/vawe/commit/58f289415).

The same load broke our tests, which is part of [how to speed up e2e tests](/blog/test-suite). What an agent does while it waits for a slot is in [reading AI agent traces](/blog/trace-reviews). The capture loop each lane runs, and the rest of the pipeline, are in [faster headless Chrome rendering: one browser per lane](/blog/chrome-per-lane). For the agent side, see the [CLI docs](/docs/cli).
