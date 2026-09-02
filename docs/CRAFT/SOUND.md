---
when: the film has no sound, or you are about to ship it mute
answers: "sound as STRUCTURE (J-cut · L-cut · sync points · the pre-impact drop) · how to write a sound bridge (audio.bridges) · sound design vs music · how well any of it is evidenced · what we may legally put under a commercial film · the engine's audio block and commands"
group: crosscutting
codes: silent-by-omission, silence-without-a-reason, audio-block-produces-nothing, cues-have-no-sound, cue-missing, bed-unresolved, bed-missing, bed-provenance-unknown, bed-licence-unverified, bed-muted
---

# SOUND: the structural register we have not been using

Measured across `formats/scene/`: **25 films carry a real track, 90 declare `audio.silent:true`, 20 name
no `audio` block at all, and 1 has a block that produces nothing.** Not one of the 90 says why. Run
`make audio-check` to see the census fresh; it is the first thing this document is for.

That is five films in six shipping mute, and until now the doctrine said that was correct. It is being
reversed. **Sound is the default. Silence is a device, and a device has a reason you write down.**

The reason is not that a bed makes a film nicer. It is that
[`FILM-STRUCTURE.md`](FILM-STRUCTURE.md) sorts the ways a short film can be held together into four
families, and one of them: the sound bridge, music-led structure, the unfinished sentence, is
**verbal and aural**. Shipping mute does not cost us polish. It closes a quarter of the structural
vocabulary, and it closed it silently, by habit, with no decision anywhere.

> **The honest caveat, up front.** Most of what follows is craft doctrine, not measurement. §7 says
> exactly how well evidenced each claim is, and the best-known controlled study on perceived quality
> points *against* the slogan everyone quotes. Read §7 before you cite any of this at anybody.

---

## 1. The prime rule, replacing the old one

An earlier version of this file opened with *"Silence is the default. A video must WORK silent, then a
bed may make it better."* Half of that survives and half of it was doing damage.

**What survives:** a film must read with the sound off. Feed autoplay is muted, so type that only
makes sense over a voice has failed for most of its audience. That is still true and still binding.

**What was wrong:** "therefore ship it mute" does not follow. A film that works silent AND has sound is
strictly better than the same film mute, and the argument for the default was never made, it was
inherited from a real engine bug. The mixer used to auto-discover any `assets/music.wav` and put it
under everything, which produced the buzzing-under-everything failure, and the fix was to make music
opt-in (`internal/audio/audio.go`). That was the right fix for that bug. It then hardened into
doctrine, and the doctrine outlived the bug by a year.

So:

**You will ship it mute and never notice you decided anything.** Five films in six here did exactly that,
and not one of the 90 says why. Silence closes a whole quarter of the structural vocabulary, including the
sound bridge, which is a continuous object the picture never has to carry.

> **Give every film sound. If it is better mute, say so in one line and mean it.**
>
> ```jsonc
> "audio": { "silent": true, "_why": "autoplays muted in-feed; the type carries the whole read alone" }
> ```

`make audio-check D=<file>` enforces the sentence, the same way `authoring._why` enforces a reason on
a rule waiver, and for the same reason: the cost of one sentence is what turns a reflex back into a
decision. Nothing judges whether the reason is good. Nothing can. It only has to be written.

---

## 2. The sound bridge, the device this whole file exists for

A **sound bridge** is audio carrying across a picture change. It has two forms, named for the shape
they cut on a timeline.

- **J-cut: the audio leads.** The next scene's sound starts *before* its picture.
  Wikipedia's definition: "the audio from a following scene overlaps the picture from the preceding
  scene, so that the audio portion of the later scene starts playing before its picture as a lead-in
  to the visual cut." Also called an *audio advance* or *audio lead*.
  <https://en.wikipedia.org/wiki/J_cut>
- **L-cut: the picture leads.** The previous scene's sound runs *under* the new picture. "the audio
  from the preceding scene overlaps the picture from the following scene, so that the audio cuts after
  the picture." <https://en.wikipedia.org/wiki/L_cut>

StudioBinder compresses it to one line worth memorising: "In a J-cut, new audio plays over old video.
In an L-cut, old audio plays over new video."
<https://www.studiobinder.com/blog/what-is-a-j-cut/> ·
<https://www.studiobinder.com/blog/what-is-a-sound-bridge-definition/>

**What each does to a cut.** A J-cut hides the cut by moving the ear first: by the time the picture
changes, the viewer is already in the new space, so the cut arrives as confirmation instead of
surprise. An L-cut hides it the other way: the new picture arrives while the old feeling is still
sounding, so two shots read as one continuous beat. The trade framing is that a J-cut "builds
anticipation for an incoming visual" and an L-cut "holds the viewer in an emotional beat."
<https://www.soundstripe.com/blogs/a-video-editors-guide-to-j-cuts-and-l-cuts>

*Sourcing note:* that perceptual explanation is craft consensus repeated across the trade blogs. No
textbook passage stating the mechanism in those terms was found. Treat it as doctrine, not as finding.

**Named examples practitioners actually cite.** *Whiplash*: the drum roll starts the film before any
picture has earned it. *Saving Private Ryan*, Spielberg bridges gunfire into rainfall, one continuous
texture reinterpreted by a new image. Also *Good Will Hunting*, *Blue Valentine*, *Kill Bill Vol. 1*,
*Star Wars: Episode V*, *Better Call Saul* (an L-cut holding on a reaction).
<https://www.filmsupply.com/articles/j-cut-vs-l-cut/>

