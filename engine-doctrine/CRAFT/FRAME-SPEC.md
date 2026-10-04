---
when: starting a film, before you write the page
answers: "the design-system spec (colour roles, type roles, a negative list) · the per-beat storyboard fields · the build, breathe, resolve reveal model · QA the seams"
group: look
---

# FRAME-SPEC: lock the contract before the page

A great film is not authored frame-first. Lock two things first and let every frame obey them: a design
spec and a beat-by-beat storyboard (`STORYBOARD-TEMPLATE.md`).

## Part 1: the design spec

One page, from the brand study. Every frame uses only these values.

- **Colour roles, not hexes.** Ground, text, text-muted, one scarce accent, positive, negative. The accent
  is voltage: eyebrows, numerals, one rule per frame, the CTA. No frame lets it dominate by area. Put them
  in `:root` custom properties (`taste/craft/color.md`).
- **Type by role, in fixed faces.** Display, body, and mono for every numeral ("a dollar figure in anything
  but mono is a bug"). Use the measured weights from the brand, never a default 800 (`taste/craft/typography.md`).
- **A negative list.** Name what this film will not do: no nav or footer chrome, no AI gradients or bokeh,
  no second accent, no `back`, `bounce` or `elastic` easing unless the brand is a toy brand.
- **A pre-render self-audit.** Squint, silence, restraint, reference.

## Part 2: the storyboard, one block per beat

| Field | What it says |
|---|---|
| arc | the beat order: hook, build, proof, payoff, CTA. Outcome first beats product first |
| mechanism, reproduce or adapt | the signature of the device you keep and the one thing you change. That keeps you directed without copying a template |
| on screen | the cues in order, each its own reveal window |
| persuasion | the rhetorical job (negative contrast, category naming, risk reversal). A beat with none is decoration |
| beat | the felt arc: curiosity, recognition, trust, urgency |
| camera, transition in | how the beat arrives (it is also the prior beat's exit) |
| held or developing | duration, and whether the camera and reveals keep moving |

## Part 3: the reveal model (build, breathe, resolve)

Every beat has three phases. Build 0 to 30 %: elements enter, staggered, not all at once. Breathe 30 to 70 %:
content is visible and alive with one ambient motion. Resolve 70 to 100 %: exit or a decisive end, faster
than the entrance. Weight each on-screen cue into the back half of its beat. At a beat's start only its first
cue is present.

Two failures, banned by name: the slideshow (everything dumped in the first 25 %, then frozen) and the
screensaver (elements drifting independently to fake life during a hold).

## Part 4: rhythm

- Vary the cut rhythm. Set the fastest beat by contrast with a slow one beside it.
- Bookend: let the payoff call back the hook. Cohesion reads as intent.
- No two beats move alike. Aim for a distinct mechanism per beat.

## Part 5: QA the seams, not the centres

The worst render bugs (a black flash, a morph that reads as a collision) hide in the transition overlap.
Sample the frames that straddle every transition. `bin/vawe critique <page>` writes the strip and the loop
seam. Look at them.
