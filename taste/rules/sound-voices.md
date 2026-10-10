---
id: sound-voices
step: sound
principle: Sound is small effects on actions, never a synth bed, pad or chord. Real recorded effects come first; the quiet synth ticks are the fallback. Silence between effects is normal, and the film still reads with the sound off, since feeds autoplay muted. Weight voices are for a brief that asks for weight.
limit: none
range: accent: pluck, chime, sparkle, droplet; confirm: bloom, success, ready; weight (impact, drop, riser) only when the brief asks
break-when: the brief asks for weight: a pre-impact drop (riser, nothing, hit) is the highest-value use of sound on a payoff; a film that ships silent says why in the brief
instead: take a recorded effect first (the user's file, or the sites in resources/README.md); use a quiet synth tick only when none fits. Before an impact, stop the effects and land the hit into the quiet. To audition the synth voices: `node harness/dev/sound-lab.mjs`.
check: none
judge: Is there a synth bed, pad or chord, or an impact, drop or riser the brief did not ask for? Does the film work muted, and does silence have a reason?
prevents: owner rule: constant synthy sounds or chords are banned. feedback: "use subtle sounds". judge1 sound 4/10 for loud cues. Ten noise-based UI cues were cut after a listening pass: filtered white noise reads as cheap.
status: active
scored: yes
numbers: {}
print-check: take a recorded effect first (resources/README.md), not a synth bed or a tick on every cut
digest: Sound is real recorded effects on the action's frame; no synth bed, pad or drone.
craft: sound
---

## Example

A recorded click at the word landing, default gain; the effects stop at 6.8 s and the hit lands at 7.0 s into the quiet.

Why and sources: [sound](../craft/sound.md).
