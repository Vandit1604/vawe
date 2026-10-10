---
when: you have never run this repo
answers: what vawe is, how to install it, the one command that turns a page into an mp4, and the hard rules for day one
group: project
---

# vawe: one page in, one film out

vawe is the framework for agent-native motion graphics. A film is one HTML page that an agent (or
you) writes in HTML, CSS, Web Animations, SVG, canvas or three.js. The renderer seeks the page frame
by frame, screenshots every frame, mixes the page's `<audio>` tags offline and encodes one mp4. No
timeline, no editor, no private format: the page is the film, and the same page renders the same
bytes in any frame order.

```bash
bin/vawe new hello                         # films/hello/page.html, a valid starter
bin/vawe dev  films/hello/page.html        # half size, 30 fps, silent: the draft
bin/vawe ship films/hello/page.html        # full size, 60 fps, subframe blur, audio: the final
```

![vawe demo](assets/vawe-demo.gif)

## A film, in one page

```html
<!doctype html>
<meta name="duration" content="6">
<meta name="message" content="one page, one film">
<style>
  body { margin: 0; background: #0b0d12; color: #f4f6fb; font: 700 calc(var(--vh) * 0.08) system-ui; }
  h1 { position: absolute; left: 8%; top: 40%; animation: rise 0.6s cubic-bezier(.2,.9,.2,1) both 0.4s; }
  @keyframes rise { from { transform: translateY(40px); opacity: 0 } to { transform: none; opacity: 1 } }
</style>
<h1>one page, one film</h1>
<audio data-synth="chime" data-at="0.4" data-gain="-6"></audio>
```

- `<meta name="duration">` is the length in seconds. Everything else is what you already know.
- Time is the seek. CSS `@keyframes` and `element.animate()` are paused and driven by
  `currentTime`; or define `window.seek(t)` and paint frame t as a pure function of t.
- Before any page script runs the renderer installs a virtual clock (`Date`, `performance.now`,
  `requestAnimationFrame`, timers and a seeded `Math.random` all follow the seek) and sets
  `<html data-aspect>`, `--vw`/`--vh` and `window.vawe` so one page lays out for
  `16:9 9:16 1:1 4:5 4:3` (`bin/vawe ship <page> --aspect all` renders every one).
- Audio is `<audio>` tags with `data-at`, `data-gain`, `data-fade-out`; `loop` marks a music file the user gives;
  `data-synth` picks a fallback effect voice from `core/audio/kit.mjs` (a recorded effect comes first). Mixed offline as written; `<meta name="loudness">`
  opts in to a target.
- Springs, keyframe tables and seeded noise: `core/motion/springs.js` (`core/motion/README.md`).

The whole contract, and the mistakes a first draft makes, is `skills/vawe-page/SKILL.md`. The house
rules an agent reads are `AGENTS.md`. Note the shape the rules ask for in the example: the entrance is a
move, not only a fade; the exit is shorter than the entrance; the text holds still long enough to read;
the cue lands with the move.

## Before you write a page

Read `AGENTS.md` first: the contract, the loop, and the motion rules that are not your defaults. Pick the
film type in `guides/ROUTING.md` and start it with
`bin/vawe new <name> --from prompts/<template>.md`. Every template stops before code at least once (a
beat table, a facts list or a SPEC); honour the stop. If your tool loads skills, load `vawe-page` before
the first line. `bin/vawe new hello` writes `films/hello/page.html`, `directions.html` and `brief.md`.

Hard rules for day one:

- No live clock, no state between frames, no unseeded random. Frame 400 never needs frame 399.
- Lay out with `--vw`/`--vh` and `[data-aspect]`, never fixed pixels for one aspect.
- Bundle fonts in `assets/`; never load one from the network.
- No em dash on screen. The first-frame hook is 12 words or fewer.
- Exits faster than entrances. Arrive fast, land soft. One entrance per beat, not a fade on all.
- Text holds for its read time (rule `readable-hold`). Add a hold; never slow the move.
- A rule broken on purpose is declared in the page with a `_why` (`AGENTS.md`, Waivers).

## Install

