---
name: vawe-creative
description: "FORCE a creative, directed video (not a plain slideshow) when authoring in this repo. Load AFTER vawe-video-planning locks the brief and BEFORE/while writing the scene JSON, whenever the goal is a launch film, promo, or 'make it amazing'. It mandates recipes, kinetic motion, a living background, rich layout, and an impeccable pass, then gates it with the ambition floor."
stage: design
---

# vawe-creative: the anti-slideshow forcing layer

The proven failure (engine-doctrine/MISTAKES.md #143): with the full arsenal in hand, authoring from a blank JSON
regresses to `rise`+`fade` on flat white: a slideshow that passes the correctness gates. Planning owns
*what*; scene-authoring owns *how*; **this skill owns AMBITION**, it forces the video to reach for the
range. Directed lives between two walls: not a slideshow (the ambition floor), not effect-soup (the ceiling).

## The mandates (every one is gate-backed, not suggestions)

1. **Compose from RECIPES, don't hand-roll motion.** `make arsenal Q="…"` finds motion measured off a
   real film (recipes/README.md), or a kinetic reveal / count-up / camera move directly. Apply one per
   storyboard beat, fill brand content. Good motion becomes the default instead of re-derived and
   under-reached.

2. **Kinetic typography, always.** Key lines reveal word-by-word or char-by-char (`split`+`preset`), never
   a flat fade. Numbers COUNT up. `make direction-floor` FAILS `plain-slideshow` if you skip this.

3. **A LIVING background: move the viewer.** Flat static white is the tell. Add a moving backdrop that
   fits the brand (this is a taste call, not a default):
   - **Minimal / technical brand** (black-on-white, austere): a *light* subtle mover, `paperShapes`,
     `paperDots`, or `soft`, as SEASONING on statement beats; keep content beats (cards/terminal/UI shots)
     plain for legibility. Heavy/dark bg (`mesh`/`aurora`) fails contrast on white, the audit blocks it.
   - **Warm / expressive brand**: a richer field, `mesh`, `aurora`, `brandglow`, glassmorphism, floating
     shapes, brand-coloured. (Brew's warm peach glassmorphism is the reference for THIS register, not for
     an austere one: match the brand, don't copy Brew onto everything.)
   Windows it (`bg:[{preset,from,to}]`), and always re-audit contrast. `make direction-floor` warns
   `no-bg-motion` when the field is static.

4. **Camera + transitions.** One slow camera push minimum; a `cinematicZoom` dive-IN on a product/dashboard
   shot (zoom into the real UI, don't show a static card); 1-3 earned seams between beats. Never flat cuts
   for a whole film.

5. **Rich layout: kill the centered slideshow.** Asymmetry over centered; scale contrast (one huge hero +
   one tiny caption, ~5-8×), not three medium lines. Off-center anchors with a compositional reason. See
   engine-doctrine/CRAFT/DIRECTION.md §5 + LAYOUT.md.

6. **Terminals show real OUTPUT.** A CLI beat types the command AND shows what the tool actually prints
   (read the repo's real output, never a placeholder line). `terminalReveal` bakes the type→cursor→output→
   result rhythm.

7. **Hand-written HTML is BUILT through impeccable, never by eye.** For any `html` fragment / hook / CTA:
   load the `impeccable` skill (its `polish`/`audit`/`quieter` register-craft), and run
   `make impeccable D=<fragment.html>` (the bundled detector, local + token-efficient), plus `make designspec-check`
   on the rendered scene. Clear every tell before rendering (overused font, gradient text, card-in-card,
   centered defaults).

## The loop (do not skip a rung)

```
make arsenal Q="…"              # find directed motion → pick one per storyboard beat
… author films/scene/<x>.json (beats + brand content + a living bg + camera + seams) …
                                 # beats/blocks/comps expand into real layers at LOAD, no separate step
make author-check D=<x>.json    # validate · critique · direct(effect-soup ceiling) · FLOOR(slideshow) · slop
make video    D=<x>.json        # render (author-check runs first; NOCHECK=1 to skip during iteration)
make reveal   D=<x>.json        # SEE the entrance motion (mid-frames hide it), is it kinetic, not fading?
make judge    D=<x>.json VS=<brand>   # the gate that SEES, score every frame; a flaw you notice is a FIX
```

## Reach for the full arsenal
Don't stop at kinetic type + a bg. The killer per-frame effects now exist and are DETERMINISTIC, use them:
border-beam / shine (`{type:"beam"}`), aurora / meteor paint fields (`{type:"paint"}`), a one-shot glow
`flash`, an svg logo that draws-on or shape-morphs (the `logoReveal` beat / `{type:"svg","morph":{…}}`), and
calculated camera moves (`"cameraMove":{"move":"diveIn",…}`). Companion skills: **`vawe-effects`** (see the
whole catalog + pick), **`vawe-animation`** (easing feel + `springEase`), **`vawe-camera`** (smooth camera
work). Full list: `make effects` → `engine-doctrine/EFFECTS.md`.

## The bar
Study `films/scene/brew-native.json` (warm, expressive) and `films/scene/preface-launch.json`
(minimal, technical) before authoring: one of them is your register. If your draft would look at home as
a Keynote slide deck, it has failed this skill. Make the viewer feel the motion.
