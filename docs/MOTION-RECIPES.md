# MOTION-RECIPES — the atomic recipe index (copy-paste motion, keyed to the schema)

The fastest way to author snappy, directed motion instead of default fades. Each recipe is **one line**:
a slug, what it does and WHEN, the exact JSON to paste, and tags. Compose **2-4 recipes per beat** —
an entrance + a rhythm + a transition — never one uniform fade on everything.

- Inspired by another engine' `rules-index.md`, but every mechanism here is a REAL vawe field
  (`formats/scene/schema.json` is the contract; `docs/PRIMITIVES.md` is the vocabulary).
- **Doctrine lives in [`MOTION-CRAFT.md`](MOTION-CRAFT.md)** (the 10 rules, the Snap section, the
  Cut-or-transition guide). This file is the lookup table that applies it.
- The golden rule, from MOTION-CRAFT: entrances overshoot-and-settle, exits accelerate away, **never
  linear on a visible move**, and every beat that enters also EXITS before it cuts.

Legend for tags: `entrance · exit · overshoot · rhythm · transition · camera · value · text · sound · brand`.

---

## Entrances — the layer `anim` (one line, one settle)

- **`snap-in`** — the default directed entrance; a card/headline rises past rest and settles. Use for
  almost everything. `{ "anim": "rise", "enterDur": 0.3 }` · _entrance, overshoot, default_
- **`pop-in`** — scale-up with overshoot; use for a chip, badge, icon, or a punchy reveal.
  `{ "anim": "pop", "enterDur": 0.28 }` · _entrance, overshoot_
- **`lift-in`** — travels further and settles alive; use for faces, avatars, or a staggered row of cards.
  `{ "anim": "lift", "enterDur": 0.35, "each": 0.08 }` · _entrance, overshoot, stagger_
- **`calm-fade`** — opacity only, no motion; use ONLY when a move would fight dense content (a full grid).
  `{ "anim": "fade", "enterDur": 0.4 }` · _entrance, calm_
- **`glide-in`** — directional slide; pair with its matching exit (enter right → leave left).
  `{ "anim": "slide-right", "enterDur": 0.32, "out": "slide-left" }` · _entrance, exit, directional_
- **`focus-in`** — arrives through focus, not space; correct for faces/cards where sliding reads as chaos.
  `{ "anim": "fade", "out": "defocus", "exitDur": 0.35 }` · _entrance, exit, blur_
- **`progressive-blur`** — a directional blur fog over a full-frame rect fades a dense grid/list/feed
  into an edge (backs the "blur out dense content" rule). `{ "type": "rect", "x": 0, "y": 0, "w": 1920, "h": 1080, "track": 50, "bg": "transparent", "progressiveBlur": { "dir": "bottom", "max": 22, "start": 0.15 } }` · _overlay, blur, density_
- **`bar-grow`** — a bar/underline grows from its baseline; use for charts and reveal underlines.
  `{ "anim": "wipe-up", "enterDur": 0.4 }` · _entrance, data_

## Overshoot & spring — the `ease` on any keyframe (`motion[] / camera / vars / count`)

- **`spring-settle`** — value overshoots past target and settles; the core snap on a custom track.
  `{ "motion": [{ "t": 0, "dy": 90, "opacity": 0, "ease": "spring" }, { "t": 0.3, "dy": 0, "opacity": 1, "ease": "spring" }] }` · _overshoot, value_
- **`spring-bouncy`** — more overshoot for playful brands only. `"ease": "spring-bouncy"` · _overshoot, brand_
- **`spring-stiff`** — quick settle, minimal overshoot; premium/restrained. `"ease": "spring-stiff"` · _overshoot, calm_
- **`snap-ease`** — the default layer settle, usable by name on a keyframe. `"ease": "snap"` · _overshoot_
- **`back-out`** — a classic tactile overshoot (like `back.out`); good on a scale keyframe. `"ease": "easeOutBack"` · _overshoot_
- **`rush-out`** — a value that accelerates away (exit velocity). `"ease": "easeInCubic"` · _exit_

## Split-text reveals — `split` + `preset` (per-unit motion)

- **`words-rise`** — words rise in as a wave; the default kinetic headline.
  `{ "split": "word", "preset": "up", "each": 0.5, "stagger": 0.045 }` · _text, entrance, stagger_
- **`beat-slam`** — short phrase slams in on one shared beat; big hooks.
  `{ "split": "word", "preset": "scale", "each": 0.3, "stagger": 0.03 }` · _text, overshoot_
- **`type-on`** — terminal/input typing; use for a prompt, code, or a query beat.
  `{ "type": "text", "typing": 22, "font": "mono" }` · _text, value, sound_
- **`decode`** — glyphs scramble then resolve; ONE hero word, tech brands, sparingly.
  `{ "split": "char", "preset": "decode", "each": 0.6 }` · _text, tech_
