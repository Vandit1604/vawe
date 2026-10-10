---
id: sound-level
step: sound
principle: Sound is subtle: low peak, quiet mix. What you write is what you hear: no normalising, default gains.
limit: true peak at or below -3 dBFS
range: integrated loudness about -20 LUFS (the draft check warns outside -24 to -16); default gains: palette tap -3 dB, tick, air, swoosh-long and sub-thump -5; the old voices soft -6 dB, whoosh, riser and swell -4, impact and drop -2; one palette cue per beat lands near -20 LUFS
break-when: the brief names a delivery target: `<meta name="loudness" content="-14">` opts in to normalising
instead: leave data-gain off. Cue levels are read against each other: a cue that peaks more than 6 dB above or below the median cue draws a warning naming that cue, and the same data-gain shift on every cue moves the loudness without changing the balance, so it is named and is not a fix. A music track the user gave must change over time: one spectrum for the whole film is a drone (the reference films change at least 0.177 on the scale of harness/lib/bed-motion.mjs, a drone 0.002). Measure with `ffmpeg -af ebur128=peak=true`.
check: sound-peak, sound-loudness
judge: Read the measured peak and loudness: are they at or below -3 dBFS and near -20 LUFS?
prevents: feedback: "I don't like the sounds at all; use subtle sounds." judge1: -1.7 dBFS, -13.8 LUFS, sound 4/10. judge2: -10.3 dBFS, -19.9 LUFS, sound 8/10.
status: active
scored: yes
numbers: {"peak_dbfs":-3,"lufs_target":-20,"lufs_low":-24,"lufs_high":-16,"cue_peak_over_median_db":6,"cue_shift_min_db":3,"cue_shift_tol_db":1,"bed_change_min":0.1}
print-check: keep the true peak at or below -3 dBFS and the mix near -20 LUFS, not a mix pushed loud
craft: sound
---

## Example

Four plucks at -8 dB and one swell: -19.9 LUFS, -10.3 dBFS.

Why and sources: [sound](../craft/sound.md).
