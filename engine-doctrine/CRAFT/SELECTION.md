---
when: picking the transition/font/look/sting for a feeling, or picking between whole directions
answers: intent→effect (cited) · complete look/sting coverage · 8 named reference profiles · how `make dev-tool X=concept` forces a round off the median
group: story
---

# SELECTION: intent → the right effect, and why

## AGENT SUMMARY

- Pick transition, font, easing and look by the beat's INTENT, traced to a cited principle, never by
  vibes. For a whole film, pick ONE of the 8 named reference profiles (Part 2) instead of inventing a
  coordinated look beat by beat.
- Enforced by `make dev-tool X=direct`, which reads the chosen profile and flags contradictions (bounce on a
  serious brand, mixed cut families, a loud sting on a restrained profile). `make dev-tool X=concept` forces a
  round of directions scored against the library median (Part 3).
- Checkable action: name the profile you picked, then describe the content that would make a DIFFERENT
  profile correct.

`MOTION-CRAFT.md` is effect-first ("`whip` = momentum"). This file is **intent-first**: you know the
feeling a beat wants, and it tells you which transition, font, look, easing and colour is correct,
with the reason traced to a design principle. Use it so choices are predictable and explainable, not
taste-by-vibes. `TASTE-RULES.md` says what's good; this says what to pick.

Three parts: **the decision procedures** (how to pick within one family), **the reference profiles**
(a whole coordinated look, named after a real brand so the target is concrete, not an adjective), and
**choosing between whole directions** (how `make dev-tool X=concept` forces a round of options off the median).

---

## The one principle under all of it

> **Every choice signals two things: how much the viewer should NOTICE it, and what era/register it
> evokes.** A cut either hides the seam or announces it (Murch). A face is trusted or fresh or
> technical (font psychology). An ease is an arrival or a departure (animation). Pick by the signal
> you want to send.

---

## 1. Transitions, the grammar of the cut

**The decision procedure (Walter Murch's question first):**

1. **Should the viewer NOTICE the edit?**
   - No, keep them in the story → **hard cut** (95% of the time), or a soft `blur`/`fade` dissolve.
   - Yes, the edit is part of the show → `whip` · `wipe` · `iris` · a sting.
2. **What does the seam MEAN?**
3. **Does the background jump** (dark↔light)? If yes, cover it with a sting peaking AT the cut.

| The beat wants… | Reach for | Why (cited) |
|---|---|---|
| invisible continuity | hard cut | "the most basic edit; preserves narrative flow", edit grammar |
| time passing / reflection | `fade`/`blur` dissolve, sting `dissolve`/`ink` | "a dissolve implies the passing of time", Murch / dissolve convention |
| an act break, finality | `fade` (to dark), sting `leak` | "a fade marks significant story breaks, finality", edit grammar |
| energy, momentum | `whip`/`skewWhip`, sting `whipPan` | "whip pan masks the cut through motion blur; energetic", edit grammar |
| playful, "notice me" | `wipe`, sting `sdfIris` | "a wipe is dynamic, playful; draws attention to the cut", edit grammar |
| a hidden connection between two shots | match the framing across a hard cut | "match cut reveals hidden connections; elegant", edit grammar |
| product focus, a push-in | `punch`/`zoom`, resample `zoomBlur` | scale draws the eye to one subject |
| dramatic pivot, "everything changes" | sting `vortex`, `letterbox` open | a heavy transition earns a heavy story turn |

**One cut family per film.** Mixing `whip` and `iris` in one piece is five fonts on a slide. The
director rotates within a family; it does not mix families.

> **Deep dive:** this table is the summary. [`TRANSITIONS.md`](TRANSITIONS.md) is the full theory,
> the complete transition taxonomy, Murch's Rule of Six (emotion 51%), continuity-vs-montage, J/L cuts,
> shared-element morph, and the ordered per-seam decision procedure. Read it when you can't say *why*.
> **Want the copy-paste menu instead of the theory?** [`TRANSITIONS.md`](TRANSITIONS.md) opens with
> *The easy palette*: seven transitions with a snippet each, the 30fps duration table, station-to-station,
> and the **speed dial** (ramp/rush/brake). Speed is the anti-repetition lever: a motion seam carries
> `timing:"ramp"` (slow-fast-slow), never a flat curve, or the film reads same-y however many effects it has.

## 2. Fonts, the register of the voice

**The decision procedure:**

1. **What register?** authority/tradition → serif · modern/clean → sans · technical/retro → mono ·
   intimate → script.
2. **Trust or freshness?** Humanist sans tested highest for *trust*; geometric sans reads *fresh/cold*.
3. **Pick 2–3 roles, contrast don't conflict** (a serif head + a sans body; never a formal serif + a
   quirky script).

