---
message: "You type a prompt, press generate, and the picture it makes becomes the prompt for the next one."
audience: "Creators deciding which AI image and video tool to open first."
arc: "one continuous action: the generate button is pressed, becomes the work, becomes the result, and comes back as a generate button"
object: "the generate button"
object_t0: "not born. The brand name is typing on black over a living lime field."
object_states: "a lime pill at the right edge of the prompt bar, thrown left and tumbling, collapsed into a dot, ringed and spinning beside Generating, smeared into the lime bar that writes the prompt back out, handed to the picture, folded to a thumbnail, reborn as a bigger generate button beside that thumbnail"
object_last: "the new generate button, armed, with Video lit beside it. The video is never shown."
format: 1920x1080
theme: themes/higgsfield.json
duration: 12s
source: "higgsfield.mp4, first 12s, 1280x720. Every position below is measured off the source frames and scaled 1.5x."
---

## Beat 1: Name (0s-1.53s)

- type: hook
- object: offscreen. The stage is being cleared for it.
- onscreen: "Meet higgsfield.ai"
- mechanism: types at 33 cps, untypes at 60 cps from 1.14s, caret held. One `liquid` bg window runs under the whole film and never cuts.
- why: name the thing in one line, then get out of the product's way. Twelve seconds cannot afford a second text card.
- transition_out: hard cut at 1.53s, carried by the background, which does not cut.

## Beat 2: Compose (1.53s-3.06s)

- type: product_surface
- object: born. A lime pill sitting at the right edge of the prompt bar.
- onscreen: "Generate an image of an astronaut holding glowing green puzzle pieces"
- mechanism: `rect` scrim plus a hand-built `html` app bar, prompt types at 110 cps, one shared pan track on every layer of the surface so the camera follows the text past the field. A pure pan, no push.
- why: show the act of using it, not a claim about using it. The prompt is a prop, not copy.
- transition_out: no cut. The button keeps travelling.

## Beat 3: Press (3.06s-4.4s)

- type: consequence
- object: thrown left, tumbling under motion blur, bounced, then its label fades, its width collapses and its radius blows out. It is a dot.
- onscreen: nothing. The button is the only thing in frame.
- mechanism: `motion` track with `motionBlur:0.16`, then `vars:{"--p":[0,1]}` over 0.4s driving width, height, radius and label opacity in CSS. A `rect` ring pulses off it and dies.
- why: the press has to have a consequence you can watch, or the product is a screenshot.
- transition_out: no cut. The dot is the spinner.

## Beat 4: Wait (4.4s-6.6s)

- type: payoff_withheld
- object: the dot is now the spinner beside the word Generating, then it slips its label and flies up and left alone.
- onscreen: "Generating"
- mechanism: word and spinner drift right together on paired `motion` tracks, the word fades at 6.1s, the dot keeps its velocity and leaves under motion blur.
- why: the wait is the honest part of the product. It also buys the only quiet second in the film.
- transition_out: no cut. The dot is still on screen and still moving.

## Beat 5: Write it back (6.6s-7.9s)

- type: product_surface
- object: the dot smears sideways and stretches into a lime bar, and the bar writes the prompt back out one line at a time.
- onscreen: "A futuristic astronaut in a white space suit floating in deep dark space, holding glowing neongreen translucent puzzle pieces emitting green particles, cinematic lighting, volumetric glow, high detail, sci-fi atmosphere, 4K."
- mechanism: the dot's `motion` track ends in a scaleX blowout into a `rect` bar. Four stacked bars arrive 0.16s apart, each replaced in place by its line of text. Camera begins a slow push at 7.6s.
- why: the machine reads back exactly what you asked for, which is the frame that earns the picture below it.
- transition_out: no cut. The last bar is directly above the picture as it arrives.

## Beat 6: Result (7.9s-9.5s)

- type: payoff
- object: the last bar hands off to the picture it made. The picture then folds through white and shrinks.
- onscreen: the generated frame, an astronaut holding glowing green puzzle pieces
- mechanism: `image` layer fading up out of a white haze under a continuing camera push, then a rotateY fold to a white back and a scale collapse to a portrait thumbnail.
- why: one product surface, one result, shown for long enough to read and no longer.
- transition_out: no cut. The thumbnail keeps falling.

## Beat 7: Hand it back (9.5s-11.67s)

- type: product_surface
- object: reborn. The thumbnail lands in a new prompt bar and a bigger lime generate button grows beside it.
- onscreen: "Turn it into a moving visual" · "GENERATE" · "Image" · "Video"
- mechanism: a lime bar grows under the falling thumbnail and darkens into the app bar, the mode rail slides in from the left, chips and thumbnail fade in, the new prompt types at 26 cps.
- why: the result is the next input. That is the loop the whole film exists to show, and it lands in the frame the viewer already understands.
- transition_out: hard match cut at 11.67s, same UI, same place, punched in.

## Beat 8: Video (11.67s-12s)

- type: payoff_withheld
- object: the same generate button, punched in and armed, with Video lighting lime beside it.
- onscreen: "Turn it into a moving visual" · "Video"
- mechanism: match cut to the identical panel at 1.75x with the camera already inside it, then the Video tile fills lime over 0.2s.
- why: the film ends one press before the video exists. That is the moment the viewer is most curious.
