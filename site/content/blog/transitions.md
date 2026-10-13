---
title: "Motion graphics transitions: 12 handoffs, 10 tells"
description: "A checklist for motion graphics transitions: name what carries the eye over each cut, pick from 12 handoff families, and avoid the 10 tells of a slideshow."
date: 2026-10-11
updated: 2026-10-13
section: taste
tags: "video transitions, match cut, handoffs, slideshow, motion design"
keywords: "motion graphics transitions, match cut, scene transitions in motion graphics, slideshow tells, cut on motion"
hero: /blog/transitions/hero.svg
heroAlt: "Twelve handoff families as a grid: graphic match, action match, object to object, position lock, container transform, shared axis, colour or light flood, type-driven, camera through, invisible cut, sound bridge, deliberate cut."
---

Our agents made films where scene A faded and scene B arrived, and when three moves in a row went the same way the film read as one long swipe. This checklist is what we now ask of every cut. It draws on film grammar that already exists (match cut, cut on action, J-cuts and L-cuts, Murch's Rule of Six) and organises it by one question: what carries the eye across the seam? It is part of our [motion design system](/blog/ten-looks), which covers the rest of the craft.

We have no measured film gain from these rules yet. The check is advisory and we have no before-and-after judge score. The numbers below are counts and thresholds.

## 1. Name the one thing that crosses the cut

A transition belongs to the thing that leaves beat A and starts beat B. That thing has a screen position, a scale, a direction and a speed on both sides of the cut. If you cannot name it, the cut is a swap: the background changes, the text changes, and nothing from beat A starts beat B.

How to check: write the carried element in the plan before you build. If the cell is empty, you have a slide change.

## 2. Pick a family from the twelve, and read its cost

Commit [`f12a9f516`](https://github.com/Vandit1604/vawe/commit/f12a9f516) added the family table in `taste/craft/transitions.md`. Each family says what it is, when the story at the cut fits it, its cost or risk, and which moves to copy.

![The twelve families: graphic match, action match, object to object, position lock, container transform, shared axis, colour or light flood, type-driven, camera through, invisible cut, sound bridge, deliberate cut.](/blog/transitions/hero.svg)

The cost column keeps an agent from using the showiest family on every cut:

| Family | What breaks it |
|---|---|
| Graphic match | needs the same framing in both shots; an anchor that drifts a few pixels breaks it |
| Action match | fails most visibly on a speed or ease mismatch |
| Colour or light flood | with no reveal point, it just cuts |
| Camera through | the strongest device, so one per film |
| Deliberate cut | exempt from the limits, because hard cuts are most seams |

Our older doc already listed transition types and what each one means. It said what a dissolve means and not what to build. The family table changes the question from "which transition?" to "which thing do I carry, and what does it cost?"

## 3. Do not repeat a family on adjacent cuts

The ledger limits are: no family on two adjacent cuts, and no family more than twice in a film. Three moves in a row in one direction is the repetition that turned our films into one swipe.

How to check: the ledger row per cut names the family, so a repeat is visible in the table before any render.

## 4. Choose the less typical of four ideas

The same commit added a skill, `vawe-transitions`, with a per-cut procedure: four ideas drawn from three families, a pick that is not the most typical, and a ledger row. That is the ideate method applied to a cut, described in [verbalized sampling prompts for agents](/blog/ideate).

## 5. Put the handoff in the plan, then check the film against it

The Board's cut table has a handoff column. `vawe check transitions` and the draft advice read it and compare it with the measured film, flagging planned handoffs that came out as hard cuts. A plan that is never compared with the film does nothing.

## 6. Score the film for slideshow tells

Commit [`a5a50e80e`](https://github.com/Vandit1604/vawe/commit/a5a50e80e) added `harness/lib/slideshow.mjs`. It scores ten tells from the motion records, the world spans and, when there is a video, the detected cut kinds and the still runs. It prints a score out of 10 with each tell, its seconds and a fix. It is advice only.

![Ten slideshow tells and their codes, with the repeat thresholds.](/blog/transitions/tells.svg)

The thresholds are repeat counts: 3 or more cuts, 5 or more elements, a 75 percent share, or shots within 15 percent of one length. A single event is a choice: one crossfade for a time jump is not a tell. We set the thresholds so that our two public example films, `colour-sting` and `tracking-hud`, stay clean, and a test reads their pages through the same rules.

## 7. Copy a continuous-take move when the story allows one

Two commits on 2026-10-10 added ten handoff moves. Each carries one shared element from scene A to scene B with no cut and no crossfade. [`c8d4b7779`](https://github.com/Vandit1604/vawe/commit/c8d4b7779) added highlight sweep, shadow handoff, word portal, underline road and caret door. `9d0224a63` added swipe-continues, drop-and-land, spin-rotation, counter-dive and thumbnail-grid. Our notes describe a larger set of polished continuous-take moves, but we verified only these ten in the commits.

<figure>
<video src="/blog/transitions/swipe-continues.mp4" poster="/blog/transitions/swipe-continues.hd.webp" muted loop playsinline controls></video>
<figcaption>Swipe continues: the motion of one scene carries into the next at the same direction and speed.</figcaption>
</figure>

<figure>
<video src="/blog/transitions/word-portal.mp4" poster="/blog/transitions/word-portal.hd.webp" muted loop playsinline controls></video>
<figcaption>Word portal: a word from scene A is the opening that scene B arrives through.</figcaption>
</figure>

When the carried element moves across the cut, match its speed on both sides. `ramp()` in our [CSS easing functions cheat sheet](/blog/easing) does that.

## 8. Cap the exposure flash at three per second

The exposure flash ([`dac155c18`](https://github.com/Vandit1604/vawe/commit/dac155c18)) is a 3-frame over-exposure on a cut. The new shot starts at twice the brightness and settles in 0.15 s. Measured on the clip at 60 fps: mean luma 27 before the cut, 203 to 208 in the peak, 67 on the first frame after it, and 38 after 0.15 s. The helper allows at most 3 flashes in any one second, in line with the WCAG limit of three flashes per second. A fourth cut in that second still cuts, without the flash.

<figure>
<video src="/blog/transitions/exposure-flash.mp4" poster="/blog/transitions/exposure-flash.hd.webp" muted loop playsinline controls></video>
<figcaption>Exposure flash: the shot swap sits inside the peak, so the viewer never sees it.</figcaption>
</figure>

## 9. Keep the seam rules few

We folded the older seam rules into three: `seam-timing`, `hard-cut-default` and `eye-trace` (`73336e6fc`). That commit added 73 lines, removed 255 and retired five rule ids.

## The checklist at a glance

| Check | How to verify | Where in the code |
|---|---|---|
| A carried element per cut | handoff column filled in the Board | Board cut table |
| Family chosen with its cost | ledger row names the family | `taste/craft/transitions.md` |
| No family on adjacent cuts, none more than twice | ledger | `skills/vawe-transitions/SKILL.md` |
| Four ideas, less typical pick | ledger row | `guides/IDEATE.md` |
| Plan matches the film | `vawe check transitions` | draft advice |
| Slideshow score | ten tells, score out of 10 | `harness/lib/slideshow.mjs` |
| Flash cap | at most 3 per second | exposure flash helper |

See the clips on their move pages: [swipe-continues](/moves/swipe-continues), [word-portal](/moves/word-portal) and [exposure-flash](/moves/exposure-flash). For how these cuts fit with looks, curves and lenses, start from the [motion design system](/blog/ten-looks) overview.
