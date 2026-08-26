---
message: "Render the same film twice and the bytes match, because a frame is a pure function of its number."
audience: "Engineers reading the vawe docs site who have been burned by a render pipeline that drifts between runs."
arc: "hook → build → proof → payoff"
framework: "Star-Story-Solution — the star is the first run's hash, the story is running it again, the solution is that the two are one line."
threads: "a continuous object (the run 1 hash chip survives the cut, slides aside and stays on screen while the second one arrives) + a bookend (the film opens on 1,350 frames and closes on the function that draws each of them)"
object: "the hash chip for run 1"
object_t0: "it does not exist. The terminal is still building."
object_states: "cut 1 — it slides left out of the centre to leave room for a second chip that is about to arrive and prove it"
object_last: "it is off the left edge, and the sentence it earned is on screen"
format: 1920x1080
theme: "themes/vawe.json"
duration: 9.8s
pace: "showreel · 3.3s per idea, three ideas"
spectacle: "beat 2 · the #runB chip · ghost trail, k of 8, off its own motion track · the second render's answer flies in from off-frame trailing a fan of echoes and lands beside the first, and the two read as one string. One flash sting on the landing and nothing else in the film is amplified."
not: "no narration, no abstract particle field, no chart standing in for the claim, no second effect anywhere outside beat 2, no invented benchmark numbers."
---

## Beat 1: Hook (0s-3.35s)
- type: hook
- object: it is born at the end of the beat, when the build finishes and hands it a hash
- shot: wide (the terminal in the middle third, the headline over it)
- camera: hold
- picture: a build terminal running vawe film.json, its output lines arriving, then a pill carrying the run 1 hash
- onscreen: "One film. 1,350 frames." / "run 1 · a4f1e0c9d2"
- mechanism: block-built terminal · line-by-line output · a pill that rises in under it
- becomes: an empty frame becomes a finished render, and a finished render becomes a single string that identifies it
- trigger: nothing yet. The film opens on the ordinary case: one render, one result.
- layout: headline in the top sixth, terminal in the middle third, the chip in the lower third
- style: white ground, dot matrix, mono everywhere, one green dot as the only colour
- rest: the dot matrix drifts; the chip holds still once it lands
- why: put the evidence on screen before making any claim about it
- emotion: attention
- duration: 3.35s
- transition_in: cut

## Beat 2: Proof (3.35s-6.65s)
- type: feature_showcase
- object: it slides left out of the centre, still on screen, making room for its own duplicate
- shot: medium (two chips side by side across the lower middle)
- camera: hold
- picture: the run 1 chip moving aside while a second chip flies in from off-frame right trailing a fan of echoes, landing beside it with the identical string
- onscreen: "Render it again." / "run 2 · a4f1e0c9d2"
- mechanism: a hand-keyed motion track on both chips · ghost trail off the incoming one · a flash sting on the landing frame
- becomes: one answer becomes two answers, and two answers become the same answer written twice
- trigger: a hash on screen invites the only question worth asking about it, which is whether it holds
- layout: the line "Render it again." across the middle third, both chips across the lower middle
- style: the ground lifts to airier pools, the chips stay white, nothing else enters
- rest: none. The arrival is the beat.
- why: show the comparison instead of asserting it. Two strings side by side are the whole proof.
- emotion: recognition
- duration: 3.3s
- transition_in: cut

## Beat 3: Payoff (6.65s-9.8s)
- type: benefit_highlight
- object: gone off the left edge, having earned the line that replaces it
- shot: close (type owns the middle of the frame)
- camera: hold
- picture: the empty ground under one large line and one small mono line naming the guarantee
- onscreen: "Byte for byte, the same." / "renderFrame(n) is pure in n"
- mechanism: word-by-word kinetic reveal · a mono footer fading up late
- becomes: two matching strings become one stated guarantee, and the guarantee becomes the function signature that makes it true
- trigger: the second chip lands identical, so the reason it landed identical is now the only thing left to say
- layout: the headline across the middle third, the mono line under it, the rest deliberately empty
- style: spotlight ground, type is the only object
- rest: none. The reveal runs to the last frame.
- why: name the mechanism. A promise with a reason behind it is the thing an engineer can check.
- emotion: trust
- duration: 3.15s
- transition_in: riseBlur