- **`gradient-hero`** — one hero word with a static gradient fill; max one per film.
  `{ "gradient": { "from": "#ffffff", "to": "#ff742e", "angle": 165 }, "motionBlur": true }` · _text, hero_
- **`gradient-spin`** — a 3-colour gradient that travels in a CIRCLE around the glyphs (rotating conic
  fill); a living hero word. `{ "gradient": { "colors": ["#ff5f6d", "#ffc371", "#5e6ad2"], "animate": "spin", "speed": 0.3 } }` · _text, hero, animated_
- **`gradient-flow`** — the same colours sliding sideways along an angle (a flowing sweep).
  `{ "gradient": { "colors": ["#5e6ad2", "#22d3ee", "#5e6ad2"], "animate": "flow", "angle": 100, "speed": 0.25 } }` · _text, animated_
  (`speed` is turns/sec; the fill stays pure in t, so it is render-order safe.)
- **`text-shimmer`** — a bright sheen band sweeps across a solid word (the "AI loading" sheen); loops.
  `{ "gradient": { "colors": ["#5e6ad2", "#ffffff"], "animate": "shimmer", "speed": 0.6 } }` · _text, loop, animated_
- **`shimmer-wave`** — a 3D shimmer crest (lift + scale + rotateY + brighten) travels across the letters;
  a living headline. `{ "split": "char", "preset": "shimmerWave", "phaseStep": 0.12, "speed": 1.0 }` · _text, loop, 3d_
- **`inkflash`** — a per-word accent colour-wave; emphasis on a thesis line. `{ "split": "word", "preset": "inkflash" }` · _text, accent_
- **`blur-sweep`** — a left-to-right defocus reveal; calm/premium opener.
  `{ "split": "word", "preset": "blur", "each": 0.75, "stagger": 0.06 }` · _text, calm_

## Exits — `out` + `exitDur` (pair every entrance with one)

- **`hold-last`** — the CTA/end card must NOT fade; hold it. `{ "exitDur": 0 }` · _exit, cta_
- **`blur-out`** — leave through focus; faces, cards, dense grids. `{ "out": "defocus", "exitDur": 0.3 }` · _exit, blur_
- **`directional-out`** — continue the travel (enter right → leave left), never retreat.
  `{ "anim": "slide-right", "out": "slide-left", "exitDur": 0.28 }` · _exit, directional_
- **`scale-away`** — a hero exits bigger + motion-blur (the dolly-out). See `dolly` below. · _exit, camera_

## Beat-to-beat transitions — cut FIRST, transition only when it earns it

See [`MOTION-CRAFT.md`](MOTION-CRAFT.md) "Cut, or transition?" — default to the hard cut; a transition
must state a relationship (time/place/this-becomes-that).

- **`hard-cut`** — no transition; fast pace, on the beat, raw impact. Just place adjacent beats; run
  `make beatsync` to land it on the beat. · _transition, default, sound_
- **`punch-cut`** — a scene-level punch-in on a product focus. `{ "cuts": [{ "t": 6.0, "style": "punch", "dur": 0.28 }] }` · _transition_
- **`layer-cut`** — a per-layer cut presentation with snappy timing.
  `{ "cut": "whip", "cutTiming": "snappy", "dir": "left" }` · _transition, momentum_
- **`dissolve`** — passage of time / location change / montage. `{ "seams": [{ "t": 5.0, "fx": "dissolve", "dur": 0.5 }] }` · _transition, time_
- **`whip-pan`** — momentum cut when the layout also moves sideways. `{ "seams": [{ "t": 5.0, "fx": "whipPan", "dur": 0.5 }] }` · _transition, momentum_
- **`dive-in`** — dynamic zoom into a sub-framed element/screen. `{ "seams": [{ "t": 5.0, "fx": "cinematicZoom", "dur": 0.55 }] }` · _transition, camera_
- **`portal-reveal`** — a glowing portal opens from centre with a torn chromatic edge and swallows the
  frame into the next beat; a sci-fi / big-reveal moment (use once). `{ "seams": [{ "t": 5.0, "fx": "portal", "dur": 0.9, "intensity": 1.0, "seed": 3 }] }` · _transition, reveal, energy_
- **`flash-cut`** — a white flash on an energy pivot; use at an act break, sparingly.
  `{ "seams": [{ "t": 5.0, "fx": "flashWhite", "dur": 0.4 }] }` · _transition, energy_
- **`sting-accent`** — a full-frame shader accent on a reveal (warm brands: `leak`/`burn`; tech: `glitch`).
  `{ "stings": [{ "t": 5.0, "fx": "leak", "colors": ["#ff742e"], "intensity": 0.6 }] }` · _transition, accent_

