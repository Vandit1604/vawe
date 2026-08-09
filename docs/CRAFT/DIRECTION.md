# DIRECTION — the spine that turns effects into a directed film

The engine can do almost anything. That is the problem: with every primitive available, an author
reaches for *more* and ships "lots of effects" instead of a directed piece. This file is the missing
spine — **pacing, restraint, and story placement** — stated as principles from the craft's real
literature, each with a checkable translation into a scene JSON. It is the answer to *"why does this
read as amateur when every layer renders fine?"*

Every rule is tagged:
- **`[gated]`** — a gate catches it mechanically (named in the rule). Run `make author-check D=<file>`.
- **`[eye]`** — no static gate can see it; only `make judge` + your own eye. If your eye catches it,
  it is a FIX, never a rationalization ([`../JUDGE.md`](../JUDGE.md), [`../MISTAKES.md`](../MISTAKES.md) #15).

> This is the **Motion** and **Story-spine** doctrine from [`../TASTE.md`](../TASTE.md). The mechanics of
> *which curve / which cut* live in [`../MOTION-CRAFT.md`](../MOTION-CRAFT.md); the copy-paste JSON in
> [`../MOTION-RECIPES.md`](../MOTION-RECIPES.md); the feeling layer in [`TASTE-RULES.md`](TASTE-RULES.md).
> This file is *why* — the principles those apply.

> **The fastest way to obey all of this: compose from [`BLUEPRINTS.md`](BLUEPRINTS.md)** — directed-motion
> beats (`{type:"beat"}`) that bake these rules in, so you start from directed motion instead of a blank
> `rise`+`fade`. **The two-sided guard:** `effect-soup` (in `make direct`) is the ceiling — too much,
> undirected; the **ambition floor** (`make direction-floor`, opt-in via `TASTE=1`) is the floor — too plain,
> a slideshow. A directed video sits between them.

---

## 1. First principles of motion (Disney's 12, only the ones type/graphics obey)

Source: **Thomas & Johnston, _The Illusion of Life: Disney Animation_ (1981)** — the 12 principles;
motion-graphics adaptation from **Austin Shaw, _Design for Motion_ (2020)** and **School of Motion,
"12 Principles for Motion Design."**

| Principle | One line | JSON translation | Tag |
|---|---|---|---|
| **Slow in / slow out** | Nothing starts or stops instantly. | Every position/scale/opacity move eases; entrances decelerate (ease-out), exits accelerate (ease-in). Never `ease:"linear"`. | `[gated]` direct: `linear-motion` |
| **Timing** | Frame count = weight and meaning. | A title (heavy) enters slower (0.5-0.7s) than a caption (0.25-0.4s). Never one global duration. | `[gated]` direct: `monotone-timing` |
| **Spacing** | How distance spreads across frames is the ease's texture. | Prefer overshoot/settle (`snap`, `easeOutBack`, `spring`) over flat ramps for entrances. | `[eye]` |
| **Anticipation** | A small opposite wind-up readies the eye. | Before a hero scale-up, dip ~2-4% (or nudge back ~8px) for ~4 frames. Hero moments only. | `[eye]` |
| **Follow-through / overlap** | Parts don't stop at once; they trail and stagger. | Overshoot-and-settle on arrival (~5-10% past, ease back over 0.15-0.25s). Stagger a group's parts 60-120ms, never one frame. | `[eye]` (stagger partly in `motion-audit`) |
| **Staging** | One clear idea per shot; one focal point. | One headline-scale message per beat; everything else subordinate in size/opacity/motion. | `[eye]` + `[gated]` critique: `scattered-beat` |
| **Secondary action** | A supporting motion that never competes. | At most one quiet secondary motion per beat (bg drift, glow, cursor), lower-contrast, offset in time. | `[eye]` |
| **Exaggeration** | Push the key beat past literal so it reads at a glance. | On the payoff, push scale and hold longer than "correct"; keep the rest restrained so it reads. | `[eye]` |
| **Appeal** | Clear, charismatic, uncluttered. | Committed face, real brand colour, generous negative space, strong scale contrast. Murk/overlap kills it. | `[gated]` `make audit` + slop |

*(Squash-&-stretch, arcs, straight-ahead, solid drawing don't apply to flat type — omitted.)*

## 2. Editing & pacing — rhythm is the direction

Source: **Walter Murch, _In the Blink of an Eye_ (2001)**; edit-rhythm from **Reisz & Millar, _The
Technique of Film Editing_.**

- **The Rule of Six** — a cut serves, in priority: **emotion (51%) · story (23%) · rhythm (10%) ·
  eye-trace (7%) · screen plane (5%) · spatial continuity (4%)**. Emotion dominates; spatial logic is
  nearly worthless. → Cut/transition to serve the feeling and the beat first. When a move and the
  meaning fight, keep the meaning. `[eye]`
- **Cut on motion / the blink** — the eye accepts a cut on a movement or a natural attention-blink. →
  Change beats on an action (a word lands, a count finishes), never in a dead hold. `[eye]`
- **Rhythm variety** — uniform beat lengths deaden. → Alternate short punchy beats (0.8-1.5s) with
  longer breathing beats (2-3s); the payoff is the longest. `[gated]` direct: `pacing`, `monotone-timing`
- **The hold between moves** — motion needs stillness to read; a beat where everything moves is chaos.
  → After a layer settles, hold it still ≥0.4-0.6s before the next move. Every beat has a resting
  state where the copy is fully legible. `[eye]` (+ `make audit` reads legibility)
- **Accelerate toward the climax** — tighten cutting through the build, then release on the payoff. →
  Shorten beats through the middle; the final held frame is the release. `[gated]` direct: `dead-final-frame`

## 3. Restraint — the single biggest amateur-vs-pro tell

Source: **School of Motion; Shaw ("less, but better")**; enforced locally in [`TASTE-RULES.md`](TASTE-RULES.md).

- **One motion idea per beat.** A dolly, OR a colour-wave, OR a stagger — not all three. Stacking them
  is maximalism that reads as a demo reel, not a film. `[gated]` direct: `effect-soup`
- **Effects are seasoning, not wallpaper.** 2-3 earned moments across a film, not a texture on every
  beat. Content/proof beats stay clean so the content reads. `[gated]` direct: `effect-soup`
- **One cut family per film.** Rotate *within* a family (soft/motion/shape/spatial); mixing families
  announces edits. `[gated]` direct: `cut-families` (≥3 = FAIL)
- **Continuity over slideshow.** Something should carry across a cut so the beats connect instead of
  clicking past. A layer spanning the boundary is one way; a match cut, a motif, a held cut rate or an
  unfinished sentence are others, and none of them is a lesser answer ([`FILM-STRUCTURE.md`](FILM-STRUCTURE.md)).
  `[gated]` direct: `continuity` — which sees only the first kind.
- **Paired directional exits.** A layer that enters from a side exits the *opposite* side — one
  continuous direction of travel. Enter-and-retreat (in from right, out to right) is the tell.
  `[gated]` direct: `enter-and-retreat`
- **Blur out when moving would fight the content.** Faces, cards, dense grids leave through focus
  (`out:"defocus"`), not through space; sliding 50 elements is chaos. `[eye]`

## 4. Story placement — the beats, in the right order

Source: **McKee, _Story_ (1997)** (setup/turn/payoff, rising action, tension/release); **Snyder,
_Save the Cat!_** (hook-first, escalation); **Loewenstein, "The Psychology of Curiosity" (1994)** (the
open loop); **Ogilvy, _Ogilvy on Advertising_** (front-load, honesty). The applied spine lives in
[`STORY.md`](STORY.md); these are its sources and laws.

- **Hook → build → payoff.** Every film is setup, escalation, release. Beat 1 poses; the middle
  escalates; the last beat pays off. `[eye]`
- **Open loop / curiosity gap.** An unanswered question holds attention. The hook withholds the
  number/answer; it lands only at the end. `[eye]`
- **Never spoil the payoff.** The most counterintuitive fact/number is the LAST beat; nothing earlier
  states it. `[eye]`
- **Front-load the strong element.** The first ~3s decide whether they stay. First frame ≤ ~12 words,
  strongest word first, ≤1 emoji. `[gated]` validate (hook length) + `[eye]`
- **Build to a shocker.** Order the middle by increasing surprise; the "no way" moment is final. `[eye]`
- **Tension and release.** The payoff gets the longest hold and biggest scale — the release the build
  earned. `[gated]` direct: `dead-final-frame` + `[eye]`
- **Honesty / earned attention.** On-screen copy must be literally true; the hook's promise must be
  paid. Real, accurate numbers only. `[gated]` critique: `unbacked-claim`/`false-claim` + `[eye]`

## 5. The pro-vs-amateur checklist (run this before shipping)

Each is concrete. `[gated]` ones are in `make author-check`; `[eye]` ones are yours + `make judge`.

1. **Nothing moves linearly.** Every visible move has an ease. `[gated]` `linear-motion`
2. **No uniform tempo.** Durations and stagger vary with intent. `[gated]` `monotone-timing`, `pacing`
3. **Overshoot-and-settle in ~0.2-0.3s on entrances.** Flat ease-out reads as a stock template. `[eye]`
4. **One hero + one tiny caption** (scale contrast ~5-8x), not three medium lines. `[eye]`
5. **Hold on the payoff** — the final reveal gets the longest still hold. `[gated]` `dead-final-frame`
6. **Enter and exit in one continuous direction.** `[gated]` `enter-and-retreat`
7. **A resting state exists** — not everything moves at once; the copy is still long enough to read. `[eye]`
8. **Exits accelerate, entrances decelerate.** (The engine bakes this into the clip driver; don't fight it.) `[gated]` `linear-motion`
9. **Blur/defocus out** when sliding would fight faces/cards/grids. `[eye]`
10. **One motion idea per beat** — effects are 2-3 earned moments. `[gated]` `effect-soup`

---

## Sources

- Thomas & Johnston — _The Illusion of Life: Disney Animation_ (1981) — the 12 principles.
- Walter Murch — _In the Blink of an Eye_ (2001) — the Rule of Six, cut-on-motion, emotion-first.
- Austin Shaw — _Design for Motion_ (2020) — the motion-graphics adaptation, type-in-motion.
- Jon Krasner — _Motion Graphic Design: Applied History and Aesthetics_ — negative space, holds.
- School of Motion — "12 Principles for Motion Design" — the practitioner translation.
- Google Material Design — Motion guidelines — asymmetric easing, duration-by-distance.
- Robert McKee — _Story_ (1997) — setup/turn/payoff, rising action, tension & release.
- Blake Snyder — _Save the Cat!_ — hook-first, escalation.
- George Loewenstein — "The Psychology of Curiosity" (1994) — the open loop / curiosity gap.
- David Ogilvy — _Ogilvy on Advertising_ — front-loading the strong element, honesty.

## no-continuous-object (and its inferred twin)

**Read [`FILM-STRUCTURE.md`](FILM-STRUCTURE.md) before you reach for this rule.** It is one device out of
about eighteen that hold a short film together, it is the cheapest of them, and in Murch's own ranking it is
the 4% item, the one he says to sacrifice first. It is also **opt-in**: `TASTE=1 make author-check`, or
`make direction-floor D=<file>`. Run it when the film's CONTENT is continuous, which is a single-subject
product film, a process shown end to end, or a demo where the UI is the subject. On a manifesto, a vignette
anthology, a comparison built on its junctions, or a metric-cut list film it is wrong by construction.

What it measures: one content layer that both spans a cut and CHANGES across it. Pose either side of the
boundary is read with the engine's own pure functions, so a static watermark riding the cut buys nothing. A
layer whose internal clock the gate cannot read is assumed to transform, because a gate must not invent a
failure out of something it cannot see. A layer the engine confines to its own beat is not a candidate at
all (see `beats-wrapped-as-units` below). **Blocks when the gate is run.**

`no-continuous-object-inferred` is the same test where the author declared no cuts at all. An island
boundary is a moment where at least two content layers leave and at least two unrelated ones arrive, and the
layers standing through it do not outnumber either side. It exists because three films authored on one brief
declared zero cuts between them, so the blocking tell evaluated none of them, including a textbook slideshow
(MISTAKES #163). It **warns**, and blocks under `STRICT=1`: failing a build over a boundary the author never
wrote is a bad error to be wrong about, and the threshold that separates the exemplar from the slideshow is a
single integer validated against four films.

**What neither tell can see.** Both measure that a prop survives a junction and moves. Neither can tell a
card that travels from a card that BECOMES the next thing, which is the actual grammar. Two of the A/B films
pass on that technicality. Neither can see a motif, a bookend, a metric cut rate or an unfinished sentence at
all, and a film held by those is properly structured and fails here every time.

A layer the engine confines to its own beat is not a candidate at all: see below.

## beats-wrapped-as-units (always on, in `make beat-check`)

Not a taste rule. `core/produce.js` turns `sceneUnits` on for any cut film with no choreographed `motion`
track, and `formats/scene/scene.js` then rewrites every non-last-beat layer to end with its own beat so the
wrapper can slide the beat out as one block. A layer authored across a cut is **truncated at it**, silently.
`make beat-check` names every layer the wrapping actually shortens and by how much. Mark the one layer that
should carry the film `"acrossBeats": true` and it attaches to the camera instead of its beat, keeping its
authored window. It **warns** (blocks under `STRICT=1`): truncation is a fact about the render, and whether
it is a defect depends on whether you meant the layer to live past the cut.

