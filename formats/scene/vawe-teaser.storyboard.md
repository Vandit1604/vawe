---
message: "vawe is launching, and the film itself is the proof of what it makes."
audience: "developers and AI agents who will build videos with it, seen in a feed or a launch post"
arc: "hook → turn → payoff"
framework: "Star-Story-Solution, chosen because the film has one actor and one line of copy. There is no problem to agitate and no feature to list, so PAS and FAB have nothing to hold: the star IS the type treatment, and the solution is the address it turns into."
threads: "a motif carried unbroken (one word-mass, one heat cycle, one field) and a match cut on that mass, where the outgoing and incoming words share a silhouette at the moment neither is legible"
object: "the word-mass: one line of type, centre frame, from first frame to last"
object_t0: "plain white type on pitch black, no effect on it at all"
object_states: "it heats into thermal colour · it melts and re-forms as a different word · it cools back to plain white"
object_last: "vawe.dev, plain white, no effect, the address left alone on black"
format: 1920x1080
theme: "themes/argus.json"
duration: 6s
pace: "held, 2s per idea. Three ideas in six seconds, and each one is allowed its own beat. A teaser that reads as busy has already failed, because the only thing it has to deliver is an address."
spectacle: "beat 2 · the film layer · the goo morph through the thermal ramp · the one moment the word is illegible, which is what makes the address arriving after it feel like a reveal rather than a caption"
not: "no narration, no logo lockup, no gradient, no cuts, no second element on the frame, no fade to end. The word is the only object and the black is genuinely #000000."
---

<!-- THE WHOLE FILM IS ONE HTML LAYER, and that is the point being demonstrated as much as stated.
     `--t` is the scene clock in seconds, so the heat, the morph and the cool are all functions of time
     inside one fragment. The scene's own `_why` carries that argument; this plan carries the film's. -->

## Beat 1: The word, plain (0s-2.4s)
- type: hook
- object: the word-mass, at rest, with no effect on it
- shot: medium (the line fills the middle third, everything else empty)
- camera: hold, with a 1.05 to 1 settle on the layer
- picture: "launching soon" in plain white type on pitch black
- onscreen: "launching soon"
- mechanism: scale settle on easeOutQuint, then nothing
- becomes: the empty black becomes a stated promise
- trigger: nothing. This beat opens the film
- layout: type across the middle third, the upper and lower thirds deliberately empty so the heat has room to bloom into them later
- style: no effect whatsoever. The plainness is load-bearing, because beat 2 only reads as a change if beat 1 had nothing on it
- rest: none. Two seconds of a still white word is the restraint the spectacle line is paid for with
- why: state the promise in the cheapest possible way, so the treatment that follows is clearly happening TO something
- emotion: plain statement
- duration: 2.4s
- transition_in: cut

## Beat 2: It heats, and melts (2.4s-4.4s)
- type: transformation
- object: the same mass, now carrying the thermal ramp, losing legibility and re-forming
- shot: medium (unchanged: nothing travels, the change is entirely in the treatment)
- camera: hold
- picture: the word takes on a thermal blur, white core, orange body, blue rim, then blurs into an illegible molten bar and re-forms as a different word
- onscreen: "launching soon" becoming "vawe.dev"
- mechanism: gradient map on luminance (the AE thermal blur) ramping in over 0.85s, then a goo morph, blur plus contrast on an opaque plate, peaking where neither word is readable
- becomes: the promise becomes the address, through a state where it is neither
- trigger: the word has been still and plain for two seconds, which is exactly long enough for a change to read as deliberate rather than as the film starting late
- layout: unchanged middle third, but the heat blooms into the thirds beat 1 kept empty
- style: the one loud moment in the film. Everything either side of it is plain white type
- rest: none. This beat is all change
- why: the payoff has to be a REVEAL and not a caption, and the only way to reveal a word is to make it briefly unreadable
- emotion: heat, then release
- duration: 2s
- transition_in: none, the beat is a state change of the same object

## Beat 3: The address, plain (4.4s-6s)
- type: cta
- object: the mass, cooled back to exactly what it was in beat 1
- shot: medium
- camera: hold
- picture: "vawe.dev" in plain white type on pitch black
- onscreen: "vawe.dev"
- mechanism: the thermal ramp fades out over 0.8s, leaving no effect at all
- becomes: the molten mass becomes a plain address
- trigger: the morph completes, and a word that has just been unreadable has to be given a clean frame to be read in
- layout: identical to beat 1, which is the bookend
- style: no effect. The film ends where it began, on plain white type, and only the word has changed
- rest: none
- why: the one thing to remember is the address, and it lands last, alone, with nothing competing
- emotion: settled
- duration: 1.6s
- transition_in: none
