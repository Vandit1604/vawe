---
message: "A white-first SaaS launch film you can refill: swap the copy, swap the theme, keep the craft."
audience: "Anyone forking this engine who needs a launch film and has no film to copy."
arc: "hook → proof → demo → number → capability → CTA"
framework: "FAB — feature, advantage, benefit. Chosen because a launch film for a fictional product has no pain to agitate; it has a claim, a demonstration and a number."
threads: "a motif (the accent-lit gradient field never leaves, and every beat is lit by it) + a bookend (the hero CTA button returns as the end card CTA)"
format: 1920x1080
theme: "themes/default.json — swap this one field to reskin the whole film"
duration: 45s
pace: "explainer, 7s per idea — six ideas over 45s"
spectacle: "beat 4 · the count layer · a 176px figure counting to 4.8M beside a bar chart that grows under it. The one loud frame; every other beat holds one idea at one volume."
not: "no stock photography, no captured third-party UI, no real company logos, no centred hero, no hardcoded hex."
---

This video tells a forker that the shape of a launch film is reusable even when nothing else is.

## Beat 1: Hook (0s-7.6s)
- type: hook
- shot: wide, subject on the left third, the gradient field owning the right half
- camera: hold
- picture: a four-blob gradient field drifting behind a white scrim, all four blobs drawn from theme tokens
- onscreen: "One platform to run your whole release." / "Start free"
- mechanism: per-word kinetic reveal · count-up on the uptime chip · continuous blob drift
- becomes: an empty lit field becomes a claim with a button under it
- layout: type in the left half, the gradient field filling the right half
- style: white-first, one accent, type is the only object
- rest: the blob field never stops drifting, 14% scale over the beat
- why: state the claim before anything has to be believed
- emotion: confidence
- duration: 7.6s
- transition_in: cut

## Beat 2: Proof (7.6s-13.2s)
- type: social_proof
- shot: medium, the wall filling the lower half
- camera: hold
- picture: a six-cell logo wall of invented companies
- onscreen: "Teams of every size build here."
- mechanism: headline word reveal · logoWall block cascade
- becomes: the claim becomes a list of people who took it
- layout: headline across the upper third, the wall filling the middle third
- style: quiet, no accent except the headline emphasis
- rest: the field keeps drifting; nothing else moves
- why: one line of borrowed credibility before the demo
- emotion: reassurance
- duration: 5.6s
- transition_in: cut

## Beat 3: Demo (13.2s-24.6s)
- type: feature_showcase
- shot: medium-close, the window on the right two thirds
- camera: slowPush (the camera scale ramps to 1.06 across the end of the beat)
- picture: a browser frame holding a release checklist, three items done and one waiting
- onscreen: "Ship a change in one click." / "Review, canary and full rollout are one timeline."
- mechanism: browserFrame rise · checklist stagger · camera push
- becomes: a claim about shipping becomes a release you can read line by line
- layout: type on the left third, the window filling the right two thirds
- style: the product surface at full contrast, everything else muted
- rest: the camera push IS the rest motion
- why: show-don't-tell. The longest beat, because it is the only one that demonstrates anything
- emotion: trust
- duration: 11.4s
- transition_in: cut

## Beat 4: Payoff (24.6s-31.4s)
- type: benefit_highlight
- shot: close, the number owning the left half at full height
- camera: hold
- picture: a bar chart of four years growing under its own labels, beside a 176px figure
- onscreen: "SHIPPED LAST YEAR" / "4.8M"
- mechanism: hero count-up · barChart grow-up · nothing else on screen
- becomes: the demonstrated release becomes four years of them
- layout: the number owns the left half, the chart the right half
- style: the loudest frame of the film. THIS is the spectacle beat
- rest: none, the spectacle carries it
- why: land the scale the demo implied
- emotion: inevitability
- duration: 6.8s
- transition_in: cut

## Beat 5: Capability (31.4s-39.2s)
- type: feature_grid
- shot: wide, four cards across the middle band
- camera: hold
- picture: four capability cards, each with one token-coloured word and one line
- onscreen: "One platform. Every tool the team needs."
- mechanism: grid rise with easeOutExpo · headline word reveal
- becomes: one number becomes the four things that produced it
- layout: headline in the upper third, the card row filling the middle third
- style: even, deliberately quiet after the peak
- rest: the field drifts; the cards hold
- why: name the surface area without demonstrating four more things
- emotion: breadth
- duration: 7.8s
- transition_in: cut

## Beat 6: CTA (39.2s-45s)
- type: cta
- shot: close, everything stacked centre
- camera: hold
- picture: an inline svg mark, filled from the accent token, bobbing on a keyed motion track
- onscreen: "Start with Meridian." / "Start now" / "meridian.example"
- mechanism: mark pop and bob · word reveal · button rise · held to the last frame
- becomes: the capability list becomes an address you can type
- layout: mark, line, button and url stacked centre with generous margin
- style: quiet, the mark is the only chromatic object besides the button
- rest: the mark bobs 12px twice across the beat
- why: the bookend. The hero's button returns as the last thing on screen
- emotion: invitation
- duration: 5.8s
- transition_in: cut
