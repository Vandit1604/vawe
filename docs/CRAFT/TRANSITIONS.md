---
when: "choosing the CUT between two beats (you can't say why a transition is there)"
answers: "the transition taxonomy (type→meaning) · Murch's Rule of Six · continuity vs montage · the per-seam decision procedure"
group: story
codes: crossfade-mud, cut-families, cut-velocity, dead-final-frame, no-transition, flat-seams
applies-when: hasBoundaries
confirm: "does each cut serve the relationship between its two beats, chosen by theory not habit?"
---

# TRANSITIONS: choosing the seam by theory, not habit

A transition is the **seam between two beats**. Every school of editing agrees on one thing: the seam
is *grammar*, not decoration: it means something, and the meaning must be **chosen**, not defaulted.
The failure this doc exists to kill is picking one effect (a blur, a dissolve) and spraying it on every
cut: that is not "smooth," it is a seam that says nothing, ten times.

[`SELECTION.md`](SELECTION.md) lists intent→effect across every family in one line each; **this is the
deep dive for the cut**: the theory and the decision procedure. Read it when you cannot say *why* a
given transition is there.

> **The inventory (what exists) is `core/transitions.js`, run `make transitions`.** It catalogs all
> ~90 transitions across the four mechanisms (`anim` per-layer · `cut` one root · `sting` overlay ·
> `seam` two-scene), marks the basics, and is derived from the source registries so it can't drift.
> This doc is the *decision* layer; that catalog is the *inventory*. The basic two-scene transitions
> (`seam` fx `slide · push · uncover · wipe · dissolve`, all dir-aware) are the fundamentals every tool
> has, rendered as real blends of both beats. Reach for those before the expressive shaders.
>
> **SEE it before you author it: `make transition-preview FX=<name> [MECH=…] [DIR=…] [TIMING=…]`** renders a
> canned two-beat A→B scene through one transition as a labelled filmstrip (`/tmp/transition-preview.png`).
> The labels are eased progress, so `TIMING=linear` vs `smooth` shows as *where the motion bunches*.
>
> **MEASURE a real one: `make measure VIDEO=… FROM=… TO=…`** reads a transition's actual duration + easing
> from a video and names the **nearest engine preset** (a reference to reproduce, or `EXPECT=<preset>` to
> verify our OWN render matches what we authored). See [MEASURE.md](MEASURE.md).
>
> **Easing is half the feel.** Both a `cut` and a `seam` shape their progress through `timing` (the
> `TIMINGS` curves in core/cuts.js: `smooth`/`out`/`snappy`/`pop`/`rush`/`brake`/`ramp`/`linear`).
> Seams default to `smooth` (ease-in-out): a transition that MOVES content at constant speed reads
> mechanical; ease-in-out gives it velocity (accelerate, then settle). Use `linear` only for a
> deliberately flat sweep. Match the curve to the beat: entrances decelerate, exits/whips accelerate.

## One surface to author them: the unified `transitions`

The four mechanisms are the *machinery*; you rarely pick one by hand. Author a transition through **one
field** and let the engine route it (core/transitions-lower.js), driven by the same catalog:

- **Boundary** (between two beats): a top-level array:
  ```json
  "transitions": [{ "at": 9.7, "fx": "whipPan", "dur": 0.6, "dir": "left", "timing": "snappy" }]
  ```
  `fx` picks the mechanism: seam-only names (`whipPan`/`crossWarp`/`cinematicZoom`) → a two-scene
  **seam**; `whip`/`punch`/`zoom` → a root **cut**; `glitch`/`chromaticSplit` → a **sting** overlay.
  The **ambiguous basics** (`fade`/`slide`/`wipe`/`dissolve`/`push`/`uncover`) resolve to a cheap root
  **cut** by default; add `"mech": "seam"` to upgrade to the real GPU blend of both beats.
- **Layer** entrance/exit: sugar over `anim`/`out`:
  ```json
  { "type": "text", "transition": { "in": "rise", "out": "slide-left", "dir": "left", "dur": 0.4 } }
  ```

This lowers to the raw `cuts`/`stings`/`seams`/`anim` fields at load, so everything above (easing,
direction, the decision procedure) applies unchanged. The raw fields remain the low-level escape hatch;
a raw value you also set on the same layer/beat wins. An `fx` that names nothing, or a layer-only anim
used as a boundary (`pop`), is rejected at validate with the catalog, never silently coerced.

