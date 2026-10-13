---
title: "Duplicate code in a framework: one owner per rule"
description: "Two private copies of one Lab colour formula could differ by about 0.001. How we removed duplicate code from a video framework and gave each rule one owner."
date: 2026-10-10
section: architecture
tags: "refactoring, duplicate code, architecture, agents, ffmpeg"
keywords: "duplicate code, single source of truth, remove dead code, refactoring a framework"
hero: /blog/one-owner/owners.svg
heroAlt: "Before: three ffmpeg gray-frame readers and two Lab colour copies. After: one decodeGray owner and one Lab colour owner that the callers import."
---

Two files in vawe each held a private copy of the Lab colour conversion. Both used rounded matrix constants and a 0.008856 cut. When we pointed both at the constants the spec's own colour measure already used, a colour distance could move by about 0.001. Duplicate code does not break a build. It lets two tools give two answers to one question, and nobody looks at a gap that small.

This post covers the clean-up we did on 2026-10-10, ten days after we [deleted the old scene format](/blog/big-deletion). It was a list of copies, each moved to one owner.

## Why duplicate code appears in an agent-built framework

Agents write much of the code in this repo. An agent that needs a gray frame from a video can write the ffmpeg call it needs, test it, and move on. That is a fair local choice. Repeated over a few days, it gives you three copies.

This is the list we found:

- Three readers ran the same ffmpeg gray-frame call: the flash probe, the sheet tile diffs and `frameMotion`.
- `tile.mjs` and `color-delta.mjs` each kept a private Lab conversion.
- A second audio bake, `harness/media/gen-audio.mjs`, did the job of `generators/media/audio-bake.mjs`.
- Sound advice lived in several rules: `sound-default-on`, `cue-sparse`, `sound-swell` and `cue-has-event`.
- Several checks held their own thresholds instead of reading one file.
- Twelve exports had no caller, and GSAP was still a dependency that nothing used.

## Why a list was not enough

A list of copies does not stop the next copy. Agents read the code they are shown. If the owner of a rule is easy to find and easy to import, they use it. If the rule sits inside a verb file, they write another one.

So we did two things. We moved each rule to one named file, and we made each move cheap to check: every commit says what must stay the same.

## What we built: one owner per rule

The rule is simple. A formula, a threshold or a decoder has one owning module. When a second caller needs it, you move it to the owner, switch the old callers, check that behaviour did not change, and only then add the new caller.

![Before and after diagram: three gray-frame readers and two Lab copies become two owner modules](/blog/one-owner/owners.svg)

Here is each move.

Gray frames. `decodeGray` now owns the fps, scale and `format=gray` chain (commit [652d903e3](https://github.com/Vandit1604/vawe/commit/652d903e3)). The flash probe, the sheet tile diffs and `frameMotion` call it with their own scale flags, so each reads the same bytes as before. We left `lumaSeries` and `readFeatures` alone. They decode two outputs and rgb, so they only look like the same code. Merging blocks because they look alike is a different mistake.

Lab colour. `harness/lib/ref-measure/colour.mjs` holds `linearToLab`, `labOf` and `labToHex`. The tile distance and the hex distance now use it ([92c4e90c0](https://github.com/Vandit1604/vawe/commit/92c4e90c0)). This one is not a pure refactor, because the distance can move by about 0.001. We kept it in its own commit so the number change is easy to find.

Import direction. `measureFile` (the loudness of a file) moved to `harness/lib/loudness.mjs`, so `lib/sound-read` no longer imports `media/page-audio`. `resolveInput` and its cut readers moved to `see/input.mjs`, so `one-input`, `zoom`, `onion` and `look` no longer import the `strip` verb ([21ec9530e](https://github.com/Vandit1604/vawe/commit/21ec9530e)). A side effect: a file with no audio stream now throws a message that says so, not a `TypeError`.

Sound rules. `taste/craft/sound.md` is the one owner. `sound-default-on` folds into `sound-voices`. `cue-sparse`, `sound-swell` and `cue-has-event` fold into `sound-cues` ([25e1ef4e9](https://github.com/Vandit1604/vawe/commit/25e1ef4e9)). The commit changed 25 files, with 75 lines added and 711 removed.

Thresholds. Checks that held their own numbers now read `taste/build/limits.json`, with a 48-line test that the readers agree ([1ef374770](https://github.com/Vandit1604/vawe/commit/1ef374770), 18 files, +151 -40).

Dead code. One commit removed 12 dead exports and the second audio bake: 20 files, +21 -189 ([c78b442e9](https://github.com/Vandit1604/vawe/commit/c78b442e9)). Another removed GSAP, the plugin files, the vendor script and the dependency: 19 files, +51 -129 ([2e4db31f0](https://github.com/Vandit1604/vawe/commit/2e4db31f0)).

## The result in numbers

![Bar chart of lines added and removed in seven de-duplication commits](/blog/one-owner/diff-size.svg)

| Commit | What moved | Files | Added | Removed |
|---|---|---|---|---|
| 25e1ef4e9 | sound rules to one owner | 25 | 75 | 711 |
| c78b442e9 | 12 dead exports, second audio bake | 20 | 21 | 189 |
| 2e4db31f0 | GSAP | 19 | 51 | 129 |
| 21ec9530e | `measureFile`, `resolveInput` | 13 | 102 | 51 |
| 1ef374770 | thresholds to `limits.json` | 18 | 151 | 40 |
| 652d903e3 | `decodeGray` | 5 | 57 | 12 |
| 92c4e90c0 | one Lab owner | 5 | 55 | 39 |

The net effect is a framework with fewer lines that does the same work. The only behaviour change we expect to see is the 0.001 shift in a colour distance.

We did not measure render time or agent success before and after this pass. We make no claim that it made films better. We claim only that each rule now has one place to change.

## What we would tell you if you build the same thing

Search for the concept, not for your name for it. If an agent writes `labDeltaE` and another writes `deltaE`, a grep for the first name finds one copy.

Move first, then add. The order in the commit log matters. Move the rule to its owner, switch the old callers, run the checks, and only then add the new caller. That way a failing test points to one change.

Keep number changes out of refactor commits. A commit that says "same bytes as before" is easy to trust. A commit that moves a distance by 0.001 should say so in its subject.

Delete the dead export. An export with no caller is a second way to say something, and an agent will find it and use it.

The [moves library](/moves) shows the kind of page this framework renders. For the wider context, read [why we deleted the JSON format](/blog/html-over-json) and the [full list of what we stopped doing](/blog/big-deletion). The framework is open source at [github.com/Vandit1604/vawe](https://github.com/Vandit1604/vawe).

## In the code

- `harness/lib/ref-measure/colour.mjs`: the Lab owner.
- `harness/lib/loudness.mjs` and `harness/media/see/input.mjs`: the moved owners.
- `taste/build/limits.json`: the thresholds.
- [92c4e90c0](https://github.com/Vandit1604/vawe/commit/92c4e90c0): one Lab owner.
- [652d903e3](https://github.com/Vandit1604/vawe/commit/652d903e3): one gray-frame decoder.
- [c78b442e9](https://github.com/Vandit1604/vawe/commit/c78b442e9): 12 dead exports and the second audio bake.
- [25e1ef4e9](https://github.com/Vandit1604/vawe/commit/25e1ef4e9): one sound owner.
