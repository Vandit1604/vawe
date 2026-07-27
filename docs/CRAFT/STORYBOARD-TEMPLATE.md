---
message: "One sentence — the single thing this video must communicate."
audience: "Who it is for (role, context)."
arc: "hook → build → proof → payoff → CTA"
object: "the one noun that survives every cut (the button, the prompt box, the row, the token)"
object_t0: "what it looks like before anything happens"
object_states: "what it becomes at each cut, in order"
object_last: "the last frame: the payoff, or the moment just before it"
format: 1920x1080
theme: "themes/<brand>.json (or: preset <name> remixed via make theme-remix)"
duration: 45s
---

<!--
  This is the STORYBOARD contract (another engine Step 3, adapted). Copy it, fill it, then run
  `make storyboard-check SB=<file>` and present it for sign-off BEFORE writing any scene JSON:
  open with "This video tells <audience> that <message>", then the beat table. Every beat states its
  JOB — a beat with no `why` is decoration. Reveal model: weight each cue into the back ~50% of its beat
  (the direction-floor's `front-loaded` check enforces the floor of this). No two beats move alike.

  THE OBJECT SPINE. One noun stays on screen across the cuts and every cut is a state change of it.
  Fill `object` / `object_t0` / `object_states` / `object_last` above, and give every beat an `object:`
  line, BEFORE writing a word of copy. Under ~15s the gate requires all of it (there is no room for
  chapters, so a film of islands is a slideshow); above ~15s it is still how a film holds together.
  Doctrine: .claude/skills/vawe-continuous-action/SKILL.md. The scene-side mirror of this rule is the
  direction-floor's `no-continuous-object` tell.
  Field reference: docs/CRAFT/FRAME-SPEC.md. Effects to name: docs/EFFECTS.md. Shot shapes: make blueprints.
-->

## Beat 1 — Hook
- type: hook
- object: not born yet. The stage is being cleared for it.
- blueprint: kineticHook (Adapt: keep the open-loop question; change the hero word to the brand's stat)
- onscreen: "the strong first line" / "the second cue, revealed later"
- mechanism: count-up · kinetic word reveal · slow-push camera
- why: open loop — pose the question the payoff answers (curiosity before any claim)
- emotion: curiosity
- duration: 6s
- transition_in: cut

## Beat 2 — Build
- type: product_intro
- object: it arrives, in its resting state
- blueprint: logoReveal (Adapt: mark draws on, wordmark cascades)
- onscreen: "what it is" / "the category line"
- mechanism: svg draw-on · glow flash · per-word reveal
- why: name the thing — give the hook a cause with a name
- emotion: clarity
- duration: 6s
- transition_in: zoom-through

## Beat 3 — Proof
- type: feature_showcase
- object: acted on. It is doing the thing the claim asserts.
- blueprint: screenDive (Reproduce: dive into the real UI)
- onscreen: "the claim" / "the number that backs it"
- mechanism: diveIn camera · count-up · border-beam card
- why: show-don't-tell — the product doing the thing, not a slogan about it
- emotion: trust
- duration: 7s
- transition_in: cinematicZoom

## Beat 4 — Payoff
- type: benefit_highlight
- object: transformed by that act into the result
- blueprint: statReveal (Adapt: the hero number the hook set up)
- onscreen: "the shocker line" / "the payoff figure"
- mechanism: hero count-up · kinetic label · a single accent rule
- why: land the counterintuitive result — pay off the open loop from Beat 1 (the bookend)
- emotion: inevitability
- duration: 6s
- transition_in: crossfade

## Beat 5 — CTA
- type: cta
- object: held on the last frame, still the same thing you watched change
- blueprint: ctaEnd (held to the last frame)
- onscreen: "the action" / "the url" / "the offer"
- mechanism: mark pop · install chip · held still (no exit)
- why: one clear next step; remove the risk
- emotion: urgency
- duration: 4s
- transition_in: zoom-through