| The video wants to feel… | Face role | Why (cited) |
|---|---|---|
| trusted, established, luxury | **serif** | "serif = stable, mature, formal, timeless authority", font psychology |
| modern, clean, a startup/tech | **humanist sans** | "sans = modern, clear, efficient; humanist sans highest for trust" |
| strong, bold, editorial headline | **slab / heavy sans** | "slab = strength, boldness, confidence" |
| technical, precise, a terminal | **mono** | "mono = technical precision, retro, utilitarian" |
| human, handwritten, heartfelt | **script** (sparingly) | "script = graceful, intimate, human" |

In this engine `font` is a ROLE (`sans`/`serif`/`mono`); the actual face comes from the theme. So the
*profile* below sets the face; the layer just names the role.

## 3. Easing, the physics of the feeling

The full table lives in `TASTE-RULES.md`. The rule: **ease-out for arrivals** (a landing),
**ease-in for departures** (a launch), never linear on a visible move, and **bounce is a seasoning
for one accent, never a default**: a novice reads bounce as emphasis; it reads as cheap. (12
principles of animation: slow-in/slow-out, anticipation, follow-through.)

## 4. Composite looks / stings / shaders, the texture and era

Reach for one only on the **2–3 earned beats** (hero reveal · act break · CTA). **Pick the era of the
story, not the loudest effect.** Two registries: *looks* (`LOOKS` in `core/looks/presets.js`, a held texture over a beat)
and *stings* (`SHADER_FX` in `core/stings/index.js`, a shader that peaks AT a cut). Complete coverage below,
grouped by the register each evokes: pick the group your story is in, then one member.

**Looks: the held texture (register → the looks that carry it):**

| Register / era | Looks (pick one) |
|---|---|
| analog nostalgia (warm, dated) | `vhs` · `crt` · `super8` · `lomo` · `fadedPolaroid` · `nostalgia` · `vintageAnamorphic` |
| cinematic / film | `halationFilm` · `droneCinematic` · `filmNoir` · `dreamSequence` |
| print / editorial | `letterpress` · `emboss` · `impact` |
| sci-fi / data / digital | `thermal` · `nightVision` · `cyberpunk` · `hologram` · `glitchGlow` |
| premium / glamour / energy | `chrome` · `angelic` · `edgeGlow` · `neon` |
| dreamy / soft-focus | `dreamyHaze` · `watercolor` |
| distortion / physical FX | `melt` · `glassWarp` · `heatWarp` · `rippleGlass` · `timeFreeze` · `fatten` |

**Stings: the shader AT the seam (what the cut should MEAN → the stings that say it):**

| The seam should read as… | Stings (pick one) |
|---|---|
| time passing / reflection | `dissolve` · `ink` · `leak` · `bokeh` |
| energy, momentum | `whipPan` · `streak` · `cinematicZoom` · `warp` |
| digital shock / rupture | `glitch` · `chromaticSplit` · `dispersion` · `pixel` · `gridPixelateWipe` · `scan` |
| playful "notice the cut" (shape wipes) | `wipe` · `circle` · `blinds` · `squares` · `pinwheel` · `doors` · `polka` · `swirl` · `sdfIris` |
| a heavy story turn | `vortex` · `burn` · `ridgedBurn` |
| liquid / organic morph | `crossWarp` · `domainWarp` · `ripple` |
| punctuation / a hit | `flash` · `grain` · `confetti` |
| premium glamour / product | `lens` · `iridescence` · `thermal` |

