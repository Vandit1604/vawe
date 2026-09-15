---
message: "Shotcode turns a screenshot of any UI into working front-end code, from your terminal."
audience: "Front-end developers who rebuild designs by hand from a picture."
arc: "one continuous action: a screenshot is grabbed, dropped into a command, and unfolds as the code that rebuilds it"
object: "the screenshot frame"
object_t0: "a bright captured website hero, full size, still warm from the shutter"
object_states: "grabbed by the cursor, shrunk into an inline argument on the command line, squashed on Enter, unfolded back to full size as a code editor"
object_last: "the same frame, now a code pane finishing the last line, while the terminal starts the dev server. The rendered result is never shown."
format: 1920x1080
theme: themes/ab-skill.json
duration: 6s
---

## Beat 1: Capture (0s-1.55s)

- type: hook
- object: the screenshot frame itself, born on a shutter flash at full size
- onscreen: "hero.png · 1440x900"
- mechanism: a `flash` sting at 0.1s with the frame snapping from scale 1.06 to 1.0 (the shutter), then a `cursor` arrives and clicks it at 1.3s and the frame dips under the press
- becomes: the shutter flash becomes a captured frame, and the frame becomes something the cursor has hold of.
- why: the film opens on the input, not on a claim. A developer recognises the picture they were about to rebuild by hand.
- transition_out: no cut. The cursor drags the frame and it keeps moving.

## Beat 2: Command (1.55s-3.15s)

- type: product_surface
- object: the frame shrinks to 22% and lands inline on the prompt as the argument to the command
- onscreen: "$ shotcode" · "--react" · "reading hero.png"
- mechanism: the terminal window snaps up with a `rise` cut, the prompt types at 30 cps, the frame flies in on a shared `motion` track that lands where the argument belongs, then squashes on Enter
- becomes: the full-size frame becomes the argument on the command line, and Enter collapses it to a sliver.
- why: this is the whole product in one gesture. Drop a picture on the command line, that is the entire interface.
- transition_out: a `chromaticSplit` hit over the Enter press at 2.98s. The frame is mid-collapse underneath it and never leaves.

## Beat 3: Code (3.15s-6s)

- type: payoff_withheld
- object: the collapsed frame unfolds back to full size, now a code editor holding Hero.tsx
- onscreen: "Hero.tsx" and the component source, plus "starting dev server"
- mechanism: `vars` cross-fade swaps the frame's contents while it is a sliver, a spring-eased `motion` unfold back to 1.0, code lines type at 90 cps staggered, terminal lines scroll up on their own tracks, a slow camera push
- becomes: the sliver's contents swap out, so the screenshot becomes a code editor, and the empty editor becomes Hero.tsx one line at a time.
- why: the code names the same headline and the same button the screenshot showed, so the claim proves itself in frame. It ends on the dev server starting, so the rendered page is the one thing you have to run it to see.
