---
message: "One sentence — the single thing this video must communicate."
audience: "Who it is for (role, context)."
arc: "hook → build → proof → payoff → CTA"
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
  Field reference: docs/CRAFT/FRAME-SPEC.md. Effects to name: docs/EFFECTS.md. Shot shapes: make blueprints.
-->

## Beat 1 — Hook
- type: hook
- blueprint: kineticHook (Adapt: keep the open-loop question; change the hero word to the brand's stat)
- onscreen: "the strong first line" / "the second cue, revealed later"
- mechanism: count-up · kinetic word reveal · slow-push camera
- why: open loop — pose the question the payoff answers (curiosity before any claim)
- emotion: curiosity
- duration: 6s
- transition_in: cut

## Beat 2 — Build
- type: product_intro
- blueprint: logoReveal (Adapt: mark draws on, wordmark cascades)
- onscreen: "what it is" / "the category line"
- mechanism: svg draw-on · glow flash · per-word reveal
- why: name the thing — give the hook a cause with a name
- emotion: clarity
- duration: 6s
- transition_in: zoom-through

## Beat 3 — Proof
- type: feature_showcase
- blueprint: screenDive (Reproduce: dive into the real UI)
- onscreen: "the claim" / "the number that backs it"
- mechanism: diveIn camera · count-up · border-beam card
- why: show-don't-tell — the product doing the thing, not a slogan about it
- emotion: trust
- duration: 7s
- transition_in: cinematicZoom

## Beat 4 — Payoff
- type: benefit_highlight
- blueprint: statReveal (Adapt: the hero number the hook set up)
- onscreen: "the shocker line" / "the payoff figure"
- mechanism: hero count-up · kinetic label · a single accent rule
- why: land the counterintuitive result — pay off the open loop from Beat 1 (the bookend)
- emotion: inevitability
- duration: 6s
- transition_in: crossfade

## Beat 5 — CTA
- type: cta
- blueprint: ctaEnd (held to the last frame)
- onscreen: "the action" / "the url" / "the offer"
- mechanism: mark pop · install chip · held still (no exit)
- why: one clear next step; remove the risk
- emotion: urgency
- duration: 4s
- transition_in: zoom-through