Match the sting's register to the look and the profile: an `apple` beat that earns one effect takes
`lens`, never `glitch`; a `linear` reveal takes `chromaticSplit`, never `confetti`. (See MOTION-CRAFT
§Effect selection for the effect→use index and per-effect knobs.)

---

## Part 2: Reference profiles (name the target, get the whole look)

An adjective is vague; a brand is a spec. Pick the ONE reference a video should feel like, and every
family is chosen at once, coherently. This is the taste anchor when there is no brand site.

Each profile is `{ face · pace · easing · cut family · sting policy · look policy · accent }`.

### `linear`: technical, dark, restrained (dev tools)
Dark-first. **mono + tight sans.** Fast, snappy (`easeOutQuart`, cuts `snappy`). **Hard cuts**, almost
no stings, 1 at the hero reveal max. Looks: none, or a single `crt`/`matrixDecode` backdrop at low
intensity. One cool accent (cobalt/indigo). *Restraint is the personality.* Bounce: never.

### `apple`: premium, calm, generous (product launch)
Light or deep-black, huge whitespace. **Clean sans**, one hero per beat. Slow and smooth
(`easeOutCubic`/`easeInOutSine`, 0.5–0.9s), cuts `fade`/`riseBlur`. **Dissolves, never whips.** One
product is the hero; effects are almost absent: a single `lens`/`chrome` glamour moment. One accent,
often none. Held frames. Bounce: never.

### `stripe`: clean-tech, warm-serious (developer brand)
Light, gradient-mesh backdrops. **Humanist sans.** Smooth, confident (`easeOutCubic`), cuts `blur`.
Stings sparingly (`dissolve`). Looks: a soft `flow`/`aurora` field behind, gradient accents (cobalt→
violet). Trust + a little warmth. Bounce: never.

### `nike`: energetic, kinetic, high-contrast (sports ad)
Bold, full-bleed. **Heavy sans / slab**, kinetic type is the star (`up`/`stretch`/`skew`). Punchy
(`easeOutExpo`, cuts `whip`/`punch`, motion blur ON). Stings on reveals (`flash`/`streak`). One loud
accent on black/white. Motion drives everything; nothing sits still long. Bounce: only on one accent.

### `a24`: dramatic, editorial, tense (film trailer)
Dark, letterboxed. **Serif** (or a stark condensed sans). Slow, deliberate (`easeOutExpo` on hero
lines, long holds), cuts `fade`/`letterbox`, `grain`/`filmGrain` throughout. Stings `ink`/`leak`,
one `vortex` at the turn. One muted accent. Silence and stillness are the tension. Bounce: never.

### `bloomberg`: dense, mechanical, functional (data/finance)
Light, information-dense. **mono + sans.** Fast, mechanical (`easeInOutQuart`, steps-like), cuts
`collapse`/`punch`. Counters and charts are the content; the `count` easing IS the story. Minimal
stings (`scan`). One functional accent (amber/green for up/down). Bounce: never.

### `duolingo`: playful, bright, rounded (consumer app)
Light, saturated, rounded. **Rounded sans.** Bouncy, **the one profile where bounce is correct**
(`easeOutBack`/`elastic`, `bounce`/`pop` presets). Cuts `wipe`/`sdfIris`, `confetti` on wins. Multiple
bright accents allowed. Motion is joyful, overshoot everywhere. This is the exception the other seven
prove.

### `vercel`: keynote restraint, black, sharp (developer keynote)
Pure black. **Geometric sans + mono.** Snappy but spare (`easeOutQuart`), **hard cuts only**, a single
dramatic `glitch`/`chromaticSplit` at the one reveal. No looks, no backdrop. One white/one accent.
Maximum restraint, maximum contrast. Bounce: never.

**How to use a profile:** name it in the brief ("make it feel like `apple`"), or point `vawe_reflect`
at the real site to pull its exact palette + face, then apply the profile's motion/cut/effect policy.
The profile is the coordination; `vawe_reflect` is the colour precision.

