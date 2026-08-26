---
message: "A dark, chaptered product tour you can refill: three chapters, a proof number, an end card."
audience: "Anyone forking this engine who needs a longer product film and has no film to copy."
arc: "hook → chapter 1 → chapter 2 → chapter 3 → result → proof → statement → CTA"
framework: "Star-Story-Solution — the product is the star, the three chapters are the story of one issue moving through it, the end card is the solution."
threads: "a through-line (one issue, NW-1184, is raised in chapter 1, scheduled in chapter 2 and closed by an agent in chapter 3) + a continuous object (the accent rail across the top, on screen for every frame of the film, filling with the film's own progress and flinching on every cut) + a motif (the mono chapter slug 1.0 / 2.0 / 3.0, in the same place every time, returning as the last line before the end card)"
format: 1920x1080
theme: "themes/northwind.json — swap this one field to reskin the whole film"
duration: 34s
pace: "explainer, about 4s per shot — eight shots over 34s, seven cuts, one backdrop window each"
spectacle: "shot 4 · the match cut at 14.0s · the roadmap bar labelled Agents does not leave. It IS the agent panel in the next chapter, handed over in its own pose with no entrance and no exit, and the panel then types the fix out character by character. The plan becomes the work. Every other shot holds one idea at one volume."
not: "no stock photography, no captured third-party UI, no real company logos, no vendor chips naming real tools, no narration, no hardcoded hex, and no shot longer than five seconds."
---

This video tells a forker that a three-chapter product tour is a shape, not a script.

## Beat 1: Hook (0s-4.4s)
- type: hook
- shot: wide, type on the left, an accent glow washing the lower left
- camera: hold
- picture: a 104px inline svg mark beside the wordmark, over an 96px headline whose last word swaps inside a fixed accent chip
- onscreen: "NORTHWIND" / "Where the whole team plans / builds / ships." / "Note, ticket, branch, release."
- mechanism: one word swaps in a fixed chip while nothing after it reflows · mark pop · glow fade
- becomes: an empty dark field becomes a named product with three claims in one line
- layout: type in the left two thirds of the upper half, the lower half deliberately empty
- style: near-black, one accent, no chrome
- rest: the constellation backdrop drifts under everything
- why: name the thing, and let one line do the work of three
- emotion: composure
- duration: 4.4s
- transition_in: cut
- backdrop: constellation

## Beat 2: Chapter 1, Intake (4.4s-9.2s)
- type: feature_showcase
- trigger: the hook claimed the team ships here, so the film has to start where the work arrives
- shot: medium, type left, the board on the right two thirds
- camera: hold
- picture: a dimmed issue board with one card lifted out of it at full contrast, labelled and status-dotted
- onscreen: "1.0 Intake" / "A message becomes tracked work." / "Triage · routed automatically"
- mechanism: board fade with edge falloff · card rise · delayed caption
- becomes: a wall of unsorted work becomes one routed issue with a name
- layout: type in the left third, the board filling the right two thirds
- style: everything behind the hero card pushed to 38% brightness
- rest: the backdrop drifts; the board holds
- why: introduce the through-line issue the next two chapters follow
- emotion: relief
- duration: 4.8s
- transition_in: cut (blur)
- backdrop: deep

## Beat 3: Chapter 2, Plan (9.2s-14s)
- type: feature_showcase
- trigger: an issue with an owner still has no date, so the next frame has to place it in a quarter
- shot: wide, centred, the roadmap filling the lower half
- camera: hold
- picture: three roadmap bars wiping in left to right under a month ruler, each in a different status token
- onscreen: "2.0 Plan" / "Set what the quarter is for." / "Initiatives, roadmaps and live specs."
- mechanism: each bar reveals with a wipe from its own left edge, staggered 0.3s · a beam glow behind each
- becomes: one routed issue becomes a quarter of scheduled work around it
- layout: type centred in the upper third, the roadmap filling the middle and lower thirds
- style: the only symmetrical, centred chapter. It reads as the map
- rest: the bars hold once wiped; the backdrop drifts
- why: show the plan the issue now sits inside, and put the word Agents on screen before the agent exists
- emotion: order
- duration: 4.8s
- transition_in: cut (riseBlur)
- backdrop: ink

