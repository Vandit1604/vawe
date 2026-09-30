---
when: "a song exists and every cut and hit must land on its measured beat grid"
answers: "the beat-grid brief, the one-spectacle rule, synth cues 30 ms early, and the lyric-video variant"
group: reference
---

# Music video or beat-synced ad

**Use when** a song exists and the picture must land on it: every cut on a downbeat, every hit on a
beat, the drop as the one big moment. Works for a lyric video, a product ad on a track, a motion
reel with music.

**Length:** the song's length, or a window of it (10 bars at 120 BPM is 20 seconds).

## The template

```
<inputs>
Ask me for: the song file and its licence, the window to use (start to end in seconds), the subject
(lyrics, a product with real captures, an abstract), the canvas (9:16 for a reel), and one accent.
If I skip one, take the default from the Questions section and go on.
</inputs>

<grid>
Measure the song. Write films/<name>/beats.json: BPM, the offset of the first downbeat, energy per
bar, and the drop's time. Calibrate the grid to the real kick hits, not the tempo tag. Start the
film on a downbeat. Show me the grid as a bar table before any code: bar | start | energy | what
happens.
</grid>

<direction>
One move per bar. The drop is the one spectacle: name its time in <meta name="spectacle">. Before
the drop, restraint: type on the beats, one object, one colour. After it, the field opens (a dark
scene, a wall of captures, the 3D carousel), and the camera language does not change.
Banned: a cut that is not on a beat, a hit that is not on a beat, camera shake, RGB split, a
particle burst, lens flare, a bouncy easing, a "hold" longer than one bar with nothing alive in it.
</direction>

<structure>
Bar 1: the hook lands word by word on the beats. Bar 2: a hook word becomes the subject. The drop:
one shape opens into the second world. Then one move per bar to the end: <list them>. Last bar: the
wordmark, then a fade to black on the last downbeat.
</structure>

<build>
1. One page: films/<name>/page.html, <meta name="duration">, <meta name="spectacle" content="<drop s>">.
2. Every style is computed from t in window.seek(t); the beat index is floor((t - offset) * BPM / 60).
   No CSS transitions, no timers, no state between frames. A value that changes on many beats is a
   sum of springs (track(t, keys, k, d) from core/motion/springs.js).
3. Music: <audio src="song.mp3" data-at="0" data-gain="-3" data-fade-out="0.4">. It is never played
   live; the renderer mixes it offline and normalises the master to -14 LUFS.
4. Cues: the song carries the hits, so the picture adds almost nothing. Soft ticks
   (<audio data-synth="pluck" data-at="<beat>" data-gain="-28">) on a few UI beats and one "swell"
   (-24 dB) ending on the drop. Place each by its measured peak, 30 ms early. Name each beat once in
   CSS (--beat-3: 5.42s) and read it from every delay in that beat.
5. Real footage, if any: extract clips to frame sequences with ffmpeg and swap <img src> per frame in
   seek(t); await the decode before returning.
6. Render one frame per beat first (bin/vawe dev <page>). Fix anything off the grid.
</build>

<gotchas>
Never set opacity or filter on a preserve-3d element; fade its wrapper. Measure element positions at
runtime for a match cut. A lyric line longer than the bar it sits in cannot be read; split it. The
loudness meta is optional; the default master is -14 LUFS, true peak -1 dBTP.
</gotchas>

<start>
Ask me for the inputs, measure the grid, show me the bar table, then a storyboard with every timing
on the grid, before any code.
</start>
```

## Variant: the lyric video

The subject is the words. One line per bar, the stressed syllable on the downbeat, a per-word
colour or motion device that points at the one word that matters (house rule: every device directs
the eye and names its target). The karaoke band owns the bottom of the frame; nothing else enters it.

## Questions

Ask in this order; the first changes the film most. A skipped question takes its default; never wait.

1. **Song**: the file and its licence? Default: a royalty-free 120 BPM track in `assets/audio/` with its licence file beside it. Why: every cut lands on the measured grid of this file; no song, no film.
2. **Window**: which seconds of the song, start to end? Default: the first 20 s (10 bars at 120 BPM), from the first downbeat. Why: the length is a count of bars, and the drop has to fall inside the window.
3. **Subject**: lyrics, a product with real captures, or an abstract? Default: the product, real captures only. Why: it decides what the drop opens into.
4. **Canvas**: 9:16 for a reel, or 16:9? Default: 9:16. Why: a reel is vertical; the karaoke band and the captures are laid out for one column.
5. **Accent**: one colour, as hex? Default: ice blue `#8fc0ff` on charcoal. Why: the bars before the drop stay one colour; the drop's world adds the accent.

If real clips exist: the files and their licence go in the rights table.

## Gotchas

- A tempo tag is not a beat grid. Measure.
- The kick and the visual hit must land within 20 ms. Check three hits on the strip.
- The one spectacle is one. A film with three drops has none.
- Under 15 seconds, this is a sting, not a music video; see `routes/motion-graphic.md`.

source: pattern from twoclipping's "Beat-Synced Product Motion Ad" brief
https://x.com/twoclipping/status/2102554209166000267 (via
https://github.com/guanmo-ai/awesome-ai-motion, third-party text, our own template in that shape);
the "cues from the picture, 30 ms early" and synthesised-cue table from
https://github.com/buildwithhanif/claude-animation-skill (MIT, Hanif, `scripts/sound.mjs`,
`references/sound.md`); the lyric mapping from PDoomVideo's STORYBOARD.md
(https://github.com/JohnHeibel/PDoomVideo, ISC in package.json only, pattern only).

<!-- doc-refs-allow: scripts/sound.mjs · a file in the external claude-animation-skill repo, not this one -->