## Camera & dolly — `camera[]` + a hero `motion` track

- **`slow-push`** — one monotonic camera push across the film; adds life without moving content.
  `{ "camera": [{ "t": 0, "s": 1.0 }, { "t": 20, "s": 1.06, "ease": "linear" }] }` · _camera_
  (Interior camera keyframes use `ease:"linear"` — the default ease-in-out zeroes velocity and pulses.)
- **`dolly-hero`** — a headline enters oversized, SNAP-settles, drifts, exits bigger with motion-blur.
  `{ "motion": [{ "t": 0, "scale": 1.5, "opacity": 0, "ease": "easeOutCubic" }, { "t": 0.34, "scale": 1, "opacity": 1, "ease": "spring" }, { "t": 2.4, "scale": 1.04, "ease": "linear" }, { "t": 2.8, "scale": 1.8, "opacity": 0, "ease": "easeInCubic" }], "motionBlur": true }` · _camera, overshoot, hero_
  (Or let the director write it: `make cinematic D=<file> WRITE=1`.)
- **`impact-shake`** — a decaying shake on an impact frame; a hit, a slam. `{ "cut": "jitter" }` (declared, purity-exempt) · _camera, impact_

## Animated values — drive what a block DOES (`vars`, count, ken, cursor)

- **`count-up`** — a number counts to its reading with eased velocity. `{ "type": "count", "to": 2500000, "ease": "easeOutExpo" }` · _value_
- **`gauge-sweep`** — interpolate a CSS var into your own SVG/CSS (a gauge, a bar, a ring).
  `{ "vars": { "--p": [0, 1] }, "varsDur": 1.2, "varsEase": "spring" }` · _value, overshoot_
- **`ken-drift`** — a slow zoom on a still image so it is never static. `{ "ken": { "from": 1.02, "to": 1.1 } }` · _value, image_
- **`cursor-click`** — a cursor moves and clicks; the NEXT frames must show what the click did.
  `{ "type": "cursor", "path": [{ "t": 0, "x": 980, "y": 780 }, { "t": 0.8, "x": 1392, "y": 617 }], "clicks": [0.95] }` · _value, demo_

## Rhythm & stagger — entry pace is a voice, not a constant

- **`wave-stagger`** — related items arrive one after another (motion order = reading order). `{ "each": 0.08 }` (60-120ms) · _rhythm_
- **`payoff-snap`** — the most important element moves last or fastest. `{ "enterDur": 0.28 }` on the hero · _rhythm_
- **`luxury-pace`** — a thesis line is slow and deliberate. `{ "each": 0.6, "stagger": 0.05 }` · _rhythm, calm_
- **`no-uniform`** — never `enterDur: 0.45` on every layer; vary per beat with intent. · _rhythm_

## Sound — silence is the default; a beat is opt-in

- **`auto-sfx`** — derive a crisp cue per cut/seam/sting (whoosh/press). `{ "audio": { "auto": true } }` · _sound_
- **`real-beat`** — opt a real royalty-free loop in (run `make music-pack` first).
  `{ "audio": { "music": "assets/music/lofi.wav", "musicGain": 0.42, "musicFade": { "in": 0.9, "out": 1.8 } } }` · _sound_
- **`cut-to-beat`** — snap every cut/seam onto the loop's grid. `make beatsync D=<file> MUSIC=assets/music/lofi.wav WRITE=1` · _sound, transition_
- **`silence`** — the premium default; no bed, SFX carry it. Omit `audio.music` (or `{ "audio": { "auto": true } }`). · _sound, calm_

## Brand personality — one theme block tunes every default

- **`punchy-brand`** — tighten every default so the whole film snaps (a fast, confident brand).
  `theme.motion: { "easing": "easeOutBack", "bounce": 0.16, "durationScale": 0.85, "stagger": 0.045 }` · _brand_
- **`calm-brand`** — stretch every default for a premium, restrained brand.
  `theme.motion: { "easing": "easeOutExpo", "bounce": 0.06, "durationScale": 1.1, "stagger": 0.08 }` · _brand, calm_
  (`theme.motion` is applied at render as the default for every layer; per-layer values still win.)

---

## How to compose a beat (worked example)

A product-feature beat = an entrance + a rhythm + a backing surface + an earned transition out:

```json
{ "type": "text", "text": "Idea to inbox.", "anim": "rise", "enterDur": 0.3, "out": "defocus", "exitDur": 0.28 }   // snap-in + blur-out
```
plus the real UI it proves (a `component` capture with `lift-in` + `wave-stagger`), a `slow-push` camera
over the whole film, `auto-sfx`, and a `dissolve` only when the next beat changes place. That is 4 recipes,
not one fade. See `formats/scene/motion-test.json` for the snap A/B, and the `showcase-*.json` scenes for
feature demos.
