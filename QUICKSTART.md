---
when: you have never authored a video here and want the model and the loop in one page
answers: the JSON and HTML split, the build-render-ship loop, and the hard rules for day one
group: process
---

# Quickstart

Vawe turns one self-describing JSON file into one rendered mp4 video. Feed it a scene, it
renders the video. No templates, no UI: you write the JSON, the engine draws it.

## The model, in two sentences

The JSON owns everything that changes over time: layout, timing, motion, cuts, camera,
composition, audio. An `html` layer owns the look of one bespoke picture, and its markup
belongs in its own `.html` file referenced by `src`, not typed inline in the JSON, once it
is long enough to want reading or diffing. That split is the default authoring shape: pick
the JSON for structure, pick HTML for a hand-drawn look.

## Before you write any JSON

Read `AGENTS.md` at the repo root first. It holds the full rules and the
skill router. (`CLAUDE.md` is a shim that loads it, so Claude Code picks it up automatically.) If you are about to make a video from a brief, load the `vawe-video-planning`
skill before you open a file: lock the plan, then author. Do not try ideas inside the JSON.

## The loop

```bash
make list                        # show the scene module + its schema and sample file
make dev D=path/to/video.json    # build, draft-render, and open the video. No gates.
make check D=path/to/video.json  # run every gate. Report findings. Block nothing.
make ship D=path/to/video.json   # the real ladder: check, render, audit, seams.
```

Every video JSON starts with `"module": "scene"` and lives at `formats/scene/<topic>.json`.
Read `formats/scene/sample.json` and one shipped video first, as references, never as a
structure to copy. Compose your own layers from the vocabulary in `engine-doctrine/PRIMITIVES.md`.

## Hard rules for day one

- `bg` is required, and it must move. A still backdrop is a choice you must be able to defend.
- Black means `{"preset": "black"}`. That is `#000000`, not a dark tint.
- No em-dashes in on-screen text. Use a comma, a period, or `·`.
- The first-frame hook is 12 words or fewer, and it does not spoil the payoff.
- Prefer a real captured asset (`make assets`, `make capture`) over an emoji or a stock image.
- Hand-key the motion you want. Do not just name a preset: write the track
  (`make track SHAPE=pan|blast|drift|enter|exit` gives you a starting shape).
- Name the effect before you build it. Search `make arsenal Q="what you mean, in plain
  English"` before you invent a technique by hand.

## Where to go next

- `AGENTS.md`, the full doctrine and the skill router.
- `engine-doctrine/PRIMITIVES.md`, the layer and effect vocabulary.
- `engine-doctrine/TASTE.md`, the quality system: house style, composition, motion, story spine.
- `engine-doctrine/CRAFT/`, deep dives on one topic each (HTML fragments, sound, film structure, and more).
