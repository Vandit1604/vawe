---
message: "One sentence, the single thing this video must communicate."
audience: "Who it is for (role, context)."
arc: "hook → build → proof → payoff → CTA"
framework: "PAS | BAB | AIDA | FAB | Star-Story-Solution, CHOSEN, with a reason, not defaulted"
threads: "what holds this film across its cuts. Two devices from docs/CRAFT/FILM-STRUCTURE.md"
object: "ONLY if a continuous object is one of them: the noun that survives every cut"
object_t0: "what it looks like before anything happens"
object_states: "what it becomes at each cut, in order"
object_last: "the last frame: the payoff, or the moment just before it"
format: 1920x1080
theme: "themes/<brand>.json (or: preset <name> remixed via make theme-remix)"
duration: 29s
pace: "showreel | explainer | held, CHOSEN before any beat is written, with a seconds-per-idea budget"
spectacle: "beat N · which layer · which device · what the moment is for, the ONE loud moment"
not: "the defaults this film refuses, in your own words"
---

## AGENT SUMMARY

- Copy this file, fill every field, then run `make storyboard-check SB=<file>` and get sign-off
  BEFORE writing any scene JSON.
- Two lines are required and gate-checked for PRESENCE only, never for quality: `spectacle:` (the one
  loud moment, named: beat, layer, device, why) and `not:` (the defaults this film refuses).
- Fill `pace:` (showreel 1.5-4s/idea, explainer 3-8s, held 6s+), `threads:`/`object:` (what holds the
  film across its cuts), and per-beat `shot:`/`layout:`/`becomes:`/`trigger:`/`picture:`, then watch
  `make animatic SB=<file>` before writing any JSON.
- Enforced by `[gated: scripts/gates/storyboard-check.mjs]` (presence of `spectacle:`/`not:`, plus
  `pace-not-chosen` and `timeline-hole`) and `[gated: scripts/gates/plan-vs-render.mjs]` once a scene
  exists; `[ref: make panels]` / `[ref: make animatic]` draw what each field means but check nothing.
- Confirm: are `spectacle:` and `not:` both filled, and have you watched `make animatic` before
  writing any scene JSON?

