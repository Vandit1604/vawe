---
message: "The interface in this film was never recorded. Every frame of it is drawn from JSON."
audience: "Engineers and designers reading the vawe docs site, deciding whether this engine can render their product."
arc: "hook → build → proof → payoff"
framework: "BAB — the frame opens on something familiar (a dashboard), turns it into something a capture could not do, and the bridge is the format itself."
threads: "a continuous object (the panel lifted out of the dashboard survives the last cut and flies out of frame under the payoff) + a motif (a mono caption in the engine's own voice sits under every shot)"
format: 1920x1080
theme: "themes/vawe.json"
duration: 10.6s
pace: "showreel · 3.4s per idea, three ideas"
spectacle: "beat 3 · the #surface card · resample dissolve, amount 0.05 to 0.95 · the interface burns away on an ember front and leaves the sentence that explains it. Beats 1 and 2 hold one device each so this one is the only loud thing in the film."
not: "no narration, no gradient hero, no slogan on a black card, no stock photography, no second loud beat. Nothing outside beat 3 carries a hero effect."
---

## Beat 1: Hook (0s-3.4s)
- type: hook
- shot: wide (the window fills the middle two thirds, the frame breathes around it)
- camera: hold
- picture: a real browser window on app.vawe.dev, a segmented tab bar, an area chart of frames per hour and a KPI row, with a pointer travelling in and clicking Export
- onscreen: "the clock is real"
- mechanism: block-built UI · a tab selection that slides · a pointer that travels and clicks
- becomes: an empty frame becomes a working product surface, and a still tab bar becomes a switched one
- trigger: nothing yet. The film opens on the thing everybody assumes is a capture.
- layout: the window in the middle two thirds, caption in the lower sixth
- style: white ground, dot matrix, real product chrome at full fidelity
- rest: the dot matrix drifts behind the window; nothing else moves through the hold
- why: earn the doubt. If the viewer does not first believe it is a recording, the payoff has nothing to overturn.
- emotion: recognition
- duration: 3.4s
- transition_in: cut

## Beat 2: Proof (3.4s-6.7s)
- type: feature_showcase
- shot: medium (one panel, travelling right to left across the upper half)
- camera: hold
- picture: one worker panel lifted out of that dashboard, standing at an angle in depth, sliding across a dark ground and leaving a fan of receding echoes behind it
- onscreen: "Every frame is drawn." / "no recording holds still like this"
- mechanism: tilt in depth · a hand-keyed motion track · ghost trail off that same track · a caption pinned under the moving panel by follow
- becomes: a flat page element becomes a solid standing in light and travelling, and the world behind it inverts from white to ink
- trigger: the pointer clicks Export in beat 1, so the render starts and one worker of eight has something to report
- layout: panel crossing the upper middle, headline across the top sixth, caption riding under the panel
- style: the ground inverts to ink, the card stays white, the accent is the only colour on the bar
- rest: none. The whole beat is the travel.
- why: state the claim while the frame is doing the thing a capture cannot do, so the copy and the picture carry it together
- emotion: surprise
- duration: 3.3s
- transition_in: cut

## Beat 3: Payoff (6.7s-10.6s)
- type: benefit_highlight
- shot: close (the card owns the upper third, the type owns the lower half)
- camera: hold
- picture: the surface reassembled once, then eroded away on a noise front until nothing is left but the ground
- onscreen: "No screen recording." / "This is JSON."
- mechanism: resample dissolve on a built layer · word-by-word kinetic reveal · one flash sting on the junction
- becomes: the product surface becomes the format that produced it, and the panel from beat 2 leaves the frame under the sentence
- trigger: the travelling panel runs out of frame, so there is nothing left to look at but what made it
- layout: the card in the upper third, the two payoff lines stacked across the lower half
- style: spotlight ground, everything muted so the burn is the brightest thing on screen
- rest: none. The dissolve is the motion.
- why: name the thing. The whole film exists for this one sentence and it lands last.
- emotion: conviction
- duration: 3.9s
- transition_in: riseBlur
