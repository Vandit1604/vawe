---
when: "writing the beat table and choreography for a planned video"
answers: "the before-you-build checks, the storyboard write-up, choreography rules and the value gate"
group: skill
---

# The storyboard: plan on paper before JSON

## Before you build

Six checks before the storyboard, each with the tell that names when it was skipped:

| Item | What a good plan holds | The tell it was skipped |
|---|---|---|
| 1. The angle | One sentence in the viewer's words: what they believe after. | It repeats the product name or lists features. |
| 2. The one object | One thing that stays on screen and changes state across cuts. | Every beat brings an unrelated shot. |
| 3. A real source for every claim | Screens, logos, numbers, colours from a capture, the brand site, the theme, or real data. | A hand-drawn dashboard, an invented stat, default colours. |
| 4. The eye path | Per beat, where the eye goes first and the device that sends it there. | Two things move with equal weight, or no focus. |
| 5. The rhythm | An energy line across the beats (build, breathe, peak); every beat carries its own motion idea; the peak (SPECTACLE) is the highest point, not the only one. | A flat line, every beat at one level, or a beat with no idea of its own. |
| 6. Motion in plain words | Per beat the entrance, hold and exit ([`VOCABULARY.md`](../../../engine-doctrine/CRAFT/VOCABULARY.md)); exits faster than entrances; neighbouring transitions change direction; holds and the background keep moving. | Bare fades everywhere, a frozen hold, a still background, same-direction transitions. |

## Storyboard on paper before JSON

No generator writes this for you. Write the plan as prose first (what happens, beat by beat, in
your own words), and check it against the table above. Then probe it before finishing: draft the
storyboard far enough to claim one or two beats, `make preview` those as HTML fragments, and look.
Only then write the rest of the storyboard: `films/scene/<name>.storyboard.md`, from
[`engine-doctrine/CRAFT/STORYBOARD-TEMPLATE.md`](../../../engine-doctrine/CRAFT/STORYBOARD-TEMPLATE.md)'s
frontmatter and per-beat fields. No scene JSON exists yet: the storyboard is the plan, and
`make assemble` writes `layers` once it is finished. `SPECTACLE` and `NOT` (AGENTS.md stage 1): a
value the human already gave stays verbatim, fill in either only when the human left it unsaid.

> **Film under ~15 seconds? Load [`vawe-continuous-action`](../../vawe-continuous-action/SKILL.md)
> instead of the beat table below.** A short film is ONE continuous action, not a sequence of
> beats: one object is on screen from the first frame and every cut is that object changing state
> (the reference `higgsfield.mp4` presses a generate button and the button becomes the loading
> dot). Planning short films as independent beats is what produces a competent slideshow. That
> skill also gives the measured second-by-second budget and emits the same storyboard shape.

Beat table first (in the reply, not a file): Hook (<=3s, no name-drop if teasing) -> Build ->
Proof (real UI capture / true stat) -> Payoff -> CTA (3-5s). One idea per beat. Budget seconds
per beat to the target duration.

There is ONE module: **scene** (the open canvas, layers/cuts/stings/bg windows/camera;
`films/scene/schema.json` is the contract). No templates. Compose every video from the primitive
vocabulary in `engine-doctrine/PRIMITIVES.md`; the JSON is the video.

**Compose motion from RECIPES, not blank JSON.** Blueprints are retired
([`recipes/README.md`](../../../recipes/README.md) is the live mechanism): `make arsenal Q="…"`
finds a recipe measured off a real film, or a kinetic reveal / count-up / cascade / camera move
directly. Each bakes in real motion so good motion is the default. Authoring plain `rise`+`fade`
from scratch is the #1 failure and `make check GATE=direction-floor` (opt-in: `TASTE=1 make dev-tool X=author-check`)
fails it as a `plain-slideshow`. Reach for a real device per beat, then fill brand content.

## Choreography rules (anti-monotony)

Read `engine-doctrine/MOTION-CRAFT.md` before storyboarding. The stored rulebook: 10 rules (timing
as a voice, ease-out in / accelerate out, hierarchy through offset, one hero motion per beat,
layout-archetype rotation, more), each with its enforcement map, pacing tables and DO/DON'T pairs.
Name each beat's layout archetype so `motion-audit`/`direct` can check the rotation.

- **Choose every CUT by meaning, not habit** (`engine-doctrine/CRAFT/TRANSITIONS.md`). Name the
  relationship between the two beats (continuity · time · contrast · same-object · new act) and the
  feeling across it. A seam serving neither is a hard cut.
  - Most seams are invisible; earn 2-3 accents by meaning: whip = energy into a payoff, iris/sdfIris
    = focus, fade = act break, smash = contrast. Reserve the boldest cut for the hero/payoff, ONE
    cut family per film. The spec table's per-beat row names each cut's *relationship + transition +
    why*.
- **Icons with names**: whenever a company/product/tool is named, show its mark (simple-icons) or a
  Lucide UI icon (`assets/icons/ui/`); text-only lists of named things miss a layer of craft.
- **Background = the site's real surface, used sparingly**: the bg texture must EXIST on the real
  site. A plain/flat site gets a plain field, never invented dots/shapes; a pattern is a SEASONING on
  one or two beats, never the wallpaper. Ask `make arsenal MISTAKES=1 Q="…"` before authoring.

## Every frame fights for its value (the value gate)

The single most common failure: beats that occupy time without earning it. Before locking any beat,
apply the value test ([`engine-doctrine/TASTE.md`](../../../engine-doctrine/TASTE.md), the one law,
with worked examples). If the answer is "nothing" or "a restatement of the headline," reimagine the
beat until it teaches, proves, or delights something no other frame does.

This is an enforcement rule, not a suggestion: the spec table's per-beat row must name the *artifact
that earns the frame*, not just the copy. A beat whose only artifact is a word in a box fails the gate.
