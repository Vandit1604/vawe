---
message: "Fathom keeps reading past where your computer quits, and the film never once cuts to a diver."
audience: "an experienced diver scrolling a feed, who already owns a computer and does not believe marketing about depth"
arc: "hook (a reading that should not exist) -> the instrument -> the mechanism -> payoff (the number the hook withheld) -> close"
threads: "a continuous object (the depth rule: a hairline accent column pinned to the left stage margin, hand-keyed on an `h` track, growing from 0 to full frame across the whole film, so the film itself descends) + one dive, one instrument, never a person"
spectacle: "beat 3 (The mechanism) - the sensor stack drawing itself open, layer by layer, while the depth rule keeps falling behind it - the one beat where the object comes apart"
not: "no diver, no ocean footage, no stock photography, no gradient hero, no Inter/Space Grotesk/Instrument Serif, no drop shadow (a machined instrument is milled, not floated), no captured brand (fictional, per docs/EVALS.md), and no background this library already leans on: the field opens and closes on metallicSheen, the one preset of 23 with zero users, surfaced by `make arsenal --census`, and the two dense beats sit on quiet grounds instead, because a signature field is seasoning and not wallpaper"
format: 1920x1080
theme: fathom
duration: 17.5s
craft:
  captions: "no spoken track, so no word-timed captions; on-screen copy only, checked against the web safe strip"
  color: "fathom's own locked palette: near-black anodised field, one backlit sea-glass green. No fragment invents a colour"
  density: "beats 2 and 3 carry an eyebrow, a headline and one real instrument object; beats 1, 4 and 5 stay lean, the hook, the payoff and the close"
  direction: "the register is KINETIC (docs/CRAFT/MOTION-REGISTERS.md, launch spine), so motion runs through every beat rather than being spent once. The restraint is in the BUDGET, not the stillness: beat 3 is the named peak and every other moving thing is the depth rule or one entrance"
  html-fragments: "every fragment moves via `parts` stagger; the sensor stack opens on `--t` in a calc(), never a CSS animation or transition"
  layout: "left-anchored at the stage margin, with the depth rule occupying the left edge as a fixed column; only the close centers"
  motion-craft: "the depth rule is a 6-key hand-authored height track, never a fired preset, and it never reverses: a descent that goes back up is not a descent"
  show-dont-tell: "every claim beat shows the thing that makes it true rather than asserting it: beat 2 shows the bezel that produced the hook's reading, beat 3 opens the sensor stack into four labelled layers, and beat 4 counts the run time up on a live count layer instead of printing it. No beat is type on a field"
  typography: "Geist Mono for every measured value and Geist sans for prose, because an instrument face separates what was measured from what is claimed. The size scale is the theme's own derived ramp (hook 98 / headline 68 / body 40 / caption 26 from core/registry/theme-contract.js), so no fragment invents a size; the two deliberate departures are the hook depth reading and the payoff count, both oversized because they are the film's two numbers"
  sound: "sound is on: an auto-resolved bed, no cue, because nothing in this film makes a noise underwater"
  transitions: "the theme's own derived cut family (whip, from durationScale 0.85) carries every joint except the last, which is the quietest one in the film"
---

<!-- THE DESIGN STUDY. No real Fathom exists, so this stands in for `make sections` per docs/EVALS.md's
     ruling that fictional briefs study themselves.

     THE POINT OF THIS FILM, beyond the film. It is the first one authored after the motion work, and it
     is deliberately built through the mechanisms that work added rather than around them:

       - the REGISTER came from the type spine, not from memory. `launch` is kinetic, so sustained
         motion is correct here and the "one loud moment" rule does not apply the way it does to an
         explainer. The budget still applies: beat 3 is the named peak.
       - the BACKGROUND came from `node scripts/author/arsenal.mjs "" --census --kind "background
         preset"`, which reported metallicSheen as the 1 of 23 with zero users. Novelty is not a
         recommendation, so it was checked for fit: a near-black anodised field with slow accent rods
         is what a machined instrument looks like, and the fit is the reason, not the novelty.
       - the BACKDROP TURNS because the theme declares a rotation and the film opts in with
         `bg: [{ "use": "theme" }]`. The engine does not choose it; fathom.json does, once, and every
         film on this brand inherits the same decision.
       - the CUT FAMILY was derived, not picked. fathom's durationScale of 0.85 resolves to a whip
         default through core/registry/theme-contract.js. Nobody typed "whip".
       - the MOTION was verified by measurement, not by looking: `make motion-trace` reports the depth
         rule's per-frame velocity, which is the only way to know a hand-keyed track actually moved.

     WHY NO DIVER. Every dive-product film cuts to a diver, and the diver is the least informative
     frame available: it shows the sport, not the instrument. Withholding the person is the film's one
     structural bet, and it is what lets the depth rule carry continuity instead. -->

**The company.** Fathom machines one thing: a titanium dive computer with a pressure sensor rated past
where recreational diving stops. It sells to people who already own a computer.

