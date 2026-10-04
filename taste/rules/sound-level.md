---
id: sound-level
step: sound
principle: Sound is subtle: low peak, quiet mix. What you write is what you hear: no normalising, default gains.
limit: true peak at or below -10 dBFS
range: integrated loudness about -20 LUFS (the draft check warns outside -24 to -16); default gains: soft voices -6 dB, whoosh, riser and swell -4, impact, drop and braam -2; four soft cues plus one swell land near -20 LUFS
break-when: the brief names a delivery target: `<meta name="loudness" content="-14">` opts in to normalising
instead: leave data-gain off or lower the loudest cue; a cue that peaks more than 6 dB above the median cue draws a warning with the change that fixes it. Measure with `ffmpeg -af ebur128=peak=true`.
check: sound-peak, sound-loudness
judge: Read the measured peak and loudness: are they at or below -10 dBFS and near -20 LUFS?
prevents: feedback: "I don't like the sounds at all; use subtle sounds." judge1: -1.7 dBFS, -13.8 LUFS, sound 4/10. judge2: -10.3 dBFS, -19.9 LUFS, sound 8/10.
status: active
scored: yes
numbers: {"peak_dbfs":-10,"lufs_target":-20,"lufs_low":-24,"lufs_high":-16,"cue_peak_over_median_db":6}
print-sound: keep the true peak at or below -10 dBFS and the mix near -20 LUFS, not a mix pushed loud
craft: sound
---

## Example

Four plucks at -8 dB and one swell: -19.9 LUFS, -10.3 dBFS.

Why and sources: [sound](../craft/sound.md).
