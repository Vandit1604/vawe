---
when: "you are about to ask an agent for a film and want the prompt shape that already worked in the motion-from-code ecosystem, retargeted to one page.html"
answers: "the index of prompt templates (name, use when, length), the page contract every template targets, and how to start a film from one"
group: reference
---

# prompts/: the library

Twelve templates. Each is one markdown file with: when to use it, the template (XML-sectioned
where the original was), a question bank (at most five questions, ordered by how much they change
the film, each with its reason and its default), the gotchas, and a `source:` line. How to build a
prompt from scratch is [ANATOMY.md](ANATOMY.md). Every template targets the vawe page contract
(`AGENTS.md`):

- one `films/<name>/page.html` with `<meta name="duration" content="<s>">`, relative assets;
- time is the seek: CSS `@keyframes` and `element.animate()` (the renderer seeks them), or
  `window.seek(t)` in seconds as a pure function of `t`;
- `<audio src data-at data-gain data-fade-out>` for files, `<audio data-synth="<voice>" data-at>`
  for the synth voices in `core/audio/kit.mjs` (pluck, chime, sparkle, droplet, bloom, success,
  ready, whoosh, riser, drop, impact, swell, braam); never played live, mixed offline as written
  (`<meta name="loudness">` opts in to a target). No `data-gain` takes the voice's soft default
  (`DEFAULT_GAIN_DB`); a few soft ticks and one swell beat many hits;
- moves to copy, each with a 1 s clip: [moves/README.md](moves/README.md);
- `bin/vawe dev <page>` (draft), `bin/vawe ship <page>` (final), `bin/vawe critique <page> --ref <mp4>`
  (match a reference), `bin/vawe judge` (two fresh runs; it passes only when every axis is 8 or more);
- helpers in `core/motion/springs.js`: `spring`, `track`, `approach`, `kf`, `springLinear`, `rng`.

## Index

| name | use when | length |
|---|---|---|
| [showreel-one-liner](showreel-one-liner.md) | no brief; a taste probe; learn the agent's defaults, then ban them | 15 s |
| [brand-launch-from-url](brand-launch-from-url.md) | a real product from a URL, its own kit, real captures only | 15 to 40 s |
| [ui-morph-loop](ui-morph-loop.md) | one element becomes 8 to 12 UI states and loops, on a beat grid | 12 to 16 s |
| [reference-rebuild](reference-rebuild.md) | a reference mp4 must be matched: SPEC.md, KEEP/CHANGE, rebuild, `bin/vawe critique --ref` | the reference's |
| [directors-brief-long-form](directors-brief-long-form.md) | over 60 s, or more than one session or agent: BRIEF, STORYBOARD, GUIDE, chapters | 1 to 6 min |
| [critique-pass](critique-pass.md) | a draft exists; fresh critic, default reject, four views, frame-locked if a reference exists | one pass |
| [story-explainer](story-explainer.md) | explain a topic with invented visuals: facts list first, narration timeline | 30 s to 3 min |
| [music-video-beat-synced](music-video-beat-synced.md) | a song exists; every cut on a downbeat, one spectacle at the drop | the song's |
| [pixel-art-sprite](pixel-art-sprite.md) | a 16-bit sprite loop: logical resolution, palette, state machine, quantised pose | 2 to 8 s |
| [interactive-lab-capture](interactive-lab-capture.md) | a mechanism as an explorable model, then a scripted tour of it | 20 to 60 s |
| [production-brief-acceptance](production-brief-acceptance.md) | a client or a claim; inputs and rights, three gates, the hardest 2 to 4 s first | one page |
| [beat-sheet](beat-sheet.md) | any film over one beat: the shot table before code | one table |

## Sources

Each template's `source:` line names its origin. Text is copied only where the licence allows it (MIT,
Apache 2.0, CC BY 4.0 with attribution). Third-party prompts and owner-shared articles are patterns
only: the templates are our own text in the same shape.

## How to use one

1. Pick the row. If two fit, the shorter film wins; under 15 s most types are one continuous action.
2. `bin/vawe new <name> --request "<the ask>"` first prints the details it needs (subject, message, show,
   look, then format, family, assets, ending) and writes nothing; rerun it with `--answers <file>` or
   `--detail key=value`, or add `--defaults` to guess. Then it prints the template's questions with their defaults
   and writes `films/<name>/brief.md` with the defaults filled in, each marked
   `[unanswered: default taken]`, and the measured-brief sections (Task, Look, Spec, Acceptance, Gates,
   Pitfalls, Deliver) with every field it could not answer marked `(guess: change me)`. Ask the bank in one message; a skipped answer keeps its default.
   The agent side of this is the `vawe-brief` skill (`skills/vawe-brief/SKILL.md`; everyone else
   reads `ANATOMY.md`).
3. Fill the brief's Spec tables before the page (the shape is in [ANATOMY.md](ANATOMY.md)). After the details are in, never wait for
   a reply: take the guess marked `(guess: change me)` and go on.
4. Draft with `bin/vawe dev <page>` until every Acceptance row is green, then run `critique-pass.md` as a
   fresh agent. The taste rules are in `taste/build/DIGEST.md` and in the lines `dev` prints.
