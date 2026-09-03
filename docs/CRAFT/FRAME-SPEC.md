---
when: starting a video, lock the contract BEFORE the JSON
answers: "the per-video design-system spec + scene-by-scene storyboard (Reproduce/Adapt · persuasion · emotion) · the anti-front-load reveal model · seam QA. Fill-in template: `STORYBOARD-TEMPLATE.md` (gate: `make storyboard-check`)."
group: look
---

# FRAME-SPEC: the per-video contract (design system + storyboard) authored BEFORE the JSON

The another engine lesson: a great video is not authored frame-first. Two artifacts are locked first and every
frame then *obeys them line by line*: a **design-system spec** (their `frame.md`) and a **scene-by-scene
storyboard** (their `STORYBOARD.md`) where each beat names its blueprint, its mechanism, its persuasion, and
its emotion. Our engine already has the pieces (themes, blueprints, EFFECTS.md, the direction-floor); this
doc is the contract that ties them into a front-door you fill before writing a single layer.

> This complements [`vawe-video-planning`](../../skills/vawe-video-planning/SKILL.md) (the lock-sheet)
> and [`DIRECTION.md`](DIRECTION.md) (pacing/restraint). Lock BOTH artifacts below and get sign-off before authoring.

## Part 1: The design-system spec (our `frame.md`)

One page, authored from the brand study (`make brandspec` + `make palette`). It is normative: the storyboard
and every layer use ONLY these values. Fill the design-spec table in [SURFACES.md](SURFACES.md#the-design-spec)
plus these video-scale rules another engine proved:

- **Colour ROLES, not hexes.** Ground / text / text-muted / **one scarce accent** / positive / negative.
  The accent is *voltage*: eyebrows, numerals, one rule per frame, the CTA, **no frame lets it dominate by
  area.** (Their line: "the absent shadow is the premium signal.") Encode it in `themes/<brand>.json`.
- **Type by role, in fixed faces.** Display / body / **mono for every numeral** ("a dollar figure in
  anything but mono is a bug"). Author at the MEASURED weights from `make brandspec`, never a default 800.
- **A negative list.** Name what this video will NOT do: no nav/footer/cursor chrome, no AI gradients/bokeh/
  glow washes, no second accent. Banned easings by name: no `back`/`bounce`/`elastic` unless the brand IS toy.
- **A pre-render self-audit** (squint / silence / restraint / reference), copy the one in `frame.md`'s spirit.

## Part 2: The storyboard (our `STORYBOARD.md`), one block per beat

Author this as a table/list BEFORE the JSON. Every field maps to our vocabulary:

| Storyboard field | Our vocabulary | Why it matters |
|---|---|---|
| **arc** | the beat order (hook → build → proof → payoff → CTA) | outcome-first beats product-first; decide it here, cheaply |
| **blueprint** + **Reproduce/Adapt** | a `{type:"beat"}` from the BEATS registry (`make blueprints`) | state the SIGNATURE to keep and the ONE thing you change |
| **onscreen** (cues in order) | the layer `text`/`count` reveals, timed | each cue is its own reveal window (Part 3) |
| **mechanism** (per sub-scene) | a named effect from [EFFECTS.md](../EFFECTS.md) | pick the move, don't re-derive it (`svg` draw, `diveIn`, count-up, stat-bars) |
| **persuasion** | the rhetorical job (negative contrast / category naming / risk reversal) | a beat with no persuasion is decoration |
| **beat** (emotion) | curiosity / recognition / trust / urgency | the felt arc, not just the informational one |
| **transition_in** | a `cut`/`seam`/`sting` | how this beat arrives (and it IS the prior beat's exit) |
| **held vs developing** | duration + whether the camera/reveals keep moving | allocate held reads (Part 4) |

**Reproduce vs Adapt** is the key discipline: for each beat, name the blueprint's spine you keep ("keep the
push-THROUGH signature") and the single thing you change for this brand ("it lands inside the chart's gap").
That is how you stay directed without re-deriving motion or copying a template.

## Part 3 (The reveal model (anti-front-load)) now gated

> **Every scene has three phases: build · breathe · resolve. You dump everything in the build and leave
> nothing for breathe or resolve.** Borrowed verbatim from the reference system's
> `another engine-creative/references/motion-principles.md`. Their split: **build 0-30%** (elements enter,
> staggered, not all at once) · **breathe 30-70%** (content visible, alive with ONE ambient motion) ·
> **resolve 70-100%** (exit or a decisive end, faster than the entrance). Our `front-loaded` gate fires on
> exactly the first half of that sentence.

A directed video weights its cues **across its length**; the two failure modes, banned by name:
- **slideshow**: everything dumped in the first ~25%, then frozen.
- **screensaver**: elements floating independently to fake life during a hold.

Rule: **each on-screen cue is its own reveal window**, weighted into the back ~50% of a beat. At a beat's
t=0 only its first cue is present; later cues enter on their own beats. Aliveness during a hold is *subtle
jitter only*, not drift, not breathing.

`make author-check` now enforces the floor of this: **`front-loaded`** fires when nearly all reveals land in
the first 30% and the back half is frozen; **`motion-monotony`** fires when every kinetic line uses the same
preset ("no two beats move alike"). Reach past both.

## Part 4: Editing & rhythm (the film, not the frame)

- **Held reads vs developing frames.** Designate 1-2 frames that settle to a dead-still lockup (the release);
  the rest develop across their full duration. A film that never holds never lands.
- **Vary the cut rhythm.** Set your fastest-cut beat *by contrast* with a slow one beside it.
- **Bookend.** Let the payoff call back the hook (their F7 ROI echoes F1's diverging bands). Cohesion reads
  as intent.
- **No two beats move alike.** Aim for a distinct blueprint/mechanism per beat across the film.

## Part 5: QA the SEAMS, not the centers

The highest-value render bugs (a black flash, a morph that reads as a collision) hide inside the transition
overlap, where every center-sampling gate steps over them. After rendering, run **`make seam-check D=<file>`**:
it pulls the frames straddling every transition out of the mp4 and flags a luminance flash, and writes
`/tmp/seams/<name>.png` for the eye. Sample the seams, always.

---

**The loop:** lock Part 1 + Part 2 (get sign-off) → author the JSON from blueprints obeying the spec →
`make author-check` (floor now checks front-load + monotony) → render → `make seam-check` + `make judge`.
Full authoring narrative: [AUTHORING-WALKTHROUGH.md](AUTHORING-WALKTHROUGH.md). Bespoke frames: [AUTHOR-THE-FRAME.md](AUTHOR-THE-FRAME.md).
