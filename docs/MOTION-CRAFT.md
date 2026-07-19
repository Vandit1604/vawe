# MOTION-CRAFT — the stored rules of great motion animation

Distilled July 2026 from motion-design craft literature (Disney's 12 principles applied to
screen design, kinetic-typography practice, brand-film pacing) and from our own shipped-film
findings. **Consult before storyboarding** (the planning skill points here). The right column
says which of our gates enforces each rule — everything else is judgment the ledger can't save
you from.

## The 10 rules

| # | Rule | What it means in practice | Enforced by |
|---|---|---|---|
| 1 | **Timing is a voice, not a constant** | Entry pace varies per beat with intent: ambient drifts 0.8–1.2s, payoffs snap 0.25–0.35s, thesis lines 0.5s+. Uniform 0.45s everywhere = monotone narration. | `motion-audit (ix) rhythm-monotony` warns |
| 2 | **Ease-out in, accelerate out** | Entrances decelerate (arrivals are landings); exits accelerate (departures are launches). Never linear on a visible move. Springs only where personality wants overshoot. | judgment (+ theme.motion sets the family) |
| 3 | **Hierarchy through offset** | Related elements stagger 60–120ms "one after another"; the beat's hero element moves last or largest. Motion order = reading order. | judgment |
| 4 | **Choreograph arrivals** | Elements sharing a beat arrive as one phrase (stagger chains via relative starts), not as independent events. Anticipation = the tiny pre-move (upbeat) before the main move. | relative timing exists; judgment |
| 5 | **Settle and hold** | Every payoff finishes ≥HOLD before its exit and stays put. Sub-pixel drift on settled text reads as shaking. | `motion contract (iii)` + `shimmer (viii)` |
| 6 | **One hero motion per beat** | One element owns the motion; everything else supports quietly. Two competing animations = zero read. | judgment |
| 7 | **Rotate layout archetypes** | Never the same archetype twice in a row (split / centered-top / full-bleed / card-over-board). | ledger flags SAME-SKELETON cross-video; per-video = storyboard rule |
| 8 | **Velocity contrast between beats** | A fast beat earns a still one; the freeze after a rush is the joke landing. Speed-ramp inside a move (`ramp`), contrast between moves. | judgment |
| 9 | **Cover the hard cut** | Background jumps (dark↔light) want a sting peaking AT the cut; same-bg scenes can whip/slide raw. | judgment (stings exist) |
| 10 | **Type moves like it reads** | Text enters in reading order (L→R, top→down), rises from its own baseline, never crosses another line's path. The motion IS part of the meaning (kinetic-type first law). | judgment |

## Genre pacing tables

| Genre | Beat length | Entry pace | Cuts | Stings |
|---|---|---|---|---|
| Launch film (30–60s) | 4–7s | varied per rule 1 | 1 family + 1 accent | 2–3 total, at act breaks |
| Product walkthrough | 5–8s | calm, UI-mechanism motion only | punch/fade | 0–1 |
| Shorts (games/facts) | 2–4s | snappy throughout (genre IS fast) | whip/pop | flash on reveals |

## DO / DON'T pairs

- DO let a counter's easing be the story (speedRamp timer). DON'T animate numbers linearly.
- DO give ambient chrome `pulse`/`wave` at tiny amplitude. DON'T loop anything near text being read.
- DO use `elevation` + glow for depth. DON'T stack two shadows systems on one card.
- DO stagger board cards 60–90ms. DON'T pop a whole board at once (reads as a screenshot).
- DO end on a held frame (exitDur 0). DON'T fade the CTA (the holdLast bug class).
- DO scale travel to element size (22px for UI text, 40–70px for heroes). DON'T fling small text far.

## Effect selection guide (when to use what)

- **Kinetic presets**: `up/down` default read · `type` terminals & timers · `decode` tech reveal
  (sparingly, hero words only) · `riseClip` editorial mastheads · `tilt/skew` sporty ·
  `elastic/bounce` playful brands only · `focus/blur` dreamy/premium · `gradient` one hero word
  max per film · `highlight/underline` emphasis mid-sentence · `shadow` poster-style statements ·
  `stretch` impact words · `wave` ambient loops only.
- **Cuts**: `fade/blur` neutral · `whip/skewWhip` momentum (same-bg only) · `punch/zoom` product
  focus · `spin` logos/badges · `collapse` terminal/data beats · `blinds` editorial reveal ·
  `letterbox/barn` cinematic openers · `riseBlur` premium slow beats · `jitter` alarm/glitch only.
- **Stings**: `flash` energy cut · `burn/leak` warm brands · `ink/dissolve` editorial ·
  `glitch/scan/pixel` tech · `streak/warp` speed · `ripple` impact · `bokeh` dreamy divider ·
  `confetti` wins/celebrations only · `grain` texture pulse · `crossWarp` a wipe with grit (organic
  brands where `wipe` is too clean; dark scenes) · `domainWarp` art/culture beats, one per film · `sdfIris`
  playful reveal (the seeded shape is the personality; dark scenes) · `vortex` dramatic pivots, "everything
  changes here" · `ridgedBurn` hotter burn for launches/records · `lens` premium product glamour (dark scenes, it is a light source) ·
  `thermal` intensity/data beats, sparingly · `whipPan` momentum cut when the layout also moves
  sideways · `chromaticSplit` impact with a tech accent (softer than `glitch`) · `dispersion`
  spectral flourish for color/light stories only · `gridPixelateWipe` a digital/retro-game or
  data-glitch cut (tint with `color` to a brand accent; the block front reads as "loading/decoding").
