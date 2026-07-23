# TRANSITIONS — choosing the seam by theory, not habit

A transition is the **seam between two beats**. Every school of editing agrees on one thing: the seam
is *grammar*, not decoration — it means something, and the meaning must be **chosen**, not defaulted.
The failure this doc exists to kill is picking one effect (a blur, a dissolve) and spraying it on every
cut: that is not "smooth," it is a seam that says nothing, ten times.

[`SELECTION.md`](SELECTION.md) lists intent→effect across every family in one line each; **this is the
deep dive for the cut** — the theory and the decision procedure. Read it when you cannot say *why* a
given transition is there.

> **The inventory (what exists) is `core/transitions.js` — run `make transitions`.** It catalogs all
> ~90 transitions across the four mechanisms (`anim` per-layer · `cut` one root · `sting` overlay ·
> `seam` two-scene), marks the basics, and is derived from the source registries so it can't drift.
> This doc is the *decision* layer; that catalog is the *inventory*. The basic two-scene transitions
> (`seam` fx `slide · push · uncover · wipe · dissolve`, all dir-aware) are the fundamentals every tool
> has, rendered as real blends of both beats — reach for those before the expressive shaders.
>
> **SEE it before you author it: `make transition-preview FX=<name> [MECH=…] [DIR=…] [TIMING=…]`** renders a
> canned two-beat A→B scene through one transition as a labelled filmstrip (`/tmp/transition-preview.png`).
> The labels are eased progress, so `TIMING=linear` vs `smooth` shows as *where the motion bunches*.
>
> **Easing is half the feel.** Both a `cut` and a `seam` shape their progress through `timing` (the
> `TIMINGS` curves in core/cuts.js: `smooth`/`out`/`snappy`/`pop`/`rush`/`brake`/`ramp`/`linear`).
> Seams default to `smooth` (ease-in-out) — a transition that MOVES content at constant speed reads
> mechanical; ease-in-out gives it velocity (accelerate, then settle). Use `linear` only for a
> deliberately flat sweep. Match the curve to the beat: entrances decelerate, exits/whips accelerate.

---

## The prime rule

> **A transition must serve the RELATIONSHIP between the two beats AND the FEELING across the seam.
> If it serves neither, it is a hard cut.**

The hard cut is the default and the overwhelming majority of professional edits. You *earn* anything
more by naming what it does. "It looks smoother" is not a reason — it is the blur-spam tell.

---

## Emotion first — Walter Murch's Rule of Six

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
bottom 9% (geometry) and ignore the top 51% (feeling) — do the opposite.

**"Cut where the audience would blink."** A blink marks the completion of a thought; it is a mental
cut. The true edit point is a *cognitive/emotional boundary*, not a visual one. In our terms: cut on
the beat's completed idea, not mid-thought (this is why a typed line must finish before the seam, and
why a beat must land before it leaves).

---

## Invisible or expressive — the routing question

Two opposed schools, and which one you are in decides everything:

- **Continuity (Hollywood):** the cut should be **invisible**. Match-on-action, motivated cuts, the
  transition vanishes so the story flows. Reach for a hard cut, a match cut, a J/L cut, a shared-element
  morph. *Most seams live here.*