**Why this matters here specifically.** This repo's standing rule bans the slideshow: a short film must
carry a continuous object across its cuts, and `direction-floor` blocks on `no-continuous-object`.
Every answer we have reached for so far is visual. A prop that survives a cut, a camera that travels,
a match cut. **A sound bridge is a continuous object too, and it is the one kind that costs the picture
nothing.** A film whose beats are visually unrelated is still held together if one texture runs under
all of them and changes across the junctions. That is the register we have not been using, because we
have been shipping mute, and, until `audio.bridges` landed, because the engine could not express it.

Know the limit honestly: `direction-floor` cannot see it. The gate reads layers, so a film held
together purely by sound will still trip `no-continuous-object` and need a waiver. Write the waiver
and name the bridge in the `_why`.

### How to write one

A bridge names a **junction**, never a timestamp. The film already knows where it turns, and those
times move whenever a beat is retimed; `t: 4.37` written by hand goes wrong silently on the next edit.

```jsonc
"audio": {
  "bridges": [
    // J-cut: the room tone of shot 3 arrives 0.8s before shot 3 does.
    { "bridge": "j", "at": "cut@1", "sound": "tense", "lead": 0.8, "fade": 0.4, "duck": 0.2 },
    // L-cut: the last shot's texture runs 1.2s under the new picture.
    { "bridge": "l", "at": "seam@0", "sound": "lofi", "lag": 1.2 }
  ]
}
```

| Field | Meaning |
|---|---|
| `bridge` | `"j"` the audio leads · `"l"` the picture leads |
| `at` | `cut@N` · `seam@N` · `sting@N` · `junction@N` (all kinds merged), counted in TIME order |
| `sound` | a bed name (`"tense"`), a synthesized cue name (`"loading"`), or a path to a .wav. Looped to fill the span |
| `lead` | J only, required: seconds of sound before the picture cuts |
| `lag` | L only, required: seconds the sound keeps running after it |
| `span` | how long the sound holds on its OWN side. Default: to the neighbouring junction, or the edge of the film |
| `fade` | equal-power crossfade at both ends, default 0.35s. A bridge never butts |
| `gain` · `duck` | bridge level (0.5), and the floor the MUSIC bed drops to underneath it (1 = no duck) |

`duck` is what makes the join a *cross* rather than a stack: the bed dips on the same curve the bridge
rises on. Without it the two simply add.

**It fails loudly, on purpose.** A junction the film does not have names every junction it does have.
A `lead` that reaches back past the previous junction is refused rather than clipped, because a bridge
leaning over two shots is not the device. A `sound` that is not on disk fails the render, a film whose
continuity is carried by a texture that never plays is not a quieter film, it is a different one.

Resolved by `core/audio-bridges.js` (in the browser, where the junctions live) into spans of seconds;
mixed by `internal/audio/audio.go`, which never has to know what a cut is.

---

## 3. Sync points, which frame lands on which beat

Michel Chion's *Audio-Vision* supplies the two terms worth having. A **point of synchronization** is
where a sound event and an image event meet and fuse. The fusion is **synchresis**, "a blend of the
words synchronism and synthesis," which he defines as "the forging of an immediate and necessary
relationship between something one sees and something one hears."
<http://csmt.uchicago.edu/annotations/CHION.HTM> ·
<https://cup.columbia.edu/book/audio-vision-sound-on-screen/9780231185899/>

The practical consequence is the one nobody expects: **synchresis is promiscuous.** Chion's example is
that for a shot of a hammer, any one of a hundred sounds will do. You are not hunting the correct
sound. You are choosing which of many acceptable sounds you want the picture read through. That is a
directorial decision, not a library search.

**Animate to the track, or cut the track to the animation?** Both, and the split is production order.

- **Track first** when the piece is rhythm-driven and the track is locked early; the animation's pacing
  is then mapped onto the music's shifts in tempo and intensity.
  <https://www.epidemicsound.com/blog/animation-music-and-processes/>
- **Picture first** is the traditional studio order: animate, approve, lock picture, then lay music and
  effects to it. <https://runner.studio/blog/this-is-the-workflow-every-motion-design-studio-uses/>

For a 10 to 40 second product film the sources converge on track-first: lock the track, mark both the
audio and the visual key moments, design against the markers.
<https://www.beepboopbops.com/music-and-motion-graphics-workflow/>

**We have this both ways already, and should use the second one more.**

```bash
make beatmap MUSIC=assets/music/lofi.wav        # detect tempo + the beat grid; reports confidence
make beatsync D=<scene.json> MUSIC=… WRITE=1    # snap the scene's cuts and seams ONTO that grid
make spectrum MUSIC=… FPS=30                    # per-frame band energy → a layer can react in pure n
```

`beatmap` reports low confidence on an ambient pad and says so, which is the correct answer rather than
a fabricated grid. `beatsync` is the picture-follows-track direction and it is deterministic and
idempotent; four scenes in the library carry a `.beatsync.json` and it is the most under-used tool we
own. It no longer decides anything itself: since #457 it reads the grid and calls `core/beat-bind.js`,
so the preview and the render answer "which beat does this joint land on" the same way.

### The scene can now NAME its grid, and the engine snaps the joints itself

`beatsync` writes a second file. The original scene keeps the times the author wrote, the derivative
carries the snapped ones, and the two drift the moment anybody edits either. So a scene may instead
DECLARE the grid and let the engine bind the joints at boot, on the one path every render goes through:

```json
"audio": {
  "music": "beat",
  "beatSync": true
}
```

`true` takes the sidecar `make beatmap` wrote beside the bed (`assets/music/beat.beats.json`). The
object form sets the three knobs: `grid` (an explicit `.beats.json`), `maxShift` (how far a joint may
travel, default 0.12s) and `bar` (snap to downbeats instead of every beat).

