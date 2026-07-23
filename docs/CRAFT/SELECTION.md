# SELECTION — intent → the right effect, and why

`MOTION-CRAFT.md` is effect-first ("`whip` = momentum"). This file is **intent-first**: you know the
feeling a beat wants, and it tells you which transition, font, look, easing and colour is correct,
with the reason traced to a design principle. Use it so choices are predictable and explainable, not
taste-by-vibes. `TASTE-RULES.md` says what's good; this says what to pick.

Two parts: **the decision procedures** (how to pick within one family) and **the reference profiles**
(a whole coordinated look, named after a real brand so the target is concrete, not an adjective).

---

## The one principle under all of it

> **Every choice signals two things: how much the viewer should NOTICE it, and what era/register it
> evokes.** A cut either hides the seam or announces it (Murch). A face is trusted or fresh or
> technical (font psychology). An ease is an arrival or a departure (animation). Pick by the signal
> you want to send.

---

## 1. Transitions — the grammar of the cut

**The decision procedure (Walter Murch's question first):**

1. **Should the viewer NOTICE the edit?**
   - No, keep them in the story → **hard cut** (95% of the time), or a soft `blur`/`fade` dissolve.
   - Yes, the edit is part of the show → `whip` · `wipe` · `iris` · a sting.
2. **What does the seam MEAN?**
3. **Does the background jump** (dark↔light)? If yes, cover it with a sting peaking AT the cut.

| The beat wants… | Reach for | Why (cited) |
|---|---|---|
| invisible continuity | hard cut | "the most basic edit; preserves narrative flow" — edit grammar |
| time passing / reflection | `fade`/`blur` dissolve, sting `dissolve`/`ink` | "a dissolve implies the passing of time" — Murch / dissolve convention |
| an act break, finality | `fade` (to dark), sting `leak` | "a fade marks significant story breaks, finality" — edit grammar |
| energy, momentum | `whip`/`skewWhip`, sting `whipPan` | "whip pan masks the cut through motion blur; energetic" — edit grammar |
| playful, "notice me" | `wipe`, sting `sdfIris` | "a wipe is dynamic, playful; draws attention to the cut" — edit grammar |
| a hidden connection between two shots | match the framing across a hard cut | "match cut reveals hidden connections; elegant" — edit grammar |
| product focus, a push-in | `punch`/`zoom`, resample `zoomBlur` | scale draws the eye to one subject |
| dramatic pivot, "everything changes" | sting `vortex`, `letterbox` open | a heavy transition earns a heavy story turn |

**One cut family per film.** Mixing `whip` and `iris` in one piece is five fonts on a slide. The
director rotates within a family; it does not mix families.

> **Deep dive:** this table is the summary. [`TRANSITIONS.md`](TRANSITIONS.md) is the full theory —
> the complete transition taxonomy, Murch's Rule of Six (emotion 51%), continuity-vs-montage, J/L cuts,
> shared-element morph, and the ordered per-seam decision procedure. Read it when you can't say *why*.

## 2. Fonts — the register of the voice

**The decision procedure:**

1. **What register?** authority/tradition → serif · modern/clean → sans · technical/retro → mono ·
   intimate → script.
2. **Trust or freshness?** Humanist sans tested highest for *trust*; geometric sans reads *fresh/cold*.
3. **Pick 2–3 roles, contrast don't conflict** (a serif head + a sans body; never a formal serif + a
   quirky script).

| The video wants to feel… | Face role | Why (cited) |
|---|---|---|
| trusted, established, luxury | **serif** | "serif = stable, mature, formal, timeless authority" — font psychology |
| modern, clean, a startup/tech | **humanist sans** | "sans = modern, clear, efficient; humanist sans highest for trust" |
| strong, bold, editorial headline | **slab / heavy sans** | "slab = strength, boldness, confidence" |
| technical, precise, a terminal | **mono** | "mono = technical precision, retro, utilitarian" |
| human, handwritten, heartfelt | **script** (sparingly) | "script = graceful, intimate, human" |

In this engine `font` is a ROLE (`sans`/`serif`/`mono`); the actual face comes from the theme. So the
*profile* below sets the face; the layer just names the role.

## 3. Easing — the physics of the feeling

The full table lives in `TASTE-RULES.md`. The rule: **ease-out for arrivals** (a landing),
**ease-in for departures** (a launch), never linear on a visible move, and **bounce is a seasoning
for one accent, never a default** — a novice reads bounce as emphasis; it reads as cheap. (12
principles of animation: slow-in/slow-out, anticipation, follow-through.)

## 4. Composite looks / stings / shaders — the texture and era

Reach for one only on the **2–3 earned beats** (hero reveal · act break · CTA). **Pick the era of the
story, not the loudest effect.** Two registries: *looks* (`core/looks.js`, a held texture over a beat)
and *stings* (`SHADER_FX` in `core/stings.js`, a shader that peaks AT a cut). Complete coverage below,
grouped by the register each evokes — pick the group your story is in, then one member.

**Looks — the held texture (register → the looks that carry it):**

