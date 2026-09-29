---
when: you have never authored a film here and want the model and the loop in one page
answers: the page contract in one example, the draft-critique-final loop, and the hard rules for day one
group: process
---

# Quickstart

vawe turns one HTML page into one rendered mp4. You write the page; the renderer seeks it frame by
frame and mixes its audio offline. No templates, no UI, no private format.

## The model, in two sentences

A film is `films/<name>/page.html` plus its own `assets/` folder, and time is the seek: CSS
`@keyframes` and `element.animate()` are paused and driven, or `window.seek(t)` paints frame t as
a pure function of t. `<meta name="duration">` sets the length; everything else is web platform.

## Before you write the page

Read `AGENTS.md` first: the contract, the loop, and the motion rules that are not your defaults.
Then pick the film type in `engine-doctrine/CRAFT/ROUTING.md` and start it with
`bin/vawe new <name> --from prompts/<template>.md`. Every template stops before code at least once
(a beat table, a facts list or a SPEC); honour the stop. If your tool loads skills, load `vawe-page`
before the first line. `bin/vawe --help` lists every command.

## Your first page

`bin/vawe new hello` writes a starter like this one:

```html
<!doctype html>
<meta name="duration" content="5">
<meta name="message" content="hello, film">
<style>
  body { margin: 0; background: #f4f6fb; color: #0b0d12; font: 700 calc(var(--vh) * 0.1) system-ui; }
  h1 { position: absolute; left: 8%; top: 42%; margin: 0;
       animation: in 0.5s cubic-bezier(.2,.9,.2,1) 0.3s both, out 0.25s ease-in 4.4s both; }
  @keyframes in  { from { transform: translateY(0.6em); opacity: 0 } to { transform: none; opacity: 1 } }
  @keyframes out { to { transform: translateY(-0.4em); opacity: 0 } }
</style>
<h1>hello, film</h1>
<audio data-synth="pluck" data-at="0.3" data-gain="-6"></audio>
```

Note the shape the rules ask for: the entrance is a move, not only a fade; the exit is shorter than
the entrance; the text holds still long enough to read; the cue lands with the move.

## The loop

```bash
bin/vawe dev      films/hello/page.html                      # draft: half size, 30 fps, silent
bin/vawe dev      films/hello/page.html --from 2 --to 4      # only the seconds you are working on
bin/vawe critique films/hello/page.html                      # in a FRESH session: sheet, strip, phone, loop
bin/vawe ship     films/hello/page.html --aspect all         # final: 60 fps, blur, audio, every aspect
```

Draft the hardest two to four seconds first. Hand the draft to a session that did not write it
(`vawe-critique`); it rejects by default and names shot, frame and fix. Fix the top five, re-render
only those seconds, critique again. A PASS is written by the critic, never by you.

Matching a reference: `bin/vawe spec <mp4>` writes SPEC.md, mark every line KEEP or CHANGE, rebuild,
then `bin/vawe critique <page> --ref <mp4>` until it passes (`vawe-reference`).

## Hard rules for day one

- No live clock, no state between frames, no unseeded random. Frame 400 never needs frame 399.
- Lay out with `--vw`/`--vh` and `[data-aspect]`, never fixed pixels for one aspect.
- Bundle fonts in `assets/`; never load one from the network.
- No em dash on screen. The first-frame hook is 12 words or fewer.
- Exits faster than entrances. Arrive fast, land soft. One entrance per beat, not a fade on all.
- Text holds `words x 0.6 s`, floor 1.2 s. Add a hold; never slow the move.
- A rule broken on purpose is declared in the page with a `_why` (`AGENTS.md`, Waivers).

## Where to go next

- `AGENTS.md`: the house rules.
- `skills/vawe-page/SKILL.md`: the contract and the ten mistakes a first draft makes.
- `core/motion/README.md`: springs, keyframe tables, seeded noise.
- `prompts/README.md`: one template per film type; `engine-doctrine/CRAFT/ROUTING.md` picks it.
- `engine-doctrine/RULES/`: readable-hold, speed-bands, banned-defaults.