**What snaps.** Cuts snap their time. Seams snap the CENTRE of their blend, because a blend is felt in
the middle of its window, so a seam wrapped around an already-snapped cut stays wrapped. Stings do NOT
snap: a sting is punctuation hung off a junction, and an author offsets one from its cut on purpose.
Beat boundaries and `cut@n` backdrop windows need nothing, because they are derived from the cuts and
follow for free.

**What refuses.** A joint further than `maxShift` from any beat keeps the time the author wrote, and
the run says which ones did. That refusal is the good part: dragging a cut a third of a second onto a
beat destroys the timing somebody meant. To keep one exact time inside a bound film, write
`"snap": false` on that cut or seam.

**What fails loudly.** A named grid that is missing, empty, or scored below confidence 1.6 stops the
render and names the file and `make beatmap`. A film that asks to be beat-matched and quietly renders
unmatched is the bug this replaces, not a softer version of it.

A short bed loops to fill the film, so the grid is unrolled across the runtime (`warm` is 8 seconds;
its beats recur every 8 seconds). Everything happens once, before the first frame, so `renderFrame(n)`
never sees a grid. `core/beat-bind.js`.

> **One thing decides which beat a joint lands on, and it is `core/beat-bind.js`.** The CLI calls the
> same `snapJoints`, so both use the same 0.12s tolerance, both snap cuts by their time and seams by
> their centre, and neither touches a sting. The CLI held a second opinion until #457: half a beat
> capped at 0.18s, which above 60 BPM is wider than the gap between beats, so nothing was ever left
> alone; and it moved stings, collapsing an offset the author meant. It also snapped `transitions[].at`
> before the lowering pass, so a junction written that way was snapped by its start rather than its
> centre. What still differs is only WHEN and WHERE: the declaration binds at boot and writes nothing,
> the CLI writes `<scene>.beatsync.json`. Prefer the declaration, and keep the CLI for the preview and
> for a film that wants the snapped times written down where a human can edit them.

**Hit points and tempo maps.** In scoring practice you lock the hit points first and then choose the
BPM that puts a downbeat exactly on each target frame. Carl Stalling shifted tempo several times inside
a ten-second Looney Tunes gag to do it.
<https://store.fortecomposeracademy.com/view/courses/film-scoring-for-beginners/72373-scoring-to-picture/206849-24-micky-mousing-hit-points-and-shift-points>
Directly portable: if the logo lands at 24:15, pick the tempo that puts a beat there rather than nudging
the logo.

**Mickey-mousing, and why it is an insult.** Synchronising music beat-for-beat to on-screen action,
named for the Disney shorts and usually dated to *Steamboat Willie* (1928).
<https://en.wikipedia.org/wiki/Mickey_Mousing> · <https://www.studiobinder.com/blog/mickey-mousing/>
It went pejorative for a reason that generalises: saturation. "wall-to-wall mickey mousing quickly turns
into unwanted noise," and "the audience will eventually stop noticing the clever hits if every moment
[is] packed with them." <https://tvtropes.org/pmwiki/pmwiki.php/Main/MickeyMousing>

> **A sync point is a scarce resource. One or two per short film, spent on the moments you want
> believed.** This is the audio form of the `effect-soup` ceiling, and it fails the same way.

**On the beat, or a few frames before it?** The argument for cutting early is that the eye needs time to
find the new subject, so the *visual event* should be finished by the beat, which means it starts
before it. Anticipation rather than simultaneity. The trade writing also warns that rigid beat-cutting
"can easily become quite hard visually and predictable."

*Sourcing note:* those lines come from LBBOnline's "More than Just Cutting to the Beat," which returned
HTTP 403 and was read through a search index rather than directly.
<https://lbbonline.com/news/more-than-just-cutting-to-the-beat-the-nuance-of-editing-music-videos>
The reasoning is coherent, the citation is second-hand. Do not quote it as verified.

---

## 4. Sound design is not music

Music sets register. Sound design does work the picture cannot do alone. The vocabulary, and where each
belongs in a short piece:

| Element | What it says | Where it belongs |
|---|---|---|
| **whoosh / swish** | *something travelled* | on a layer that really crosses the frame; length matches the move |
| **impact / hit** | *something arrived and stopped* | on a hard stop in the motion, never on an ease-out |
| **riser / build** | *something is coming* | the only element about frames you have not shown yet |
| **sub-drop / LFE** | *scale* | a reveal you want to feel large; felt more than heard |
| **braam** | *2010s trailer* | avoid: it now dates a piece to a decade of fashion |
| **UI tick / click** | *this interface is real and being operated* | the highest-value sound in a product film |
| **foley** | *a person is present* | handling, cloth, a hand entering frame |
| **room tone** | *this frame is a place* | under everything, as glue |

Sources: <https://blog.prosoundeffects.com/sound-effects-terms-explained-part-1> ·
<https://www.krotosaudio.com/trailer-sound-design-tips-tricks/> ·
<https://en.wikipedia.org/wiki/Foley_(sound_design)> · braam provenance and its disputed authorship:
<https://en.wikipedia.org/wiki/BRAAAM>

**The UI tick deserves the emphasis.** It is *diegetic*: it asserts that the interface on screen is real
and that somebody is operating it. That is precisely the claim a product film wants made, and it is the
one sound that cannot be accused of decoration. Our whole cue library is built for this, see §6.

