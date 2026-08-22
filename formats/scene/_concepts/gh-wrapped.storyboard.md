---
message: "A year of 1822 contributions, and the change that travelled furthest was 26 lines."
audience: "Developers who read a wrapped card and scroll past it. They watch this on a timeline, muted-first, once."
arc: "hook → build → proof → payoff → hold"
framework: "Star-Story-Solution, inverted. The STAR is a number the film spends four beats making enormous, and the SOLUTION is that the number was never the point. Chosen over AIDA because a wrapped film has no call to action and one reversal."
threads:
  - "CONTINUOUS OBJECT + CAMERA TRAVEL: the 366-cell contribution map is one object on screen for all 17s, never re-entered, and the camera makes ONE unbroken flight over it that ends by diving onto a single cell."
  - "ESCALATION, then its reversal: nothing · 502 · 1822 · 77% · and then 26, the smallest number in the film and the only one that left the account."
object: "the contribution map, 366 cells, one per day of the year"
object_t0: "drawn in dim grey, cell by cell, week by week. Six months of it are empty and that emptiness is the hook."
object_states: "b1 dark and drawing · b2 the right half IGNITES in a wave · b3 pushed back and small, the numbers stand in front of it · b4 dimmed to a ground under three bars · b5 the camera dives 2.5x onto ONE cell and a box snaps around it · b6 that one cell is the whole frame and it is the payoff"
object_last: "one lit cell, 12 Aug, boxed, with the repo it belongs to named beside it for the first time"
format: 1920x1080
theme: "themes/ashfall.json (INVENTED by make invent-look, seed 41, from this storyboard)"
duration: 17s
pace: "showreel · 2.8s per idea, 6 ideas. A wrapped film competes with a thumb, so no idea gets a second beat and no beat carries two."
spectacle: "beat 5 · the snapbox layer · ripple · the whole film has been getting larger, and this is the one moment it gets SMALLER, so the impact has to be felt rather than read"
not: "no fades, anywhere. No centred type. No pie chart, no legend, no donut, no 'wrapped' card with rounded corners and a gradient. No emoji. No language of celebration: the film never says amazing, incredible or milestone. The heatmap is never re-entered, so nothing is ever introduced twice."
---

# GitHub wrapped · Vandit1604 · 20 Aug 2025 to 20 Aug 2026

This video tells developers who scroll past wrapped cards that a year of 1822 contributions was
outweighed by 26 lines.

Every number below comes from `formats/scene/_data/gh-wrapped.json` and nothing else.

| fact | value |
|---|---|
| window | 20 Aug 2025 to 20 Aug 2026 |
| quiet spell | 6 months, Dec to May |
| the month it came back | Jun, 502 |
| the month after that | Jul, 793 |
| total | 1822 across 131 of 366 days |
| longest streak | 38 days, ending 3 Aug |
| top repos | vawe 665 · threadcite 568 · argusHQ 173 (1406, or 77%) |
| payoff | +26 / -0 into VictoriaMetrics, 17,571 stars, 12 Aug |

The name VictoriaMetrics and the star count appear in beat 6 and nowhere before it.

## Beat 1: Six months of nothing (0s-2.8s)
- type: hook
- object: born here. It draws in dim, week by week, left to right, and its left half stays empty.
- shot: mid, low and pushed in, so 366 cells read as terrain and not as a chart
- camera: push in
- picture: the map drawing itself cell by cell across the bottom third, one hairline span bracketing the six dead months
- blueprint: wordBlast (Adapt: one word, oversized, leaves by growing THROUGH the frame instead of fading)
- ask: "Punctuate with one word that arrives oversized, settles, creeps, then grows THROUGH the frame. It does not fade."
- onscreen: "Nothing." / "DEC · JAN · FEB · MAR · APR · MAY"
- mechanism: cell-by-cell popIn on a rolling stagger · a rule that draws itself left to right under the dead span
- becomes: an empty grid becomes a measured absence, and six unnamed months become a bracket with a name on it
- layout: the map fills the lower third full width, the word owns the middle third, the top of the frame deliberately empty
- style: everything grey. The accent has not been spent yet, and that is the whole point of the beat
- rest: 1.5% breathing scale on the word through its hold, drift on nothing else
- why: the viewer starts by believing this is a film about a person who did not work, so the turn costs nothing to set up and everything to spend
- emotion: unease
- duration: 2.8s
- transition_in: cut

## Beat 2: It catches (2.8s-5.6s)
- type: turn
- object: acted on. The right half of the same grid IGNITES in a wave, left to right, on the cells that were already there.
- shot: mid, the camera pulling back as the fire spreads so the world opens and the fire grows at once
- camera: pull back
- picture: 200-odd cells lighting in a rolling wave over the same map, a bloom sitting behind them
- blueprint: kineticHook (Adapt: drop the eyebrow, keep the hero count-up, subline arrives word by word)
- ask: "Open on a kinetic hook: eyebrow, one hero number or word that counts up, a subline that arrives word by word."
- onscreen: "Then June." / "502" / "contributions in one month"
- mechanism: second popIn wave over the same cells · count 0 to 502 on easeOutExpo · riseClip per word
- becomes: the dead grid becomes a lit one, and an absence becomes a rate
- layout: the map still on the lower third, the headline top-left, the number top-right at about a third of frame width
- style: the first accent in the film, and it arrives as light coming off the map rather than as a colour applied to type
- rest: drift on the bloom only, so the lit map is never quite parked
- why: this is the only junction where the film changes its mind about its subject, so it gets the loudest cut and the warmest ground
- emotion: relief turning to momentum
- duration: 2.8s
- transition_in: burn

