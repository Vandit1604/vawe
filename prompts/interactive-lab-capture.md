---
when: "the subject is a mechanism and the film is a scripted tour of a working model of it"
answers: "the two prompts: build the lab as render(state), then capture a [[t, state]] tour through seek(t)"
group: reference
---

# Interactive lab, then a scripted capture

**Use when** the subject is a mechanism (a lens, an engine, a queue, a renderer) and the film is
the explorable model of it, driven through a scripted path. Two of the ten most bookmarked cases in
awesome-ai-motion are this: a camera-focus lab and a rocket engine you take apart. The film is a
tour of a thing that also works.

**Length:** 20 to 60 seconds. The lab itself has no length.

## The template, in two prompts

### Prompt 1: the lab

```
Build films/<name>/lab.html: an interactive model of <mechanism>, in plain HTML, SVG or canvas
(three.js allowed for a 3D part). Every control is a plain <input type="range"> or a button, and every
control writes ONE state object. The picture is a pure function of that state: render(state), no
timers, no rAF loop that carries state. Expose window.setState(partial) and window.getState().
Controls: <list, e.g. aperture, focus distance, subject distance>.
Readouts: <list, e.g. depth of field in metres, the blur circle in pixels>.
The model must be right: <the formula or source>, with units on every readout.
Stop when I can drag every control and the readouts agree with the source.
```

### Prompt 2: the capture

```
Build films/<name>/page.html from lab.html. Keep render(state); remove the controls from the frame.
Write the tour as a [[t, state]] table: at each t the state the lab should show, and the one thing
the viewer learns there. window.seek(t) interpolates the table with kf(t, table, ease) from
core/motion/springs.js and calls render(). A ghost cursor shows which control "moves" (a hand, not a
label). Captions: one line per row, under 12 words, with the readout's value in it.
Sound: a soft tick (<audio data-synth="pluck" data-gain="-28">) at a few state changes, not all; one
"swell" (-24 dB) under the reveal.
<meta name="duration">; render with bin/vawe dev films/<name>/page.html.
```

## Questions

Ask in this order; the first changes the film most. A skipped question takes its default; never wait.

1. **Mechanism**: what does the lab model? Default: a camera lens with aperture, focus distance and subject distance. Why: the lab is the asset; every control and readout follows from it.
2. **Source**: the formula or reference the readouts must agree with? Default: the thin-lens equation, depth of field in metres, the blur circle in pixels. Why: a wrong model is a wrong film; the readouts are checked before a frame is drawn.
3. **Takeaways**: the three things a viewer should be able to explain afterwards? Default: what the aperture does to depth of field, why focus distance moves the sharp band, why the blur circle grows. Why: one tour row per takeaway, each with the readout in its caption.
4. **Tour**: the order of states, or the controls to sweep? Default: one control at a time from its minimum to its maximum, then all three together. Why: the [[t, state]] table is the film.
5. **Length and canvas**: seconds and aspect? Default: 30 s, 16:9. Why: the lab has no length; the tour does.

## Gotchas

- The lab is the asset. Keep it in the film folder; the page imports its render() by a relative
  path and never forks it.
- A model that is wrong is a film that is wrong. The readouts are checked against the source before
  a single frame is drawn.
- The tour interpolates STATE, not pixels. A cut between two states is a jump in the table; a move
  is a curve.
- If the lab uses three.js, seed everything and let the renderer's virtual clock drive it; no
  requestAnimationFrame that accumulates.

source: pattern from Ryan Sael's camera lens lab (https://x.com/RyanSael/status/2102591147927654847)
and Konstantin Saifo's Raptor 3 engine (https://x.com/konstantinsaifo/status/2104094723887501736),
both via https://github.com/guanmo-ai/awesome-ai-motion (cases 2102591147927654847 and
2104094723887501736); only the creators' one-line briefs are public, so the template is ours. The
"app or game capture" production path is one of seven in the CC BY 4.0 dataset by athemeroy,
https://github.com/athemeroy/awesome-opus-5-5-videos.
