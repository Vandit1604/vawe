# Migration: where each old rule went

Contents:
- [Decisions](#decisions)
- [The ten rulings as applied](#the-ten-rulings-as-applied)
- [Checks that still hold their own numbers](#checks-that-still-hold-their-own-numbers)
- [Table](#table)

Phase 1 of the taste pass. The old homes were the files under engine-doctrine/: TASTE-CARD, TASTE-CARD-DIGEST,
taste-steps.json, attractors.json, RULES/*, TASTE, MOTION-CRAFT and the taste guides of CRAFT/. Every numbered rule, table
row and rule-like section of those files has one row below.
The last column is a rule id (a file in `taste/rules/`), `craft: <path>` (guidance with no limit, kept in a craft
doc), or `deleted: <reason>`.

449 rows: 432 placed in a rule or a craft doc, 17 deleted.

## Decisions

- Moved with `git mv` into `taste/craft/`, numbers replaced by links to rule ids: STORY, SELECTION, DIRECTION,
  FILM-STRUCTURE, GRAMMAR, TYPOGRAPHY, COLOR, LAYOUT, IMAGERY, SURFACES, SCREENS, DENSITY, SHOW-DONT-TELL, CONTENT,
  READING, TRANSITIONS, EYE-TRACE, MOTION-STANDARDS, MOTION-REGISTERS, AFTER-EFFECTS-TECHNIQUES, SOUND,
  TASTE-RULES (now failure-modes), TASTE (now law) and MOTION-CRAFT (now motion-craft).
- Borderline, moved: CONTENT (its rulings on theme source and screens are taste), SELECTION (it picks a look),
  GRAMMAR and READING (evidence for taste rules).
- Borderline, left in `engine-doctrine/CRAFT/`: PITCH (a procedure for an unformed brief), FRAME-SPEC (a storyboard
  contract), REVIEW-STOPS, LAUNCH-REFERENCE (links), and the engine and process guides ENGINE-CHANGES, SUBAGENTS,
  COMMAND-OUTPUT, ROUTING, WRITING-FOR-AGENTS, RECREATION, REFERENCE-STUDY. README is rewritten (its JSON-era text is gone).
- Left in place, not in this phase: `engine-doctrine/DESIGN-DATABASE.md` (a catalog of techniques and numbers),
  `JUDGE.md`, `ASSET-SOURCES.md`.
- AFTER-EFFECTS-TECHNIQUES stays a reference of one practitioner's dials. Its recipes are not rules; its stagger and
  overshoot lines now point to the rules.
- Card rule 12 split: the general part is `typeface-default` and `palette-from-brand`; the vawe facts are
  `taste/brand/vawe.md`.
- Rules marked `scored: yes` are the ones the old card scored (34 files from the 15 card rules). The judge reads only
  those, so the judge scoring surface is unchanged. Every other rule is advice until a later phase marks it scored.
- Extra reconciliations, not in the ten rulings: the accent share (COLOR said 10 percent and 15 to 25 percent, the card
  said never a flood) is one range in `accent-share`; hero to caption contrast (3.4 to 4 against 5 to 8) is 4 to 8 in
  `hierarchy`; margins (inner 90 percent, 8 percent, 0.06 of the short edge) are one rule `safe-margin`; payoff at
  77 to 90 percent (payoff-last) against 80 to 90 percent (STORY) is 77 to 90 in `hook-payoff`; anticipation (2 to 4
  percent dip against a 10 to 20 percent counter-move) is two stated ranges in `anticipation`.

## The ten rulings as applied

1. Exit easing: `exits-shorter` (EASE.launch; EASE.leave only for a settle or hand-off the page names).
2. Frame 0: `first-frame` (the subject is on screen at frame 0, motion may start 0 to 0.3 s later).
3. Ease-out: `named-eases` bans the CSS keywords as a default; `entrance-ease` uses EASE.land.
4. cubic-bezier: removed from the craft docs; EASE names only.
5. Cut share: `hard-cut-default` (50 to 95 percent by pace); `seam-variety` applies to moving seams only.
6. Stillness: `live-hold` and `moving-tail`.
7. Bounce: `no-bounce` (EASE.pop only where named).
8. World turns: `world-turns` (at least every 2 s or at each beat).
9. UI speed: `speed-bands` applies to product UI in a film; `camera-path-linear` allows linear on interior legs.
10. Same ease: `ease-variety` (1 to 2 eases per scene, offset layers).
Also: `speed-bands` names MOVES and counts frames at 60 fps or in seconds; JSON-era text in CRAFT/README is deleted; the vawe
facts left the general rules; step 2's hand ffmpeg tiles are deleted.

## Checks that read limits.json

Phase 4 moved every number below into `taste/build/limits.json`. Each module imports it (the motion presets import
`core/motion/taste-limits.js`, generated from the same rules, because a page loads them from a folder with no `taste/`).
`tests/lib/limits-readers.test.mjs` pins each value to the number it had before the move.

- `harness/lib/draft-check.mjs` (cap height, LUFS band, text hold), `harness/lib/peak-limit.mjs`, `harness/lib/sheet-tiles.mjs`
- `harness/lib/still-limit.mjs`, `harness/lib/ship-status.mjs` (world seconds, blank runs)
- `harness/lib/read-hold.mjs`, `harness/lib/text-timing.mjs`, `harness/lib/text-contrast.mjs` (per word, floor, contrast ratios)
- `harness/lib/motion-lint.mjs` (linear limit, same-frame group), `core/motion/presets.js` (bands, leave share, stagger)
- The twelve checks added in Phase 4 (`harness/lib/layout-lint.mjs`, `harness/lib/motion-variety.mjs`) read their numbers there from the start.

Still outside `limits.json`, because they are not taste numbers: the frame rate of the group-landing test (60 fps, the final render),
the 30 ms cut, the 0.7 cap-height share of a font, the 4 problem lines a draft prints.

- `harness/lib/directions.mjs` (range check) reads `taste/attractors.json`, not `limits.json`.

## Table

| old file | old rule or heading | new |
|---|---|---|
| engine-doctrine/TASTE-CARD.md | rule 1: subject in the first frame | first-frame |
| engine-doctrine/TASTE-CARD.md | rule 2: turn the world every 1 to 2 beats, nothing static in the last 1 s | world-turns, moving-tail, live-hold |
| engine-doctrine/TASTE-CARD.md | rule 3: one thread carries through | thread |
| engine-doctrine/TASTE-CARD.md | rule 3: each beat shows a real thing, not a word in a box | show-real-thing |
| engine-doctrine/TASTE-CARD.md | rule 4: every mark rides its parent | mark-rides-parent |
| engine-doctrine/TASTE-CARD.md | rule 5: entrances ease out, no scale(0) | entrance-ease |
| engine-doctrine/TASTE-CARD.md | rule 5: exits shorter and accelerating | exits-shorter |
| engine-doctrine/TASTE-CARD.md | rule 6: real physics, no hand-fitted cubic-bezier | named-eases, real-physics |
| engine-doctrine/TASTE-CARD.md | rule 7: reveal mask clears the glyphs | reveal-mask-pad |
| engine-doctrine/TASTE-CARD.md | rule 8: speed bands, slowest 3x the fastest | speed-bands |
| engine-doctrine/TASTE-CARD.md | rule 8: stagger on a 30 to 80 ms gap | stagger |
| engine-doctrine/TASTE-CARD.md | rule 9: cap height at least 6 percent | readable-text-size |
| engine-doctrine/TASTE-CARD.md | rule 9: hold max(1.2 s, words/3), words x 0.6 s | readable-hold |
| engine-doctrine/TASTE-CARD.md | rule 10: each seam changes axis or direction | seam-variety |
| engine-doctrine/TASTE-CARD.md | rule 10: land within 0.30 of the diagonal of the eye | eye-trace |
| engine-doctrine/TASTE-CARD.md | rule 10: never a crossfade as the only transition | crossfade-limit |
| engine-doctrine/TASTE-CARD.md | rule 11: one focal point, one accent per frame | one-focal-point, accent-share |
| engine-doctrine/TASTE-CARD.md | rule 11: per-word colour on one or two words, name the target | word-colour, eye-path |
| engine-doctrine/TASTE-CARD.md | rule 12: vawe ground #16151a, cobalt sparingly | craft: taste/brand/vawe.md |
| engine-doctrine/TASTE-CARD.md | rule 12: any other brand takes the kit face and surface, no Inter, no pure #000 or #fff | typeface-default, palette-from-brand |
| engine-doctrine/TASTE-CARD.md | rule 12: never a full-frame cobalt flood | accent-share |
| engine-doctrine/TASTE-CARD.md | rule 13: sound peak and loudness | sound-level |
| engine-doctrine/TASTE-CARD.md | rule 13: quiet ticks, no impact, braam, drop or riser | sound-voices |
| engine-doctrine/TASTE-CARD.md | rule 13: at most one soft swell, no whoosh on every cut | sound-swell |
| engine-doctrine/TASTE-CARD.md | rule 14: no generated tells (gradient text, corner labels, glow on UI, bursts, shake) | no-tells |
| engine-doctrine/TASTE-CARD.md | rule 14: clean gradients, 1 to 2 percent grain | gradient-grain |
| engine-doctrine/TASTE-CARD.md | rule 14: no attractor the direction did not choose | attractors |
| engine-doctrine/TASTE-CARD.md | rule 14: at most one of three directions made of light | three-materials |
| engine-doctrine/TASTE-CARD.md | rule 14: a stock device at most once per film | stock-device-once |
| engine-doctrine/TASTE-CARD.md | rule 15: one entrance per beat with an origin | entrance-origin |
| engine-doctrine/TASTE-CARD.md | rule 15: no bouncy overshoot the brief did not ask for | no-bounce |
| engine-doctrine/TASTE-CARD.md | doc rows not kept: logo slam held still | deleted: contradicted by moving-tail; the rule keeps the reason |
| engine-doctrine/TASTE-CARD.md | doc rows not kept: cyan/purple gradient as an outright ban | gradient-or-flat |
| engine-doctrine/TASTE-CARD.md | doc rows not kept: UI animations stay under 300 ms, reduced-motion, interruption | craft: taste/craft/motion-standards.md |
| engine-doctrine/TASTE-CARD.md | doc rows not kept: EYE-TRACE retired gate, weights, RECOVER | deleted: retired gate, no measure |
| engine-doctrine/TASTE-CARD.md | doc rows not kept: speed-bands JSON recipes, readable-hold gate codes | deleted: JSON-era syntax |
| engine-doctrine/TASTE-CARD.md | attractors: glowing circle, orb or disc | attractors |
| engine-doctrine/TASTE-CARD.md | attractors: dusk sun, crescent, Vesper names | attractors |
| engine-doctrine/TASTE-CARD.md | attractors: lens streaks, light beams, sheen bands, accent bars, rule lines | stock-device-once, attractors |
| engine-doctrine/TASTE-CARD.md | attractors: the same seam move twice | seam-variety |
| engine-doctrine/TASTE-CARD.md | attractors: finance, invoice or accounts tool as the product | attractors |
| engine-doctrine/TASTE-CARD.md | attractors: three directions in one material | three-materials |
| engine-doctrine/TASTE-CARD.md | anti-pattern A: the empty opening | first-frame |
| engine-doctrine/TASTE-CARD.md | anti-pattern B: the reveal cuts the letters | reveal-mask-pad, gradient-grain |
| engine-doctrine/TASTE-CARD.md | anti-pattern C: the stray dot | mark-rides-parent |
| engine-doctrine/TASTE-CARD.md | anti-pattern D: one colour field for half the film | world-turns, accent-share |
| engine-doctrine/TASTE-CARD.md | anti-pattern E: the static lockup tail | moving-tail, thread, readable-text-size |
| engine-doctrine/TASTE-CARD.md | how to use step 1: name thread, eye path, speed band in the plan | thread, eye-path, speed-bands |
| engine-doctrine/TASTE-CARD.md | how to use step 2: make the dense sheet with hand ffmpeg tiles | deleted: bin/vawe dev makes the sheet; no hand ffmpeg tiles (ruling) |
| engine-doctrine/TASTE-CARD.md | how to use step 3: check each rule in order, measure sound | sound-level |
| engine-doctrine/TASTE-CARD.md | how to use step 4: compare with the five anti-pattern frames | first-frame |
| engine-doctrine/TASTE-CARD.md | how to use step 5: ship only when all rules hold | deleted: process step, now in AGENTS.md and the ship verdict |
| engine-doctrine/TASTE-CARD-DIGEST.md | digest line 1 to 15 | deleted: duplicate of the card rules; the digest is now generated from the digest field of each rule |
| engine-doctrine/TASTE-CARD-DIGEST.md | attractors line | attractors |
| engine-doctrine/TASTE-CARD-DIGEST.md | also: choose the hero from the direction | attractors |
| engine-doctrine/TASTE-CARD-DIGEST.md | also: a disc needs a light source and a surface | attractors |
| engine-doctrine/TASTE-CARD-DIGEST.md | also: a crossfade between two busy frames goes muddy | crossfade-limit |
| engine-doctrine/TASTE-CARD-DIGEST.md | also: first drafts score 6/10 on motion, overlap a slower second move | arrival-rhythm |
| engine-doctrine/TASTE-CARD-DIGEST.md | also: banned unless the brief asks: centred title on a gradient, fake product UI, em dash, hook over 12 words | no-tells, show-real-thing, no-emdash-on-screen, hook-payoff |
| engine-doctrine/TASTE-CARD-DIGEST.md | also: the judge varies about 1 point per axis | deleted: kept as the footer line of the generated digest, no rule |
| engine-doctrine/taste-steps.json | concept: thread | thread |
| engine-doctrine/taste-steps.json | concept: attractor hero | attractors |
| engine-doctrine/taste-steps.json | concept: three materials | three-materials |
| engine-doctrine/taste-steps.json | concept: subject by 0.1 s | first-frame |
| engine-doctrine/taste-steps.json | concept: turn the world | world-turns |
| engine-doctrine/taste-steps.json | concept: focal point and accent | one-focal-point |
| engine-doctrine/taste-steps.json | concept: kit face and ground | typeface-default |
| engine-doctrine/taste-steps.json | motion: enter ease-out, exit shorter | exits-shorter |
| engine-doctrine/taste-steps.json | motion: curves from curveToLinear | named-eases |
| engine-doctrine/taste-steps.json | motion: speed bands | speed-bands |
| engine-doctrine/taste-steps.json | motion: stagger | stagger |
| engine-doctrine/taste-steps.json | motion: change axis at every seam | seam-variety |
| engine-doctrine/taste-steps.json | motion: cut, wipe or match, not a crossfade | crossfade-limit |
| engine-doctrine/taste-steps.json | motion: entrance with an origin | entrance-origin |
| engine-doctrine/taste-steps.json | motion: stock device once | stock-device-once |
| engine-doctrine/taste-steps.json | sound: quiet ticks | sound-voices |
| engine-doctrine/taste-steps.json | sound: one soft swell | sound-swell |
| engine-doctrine/taste-steps.json | sound: peak and LUFS | sound-level |
| engine-doctrine/taste-steps.json | sound: cue the first and the last key word | cue-sparse |
| engine-doctrine/taste-steps.json | sound: tie each cue to a visible event | cue-has-event |
| engine-doctrine/taste-steps.json | preship: subject at 0.1 s | first-frame |
| engine-doctrine/taste-steps.json | preship: end on motion | moving-tail |
| engine-doctrine/taste-steps.json | preship: marks ride their parent | mark-rides-parent |
| engine-doctrine/taste-steps.json | preship: mask padding | reveal-mask-pad |
| engine-doctrine/taste-steps.json | preship: 6 percent cap height and hold | readable-text-size, readable-hold |
| engine-doctrine/taste-steps.json | preship: accent not a flood | accent-share |
| engine-doctrine/taste-steps.json | preship: clean gradients | gradient-grain |
| engine-doctrine/attractors.json | names: light-poetry words | attractors |
| engine-doctrine/attractors.json | shapes: circle, orb, disc, sun, crescent words | attractors |
| engine-doctrine/RULES/INDEX.md | contract 1: deterministic | deleted: duplicate of the page contract in AGENTS.md |
| engine-doctrine/RULES/INDEX.md | contract 2: seek-safe | deleted: duplicate of the page contract in AGENTS.md |
| engine-doctrine/RULES/INDEX.md | contract 3: one cut family | one-cut-family |
| engine-doctrine/RULES/INDEX.md | contract 4: the backdrop turns | world-turns |
| engine-doctrine/RULES/INDEX.md | contract 5: something continuous crosses every cut | thread |
| engine-doctrine/RULES/banned-defaults.md | look: gradient text | no-tells |
| engine-doctrine/RULES/banned-defaults.md | look: cyan/purple or a random gradient | gradient-or-flat |
| engine-doctrine/RULES/banned-defaults.md | look: identical-weight card grid | hierarchy |
| engine-doctrine/RULES/banned-defaults.md | look: everything centred, equal weight | asymmetry, one-focal-point |
| engine-doctrine/RULES/banned-defaults.md | look: Inter or Space Grotesk with no brand reason | typeface-default |
| engine-doctrine/RULES/banned-defaults.md | look: pure #000 or #fff | palette-from-brand |
| engine-doctrine/RULES/banned-defaults.md | look: centred title on a gradient | no-tells |
| engine-doctrine/RULES/banned-defaults.md | look: corner labels and frame borders | no-tells |
| engine-doctrine/RULES/banned-defaults.md | look: glow on UI text or chrome | no-tells |
| engine-doctrine/RULES/banned-defaults.md | look: fake product UI | show-real-thing |
| engine-doctrine/RULES/banned-defaults.md | look: two things fighting for attention | one-focal-point |
| engine-doctrine/RULES/banned-defaults.md | motion: everything fading in | entrance-origin |
| engine-doctrine/RULES/banned-defaults.md | motion: ease-out on everything | named-eases |
| engine-doctrine/RULES/banned-defaults.md | motion: bouncy overshoot | no-bounce |
| engine-doctrine/RULES/banned-defaults.md | motion: an exit as slow as its entrance | exits-shorter |
| engine-doctrine/RULES/banned-defaults.md | motion: a crossfade as the only transition | crossfade-limit |
| engine-doctrine/RULES/banned-defaults.md | motion: same direction on adjacent transitions | seam-variety |
| engine-doctrine/RULES/banned-defaults.md | motion: particle bursts, rings, RGB split, shake, flares | no-tells |
| engine-doctrine/RULES/banned-defaults.md | motion: a group landing on one frame | stagger |
| engine-doctrine/RULES/banned-defaults.md | motion: dead time nobody declared | live-hold |
| engine-doctrine/RULES/banned-defaults.md | escape valve: declare a ban in the page with a reason | deleted: covered by the Waivers section of AGENTS.md; each rule has a break-when field |
| engine-doctrine/RULES/blur-out-dense.md | blur out dense layers | blur-out-dense |
| engine-doctrine/RULES/continuous-object.md | one object survives a cut, or name what else holds the film | thread |
| engine-doctrine/RULES/ease-direction.md | entrances ease out, exits ease in, handover eases in-out | entrance-ease, exits-shorter, handoff-duration |
| engine-doctrine/RULES/ease-direction.md | the three cubic-bezier values | deleted: hand-fitted cubic-bezier is banned; EASE names replace them (ruling 4) |
| engine-doctrine/RULES/first-arrival.md | nothing arrives at t=0, offset 0.1 to 0.3 s | first-frame |
| engine-doctrine/RULES/logo-prominence.md | a mark reads as the brand, not punctuation | logo-prominence |
| engine-doctrine/RULES/no-jolt.md | a move never jumps speed frame to frame | no-dead-stop |
| engine-doctrine/RULES/one-cut-family.md | one transition family, 2 to 3 earned accents | one-cut-family |
| engine-doctrine/RULES/paired-directional-exit.md | enter and exit in one direction | paired-exit-direction |
| engine-doctrine/RULES/payoff-last.md | hook of 12 words or fewer, payoff at 77 to 90 percent | hook-payoff |
| engine-doctrine/RULES/payoff-last.md | no em dash in on-screen text | no-emdash-on-screen |
| engine-doctrine/RULES/readable-hold.md | hold floor 1.2 s, words/3, words x 0.6 s | readable-hold |
| engine-doctrine/RULES/speed-bands.md | four named bands, slowest 3x the fastest | speed-bands |
| engine-doctrine/RULES/speed-bands.md | no two independent layers share one ease in one beat | ease-variety |
| engine-doctrine/RULES/stagger-total.md | a staggered group totals at most 0.5 s | stagger |
| engine-doctrine/RULES/text-on-flat.md | headline on a flat patch, contrast 3:1 and 4.5:1 | text-contrast |
| engine-doctrine/RULES/video-scale.md | hero art 60 to 80 percent, headline 84 px | hero-scale |
| engine-doctrine/RULES/world-turns.md | the backdrop changes tone per beat | world-turns |
| engine-doctrine/TASTE.md | the one law: every frame fights for its value | beat-earns-time |
| engine-doctrine/TASTE.md | competent is not directed: reach for a family fewer films use | name-three-reject-first |
| engine-doctrine/TASTE.md | spines table: house style, composition, motion, direction, structure, story | craft: taste/craft/law.md |
| engine-doctrine/TASTE.md | trace every decision to the brand site, brand house-style.md | theme-source, palette-from-brand |
| engine-doctrine/TASTE.md | value test 1: show the real artifact | show-real-thing |
| engine-doctrine/TASTE.md | value test 2: never claim what is not shown | claim-backed |
| engine-doctrine/TASTE.md | value test 3: demonstrate flexibility live | show-real-thing |
| engine-doctrine/TASTE.md | value test 4: a live demo beats a static list | show-real-thing |
| engine-doctrine/TASTE.md | value test 5: legibility of effects | legible-effect |
| engine-doctrine/TASTE.md | value test 6: anchor every element with intent | asymmetry |
| engine-doctrine/TASTE.md | value test 7: real product beats abstract metaphor | show-real-thing |
| engine-doctrine/TASTE.md | value test 8: a click must have a consequence | show-real-thing |
| engine-doctrine/TASTE.md | anti-slop defaults | asymmetry, hierarchy, typeface-default, palette-from-brand, no-emdash-on-screen |
| engine-doctrine/MOTION-CRAFT.md | rule 1: timing is a voice | speed-bands |
| engine-doctrine/MOTION-CRAFT.md | rule 2: ease out in, accelerate out | entrance-ease, exits-shorter |
| engine-doctrine/MOTION-CRAFT.md | rule 3: hierarchy through offset | stagger, arrival-rhythm |
| engine-doctrine/MOTION-CRAFT.md | rule 4: choreograph arrivals, anticipation | arrival-rhythm, anticipation |
| engine-doctrine/MOTION-CRAFT.md | rule 5: settle and hold | readable-hold |
| engine-doctrine/MOTION-CRAFT.md | rule 6: one hero motion per beat | one-hero-motion |
| engine-doctrine/MOTION-CRAFT.md | rule 7: rotate layout archetypes | archetype-rotation |
| engine-doctrine/MOTION-CRAFT.md | rule 8: velocity contrast between beats | live-hold |
| engine-doctrine/MOTION-CRAFT.md | rule 9: cover the hard cut | ground-jump-cover |
| engine-doctrine/MOTION-CRAFT.md | rule 10: type moves like it reads | arrival-rhythm |
| engine-doctrine/MOTION-CRAFT.md | layering: how a designer decides what moves, in order | craft: taste/craft/motion-craft.md |
| engine-doctrine/MOTION-CRAFT.md | layering: primary, secondary, ambient | one-hero-motion, ambient-restraint |
| engine-doctrine/MOTION-CRAFT.md | layering: element life, enter hold exit, handoff 0.8 to 1.0 s | handoff-duration |
| engine-doctrine/MOTION-CRAFT.md | layering: School of Motion six transitions | seam-meaning |
| engine-doctrine/MOTION-CRAFT.md | layering: blend of two still rasters freezes motion | crossfade-limit |
| engine-doctrine/MOTION-CRAFT.md | layering: pitfalls | craft: taste/craft/motion-craft.md |
| engine-doctrine/MOTION-CRAFT.md | speed numbers: per-unit reveal, reveal stagger, stagger total, cycling text | speed-bands, stagger |
| engine-doctrine/MOTION-CRAFT.md | speed numbers: organic stagger | stagger |
| engine-doctrine/MOTION-CRAFT.md | speed numbers: 700 px/s distance and duration | speed-bands |
| engine-doctrine/MOTION-CRAFT.md | arrival rhythm: irregular across a beat, even within a cascade | arrival-rhythm |
| engine-doctrine/MOTION-CRAFT.md | snap: land in 0.2 to 0.3 s | speed-bands |
| engine-doctrine/MOTION-CRAFT.md | snap: keep bounce modest 0.14 to 0.20 | no-bounce |
| engine-doctrine/MOTION-CRAFT.md | snap: overshoot only on things that hold still | no-bounce |
| engine-doctrine/MOTION-CRAFT.md | snap: a counter never overshoots | counter-no-overshoot |
| engine-doctrine/MOTION-CRAFT.md | snap: let the brand own the personality | ease-variety |
| engine-doctrine/MOTION-CRAFT.md | easing table: premium calm entrance, directed entrance, quint, expo, back, sine, circ, exit, speed ramp, stepped | named-eases |
| engine-doctrine/MOTION-CRAFT.md | pivot can travel | craft: taste/craft/motion-craft.md |
| engine-doctrine/MOTION-CRAFT.md | follow-through 0.05 to 0.15 s | follow-through |
| engine-doctrine/MOTION-CRAFT.md | graph editor 1: a key in the middle of a move should not stop | camera-path-linear |
| engine-doctrine/MOTION-CRAFT.md | graph editor 2: the shape of a key is the speed graph | craft: taste/craft/motion-craft.md |
| engine-doctrine/MOTION-CRAFT.md | reading the tells table | entrance-ease, named-eases, no-bounce, exits-shorter |
| engine-doctrine/MOTION-CRAFT.md | genre pacing table | craft: taste/craft/story.md |
| engine-doctrine/MOTION-CRAFT.md | do/dont: counter easing, ambient pulse, stagger board cards, scale travel | counter-no-overshoot, ambient-restraint, stagger |
| engine-doctrine/MOTION-CRAFT.md | cut or transition: default to the hard cut | hard-cut-default |
| engine-doctrine/MOTION-CRAFT.md | cut or transition: cut to the beat | cut-on-beat |
| engine-doctrine/MOTION-CRAFT.md | cut or transition: a transition states a relationship | seam-meaning |
| engine-doctrine/MOTION-CRAFT.md | cut or transition: master a few | one-cut-family |
| engine-doctrine/MOTION-CRAFT.md | effect choice by feeling: kinetic type, cuts, stings | craft: taste/craft/motion-craft.md |
| engine-doctrine/MOTION-CRAFT.md | effect choice: ambient looks, overlays one per film | ambient-restraint |
| engine-doctrine/MOTION-CRAFT.md | effect choice: motion blur | blur-follows-motion |
| engine-doctrine/MOTION-CRAFT.md | effect choice: colour grades, glow, captions | craft: taste/craft/motion-craft.md |
| engine-doctrine/MOTION-CRAFT.md | does the film ever stop: local not global motion | live-hold |
| engine-doctrine/MOTION-CRAFT.md | does the film ever stop: a dead window | live-hold |
| engine-doctrine/MOTION-CRAFT.md | does the film ever stop: a jolt over 600 px/s | no-dead-stop |
| engine-doctrine/MOTION-CRAFT.md | what code guarantees | deleted: describes checks; the check ids are in each rule |
| engine-doctrine/CRAFT/TASTE-RULES.md | guardrail: one ease on every tween, no more than two with the same ease | ease-variety |
| engine-doctrine/CRAFT/TASTE-RULES.md | guardrail: one speed on everything | speed-bands |
| engine-doctrine/CRAFT/TASTE-RULES.md | guardrail: everything from one direction | entrance-origin |
| engine-doctrine/CRAFT/TASTE-RULES.md | guardrail: one stagger everywhere | stagger |
| engine-doctrine/CRAFT/TASTE-RULES.md | guardrail: an ambient zoom on every scene | ambient-restraint |
| engine-doctrine/CRAFT/TASTE-RULES.md | guardrail: do not start at t = 0 | first-frame |
| engine-doctrine/CRAFT/TASTE-RULES.md | guardrail: ease out entering, in leaving, in-out moving | entrance-ease, exits-shorter |
| engine-doctrine/CRAFT/TASTE-RULES.md | guardrail: entrances take longer than exits | exits-shorter |
| engine-doctrine/CRAFT/TASTE-RULES.md | guardrail: subtle reads as static, err toward more movement | deleted: no measure; kept as a smell in failure-modes |
| engine-doctrine/CRAFT/TASTE-RULES.md | guardrail: no spring on a counting number | counter-no-overshoot |
| engine-doctrine/CRAFT/TASTE-RULES.md | ease and duration table: easeOutCubic, quart, expo, sine, back, elastic | named-eases |
| engine-doctrine/CRAFT/TASTE-RULES.md | bounce is the first turn-off, seasoning on one accent | no-bounce |
| engine-doctrine/CRAFT/TASTE-RULES.md | failure: effect soup | stock-device-once |
| engine-doctrine/CRAFT/TASTE-RULES.md | failure: slideshow | thread |
| engine-doctrine/CRAFT/TASTE-RULES.md | failure: the white flash | ground-jump-cover |
| engine-doctrine/CRAFT/TASTE-RULES.md | failure: the monotone | speed-bands |
| engine-doctrine/CRAFT/TASTE-RULES.md | failure: chord that should be an arpeggio | stagger |
| engine-doctrine/CRAFT/TASTE-RULES.md | failure: cheap aliveness near text | ambient-restraint |
| engine-doctrine/CRAFT/TASTE-RULES.md | failure: the invisible effect | legible-effect |
| engine-doctrine/CRAFT/TASTE-RULES.md | failure: the unearned claim | claim-backed |
| engine-doctrine/CRAFT/TASTE-RULES.md | failure: centred everything | asymmetry |
| engine-doctrine/CRAFT/TASTE-RULES.md | failure: the dead final frame | moving-tail |
| engine-doctrine/CRAFT/TASTE-RULES.md | restraint: about 95 percent of cuts are hard cuts | hard-cut-default |
| engine-doctrine/CRAFT/TASTE-RULES.md | restraint: role table | hard-cut-default, live-hold |
| engine-doctrine/CRAFT/TASTE-RULES.md | restraint: one cut family, one accent hue | one-cut-family, accent-share |
| engine-doctrine/CRAFT/TASTE-RULES.md | restraint: budget flexes with register | motion-register |
| engine-doctrine/CRAFT/TASTE-RULES.md | continuity: shared elements travel | thread |
| engine-doctrine/CRAFT/TASTE-RULES.md | continuity: match the seam, pair exits with entrances | paired-exit-direction |
| engine-doctrine/CRAFT/TASTE-RULES.md | continuity: cover a hard ground jump | ground-jump-cover |
| engine-doctrine/CRAFT/TASTE-RULES.md | every beat declares its feeling | beat-earns-time |
| engine-doctrine/CRAFT/MOTION-STANDARDS.md | not transferred: UI under 300 ms | speed-bands |
| engine-doctrine/CRAFT/MOTION-STANDARDS.md | not transferred: frequency of use, interruptibility, reduced-motion, hover, 60 fps transform-only | deleted: no subject in a rendered film (kept as a table in the craft doc) |
| engine-doctrine/CRAFT/MOTION-STANDARDS.md | transfers: easing order, never ease-in on an entrance | entrance-ease |
| engine-doctrine/CRAFT/MOTION-STANDARDS.md | transfers: strong curves, the Kowalski cubic-bezier | named-eases |
| engine-doctrine/CRAFT/MOTION-STANDARDS.md | transfers: asymmetric timing | exits-shorter |
| engine-doctrine/CRAFT/MOTION-STANDARDS.md | transfers: physicality, never scale(0) | entrance-ease |
| engine-doctrine/CRAFT/MOTION-STANDARDS.md | transfers: stagger 30 to 80 ms | stagger |
| engine-doctrine/CRAFT/MOTION-STANDARDS.md | transfers: springs, bounce 0.1 to 0.3 | no-bounce |
| engine-doctrine/CRAFT/MOTION-STANDARDS.md | transfers: origin-aware motion | entrance-origin |
| engine-doctrine/CRAFT/MOTION-STANDARDS.md | transfers: linear for constant motion only | camera-path-linear |
| engine-doctrine/CRAFT/TRANSITIONS.md | prime rule: a transition serves a relationship or it is a hard cut | seam-meaning |
| engine-doctrine/CRAFT/TRANSITIONS.md | Murch rule of six table | craft: taste/craft/transitions.md |
| engine-doctrine/CRAFT/TRANSITIONS.md | invisible or expressive | seam-meaning |
| engine-doctrine/CRAFT/TRANSITIONS.md | taxonomy table of 18 transitions | craft: taste/craft/transitions.md |
| engine-doctrine/CRAFT/TRANSITIONS.md | decision procedure steps 1 to 8 | seam-meaning, cut-on-beat, eye-trace |
| engine-doctrine/CRAFT/TRANSITIONS.md | decision procedure step 9: primary 60 to 70 percent | one-cut-family, seam-variety, hard-cut-default |
| engine-doctrine/CRAFT/TRANSITIONS.md | restraint: the invisible cut dominates | hard-cut-default |
| engine-doctrine/CRAFT/TRANSITIONS.md | speed profiles table | seam-duration |
| engine-doctrine/CRAFT/TRANSITIONS.md | durations at 30 fps | seam-duration |
| engine-doctrine/CRAFT/TRANSITIONS.md | align the beats to the seam | seam-overlap |
| engine-doctrine/CRAFT/TRANSITIONS.md | station to station: camera flight with linear interior legs | camera-path-linear |
| engine-doctrine/CRAFT/TRANSITIONS.md | motion-design layer: shared element | thread |
| engine-doctrine/CRAFT/TRANSITIONS.md | motion-design layer: easing by role, UI under 300 ms | named-eases |
| engine-doctrine/CRAFT/TRANSITIONS.md | motion-design layer: diegetic beats non-diegetic | craft: taste/craft/transitions.md |
| engine-doctrine/CRAFT/TRANSITIONS.md | motion-design layer: choreography, stagger about 60 ms | stagger |
| engine-doctrine/CRAFT/EYE-TRACE.md | the rule: land the incoming subject at the focal point | eye-trace |
| engine-doctrine/CRAFT/EYE-TRACE.md | what the eye picks: ranking | one-focal-point |
| engine-doctrine/CRAFT/EYE-TRACE.md | the eye is steered: light, rack, reveal with light | eye-path |
| engine-doctrine/CRAFT/EYE-TRACE.md | ask this of every beat | eye-path |
| engine-doctrine/CRAFT/EYE-TRACE.md | when a cut makes the eye jump: four fixes | eye-trace |
| engine-doctrine/CRAFT/EYE-TRACE.md | 0.30 working figure | eye-trace |
| engine-doctrine/CRAFT/READING.md | numbers table: words x 0.6 s, 20 cps, 42 chars, 2 frame gap, 5 s ceiling | readable-hold |
| engine-doctrine/CRAFT/READING.md | the hold is the still part | readable-hold |
| engine-doctrine/CRAFT/READING.md | not all text is read | readable-hold |
| engine-doctrine/CRAFT/READING.md | what no rule sees | craft: taste/craft/reading.md |
| engine-doctrine/CRAFT/DENSITY.md | a beat over 3 s carries hero plus proof | hero-plus-proof |
| engine-doctrine/CRAFT/DENSITY.md | the background is not empty, 2 to 5 decoratives | hero-plus-proof |
| engine-doctrine/CRAFT/DENSITY.md | decoratives move slowly | ambient-restraint |
| engine-doctrine/CRAFT/DENSITY.md | held hook or end card may run lean | moving-tail |
| engine-doctrine/CRAFT/DENSITY.md | do not: centred big word, noise, loud support, bare backdrop, corner labels | hero-plus-proof, no-tells |
| engine-doctrine/CRAFT/SHOW-DONT-TELL.md | decoration is not explanation | show-real-thing |
| engine-doctrine/CRAFT/SHOW-DONT-TELL.md | five claim shapes want a graphic | claim-shape-graphic |
| engine-doctrine/CRAFT/SHOW-DONT-TELL.md | the graphic must be the subject, 8 percent floor | graphic-is-subject |
| engine-doctrine/CRAFT/SHOW-DONT-TELL.md | three questions to ask by hand | graphic-is-subject |
| engine-doctrine/CRAFT/SHOW-DONT-TELL.md | where the graphic comes from | image-source-order |
| engine-doctrine/CRAFT/TYPOGRAPHY.md | measure first, never guess the weight | typeface-default |
| engine-doctrine/CRAFT/TYPOGRAPHY.md | bundled faces, banned default faces | typeface-default |
| engine-doctrine/CRAFT/TYPOGRAPHY.md | reject your first instinct | name-three-reject-first, typeface-default |
| engine-doctrine/CRAFT/TYPOGRAPHY.md | do not pair two sans-serifs | typeface-system |
| engine-doctrine/CRAFT/TYPOGRAPHY.md | one expressive face per scene | typeface-system |
| engine-doctrine/CRAFT/TYPOGRAPHY.md | weight contrast 300 against 900 | weight-contrast |
| engine-doctrine/CRAFT/TYPOGRAPHY.md | video sizes not web sizes | hero-scale |
| engine-doctrine/CRAFT/TYPOGRAPHY.md | fill the frame with hero text 60 to 80 percent | hero-scale |
| engine-doctrine/CRAFT/TYPOGRAPHY.md | tracking tighter on display sizes | type-setting |
| engine-doctrine/CRAFT/TYPOGRAPHY.md | the font system: one to three faces with roles | typeface-system |
| engine-doctrine/CRAFT/TYPOGRAPHY.md | choose the face by the signal | craft: taste/craft/typography.md |
| engine-doctrine/CRAFT/TYPOGRAPHY.md | size from a scale | hero-scale, hierarchy |
| engine-doctrine/CRAFT/TYPOGRAPHY.md | weight, tracking, leading, measure | type-setting |
| engine-doctrine/CRAFT/TYPOGRAPHY.md | hierarchy from weight and colour | weight-contrast, hierarchy |
| engine-doctrine/CRAFT/TYPOGRAPHY.md | motion-graphics specifics: thin weights shimmer, no em dash, fonts.ready | weight-contrast, no-emdash-on-screen |
| engine-doctrine/CRAFT/COLOR.md | colours from the brand, declare once as :root properties | palette-from-brand |
| engine-doctrine/CRAFT/COLOR.md | 0: lazy defaults to question | no-tells, palette-from-brand |
| engine-doctrine/CRAFT/COLOR.md | muted is fine, flat is not, accent 15 to 25 percent | accent-share |
| engine-doctrine/CRAFT/COLOR.md | a light canvas is not a dark one swapped | value-dominance |
| engine-doctrine/CRAFT/COLOR.md | 1: decide dominance by looking | value-dominance |
| engine-doctrine/CRAFT/COLOR.md | 2: build from one seed, 60-30-10 | accent-share, palette-from-brand |
| engine-doctrine/CRAFT/COLOR.md | 3: tints and shades without mud | palette-from-brand |
| engine-doctrine/CRAFT/COLOR.md | 4: contrast, overshoot for video type | text-contrast |
| engine-doctrine/CRAFT/COLOR.md | 5: deploy the palette for a mood | craft: taste/craft/color.md |
| engine-doctrine/CRAFT/COLOR.md | 6: gradient or flat, banding in the mp4 | gradient-or-flat, gradient-grain |
| engine-doctrine/CRAFT/COLOR.md | 7: cohesion, one accent | accent-share |
| engine-doctrine/CRAFT/LAYOUT.md | 0: video is not the web (fill the frame, anchor to edges, split frames) | hero-scale, asymmetry |
| engine-doctrine/CRAFT/LAYOUT.md | 0: web sizes are invisible on video | hero-scale |
| engine-doctrine/CRAFT/LAYOUT.md | 0: three planes | craft: taste/craft/layout.md |
| engine-doctrine/CRAFT/LAYOUT.md | 1: one thing dominant, three levels | hierarchy, one-focal-point |
| engine-doctrine/CRAFT/LAYOUT.md | 2: asymmetry over centred | asymmetry |
| engine-doctrine/CRAFT/LAYOUT.md | 3: whitespace and spacing scale | whitespace |
| engine-doctrine/CRAFT/LAYOUT.md | 4: grid, thirds, safe zones | asymmetry, safe-margin |
| engine-doctrine/CRAFT/LAYOUT.md | 4: body measure 45 to 75 characters | type-setting |
| engine-doctrine/CRAFT/LAYOUT.md | 5: archetype by intent, no archetype twice | archetype-rotation |
| engine-doctrine/CRAFT/LAYOUT.md | 6: active and passive whitespace | whitespace |
| engine-doctrine/CRAFT/LAYOUT.md | 7: composition for a frame that moves | asymmetry, whitespace |
| engine-doctrine/CRAFT/IMAGERY.md | 1: sources in order | image-source-order |
| engine-doctrine/CRAFT/IMAGERY.md | 1: fetch logos with curl -f | image-source-order |
| engine-doctrine/CRAFT/IMAGERY.md | 2: the lightest visual | image-source-order |
| engine-doctrine/CRAFT/IMAGERY.md | 3: treat every image | image-treatment |
| engine-doctrine/CRAFT/IMAGERY.md | 4: licensing | licensed-assets |
| engine-doctrine/CRAFT/IMAGERY.md | 5: icons | icon-family |
| engine-doctrine/CRAFT/IMAGERY.md | 5: logo reads at 7 percent of frame height | logo-prominence |
| engine-doctrine/CRAFT/SURFACES.md | build the surface before the film | surface-spec |
| engine-doctrine/CRAFT/SURFACES.md | the design spec in one page | surface-spec |
| engine-doctrine/CRAFT/SURFACES.md | the 8 visual styles | visual-style-one |
| engine-doctrine/CRAFT/SURFACES.md | the backdrop is always a decision | world-turns |
| engine-doctrine/CRAFT/SCREENS.md | why a mock fails | screen-designed |
| engine-doctrine/CRAFT/SCREENS.md | the rules: one focal element, fill, 28 px, whole images | screen-designed |
| engine-doctrine/CRAFT/SCREENS.md | theme source | theme-source |
| engine-doctrine/CRAFT/SCREENS.md | every claim in on-screen copy must be true | claim-backed |
| engine-doctrine/CRAFT/SCREENS.md | check the laid-out page, safe margin 0.06 | safe-margin |
| engine-doctrine/CRAFT/CONTENT.md | the four content numbers | craft: taste/craft/content.md |
| engine-doctrine/CRAFT/CONTENT.md | dense where dense, quiet where quiet | dense-where-dense |
| engine-doctrine/CRAFT/CONTENT.md | theme source (owner ruling) | theme-source |
| engine-doctrine/CRAFT/CONTENT.md | screens (owner ruling) | screen-designed |
| engine-doctrine/CRAFT/CONTENT.md | what real material means | dense-where-dense, screen-designed |
| engine-doctrine/CRAFT/DIRECTION.md | 1: slow in, slow out | entrance-ease, exits-shorter |
| engine-doctrine/CRAFT/DIRECTION.md | 1: timing | speed-bands |
| engine-doctrine/CRAFT/DIRECTION.md | 1: spacing | named-eases |
| engine-doctrine/CRAFT/DIRECTION.md | 1: anticipation | anticipation |
| engine-doctrine/CRAFT/DIRECTION.md | 1: follow-through, overlap | stagger, follow-through |
| engine-doctrine/CRAFT/DIRECTION.md | 1: staging | one-focal-point, one-hero-motion |
| engine-doctrine/CRAFT/DIRECTION.md | 1: secondary action | one-hero-motion |
| engine-doctrine/CRAFT/DIRECTION.md | 1: exaggeration | shot-length-varies |
| engine-doctrine/CRAFT/DIRECTION.md | 1: appeal | deleted: slogan with no measure; its parts live in typeface-default, whitespace, hierarchy |
| engine-doctrine/CRAFT/DIRECTION.md | 1: squash and stretch, arcs, straight-ahead | craft: taste/craft/after-effects-techniques.md |
| engine-doctrine/CRAFT/DIRECTION.md | 2: one landing per moment | one-focal-point, eye-path |
| engine-doctrine/CRAFT/DIRECTION.md | 2: the order of pulls is planned | eye-path |
| engine-doctrine/CRAFT/DIRECTION.md | 2: per-word colour walks the eye | word-colour |
| engine-doctrine/CRAFT/DIRECTION.md | 2: state the eye path | eye-path |
| engine-doctrine/CRAFT/DIRECTION.md | 3: Rule of Six | craft: taste/craft/transitions.md |
| engine-doctrine/CRAFT/DIRECTION.md | 3: cut on the beat | cut-on-beat |
| engine-doctrine/CRAFT/DIRECTION.md | 3: vary the rhythm | shot-length-varies |
| engine-doctrine/CRAFT/DIRECTION.md | 3: the hold between moves, 0.4 to 0.6 s | live-hold |
| engine-doctrine/CRAFT/DIRECTION.md | 3: accelerate toward the climax | shot-length-varies |
| engine-doctrine/CRAFT/DIRECTION.md | 3: read the shape of the energy | craft: taste/craft/direction.md |
| engine-doctrine/CRAFT/DIRECTION.md | 4: one motion idea per beat | one-hero-motion |
| engine-doctrine/CRAFT/DIRECTION.md | 4: two properties on one element make one claim | one-hero-motion |
| engine-doctrine/CRAFT/DIRECTION.md | 4: effects are seasoning | stock-device-once |
| engine-doctrine/CRAFT/DIRECTION.md | 4: one cut family per film | one-cut-family |
| engine-doctrine/CRAFT/DIRECTION.md | 4: continuity over slideshow | thread |
| engine-doctrine/CRAFT/DIRECTION.md | 4: paired directional exits | paired-exit-direction |
| engine-doctrine/CRAFT/DIRECTION.md | 4: blur out when moving would fight the content | blur-out-dense |
| engine-doctrine/CRAFT/DIRECTION.md | 4: name three, reject the first | name-three-reject-first |
| engine-doctrine/CRAFT/DIRECTION.md | 5: hook, build, payoff | hook-payoff |
| engine-doctrine/CRAFT/DIRECTION.md | 5: open loop | hook-payoff |
| engine-doctrine/CRAFT/DIRECTION.md | 5: never spoil the payoff | hook-payoff |
| engine-doctrine/CRAFT/DIRECTION.md | 5: front-load the strong element, 12 words | hook-payoff |
| engine-doctrine/CRAFT/DIRECTION.md | 5: build to a shocker | hook-payoff |
| engine-doctrine/CRAFT/DIRECTION.md | 5: tension and release | shot-length-varies |
| engine-doctrine/CRAFT/DIRECTION.md | 5: honesty | claim-backed |
| engine-doctrine/CRAFT/DIRECTION.md | 5: value test | beat-earns-time |
| engine-doctrine/CRAFT/DIRECTION.md | 6: pre-ship checklist items 1 to 10 | craft: taste/craft/direction.md |
| engine-doctrine/CRAFT/FILM-STRUCTURE.md | continuity without an object: two threads, count your threads | thread |
| engine-doctrine/CRAFT/FILM-STRUCTURE.md | what must survive a cut is an unresolved thing | thread |
| engine-doctrine/CRAFT/FILM-STRUCTURE.md | pace: shots of 0.76 to 3.2 s, median 1.52 s | shot-length-varies |
| engine-doctrine/CRAFT/FILM-STRUCTURE.md | devices tables: spatial, verbal, temporal, conceptual | craft: taste/craft/film-structure.md |
| engine-doctrine/CRAFT/FILM-STRUCTURE.md | sound bridge | sound-bridge |
| engine-doctrine/CRAFT/FILM-STRUCTURE.md | how practitioners decide | craft: taste/craft/film-structure.md |
| engine-doctrine/CRAFT/FILM-STRUCTURE.md | a decision aid | craft: taste/craft/film-structure.md |
| engine-doctrine/CRAFT/FILM-STRUCTURE.md | causality: what made the cut happen | beat-cause |
| engine-doctrine/CRAFT/GRAMMAR.md | the numbers: shot length and motion | shot-length-varies |
| engine-doctrine/CRAFT/GRAMMAR.md | pattern 1: a beat is a burst then a rest | live-hold |
| engine-doctrine/CRAFT/GRAMMAR.md | pattern 2: blur-resolve as the entrance | blur-follows-motion |
| engine-doctrine/CRAFT/GRAMMAR.md | pattern 3: the ground inverts on every cut | world-turns |
| engine-doctrine/CRAFT/GRAMMAR.md | pattern 4: three ways to invert a frame | world-turns |
| engine-doctrine/CRAFT/GRAMMAR.md | pattern 5: hold the picture, move the type | craft: taste/craft/grammar.md |
| engine-doctrine/CRAFT/GRAMMAR.md | pattern 6: one accent colour, one word at a time | accent-share, word-colour |
| engine-doctrine/CRAFT/GRAMMAR.md | pattern 7: the loudest frame is often an absence | craft: taste/craft/grammar.md |
| engine-doctrine/CRAFT/GRAMMAR.md | pattern 8: a container that holds while contents change | thread |
| engine-doctrine/CRAFT/GRAMMAR.md | pattern 9: escalate the unit, not just the pace | shot-length-varies |
| engine-doctrine/CRAFT/GRAMMAR.md | pattern 10: word, proof, word, proof | show-real-thing |
| engine-doctrine/CRAFT/GRAMMAR.md | single-film findings | craft: taste/craft/grammar.md |
| engine-doctrine/CRAFT/SELECTION.md | transitions: hard cut 95 percent of the time | hard-cut-default |
| engine-doctrine/CRAFT/SELECTION.md | transitions: one cut family | one-cut-family |
| engine-doctrine/CRAFT/SELECTION.md | faces by register | craft: taste/craft/selection.md |
| engine-doctrine/CRAFT/SELECTION.md | easing: bounce only as seasoning | no-bounce |
| engine-doctrine/CRAFT/SELECTION.md | reference profiles table (linear, apple, stripe, nike, a24, bloomberg, duolingo, vercel) | visual-style-one |
| engine-doctrine/CRAFT/SELECTION.md | choose by decision, not by menu | name-three-reject-first |
| engine-doctrine/CRAFT/SELECTION.md | contradictions to flag | craft: taste/craft/selection.md |
| engine-doctrine/CRAFT/STORY.md | the prime rule: never spoil the payoff | hook-payoff |
| engine-doctrine/CRAFT/STORY.md | the spine: hook, build, proof, payoff, CTA | hook-payoff, cta-last-short |
| engine-doctrine/CRAFT/STORY.md | beat role, persuasion, feeling table | beat-earns-time |
| engine-doctrine/CRAFT/STORY.md | choose a spine: PAS, AIDA and others with timings | craft: taste/craft/story.md |
| engine-doctrine/CRAFT/STORY.md | scene budget: 5 to 7 scenes in 30 s, 8 to 12 in 60 s | scene-budget |
| engine-doctrine/CRAFT/STORY.md | vary scene length, accelerate to the climax | shot-length-varies |
| engine-doctrine/CRAFT/STORY.md | value arc and variety lever | archetype-rotation |
| engine-doctrine/CRAFT/STORY.md | product material to beats | no-inventory |
| engine-doctrine/CRAFT/STORY.md | strip the payoff bare | whitespace |
| engine-doctrine/CRAFT/SOUND.md | sound is the default, silence a device | sound-default-on |
| engine-doctrine/CRAFT/SOUND.md | the mechanism: audio tags, default gains | sound-level |
| engine-doctrine/CRAFT/SOUND.md | keep cues subtle, time to the beat number | cue-has-event |
| engine-doctrine/CRAFT/SOUND.md | the 13 voices | sound-voices |
| engine-doctrine/CRAFT/SOUND.md | what each sound says: whoosh, impact, riser, tick | cue-has-event, sound-swell |
| engine-doctrine/CRAFT/SOUND.md | sync points are scarce | cue-sparse |
| engine-doctrine/CRAFT/SOUND.md | the sound bridge | sound-bridge |
| engine-doctrine/CRAFT/SOUND.md | silence on purpose | sound-default-on |
| engine-doctrine/CRAFT/SOUND.md | how well evidenced is this | craft: taste/craft/sound.md |
| engine-doctrine/CRAFT/SOUND.md | licensing: what may go under a film | music-licence |
| engine-doctrine/CRAFT/MOTION-REGISTERS.md | 1: the two registers | motion-register |
| engine-doctrine/CRAFT/MOTION-REGISTERS.md | 2: Material Design 3 curves and duration bands | craft: taste/craft/motion-registers.md |
| engine-doctrine/CRAFT/MOTION-REGISTERS.md | 3: seven motion devices | craft: taste/craft/motion-registers.md |
| engine-doctrine/CRAFT/MOTION-REGISTERS.md | 4: what can be measured | craft: taste/craft/motion-registers.md |
| engine-doctrine/CRAFT/AFTER-EFFECTS-TECHNIQUES.md | slow in, slow out | entrance-ease |
| engine-doctrine/CRAFT/AFTER-EFFECTS-TECHNIQUES.md | stagger | stagger |
| engine-doctrine/CRAFT/AFTER-EFFECTS-TECHNIQUES.md | overshoot | no-bounce |
| engine-doctrine/CRAFT/AFTER-EFFECTS-TECHNIQUES.md | anticipation | anticipation |
| engine-doctrine/CRAFT/AFTER-EFFECTS-TECHNIQUES.md | follow-through | follow-through |
| engine-doctrine/CRAFT/AFTER-EFFECTS-TECHNIQUES.md | arcs | craft: taste/craft/after-effects-techniques.md |
| engine-doctrine/CRAFT/AFTER-EFFECTS-TECHNIQUES.md | moving hold | live-hold |
| engine-doctrine/CRAFT/AFTER-EFFECTS-TECHNIQUES.md | animate on twos | craft: taste/craft/after-effects-techniques.md |
| engine-doctrine/CRAFT/AFTER-EFFECTS-TECHNIQUES.md | speed ramp | craft: taste/craft/after-effects-techniques.md |
| engine-doctrine/CRAFT/AFTER-EFFECTS-TECHNIQUES.md | motion blur | blur-follows-motion |
| engine-doctrine/CRAFT/AFTER-EFFECTS-TECHNIQUES.md | camera shake | no-tells |
| engine-doctrine/CRAFT/AFTER-EFFECTS-TECHNIQUES.md | whip pan | seam-duration |
| engine-doctrine/CRAFT/AFTER-EFFECTS-TECHNIQUES.md | rack focus | eye-path |
| engine-doctrine/CRAFT/AFTER-EFFECTS-TECHNIQUES.md | 2.5D parallax | craft: taste/craft/after-effects-techniques.md |
| engine-doctrine/CRAFT/AFTER-EFFECTS-TECHNIQUES.md | light sweep | stock-device-once |
| engine-doctrine/CRAFT/AFTER-EFFECTS-TECHNIQUES.md | light rig | eye-path |
| engine-doctrine/CRAFT/AFTER-EFFECTS-TECHNIQUES.md | kinetic type | readable-hold |
| engine-doctrine/CRAFT/AFTER-EFFECTS-TECHNIQUES.md | range-selector shape | craft: taste/craft/after-effects-techniques.md |
| engine-doctrine/CRAFT/AFTER-EFFECTS-TECHNIQUES.md | variable-font axis | craft: taste/craft/after-effects-techniques.md |
| engine-doctrine/CRAFT/AFTER-EFFECTS-TECHNIQUES.md | font morph by tracking | craft: taste/craft/after-effects-techniques.md |
| engine-doctrine/CRAFT/AFTER-EFFECTS-TECHNIQUES.md | write-on | craft: taste/craft/after-effects-techniques.md |
| engine-doctrine/CRAFT/AFTER-EFFECTS-TECHNIQUES.md | masked reveal | reveal-mask-pad |
| engine-doctrine/CRAFT/AFTER-EFFECTS-TECHNIQUES.md | stylised trail for type | blur-follows-motion |
| engine-doctrine/CRAFT/AFTER-EFFECTS-TECHNIQUES.md | broken loop | craft: taste/craft/after-effects-techniques.md |
| engine-doctrine/CRAFT/AFTER-EFFECTS-TECHNIQUES.md | effector | craft: taste/craft/after-effects-techniques.md |
| engine-doctrine/CRAFT/AFTER-EFFECTS-TECHNIQUES.md | counter-rotation | craft: taste/craft/after-effects-techniques.md |
| engine-doctrine/CRAFT/AFTER-EFFECTS-TECHNIQUES.md | grain keyed to alpha edge | gradient-grain |
| engine-doctrine/CRAFT/AFTER-EFFECTS-TECHNIQUES.md | blob gradient | craft: taste/craft/after-effects-techniques.md |
| engine-doctrine/CRAFT/AFTER-EFFECTS-TECHNIQUES.md | trim-paths bar growth | claim-shape-graphic |
| engine-doctrine/CRAFT/AFTER-EFFECTS-TECHNIQUES.md | counter roll-up | counter-no-overshoot |
| engine-doctrine/CRAFT/AFTER-EFFECTS-TECHNIQUES.md | match cut on shape | match-cut-align |
| engine-doctrine/CRAFT/AFTER-EFFECTS-TECHNIQUES.md | shape morph | craft: taste/craft/after-effects-techniques.md |
| engine-doctrine/CRAFT/AFTER-EFFECTS-TECHNIQUES.md | luma matte | craft: taste/craft/after-effects-techniques.md |
| engine-doctrine/CRAFT/AFTER-EFFECTS-TECHNIQUES.md | screen dive | show-real-thing |
| engine-doctrine/CRAFT/AFTER-EFFECTS-TECHNIQUES.md | the velocity-hidden cut | camera-path-linear, seam-overlap |
| engine-doctrine/CRAFT/README.md | the layering order: nine steps from beats to sound | craft: taste/craft/law.md |
| engine-doctrine/CRAFT/README.md | why the order matters, with weightShift and chime | deleted: JSON-era text (weightShift, chime, "lock the contract BEFORE the JSON", a theme palette) |
| engine-doctrine/CRAFT/README.md | the full index tables of guides | deleted: rewritten as the index of the guides that stayed; taste/README.md indexes the rest |
