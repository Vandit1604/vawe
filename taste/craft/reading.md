---
when: a line is on screen and you do not know if anyone can read it
answers: "hold by word count, the numbers and their sources, which text counts as prose, the flicker gap"
group: density
---

# Reading: can a viewer take the words in, in the seconds they are there?

The rule is [readable-hold](../rules/readable-hold.md) (the numbers live there; prose is read twice at
200 wpm). This page holds the sources and the edge cases.

## The numbers

| what | number | source |
|---|---|---|
| hold, by words | `words x 0.6 s` | [ssw.com.au](https://www.ssw.com.au/rules/post-production-do-you-give-enough-time-to-read-texts-in-your-videos) |
| reading-rate wall | 20 characters per second | [Netflix general requirements](https://partnerhelp.netflixstudios.com/hc/en-us/articles/215758617-Timed-Text-Style-Guide-General-Requirements) |
| line length | 42 characters | same |
| gap between two texts | 2 frames, or at least 0.5 s | [Netflix timing](https://partnerhelp.netflixstudios.com/hc/en-us/articles/360051554394-Timed-Text-Style-Guide-Subtitle-Timing-Guidelines) |
| text after a cut | inside 0.5 s, snap to the cut | same |
| ceiling on one line | 5 s (BBC), not Netflix's 7 s | [samtext.com](https://www.samtext.com/services/translation-agency/audiovisual-text/subtitling-guidelines/) |

We take the 5 s ceiling: a 30 s film that parks one card for 7 s spends a quarter of itself on one line.
Past 8 words the read-twice hold breaks the ceiling. Cut the line. Do not argue with the clock.

## The hold is the still part

The clock starts when the last character settles, not when the entrance begins. Words are not
readable while they assemble. Motion belongs to the entrance and the exit. A slow drift through the
hold is fine, a fast one is not, and no source says where the line is.

## Not all text is read

A counting number, an axis label, a chip of 1 to 3 words, a credit, a watermark: viewers look at
these, they do not read them. Hold rules apply to prose: 4 or more words at a real size (about 28 px
at 1080p or more). A word that swaps inside one fixed box is one element, not many events. A gap that
holds a cut is the transition, not a flicker.

## What no rule sees

Whether the words are worth reading, text inside a captured surface, and contrast. Look at the
frames (`bin/vawe review`, `bin/vawe critique`).