- **Montage (Eisenstein):** the cut should be **shown**, because meaning is created in the *collision*
  (the Kuleshov effect: the same face reads as hunger, grief, or love by what it's cut against). Reach
  for a dissolve, a graphic match, a smash cut — the seam is the argument.

Ask: should this seam **disappear** (serve the flow) or **speak** (create a meaning the two beats don't
hold alone)? That single question routes the whole choice.

---

## The transition taxonomy — type · meaning · when · our vocabulary

Each transition SIGNIFIES something. Reach for it when you want to say that thing, and map it to what
the engine actually does (a layer `cut`/`out`, a sting overlay, a Seam D two-scene composite, a
`motion` travel track, or audio timing).

| Transition | Signifies / feeling | Reach for it when | In this engine |
|---|---|---|---|
| **Hard cut** | nothing — invisible, respects momentum | the default; two beats are one continuous thought | back-to-back beats, overlap so no dip (MISTAKES #120) |
| **Cross-dissolve** | passage of time · a connection · gentleness | link two images, soften, show time passing | soft `cut`/`out` (`fade`/`blur`), or Seam D `crossWarp` |
| **Fade to black** | a beginning or an ending · an act break · closure | open/close the film or a major section | `fade` to `bg`, held; Seam D `flashWhite` (to white = dreamlike) |
| **Wipe** | playful · deliberate · artificial (shows the seam) | an energetic location/time change | cut `wipe`; sting `wipe`/`doors`/`blinds` |
| **Iris** | focus · vintage · isolate a subject | spotlight one thing, a storybook wink | cut `iris`; sting `sdfIris`; Seam D `sdfIris` (masked reveal) |
| **Match cut (graphic)** | "these two things are the same" · a rhyme | bridge scenes by a visual/compositional rhyme | author it: same framing/shape across a hard cut |
| **Match cut (on action)** | seamless · energy carried through | cut on a movement so the eye rides it past the seam | a `motion` track that continues across the cut |
| **Match cut (conceptual)** | wit · a thematic argument | a word/idea in A pays off in B | author copy + timing across a hard cut |
| **Smash cut** | shock · jolt · comedy or terror | end on maximum tonal contrast; wake from a dream | hard cut + a hard content/bg contrast (+ optional `flash`) |
| **Whip pan** | frantic energy · momentum · "meanwhile" | a kinetic change; hide the cut in motion blur | sting `whipPan`; Seam D `whipPan` (smears BOTH beats) |
| **J-cut** (audio leads) | anticipation — pulls the viewer forward | lead into what's coming; make it feel inevitable | start the next beat's audio cue / bed BEFORE its visual |
| **L-cut** (audio lingers) | continuity · a held emotion | hold a tone/voice while the image moves on | let a cue / VO / bed run OVER the next beat's entrance |
| **Invisible / hidden cut** | immersion · unbroken flow | fake a one-take; hide the seam entirely | cover the cut with a full-bleed element or a whip at peak |
| **Morph / shared-element** | magic · same identity across states | a thing becomes its next role (the highest-craft cut) | a persistent layer with a `motion` track that repositions/resizes |
| **Jump cut** | disjunction · urgency · restlessness | compress time; deliberately call attention | a hard cut within the same framing (use sparingly) |
| **Ripple dissolve** | dreamlike time displacement | present → flashback (reads dated) | sting `ripple` over a dissolve |

---

## The decision procedure — the algorithm to run at every seam

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
cut**. That is the rule that stops effect-spam in both directions — monotone AND soup.

---

## Restraint — the invisible cut dominates

- **Straight cuts are the meat; dissolves/fades/wipes are seasoning.** You can cut an entire film with
  nothing but hard cuts. A different showy transition every seam is the amateur tell — "flashy
  transitions carry a weak narrative."
- **One primary + sparse accents.** Pick one transition for ~60-70% of cuts; reserve your boldest
  accent for the hero/payoff; make the outro the simplest. (This is the fix for blur-on-everything: the
  blur wasn't wrong as a *primary* — it was wrong as the *only* thing, with no earned accents.)
- **Only transition on purpose** — to mark a change in time, place, or perspective. Otherwise it is
  noisy decoration.

---

## The motion-design layer (UI / kinetic transitions)

Same grammar, applied to elements not shots:

- **Shared-element / container transform = match-on-action.** Morph one element into its next role so
  the two read as the SAME object (a headline shrinks into a label; a card slides to its next mark). In
  this engine that is a persistent layer + a `motion` track — the highest-craft continuity we have.
- **Easing by role** (Emil Kowalski): entering/exiting → `ease-out` · moving/morphing → `ease-in-out` ·
  hover/colour → `ease` · constant → `linear`. Springs for interruptible motion (they preserve velocity
  across the "cut"). Keep UI transitions under ~300ms.
- **Diegetic beats non-diegetic.** Motion that emerges from a real trigger (a whip, a touch point, a
  shared element) reads as honest and continuous; a generic fade imposed on top reads as stock. Prefer
  the transition that arises from the content.
- **Choreography** (Material): one focal point, share only the most important element across the seam,
  one directional path, stagger secondary entrances ~60ms — never fire a group simultaneously.

---

## What the gate enforces (`make direct` + `make critique`)

Doctrine carries the taste; the gates backstop the source-decidable subset:

- **one cut family** per film; ≥3 families = FAIL (`make direct`).
- **the earned seam** — `make direct` suggests ONE two-scene seam at the payoff boundary (the transition
  into the longest-held beat), matched to the brand personality (punchy → whipPan, calm → cinematicZoom),
  and applies it on `WRITE=1`. Everything else stays an invisible cut. This is the restraint rule made
  operational: straight cuts are the meat, the seam is the one seasoning reserved for the hero.
- **no transition-dip** — the stage never goes empty between beats; the transition IS the exit
  (`make critique`, rule `transition-dip`, MISTAKES #120).
- **no typing/reveal cut off** — a time-based reveal completes before its seam (`make critique`,
  `typing-cutoff`, MISTAKES #119).
- **restraint** — a primary used on ~all cuts (monotone) or accents with no earned reason are judgment
  calls the planning skill and `make judge` review; the vision judge scores whether each seam reads.

**Sources:** StudioBinder (transition types · Murch's Rule of Six · match cuts · Soviet montage);
Adobe / MasterClass (J/L cuts · continuity editing); Eisenstein / Kuleshov (montage); Murch, *In the
Blink of an Eye* (Rule of Six, the blink); Fiveable / Avid (rhythm & pacing); Material Design &
Apple HIG (motion choreography, shared-element); Thomas & Johnston, *The Illusion of Life* (12
principles); Emil Kowalski, animations.dev (easing/spring).