**Why a whoosh on every transition is amateurish.** No authoritative essay makes this argument; the
practitioner comment is scattered ("A whoosh should connect motion, not announce that you pulled a free
pack full of whooshes," <https://blog.lunabloomai.com/video-sound-effects-2/>). The strong version has
to be borrowed from mickey-mousing: **a whoosh on every transition makes every transition equally
important, which means none of them are.** It is mickey-mousing applied to editorial structure instead
of to on-screen action, and it dies of the same saturation.

Which is exactly why `audio.auto:true`, which scores a `whoosh` on every cut and a `reveal` on every
sting: is a *draft* setting, not a finish. It is the right way to hear the shape of an edit quickly.
It is the wrong thing to ship, because it is definitionally a cue on every junction. **22 of our 25
sounded scenes ship with it on**, and that is a to-do, not a house style.

---

## 5. Silence, used on purpose

Silence works by contrast and by forcing attention: the audience feels "the soundtrack disappearing
beneath them, forcing them to focus on the moment, often before the audio punches back in abruptly for
a knock-out blow." <https://www.lafilm.edu/blog/cinematic-silence/> PremiumBeat frames it as control
rather than absence: "The clever use of silence can help you guide your audience's reaction to your
film." <https://www.premiumbeat.com/blog/importance-silence-filmmaking-projects/>

**The production note that matters most for a 15-second film:** true digital silence reads as a fault,
not a choice. Editors "must protect the integrity of silence while balancing it with other audio
elements, including carefully mixing silence with subtle ambient sound or drones to avoid dead air that
feels unnatural." <https://www.lafilm.edu/blog/cinematic-silence/>

That is the sharpest argument against `silent:true` as a habit. **A film that drops to nothing sounds
broken; a film that drops to a held tone sounds deliberate.** Ours drop to nothing 90 times.

Named examples: *Saving Private Ryan* (everything drops out as Miller stumbles, miming shell shock),
*The Graduate* (Benjamin in the pool), *No Country for Old Men* (no score at all, so violence lands
unbuffered), *Fellowship of the Ring* (cries removed to deepen the impact).

The transferable pattern for short form is the **pre-impact drop**: cut everything one beat before the
reveal, then land the impact into the vacuum. A riser, then nothing, then a hit. It is the *Saving
Private Ryan* mechanic at 15-second scale, and it is the single highest-value thing sound can do for a
product film's payoff beat.

---

## 6. The mechanism, what this engine can actually do

Everything above is *what*; this is *how*. It all lives in the scene's top-level `audio` block
(`formats/scene/schema.json`), and the Go mixer (`internal/audio/audio.go`) builds the whole track in
memory before ffmpeg muxes it.

```jsonc
"audio": {
  "music":     "auto" | "lofi" | "assets/music/lofi.wav",  // a bed name, a path, or the sentinel
  "musicGain":  0.4,                      // 0..1, sits UNDER the type
  "musicFade": { "in": 1.0, "out": 1.5 }, // seconds; never a hard cut
  "musicDuck":  0.15,                     // floor the bed ducks to under VO
  "loudness":  -14,                       // LUFS target at the mux (socials)
  "auto":       true,                     // DRAFT ONLY: score every cut + sting automatically (§4)
  "bridges":  [{ "bridge": "j", "at": "cut@1", "sound": "tense", "lead": 0.8 }],  // J/L-cuts (§2)
  "cues":     [{ "t": 3.2, "name": "chime", "gain": 0.6 }],
  "sfxGain":    0.8,                      // master over every cue, authored and derived
  "vo":        "voice.wav",
  "voWords":   "voice.words.json",        // [{w,t}] → make vo-captions builds timed captions
  "spectrum":  "assets/music/x.spectrum.json",
  "silent":     false,                    // + "_why" if true (§1)
  "_why":      "…"
}
```

**The cues** (`core/audio-kit.mjs`, baked by `make audio`): `chime · sparkle · droplet · bloom ·
whisper · tick · press · key · release · toggle · success · error · page · loading · ready`, plus the
baked aliases `whoosh · reveal · click · pop`. They are **synthesized from parameters**, noise, a
biquad, an envelope, seeded and deterministic, so they carry no licence at all and same params always
give same bytes. That is a genuinely good property and it is worth keeping.

A cue is honest only when it names something the viewer SEES happen. A `press` with no button on screen
is a lie; cut it.

**A cue is heard OVER the bed, and the mixer guarantees it.** A cue is causal, it says the button was
pressed, the row landed, the thing arrived, and a bed is atmosphere. When atmosphere covers causality
the film stops explaining itself, so a cue's table gain is a floor, not a level: `internal/audio/audio.go`
raises it until the cue's loudest 50ms sits 6dB over the bed in that same 50ms, and never lowers it.
Three things follow, and they are the whole contract:

- **An authored `gain` wins, untouched.** Write `{"t":3.2,"name":"chime","gain":0.2}` and the cue mixes
  at 0.2. Keystrokes are authored this way too (`keyGain`), which is why a typed line stays a whisper
  instead of machine-gunning over the music.
- **`sfxGain` still scales everything**, after the lift. A scene-wide trim keeps its meaning.
- **The lift is capped, and a cap that binds SAYS SO on stderr.** A click carries a peak many times its
  own RMS, so matching a loud bed would send it through the limiter and squash the mix. The mixer warns
  by name and time: read it as *the bed is too loud for this cue*, and lower `musicGain` or pick a cue
  with more body.

A film with no bed, or a cue landing where the bed has ducked, mixes exactly as it always did.

**A film cannot end on a silent hold today**, and it is worth knowing before you plan one.
`musicFade.out` ramps the bed to zero AT `duration`, never before it; nothing says "cut the bed N
seconds early". The nearest existing mechanism is a sting on the last mark, micro-silence ramps the bed
to nothing over the 0.3s before every sting, but that couples the audio tail to a visual device, so it
is a workaround rather than the dial.

**The commands:**

| Command | What it does |
|---|---|
| `make audio-check [D=…] [STRICT=1]` | the sound gate (§1). No `D` prints the library census |
| `make audio` | bake every synthesized cue from parameters |
| `make music-pack` / `make music GENRE=… NAME=…` | fetch real beds → `assets/music/` (§8) |
| `make audio-bed D=… WRITE=1` | resolve `music:"auto"` to a concrete bed from the profile |
| `make beatmap MUSIC=…` | detect tempo + beat grid, with a confidence report |
| `"audio":{"beatSync":true}` | the scene names the grid; the engine snaps cuts and seams at boot (core/beat-bind.js) |
| `make beatsync D=… MUSIC=… WRITE=1` | the author-time twin: same policy, writes `<scene>.beatsync.json` |
| `make spectrum MUSIC=…` | per-frame band energy for audio-reactive layers |
| `make sfx-check` | is each effect the SHAPE its role claims (MISTAKES #51) |
| `make tts` · `make vo-captions D=…` | narration, and karaoke captions from its word timings |
| `make pace-from-vo VO=….words.json` | propose beat timings that land reveals on the voice |

### Caption styles: eight, and what each one uses to say "here"

`"captionStyle": "<name>"` layers a word-timed treatment on the pop caption layout. The words come
from `capWords()` (`core/captions.js`): the author's own `words:[{t0,t1}]` when a line carries them,
otherwise windows distributed by word length, which reads as speech and needs no timing file. Every
style is a pure function of one word's progress, so a cold seek and a warm one paint the same frame.

Each style carries **three** word states, and a viewer must be able to tell all three apart in a
single frame: what is coming, what is being said, and what has already been said. A style with only
two states is a progress bar with no memory. Pick by the channel you want the caption to speak in.

| Style | The channel | Reach for it when |
|---|---|---|
| `highlight` | a marker band behind the word | you want the loudest possible read trail |
| `pillKaraoke` | a pill that fills left to right | the film is playful and the line is short |
| `weightShift` | type weight, 600 to 700 to 800 | the film is typographic and nothing else should move |
| `clipWipe` | a line-level accent wipe | the whole line is one thought, not six words |
| `neonEdge` | light only, never ink | the film is dark and the accent should glow rather than print |
| `kineticSlam` | size, landing at 1.22 | one word per beat, and the cut is on the word |
| `underlineDraw` | a 4px rule under the ink | you want a read trail that costs the text no contrast |
| `readerFocus` | depth: three inks, three scales | a long narrated line, where the eye needs steering, quietly |

**Contrast is not negotiable and it is why these look the way they do.** An inactive word dims by a
colour mix toward the theme background, **never by opacity**, and the whole line sits on a 78%
background plate, so the ratio is computed against a known backdrop instead of unknown video. Both
rules were written after this repo shipped sub-4.5:1 captions. The darkest palette in `themes/` puts
the dimmest state at 4.8:1, which clears AA with room to spare.

**Know the gap before you trust a green audit.** `make audit` grades elements marked
`data-layer=critical`, and a caption is not a layer, so **the audit has never measured a caption's
contrast**. `lib-test` proves each style keeps three distinct states and never reaches for opacity;
the ratio itself is arithmetic over the theme palette. Neither is a picture. Read a frame.

**The band.** `captionBand()` (`core/safe.js`) describes the strip a caption paints, and the audit
warns when other content lands there. No style may make that strip taller than the skin it declares,
so every value that could grow the line is bounded to the `styled` plate's own 14px padding: the
`neonEdge` halo stops at 14px and the `kineticSlam` overshoot stops at 1.22, which at 64px adds 7px
a side. A style that wants more has to move the band first, and moving the band moves every scene.

**The trap, in bold, because it has bitten twice.** `music:"auto"` is resolved at **authoring** time by
`core/audio-select.js`. The render binary has no JS pre-pass, so an unresolved `"auto"` reaching the
mixer is read as a filename, matches nothing, and plays **silence**. Always
`make audio-bed D=<file> WRITE=1`. `make validate` and `make audio-check` both warn; heed them.

**A second trap, currently live.** `core/audio-select.js` maps five of its eight profiles (`apple`,
`linear`, `vercel`, `a24`, `bloomberg`) to `bed: null`, and an absent or unknown profile also yields
silence. So `music:"auto"` on most films still resolves to *nothing*. That map was written under the
old doctrine and now contradicts this document. It is listed as open work in §9.

---

## 7. How well evidenced is any of this?

Plainly: **the structural claims above are craft doctrine, not measurement, and the best-known
controlled study points the other way.** This section exists so nobody cites §1-§5 as science.

**Audiovisual fusion is real, and pre-conscious.** The McGurk effect, audio /ba/ plus visual /ga/ is
*heard* as /da/: is one of the most replicated findings in perception, cited over 4,800 times since
McGurk & MacDonald, "Hearing lips and seeing voices," *Nature* 264(5588), 746-748, 1976.
<https://en.wikipedia.org/wiki/McGurk_effect> · 40-year retrospective:
<https://pubmed.ncbi.nlm.nih.gov/31264593/>
This establishes that Chion's *synchresis* is a real perceptual mechanism rather than a metaphor. It
does **not** establish that adding sound makes video look better or perform better. Anyone citing
McGurk for that is overreaching.

**The strongest evidence FOR sound as more than decoration comes from VR.** "On the Relative Importance
of Visual and Spatial Audio Rendering on VR Immersion," *Frontiers in Signal Processing*, 2022.
<https://www.frontiersin.org/journals/signal-processing/articles/10.3389/frsip.2022.904866/full>
N=17 trained listeners, three audio conditions crossed with three video resolutions (0.5 / 1.5 / 2.5 MP
per eye), 18 scenes. The line worth having: "the full auralisation scene with 20% video resolution and
the HTB-only scene with 100% video resolution received almost identical mean scores (5.79 and 5.76,
respectively)." Adding room acoustics bought back as much perceived immersion as **five times the
pixels**. Limits are serious: N=17, all trained expert listeners aged 18-25, a head-mounted display,
spatial audio specifically, and *immersion* is neither perceived production quality nor ad performance.

**The best-known controlled study on perceived quality contradicts the slogan.** Beerends & De Caluwe,
"The Influence of Video Quality on Perceived Audio Quality and Vice Versa," *JAES* 47(5), 355-362, 1999.
<https://www.aes.org/e-lib/browse.cfm?elib=12105> Video quality shifted *perceived audio* quality by
about 1.2 points on a nine-point scale; audio quality shifted *perceived video* quality by only about
0.2. It concluded that video quality dominates overall perceived audiovisual quality. Read that
carefully: **good pictures make sound seem better far more than good sound makes pictures seem better.**
Limits: 1999 telecoms codec degradation, a fidelity-rating task rather than an engagement or preference
task. It measures fidelity judgements, not craft. The same asymmetry replicates for music video:
<https://www.dhi.ac.uk/openbook/chapter/ICMEM2015-Hammerschmidt>

**"Sound is half the picture", who says it, and how sound is the attribution.** The version with a real
citation is George Lucas: "Sound is half the experience of seeing a film. That's why I have been
bothered by the poor sound re-production in many theaters and most homes," cited to "In the Action With
'Star Wars' Sound," *The New York Times*, 3 May 1992. <https://en.wikiquote.org/wiki/George_Lucas>
*Caveat:* the citation was verified as specific and dated; the NYT article itself could not be opened.

The version everybody actually quotes ("Sound is 50 percent of the moviegoing experience") is repeated
by *Variety*, the Motion Picture Editors Guild's own *Local 695* magazine, and the Academy's account,
and **not one of them gives a date or a venue.** Treat it as a widely repeated paraphrase, not a verbatim
quote. <https://www.local695.com/magazine/from-the-editors-19/>

The claim does carry institutional weight: Lucas's dissatisfaction with theatre playback after *Star
Wars* is what produced THX in 1982. <https://en.wikipedia.org/wiki/THX>

**Better voices for our purposes.** David Lynch: "Films are 50 percent visual and 50 percent sound.
Sometimes sound even overplays the visual." And on room tone, which is the most useful thing said here
for a motion designer: it is "the sound that you hear when there's silence, in between words or
sentences," and "in this seemingly kind of quiet sound, some feelings can be brought in, and a certain
kind of picture of a bigger world can be made." <http://www.thecityofabsurdity.com/quotecollection/sound.html>

Walter Murch, in his foreword to *Audio-Vision*, makes the developmental argument: "We begin to hear
before we are born, four and a half months after conception," and for the next four and a half months
"Sound rules as solitary Queen of our senses." His point is not sentimental, hearing is the older and
more continuously trained sense, so audiences audit sound for plausibility more harshly and more
unconsciously than they audit pictures. *Caveat:* verified only through indexed excerpts; the full
foreword could not be retrieved.

**Sonic-branding effectiveness numbers: do not cite these.** The circulated figures, Ipsos's "3.44x
more effective," "8.53x more likely to appear in top-performing ads," Mastercard's "77% more
trustworthy": are vendor and agency publications with no disclosed sample, control condition or
confound handling. The 3.44x and 8.53x describe *association with high-performing ads*, which is
correlation, and high-performing ads have bigger budgets, which also buys sound. The one serious
academic treatment is Spence & Keller, "Sonic branding: A narrative review at the intersection of art
and science," *Psychology & Marketing*, 2024 <https://onlinelibrary.wiley.com/doi/full/10.1002/mar.21995>,
and note that it is a *narrative review*, not a meta-analysis, whose own framing concedes that demand
for evidence currently exceeds supply.

**Sound-on versus sound-off ad testing is contradictory and all of it is vendor-published.** One side
claims muted video reaches "up to 30% higher completion rates"; the other claims audio makes ads "67%
more engaging." Both cannot be findings. **No independent randomised test of identical creative with and
without sound was found.**

**What could not be found at all**, and this is itself a result. No writing on sound structure from
Motionographer, School of Motion, Ben Marriott or Andrew Kramer surfaced. The motion-design field has
essentially not written about this, which is part of why we drifted into shipping mute without noticing.

> **The summary to carry.** Fusion is real (McGurk). Audio buys immersion at a rate comparable to large
> increases in resolution, in one small expert-listener VR study. The only well-known controlled study of
> perceived *quality* found the picture drives audio judgements far more than the reverse. And the
> marketing numbers are advertising. **Add sound because it opens a structural register, not because a
> study says it scores better. No study says that.**

---

## 8. Licensing, what we may actually put under a commercial film

`CLAUDE.md` is absolute about visual assets: never embed copyrighted material into a published video.
**That applies to music with more force than to anything else**, because music is the one asset class
with an automated global enforcement system pointed at it. A wrong image gets a takedown if somebody
notices. A wrong track gets a Content ID claim automatically, on upload, every time.

### What we use today, and it is fine

Our beds come from **Mixkit's free tier**, which permits "commercial projects (YouTube videos, social
media marketing, online ads, music videos) and personal projects. No attribution required."
<https://mixkit.co/llm-info/> · <https://mixkit.co/license/>

Excluded: CDs, DVDs, video games, TV and radio broadcast. Also forbidden: remixing a track, registering
it as your own, and redistributing the file without substantially altering it.

Two consequences, both already true of this repo and both important:

- **The files must stay untracked.** `assets/music/` is gitignored. Committing it would publish the
  tracks as standalone downloadable files, which the licence forbids. See `assets/README-LICENCE.md`.
- **Our sound EFFECTS have no licence question at all.** They are synthesized from parameters by
  `make audio`, not downloaded. That is a real and underrated advantage; keep it.

### The four categories, and the one that eats people

| Category | What it means | Safe for a client product film? |
|---|---|---|
| **Subscription royalty-free** (Artlist, Epidemic Sound, Musicbed, Soundstripe, Uppbeat, Marmoset) | you pay a period fee, not a fee per broadcast | yes, **while the subscription is live**, read the trap below |
| **CC0 / public domain** | all rights waived worldwide | yes. The safest paid-nothing option, but CC0 gives freedom, never a warranty |
| **CC-BY** | free, **attribution required**, commercial and adaptation both permitted | yes, if the credit really goes in the description permanently. Note the no-endorsement clause: you may not imply the composer backs the client's product |
| **CC-NC or CC-ND** | non-commercial, or no derivatives | **no, and ND is absolute**, see below |
| **Sync licence** (Musicbed, Marmoset) | negotiated per project, media, territory and term | yes, and it is the only one that comes with a warranty and indemnity |

"Royalty-free" is a **pricing** model, not a rights model. It means no *per-use* royalty. It says
nothing about who owns the copyright, what uses are permitted, or how long the grant lasts. Musicbed is
the clarifying counter-example: its catalogue is explicitly **rights-managed, not royalty-free**, and
priced per project by your client's headcount and predicted reach.

### ND is the rule nobody knows, and it is decisive

**Syncing music to moving image is *always* a derivative work under Creative Commons.** Not arguably.
By definition, in the licence text itself: CC BY-ND 4.0 §1:

> "For purposes of this Public License, where the Licensed Material is a musical work, performance, or
> sound recording, **Adapted Material is always produced where the Licensed Material is synched in
> timed relation with a moving image.**"
> <https://creativecommons.org/licenses/by-nd/4.0/legalcode.en>

CC's FAQ restates it: this holds "**whether or not it would be considered so under applicable law**."

So **every ND track is unusable in every film we publish**, commercial or not, edited or not. Playing an
ND track untouched under picture still creates Adapted Material, and ND forbids sharing adaptations.
This is the most-missed rule in free-music sourcing, and it is missed because ND tracks are routinely
labelled "commercial use allowed", which they are, for redistributing the *audio*. Never for a film.

**NC is nearly as blunt.** CC defines NonCommercial as use "primarily intended for or directed toward
commercial advantage or monetary compensation", and adds the part people assume saves them: "**CC's
definition does not turn on the type of user:** if you are a nonprofit or charitable organization, your
use of an NC-licensed work could still run afoul of the NC restriction." CC then declines to draw the
line for you: "**CC cannot advise you on what is and is not commercial use**"
<https://creativecommons.org/faq/>. A paid client product film is the paradigm case. CC's own refusal to
define the boundary is itself the reason not to gamble on it.

**Practical filter for any CC source: CC0 and CC BY only.** CC BY-SA works but is viral, so the whole
film goes BY-SA. Everything else is out.

### If we ever buy a subscription

The perpetuity clause is the most misunderstood term in the industry, and the honest summary is that
**the licence on a published film survives cancellation, but your ability to defend it does not.**

| Vendor | The trap in its own paperwork |
|---|---|
| **Musicbed** | **Early cancellation voids licences already issued.** The 12-month term must complete or "any licenses issued under the subscription [become] null and void", cancel in month 7 and delivered client films retroactively become unlicensed. Separately, §3: "paid media rights are **not** granted in perpetuity"; you get archival rights to leave the film where it is, not to keep running it as an ad |
| **Artlist** | Perpetual, but frozen to "**the same media**". A re-cut, a new platform or a re-upload is a new project. Publication must occur *during* the term, so a finished-but-unpublished film loses cover. Clearlist closes at expiry |
| **Epidemic Sound** | Licence persists, but safelisting requires an active subscription and must happen **before posting**. Creator tier **cannot be used for brand work at all**; Pro is the client-work tier |
| **Soundstripe** | Projects perpetual, but if you did not List a project before cancelling you can never do so without re-subscribing. Business is limited to a **single designated market area**, which a public website breaks |
| **Uppbeat** | Published work survives; safelist protection covers only videos uploaded during the paid term |

**Two vendor contradictions worth naming, because they mean the marketing cannot be relied on:**

- **Musicbed's FAQ says credit is optional** ("You are not required to credit the artist or Musicbed").
  Its binding terms §2(xiii) *require* credit per the License Details, and §9 sets **$10,000 liquidated
  damages** for failing to. Read the License Details, not the FAQ.
- **Soundstripe's help centre says Pro may not promote a brand, product or service.** Its Terms of Use
  apply that restriction only to Personal, and its own plan table sells Pro for "advertising". Both
  cannot be true. Get it in writing before relying on it.

*Verification note:* **Epidemic Sound's actual licence contracts could not be reached**, the terms
routes 404 and the policy page renders an empty shell. Everything above for Epidemic comes from its
marketing and help centre, not the contract. Given that Soundstripe's marketing and contract
demonstrably disagree, assume Epidemic's may too. Prices were also unverifiable for several vendors and
are deliberately omitted here; they move, and they geo-localise.

**Two eligibility gates that would catch a studio:** Artlist pushes any **agency**, or any company over
**50 employees**, to Max Business. Epidemic pushes agencies and production companies over **$5M
turnover** to Enterprise.

### Content ID: claims are normal, even when you are correct

This is the part everyone gets wrong. Every one of these platforms registers its catalogue *into*
Content ID, so **a claim on correctly licensed music is the expected outcome, not an anomaly**. Artlist
concedes claims arrive "even when content is licensed correctly". Musicbed's SyncID is explicitly
**reactive**: "SyncID does not prevent you from getting a content claim ... As soon as you receive an
email from YouTube that your video has a claim, SyncID is already working." Soundstripe admits its own
process "may still accidentally and incorrectly interpret your use ... to be unlicensed."

**Whitelists attach to a channel, not to a film.** So a track clean on our channel gets claimed the
moment the same film goes up on a **client's** channel, which is exactly what a product film is for.
Artlist and Epidemic both handle this with per-video client invite links valid 30 days; Soundstripe uses
per-video clearance codes. Treat safelisting the destination channel as a **delivery checklist item**.

There is documented enforcement against holders of a valid competing licence: an Adobe forum thread
records Artlist Content ID claims against users who licensed the same track legitimately from Adobe
Stock, with appeals citing a valid Adobe licence number **rejected**, and Adobe refunding the asset.
<https://community.adobe.com/t5/stock-discussions/content-id-claim-from-artlist-ltd/m-p/14485916/highlight/true>

### The free end, ranked honestly

- **Pixabay is the strongest free option.** One site-wide licence granted by Pixabay itself, not
  per-track CC: "irrevocable, worldwide, perpetual ... for **commercial or non-commercial purposes**",
  no attribution required <https://pixabay.com/service/license-summary/>. Because it is irrevocable,
  nothing published is at risk later, and every download ships a **License Certificate** to fight claims
  with. The catch is the inverse of a paid library: content is warranted **"AS IS", no warranty**, and
  **you indemnify Pixabay**. Claims still happen and disputes take up to 30 days, unmonetised.
- **Freesound (SFX)**: filter to **Free Cultural Works approved**, i.e. CC0 and CC BY only. Two traps:
  the legacy **Sampling+** licence specifically bans commercial advertising ("You can't make a track
  with Sampling+ samples to sell a car") and is **not** caught by an "avoid NC" habit; and when layering
  sounds, **the strictest input licence governs the output**.
- **YouTube Audio Library: do not let it leave YouTube.** Google grants no off-platform rights and
  says plainly it "can't give legal guidance ... off the platform". Every permissive sentence scopes
  itself to "videos uploaded to YouTube". Only the CC-licensed subset travels, and it travels on the
  artist's CC BY terms, so the attribution comes with it. Treat off-YouTube use as unlicensed.
- **Free Music Archive and ccMixter are directories, not licensors**, and neither warrants anything.
  FMA says so itself: "FMA cannot license original work to you for commercial, private, or other use."
  Licence differs per track and includes NC and ND, so **you must read the licence on every single
  track**. ccMixter's terms go further than the CC deed and forbid using a track "to advertise or
  promote anything other than the work you create from it", which is a problem for a client ad even on
  a CC BY track. Also treat the widely repeated "$5/month FMA plan" as **false**; no FMA page confirms
  it.

### AI-generated music: no, and the reason is not the one you expect

The training-data litigation is real and partly unresolved (Sony still litigating against Udio; UMG and
Sony against Suno). But the decisive problem is ownership. The US Copyright Office's *Copyright and
Artificial Intelligence, Part 2: Copyrightability* (29 Jan 2025)
<https://www.copyright.gov/ai/Copyright-and-Artificial-Intelligence-Part-2-Copyrightability-Report.pdf>
concludes that **material generated purely by entering prompts is not copyrightable**, however elaborate
the prompt.

So if the bed is purely prompt-generated, **nobody owns it, not us, not the vendor, not the client.**
Suno's own terms say the quiet part: it assigns "all of its right, title and interest" and then adds
"**Suno makes no representation or warranty to you that any copyright will vest in any Output.**" It
assigns a possibly empty set. Soundraw and Mubert retain ownership outright and grant only a use
licence, and both **prohibit Content ID registration**.

Confine AI music to internal comps, pitch boards and animatics. Never a client deliverable.

### The rule for this repo

> Record the source and the licence in `assets/music/credits.json` **before** the track goes under a
> film. `make audio-check` warns `bed-provenance-unknown` when there is no entry and
> `bed-licence-unverified` when nobody has read the terms. A track whose licence nobody can produce is
> not usable, however good it sounds.

---

## 9. Open work

1. **`core/audio-select.js` still encodes the old doctrine.** Five of eight profiles map to `bed: null`,
   and an unknown profile yields silence, so `music:"auto"` mostly resolves to nothing. It should map
   every profile to *something* (a bed, or an explicit held tone) before "sound by default" is real.
2. **`audio.auto:true` is on in 22 of 25 sounded films.** By §4 that is a cue on every junction, which
   is mickey-mousing. Those films want hand-placed cues on two or three beats instead.
3. ~~**Nothing in the engine can author a J-cut or an L-cut.**~~ **Done**, `audio.bridges`, §2. The
   remaining gap is that `direction-floor` still cannot see a bridge, so a film held together by sound
   alone trips `no-continuous-object` and needs a waiver. Teaching the gate to read `audio.bridges` as a
   continuous object is the next piece: it would have to reason about junctions rather than layers.
4. **`assets/music/` is gitignored and untracked.** A fresh clone has no beds, so every film naming one
   renders silent with only a warning. Sound cannot be a true default until the default asset exists.
