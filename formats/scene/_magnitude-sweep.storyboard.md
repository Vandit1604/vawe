---
message: "internal rig: does a SUSTAINED layer-level motion track (continuous drift, keyed across the whole beat) raise the local-motion floor further than a parts entrance can."
audience: "internal, motion-sweep-magnitude experiment"
arc: "hold -> hold -> hold -> hold"
format: 1920x1080
theme: "themes/vawe.json"
duration: 12s
threads: "one inset panel, held on screen the whole film; a hand-keyed x drift is added after assemble to test the sustained-motion axis motion-lab's storyboard vocabulary cannot express"
spectacle: "none: this rig deliberately holds structure and copy constant so only the motion mechanism varies"
not: "no idle, no breathe, no camera, no transition device beyond a hard cut"
---

## Beat 1: Hold 1 (0s-3s)
- type: hook
- fragment: "_magnitude-sweep.panel.html"
- onscreen: "Density sweep row one" · "Density sweep row two" · "Density sweep row three" · "Density sweep row four" · "Density sweep row five" · "Density sweep row six" · "Density sweep row seven" · "Density sweep row eight"
- mechanism: an inset panel holding eight rows; this beat's `motion:` line is swept by the rig, and a layer-level drift is keyed by hand afterward
- becomes: an empty field becomes the row panel
- motion: [data-part="row1"]@fadeUp:professional; [data-part="row2"]@fadeUp:professional; [data-part="row3"]@fadeUp:professional; [data-part="row4"]@fadeUp:professional
- why: baseline hold, matching the 4-moves-per-beat count held constant across the whole sweep
- duration: 3s

## Beat 2: Hold 2 (3s-6s)
- type: build
- fragment: "_magnitude-sweep.panel.html"
- onscreen: "Density sweep row one" · "Density sweep row two" · "Density sweep row three" · "Density sweep row four" · "Density sweep row five" · "Density sweep row six" · "Density sweep row seven" · "Density sweep row eight"
- mechanism: same inset panel, second hold; this beat's `motion:` line is swept by the rig
- becomes: the first hold becomes the second, DOM kept alive across the cut
- motion: [data-part="row1"]@fadeUp:professional; [data-part="row2"]@fadeUp:professional; [data-part="row3"]@fadeUp:professional; [data-part="row4"]@fadeUp:professional
- why: second identical hold, so mechanism is the only thing changing across the sweep
- duration: 3s

## Beat 3: Hold 3 (6s-9s)
- type: build
- fragment: "_magnitude-sweep.panel.html"
- onscreen: "Density sweep row one" · "Density sweep row two" · "Density sweep row three" · "Density sweep row four" · "Density sweep row five" · "Density sweep row six" · "Density sweep row seven" · "Density sweep row eight"
- mechanism: same inset panel, third hold; this beat's `motion:` line is swept by the rig
- becomes: the second hold becomes the third, DOM kept alive across the cut
- motion: [data-part="row1"]@fadeUp:professional; [data-part="row2"]@fadeUp:professional; [data-part="row3"]@fadeUp:professional; [data-part="row4"]@fadeUp:professional
- why: third identical hold
- duration: 3s

## Beat 4: Hold 4 (9s-12s)
- type: payoff
- fragment: "_magnitude-sweep.panel.html"
- onscreen: "Density sweep row one" · "Density sweep row two" · "Density sweep row three" · "Density sweep row four" · "Density sweep row five" · "Density sweep row six" · "Density sweep row seven" · "Density sweep row eight"
- mechanism: same inset panel, fourth hold; this beat's `motion:` line is swept by the rig
- becomes: the third hold becomes the fourth, DOM kept alive across the cut
- motion: [data-part="row1"]@fadeUp:professional; [data-part="row2"]@fadeUp:professional; [data-part="row3"]@fadeUp:professional; [data-part="row4"]@fadeUp:professional
- why: fourth identical hold, closes the film
- duration: 3s