---

## The easy palette: seven transitions that stay varied without thinking

The theory below is the *why*. This is the *menu*: seven transitions that cover almost every launch film,
ordered cheapest-first, each with the one thing it says and a copy-paste snippet. **Vary the seam by
MEANING, not by reaching for a new effect** (that is the amateur tell). A whole film is usually one
primary from this list on ~60-70% of cuts, plus ONE bolder accent reserved for the payoff. Pick the
primary by the film's personality; pick each accent by what that one seam has to say.

| # | Seam | Say it when | Snippet (30fps) |
|---|---|---|---|
| 1 | **Hard cut** | the two beats are one thought (the default, most cuts) | *(no `transitions` entry: place beats back-to-back, overlap ~2-4f so the stage never empties)* |
| 2 | **Directional slide / push** | a NEW place, same energy: carry the eye one way | `{ "at": 5, "fx": "push", "mech": "seam", "dir": "left", "dur": 0.5, "timing": "ramp" }` |
| 3 | **Cross-dissolve** | time passing, or a gentle link between two images | `{ "at": 5, "fx": "fade", "mech": "seam", "dur": 0.5, "timing": "smooth" }` |
| 4 | **Whip pan** | frantic "meanwhile"; hide the cut inside motion blur | `{ "at": 5, "fx": "whipPan", "dir": "left", "dur": 0.45, "timing": "ramp" }` |
| 5 | **Cinematic zoom** | push into a detail, or a calm reveal at the hero beat | `{ "at": 5, "fx": "cinematicZoom", "dur": 0.55, "timing": "ramp" }` |
| 6 | **Squeeze** (a speed ramp you can SEE) | a fast, kinetic pivot: the frame smear-stretches through the cut | `{ "at": 5, "fx": "squeeze", "dir": "left", "dur": 0.4, "timing": "ramp" }` |
| 7 | **Shared-element morph** | the SAME object takes its next role (highest craft) | *(no seam: a persistent layer with a `motion` track that repositions/resizes across the cut, see* The motion-design layer *below)* |

Direction is a real lever for #2, #4 and #6: a beat that entered from the right should leave to the left
(one continuous travel per seam, never enter-and-retreat). Rotate through 1-2-3 for the body and spend
a bolder one ONCE, and a film already feels edited, not sprayed.

### Speed is the anti-repetition lever

**The transition is the verb, the timing is the adverb.** The `fx` says *what* crosses the cut; the
`timing` says *how fast, and with what weight*. A transition with no speed profile reads FLAT, and a film
whose seams all ride the same gentle curve feels repetitive however many effects it uses. So **the motion
seams above carry `timing:"ramp"`, not `"smooth"`** (and a bare motion fx through the `transitions` sugar
now defaults to `ramp`, `core/transitions-lower.js`). `ramp` is the editor's slow-fast-slow speed ramp
(`core/motion.js` `speedRamp`): it eases in, races through the middle, and settles, which is what makes a
whip or a zoom feel *thrown* rather than slid. Vary the VELOCITY across a film, not only the effect. The
speed dial (every curve is a named member of `TIMINGS`, `core/cuts.js`):

| timing | curve | reach for it on |
|---|---|---|
| **ramp** | slow-fast-slow | whips, zooms, squeezes, any thrown/kinetic seam (the default for motion fx) |
| **rush** | accelerate away | an EXIT: the beat leaves faster than it left rest |
| **brake** | decelerate in | an ENTRANCE: the beat arrives slower than it set off |
| **pop** | overshoot then settle | a spring-y arrival with life: a chip, a badge, a UI element landing |
| **spring** | overshoot-and-settle spring | a badge/chip/number LANDING with physical life, a bouncy product reveal |
| **snappy** | decisive, no overshoot | a punchy cut that lands and stops |
| **smooth** | gentle ease-in-out | a calm blend (a cross-dissolve, a fade), where a ramp would fight the mood |
| **linear** | flat, constant speed | a deliberately mechanical sweep; rarely what you want |

`make direct` warns (`flat-seams`) when a film has two or more boundaries and every one rides a gentle
curve with no speed ramp anywhere. It never blocks; it is the nudge to spend one ramp.

