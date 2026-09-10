---
name: vawe-type-talking-head
description: "Playbook for a talking-head / narrated video in this engine: VO + word-timed captions, a face-safe layout, a lower-third, a quiet field, B-roll cut rhythm. Load whenever the request is a narrated presenter-style video, a voiceover explainer with a face, or a phone-feed talking-head clip."
---

# vawe-type-talking-head: the narrated presenter playbook

Not in the priority route table (`docs/CRAFT/ROUTING.md` names five deliverables; this is a sixth,
reached directly by request wording: "narrated", "voiceover", "presenter", "talking head"). This is the
one type built around a VOICE, not a visual device: everything else follows the pace of the words.

## The spine, at any length

**Talking-head does NOT take the continuous-action shape, even under ~15s.** `type-spines.mjs` declares
`continuousObject: null` for this type on purpose: a face and its VO are held by the voice and the
captions, not by one transforming prop, so `make scaffold TYPE=talking-head` keeps the beat spine below
at every duration instead of switching at `CONTINUOUS_ACTION_MAX_S` the way every other type does. Read
`skills/vawe-continuous-action/SKILL.md`'s own "Before you use this skill" section: this is exactly the
"a manifesto... this skill's law would lie about the content" case it names.

Cold open on the presenter (2-3s) -> VO builds the case, captions carry it (mid-film, 4-6s) -> B-roll
cutaway to the proof (2-3s) -> back to the presenter for the close (2-3s). Pace band: **3.0-5.0s per
beat**, the slowest of any type, because the voice track, not a blueprint, sets the rhythm.

## What this type needs that others do not

- **Quiet register.** The quiet field this section already asks for is `docs/CRAFT/MOTION-REGISTERS.md`
  §1's first register stated another way: a face reads only against restraint, so motion is a cost paid
  in attention taken away from the voice (`register: 'quiet'` in `type-spines.mjs`).
- **VO + word-timed captions.** A real film needs `audio.vo` + `audio.voWords` (a `[{w,t}]` sidecar),
  then `make vo-captions D=<file> WRITE=1` builds karaoke-timed `captions[]` from it. `docs/CRAFT/CAPTIONS.md`.
- **`make pace-from-vo`.** Once a real VO track exists, `make pace-from-vo VO=<file>.words.json`
  proposes beat timings that land reveals ON the voice instead of guessing durations by ear.
- **A face-safe layout.** Keep the safe centre of the frame free for a presenter shot; do not stack
  type or UI over where a face would sit. On a phone destination, also mind the platform chrome
  (`docs/RULES/caption-safe-strip.md`).
- **A lower-third.** Name and title in a fixed chip, low in the frame, present across the whole film
  (or the whole presenter beat), never centred.
- **A quiet field.** The backdrop should not compete with a face; hold it dark and slow, one or two
  tone turns at most, never a busy animated pattern behind the presenter.
- **B-roll cut rhythm.** Cut away from the face to the proof (a stat, a screen, a graphic) and back.
  This IS the type's cut family: presenter -> B-roll -> presenter, not a slideshow of unrelated shots.

## The motion to reach for

By role (`make arsenal Q="…"` to search):
- **hook / cold open**: `blurResolveHook`, `typedHook`
- **B-roll proof**: `containerFill`, `statReveal`, `terminalReveal`, `verdictProof`
- **close**: `ctaEnd`, or return to the presenter placeholder with no blueprint at all

There is no dedicated "face" blueprint: the presenter slot is always a placeholder rect or a real
`video`/`component` layer, never invented UI.

## The rules that matter most

`docs/RULES/caption-safe-strip.md` · `docs/RULES/text-on-flat.md` · `docs/RULES/first-arrival.md` ·
`docs/RULES/world-turns.md` (a quiet field still turns, just slowly) · `docs/CRAFT/CAPTIONS.md` ·
`docs/CRAFT/SOUND.md` (the VO/mix contract).

## Assets and how to get them

The presenter shot is real footage or a real `video`/`component` capture, never generated. Until one
exists, use a clearly-labelled placeholder rect (state this in the scene `note`, not on screen) so the
film is honest about what is a stand-in. The VO itself: `make tts` for a synthesised draft, or a real
recording; either way, get its word-timing sidecar before writing captions by hand.

## `make scaffold TYPE=talking-head`

```bash
make scaffold OUT=formats/scene/<name>.json TYPE=talking-head DUR=12
```

Composes `blurResolveHook -> containerFill -> statReveal -> ctaEnd` (`harness/author/type-spines.mjs`),
a deliberately short spine since the real content is the VO and captions the scaffold cannot author for
you, on `ink/deep` bg presets with a quiet fade-only cut family.

## What the judge weighs for this type

Do the captions actually track real words, not a guess? Is the safe centre kept clear for a face? Does
the B-roll cutaway show real proof, not decoration? Is the lower-third legible and out of the way? Does
the film ever say "we have no real VO yet" out loud in a `note`, so nobody mistakes the placeholder for
a finished asset?

## The worked example

`quality/runs/evals/briefs/talking-head.json` (12s, 9:16, `destination: shorts`). No real VO exists for this
example: the circle is the FACE-SAFE PLACEHOLDER (labelled as such in the scene `note`, not on screen),
the three caption lines are hand-timed to stand in for a real `voWords` track, and the film cuts away to
a stat card (a real `count` layer) and back, the B-roll rhythm this type needs and others do not.
