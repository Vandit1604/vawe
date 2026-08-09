---
message: "One sentence, the single thing this video must communicate."
audience: "Who it is for (role, context)."
arc: "hook → build → proof → payoff → CTA"
framework: "PAS | BAB | AIDA | FAB | Star-Story-Solution — CHOSEN, with a reason, not defaulted"
object: "the one noun that survives every cut (the button, the prompt box, the row, the token)"
object_t0: "what it looks like before anything happens"
object_states: "what it becomes at each cut, in order"
object_last: "the last frame: the payoff, or the moment just before it"
format: 1920x1080
theme: "themes/<brand>.json (or: preset <name> remixed via make theme-remix)"
duration: 29s
---

<!--
  This is the STORYBOARD contract (another engine Step 3, adapted). Copy it, fill it, then run
  `make storyboard-check SB=<file>` and present it for sign-off BEFORE writing any scene JSON:
  open with "This video tells <audience> that <message>", then the beat table. Every beat states its
  JOB. A beat with no `why` is decoration. Reveal model: weight each cue into the back ~50% of its beat
  (the direction-floor's `front-loaded` check enforces the floor of this). No two beats move alike.

  THE OBJECT SPINE. One noun stays on screen across the cuts and every cut is a state change of it.
  Fill `object` / `object_t0` / `object_states` / `object_last` above, and give every beat an `object:`
  line, BEFORE writing a word of copy. Under ~15s the gate requires all of it (there is no room for
  chapters, so a film of islands is a slideshow); above ~15s it is still how a film holds together.
  Doctrine: .claude/skills/vawe-continuous-action/SKILL.md. The scene-side mirror of this rule is the
  direction-floor's `no-continuous-object` tell.

  TWO FIELDS, TWO QUESTIONS. `mechanism:` is HOW it moves (count-up, slow push, kinetic reveal).
  `becomes:` is WHAT IT TURNED INTO, written as "the X becomes the Y". A preset name answers the
  first question and never the second: "fade · slide · zoom" says nothing changed, only that
  something travelled. Under 15s the gate FAILS a beat with no `becomes:`, and warns when the value
  is animation vocabulary with no change-verb in it.

  WHAT `becomes:` IS ACTUALLY WORTH. We tested it: two 12s films from one brief, one storyboarded
  with `becomes:` on every beat, one without. A blind judge picked the film WITHOUT it. That film
  carried more demonstrations (7 against 4) and more information per second, and both films changed
  their object the same way (a crossfade inside a fixed box), so the field bought no technique.
  Then the sharp part: the losing film's worst defect is a stretch in the middle where the frame does
  not move at all, and its storyboard carries a correct `becomes:` on that exact beat. The author
  wrote the change down and did not build it, and every gate stayed green.

  So keep the field and hold it to its real job. It feeds the intent sidecar, and it lets a failure
  name what was supposed to happen. It does not make a film better, and a storyboard full of them is
  not evidence about anything but the storyboard. Writing the change down is not building it. The
  gate that checks the film is `make plan-check D=<file>` (scripts/gates/plan-vs-render.mjs): it lays
  these beat spans over the render's clock and fails a junction the plan promised and the JSON left
  empty. Run it, and read what it says about the beats you were surest of.

  THE SHOT, THE CAMERA, AND THE TWO CHANNELS. Professional storyboard panels carry shot size, angle,
  camera movement, action, dialogue, duration and narrative purpose. This template had purpose (which
  most do not) and no shot vocabulary at all, which was a strange gap: the ENGINE already implements
  the camera (`slowPush · diveIn · panFollow · workspaceZoomOut · orbit · multiPhase`,
  core/camera-moves.js), so the plan simply did not speak the language the renderer already had, and
  camera work got invented at JSON time or not at all. Name `shot:` and `camera:` per beat.

  `picture:` is the other half, and it is the one that matters most here. Short-form advertising
  research is blunt about it: the visual and copy channels must carry a beat SIMULTANEOUSLY, not
  sequentially, because that is the only way to fit a whole beat into three seconds. A beat with copy
  and no picture is one channel doing all the work in series. That is not a style preference — it is
  the mechanical reason 29 films in this library used to waive the deleted show floor. State what the frame
  SHOWS, separately from what it SAYS, and if you cannot, you have found the beat's real problem while
  it is still a line of markdown.

  THE TIMES ARE READ NOW. The `(0s-1.53s)` range in each heading is parsed. A gap between two beats,
  or a last beat that stops short of the frontmatter `duration`, fails as `timeline-hole`.
  THEN PLAY IT: `make animatic SB=<this file>`. A storyboard shows WHAT happens; an animatic shows
  whether the things you planned have the TIME to happen, which is the one question no amount of
  re-reading the plan can answer and the one this repo keeps getting wrong. It renders grey slots and
  your real copy at your real durations, deliberately ugly so that pacing is the only thing left to
  judge. Beats that named no `picture:` show up as empty labelled boxes. Watch it before you write a
  line of scene JSON. `storyboard-check` grades the plan against itself; the animatic grades it
  against a clock.

  Field reference: docs/CRAFT/FRAME-SPEC.md. Effects to name: docs/EFFECTS.md. Shot shapes: make blueprints.
-->

## Beat 1: Hook (0s-6s)
- type: hook
- object: not born yet. The stage is being cleared for it.
- shot: wide (establishing, the frame is mostly empty)
- camera: slowPush
- picture: the empty stage with one hairline rule where the number will land
- blueprint: kineticHook (Adapt: keep the open-loop question; change the hero word to the brand's stat)
- onscreen: "the strong first line" / "the second cue, revealed later"
- mechanism: count-up · kinetic word reveal · slow-push camera
- becomes: the bare stage becomes a question, and the question becomes a number climbing toward it
- why: open loop, pose the question the payoff answers (curiosity before any claim)
- emotion: curiosity
- duration: 6s
- transition_in: cut

## Beat 2: Build (6s-12s)
- type: product_intro
- object: it arrives, in its resting state
- shot: medium (the object arrives and owns the middle third)
- camera: hold
- picture: the mark drawing on, stroke by stroke, at 40% of frame height
- blueprint: logoReveal (Adapt: mark draws on, wordmark cascades)
- onscreen: "what it is" / "the category line"
- mechanism: svg draw-on · glow flash · per-word reveal
- becomes: the number becomes the thing that produced it, and the drawn mark becomes the wordmark
- why: name the thing, give the hook a cause with a name
- emotion: clarity
- duration: 6s
- transition_in: zoom-through

## Beat 3: Proof (12s-19s)
- type: feature_showcase
- object: acted on. It is doing the thing the claim asserts.
- blueprint: screenDive (Reproduce: dive into the real UI)
- onscreen: "the claim" / "the number that backs it"
- mechanism: diveIn camera · count-up · border-beam card
- becomes: the resting product becomes a product mid-use, and the empty field becomes a filled row
- why: show-don't-tell, the product doing the thing, not a slogan about it
- emotion: trust
- duration: 7s
- transition_in: cinematicZoom

## Beat 4: Payoff (19s-25s)
- type: benefit_highlight
- object: transformed by that act into the result
- blueprint: statReveal (Adapt: the hero number the hook set up)
- onscreen: "the shocker line" / "the payoff figure"
- mechanism: hero count-up · kinetic label · a single accent rule
- becomes: the filled row becomes the finished result, and the open loop becomes an answer
- why: land the counterintuitive result, pay off the open loop from Beat 1 (the bookend)
- emotion: inevitability
- duration: 6s
- transition_in: crossfade

## Beat 5: CTA (25s-29s)
- type: cta
- object: held on the last frame, still the same thing you watched change
- blueprint: ctaEnd (held to the last frame)
- onscreen: "the action" / "the url" / "the offer"
- mechanism: mark pop · install chip · held still (no exit)
- becomes: the result becomes an address you can type, and the mark becomes the last frame
- why: one clear next step; remove the risk
- emotion: urgency
- duration: 4s
- transition_in: zoom-through

### Budget the demonstrations, not just the claims

<!-- Guidance, not a beat. It stays a `###` so the gate does not parse it as one. Delete it when you
     copy this file. -->

Go through the film a second at a time and label what a first-time viewer learns in each one. There
are only four labels. A NEW-FACT is a claim. A NEW-STATE is the same object, changed. A RE-STATE
says again what was already said. DECORATION carries nothing.

Do this by hand, on your own film, and hold the result loosely. We ran it on our three recreations
against the reference they copy, and it read them as landing claims at about the reference's rate
and changes at roughly two thirds of it. That matches what the films look like. It is also a
judgement call about every single second, so treat it as a way of looking rather than a score. When
we checked the sharper conclusions drawn from that same pass, two of them were wrong: the "dead
tail" was the window being longer than the film, and the "ends on a claim" was a line that lands in
the last beat next to a real change.

**One finding did survive, because frames were pulled and looked at.** From 5.0s to 7.0s all three
of ours change nothing but the backdrop, and at 6.5s two of them are a black plate with a single
dot on it. The reference's emptiest second still has the carried object turning in frame. That hole
is now a blocking gate (`dead-air`, MISTAKES #165). It went unseen for a whole render cycle because
the gate asked whether a layer window was open, not whether anything was in the frame.

The lesson is the method, not the numbers. A count over a whole film is a hypothesis. Pull the
frame and look at it before you believe any of it, or write it down.

So budget both. A claim is a sentence. A demonstration is a state-change. **If a beat names a
capability and no state-change sits under it, cut the beat or add the change.** And count the film
backwards from its payoff, so you do not spend your seconds before you reach the thing you promised.

**The background is decoration. It is never information.** It is on screen for all 15 seconds of
the reference and carries none of them. A beat whose only change is the backdrop has changed
nothing.