<!--
  This is the STORYBOARD contract (another engine Step 3, adapted). Copy it, fill it, then run
  `make storyboard-check SB=<file>` and present it for sign-off BEFORE writing any scene JSON:
  open with "This video tells <audience> that <message>", then the beat table. Every beat states its
  JOB. A beat with no `why` is decoration. Reveal model: weight each cue into the back ~50% of its beat
  (the direction-floor's `front-loaded` check enforces the floor of this). No two beats move alike.

  WHAT HOLDS THE FILM. Under ~15s the gate requires you to NAME it in the frontmatter, and it takes
  PACE IS DECIDED BEFORE ANIMATION, NOT DISCOVERED DURING IT. "Pace is a genre decision made before
  animation work begins", and a showreel runs 1.5 to 4 seconds per IDEA. Ours is measured at 5.15
  seconds per shot against their 5.68, so the cut rate is not our problem: the problem is how many ideas
  are inside a shot. The film the owner rejected put three ideas in six seconds and read as frantic;
  brew gives one idea a whole beat and reads as confident. Write `pace:` first, in seconds per idea, and
  then let the beat count fall out of the runtime. A beat that carries two ideas is two beats or one
  cut, never one crowded frame.

  THE PEAK AND THE EXCLUSION, BOTH REQUIRED, BOTH PRESENCE-CHECKED ONLY. `spectacle:` names the one
  exaggerated moment: which beat, which layer, which device, what it is for. It is two-sided and that is
  the whole point: naming the peak is at the same time a promise that every other beat stays restrained,
  so a film that names none has not chosen restraint, it has chosen one flat volume for its whole runtime.
  `not:` names the defaults this film refuses. Most generic output is not a wrong decision, it is an
  un-excluded default: the centred type, the even grid, the fade on everything.

  `storyboard-check` FAILS a storyboard missing either line, and checks nothing else about them. It cannot
  tell a good peak from a bad one, and a check that pretended to would manufacture findings. Nothing grades
  the prose in `not:` at all, ever; the line exists so the decision gets made.

  BUT WRITING THE PEAK DOWN IS NOT BUILDING IT, exactly as with `becomes:` below. The film-side half is a
  scene block, `"spectacle": { "at", "of", "device", "why" }` (core/spectacle.js), which writes the device
  as a sting at `at` and pulls every competing amplitude dial in the film down around it.
  `make plan-check D=<file>` reads this line and the scene together: it warns `spectacle-not-built` when
  the plan names a peak the JSON never builds, and `spectacle-in-wrong-beat` when the block's `at` lands
  outside the beat named here. So NAME THE BEAT in this line, as "beat 4" or by the beat's own title, or
  the two cannot be compared and the gate says so.

  `pace:` IS JOINED THE SAME WAY. `plan-check` lays the declared seconds-per-idea over the film's real
  runtime and warns `pace-not-kept` when the film gives its planned ideas more or fewer seconds than the
  budget. Keep exactly ONE of showreel · explainer · held: leave the template's menu of three in place and
  the gate warns `pace-not-chosen`, because reading the first word as your choice would invent a decision
  nobody made. The bands are showreel 1.5-4s per idea, explainer 3-8s, held 6s and up; an explicit budget
  written into the line ("2.5s per idea") wins over the band. It counts the PLAN's ideas against the
  RENDER's clock, so it catches a film that grew past its budget and cannot see two ideas crowded into one
  beat. That one is yours.

  LAYOUT IS A BEAT DECISION, NOT A LAYER DECISION. Their beat formula has five slots, Element · Motion ·
  Layout · Style · Timing, and ours had no Layout: composition was decided per layer at JSON time and
  never at beat time, so a plan could be approved without anyone saying WHERE anything sits. `layout:`
  asks for a coarse region and how much of the frame it fills ("filling the lower half", "top-left
  against the UI"), never coordinates. That is the level a reviewer can actually approve.

  `layout:` IS NOW DRAWN. `make panels SB=<this file>` reads the line, tints the region it names inside
  the panel frame, and sizes or centres the subject box against it, so a beat that says "the UI fills
  the lower two thirds" stops being drawn as a medium box dead centre. What it reads: halves, thirds,
  two-thirds and quarters ("lower half", "middle third", "top-left"), plus a stated share ("60% of frame
  width", "8% of the frame"). It reads the FIRST region you name, it ignores any clause that says a
  region is EMPTY ("the lower half deliberately empty" places nothing), and it treats "full-bleed" as a
  fallback so a narrower region named beside it wins. A line it cannot read is named in the report as
  unread, never quietly centred. Say WHERE and HOW MUCH: a line that says only where leaves the mass of
  the panel to `shot:`, and the panel says so.
  When the two disagree, the panel draws `layout:`, because a region is the more specific statement, and
  the report names the disagreement. It is worth settling: an "extreme wide" beat whose type fills the
  middle third is two different beats written on one card.
  THE ARITHMETIC. Measuring a picture's SIZE is what killed the `visual-vocabulary` gate, whose helper
  squared a 590x18 rule into 590x590 and credited a hairline with a tenth of the frame. Area is width
  times height and nothing else, and a share stated on ONE axis stays on that axis and produces no area
  at all. `node scripts/author/panels.mjs --self-test` asserts both against that same hairline.

  EVERY BEAT DECLARES ITS STYLE AND ITS REST. Be clear about what reads which, because a field nobody
  reads is worse than no field. `rest:` is consumed. `layout:` is consumed by `make panels`, as above,
  and by nothing else: no gate and no renderer compares it against the film, so writing the region down
  is not building it. `style:` is consumed by `make panels` as WORDS ONLY. It is carried onto the panel
  and listed beat by beat under the report, where five beats declaring one treatment is visible at a
  glance. It is NOT drawn, and it must not be: panels are grey on purpose and the look is judged at
  `make styleframes`. Nothing anywhere grades the prose in either line.
  `style:` is the visual treatment for THIS beat, the slot the reference system's beat formula has
  (Element · Motion · Layout · Style · Timing) and ours did not. Without it, style is decided once for
  the whole film and every beat inherits it, which is how a film ends up looking like one long shot.
  `rest:` says what moves during the HOLD. Their films are near-static 41% of the runtime against our
  20%, and that is not stillness, it is authored idle: "Nothing ever fully stops. Every hold carries a
  little ambient idle motion, a 1-2% breathing scale, a slow drift." We had a gate that BLOCKS a held
  frame (`dead-air`) and nothing on the other side, so the cheap answer was always more motion rather
  than better motion. `rest: none` is a legal answer and it is the right one on the spectacle beat.

    THE MOTION PLAN. `object_in`/`object_out` say where the ONE continuous object is; `motion:` says what
  ELSE moves in this beat, beyond that one thing, so a fragment author is told what has to move BEFORE
  writing the markup rather than inventing entrances after. One or more `;`-separated entries,
  `<selector>@<kind>:<inBand>[/<outBand>]`: `<selector>` is a CSS selector into the fragment's own
  markup (`[data-part="headline"]`, `.card`), the SAME selector a hand-authored `parts[].select`
  already takes (core/motion/parts.js); `<kind>` is one of the engine's named part entrances (growUp,
  fadeUp, riseIn, drawOn, fade, slide-left, slide-right, popIn, widen); `<inBand>`/`<outBand>` are the
  four named speed bands this repo already has (docs/RULES/speed-bands.md: energy, professional,
  gravity, cinematic), reused rather than invented so a beat's motion speaks the same words a duration
  decision already speaks. `<outBand>` defaults to `<inBand>`. THIS is the boundary velocity a
  content-aware cut (core/timeline/velocity-cut.js) hunts for: a fast (short) exit band lands the next
  cut on a picture already moving, which is the strongest signal that gate reads. `make assemble`
  builds every entry into `parts[]` on that beat's own scene layer, the same vocabulary a hand-authored
  parts block already takes, so this is not a second motion mechanism, it is the storyboard filling in
  the one the engine already has. Optional, and delete the line if nothing but the continuous object
  moves in a beat.

  either answer. `threads:` names the devices carrying this film from docs/CRAFT/FILM-STRUCTURE.md, a
  match cut, a camera travel, a motif, a bookend, a metric cut rate, an unfinished sentence, an open
  question. Carry two, not one. `object:` is the one device the scene-side gate can also see: one noun
  stays on screen across the cuts and every cut is a state change of it. Declare `object:` only if that
  is really the film, because then `object_t0` / `object_states` / `object_last` and an `object:` line
  on every beat are required too, and the scene-side mirror is direction-floor's `no-continuous-object`
  (opt-in, `TASTE=1`). Doctrine for the object device: skills/vawe-continuous-action/SKILL.md.

  THE THIRD QUESTION, AND THE ONE NOTHING USED TO ASK. `trigger:` is WHAT MADE THIS BEAT HAPPEN.
  The act in the beat before that forced this one. "the cursor hits Send on the card in beat 1". It is
  not `becomes:` (what the thing turned into) and it is not `mechanism:` (how it moves), and the cheap
  answer to it is either of those two again. A film where every beat has a `becomes:` and no beat
  causes the next is a run of unrelated changes, which is the slideshow failure written on paper.
  OPTIONAL, AND IT WILL STAY OPTIONAL. Not every film has a causal spine: a manifesto, a vignette
  anthology and a metric-cut list film are held by something else and have no answer to "what caused
  beat 3". The gate never blocks on it. What it always prints is the CHAIN, one link per junction,
  every unstated link drawn as a break, and a count of fragments. It warns on `trigger-is-a-sequence`
  ("then", "next": that says when, not why), on `trigger-is-a-mechanism` ("it cuts to the next shot"),
  and on `chain-breaks` once some junctions state a cause and others do not. Full register, and what
  no static gate can see here: docs/CRAFT/FILM-STRUCTURE.md Part 5.

  TWO MORE FIELDS, TWO MORE QUESTIONS. `mechanism:` is HOW it moves (count-up, slow push, kinetic reveal).
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
  core/camera-moves/index.js), so the plan simply did not speak the language the renderer already had, and
  camera work got invented at JSON time or not at all. Name `shot:` and `camera:` per beat.

  `shot:` NOW DRAWS SOMETHING, so it is worth filling in properly. `make panels SB=<this file>` renders
  one rough grey still per beat, and `shot:` sizes the subject box in it: a wide leaves the frame mostly
  empty, a close fills it. A beat with no `shot:` is drawn as a medium and named in the warnings, which
  makes the omission visible rather than average. Placement words inside `shot:` or `picture:` are read
  too ("on the left", "the lower third"), and a beat that names none gets a centred box labelled as
  this tool's guess. So state the shot, and if the frame divides, say which side the subject is on.

  `picture:` is the other half, and it is the one that matters most here. Short-form advertising
  research is blunt about it: the visual and copy channels must carry a beat SIMULTANEOUSLY, not
  sequentially, because that is the only way to fit a whole beat into three seconds. A beat with copy
  and no picture is one channel doing all the work in series. That is not a style preference, it is
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
- motion: [data-part="headline"]@slide-left:energy
- mechanism: count-up · kinetic word reveal · slow-push camera
- becomes: the bare stage becomes a question, and the question becomes a number climbing toward it
- trigger: nothing yet. This beat opens the film, so its cause is the question it asks
- layout: type in the middle third, the rest of the frame deliberately empty
- style: hard contrast, one colour, type is the only object
- rest: 1.5% breathing scale on the headline through the hold
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
- trigger: the count-up in beat 1 lands on its final figure and needs an author
- layout: mark centre, wordmark under it, lower half deliberately empty
- style: the brand ground arrives, mark at full weight, everything else muted
- rest: slow drift on the mark, 6px over the hold
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
- trigger: the wordmark makes a claim, and a claim on screen demands the product doing it
- layout: the UI fills the lower two thirds, the claim sits top-left against it
- style: the real UI at full fidelity, chrome dimmed so the claim reads
- rest: 1% scale on the captured surface, nothing else moves
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
- trigger: the row in beat 3 finishes filling, so the result is now available to show
- layout: the number owns the centre at 60% of frame width
- style: the loudest frame of the film. THIS is the spectacle beat
- rest: none, the spectacle carries it
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
- trigger: the viewer has the result and nothing left to wait for
- layout: mark and url stacked centre, generous margin on all four sides
- style: quiet, one line, the mark and nothing competing
- rest: 1% breathe on the mark only
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