## Beat 4: Chapter 3, Build (14s-18.6s)
- type: feature_showcase
- trigger: the third bar on that roadmap is labelled Agents, and the film cuts on it
- shot: medium, type left, the agent panel on the right
- camera: slowPush to 1.05, released on the cut
- picture: the Agents bar, in its own pose, REPLACED by an elevated glowing panel that types a run log out character by character
- onscreen: "3.0 Build" / "Hand an issue to an agent." / "Found the fix. Opening a change for review."
- mechanism: MATCH CUT (planBar3 → agentPanel, hard, no entrance and no exit) · per-character type reveal
- becomes: the scheduled line item becomes the thing doing the work
- layout: type in the left third, the panel filling the right two thirds of the upper half
- style: the one beat with an emissive surface, glow bound to the panel
- rest: the typing IS the rest motion
- why: this is the spectacle. The plan does not describe the agent, it turns into it
- emotion: surprise
- duration: 4.6s
- transition_in: hard cut (none — the match IS the transition)
- backdrop: dark

## Beat 5: Result (18.6s-22.4s)
- type: feature_showcase
- trigger: an agent that opened a change owes the audience the change
- shot: close, centred, three runner chips under one line
- camera: hold
- picture: one large centred line with three small runner chips popping in beneath it, staggered
- onscreen: "Change opened · review ready" / "Nobody touched it after." / "Build runner · Review bot · Release bot"
- mechanism: line rise · chip pops staggered 0.2s
- becomes: the typed run log becomes a change a human can approve
- layout: everything centred, the frame otherwise empty
- style: the first symmetrical frame since the roadmap
- rest: the chips hold
- why: close the through-line. The issue raised in chapter 1 is finished here
- emotion: satisfaction
- duration: 3.8s
- transition_in: cut (blur)
- backdrop: deep

## Beat 6: Payoff (22.4s-26.6s)
- type: benefit_highlight
- trigger: one finished issue is an anecdote, so the film has to say how many teams do this
- shot: close, the figure owning the centre at 170px
- camera: hold
- picture: a braking count-up to 33,000+ with two lines under it and nothing else on the frame
- onscreen: "33,000+" / "product teams build with Northwind" / "Kite Studio · Fieldwork · Orbit Labs"
- mechanism: count-up on a brake ease · staggered fades under it
- becomes: one team's finished issue becomes thirty-three thousand teams
- layout: the number owns the centre band, the frame otherwise empty
- style: a spotlight ground, so the figure is lit and nothing else is
- rest: none, the count carries it
- why: scale. Three chapters showed one issue; this says how many there are
- emotion: inevitability
- duration: 4.2s
- transition_in: cut (riseBlur)
- backdrop: spotlight

## Beat 7: Statement (26.6s-29.6s)
- type: benefit_highlight
- trigger: the number is meaningless until the film says what those teams stopped doing
- shot: close, one line centred, the chapter motif returning under it
- camera: hold
- picture: a 110px statement with the three chapter numbers set small beneath it
- onscreen: "One place. No handoffs." / "1.0 · 2.0 · 3.0"
- mechanism: slow word reveal, 0.5s each · the motif fades up under it
- becomes: three numbered chapters become one sentence
- layout: statement on the centre line, the motif under it
- style: the constellation ground returns, so the film ends where it opened
- rest: the backdrop drifts under a held frame
- why: name the thesis once, at the end, where it can be believed
- emotion: conviction
- duration: 3s
- transition_in: cut (blur)
- backdrop: constellation

## Beat 8: CTA (29.6s-34s)
- type: cta
- trigger: the thesis is stated and there is nothing left to prove, so the film asks
- shot: close, everything stacked centre
- camera: hold
- picture: a 160px inline svg mark over a 220px line, a pill and an address
- onscreen: "See it work." / "Sign up" / "northwind.example"
- mechanism: mark pop · word reveal · button rise · held to the last frame
- becomes: the statement becomes an address you can type
- layout: mark, line, button and url stacked centre with generous margin
- style: an aurora ground, the one warm frame in the film
- rest: the rail across the top reaches full width on the last frame
- why: the film ends on the product name, not on a claim about it
- emotion: invitation
- duration: 4.4s
- transition_in: cut (riseBlur)
- backdrop: aurora