| Register / era | Looks (pick one) |
|---|---|
| analog nostalgia (warm, dated) | `vhs` · `crt` · `super8` · `lomo` · `fadedPolaroid` · `nostalgia` · `vintageAnamorphic` |
| cinematic / film | `halationFilm` · `droneCinematic` · `filmNoir` · `dreamSequence` |
| print / editorial | `letterpress` · `emboss` · `impact` |
| sci-fi / data / digital | `thermal` · `nightVision` · `cyberpunk` · `hologram` · `glitchGlow` |
| premium / glamour / energy | `chrome` · `angelic` · `edgeGlow` · `neon` |
| dreamy / soft-focus | `dreamyHaze` · `watercolor` |
| distortion / physical FX | `melt` · `glassWarp` · `heatWarp` · `rippleGlass` · `timeFreeze` · `fatten` |

**Stings — the shader AT the seam (what the cut should MEAN → the stings that say it):**

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

## Part 2 — Reference profiles (name the target, get the whole look)

An adjective is vague; a brand is a spec. Pick the ONE reference a video should feel like, and every
family is chosen at once, coherently. This is the taste anchor when there is no brand site.

Each profile is `{ face · pace · easing · cut family · sting policy · look policy · accent }`.

### `linear` — technical, dark, restrained (dev tools)
Dark-first. **mono + tight sans.** Fast, snappy (`easeOutQuart`, cuts `snappy`). **Hard cuts**, almost
no stings — 1 at the hero reveal max. Looks: none, or a single `crt`/`matrixDecode` backdrop at low
intensity. One cool accent (cobalt/indigo). *Restraint is the personality.* Bounce: never.

### `apple` — premium, calm, generous (product launch)
Light or deep-black, huge whitespace. **Clean sans**, one hero per beat. Slow and smooth
(`easeOutCubic`/`easeInOutSine`, 0.5–0.9s), cuts `fade`/`riseBlur`. **Dissolves, never whips.** One
product is the hero; effects are almost absent — a single `lens`/`chrome` glamour moment. One accent,
often none. Held frames. Bounce: never.

### `stripe` — clean-tech, warm-serious (developer brand)
Light, gradient-mesh backdrops. **Humanist sans.** Smooth, confident (`easeOutCubic`), cuts `blur`.
Stings sparingly (`dissolve`). Looks: a soft `flow`/`aurora` field behind, gradient accents (cobalt→
violet). Trust + a little warmth. Bounce: never.

### `nike` — energetic, kinetic, high-contrast (sports ad)
Bold, full-bleed. **Heavy sans / slab**, kinetic type is the star (`up`/`stretch`/`skew`). Punchy
(`easeOutExpo`, cuts `whip`/`punch`, motion blur ON). Stings on reveals (`flash`/`streak`). One loud
accent on black/white. Motion drives everything; nothing sits still long. Bounce: only on one accent.

### `a24` — dramatic, editorial, tense (film trailer)
Dark, letterboxed. **Serif** (or a stark condensed sans). Slow, deliberate (`easeOutExpo` on hero
lines, long holds), cuts `fade`/`letterbox`, `grain`/`filmGrain` throughout. Stings `ink`/`leak`,
one `vortex` at the turn. One muted accent. Silence and stillness are the tension. Bounce: never.

### `bloomberg` — dense, mechanical, functional (data/finance)
Light, information-dense. **mono + sans.** Fast, mechanical (`easeInOutQuart`, steps-like), cuts
`collapse`/`punch`. Counters and charts are the content; the `count` easing IS the story. Minimal
stings (`scan`). One functional accent (amber/green for up/down). Bounce: never.

### `duolingo` — playful, bright, rounded (consumer app)
Light, saturated, rounded. **Rounded sans.** Bouncy — **the one profile where bounce is correct**
(`easeOutBack`/`elastic`, `bounce`/`pop` presets). Cuts `wipe`/`sdfIris`, `confetti` on wins. Multiple
bright accents allowed. Motion is joyful, overshoot everywhere. This is the exception the other seven
prove.

### `vercel` — keynote restraint, black, sharp (developer keynote)
Pure black. **Geometric sans + mono.** Snappy but spare (`easeOutQuart`), **hard cuts only**, a single
dramatic `glitch`/`chromaticSplit` at the one reveal. No looks, no backdrop. One white/one accent.
Maximum restraint, maximum contrast. Bounce: never.

**How to use a profile:** name it in the brief ("make it feel like `apple`"), or point `vawe_reflect`
at the real site to pull its exact palette + face, then apply the profile's motion/cut/effect policy.
The profile is the coordination; `vawe_reflect` is the colour precision.

---

## The contradictions the director should flag

A pick that fights the intent is the tell of no system. These are wrong by rule:

- **bounce on `linear`/`apple`/`vercel`/`a24`** — cheap on a serious brand (the #1 turn-off).
- **a whip/wipe on `apple`/`a24`** — announces an edit a calm/tense film wants hidden.
- **a script or serif on `linear`/`bloomberg`** — wrong register (technical wants mono).
- **more than one cut family in a film** — no film mixes them.
- **a look on every beat** — effects are earned 2–3 times, never the wallpaper.
- **a loud sting on `apple`/`linear`** — restraint IS the brand.

`make direct` reads the profile and reports any of these, with the rule that caught it.
