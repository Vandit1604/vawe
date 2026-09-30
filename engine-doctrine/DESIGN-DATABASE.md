---
when: a beat has a role and you need numbers for its motion, transition, cursor, zoom or focus treatment
answers: "the motion numbers a page can copy: durations, easing curves, transitions, microinteractions, cursor and zoom timing, focus techniques, and a variety checklist"
group: reference
---

# Design database: motion and style numbers

Sources: Saffer Microinteractions, Material 3, Emil Kowalski (animations.dev), motion.dev, Fitts's
law (IxDF), NN/g, StudioBinder. Beat order and pacing live in `engine-doctrine/CRAFT/STORY.md`.
Layout archetypes live in `engine-doctrine/CRAFT/LAYOUT.md`, colour method in `engine-doctrine/CRAFT/COLOR.md`.

## 1. Motion: the 12 principles, applied

| Principle | Apply as | Number |
|---|---|---|
| Anticipation | a tiny counter-move before the main move | scale 0.96 or -8 px over 60-120 ms |
| Ease in/out | never linear except continuous loops | see section 2 |
| Follow-through | pass the target, then settle | use a spring, not a bounce curve |
| Secondary action | background parallax or a glow pulse under the lead | subtle, never steals focus |
| Staging | one focal action per beat | dim or blur the rest |
| Arcs | curved travel, not straight | offset x/y timing or a slight rotation |
| Squash and stretch | 2-5% only | more reads as playful |

**Durations:** micro 150-200 ms, element enter 300-400 ms, full-screen transition 375-500 ms,
exit about 0.7x the enter. **Stagger** 40-80 ms per item, cascade capped near 300 ms. **Hold**
about 0.3 s per word for UI copy (for on-screen prose use `words x 0.6 s`, see `RULES/readable-hold.md`).
Never exit type before it is read.

## 2. Easing curves (Material 3, drop-in `cubic-bezier`)

| Name | Curve | Use |
|---|---|---|
| Emphasized | `cubic-bezier(.2,0,0,1)` | default hero move |
| Emphasized decelerate | `cubic-bezier(.05,.7,.1,1)` | enters |
| Emphasized accelerate | `cubic-bezier(.3,0,.8,.15)` | exits |
| Expo-out | `cubic-bezier(.16,1,.3,1)` | premium snap |
| Back-in | `cubic-bezier(.36,0,.66,-.56)` | anticipation before a move |
| Linear | n/a | continuous loops only (background drift) |

For a natural settle use `spring` or `approach` from `core/motion/springs.js`.

## 3. Transitions

| Technique | Duration | Use when |
|---|---|---|
| Dip to colour (brand or white) | 250-400 ms | chapter change; resets the eye |
| Push / slide | 350-500 ms | sequential, directional "next" |
| Wipe at 15-30 degrees | 300-450 ms | energetic reveal |
| Mask reveal (a shape grows) | 400-600 ms | logo or hero moments |
| Scale punch (1.08 to 1, fast fade) | 200-350 ms | beat-synced emphasis cut |
| Crossfade | 200-300 ms | calm, between two light scenes |
| Match cut / shared element | 400-600 ms | most premium: carry a shape across the cut |

A hard cut on the audio beat plus a 2-frame accent flash is punchy and cheap. Adjacent transitions
change axis or direction (AGENTS.md).

## 4. Microinteractions (product demos)

Saffer model: trigger, rules, feedback, loops. You animate the feedback. UI micro-motion runs
100-300 ms, never over 400 ms. Ease-out for anything triggered; a low-bounce spring for physical feel.

| Pattern | Duration | Easing | Params |
|---|---|---|---|
| Button press | 100 / 180 ms | ease-out, then spring | scale 1 to 0.96 |
| Hover lift | 150-200 ms | ease-out | translateY -2 to -4 px plus shadow |
| Toggle flip | 200-250 ms | low-bounce spring | knob slide, track cross-fade |
| Checkmark draw | 300-400 ms | ease-out | SVG `stroke-dashoffset` |
| Ripple on click | 300-600 ms | ease-out | ring scales from the point, alpha 0.3 to 0 |
| Number tick | 400-800 ms | ease-out | count up |
| Skeleton to content | 200-300 ms | ease-out | shimmer about 1200 ms per loop while waiting |
| Success pulse | 300-600 ms, once | ease-out | scale 1 to 1.05 to 1 |
| Shake on error | 300-400 ms | ease-in-out | translateX 6-10 px, decaying |

## 5. Cursor and pointer (scripted demos)

Move time grows with log2(distance / size) (Fitts). The motion is ballistic: fast launch, decelerate
into the target, a slight arc, never a ruler-straight line. Short hop 0.4-0.6 s, cross-screen
0.7-1.0 s, from off-screen about 1.0 s. A click is a cursor dip to scale 0.9, a spring back, and a
ripple ring on the target at contact. Dwell 200-400 ms on the target before pressing, then pause
100-300 ms before the UI reacts (instant reads fake). After a major action, hold 1.0-1.4 s so the
viewer registers the change. Removing these pauses is the most common demo mistake.

## 6. Zoom and scale

Camera moves ease in-out, 400-800 ms, transform only. Zoom-to-focus: scale 1.0 to 1.3-1.4 and move
the element to the centre. Zoom-out reveals context. Ken Burns: a slow 3-8% zoom over 5-15 s so
nothing is dead. Match-zoom: zoom into an element that becomes the next scene. Snap zoom: 150-250 ms
for a punch. A zoom earns its place only when it directs attention, shows hierarchy or bridges a cut.

## 7. "Feels alive" checklist

Never a fully static frame. Idle drift on the background (3-8% over 10-20 s). A breathing pulse on the
live or CTA element (scale 1 to 1.03, 2-4 s). Staggered entrances. Parallax between layers on camera
moves. Secondary motion (a shadow or icon settles a beat after its card). Springs over linear.
Restraint pass: after adding it all, cut half. One focal motion per beat (NN/g: gratuitous animation
distracts). Overshoot is seasoning, one or two per scene at most.

## 8. Focus techniques: draw the eye to one thing

Pick by the brand's personality: annotations suit warm or editorial brands, clean wipes suit tech.

- **Highlighter sweep:** a translucent accent rect behind the text, `scaleX 0 to 1` from the left, about 0.4 s.
- **Underline:** a rule draws left to right in about 0.5 s (straight for tech, hand-drawn SVG `stroke-dashoffset` for editorial).
- **Colour-change wipe:** overlay the same text in the accent and animate `clip-path: inset()` from 0 to 100%. The direction carries meaning (progress, arrival).
- **Circle or arrow annotation:** an SVG path with `pathLength="100"` drawn with `stroke-dashoffset`, plus a handwritten label.
- **Scale punch:** a one-shot `scale 1 to 1.05 to 1` for arrivals.
- **De-emphasise the rest:** dim or blur the non-focal elements.

Design the focus treatment from the brand. Do not reuse one by default.

## 9. Variety checklist

Between neighbouring scenes change at least 3 of these 6, and hold the anchors (one accent, one type
system, one transition vocabulary, consistent margins):

1. Layout (centred, left, grid, split, full-bleed)
2. Scale (macro type against small, dense type)
3. Value (dark against light): the strongest lever
4. Background treatment (never the same twice in a row)
5. Hue (walk within the brand family)
6. Motion character (snappy, slow settle, staggered build)