## Beat 3: The size of it (5.6s-8.4s)
- type: stat_stack
- object: pushed back and made small. It stays lit under the numbers and is never re-entered.
- shot: close on the number row, the map behind and below it
- camera: hold
- picture: three fixed slots turning over at the same offsets, with two bars beneath whose LENGTH is 131 of 366 and 38 of 366
- blueprint: slotSwap (Reproduce: fixed slots, contents turn over, the right slot changes type each pass)
- ask: "Fix a row of slots and turn its contents over N times at the same offsets. The right slot changes TYPE each pass so it never reads as a table."
- onscreen: "contributions 1822" / "days that shipped 131 / 366" / "longest streak 38 days"
- mechanism: three passes through one slot pair · two bars widening on easeOutExpo, the second a beat after the first
- becomes: one month becomes a year, and three separate claims become one measured shape
- layout: the label column on the left half, the payload at two thirds across, the bars filling the width under both
- style: numbers are the picture. Type at display scale, bars in accent, the map dimmed to a ground
- rest: 1.5% breathe on the settled slot row, nothing else
- why: the film has to earn the right to a reversal, and it earns it by making the total genuinely large first
- emotion: scale
- duration: 2.8s
- transition_in: punch

## Beat 4: Three repos took most of it (8.4s-11.2s)
- type: proof
- object: dimmed to a ground under the bars. Still there, still lit, never re-entered.
- shot: mid, a sentence across the top and a bar chart filling the middle band
- camera: hold
- picture: three horizontal bars whose length IS 665, 568 and 173, each with the repo name welded to its left end
- blueprint: propSentence (Adapt: the nouns are a chip and a percentage, not photographs)
- ask: "Write one sentence across the frame with real objects as the nouns: word, photo, chip, card, word, on a rolling stagger."
- onscreen: "Three repos took 77% of it." / "vawe 665 · threadcite 568 · argusHQ 173"
- mechanism: rolling word stagger · bars widening left to right · three counts rolling up beside them
- becomes: a total becomes a distribution, and a distribution becomes three names with sizes
- layout: the sentence across the top third at full width, the three bars filling the middle band, the map still on the lower third
- style: the sentence at display scale over a chart drawn only in accent opacity steps. No axis, no legend, no gridlines
- rest: drift on the bar group, 6px over the hold
- why: without this beat the payoff has no scale to be small against. 77% in three of his own repos is what makes the 26 lines somewhere else land
- emotion: certainty
- duration: 2.8s
- transition_in: zoom

## Beat 5: One cell (11.2s-14s)
- type: reversal
- object: the camera dives 2.5x onto ONE cell of the same map and a box snaps around it. Nothing new enters the frame.
- shot: close, the magnified grid running past every edge with one cell marked in it
- camera: dive
- picture: a single lit cell with a box snapping onto it and a ring travelling out from it
- blueprint: echoRing (Reproduce: a stroked ring replays the box's path one beat late, fading as it grows)
- ask: "Keep the frame alive through the slow change: a stroked ring replays the subject's path one beat late, fading as it grows."
- onscreen: "12 Aug" / "+26 / -0" / "26 lines added. Nothing deleted."
- mechanism: camera dive to 2.5x · a box snapping from 3.4x to 1 in 0.16s · a ring replaying that path one beat behind it · SPECTACLE, ripple
- becomes: a year becomes a single day, and the largest number in the film collapses into the smallest one
- layout: the marked cell with its ring and its diff line sit dead centre and take about 75% of frame width and 75% of frame height, the four corners deliberately empty, the magnified grid running behind them past every edge
- style: the loudest and the emptiest frame at once. THIS is the spectacle beat
- rest: none. The spectacle carries it
- why: the reversal has to be spatial before it is verbal, so the film arrives at 26 by physically getting smaller rather than by saying so
- emotion: impact
- duration: 2.8s
- transition_in: zoom

## Beat 6: Somebody else's repo (14s-17s)
- type: payoff
- object: held. That one cell is still on screen and the repo it belongs to is named beside it for the first time.
- shot: mid, the name at the left, the star count hard against the right edge
- camera: hold
- picture: the repo name drawing on character by character with 17,571 rolling up beside it
- blueprint: statReveal (Adapt: the hero count is somebody else's number, not his)
- ask: "Land the payoff as a hero stat that counts up under a kinetic label, and hold it."
- onscreen: "THE CHANGE THAT TRAVELLED FURTHEST" / "VictoriaMetrics" / "17,571 stars" / "26 lines. Somebody else's repo."
- mechanism: per-character riseClip on the name · count 0 to 17571 · the eyebrow wiping right
- becomes: an anonymous cell becomes a named repository, and a personal year becomes somebody else's dependency
- layout: the name and its sub sit to the left and take 56% of frame width and 40% of frame height, the star count right-aligned to the right edge, the boxed cell held below
- style: quiet after the ripple. One accent number, one white name, and no third voice
- rest: 1.5% breathe on the held name only, so the last frame is alive and still
- why: the film has spent five beats on his own numbers, so naming somebody else's repo is the only line that can end it. The star count lands last because 17,571 is the size of the thing 26 lines went into
- emotion: inevitability
- duration: 3s
- transition_in: brake
