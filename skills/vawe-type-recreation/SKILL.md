---
name: vawe-type-recreation
description: "Playbook for matching a reference film's or site's exact look in this engine: study the grammar, take it, never the frames. Load when the route table (engine-doctrine/CRAFT/ROUTING.md) matches recreation, or the request is to recreate a specific reference with no product of ours to sell."
---

# vawe-type-recreation: the studied-grammar playbook

A recreation is not a reflection of our own product; the reference IS the subject. The whole discipline
is one sentence: **take the grammar, never the frames.** Pacing, cut rate, the device that holds the
film together, the ground tone: these transfer. The literal pixels, the brand marks, the exact copy: they
do not, and copying them is both a taste failure and, for anything captured from someone else's site or
footage, a rights problem this repo's asset rules already forbid.

## The spine, at every length

Whatever the reference's own spine is. Do not force a hook/build/payoff shape onto a film that was
built differently: `make study` measures the reference's actual shot lengths, ground pattern and
threads, and THAT is the spine to recreate. If nothing has been studied yet, that is the first move,
not a skippable step.

**`make scaffold TYPE=recreation` never switches to the continuous-action shape, at any duration.**
`type-spines.mjs` declares `continuousObject: null` for this type on purpose, the same reasoning as
`register: null`: the studied source may or may not be a continuous action, and this scaffold cannot
know which until you have studied it. Forcing one prop across a reference that was actually cut into
chapters (or the reverse) lies about the content. Study first, then decide, same as the register.

## What this type needs that others do not

- **No fixed register.** `register: null` in `type-spines.mjs`: a recreation inherits whatever register
  the STUDIED source is in. Grade a kinetic reference (a continuous title sequence) against a quiet
  restraint rule and the recreation will read as under-directed no matter how faithful it is
  (`engine-doctrine/CRAFT/MOTION-REGISTERS.md` §1).
- **`make study VIDEO=refs/ref.mp4 NAME=ref`.** Nothing else in this repo has looked at a reference
  film by machine; this is the only type that starts here. It writes `grammar/<name>.json` and a
  contact sheet at `refs/<name>/study.md` with the shot boundaries, ground pattern, motion curve and a
  measured `threads`/`spectacle`/`takeaway` for the reference.
- **The grammar, not the frames.** `refs/` is gitignored on purpose. Commit the STUDIED grammar
  (`grammar/<name>.json`), never the source frames or a captured screenshot of someone else's UI.
- **An honesty check, stated up front.** Name which parts of the reference cannot be matched exactly
  (a font under licence, a captured product you do not have rights to) before authoring, not after a
  render reveals it.
- **Generic content on the recreated device.** The device is real; the copy, brand and any UI shown
  should be your own or clearly generic, unless the reference is your own site/film.

## The motion to reach for

There is no fixed device list for this type: the studied grammar names the actual devices in play
(a continuous artefact shown from multiple angles, a build-with-no-hard-cut, a match cut). Reach for a
`recipes/` entry first, since it is measured off a studied reference the same way (recipes/README.md);
otherwise `make arsenal Q="…"` for the nearest device the study names.

## The rules that matter most

`engine-doctrine/CRAFT/REFERENCE-STUDY.md` (the whole `make study` mechanism) · `engine-doctrine/CRAFT/RECREATION.md` (the
capture-first procedure for a SITE reference specifically) · `engine-doctrine/CRAFT/FILM-STRUCTURE.md` (naming the
device a continuous-object gate cannot verify) · `engine-doctrine/RULES/continuous-object.md`.

## Assets and how to get them

A film reference: `make study VIDEO=<file> NAME=<name>`. A site reference: `make sections URL=<site>
NAME=<name>` + `make palette`. Never re-download or commit the reference's own frames; the grammar file
is the only artefact this type keeps.

## `make scaffold TYPE=recreation`

```bash
make scaffold OUT=formats/scene/<name>.json TYPE=recreation DUR=11
```

Composes a minimal `kineticHook -> statReveal -> ctaEnd` fallback spine (`harness/author/
type-spines.mjs`): deliberately generic, since a real recreation's beat shapes come from the studied
grammar, not from a table. Treat the scaffold as a starting skeleton to REPLACE with the studied shape,
not as the recreation itself.

## What the judge weighs for this type

Does the film move the way the reference moves (pace, cut rate, the held device), independent of what
is actually on screen? Is anything copied that should only be taken as grammar (a captured UI, a real
wordmark, verbatim copy)? Does the honesty check name what could not be matched?

## The worked example

`quality/runs/evals/briefs/recreation.json` (11s, 16:9). Takes the grammar studied off
`grammar/framer-hero.json`: a prompt types, the generated artefact builds in beside it with no hard cut,
and the SAME artefact is later shown from a different angle (three viewports at once, the reference's
own "it is really finished" payoff). The content (a generic made-up pricing page) is invented; only the
device is recreated.