**From source**: Node 22+, git, ffmpeg (with libx264 and drawtext) and tesseract (optional, for OCR).

```bash
npm install
bin/vawe doctor
bin/vawe dev films/<name>/page.html
```

`bin/vawe doctor` checks each tool and prints the install line for your system (macOS, Linux or
Windows) for any that is missing. It exits 1 only when a required tool is missing.

Output can differ between hosts that rasterise on a different GPU or Chrome version.

## The loop

```
brief or reference -> stills -> draft -> critique in a FRESH session -> fix the named seconds -> final
```

```bash
bin/vawe dev      films/<name>/page.html [--from s --to s]   # draft; the hardest 2 to 4 s first
bin/vawe critique films/<name>/page.html [--ref <mp4>]       # sheet, strip, phone, loop + page checks; a ref is matched
bin/vawe ship     films/<name>/page.html [--aspect all]      # final
```

A hook (`harness/live/stage-say.mjs`) names the next command for the film you edited last.

The critique is run by a session that did not write the page, rejects by default, and names every
finding as shot + frame + fix (`skills/vawe-critique/SKILL.md`). A reference is matched through
`SPEC.md` and a KEEP/CHANGE list (`bin/vawe spec <mp4>`, then `bin/vawe coverage <film.mp4> --ref <mp4>` lists the seconds that still differ; `skills/vawe-reference/SKILL.md`). One prompt template per film
type: the router `guides/ROUTING.md`.

## Determinism

Every frame is a pure function of its seek time: no wall clock, no state carried between frames, no
unseeded random. That is what lets the renderer capture frames on several browser pages at once,
blur from fractional subframes, and re-render only the seconds a critique named.
`bin/vawe check anim-traps <page>` finds the seven ways a seeked CSS animation silently breaks.

## Architecture

```
  films/<name>/page.html            the film: HTML · CSS · WAAPI · seek(t) · <audio> · assets/
          │
          ▼
  harness/media/render-page.mjs     virtual clock (core/engine/page-clock.js) · aspect vars ·
          │                         seek every frame on N browser pages · subframe blur
          ▼
  ffmpeg                            frames -> H.264, one pass
          │
          ▼
  harness/media/page-audio.mjs      <audio> tags -> one offline mix (synth voices: core/audio/kit.mjs)
          │
          ▼
  out/<name>[-<aspect>][-draft].mp4
```

```
core/motion/       springs.js (spring, track, approach, kf, springLinear, rng, noise1), curves.js
core/engine/       page-clock.js (the virtual clock), page-api.js (vawe.onFrame, three.js helpers)
core/audio/        kit.mjs: the synth voices
bin/vawe:          the one command (`bin/vawe --help`): new dev ship critique compare coverage review spec
                   studio check doctor moves e2e test judge
harness/cli/       the verb table and argument parser behind it
harness/media/     render-page.mjs · page-audio.mjs · see.mjs (the views) · ref-spec.mjs · review.mjs
quality/gates/     page-check.mjs · anim-traps.mjs · judge.mjs · doc-refs.mjs
prompts/           one template per film type, and prompts/moves/ (moves to copy, with clips)
skills/            vawe-brief · vawe-page · vawe-critique · vawe-reference (loaded on demand)
taste/             rules/ (one rule per file) · craft/ · build/ (generated) · README.md (the index)
guides/            engine and process guides (ROUTING.md picks a film type) · judge.md · research/ (timing sources)
films/             <name>/page.html per film
out/               rendered mp4s (gitignored)
```

## Docs

New here and want to author? This page, then `AGENTS.md` (the house rules). Then `guides/ROUTING.md`,
`prompts/moves/README.md`, `core/motion/README.md`, `taste/README.md` (every taste rule; `taste/build/DIGEST.md` is the first read), and `guides/judge.md` (how a film is scored). `bin/vawe --help` prints every command.

## Status and license

vawe is under active development and released under the **[Apache License 2.0](LICENSE)**: free to
use, modify and distribute, for any purpose, including production and commercial use. See
**[LICENSE](LICENSE)** for the full text and the patent grant, and **[NOTICE](NOTICE)** for
third-party attribution. Contributions and issues welcome.