### One word for the whole film: `energy`

Naming a `timing` on every cut is how you set velocity per beat. Setting it ONCE for the whole film is
`energy`, a single top-level word. AE motion design gives a piece one velocity personality: a calm brand
film and a hype launch reel do not accelerate the same way. `energy` is that personality, and it fills
the `timing` of every cut and seam that names none.

```json
{ "module": "scene", "energy": "brand", "cuts": [ ... ], "seams": [ ... ] }
```

| energy | the film's default curve | reach for it on |
|---|---|---|
| **calm** | `out` (decelerate in) | premium, editorial, a film with room to breathe |
| **brand** | `ramp` (the house speed ramp) | the default to reach for: directed and confident |
| **hype** | `snappy` (lands and stops) | product drops, announcements, launch-reel energy |
| **tense** | `rush` (accelerate away) | urgency, countdowns, a film that will not sit still |

It is a DEFAULT, never an override: an explicit `timing` on any cut or seam still wins, and it reaches
hand-authored `cuts`/`seams`, not only the `transitions` sugar. A film that names no `energy` is
untouched, so nothing re-times silently. `core/energy.js`.

### Two more seam knobs: `feather` and an angled `dir`

Beyond `timing`, a `mech:"seam"` takes two shape knobs (both optional, both static, so determinism is
unchanged):

- **`feather`** (0..0.2): the softness of the edge on the edge-based seams (`wipe`, `irisRound`,
  `clockWipe`, `barnDoor`, `blindsWipe`, `burnThrough`, `lumaWipe`). A hard edge reads as a slide deck;
  a soft one reads graded, this is the single biggest cheap-vs-premium tell. Omit it for each unit's
  own baked default; set `feather: 0.12` for a soft band, `feather: 0` for a crisp line.
- **`dir` as an angle**: `dir` still takes `left|right|up|down`, but a **number of degrees** (0=right,
  90=up) sweeps a `wipe`/`barnDoor`/`blindsWipe` at any angle, not just the four cardinals.

```json
{ "at": 5, "fx": "wipe", "mech": "seam", "dir": 35, "feather": 0.12, "timing": "ramp" }
```

> **Studied and deliberately not built (yet).** another engine models a transition as an orthogonal
> *presentation* (`{draw, props}`) times a *timing* (`{getProgress, getDurationInFrames}`), and carries a
> physics **spring** whose duration is *measured* from its damping/stiffness, not specified. Its overlap
> model mounts and blends two LIVE scenes; vawe (like another engine' shader-transitions, the same seam
> architecture) blends two BAKED stills. Our named-curve dial above is a nicer author surface than a raw
> ease string, and `pop` already gives a spring-like overshoot. **`spring`** closes the shape gap: it is
> the house damped-harmonic-oscillator easing (`core/motion.js` `easeOutSpring`, the same math behind
> `easeOutSettle`/`easeOutSnap`) fixed at one tasteful bounce/settle rather than exposed as another engine's
> per-call `{damping, stiffness}` API. A genuinely *parameterized* spring, where an author dials the
> bounce and duration per transition, stays out until a film needs an arrival this fixed curve cannot
> fake. Recorded here so the next author inherits the decision, not the re-investigation.

> **Align the beats to the seam, or a `mech:"seam"` transition dissolves nothing.** A seam blends the
> frame just BEFORE `at` against the frame just AFTER. If both beats are still on screen across `at`
> (the outgoing text never left, the incoming text already arrived), the seam crossfades two nearly
> identical stages and the copy MUSHES into an unreadable double. So the outgoing beat must END at `at`
> (let the seam be its exit: `"out": "none", "exitDur": 0`) and the incoming beat must START at `at`.
> No gate catches this (both layers are legitimately present, and a persistent morph element SHOULD
> span the cut); it is an authoring discipline the eye and `make judge` verify.

### Concrete durations at 30fps

Frames, because "0.5s" hides that it is 15 frames. Round to the frame; a seam is felt, not measured.

