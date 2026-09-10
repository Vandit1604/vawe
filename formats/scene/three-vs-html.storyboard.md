---
message: "a real light rig and a real move make a screenshot read as an object in a room, not a flat capture."
audience: "internal: does 3D quality beat html-to-video for a product shot"
arc: "hold -> hold"
format: 1920x1080
duration: 9s
threads: "an object arriving into its resting pose (a transforming object); the light and shadow it earns on the way down"
object: "the captured Brew walkthrough screenshot, mounted on the litPlane"
object_t0: "off-frame low and tilted, unlit read (a flat rectangle, no sense of weight)"
object_states: "mid-rise: tilting level, motion-blurred on the fast part of the move, a contact shadow starting to gather under it"
object_last: "settled flat, lit by the key/fill/rim rig, a soft shadow anchoring it to the floor"
spectacle: "beat 1, the plane's own arrival: rise + tilt + rotate with an overshoot-settle, motion-blurred on the fast part, landing with a contact shadow. Nothing else in the film moves."
not: "no text layer, no html layer, no camera move, no cut: one three layer, full-frame, so the material/light/shadow read is the whole comparison, not the direction around it"
---

## Beat 1: Arrival (0s-4s)
- type: hook
- mechanism: litPlane's own pose: rise (position.y) + tilt (rotation.x) + rotate (rotation.y), eased with an overshoot-settle (backOut), `blur` shutter-accumulated on the fast part of the rise
- onscreen: none (no text/html layer in this film by design)
- object: off-frame low, tilted, unlit-looking, becomes a level plane mid-rise, motion-blurred on the fastest part of the move
- becomes: an unlit-looking, off-angle rectangle becomes a level, key-lit UI plane easing into its resting pose
- why: this is the one moment being tested, whether a real light rig plus a real move reads as more "3D" than a flat capture ever could
- duration: 4s

## Beat 2: Settle (4s-9s)
- type: payoff
- mechanism: litPlane at rest: a slow sinusoidal float (position.y), the contact-shadow decal at full opacity under it
- onscreen: none (no text/html layer in this film by design)
- object: settled flat and level, floating gently, a soft contact shadow gathered under it
- becomes: the arriving plane becomes a held, lit, grounded object: the shadow, the material response and the warm backdrop are the whole payoff
- why: holding the resting frame is what lets the light and the shadow actually be looked at, which a fast cut away would not give the comparison time to do
- duration: 5s
