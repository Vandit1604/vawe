---
title: "Single source of truth in code: one owner per rule"
description: "A single source of truth in code means one module per formula, threshold or decoder. Two copies of our Lab colour maths could disagree by about 0.001."
date: 2026-10-10
updated: 2026-10-13
section: architecture
tags: "refactoring, duplicate code, single source of truth, architecture, agents"
keywords: "single source of truth code, duplicate code refactoring, one owner per rule, remove dead exports"
hero: /blog/one-owner/owners.webp
heroAlt: "Before: three ffmpeg gray-frame readers and two Lab colour copies. After: one decodeGray owner and one Lab colour owner that the callers import."
---

Every formula, threshold and decoder in a codebase should have exactly one owning module, and a codebase that agents write needs this rule more than one that people write. Duplicate code does not break a build. It lets two tools give two answers to one question, and nobody looks when the gap is small. In vawe, two files each held a private copy of the Lab colour conversion, with rounded matrix constants and a 0.008856 cut. Pointed at the constants our spec's own colour measure used, a colour distance could move by about 0.001.

This pass was part of the cleanup after vawe moved to one web page per film (the [HTML to video page contract](/blog/page-contract) is the hub for that story). The rule we follow: when a second caller needs a rule, move the rule to its owner, switch the old callers, check that behaviour did not change, and only then add the new caller.

## Why agents make copies

An agent that needs a gray frame from a video can write the ffmpeg call it needs, test it, and move on. That is a fair local choice. Repeated over a few days, it gives you three copies. Agents read the code they are shown. If the owner of a rule is easy to find and import, they use it. If the rule sits inside a verb file, they write another one.

On 2026-10-10, ten days after the [205,163-line deletion of our old format](/blog/big-deletion), we went looking. This is what we found:

- Three readers ran the same ffmpeg gray-frame call: the flash probe, the sheet tile diffs and `frameMotion`.
- `tile.mjs` and `color-delta.mjs` each kept a private Lab conversion.
- A second audio bake, `harness/media/gen-audio.mjs`, did the job of `generators/media/audio-bake.mjs`.
- Sound advice lived in four rules: `sound-default-on`, `cue-sparse`, `sound-swell` and `cue-has-event`.
- Several checks held their own thresholds instead of reading one file.
- Twelve exports had no caller, and GSAP was still a dependency that nothing used.

A list of copies does not stop the next copy, so the evidence below is about the moves we made and what each one cost.

## The evidence: seven moves, one behaviour change

![Before and after diagram: three gray-frame readers and two Lab copies become two owner modules](/blog/one-owner/owners.webp)

Gray frames. `decodeGray` now owns the fps, scale and `format=gray` chain ([91f6b6e7a](https://github.com/Vandit1604/vawe/commit/91f6b6e7a)). The flash probe, the tile diffs and `frameMotion` call it with their own scale flags, so each reads the same bytes as before.

Lab colour. `harness/lib/ref-measure/colour.mjs` holds `linearToLab`, `labOf` and `labToHex`, and the tile distance and the hex distance use it ([15c5a5d8d](https://github.com/Vandit1604/vawe/commit/15c5a5d8d)). This is the one move that is not a pure refactor, because the distance can shift by about 0.001. It sits in its own commit so the number change is easy to find.

Import direction. `measureFile` (the loudness of a file) moved to `harness/lib/loudness.mjs`, so `lib/sound-read` no longer imports `media/page-audio`. `resolveInput` and its cut readers moved to `harness/media/see/input.mjs`, so `one-input`, `zoom`, `onion` and `look` no longer import the `strip` verb ([0ec440afe](https://github.com/Vandit1604/vawe/commit/0ec440afe)). A file with no audio stream now throws a message that says so, not a `TypeError`.

Sound rules. `taste/craft/sound.md` is the one owner. `sound-default-on` folds into `sound-voices`, and `cue-sparse`, `sound-swell` and `cue-has-event` fold into `sound-cues` ([9a89c1791](https://github.com/Vandit1604/vawe/commit/9a89c1791)).

Thresholds. Checks that held their own numbers now read `taste/build/limits.json`, with a 48-line test that the readers agree ([046ec5ef8](https://github.com/Vandit1604/vawe/commit/046ec5ef8)).

Dead code. One commit removed 12 dead exports and the second audio bake ([f4bae3b2a](https://github.com/Vandit1604/vawe/commit/f4bae3b2a)). Another removed GSAP, the plugin files, the vendor script and the dependency ([9dd02632d](https://github.com/Vandit1604/vawe/commit/9dd02632d)). An export with no caller is a second way to say something, and an agent will find it and use it.

![Bar chart of lines added and removed in seven de-duplication commits](/blog/one-owner/diff-size.webp)

| Commit | What moved | Files | Added | Removed |
|---|---|---|---|---|
| 9a89c1791 | sound rules to one owner | 25 | 75 | 711 |
| f4bae3b2a | 12 dead exports, second audio bake | 20 | 21 | 189 |
| 9dd02632d | GSAP | 19 | 51 | 129 |
| 0ec440afe | `measureFile`, `resolveInput` | 13 | 102 | 51 |
| 046ec5ef8 | thresholds to `limits.json` | 18 | 151 | 40 |
| 91f6b6e7a | `decodeGray` | 5 | 57 | 12 |
| 15c5a5d8d | one Lab owner | 5 | 55 | 39 |

The framework does the same work in fewer lines. The only behaviour change we expect is the 0.001 shift in a colour distance, and it is labelled.

## The strongest objection: "these blocks only look alike"

Merging code because it looks the same is its own mistake, and we nearly made it. `lumaSeries` and `readFeatures` also call ffmpeg for frames, but they decode two outputs and rgb. They only look like the gray-frame readers, so we left them alone. Our answer to the objection is the test we apply: two blocks share an owner when they encode the same knowledge, and a change to one must change the other. Shape alone is not enough.

A second objection is cost: seven commits of moving code produce no new feature. That is true. The return is that each rule now has one place to change, and a commit that says "same bytes as before" is easy to trust.

## Where we could be wrong

We did not measure render time or agent success before and after this pass, so we make no claim that it made films better. A search by name also misses copies with a different name: if one agent writes `labDeltaE` and another writes `deltaE`, a grep for the first finds one copy. We search for the concept, and we may still have missed some.

The same rule keeps agent docs short, as the post on [how long AGENTS.md should be](/blog/read-load) shows. For how this fits the wider architecture, start at the [page contract for rendering HTML to video](/blog/page-contract), and see the [moves library](/moves) for the kind of page this framework renders.
