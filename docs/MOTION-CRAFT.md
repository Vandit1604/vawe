# MOTION-CRAFT — the stored rules of great motion animation

> **How should it FEEL, and what not to do?** See [`CRAFT/TASTE-RULES.md`](CRAFT/TASTE-RULES.md) — the cause→feeling layer and the failure-modes catalog. This file is the mechanics; that one is the taste.
> **Which effect for which FEELING (intent-first), grounded in design theory?** See [`CRAFT/SELECTION.md`](CRAFT/SELECTION.md) — this file is the effect→use index; that one is the intent→effect picker + the named reference profiles (linear/apple/nike/a24/…).
> **Just want the copy-paste JSON?** See [`MOTION-RECIPES.md`](MOTION-RECIPES.md) — the atomic recipe index (one line per motion pattern: slug · exact JSON · tags). This file is the rules; that one applies them.

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

## Speed dials — the numbers, in one place

Rule 1 says timing is a voice; these are the ranges that voice speaks in. Measured against the
external consensus (Quiet UI text-reveal defaults: duration 100-2000ms, default 600; stagger 5-100ms,
default 20 — https://next.quietui.org/docs/components/text-reveal), and against what actually reads on
a 30fps render.

| Dial | JSON | Fast | Default | Calm | Notes |
|---|---|---|---|---|---|
| Per-unit reveal | `each` | 0.25-0.35s | 0.5s | 0.75-1.2s | payoff / thesis / ambient (Rule 1) |
| Reveal stagger | `stagger` | 0.04s | 0.06s | 0.10-0.12s | Rule 3's 60-120ms; below 0.04 the sweep stops reading as a sweep |
| Cut length | `cutTiming` | `snappy`/`pop` | `smooth` | `out` | velocity contrast between beats (Rule 8) |
| **Ransom re-roll** | `ransom.cycle` | 0.5s | **1.2s** | 1.6-2.0s | see below |
| **Ransom re-roll offset** | `ransom.stagger` | 0.08s | 0.16s | 0.2s | keeps letters from flipping in unison |

**`ransom.cycle` deserves its own note, because it is the one dial that is NOT an entrance.** Everything
else here fires once and settles; a cycling ransom note changes *for the whole shot*, so the eye never
gets a rest frame. The instinct to reuse entrance timings (0.5s) is wrong — at 12 glyphs that is ~24
changes a second across the line and reads as noise, not as a note being re-pinned. **Start at 1.2s.**
Under ~0.8s it stops reading as deliberate; over ~2s it reads as broken. Scale UP with glyph count: the
more letters on screen, the more total churn per second at the same cycle.

Pair it with a slow entrance so the shot opens calm and stays calm: `preset:"blur"` with `each` 0.75 and
`stagger` 0.06 gives a left-to-right defocus sweep that resolves over ~0.7s (see ransom-internal.json).

## Snap — the overshoot-and-settle (what separates ours from real motion graphics)

The single most recognizable "this was directed" tell in professional motion graphics is **overshoot**:
an element moves fast, passes slightly beyond its rest point, and settles back. A curve that only
decelerates to its target (easeOutCubic) reads floaty; a curve that overshoots and settles reads alive.
This is not a new capability — the engine ships it — it just has to be USED.

- **Entrances overshoot; the default now does it for you.** The layer-level `rise`/`up` entrance uses
  `easeOutSnap` (a modest spring, bounce 0.20): the translate carries past rest and settles. `pop`/`scale`
  use `easeOutBack`. You get snap for free on any `anim:"rise"`/`"pop"` layer — reach for a flat curve
  only when you deliberately want calm.
- **Snap lands in the 0.2-0.3s band.** Default enter is now **0.30s** (was 0.45), exit **0.26s** (was 0.4).
  A move that takes half a second reads floaty; a third of a second reads confident. Stretch only with intent.
- **Overshoot on ANY keyframe track.** On a `motion[]`/count/camera keyframe, set `ease:"spring"` (or
  `"spring-bouncy"`/`"spring-stiff"`) and the value overshoots-and-settles instead of gliding. Same for
  cut timing `pop`. This is how a card, a bar, or a number arrives with weight.
- **The theme owns the personality — and it now applies.** `theme.motion`
  `{easing,bounce,settle,enter,durationScale,stagger}` scales every default at render time (a punchy brand
  tightens `durationScale`/`stagger`; a calm one stretches them). It was defined-but-unwired before; it is
  live now, so set it per brand rather than hand-tuning every layer.
- **Keep it premium, not toy.** Bounce is deliberately modest (0.14-0.16). A big visible bounce on every
  word reads as a children's app. Overshoot should be felt, not counted.

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

## Cut, or transition? (the boundary between two beats)

Before reaching for a seam/sting, ask whether the beat wants a plain CUT. Grounded in School of Motion's
six essential transitions (https://schoolofmotion.com/blog/six-essential-motion-design-transitions-tutorial):
*"Simplicity is the ultimate sophistication"* — the hard cut is the professional default, and a transition
has to EARN its place. Map the editorial intent to the mechanism:

| Intent between two beats | Use | In the engine |
|---|---|---|
| Fast pace / on the beat / raw impact | **Hard cut** (no transition) | just adjacent beats; `cut:"none"`; `make beatsync` puts it on the beat |
| Passage of time · location change · montage | **Dissolve** | `seam:"dissolve"` / `fade` |
| Punch / launch / hide-then-reveal (matched action) | **Cut on action** | a hard cut placed ON the motion (e.g. at a click's impact frame) |
| Visual continuity — a shape/object carries over | **Match cut** | align the two beats' hero shape + `seam:"fade"`, or a `morph` when a real shape tweens |
| Element is sub-framed / diving into a screen | **Dynamic zoom** | `seam:"cinematicZoom"` / camera push into the artifact |
| Logo / icon / "awe" flourish | **Morph** | reserve it (the article calls it "the most complicated") — logos and one hero moment only |

Rules of thumb from the article, as engine doctrine:
- **Default to the hard cut.** If a transition would overcomplicate the boundary, cut. A film is mostly cuts
  with a few earned transitions, not a transition on every seam (that reads as a template, and the ledger
  flags it).
- **Cut TO the beat.** A hard cut re-times a boundary to the music — this is exactly what `make beatsync`
  automates now that beds have a real beat. On-beat cuts read directed; off-beat ones read sloppy.
- **A transition states a relationship** (time passed, place changed, this-becomes-that). If there is no
  relationship to state, the cut is the honest choice.
- **Master a few.** fade/dissolve · one momentum move (whip/push) · one zoom · a rare morph. Don't spread
  across the whole `SEAM_FX`/`SHADER_FX` menu in one film.

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