| Transition | Frames @30fps | Seconds | Note |
|---|---|---|---|
| Match-on-action overlap | 2-5f | 0.06-0.16s | the shared movement carries the eye; the blend is almost nothing |
| Whip pan | 8-12f | 0.27-0.40s | fast AND blurred, or it reads as a slow slide |
| Quick dissolve | 12-15f | 0.40-0.50s | the workhorse soft cut |
| Standard seam (slide/push/dissolve) | 15-30f | 0.50-1.00s | the body-of-the-film default |
| Cinematic zoom | 15-25f | 0.50-0.85s | slower settles calmer |
| Fade to black (act break) | 20-40f | 0.66-1.33s | a real pause; earn it |
| UI hand-off (element to element) | ≤9f | ≤300ms | ease-out; keep interface motion snappy (Emil Kowalski) |

### Station-to-station: the launch-film transition with no cut

The Apple move: instead of cutting between product shots, the camera FLIES through one continuous space,
dwelling on each feature in turn. There is no seam because there is no cut, the flight IS the transition,
and the whole film reads as one world rather than a stack of slides. Reach for it when the beats are
PLACES with a spatial logic (a dashboard, then a panel inside it, then a detail), not unrelated claims.

```json
"cameraMove": { "move": "travel", "stations": [
  { "tx": 960, "ty": 540, "s": 1 },                      // station 0: where the flight begins (wide)
  { "tx": 620, "ty": 400, "s": 1.6, "dur": 1.2, "dwell": 1.0 },   // fly in, hold on feature A
  { "tx": 1300, "ty": 720, "s": 1.8, "dur": 1.0, "dwell": 1.0 }   // glide to feature B, settle
] }
```

`tx`/`ty` are the STAGE point to centre; `s` the zoom; `dur` the flight INTO a station; `dwell` the hold
once there. Station 0 is the start, so it has no `dur`. Interiors run linear on purpose (an eased curve
at each stop would zero velocity and break one flight into N hops, MISTAKES #125). This is a
`choreographed`-adjacent scene: it carries no per-beat `cuts`, so it never triggers scene-unit swaps.

---

## The prime rule

> **A transition must serve the RELATIONSHIP between the two beats AND the FEELING across the seam.
> If it serves neither, it is a hard cut.**

The hard cut is the default and the overwhelming majority of professional edits. You *earn* anything
more by naming what it does. "It looks smoother" is not a reason, it is the blur-spam tell.

> **You crossfade everything. Use hard cuts for disruption and register shifts.** Borrowed verbatim from
> the reference system's `another engine-creative/references/motion-principles.md`, which also states what
> each seam MEANS in three lines: *"Crossfade = this continues. Hard cut = wake up / disruption. Slow
> dissolve = drift with me."* That is the taxonomy below in three words, and it names the exact wrong
> move: reaching for the soft one because it is soft.

---

## Emotion first: Walter Murch's Rule of Six

Murch (*In the Blink of an Eye*) ranks what a cut must serve, by weight:

| # | Criterion | Weight | What it asks |
|---|---|---|---|
| 1 | **Emotion** | **51%** | Does the cut serve what the audience should FEEL? |
| 2 | Story | 23% | Does it advance the narrative? |
| 3 | Rhythm | 10% | Is it the right moment "musically"? |
| 4 | Eye-trace | 7% | Does it respect where the viewer is already looking? |
| 5 | 2D plane / screen direction | 5% | Does it honor the 180° axis? |
| 6 | 3D spatial continuity | 4% | Is the physical space consistent? |

**Emotion outranks the other five combined.** The surrender order: never give up emotion for story,
story for rhythm, rhythm for eye-trace, eye-trace for planarity, planarity for spatial continuity. A
cut that breaks screen-direction but nails the feeling is **correct**. Naive systems optimize the
bottom 9% (geometry) and ignore the top 51% (feeling), do the opposite.

**"Cut where the audience would blink."** A blink marks the completion of a thought; it is a mental
cut. The true edit point is a *cognitive/emotional boundary*, not a visual one. In our terms: cut on
the beat's completed idea, not mid-thought (this is why a typed line must finish before the seam, and
why a beat must land before it leaves).

---

## Invisible or expressive: the routing question

Two opposed schools, and which one you are in decides everything:

- **Continuity (Hollywood):** the cut should be **invisible**. Match-on-action, motivated cuts, the
  transition vanishes so the story flows. Reach for a hard cut, a match cut, a J/L cut, a shared-element
  morph. *Most seams live here.*
