# SOUND — when to add audio, and what it should be

Every other CRAFT doc guides a visual decision; this one was a void. The engine can mix a music bed,
synthesized SFX cues, a VO track and timed captions (`docs/PRIMITIVES.md` §Sound for the mechanism) —
but nothing said *when* or *what*. This is that decision layer. Sound is the one craft where the
default is **nothing**, and adding it is a commitment you must earn, exactly like an effect.

---

## The prime rule

> **Silence is the default. A video must WORK silent, then a bed may make it better.**

Feed autoplay is muted (X, LinkedIn, most of TikTok's first second). If the video only reads with
sound, it fails for most viewers. So: author the visual to carry the whole story alone, then treat a
bed as a lift, never a crutch. `audio: {silent: true}` is the correct default; turning it off is a
decision with a reason.

This is also why the engine ships silent by default (`internal/audio/audio.go`): a bed under a video
authored without one is the "buzzing under everything" failure, not a feature.

---

## 1. Music vs silence — the decision

| The video is… | Bed? | Why |
|---|---|---|
| a feed post (X/LinkedIn) autoplaying muted | **silent** (default) | nobody hears it; the type must carry it |
| a launch film / hero on a page the viewer chose to play | a bed | they opted in; a bed sets register in 2 seconds |
| a tense, editorial, or premium piece (`a24`, `apple`) | **silence or near-silence** | space IS the tension; a bed cheapens restraint (SELECTION: a24 "silence is the tension") |
| an energetic ad, a hype reel (`nike`, `duolingo`) | a driving bed | the motion is cut TO the music; silence would read as broken |
| a product walkthrough / explainer | optional, low | UI cues (below) do more than a bed here |

When in doubt: **silent**. A great silent video beats a good one with a mismatched bed.

## 2. Bed mood → feeling (fetch it with `make music GENRE=…`)

The bed's genre is chosen by the SAME feeling the visuals target, not by taste. Match the profile:

| Profile / feeling | Bed genre (the `GENRE` to fetch) | Energy |
|---|---|---|
| `apple` / premium-calm | ambient, warm pad, sparse piano | low, spacious |
| `linear` / `vercel` / technical | minimal, one synth pulse, or silence | low, cold |
| `stripe` / clean-tech | soft electronic, forward but calm | mid |
| `nike` / energetic | driving electronic, percussive, a build | high, a drop |
| `a24` / dramatic | a single sustained drone, or silence | very low, tension |
| `bloomberg` / data | none, or a neutral tick-driven pulse | functional |
| `duolingo` / playful | bright, bouncy, major-key | high, sunny |

**Match the CUT to the beat.** If there is a bed, the cuts land on its beat grid: `make beatmap
MUSIC=…` detects the tempo, and cuts at the downbeats read as intentional. A cut that fights the music
reads as an error. For audio-reactive motion, `make spectrum` bakes per-frame band energy so a layer
can pulse to the track while staying pure in `n`.

## 3. SFX cues — a mechanism sound, never decoration

The cues (`core/audio-kit.mjs`): `chime · sparkle · droplet · bloom · whisper · tick · press ·
release · toggle · success · error · page · loading · ready`. They are synthesized (no licence), and
they exist to **sonify a real event on screen**, not to fill silence.

The rule: **a cue is honest only when it names something the viewer SEES happen.**

| When you see… | Cue | When it CHEAPENS |
|---|---|---|
| a cursor clicks a button | `press` + `release` | a click with no button = fake |
| a toggle/tab flips | `toggle` | a static UI = pointless |
| a deploy/check completes | `success` (once) | on every element = spam |
| a keystroke types | `tick` (per char, quiet) | over body text = a train (MISTAKES #51) |
| a stat/number lands | `chime` or `bloom` | on a text that isn't a payoff |
| a page/screen swaps | `page` | mid-hold = distracting |
| an error state appears | `error` (once) | for emphasis on a non-error |

**Restraint, exactly like effects:** 2–3 cues in a film, on the beats that earn them. A cue on every
entrance is the audio version of effect-soup. If nothing on screen makes that sound in reality, the
cue is a lie — cut it.

## 4. Caption style → intent (when the words are the point)

Captions carry a spoken VO or a hook. Style maps to intent (`core/captions.js` `CAP_STYLES`):

| Style | Feels like | Reach for |
|---|---|---|
| `highlight` | a marker under the key word | emphasis mid-sentence, editorial |
| `pillKaraoke` | word-by-word fill, energetic | fast social, a hook read aloud |
| `weightShift` | the active word thickens | premium, subtle, `apple`/`linear` |
| `clipWipe` | each word wipes on | kinetic, `nike`, punchy |

Pick by the register (the caption is type, so TYPOGRAPHY + the profile still rule). No VO and no hook →
no captions; do not caption a video that has nothing being said.

## 5. Profile → sound policy (the one-line summary)

- **`apple`** — silence or a warm sparse pad; one `chime` on the product reveal; `weightShift` captions.
- **`linear` / `vercel`** — silence or a cold pulse; UI cues only (`toggle`/`success`); no bed under text.
- **`stripe`** — soft electronic bed; cues on the demo actions; `weightShift`.
- **`nike`** — a driving bed with a drop, cuts on the beat, `clipWipe` captions, one `success` on the win.
- **`a24`** — silence is the score; maybe one drone; no cues; sparse serif captions if any.
- **`bloomberg`** — no bed or a tick pulse; cues on data updates; functional.
- **`duolingo`** — bright bouncy bed; `success`/`sparkle` on wins (the one place cue-density is joy).

When there is no profile: **silent**, and let the visuals prove they carry it. Add a bed only if the
video is one the viewer chose to play, and match its genre to the feeling above.
