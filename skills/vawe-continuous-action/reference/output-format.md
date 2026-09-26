---
when: "writing the storyboard file for a continuous-action film"
answers: "the exact frontmatter and per-beat fields storyboard-check and make intent parse"
group: skill
---

# Emit the plan in the format the pipeline already eats

Write `STORYBOARD.md` next to nothing, run the two existing tools, then author. Do not invent a
plan format.

```bash
make storyboard-check SB=<storyboard.md>          # blocks unless every beat has type + onscreen + why
make intent SB=<storyboard.md> D=films/scene/<topic>.json   # writes <topic>.intent.json
make author-check D=films/scene/<topic>.json    # inspect verifies the render against that contract
```

The shape below is verified against both tools. Four things matter:
`message`/`audience`/`arc`/`format`/`duration` in the frontmatter, a `type` + quoted `onscreen` +
`why` on every beat, a `becomes:` on every beat, and a `(0s-1.53s)` range in each heading, which is
what `make intent` reads to place its check. **The object spine goes in the frontmatter**, because
anything under a `##` heading is parsed as a beat and will fail the gate.

Under 15s the gate requires the frontmatter to name what holds the film, and takes `threads:` or
`object:`. Declaring `object:` is the stronger claim: it also requires `object_t0` / `object_states` /
`object_last` and an `object:` line on every beat, and it is what the scene-side gate later checks.
Add `threads:` beside it naming your second device, or the gate says so.

Two of those the gate blocks on, so write them first, not at the end:

- **`becomes:`** is the change at this junction, written as "the X becomes the Y". Under 15s a beat
  without one fails. `object:` says where the thing is; `becomes:` says what it turned into.
  `mechanism:` is neither, it is how the frame moves, and answering with presets ("fade, slide up")
  earns a `becomes-is-a-preset` warning. A preset is not a change.
- **The times are read.** A gap between two beats, or a last beat that stops before the frontmatter
  `duration`, fails as `timeline-hole`. Our three recreations all ended three seconds early on a
  typed claim and demonstrated none of it; nothing caught that, and now something does.

```markdown
---
message: "One sentence, under 18 words, the single thing this film communicates."
audience: "Who it is for."
arc: "one continuous action: <object> <verb>s and becomes <payoff>"
threads: "a transforming object, and an open question the last frame refuses to answer"
object: "the generate button"
object_t0: "a pill at the right edge of the prompt bar"
object_states: "pressed, thrown, morphed to a dot, resolved into a spinner"
object_last: "the dot spinning beside Generating. Payoff withheld."
format: 1920x1080
theme: themes/<brand>.json
duration: 5s
---

## Beat 1: Name (0s-1.53s)
- type: hook
- object: offscreen. The stage is being cleared for it.
- onscreen: "Meet higgsfield.ai"
- mechanism: types at 33 cps, untypes at 60 cps, caret held; background never cuts
- becomes: the empty stage becomes the name, then the name becomes an empty stage again
- why: name the thing, then get out of the product's way
- transition_out: hard cut, carried by the continuous background

## Beat 2: Compose (1.53s-3.0s)
- type: product_surface
- object: the button rides the prompt bar as the camera pans to it
- onscreen: "Generate an image of an astronaut holding glowing green puzzle pieces"
- mechanism: real UI, prompt types at 110 cps, shared pan track on every layer
- becomes: the empty prompt bar becomes a written prompt, and its right edge becomes the generate button
- why: show the actual act of using it, not a claim about using it
- transition_out: no cut. The button keeps moving.

## Beat 3: Generate (3.0s-5.0s)
- type: payoff_withheld
- object: thrown, bounced, morphed to a dot, ringed, resolved into a spinner
- onscreen: "Generating"
- mechanism: motion track with motionBlur, CSS var morph over 0.4s, ring pulse
- becomes: the pressed button becomes a thrown pill, the pill becomes a ringed dot, the dot becomes a spinner
- why: the press has a consequence, and the consequence is the last thing you see
```

Read the three `becomes:` lines on their own: prompt bar -> prompt -> button -> pill -> dot -> spinner.
That chain is the film. If yours reads as three unrelated sentences, you have three shots and no
action, whatever the `mechanism:` lines promise.

`object:` is an extra field the gates ignore and the next author needs. Keep it.

**Never put an em-dash in the storyboard or the copy.** The validator rejects them on screen and
the repo bans them in prose. Comma, period, or a middle dot.
