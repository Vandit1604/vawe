---
message: "A white-first SaaS launch film you can refill: swap the copy, swap the theme, keep the cut."
audience: "Anyone forking this engine who needs a launch film and has no film to copy."
arc: "hook → proof → demo → reverse → number → capability → CTA"
framework: "FAB, feature, advantage, benefit. Chosen because a launch film for a fictional product has no pain to agitate; it has a claim, a demonstration and a number."
threads: "a motif (the accent-lit field never leaves, and it flinches on every cut, so the whole world feels the edit) + a match cut (the one rollout row becomes the count of 4.8 million of them) + a bookend (the hero CTA button returns as the end card CTA)"
format: 1920x1080
theme: "themes/default.json, swap this one field to reskin the whole film"
duration: 35s
pace: "explainer, 5s per shot. Seven shots over 36s, six cuts, one backdrop window each"
spectacle: "shot 5 · the match cut at 20.0s · the rollout row that says done is REPLACED, in its own pose, by a 176px figure counting to 4.8M. One rollout becomes four point eight million of them, with no entrance and no exit, and the accent field lifts under it. Every other shot holds one idea at one volume."
not: "no stock photography, no captured third-party UI, no real company logos, no narration, no hardcoded hex, and no shot longer than six seconds."
---

This video tells a forker that the shape of a launch film is reusable even when nothing else is.

## Beat 1: Hook (0s-5.2s)
- type: hook
- shot: wide, subject on the left third, the lit field owning the right half
- camera: hold
- picture: a 104px inline svg mark beside the wordmark, over a three-blob field drifting behind a white scrim, every blob drawn from theme tokens
- onscreen: "MERIDIAN" / "One platform to run your whole release." / "Start free"
- mechanism: per-word kinetic reveal · mark pop · continuous blob drift
- becomes: an empty lit field becomes a named product with a claim under it
- layout: type in the left half, the lit field filling the right half
- style: white-first, one accent, type is the only object
- rest: the blob field never stops drifting, 14% scale over the beat
- why: state the claim before anything has to be believed
- duration: 5.2s
- transition_in: fx:none
- backdrop: dotmatrix

## Beat 2: Proof (5.2s-9.8s)
- type: social_proof
- trigger: the claim in beat 1 is unbacked, so the next frame has to name who took it
- shot: medium, the wall filling the lower half
- camera: hold
- picture: a six-cell logo wall of invented companies
- onscreen: "Teams of every size build here."
- mechanism: headline word reveal · logoWall cascade · the field kicks on the cut
- becomes: the claim becomes a list of people who took it
- layout: headline across the upper third, the wall filling the middle third
- style: quiet, no accent except the headline emphasis
- rest: the field keeps drifting; nothing else moves
- why: one line of borrowed credibility before the demo
- duration: 4.6s
- transition_in: fx:rise
- backdrop: paper

## Beat 3: Demo (9.8s-15.2s)
- type: feature_showcase
- trigger: a list of customers proves nothing about the product, so the product has to be shown working
- shot: medium-close, the window on the right two thirds
- camera: hold
- picture: a browser frame holding a release checklist, three items done and one waiting
- onscreen: "Ship a change in one click." / "Review, canary and rollout are one timeline."
- mechanism: headline enters from the right · browserFrame rise · checklist stagger
- becomes: a claim about shipping becomes a release you can read line by line
- layout: type on the left third, the window filling the right two thirds
- style: the product surface at full contrast, everything else muted
- rest: the checklist rows arrive one at a time
- why: show-don't-tell. The only beat that demonstrates anything
- duration: 5.4s
- transition_in: fx:punch
- backdrop: soft

## Beat 4: Reverse (15.2s-20s)
- type: feature_showcase
- trigger: the checklist left one row unfinished, and the film owes the audience that row
- shot: close, the unfinished row lifted out of the window as one panel
- camera: slowPush to 1.06, released on the cut
- picture: a full-width headline over the last checklist row, alone, now marked done, with a caption pinned live under it
- onscreen: "Every step is reversible." / "Reversible from the same row."
- mechanism: headline continues its leftward travel · panel rise · caption follows the panel's real box
- becomes: the waiting row becomes a finished rollout you can undo
- layout: a full-bleed headline across the upper third, one wide panel across the lower band
- style: one surface, one accent dot, nothing else
- rest: the camera push IS the rest motion, and it is released at the cut
- why: a rollout nobody can undo is a threat, not a feature
- duration: 4.8s
- transition_in: fx:zoom
- backdrop: gradientWash

## Beat 5: Payoff (20s-25.4s)
- type: benefit_highlight
- trigger: one reversible rollout is a demo; the film has to say how many there have been
- shot: close, the number owning the left half at full height
- camera: hold
- picture: a bar chart of four years growing beside a 176px figure that opens already wearing the panel's pose
- onscreen: "SHIPPED LAST YEAR" / "4.8M" / "deployments run through Meridian, up 38%."
- mechanism: MATCH CUT (rolloutPanel → heroCount, hard, no entrance and no exit) · hero count-up · barChart grow
- becomes: the demonstrated rollout becomes four years of them
- layout: the number owns the left half, the chart the right half
- style: the accent field lifts under the whole frame. THIS is the spectacle beat
- rest: none, the count carries it
- why: land the scale the demo implied, on the frame where the form changes
- duration: 5.4s
- transition_in: fx:none
- backdrop: accentPlain

## Beat 6: Capability (25.4s-30s)
- type: feature_grid
- trigger: a single number invites the question of what produced it
- shot: wide, four cards across the middle band
- camera: hold
- picture: four capability cards arriving one after another, each with one token-coloured word
- onscreen: "Everything the team needs to deploy / observe / review / roll back."
- mechanism: one word swaps inside a fixed accent chip while nothing after it reflows · staggered card rise · cards blur out
- becomes: one number becomes the four things that produced it
- layout: headline in the upper third, the card row filling the middle third
- style: even, deliberately quiet after the peak
- rest: the chip turns over four times; the cards hold
- why: name the surface area without demonstrating four more things
- duration: 4.6s
- transition_in: fx:punch
- backdrop: paperShapes

## Beat 7: CTA (30s-35s)
- type: cta
- trigger: the breadth is stated and there is nothing left to prove, so the film asks
- shot: close, everything stacked centre, the world inverted to dark
- camera: hold
- picture: a 160px inline svg mark filled from the accent token, bobbing on a keyed motion track
- onscreen: "Start with Meridian." / "Start now" / "meridian.example"
- mechanism: mark pop and bob · word reveal · button rise · held to the last frame
- becomes: the capability list becomes an address you can type
- layout: mark, line, button and url stacked centre with generous margin
- style: the one dark frame in a white-first film, so the last shot is the one that looks different
- rest: the mark bobs 12px twice across the beat
- why: the bookend. The hero's button returns as the last thing on screen, on an inverted ground
- duration: 5.0s
- transition_in: fx:rise
- backdrop: ink
