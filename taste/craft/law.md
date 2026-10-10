# The one law: how to make something good in this engine

Read `taste/build/DIGEST.md` first. This page names the law, routes you to the guides, and lists the
tests a beat must pass. Every rule has its own file in `taste/rules/`; the index is `taste/README.md`.
Without an index an agent authors from its own priors, and priors regress to the mean.

> **The one law:** every frame must fight for its value. If you cut a beat and the viewer loses
> nothing, it was slop. A frame earns its place by showing something true (a real artifact, a live
> demo, a proof), not by saying it (a word in a box). Produced, not generated.

**Competent is not the same as directed.** The same tool with the same primitives and the same
defaults makes the same film. The fix is always the same shape: reach for a family fewer films
already use. [after-effects-techniques.md](after-effects-techniques.md) names real procedures to reach for.

The numbers behind the spines, one rule per file: [the index](../README.md).

## The spines

| Spine | The question | Load |
|---|---|---|
| House style | How should it look? Face, palette, shape, imagery | [typography](typography.md), [color](color.md), [layout](layout.md), [imagery](imagery.md) |
| Composition | How do I fill a frame so it reads produced? | [density](density.md) (hero, support, metadata) |
| Motion | How should it move? | [motion-craft](motion-craft.md), `core/motion/README.md` (numbers) |
| Direction | Why does it read amateur when every layer renders fine? | [direction](direction.md) (pacing, restraint, story placement, each rule sourced) |
| Film structure | What holds this film together across its cuts? | [film-structure](film-structure.md) |
| Story | Why these beats, in this order? | [story](story.md) (hook, suspense, payoff; never spoil) |

Never made a film from a blank page? Follow the loop in `AGENTS.md`.

Every design decision must trace to the brand's real site, not to your defaults. Take colours from
the real pixels, judge dominance by looking, and copy the brand's own words. Two brands differ because
their sites differ, not because a preset changed. A brand's remembered taste can live in
`assets/brands/<brand>/house-style.md` (dominance, faces, palette, motion, shape, signature details,
NEVERs). Read it first when one exists, for example `assets/brands/argus/house-style.md`. The facts
for films about vawe itself are in `taste/brand/vawe.md`.

## The value tests

Check every beat against these before you lock it.

- **Show the real artifact, never a placeholder label.** The word "scene", "rendered" or "output" in a
  box proves nothing. Render an actual mini-scene so the viewer watches the thing work. "Show a scene
  getting bigger" means a composed scene scales up, not the string `scene`.
- **Never claim on screen what the video does not show on screen.** If the copy says "22 shader
  stings", those effects must appear in the same breath. An unbacked claim is worse than no claim.
  Cut the number or demonstrate it.
- **Demonstrate flexibility by doing it live.** "Any colour" is dead as text: cycle the real word
  through colours. "Any theme" means morphing a real card through themes. The proof is the motion.
- **A live demo beats a static list.** A grid of numbers, a checklist or a row of feature pills reads
  as a spec sheet. Animate the concept: a value changes and the output updates.
- **Legibility of effects.** Never use an effect the viewer cannot perceive at its real size and
  duration (thin blinds slats in 0.4 s). If it does not read, it is not a feature.
- **Anchor every element with intent.** Off-centre or floating content needs a compositional reason
  (asymmetry, a split, an artifact it points to). Random off-centre reads as a mistake.
- **Real product beats abstract metaphor.** To say "it reads a site", show a recognisable rebuilt
  result forming from the input, not a token list.
- **A click must have a consequence.** If a cursor clicks a button, the next frames show what the
  click did. A click with no visible outcome is a dead beat.

A storyboard row names the artifact that earns the frame, not just the copy. A beat whose only
artifact is a word in a box fails.

## Anti-slop defaults to reach past

Asymmetry over centred. Scale contrast (one huge hero, tiny caption). A committed non-generic face
(the real brand font). Real assets over emoji. Colour only from the brand. Patterns as seasoning,
never wallpaper. No em dash on screen. The full ban list with the thing to do instead is
[no-tells](../rules/no-tells.md). Skills `skills/vawe-page` (write) and `skills/vawe-critique`
(look) apply these in the loop.