> **You will read this list of eight, pick the one that feels right, and write the justification
> afterwards. That is not a decision, it is a menu.** It happened here on a live film: an agent read this
> repo's anti-default doctrine in full, picked a theme off a menu of 34, and produced its reasoning after
> the pick. The same reflex shows up about faces, and the fix generalises:
> ***"Reject your first instinct. The first one that feels right is usually your training-data default for
> that register. If you picked it last time too, find something else."***
>
> The mechanical test, before you commit: **name the profile you picked, then describe the content that
> would make a DIFFERENT profile correct.** If you cannot describe that content, you have not chosen
> between eight things, you have recognised one. Part 3 below is the tooled version of the same
> discipline, and it exists because a generator asked for three options produces the first thing three
> times.

## Pick by seeing

The eight names above are prose; **`make arsenal PRESETS=1`** renders each one as a real ~6s clip (a
headline, a support line, a hard cut in the profile's own family, one count on the profile's own
easing, one accent chip) to `site/public/blocklib/presets/<name>/{showcase.mp4, sheet.png}`, plus an
`index.json` with a one-line "pick when" per preset (its `blurb` above). `linear` and `stripe` play in
their real, already-committed theme; the other six play in a minimal `themes/presets/<name>.json`
written for this pass, since no existing theme is a real preset for them. Re-render one after tuning it:
`make arsenal PRESETS=1 ONLY=<name>`. Picking a profile by its rendered look, not its adjective, is the same
discipline `make study` gives a reference film's motion (recipes/README.md).

---

## Part 3: Choosing between whole directions (`make dev-tool X=concept`)

Everything above picks WITHIN a family once the film is decided. This part is the step before: you have
a storyboard, and several different films could be made from it. `make dev-tool X=concept SB=<storyboard.md> N=3`
generates that round.

### The failure it exists to prevent

A generator handed a brief produces the first thing anybody would produce for that brief. Ask it for
three and it produces the first thing three times, in three palettes. Nobody notices, because the three
are read side by side, where small differences look large. So the round is a menu of medians, the author
picks one, and the film regresses to the mean before a single line of JSON is written. `CLAUDE.md` names
this as the number one authoring failure. The ledger catches it afterwards, on a finished film, which is
the most expensive place to catch anything.

The fix is a constraint, not an instruction. **At least two of the N options must be improbable, or the
round is thrown away and a different one is generated.**

### How a concept's probability is computed

`p` answers one question: how likely is this the FIRST direction anybody proposes for this brief? Low is
the good end. It is **computed, never asserted**, and that distinction is the whole design. A generator
scoring its own output rates everything novel, for the same reason a film grading its own beats passes
itself. So `p` comes from three places the generator does not control, all of them files on disk:

| Term | Weight | Measured from |
|---|---|---|
| **pace echo** | 0.40 of the library term | the share of shipped scenes cutting at roughly this direction's rate, read through `quality/gates/beats-of.mjs`, the beat model the judge already uses |
| **look echo** | 0.30 | the share of shipped scenes whose theme background is this direction's dominance, from the measured luminance of `themes/<name>.json` `palette.bg` |
| **thread echo** | 0.30 | the share of the hand-written storyboard corpus already using this thread |
| **round echo** | 0.20 of `p` | how much shape this concept shares with the OTHER concepts in the same round |
| **tells** | 0.28 of `p` | the defaults this repo has already written down as defaults |

`p = 0.02 + 0.50 · library + 0.20 · round + 0.28 · tells`, clamped to `[0,1]`.

Three details are deliberate:

- **The look echo counts only the lean.** An even split between dark and light says nothing about
  either, so the echo is the library's excess over even, and it is zero for the side the library does
  not favour. Without this, every concept inherits a flat 0.5 and the score stops discriminating.
- **The thread echo excludes storyboards this tool generated.** They carry a marker, and they are
  skipped. Count them and the round inflates the frequency of whatever it proposed last time, so the
  tell compounds instead of being caught.
- **`p` depends on the round.** A concept surrounded by its own neighbours really is more predictable
  than the same concept standing alone. This is what makes a round of near-twins score badly as a
  round, rather than three times as a concept.

**The tells** are the third input, and each one cites the line in this repo that says it. The citation is
checked at startup: if the sentence has been rewritten, the tool exits rather than enforcing a rule from
memory. Today there are three.

