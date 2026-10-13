---
title: "Video transitions that carry the eye: twelve handoff families"
description: "Video transitions that carry the eye: 12 handoff families, 10 banned slideshow tells and a check that compares the plan with the film. No measured gain yet."
date: 2026-10-11
section: taste
tags: "video transitions, handoffs, slideshow, motion design, agents"
keywords: "video transitions, match cut, scene transitions in motion graphics, slideshow tells, cut on motion"
hero: /blog/transitions/hero.svg
heroAlt: "Twelve handoff families as a grid: graphic match, action match, object to object, position lock, container transform, shared axis, colour or light flood, type-driven, camera through, invisible cut, sound bridge, deliberate cut."
---

A cut is only a slide change until something crosses it. Our agents made films where scene A faded and scene B arrived, and when three moves in a row went the same way the film read as one long swipe. We wrote down what can carry the eye across a seam. The result is twelve handoff families, ten banned slideshow tells, a column in the plan, and a check that compares the plan with the film. If you are looking for video transitions that do more than cross-fade, this is what we ended up with. We have no measured film gain from it yet, and we say so below.

## The problem: two slides and a fade

Our agents' cuts swapped two slides. The tell was easy to see once we looked for it. The background changed, the text changed, and nothing from beat A started beat B. Repetition made it worse: three moves in a row in the same direction read as one long swipe.

A transition belongs to the one thing that leaves beat A and starts beat B. That thing has a screen position, a scale, a direction and a speed on both sides. If you cannot name it, the cut is a swap.

## What we tried

We started from the film grammar that already exists: match cut, cut on action, J-cuts and L-cuts, Murch's Rule of Six. We did not try to invent a new taxonomy. The new work was to organise it by the question an agent asks at a seam: what carries the eye?

Our doc already had a taxonomy of transition types and what each one means. That says what a dissolve means. It does not say what to build. The family table changes the question from "which transition?" to "which thing do I carry, and what does it cost?"

## What we built: video transitions as handoffs

### Twelve handoff families

Commit `f12a9f516` added the table in `taste/craft/transitions.md`. Each family says what it is, when the story at the cut fits it, its cost or risk, and which moves to copy.

![The twelve families: graphic match, action match, object to object, position lock, container transform, shared axis, colour or light flood, type-driven, camera through, invisible cut, sound bridge, deliberate cut.](/blog/transitions/hero.svg)

The costs matter as much as the fits. A graphic match needs the same framing in both shots, and an anchor that drifts a few pixels breaks it. An action match fails most visibly on a speed or ease mismatch. A colour flood with no reveal point just cuts. A camera-through is the strongest device, so we allow one per film. A deliberate cut is the last family and it is exempt from the limits, because hard cuts are most seams.

The same commit added a skill, `vawe-transitions`, with the per-cut procedure: four ideas drawn from three families, the less typical pick, and a ledger. That procedure is the ideate method applied to a cut, covered in [Verbalized sampling for agents](/blog/ideate). The ledger limits are: no family on adjacent cuts, and none more than twice.

### A plan column and a check

The Board's cut table gained a handoff column. `vawe check transitions` and the draft advice read it, and they compare it with the measured film for planned handoffs that cut hard. The plan says what carries, and the film shows whether it did.

### Ten banned slideshow tells

Commit `a5a50e80e` added `harness/lib/slideshow.mjs`. It scores ten tells from the motion records, the world spans and, when there is a video, the detected cut kinds and the still runs. The result is a score out of 10 with each tell, its seconds and a fix. It is advice only.

![Ten slideshow tells and their codes, with the repeat thresholds.](/blog/transitions/tells.svg)

The thresholds are repeat counts: 3 or more cuts, 5 or more elements, a 75 percent share, or shots within 15 percent of one length. One crossfade for a time jump is a choice, not a tell. We set the thresholds on purpose so that our two public example films, `colour-sting` and `tracking-hud`, stay clean, and a test reads their pages through the same rules.

### Moves to copy

Two commits on 2026-10-10 added ten continuous-take handoff moves. Each carries one shared element from scene A to scene B with no cut and no crossfade. `c8d4b7779` added highlight sweep, shadow handoff, word portal, underline road and caret door. `9d0224a63` added swipe-continues, drop-and-land, spin-rotation, counter-dive and thumbnail-grid.

<figure>
<video src="/blog/transitions/swipe-continues.mp4" poster="/blog/transitions/swipe-continues.hd.webp" muted loop playsinline controls></video>
<figcaption>Swipe continues: the motion of one scene carries into the next at the same direction and speed.</figcaption>
</figure>

<figure>
<video src="/blog/transitions/word-portal.mp4" poster="/blog/transitions/word-portal.hd.webp" muted loop playsinline controls></video>
<figcaption>Word portal: a word from scene A is the opening that scene B arrives through.</figcaption>
</figure>

### One flash, capped

The exposure flash (`dac155c18`) is a 3-frame over-exposure on a cut. The new shot starts at twice the brightness and settles in 0.15 s. We measured it on the clip at 60 fps: mean luma 27 before the cut, 203 to 208 in the peak, 67 on the first frame after it, then 38 after 0.15 s. The helper allows at most 3 flashes in any one second, in line with the WCAG limit of three flashes per second. A fourth cut in that second still cuts, without the flash.

<figure>
<video src="/blog/transitions/exposure-flash.mp4" poster="/blog/transitions/exposure-flash.hd.webp" muted loop playsinline controls></video>
<figcaption>Exposure flash: the shot swap sits inside the peak, so the viewer never sees it.</figcaption>
</figure>

We also folded older seam rules into three: `seam-timing`, `hard-cut-default` and `eye-trace` (`73336e6fc`). That commit added 73 lines and removed 255, and it retired five rule ids.

## The measured result

These are counts: 12 families, 10 banned tells, 10 new continuous-take moves in two commits, and 1 flash capped at 3 per second. We have not yet measured a film that improved because of any of it. The check is advisory, and we have no before-and-after score from the judge. Our notes also describe a larger set of polished continuous-take moves, but we only verified the ten above in the commits, so we do not quote a bigger number.

## What we would tell someone building the same thing

- Organise transitions by what carries the eye.
- Write the cost next to each option. The cost is what keeps an agent from using the showiest family on every cut.
- Make the plan a column, then check the film against the column. A plan that is never compared is a wish.
- Set repeat thresholds. Single events (one crossfade for a time jump) are choices.
- Keep a safety cap in the helper. Ours cannot flash a fourth time in a second.

See the clips on their move pages: [swipe-continues](/moves/swipe-continues), [word-portal](/moves/word-portal) and [exposure-flash](/moves/exposure-flash). For why short exits help any of these, read about [easing as a vocabulary](/blog/easing). The framework is at [github.com/Vandit1604/vawe](https://github.com/Vandit1604/vawe).

## In the code

- `taste/craft/transitions.md`: the families and the banned tells.
- `skills/vawe-transitions/SKILL.md`: the per-cut procedure.
- `harness/lib/slideshow.mjs`: the ten tells and the score.
- Commits: [`f12a9f516`](https://github.com/Vandit1604/vawe/commit/f12a9f516) families, skill and handoff column, [`a5a50e80e`](https://github.com/Vandit1604/vawe/commit/a5a50e80e) slideshow check, [`dac155c18`](https://github.com/Vandit1604/vawe/commit/dac155c18) exposure flash, [`c8d4b7779`](https://github.com/Vandit1604/vawe/commit/c8d4b7779) five handoff moves.
