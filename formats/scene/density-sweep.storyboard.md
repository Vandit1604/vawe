---
message: "internal rig: does raising moves-per-beat raise the local-motion floor, and where does it stop helping."
audience: "internal, motion-sweep-count experiment"
arc: "hold -> hold -> hold -> hold"
format: 1920x1080
theme: "themes/vawe.json"
duration: 12s
threads: "one shared list of eight rows, held on screen the whole film; only the motion plan on it changes per beat"
spectacle: "none: this rig deliberately holds structure and copy constant so only move-count varies"
not: "no idle, no breathe, no camera, no transition device beyond a hard cut: the only variable under test is motion:"
---

## Beat 1: Hold 1 (0s-3s)
- type: hook
- fragment: "_density-sweep.shared.html"
- onscreen: "Density sweep row one" · "Density sweep row two" · "Density sweep row three" · "Density sweep row four" · "Density sweep row five" · "Density sweep row six" · "Density sweep row seven" · "Density sweep row eight"
- mechanism: eight rows on one shared field; this beat's `motion:` line is swept by the rig
- becomes: an empty field becomes the row list
- motion: [data-part="row1"]@fadeUp:professional
- why: baseline hold, one move only, so the rig has a floor to raise from
- duration: 3s

## Beat 2: Hold 2 (3s-6s)
- type: build
- fragment: "_density-sweep.shared.html"
- onscreen: "Density sweep row one" · "Density sweep row two" · "Density sweep row three" · "Density sweep row four" · "Density sweep row five" · "Density sweep row six" · "Density sweep row seven" · "Density sweep row eight"
- mechanism: same shared field, second hold; this beat's `motion:` line is swept by the rig
- becomes: the first hold becomes the second, DOM kept alive across the cut
- motion: [data-part="row2"]@fadeUp:professional
- why: second identical hold, so move-count is the only thing changing across the sweep
- duration: 3s

## Beat 3: Hold 3 (6s-9s)
- type: build
- fragment: "_density-sweep.shared.html"
- onscreen: "Density sweep row one" · "Density sweep row two" · "Density sweep row three" · "Density sweep row four" · "Density sweep row five" · "Density sweep row six" · "Density sweep row seven" · "Density sweep row eight"
- mechanism: same shared field, third hold; this beat's `motion:` line is swept by the rig
- becomes: the second hold becomes the third, DOM kept alive across the cut
- motion: [data-part="row3"]@fadeUp:professional
- why: third identical hold
- duration: 3s

## Beat 4: Hold 4 (9s-12s)
- type: payoff
- fragment: "_density-sweep.shared.html"
- onscreen: "Density sweep row one" · "Density sweep row two" · "Density sweep row three" · "Density sweep row four" · "Density sweep row five" · "Density sweep row six" · "Density sweep row seven" · "Density sweep row eight"
- mechanism: same shared field, fourth hold; this beat's `motion:` line is swept by the rig
- becomes: the third hold becomes the fourth, DOM kept alive across the cut
- motion: [data-part="row4"]@fadeUp:professional
- why: fourth identical hold, closes the film
- duration: 3s
