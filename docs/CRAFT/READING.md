---
when: a line is on screen and you do not know if anyone can read it
answers: "hold by word count · the flicker gap · what counts as prose · why the library reads once, not twice"
group: density
codes: line-length
---

# Reading: can a viewer take the words in, in the seconds they are there?

Every other check on on-screen copy grades the WORDS. `copy-check` grades the writing and flags a
headline over 14 words as too long "to read in a beat", but it never looks at the beat. So a nine-word
headline alive for 0.6s walks the whole ladder clean, and only an eye ever notices.

`node scripts/gates/read-check.mjs <scene.json>` joins the copy to the clock. It reports; nothing
blocks. Read it anyway.

## The numbers, and where each one comes from

We render at 30fps. Subtitling publishes its numbers in 24fps frames, so every one is converted here
and the conversion is stated. A rule under 33ms is below our resolution and is not a rule here.

| what | number | at 30fps | source |
|---|---|---|---|
| hold, by words | `words x 0.6s` (read twice at 200 wpm) | `words x 18` frames | [ssw.com.au](https://www.ssw.com.au/rules/post-production-do-you-give-enough-time-to-read-texts-in-your-videos) |
| reading-rate wall | 20 characters per second | reported, never demanded | [Netflix general requirements](https://partnerhelp.netflixstudios.com/hc/en-us/articles/215758617-Timed-Text-Style-Guide-General-Requirements) |
| floor on one event | 20 frames at 24fps = 0.833s | 25 frames | [Netflix timing](https://partnerhelp.netflixstudios.com/hc/en-us/articles/360051554394-Timed-Text-Style-Guide-Subtitle-Timing-Guidelines) |
| ceiling on one event | 5s (BBC), not Netflix's 7s | 150 frames | [samtext.com](https://www.samtext.com/services/translation-agency/audiovisual-text/subtitling-guidelines/) |
| gap between text | exactly 2 frames, or at least 0.5s | 3 frames, or 15 | [Netflix timing](https://partnerhelp.netflixstudios.com/hc/en-us/articles/360051554394-Timed-Text-Style-Guide-Subtitle-Timing-Guidelines) |
| text after a cut | inside 0.5s, snap to the cut | measured from the cut WINDOW's end | same |
| line length | 42 characters | stays in `copy-check` | [Netflix general requirements](https://partnerhelp.netflixstudios.com/hc/en-us/articles/215758617-Timed-Text-Style-Guide-General-Requirements) |

**Netflix and the BBC disagree about the ceiling, and we take the BBC's 5s.** Not by averaging: 7s is
sized for a feature, and a 30-second film that parks one card for 7s has spent a quarter of itself on
one line.

**Past 8 words the two published rules contradict each other.** A 9-word line needs 5.4s to be read
twice, which breaks the 5s ceiling the moment it gets it. That is Netflix's 42-character cap arriving
by a second route. The answer is to cut the line, never to argue with the clock.

## The hold is the still part

The read-twice clock starts when the last character SETTLES, not when the entrance begins. Movement
belongs to the entrance and the exit; the hold is still, because words are not readable while they
assemble. That split is an inference from the published guidance, not a quoted rule, and it is the one
place this gate reasons past its sources.

`settleWindow` in `core/safe.js` already owns "when is this layer at rest". The gate asks it rather
than deriving a second answer, and supplies the engine's own `BASE_ENTER`/`BASE_EXIT` defaults so the
ramp it subtracts is the one the render actually spends.

## Not all text is read

A number counting up, a chart axis label, a caption under a mark, a chip, a watermark: these are
LOOKED AT, not read. A gate that treats every string as a sentence fires on hundreds of layers and
gets waived by everybody, which is worse than no gate. So the hold rules see only PROSE:

> a `text` layer (or a typeless one, which is a text layer) · 4 or more words · `size` >= 28

- **`count` excluded.** A counter's job is the arc of the number, not the reading of it.
- **1-3 words excluded.** "1,200 teams", "Ship it", an eyebrow, an axis tick: apprehended at a glance.
  `words x 0.6` would demand 1.8s of a two-word chip.
- **`size` under 28 excluded.** A caption, a credit, a legend. Small type is reference material the eye
  returns to, not a line the film asks you to read on the way past.
- **`html` excluded.** Its words are markup, and nothing here can tell a heading from a tooltip.

The FLASH rules (`text-flashes`, `flicker-gap`, `text-off-the-cut`) are wider on purpose: they see
every text or count layer with any words, because a label that blinks for four frames is a defect
whatever it says.

## What the library says about the rule

Over the 135 gate-visible scenes: `unreadable-hold` 61% of scenes · `flicker-gap` 33% · `text-overstays`
12% · `text-flashes` 8% · `text-off-the-cut` 5%. Forty-one scenes are clean and forty-six carry no
prose at all.

Four of the five fit. `unreadable-hold` does not, and the shape of the miss is the useful part: **the
median failing line holds 0.58 of what read-twice asks.** The library is not wild, it is authored to
read the words ONCE. The rule is measuring the right thing and asking for an ambition this library has
never had. It reports, and it is promoted to blocking when fewer than a fifth of scenes carry the
finding.

## Four exemptions, every one put there by a real false positive

Each was firing on the library and each was checked by eye before it was written.

1. **A gap holding a cut is not a flicker, it is the transition.** brew-launch leaves a 9-frame hole
   across its `punch` at 14.1s, which is Netflix's own rule (end before the cut, resume on it)
   producing a hole exactly the width of the cut window.
2. **A word swapping in a fixed box is one element, not N events.** Same size, same `x`/`y`, taking
   over within half a second: the eye tracks the slot. `_catalog-2` cycles a colour through twenty
   0.48s layers on one mark, and CLAUDE.md's launch rule 5 asks for that idiom by name.
3. **Lag after a cut is measured from the END of the cut window.** Nothing is read while the
   transition plays. Measured from the frame, a three-frame stagger read as "lagging its own cut".
4. **`text-overstays` needs the hold to exceed what the reading asked for**, or it fights
   `unreadable-hold` past 8 words.

## What it does not see

- Whether the words are worth reading. That is `copy-check`, `make judge` and your eyes.
- Text inside an `html` layer, a `component` or a capture.
- Contrast, size against the canvas, or whether the type is legible at all. That is `make audit`.
- Motion DURING the hold. The still-hold inference is honoured by measuring the settled window, but a
  layer that drifts through its own hold is not flagged: a slow `ken` drift is fine and a fast one is
  not, and no source publishes the line between them.
