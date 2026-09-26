---
when: adding burnt-in captions, or shipping to a phone feed (tiktok / reels / shorts)
answers: "caption timing (words, vo-captions), the safe strip per destination, captionMode vs captionStyle"
group: crosscutting
routes: captions
applies-when: hasAudio
confirm: "are captions timed to the words, and do they sit in the safe strip for the destination?"
---

# CAPTIONS: timing, safe placement, and the style options

## AGENT SUMMARY

- Time captions to real words (`words:[{t0,t1}]`, via `make media X=vo-captions` or `make media X=captions`), and
  set `"destination"` (`tiktok`/`reels`/`shorts`) so the caption band sits in that platform's safe
  strip, not the default web margin.
- Enforced by `make check GATE=audit M=<file> ASPECT=all` (overlap / clipped text / safe-zone / WCAG contrast).
- Checkable action: are captions timed to the words, and do they sit in the safe strip for the
  destination?

Captions are a lock-sheet checkbox today and phone-feed vertical is first-class, so the two need to
meet. This is the short version; the fields themselves live in `films/scene/schema.json`.

## 1. Timing: write it, or derive it

A caption window is `{ t0, t1, text }` in the scene's top-level `captions` array. That is enough to
ship: the line holds for its span, distributed across words proportionally by length.

For real word-by-word timing (karaoke, `captionStyle`), add `words: [{ t0, t1 }]` per line, aligned to
the markup-stripped word list. Two ways to get it without hand-timing:

```bash
make media X=vo-captions D=<file> [STYLE=weightShift] WRITE=1   # from a VO word-timing sidecar (audio.voWords)
make media X=captions D=<file> TEXT="the line to time"           # times one plain SCRIPT string
make check GATE=pace-from-vo VO=<file>.words.json                    # paces the whole film's beats to a voice track
```

`vo-captions` reads a TTS transcript sidecar, never a live model; there is no timing without one.
Omit `words` and `core/type/captions.js` still distributes the line by word length, which reads as
intentional karaoke, just not word-perfect.

## 2. Safe placement: the strip is a property of the DESTINATION, not the shape

9:16 for a website hero and 9:16 for TikTok are the same canvas with different unusable regions.
Declare where the film is watched, and the caption band moves with it:

```json
{ "destination": "tiktok" }
```

| `destination` | chrome eaten | note |
|---|---|---|
| `web` / `feed` (default) | margin only | a site hero, an X/LinkedIn post, in-feed video: no platform chrome painted over the frame |
| `tiktok` | 16.7% right rail, 12.5% top, 30.2% bottom | the tightest phone target |
| `reels` | 14% right rail, 10% top, 22% bottom | looser than tiktok, tighter than shorts |
| `shorts` | 13% right rail, 8% top, 16% bottom | the most generous phone target |
| `broadcast` | 5% every edge | classic overscan title-safe |

(`core/layout/safe.js` `DESTINATIONS`; the tiktok figures are this repo's own measured portrait numbers,
reels/shorts are conservative interpolations and should be re-measured against the real apps before a
launch trusts them.)

**`pin:"bottom"` always lands inside the safe box**, chrome included: an edge-pinned caption can never
produce a safe-zone failure. The band itself reserves two lines at the skin's font size
(`CAPTION_LINES = 2` in `core/layout/safe.js`), so a headline placed near the bottom on a `tiktok` destination
can still collide with it, which `make check GATE=audit` catches, not the placement code:

```bash
make check GATE=audit M=<file> ASPECT=all      # overlap / clipped text / safe-zone / WCAG contrast, every canvas
```

Going to a phone feed and skipping `destination` is the common miss: the film renders fine at `web`
margins and then a real TikTok caption strip sits on top of your last line.

## 3. The style options: `captionMode` and `captionStyle`

`captionMode` (top-level scene field, `films/scene/schema.json`) picks the layout:

| Value | What it is |
|---|---|
| `sentence` | one line at a time, the plain skin |
| `word` | word-by-word reveal, the plain skin |
| `pop` | the pop layout: bigger type (64px vs 46px), built for `captionStyle` to ride |

`captionStyle` only applies on the `pop` layout and needs per-line `words` timing to read as karaoke
rather than a proportional guess. The options (`core/type/captions.js`): `highlight`, `pillKaraoke`,
`weightShift`, `clipWipe`, `neonEdge`, `kineticSlam`, `underlineDraw`, `flipUp`, `ghostSplit`,
`waveRide`, `scramble`, `wordFlash`, `wordSlide`, `typeOn`, `readerFocus`, `inkFill`, `focusPull`,
`letterRise`, `weightWave`. Pick one that matches the film's energy, not a default: `kineticSlam` and
`scramble` read loud, `weightShift` and `underlineDraw` read quiet.

A caption's own `size` overrides the skin's font size and grows the band it reserves accordingly
(`captionBand()` in `core/layout/safe.js`); a style with more visual weight (`neonEdge`'s halo, `kineticSlam`'s
overshoot) is bounded to stay inside the `styled` skin's own padding, so it never silently outgrows the
band the audit checks against.

## 4. In one line, on the lock sheet

Name the timing source (`words` written, `vo-captions`, or proportional-by-default), the
`destination` if this ships to a phone feed, and `captionMode`/`captionStyle` if the film wants more
than plain sentence captions. See [`vawe-video-planning`](../../skills/vawe-video-planning/SKILL.md)
Step 3c, the LOCK SHEET's Sound/Captions row.
