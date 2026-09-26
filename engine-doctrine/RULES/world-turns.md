---
name: world-turns
when: authoring the bg block of any scene
holds: doctrine only. quality/gates/backdrop-turn.mjs was a TASTE gate (engine-doctrine/SAFEGUARDS.md,
  "OBJECTIVE vs TASTE") and was RETIRED, not demoted; nothing enforces this rule any more, a human/agent
  judge does
answers: "why the backdrop must change tone per beat, and the 82% of the library that ships one window"
group: look
codes: []
---
# The backdrop changes tone per beat, or the film is a slide with effects on it

`bg` is required, so the backdrop is always a decision, never a default. List backdrop windows in the
order the film turns and give none of them a `from`/`to`: the engine binds window i to the cut after
it, so the cuts already written own the timing. 82% of gate-visible scenes paint one window for the
whole runtime. A pictorial beat on a dead backdrop is still a slide.

| parameter | value |
|---|---|
| library scenes with one bg window for the whole film | 82% |
| bg windows should bind to | the film's own cuts (list them, no `from`/`to`) |

Right:
```json
{ "bg": { "windows": [
  { "preset": "black" },
  { "preset": "softwash", "tint": "accent" },
  { "preset": "black" }
] } }
```

Wrong:
```json
{ "bg": { "preset": "black" } }
```

**The mechanism the retired gate used**, kept here since it is still the honest way to check this by hand:
two `bg[]` windows "turn" when they disagree on anything but their time span (`windowKey`, everything
except `from`/`to`, compared as a set). Zero or one window, or every window sharing the same preset and
non-time options, means the tone never turns. A film with no `bg[]` at all (painting its backdrop through
a layer instead) has nothing to compare and is not gradeable either way. Measured before retirement: 142
of 181 graded library films turned; the 82% figure above is the older, wider "one window for the whole
film" census this doc opened with.