**The honesty rule.** Every number on screen is internally consistent with a single fictional dive
profile (a descent to 41 metres, a 38-minute run time). Nothing claims a real certification.

## Beat 1: Hook (0s-3.5s)
- type: hook
- object: the depth rule, one hairline at the left margin, already falling
- shot: wide (the frame is mostly empty, the reading sits in the middle third)
- camera: hold
- picture: a single depth reading in mono, brass on near-black, with the rule beside it. The cue line beneath it is a kinetic text layer, decoded character by character, not part of the fragment
- onscreen: "41.2 m" / "your computer stopped reading at 40"
- motion: [data-part="depth"]@riseIn:energy
- mechanism: kinetic number reveal, the rule already in motion before the first word
- becomes: an empty field becomes a descent already underway, and a number nobody asked for becomes the question the film answers
- trigger: nothing yet. This beat opens the film
- layout: the reading left of centre, the rest deliberately empty
- style: one colour, mono type, the field is the only texture
- rest: the depth rule keeps falling through the hold
- why: open loop. A reading past where the viewer's own gear quits is a question, not a claim
- emotion: unease
- duration: 3.5s
- transition_in: cut

## Beat 2: The instrument (3.5s-7s)
- type: product_intro
- object: the instrument face arrives, the depth rule continues behind it
- shot: medium (the face owns the middle third)
- camera: hold
- picture: the instrument face, a machined bezel with the live reading inside it
- onscreen: "Fathom One" / "titanium, 120 m rated"
- motion: [data-part="bezel"]@popIn:professional; [data-part="spec"]@fadeUp:professional/energy
- mechanism: the face assembles around the number the hook already showed
- becomes: the loose reading becomes an instrument that produced it, and a bare number becomes a readable face
- trigger: the hook's number needed a source, and this beat is the source
- layout: face left-anchored at the stage margin, spec list beneath
- style: milled edges, no shadow, the bezel is drawn not floated
- rest: the depth rule keeps falling
- why: answer where the number came from before making any claim about it
- emotion: recognition
- duration: 3.5s
- transition_in: whip

## Beat 3: The mechanism (7s-11s)
- type: proof
- object: the sensor stack, opening layer by layer
- shot: close (the stack fills the frame's right two thirds)
- camera: hold
- picture: the sensor stack drawing itself apart into four named layers, each labelled
- onscreen: "four sensing layers" / "titanium diaphragm · strain bridge · thermal trim · seal"
- motion: [data-part="layer"]@slide-left:energy; [data-part="label"]@fadeUp:energy
- mechanism: the object comes apart, which is the one thing a photograph cannot do
- becomes: a sealed instrument becomes a stack of decisions, and each layer becomes a claim with a name on it
- trigger: a 120 m rating is a claim until the thing that makes it true is visible
- layout: the stack on the right, labels stepping down the left beside the depth rule
- style: exploded view, hairline leaders, nothing filled
- rest: this is the peak. The depth rule keeps falling and nothing else is added
- why: THE SPECTACLE. The only beat where the product opens, and the only one that earns a close shot
- emotion: respect
- duration: 4s
- transition_in: whip

## Beat 4: Payoff (11s-14.5s)
- type: payoff
- object: the run time, the number the hook withheld
- shot: medium (one number, one line)
- camera: hold
- picture: the full dive profile as a single measured line, with the run time called out
- onscreen: "38 min at depth" / "one dive, one charge, no surface check"
- motion: [data-part="runtime"]@growUp:energy; [data-part="proof"]@fadeUp:professional
- mechanism: the withheld half of the hook lands
- becomes: a depth reading becomes a whole dive, and the near-black field becomes the only bright frame in the film
- trigger: beat 3 proved it can read. This beat says for how long
- layout: the number oversized, left-anchored, the profile line beneath it
- style: the accent field arrives here, the only beat that is not near-black
- rest: the depth rule reaches the bottom of the frame and stops. The descent is over
- why: pay off the loop the hook opened, on the film's only bright frame
- emotion: settled
- duration: 3.5s
- transition_in: whip

## Beat 5: Close (14.5s-17.5s)
- type: cta
- object: the wordmark, with the depth rule at full height beside it
- shot: medium (centred, the one centred frame in the film)
- camera: hold
- picture: the wordmark and the rule, nothing else
- onscreen: "Fathom" / "fathom.dive"
- motion: [data-part="word"]@fade:gravity
- mechanism: the film's quietest cut into its quietest frame
- becomes: the instrument becomes a name, and the descent becomes a full-height rule that finally stops
- trigger: the payoff has landed and there is nothing left to prove
- layout: centred, a deliberate break from every beat before it
- style: near-black again, the accent only in the rule
- rest: none. The rule has arrived and holding still is the point
- why: close on the name, at the bottom of the descent
- emotion: quiet
- duration: 3s
- transition_in: dissolve
