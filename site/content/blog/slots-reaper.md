---
title: "Limiting headless Chrome renders: slots and a reaper"
description: "With 10+ agents and 18 headless Chromes, load hit about 18. Two render slots, a lane budget and a Chrome reaper fixed it. A sixth lane adds under 10% speed."
date: 2026-10-11
section: speed
tags: "headless chrome, concurrency, process management, render queue, agents"
keywords: "limit headless chrome, headless chrome too many processes, render queue, orphaned chrome processes, puppeteer concurrency"
hero: /blog/slots-reaper/hero.svg
heroAlt: "Two machine-wide render slots, with slot 1 reserved for drafts, and a reaper that kills Chromes whose owner process died."
---

The scarcest resource in an agent-run studio is not GPU time. It is one laptop fan. On 2026-09-26 more than ten agents were running at once, with 18 headless Chrome processes between them, and the load average sat near 18. We needed to limit headless Chrome renders for the whole machine, and then clean up after the ones that died.

<figure>

![Two render slots with slot 1 reserved for drafts, and the reaper flow for orphaned Chromes](/blog/slots-reaper/hero.svg)

</figure>

## The problem

Each render launches several Chrome processes, one per capture lane. With many agents each running their own render, the machine overheated and throttled. End-to-end runs failed on timeouts caused by the load rather than by any bug. (This is the same pressure we describe in [how we sped up end-to-end tests](/blog/test-suite).)

Our first fix only looked at the process list. A render counted the other renders it could see and lowered its own worker count. That reduced the damage, but it did not limit anything. Ten renders at two workers each is still twenty Chromes.

Killed renders added a second problem. A render that was stopped with `SIGKILL` runs no handler, so its Chromes kept running. Orphaned `node --test` processes were also a problem; one ran for three hours.

## What we built

### One machine-wide slot lock

Commit `7fcf92913` replaced the process-list scan with slots. A slot is a file in a shared directory, `slot-<i>.json`, created with an exclusive create so two renders can never take the same one. It records the pid, start time, kind and who asked. A slot whose pid is dead is taken back. The default is 2 slots for the whole machine, set by `VAWE_RENDER_SLOTS`.

A render that cannot get a slot waits and prints one line naming the holder and its age. Commit `6055cc38c` moved that line to stdout, since our render commands promise a single error line on stderr and a waiting line is progress.

### A slot kept for drafts

Slots fixed the load but created a queue. A final holds a slot for minutes, and an agent that wanted a 30-second draft waited behind it. In one session on 2026-10-11, a draft waited up to 357 seconds behind finals (the number is in a code comment).

Commit `05aa73d9c` stops a final from taking the last free slot. A final may take slots 0 to count minus 2. A draft tries the top slot first and then the others. With the default of 2 slots, a final can only use slot-0, and slot-1 is always free for a draft.

### A lane budget from free memory

Slots limit renders. Lanes limit Chromes inside one render. Commit `088b3d1e3` computes the lane count from the machine: the smaller of cores minus 1, free memory divided by 1,500 MB, free process slots divided by 12, and a cap of 4. At least one lane always runs. The memory figure comes from a measurement: a software-composited 1080p Chrome used about 1.5 GB resident and 7 processes while idle.

The cap of 4 also comes from a measurement. On a film called tracking-hud, under load 21, we recorded shots per second at 1, 2, 4 and 6 lanes.

<figure>

![Bar chart of shots per second: 2.5 at 1 lane, 4.7 at 2, 6.4 at 4, 7.0 at 6](/blog/slots-reaper/lanes.svg)

</figure>

A sixth lane adds under 10% for 1.3 GB more memory, so the budget stops at 4. When another render already holds a slot, a new render starts at 2 workers instead of 4 (`COOL_WORKERS`), so the second render starts cool. `VAWE_WORKERS` overrides both.

### A reaper for orphans

Every Chrome that the harness launches writes a file named after its pid, whose content is the pid of its owner. At the next launch, the renderer reads that directory and kills the Chromes whose owner is dead (`088b3d1e3`). A Chrome whose owner is alive is left alone. Commit `58f289415` extends this to a puppeteer Chrome whose parent is init, the leftover of code that never registered it. Commit `eea0cc5ee` makes a stop signal close the browsers once and exit. Every signal path closes with a grace limit.

## Result

- Before: load about 18 with 18 Chromes (our notes from 2026-09-26).
- A draft waited 357 s behind finals before the reserved slot.
- Lane scaling under load 21: 2.5, 4.7, 6.4 and 7.0 shots per second at 1, 2, 4 and 6 lanes.
- We did not time how much waiting the slots saved, so we do not give a number for it.

## What we would tell someone building the same thing

- Limit the number of renders first. A per-render worker count cannot protect a machine that many agents share.
- Reserve capacity for the short job. A queue that treats a 30-second draft and a 16-minute final alike makes the short job wait for the long one.
- Measure lane scaling on your own machine under load, then stop where the curve flattens.
- Assume a process can be killed without cleanup. Write down every child you start where the next run can find it.
- Print the wait. One line that names the holder turns a mystery into a decision.

Waiting itself is its own problem, covered in [making the wait cheap](/blog/cheap-wait). The capture loop each lane runs is in [four render workers were one worker](/blog/chrome-per-lane). For the agent side, see the [CLI docs](/docs/cli). Source: [github.com/Vandit1604/vawe](https://github.com/Vandit1604/vawe).

## In the code

- `harness/lib/render-slots.mjs`: slots, the draft reservation.
- `harness/lib/lane-budget.mjs`: the lane count.
- `harness/lib/render-harness.mjs`: Chrome registration and the reaper.
- `tests/lib/render-slots.test.mjs` and `tests/media/chrome-reaper.test.mjs`.
- Commit [7fcf92913](https://github.com/Vandit1604/vawe/commit/7fcf92913): the slot lock.
- Commit [05aa73d9c](https://github.com/Vandit1604/vawe/commit/05aa73d9c): a final never takes the last slot.
- Commit [088b3d1e3](https://github.com/Vandit1604/vawe/commit/088b3d1e3): lane budget and reaper.
- Commit [58f289415](https://github.com/Vandit1604/vawe/commit/58f289415): reap puppeteer Chromes whose parent is init.
