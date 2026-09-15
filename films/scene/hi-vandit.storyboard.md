---
message: "Hi im Vandit, said fast and once, no slogan attached"
audience: "people meeting Vandit through his work: a portfolio, a repo, a deck"
arc: "one continuous action: the word 'Hi' assembles, then morphs into a waving hand outline, and holds waving as the name settles in beside it"
threads: "a transforming object (below), no bookend needed at 6s: the object's own arc opens and closes the film"
object: "the 'Hi' mark"
object_t0: "unformed: a bare black frame, nothing drawn"
object_states: "draws itself on stroke by stroke, resolves to a filled 'Hi', then melts (true point-lerp shape morph) into a waving hand outline"
object_last: "a waving hand, held, with 'im Vandit' settled in beside it, nothing further moves"
format: 1920x1080
theme: "themes/hi-vandit.json"
duration: 6s
spectacle: "beat 2 (Turn) · the mark layer · the true shape-morph (core/layers/path-morph.js) melting the filled 'Hi' into the hand outline · the one loud moment in a film that has exactly one beat's worth of runtime to spend it in"
not: "no corporate blue (default.json's cobalt is the vawe/SaaS colour, refused on purpose), no gradient hero, no stock hand photo or emoji hand, no slogan or tagline under the name, no second idea competing with the morph, no camera move standing in for the content motion"
craft:
    captions: "none: no voice, no narration, nothing to caption"
    color: "one warm accent (#ff4b2b) on true black (bg preset black, #000000, no tint), pulled into themes/hi-vandit.json so no colour is invented inline"
    density: "deliberately thin: one mark, one name, nothing else. A 6s personal card earns restraint, not a metadata row"
    direction: "restraint is everywhere except the morph: the draw-on is quiet, the hold is quiet, the wave is the only beat that moves loud"
    film-structure: "a transforming object IS the structure at this length; no cut, no second beat to bookend against"
    fragment-exemplars: "n/a, no html fragment: both mark states are inline svg path data, authored by hand for this film"
    html-fragments: "n/a, see above"
    layout: "hero-object: the mark owns the upper two-thirds of the frame, centred; the name sits in the lower third, never competing for size"
    motion-craft: "hand-keyed: draw dashoffset, then a resampled point-lerp morph, then a hand-keyed rot wave (-14/16/-10/6/0), never a named preset firing once"
    show-dont-tell: "the payoff IS the picture: a hand literally waves instead of a caption saying hello"
    sound: "audio.auto:true picks a real bed; a single chime-weight cue lands on the morph, no VO"
    typography: "im Vandit sets in Anybody (the only face this film uses), the same face the mark's proportions were drawn to sit beside"
---

<!-- Personal title card, no site, no client. Type: sting (skills/vawe-type-sting/SKILL.md). One
     continuous object across 6s, three states, no cut, no transition. -->

## Beat 1: Name (0.0s-1.7s)
- type: hook
- archetype: centred
- weight: quiet
- object: unformed: a bare black frame, nothing drawn
- onscreen: (none, the mark itself is the only mark)
- mechanism: svg draw-on (dashoffset 1->0 over 0.85s) then fill resolve (0.3s), core/layers/svg.js
- becomes: the bare black frame becomes the stroke-drawn outline of "Hi", which then becomes a solid filled mark
- trigger: the film starting; nothing precedes it
- why: open with the name itself arriving, not a claim about it. A personal card's first frame is its own subject
- duration: 1.70s

## Beat 2: Turn (1.7s-3.3s)
- type: product_surface
- archetype: hero-object
- weight: peak
- object: draws itself on stroke by stroke, resolves to a filled "Hi", then melts into a waving hand outline
- onscreen: (none)
- mechanism: true point-lerp shape morph (core/layers/path-morph.js, resample+lerp, dur 1.5s, spin 0.35rad), crossfaded in against beat 1's fill
- becomes: the filled "Hi" mark morphs into a waving hand outline, the same weight and colour, no cut
- trigger: the "Hi" mark finishing its resolve is what starts the morph
- why: the payoff the user asked for, exactly: the word becomes the gesture. This is the one beat that gets to be loud
- duration: 1.60s

## Beat 3: Wave (3.3s-6.0s)
- type: payoff_withheld
- archetype: lockup
- weight: strong
- object: a waving hand, held, with "im Vandit" settled in beside it, nothing further moves after the settle
- onscreen: "im Vandit"
- mechanism: hand-keyed rot track on the settled hand (-14, 16, -10, 6, 0 degrees across five keys) while the name fades and rises in underneath (14px, 0.4s, easeOutCubic)
- becomes: the still hand becomes a waving hand as "im Vandit" resolves into view beside it, then both hold
- trigger: the morph landing on the hand shape is what starts the wave
- why: the wave IS the demonstration, so the name can land quietly under it instead of doing the film's only work
- duration: 2.70s