- **Ambient shader looks** (`shader` layer, looping): fields BEHIND content at intensity ~0.3 — `flow`
  premium default · `aurora` soft/organic · `plasma` retro/energetic · `drift` calm/dreamy · `mist`
  barely-there · `matrixDecode` hacker/terminal/AI-code backdrop (`colors[0]` sets the rain hue; keep
  body copy in the darker gutters). Overlay looks ON TOP at intensity ~0.6-0.9, one per film — `vhs` lo-fi/nostalgic ·
  `crt` retro-tech/terminal · `filmGrain` texture on flat frames (keeps contrast) · `lightLeak` warm
  analog warmth over a hero · `barrel` a lens-shot feel · `heatShimmer` tension/heat/desert · `ripple`
  calm water/reflection · `kaleidoscope` a music/psychedelic flourish. Place overlays on a high track;
  they veil, they don't warp the pixels beneath. Don't stack two, and never behind small body copy.
- **Motion blur** (`"motionBlur": true` on a layer with a `motion` track): a velocity-derived streak on
  fast moves — the layer smears while travelling, snaps crisp when it settles. Reach for it on whip-ins,
  fast slides, and hard slams to sell speed and hide the discrete-frame stutter; a `0..1` number tunes
  strength (default `true` = half-shutter). Skip it on slow/ambient drifts (no streak to earn) and on
  small body text held mid-move (it dissolves). Pure in the frame → seek-safe, capped so text never melts.
- **Resample** (`"resample"` on an `image`/`paint`/`shader` layer): the layer's own pixels re-sampled
  through a shader, so unlike a `filter` it can smear, bend and quantise. One per film, on the hero
  shot. `zoomBlur` on an impact moment (ramp `amount:[0.6, 0]` so the frame rushes in and snaps sharp)
  · `dissolve` as a transition OUT of an image (`amount:[0.05, 0.95]` erodes it away on an ember front)
  · `refract` for a liquid-glass hero · `spinBlur` on a rotating badge · `bitCrush`/`macroblock` for a
  degrade/glitch beat, never as decoration. A constant `amount` is usually the wrong call: half of these
  only read as motion while they MOVE, so ramp them across the layer's window.

### Let the director pick (restraint by default)
Don't hand-scatter effects. **`make direct D=<file>`** reads the brand's motion personality (`theme.motion`)
and applies these rules per transition: cover a hard background jump with a sting · whip/punch only when the
background *doesn't* change · rotate one cut family (no archetype twice) · punchy brands snap, calm brands
dissolve. It prints a report; `WRITE=1` applies the picks → `<file>.directed.json`. This is how you kill the
"too many effects" tell — the director chooses fewer, righter effects than an author reaching for variety.

## The enforcement map (what code already guarantees)

Purity probe (determinism) · motion contract i–v (holds/settles/monotonic/counters/typing) ·
shimmer viii (no shaking text) · rhythm ix (no monotone entries) · layout audit (overlap /
safe-zone / clipping) · contrast gates (text 4.5+, images 3+, headline dominance 7+) ·
no-emdash · similarity + ledger (cross-video sameness). Everything else in this file is taste —
which is why it's written down.


## Wave-1 effect selection (colour grades · glow · captions)

Colour-grade filter presets (any layer, `filter:` — core/filters.js):
- **duotone** — collapse a busy photo into two brand colours so it reads as graphic, not photographic; the bare default (ink to accent) makes any image on-brand instantly.
- **tritone** — duotone with a mid-tone, for photos that lose too much in two colours (faces, product shots).
- **gradientMap** — a full stylised grade for hero imagery that should feel art-directed, not filtered.
- **posterize** — screen-print bands for a punchy retro beat; keep levels 4-6, below 4 gets muddy.
- **sepia** — the archive-footage cue; partial (`sepia:0.6`) reads warmer, less costume-y.
- **vignette** — pull the eye to centre on full-bleed imagery; keep under 0.6 or it reads as a tunnel.

Glow presets (`type:"glow"`, `preset:` — core/layers/glow.js):
- **bloom** — energy AT a bright point: behind a logo, a lit number, a payoff word.
- **halation** — film-warm glamour on a single highlight; keep intensity low, felt not seen.
- **diffusion** — soften a busy dark region so foreground text floats; an area treatment, not a point.
- **rimLight** — edge-light a subject placed to the crescent's upper-right; gives a cutout dimension.
- **spotlight** — stage a reveal: aim the cone (angle, default from above-left) at what enters next.

Caption styles (`captionStyle:` — core/captions.js; word-timed, degrade to length-proportional pacing):
- **highlight** — marker-pen emphasis with a read trail; the default when the caption IS the content.
- **pillKaraoke** — the loudest, most social; fast hype cuts over busy footage, never over dense UI.
- **weightShift** — the quietest; product demos and calm brand films; needs a multi-weight face.
- **clipWipe** — lyric-video energy for one hero line; only on themes whose accent clears 4.5:1.