| Tell | Fires when | Source |
|---|---|---|
| `habitual-pace` | pace sits in 2.5 to 4s | `FILM-STRUCTURE.md`: "Our films sit at 2.5 to 4 seconds a beat" |
| `the-free-device` | the thread is the transforming object | `FILM-STRUCTURE.md`: "A keyed `w`/`h` on a rectangle passes. A motif does not." |
| `slideshow-shape` | four beats or fewer across a full runtime | `AGENTS.md`, the `plain-slideshow` floor |

### The threshold is 0.10, and why that number

It is the source's number: the pitch-round discipline this is modelled on sets the tail at 0.10 and says
that if all five clear it, every pitch is the median and the round starts over. It also survives contact
with the measured library. At the time of writing, the seven directions split cleanly around it: the
three this library has never shipped (`fast-sentence` 0.03, `rhymed` 0.08, `pulsed` 0.08) sit below, and
the four it leans on (`travelled` 0.18, `counted` 0.19, `asked` 0.23, `held-object` 0.57) sit above. The
line falls in a real gap rather than through the middle of a cluster.

`held-object` scoring 0.57 is the finding, not a bug. It is the transforming object: the habitual pace,
the library's dominant look, seven of the nine hand-written storyboards, and every one of the three
tells. That is what the default looks like when it is measured.

### The two constraints, and what "regenerate" means

1. **The tail constraint.** At least two of N must score under 0.10. If not, the round is not shipped.
2. **Silhouette dedupe.** A silhouette is the concept with its content removed: beat count, the order of
   beat types, and how much of it is a picture rather than words. Two concepts with the same silhouette
   are one concept wearing two palettes, so the round is rejected and one of them is replaced.

The candidate pool is the direction table in `harness/author/directions.mjs`, so "regenerate" means take
a **different subset of it**, not re-roll a random. The table's own order is tried first, so the default
round is unchanged whenever it is good enough. Every rejection is printed with the scores that caused it:

```
↻ regenerated: held-object, fast-sentence, travelled: 1 of 3 under 0.10 (0.57 · 0.03 · 0.18)
↻ regenerated: held-object, fast-sentence, travelled: held-object and travelled have one
   silhouette (3 beats · hook>build>payoff · 0/3 pictured), so the round holds 2 concepts, not 3
```

Ordering after the table's own subset is fixed by `--seed` (default 0) and by nothing else. Two runs of
the same command on the same library produce the same round, or nobody can argue with the result.

If no subset of the table can satisfy the constraints, the tool **exits non-zero**. It never ships an
unscored or all-median round, because that is exactly the behaviour it was built to remove. The same is
true when the evidence is missing: too few readable scenes, no measurable dominance, or an empty
storyboard corpus each stop the run and name which piece is absent.

### Present all N, then recommend

The round is printed whole, with every score, before any recommendation. A recommendation stated first
anchors everything after it: the other options get read as reasons the first one was right. Only after
the full round does the tool name one, with its argument, and name the most typical direction it left
behind so the road not taken is on the record.

### What this does not prove

`p` measures unusualness against this library. It does not measure quality, and the tool says so on
every run. An improbable direction is one nobody would reach for first, which is a good place to start
looking and a terrible place to stop thinking. The recommendation is an argument, not a ruling. Judging
whether the film is any good stays where it has always been: `make judge` and your eyes.

---

## The contradictions the director should flag

A pick that fights the intent is the tell of no system. These are wrong by rule:

- **bounce on `linear`/`apple`/`vercel`/`a24`**: cheap on a serious brand (the #1 turn-off).
- **a whip/wipe on `apple`/`a24`**: announces an edit a calm/tense film wants hidden.
- **a script or serif on `linear`/`bloomberg`**: wrong register (technical wants mono).
- **more than one cut family in a film**: no film mixes them.
- **a look on every beat**: effects are earned 2–3 times, never the wallpaper.
- **a loud sting on `apple`/`linear`**: restraint IS the brand.

`make dev-tool X=direct` reads the profile and reports any of these, with the rule that caught it.
