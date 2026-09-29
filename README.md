---
when: you have never run this repo
answers: what vawe is, how to install it, and the one command that turns a page into an mp4
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

![vawe demo](engine-doctrine/media/vawe-demo.gif)

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
  `16:9 9:16 1:1 4:5 4:3` (`ASPECT=all` renders every one).
- Audio is `<audio>` tags with `data-at`, `data-gain`, `data-fade-out`; `loop` is the music bed;
  `data-synth` picks a voice from `core/audio/kit.mjs`. Mixed offline to -14 LUFS.
- Springs, keyframe tables and seeded noise: `core/motion/springs.js` (`core/motion/README.md`).

The whole contract, and the mistakes a first draft makes, is `skills/vawe-page/SKILL.md`. The house
rules an agent reads are `AGENTS.md`.

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
`SPEC.md` and a KEEP/CHANGE list (`skills/vawe-reference/SKILL.md`). One prompt template per film
type: `prompts/README.md`; the router: `engine-doctrine/CRAFT/ROUTING.md`.

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
bin/vawe:          the one command: new dev ship critique spec studio check e2e test judge
harness/cli/       the verb table and argument parser behind it
harness/media/     render-page.mjs · page-audio.mjs · see.mjs (the views) · ref-spec.mjs
quality/gates/     page-check.mjs · anim-traps.mjs · judge.mjs · doc-refs.mjs
prompts/           one template per film type, with source and licence
skills/            vawe-page · vawe-critique · vawe-reference (loaded on demand)
engine-doctrine/   RULES/ (readable-hold, speed-bands, banned-defaults) · CRAFT/ · JUDGE.md
films/             <name>/page.html per film
out/               rendered mp4s (gitignored)
```

## Docs

New here and want to author? `QUICKSTART.md` (a blank page to a rendered film in one page), then
`AGENTS.md` (the house rules). Then `prompts/README.md`, `core/motion/README.md`, and
`engine-doctrine/JUDGE.md` (how a film is scored). `bin/vawe --help` prints every command.

## Status and license

vawe is under active development and released under the **[Apache License 2.0](LICENSE)**: free to
use, modify and distribute, for any purpose, including production and commercial use. See
**[LICENSE](LICENSE)** for the full text and the patent grant, and **[NOTICE](NOTICE)** for
third-party attribution. Contributions and issues welcome.
