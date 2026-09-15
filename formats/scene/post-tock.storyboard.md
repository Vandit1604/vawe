---
message: "Tock finds the tempo you actually play, and never states a number until it has."
audience: "a musician who owns a metronome and ignores it, because it insists on a tempo they do not play"
arc: "one continuous action: the arm starts wrong, the arm is corrected by the playing, the arm settles and names the tempo"
threads: "ONE object, on screen from the first frame to the last: the pendulum arm. There are no cuts. Everything that happens is that arm changing state, and the frame is the same frame throughout"
spectacle: "the accelerando at 3.4s to 6.2s, where the arm's own clock speeds up and brakes while the arm keeps swinging, so the film changes tempo without changing shot"
not: "no preset, no anim, no parts. Not one word of the cheap vocabulary 173 films reach for. Every move in this film is a hand-keyed track or a modifier the library has never used, which is the point: no cuts, no beat cards, no diver-equivalent cutaway, no stock photography, no gradient hero, no Inter or Space Grotesk"
format: 1920x1080
theme: mercury
duration: 10s
craft:
  captions: "no spoken track; the only text is the tempo readout and one closing line"
  color: "mercury's own locked palette, near-black graphite with a single cobalt. The arm is the one bright object in the frame"
  density: "deliberately one object. A metronome is one moving part and a film about it that adds a second is describing something else"
  direction: "kinetic register (engine-doctrine/CRAFT/MOTION-REGISTERS.md): sustained motion is the content here, because the product IS a motion. The budget still holds, the named peak is the accelerando"
  fragment-exemplars: "the fragment refuses a card, refuses a grid, and refuses a second focal point. It is a scale, an arm and a readout, which is what the object has and nothing more"
  html-fragments: "the fragment is geometry only and carries no motion of its own. Every move is keyed in the scene, never a CSS animation, because the engine owns the clock"
  layout: "the arm pivots at the lower third and sweeps the upper two thirds; the readout rides its tip and the scale sits on the arc it traces"
  motion-craft: "a hand-keyed rotation track, with follow-through and squash read off the arm's own velocity rather than authored per keyframe, and an echo of its own earlier positions so the arc it has traced stays visible"
  show-dont-tell: "the film never says the word tempo until the last beat. It shows an arm that is wrong, an arm being corrected, and an arm that has settled, and the number arrives only once it has stopped moving"
  sound: "sound is on: a bed, and the arm's own tick placed on the turns rather than on a grid"
  transitions: "none. This film has no cuts at all, which is the shape a film under fifteen seconds should take and the shape 46 percent of this library has by omission rather than by decision"
  typography: "mercury's mono for the readout because it is a measured value, its sans for the one line of prose. The readout is the only oversized thing in the frame"
---

<!-- THE BRIEF THIS ANSWERS. The owner asked for a film built without reaching for `preset` or `anim`,
     the two words 173 and 167 films of 121 reach for because they cost one word each. Measured across
     the library, nine capabilities this engine ships have ZERO users and four have one:
     timeRemap 0, timeWarp 0, matte 0, squash 0, upright 0, alongPath 0, mixBlend 0, occlude 0,
     progress 0, lag 1, follow 1, morph 1, shutter 1.

     So this film is authored from that list. Not as a showcase: a metronome is the one subject where
     an auto-orienting readout, an echo of an arc, a squash at the turn and a clock that ramps are all
     the SUBJECT rather than decoration. If a device does not earn its place on this film it is not in
     it, and the list above is not a checklist to complete.

     WHY NO CUTS. A metronome is one moving part. A film that cuts away from it is describing something
     other than the object. The engine now scaffolds a film under 15s as one continuous action for this
     reason and this film is the shape that default has in mind. -->

**The company.** Tock machines one thing: a metronome that listens to four bars of playing and settles
on the tempo the musician is actually keeping, rather than the one they set.

**The honesty rule.** The only number on screen is the tempo the film has just shown being found. No
claim, no specification, no rating.

## Beat 1: The wrong tempo (0s-3.4s)
- type: hook
- object: the arm, swinging, too slow
- shot: wide (one object, the frame otherwise empty)
- camera: hold
- picture: a single machined arm sweeping a lit arc, with an unlabelled scale on the arc it traces
- onscreen: "you set 90"
- mechanism: a hand-keyed rotation track, wide and slow, with the arm's own trail showing where it has been
- becomes: an empty frame becomes an instrument keeping time, and a mechanism becomes an argument with the player
- trigger: nothing yet. This beat opens the film
- layout: the arm pivots at the lower third, sweeping the upper two thirds
- style: one bright object on graphite, no card, no second focal point
- rest: the arm never stops. It is a metronome
- why: open on the thing every musician has done, setting a number and then not playing it
- duration: 3.4s
- transition_in: cut

## Beat 2: The correction (3.4s-6.2s)
- type: proof
- object: the same arm, its clock accelerating and braking
- shot: wide (unchanged, deliberately: the frame does not move because the object does)
- camera: hold
- picture: the arm's arc narrowing and quickening, its trail bunching at the turns where it lingers
- onscreen: "you played 112"
- mechanism: an easing on the arm's own clock, so its swing, its trail and its squash all ramp together rather than being re-keyed
- becomes: an argument becomes a correction, and a fixed tempo becomes a measured one
- trigger: the first beat set a tempo the player ignored, so this beat is the playing answering back
- layout: unchanged. The whole point is that nothing cuts
- style: unchanged, so the change in tempo is the only thing to read
- rest: THE NAMED PEAK. Everything else in the film is restrained so this reads as the one loud moment
- why: this is the product working, and it is a motion, so it has to be shown as one
- duration: 2.8s
- transition_in: none

## Beat 3: Settled (6.2s-10s)
- type: payoff
- object: the arm, holding one steady tempo, the readout finally naming it
- shot: wide (unchanged)
- camera: hold
- picture: the arm swinging evenly, its trail now a clean symmetric arc, the readout upright at its tip
- onscreen: "112" / "Tock"
- mechanism: the rotation track settles to a constant period; the readout rides the arm and stays upright while the arm turns under it
- becomes: a corrected instrument becomes a settled one, and a motion becomes a number
- trigger: the correction finished, so there is a tempo to name
- layout: unchanged, with the readout at the arm's tip rather than in a corner
- style: the one moment the film states a figure
- rest: the arm keeps swinging through the last frame. A metronome that stops is a metronome that is off
- why: pay off the loop by naming the tempo only after the film has shown it being found
- duration: 3.8s
- transition_in: none
