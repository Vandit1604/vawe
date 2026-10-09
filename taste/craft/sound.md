---
when: the film has no sound, you are about to ship it mute, or you are placing a cue or a music bed
answers: "how to place subtle cues with <audio data-synth>; the 13 voices and their pitfalls; sound bridges, sync points, silence; what music we may legally put under a film"
group: crosscutting
---

# SOUND: place cues on purpose, and give the film a texture

Contents:
- [The mechanism](#the-mechanism)
- [The 13 voices (`CUES` in `core/audio/kit.mjs`)](#the-13-voices-cues-in-coreaudiokitmjs)
- [What each sound says, and where it belongs](#what-each-sound-says-and-where-it-belongs)
- [Sync points are scarce](#sync-points-are-scarce)
- [The sound bridge](#the-sound-bridge)
- [Silence, on purpose](#silence-on-purpose)
- [How well evidenced is this?](#how-well-evidenced-is-this)
- [Licensing: what may go under a film](#licensing-what-may-go-under-a-film)

The rules are [sound-level](../rules/sound-level.md), [sound-voices](../rules/sound-voices.md), [sound-swell](../rules/sound-swell.md), [cue-has-event](../rules/cue-has-event.md), [cue-sparse](../rules/cue-sparse.md), [sound-bridge](../rules/sound-bridge.md), [sound-default-on](../rules/sound-default-on.md) and [music-licence](../rules/music-licence.md). This page keeps the mechanism and the reasons.

Sound is the default, not silence. A film must still read with the sound off (feed autoplay is muted),
but a film that works silent and has sound beats the same film mute. Silence is a device: say why in the
brief. Mute by habit closes a quarter of the ways a short film can hold together: the sound bridge and
music-led structure are aural.

## The mechanism

Audio is `<audio>` tags in the page, never played live, mixed offline by `harness/media/page-audio.mjs`
(the contract is in `AGENTS.md`).

```html
<audio src="assets/bed.mp3" loop data-at="0" data-gain="-14" data-fade-out="1.2"></audio>  <!-- loop = the music bed -->
<audio data-synth="pluck" data-at="2.4"></audio>                                            <!-- a synthesized cue -->
<audio data-synth="impact" data-at="7.8" data-gain="-4"></audio>
<audio src="assets/vo.wav" data-role="vo" data-at="0.5"></audio>                            <!-- ducks the bed -18 dB -->
```

- Attributes: `data-at` (s), `data-gain` (dB), `data-fade-in`, `data-fade-out`, `data-trim`,
  `data-duck` (dB), `data-role`. An unknown voice or a missing file fails the render with the list.
- The mix is as written: the sum of the cues at their gains. Nothing is raised or lowered. A
  -1 dBTP limiter never raises a level. `<meta name="loudness" content="-14">` opts in to normalising.
- A cue that peaks more than 6 dB above the median cue draws a warning, never a refusal.
- Default gains (`DEFAULT_GAIN_DB` in `core/audio/kit.mjs`) are -6 dB for soft voices, -4 for whoosh,
  riser and swell, -2 for impact, drop and braam. Four soft cues plus one swell land near -20 LUFS.
- Keep cues subtle: the starters write `data-gain="-8"` on a pluck. Time a cue to the page's own beat
  number, the same literal the CSS or `seek` uses, so a retimed beat moves both.
- Two cues in one frame, or a cue louder than the bed's texture, read as a mistake. Listen to
  the render (`bin/vawe ship`), do not trust the numbers.

## The 13 voices (`CUES` in `core/audio/kit.mjs`)

All synthesized from parameters, seeded and deterministic: no files, no licence, nothing to 404.
Every kept voice has zero noise layers. Ten noise-based UI cues were cut after a listening pass because
filtered white noise reads as cheap.

| voice | family | use it for | pitfall |
|---|---|---|---|
| `pluck` | accent | a small thing landing: a counter digit, a minor element | loud and repeated reads as a machine gun |
| `chime` | accent | a light confirmation for a small positive event | |
| `sparkle` | accent | a bright four-note flourish for a decorative reveal | |
| `droplet` | accent | one discrete arrival | |
| `bloom` | confirm | something gently arriving or expanding into view | |
| `success` | confirm | a completed, positive event (three notes up) | |
| `ready` | confirm | something is now available or armed | |
| `whoosh` | transition | an object or camera really crossing the frame | it sweeps up then down so the pass has an inflection |
| `riser` | riser | tension building into a beat; time it to END on the beat | leave the frame after it quiet |
| `drop` | impact | a half-second sub-down that lands ON a cut | not a fast 808 knock |
| `impact` | impact | a collision, a slam into place | it layers body, transient and a 1 to 3 kHz mid |
| `swell` | weight | a reverse-cymbal move that stops dead on the cut it introduces | no tail, so the collapse lands within about 90 ms |
| `braam` | weight | low sustained weight for a serious moment | dates a piece to trailers of the 2010s; use rarely |

A cue is honest only if it names something the viewer sees happen. A `pluck` with nothing landing on
screen is a lie: cut it. Voices are for rendering; to audition, `node harness/dev/sound-lab.mjs`.

## What each sound says, and where it belongs

| element | says | belongs |
|---|---|---|
| whoosh | something travelled | on a layer that really crosses the frame, length matching the move |
| impact | something arrived and stopped | on a hard stop, never on an ease-out |
| riser | something is coming | the only sound about frames you have not shown yet |
| sub-drop | scale | a reveal you want to feel large |
| UI tick, click | this interface is real and being operated | the highest-value sound in a product film, and the one that is never decoration |
| foley | a person is present | handling, cloth, a hand entering frame |
| room tone | this frame is a place | under everything, as glue |

A whoosh on every transition makes every transition equally important, so none is. That is
mickey-mousing applied to editing. Score the two or three seams that earn it.

## Sync points are scarce

Chion's synchresis: a sound and an image that meet fuse into one event, and almost any of many sounds
will do. You are not hunting the correct sound, you are choosing what the picture is read through.
Spend one or two hard sync points per short film on the moments you want believed. Wall-to-wall hits
turn into noise and the audience stops noticing them.

- Track first (lock the track, mark audio and visual key moments, design against the markers) for a 10 to
  40 s product film. Cut on the beat, or two frames early: the eye needs time to find the new subject.
- Find the grid with `vawe sound <track>`. It reports low confidence on an
  ambient pad and says so, which is the right answer. Then put the cut times on that grid.
- If the logo lands at 24:15, pick the tempo that puts a beat there. Do not nudge the logo.

## The sound bridge

A sound bridge is audio crossing a picture change, and it is a continuous object that costs the
picture nothing. A film whose beats are visually unrelated stays whole if one texture runs under all
of them and changes at the junctions.

- J-cut: the next scene's audio starts before its picture. The cut arrives as confirmation, not surprise.
  In the page: start the next scene's `<audio data-at>` ahead of the cut, with `data-fade-in` (lead and fade in [sound-bridge](../rules/sound-bridge.md)).
- L-cut: the previous scene's audio runs under the new picture, so two shots read as one beat. Set the
  old sound's length past the cut with `data-fade-out`.
- Fade both ends (an equal-power crossfade of about 0.35 s). A bridge never butts.
- Examples people cite: Whiplash (the drum roll starts the film), Saving Private Ryan (gunfire into rain).

## Silence, on purpose

True digital silence reads as a fault. A film that drops to nothing sounds broken. A film that drops
to a held tone sounds deliberate. The pattern for short form is the pre-impact drop: cut everything one
beat before the reveal, then land the impact into the vacuum (riser, nothing, hit). It is the single
highest-value thing sound does for a payoff beat. Set `data-fade-out` on the bed to shape the tail, and
keep a tone under the drop: do not cut the bed to nothing.

## How well evidenced is this?

Mostly craft doctrine, not measurement. Do not cite it as science.

- Audio-visual fusion is real (McGurk 1976). That does not show that sound makes video perform better.
- One small VR study (N=17 trained listeners) found room acoustics bought as much perceived immersion as
  five times the pixels. Limits: expert listeners, spatial audio, immersion is not ad performance.
- The best-known controlled quality study (Beerends and De Caluwe, JAES 1999) found picture quality moves
  perceived audio quality about six times more than the reverse. Good pictures make sound seem better.
- Sonic-branding multipliers ("3.44x more effective") and sound-on versus sound-off ad results are vendor
  publications with no disclosed method. Never quote them. No independent randomised test was found.
- So add sound because it opens a structural register, not because a study says it scores better.

## Licensing: what may go under a film

Music is the one asset class with automated global enforcement. A wrong image gets a takedown if someone
notices. A wrong track gets a Content ID claim on upload.

- Our voices are synthesized, so they have no licence question. Keep it that way.
- Only CC0 and CC BY are safe from Creative Commons. CC BY needs the credit kept in the description.
- Never use CC ND: syncing music to moving image is always Adapted Material in the licence text
  itself, so no ND track can go in any film. CC NC is unsafe for client or paid work.
- Pixabay is the strongest free source (a site-wide, irrevocable, commercial licence; keep the
  certificate). Mixkit's free tier permits commercial use, no attribution, no redistribution of the
  file. The YouTube Audio Library is YouTube only. Free Music Archive and ccMixter are directories, not
  licensors: read the licence on every track.
- Subscription libraries (Artlist, Epidemic, Musicbed, Soundstripe) each have a trap in their own
  terms: cancellation, "same media" limits, or agency tiers. Read the contract before buying, not the
  FAQ, and add the destination channel to the safelist before posting. A claim on correctly licensed
  music is the expected outcome, not an anomaly.
- AI-generated music is not copyrightable when purely prompt-made (US Copyright Office, Jan 2025), so
  nobody owns it and vendors may forbid Content ID registration. Use it for internal animatics only.
- `assets/music/` is gitignored: committing a Mixkit file would publish it as a standalone download,
  which the licence forbids. Record the source and licence of every bed in `assets/music/credits.json`
  before it goes under a film. A track whose licence nobody can produce is not usable.