- **Montage (Eisenstein):** the cut should be **shown**, because meaning is created in the *collision*
  (the Kuleshov effect: the same face reads as hunger, grief, or love by what it's cut against). Reach
  for a dissolve, a graphic match, a smash cut, the seam is the argument.

Ask: should this seam **disappear** (serve the flow) or **speak** (create a meaning the two beats don't
hold alone)? That single question routes the whole choice.

---

## The transition taxonomy: type · meaning · when · our vocabulary

Each transition SIGNIFIES something. Reach for it when you want to say that thing, and map it to what
the engine actually does (a layer `cut`/`out`, a sting overlay, a Seam D two-scene composite, a
`motion` travel track, or audio timing).

| Transition | Signifies / feeling | Reach for it when | In this engine |
|---|---|---|---|
| **Hard cut** | nothing: invisible, respects momentum | the default; two beats are one continuous thought | back-to-back beats, overlap so no dip (MISTAKES #120) |
| **Cross-dissolve** | passage of time · a connection · gentleness | link two images, soften, show time passing | soft `cut`/`out` (`fade`/`blur`), or Seam D `crossWarp` |
| **Fade to black** | a beginning or an ending · an act break · closure | open/close the film or a major section | `fade` to `bg`, held; Seam D `flashWhite` (to white = dreamlike) |
| **Wipe** | playful · deliberate · artificial (shows the seam) | an energetic location/time change | cut `wipe`; sting `wipe`/`doors`/`blinds` |
| **Iris** | focus · vintage · isolate a subject | spotlight one thing, a storybook wink | cut `iris`; sting `sdfIris`; Seam D `sdfIris` (masked reveal) |
| **Match cut (graphic)** | "these two things are the same" · a rhyme | bridge scenes by a visual/compositional rhyme | author it: same framing/shape across a hard cut |
| **Match cut (on action)** | seamless · energy carried through | cut on a movement so the eye rides it past the seam | a `motion` track that continues across the cut |
| **Match cut (conceptual)** | wit · a thematic argument | a word/idea in A pays off in B | author copy + timing across a hard cut |
| **Smash cut** | shock · jolt · comedy or terror | end on maximum tonal contrast; wake from a dream | hard cut + a hard content/bg contrast (+ optional `flash`) |
| **Whip pan** | frantic energy · momentum · "meanwhile" | a kinetic change; hide the cut in motion blur | sting `whipPan`; Seam D `whipPan` (smears BOTH beats) |
| **J-cut** (audio leads) | anticipation: pulls the viewer forward | lead into what's coming; make it feel inevitable | start the next beat's audio cue / bed BEFORE its visual |
| **L-cut** (audio lingers) | continuity · a held emotion | hold a tone/voice while the image moves on | let a cue / VO / bed run OVER the next beat's entrance |
| **Invisible / hidden cut** | immersion · unbroken flow | fake a one-take; hide the seam entirely | cover the cut with a full-bleed element or a whip at peak |
| **Camera travel** | one world · the beats are PLACES, not claims | the content has a spatial logic worth walking | `cameraMove:{move:"travel", stations:[…]}`. The transition IS the flight, and there is no cut |
| **Morph / shared-element** | magic · same identity across states | a thing becomes its next role (the highest-craft cut) | a persistent layer with a `motion` track that repositions/resizes |
| **Jump cut** | disjunction · urgency · restlessness | compress time; deliberately call attention | a hard cut within the same framing (use sparingly) |
| **Ripple dissolve** | dreamlike time displacement | present → flashback (reads dated) | sting `ripple` over a dissolve |

---

## The decision procedure: the algorithm to run at every seam

This is the thought process. Run it in order; stop when the transition is chosen.

1. **Does this seam need to exist at all?** If the two beats flow as one thought, use the invisible
   default (hard cut / match-on-action / shared-element morph). *Most seams stop here.*
2. **What must the viewer FEEL across it?** (Murch 51%.) The feeling picks the family before any
   mechanic: continuity→cut · time/gentleness→dissolve · closure→fade · shock→smash · anticipation→J-cut
   · lingering→L-cut.
3. **Invisible or expressive?** Continuity → hide the seam. Meaning-by-juxtaposition → show it.
4. **What is the RELATIONSHIP between the two beats?** same object new state → shared-element morph ·
   same action → match-on-action · visual/thematic rhyme → match cut · time → dissolve · act boundary →
   fade · tonal opposition → smash · new place with energy → whip/wipe.
5. **What does the SEAM itself mean?** A change in *time, place, or perspective* justifies a visible
   transition. Nothing to signify → cut (the editor's default rule).
6. **Lead or linger with sound?** Pull forward → J-cut (audio early). Hold the departing emotion →
   L-cut (audio over). This is where "smooth" actually comes from in pro work.
7. **Eye-trace + velocity.** Cut where the eye already is; preserve direction and speed across the seam
   (velocity-matched: exit accelerating, enter decelerating through a shared blur).
8. **Rhythm.** Set beat durations for tension: accelerate into a climax, then HOLD the payoff. Cut on
   the music beat when there's a bed (`make beatmap`).
9. **Restraint check.** Is this the ONE primary (60-70% of cuts) or one of 2-3 earned accents? One cut
   family. If every seam is flashy, revert to the invisible default.

The meta-rule again: if a seam can't answer (1)-(5) with a real relationship or feeling, it is a **hard
cut**. That is the rule that stops effect-spam in both directions, monotone AND soup.

---

## Restraint: the invisible cut dominates

- **Straight cuts are the meat; dissolves/fades/wipes are seasoning.** You can cut an entire film with
  nothing but hard cuts. A different showy transition every seam is the amateur tell, "flashy
  transitions carry a weak narrative."
- **One primary + sparse accents.** Pick one transition for ~60-70% of cuts; reserve your boldest
  accent for the hero/payoff; make the outro the simplest. (This is the fix for blur-on-everything: the
  blur wasn't wrong as a *primary*: it was wrong as the *only* thing, with no earned accents.)
- **Only transition on purpose**: to mark a change in time, place, or perspective. Otherwise it is
  noisy decoration.

---

## The motion-design layer (UI / kinetic transitions)

Same grammar, applied to elements not shots:

- **Shared-element / container transform = match-on-action.** Morph one element into its next role so
  the two read as the SAME object (a headline shrinks into a label; a card slides to its next mark). In
  this engine that is a persistent layer + a `motion` track, the highest-craft continuity we have.
- **Easing by role** (Emil Kowalski): entering/exiting → `ease-out` · moving/morphing → `ease-in-out` ·
  hover/colour → `ease` · constant → `linear`. Springs for interruptible motion (they preserve velocity
  across the "cut"). Keep UI transitions under ~300ms.
- **Diegetic beats non-diegetic.** Motion that emerges from a real trigger (a whip, a touch point, a
  shared element) reads as honest and continuous; a generic fade imposed on top reads as stock. Prefer
  the transition that arises from the content.
- **Choreography** (Material): one focal point, share only the most important element across the seam,
  one directional path, stagger secondary entrances ~60ms, never fire a group simultaneously.

---

## What the gate enforces (`make direct` + `make critique`)

Doctrine carries the taste; the gates backstop the source-decidable subset:

- **one cut family** per film; ≥3 families = FAIL (`make direct`).
- **the earned seam**: `make direct` suggests ONE two-scene seam at the payoff boundary (the transition
  into the longest-held beat), matched to the brand personality (punchy → whipPan, calm → cinematicZoom),
  and applies it on `WRITE=1`. Everything else stays an invisible cut. This is the restraint rule made
  operational: straight cuts are the meat, the seam is the one seasoning reserved for the hero.
- **no transition-dip**: the stage never goes empty between beats; the transition IS the exit
  (`make critique`, rule `transition-dip`, MISTAKES #120).
- **no typing/reveal cut off**: a time-based reveal completes before its seam (`make critique`,
  `typing-cutoff`, MISTAKES #119).
- **restraint**: a primary used on ~all cuts (monotone) or accents with no earned reason are judgment
  calls the planning skill and `make judge` review; the vision judge scores whether each seam reads.

**Sources:** StudioBinder (transition types · Murch's Rule of Six · match cuts · Soviet montage);
Adobe / MasterClass (J/L cuts · continuity editing); Eisenstein / Kuleshov (montage); Murch, *In the
Blink of an Eye* (Rule of Six, the blink); Fiveable / Avid (rhythm & pacing); Material Design &
Apple HIG (motion choreography, shared-element); Thomas & Johnston, *The Illusion of Life* (12
principles); Emil Kowalski, animations.dev (easing/spring).
