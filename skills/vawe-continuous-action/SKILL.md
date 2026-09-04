---
name: vawe-continuous-action
description: "Turn a one-line brief into a SHOOTABLE plan for a short product film built as ONE continuous action. This is ONE of the ~18 devices in docs/CRAFT/FILM-STRUCTURE.md, the right one when the film has a single subject and a single process; read that catalogue first and pick. Load this once you have picked it, for a launch/promo/teaser under ~15s. Teaches the continuous-object spine, diegetic motion, the second-by-second budget, and emits a storyboard that make storyboard-check and make intent already consume."
---

# vawe-continuous-action - plan the film as one action

**The contract:** name one object, write its state at every beat, and treat every cut as that
object changing state, never a jump. Follow Steps 1 to 7 in order, in the storyboard, before you
write any JSON.

The engine can build anything. What it cannot do is plan something great from a blank brief.
Handed "make a 5s launch film for an AI image tool", an agent writes a competent slideshow:
hook card, feature card, logo card. Every gate passes. Nobody watches it twice.

The reference in this repo (`higgsfield.mp4`, first 5 seconds, recreated in
`formats/scene/higgsfield-recreation.json`) is not a sequence of beats. **It is one continuous
action.** You type a prompt. You press generate. The generate button itself becomes the loading
dot. One object is on screen from the first frame to the last and every cut is that object
changing state.

That is the grammar this skill plans in. Read it before the storyboard, not after.

## Before you use this skill: it is one device, not the law

This skill was written from one reference and then treated as a floor for every short film. It is not.
[`docs/CRAFT/FILM-STRUCTURE.md`](../../docs/CRAFT/FILM-STRUCTURE.md) catalogues about eighteen devices
that hold a short film together, across four registers: spatial (a match cut, a oner, camera travel,
masking, cloning, a dolly-zoom, and this one), verbal and aural (an unfinished sentence, a sound bridge,
a bookend, an open question), temporal (metric cutting, rhythmic cutting, a track that IS the structure),
conceptual (a motif, intellectual montage, escalation, a through-line). Murch's Rule of Six ranks the one
this skill teaches (three-dimensional spatial continuity) **last of six**, at 4%, and says to sacrifice
your way up from the bottom.

**Use it when the content is genuinely continuous:** one subject, one process, a product film, a demo
where the UI is the subject. Then the object really does transform, and everything below is right.

**Do not use it for** a manifesto, a vignette anthology ("three customers, three problems"), a comparison
whose meaning lives in the junction, or a metric-cut list film where every card is a peer. Forcing one
prop across those lies about the content. Eighteen short films in this library waive the matching gate;
that is evidence about the rule, not about the films.

## The one law (of this device)

> **One object. One action. Every cut is a state change of that object.**

`BLUEPRINTS.md` gives you excellent *beats*, and beats are independent units by design. That
independence is exactly why a from-scratch plan comes out as a slideshow: three good beats with
nothing travelling between them. Blueprints are still how you author the motion inside a beat.
This skill decides what survives *across* the cuts: **when the answer is an object.** Carry a second
thread from the catalogue anyway: a single thread has to be literal and obvious to work, which is how a
film ends up as a rectangle that resizes four times.

---

## Step 1 - Name the object, then write its state at each beat

Do this before any JSON exists, before any copy is written. Fill this table first. If you cannot
fill it, you do not have a film yet.

| | Answer |
|---|---|
| **The object** | one noun. The prompt box, the button, a token, a card, a row, a cursor. |
| **Why it** | it is the thing the user touches to get the value. |
| **State at t=0** | what it looks like before anything happens |
| **State at each cut** | what it has become |
| **State at the last frame** | the payoff, or the moment just before it |

Rules for picking the object:

- **Pick something the user acts on**, not something the product outputs. The higgsfield object
  is the generate button, not the generated image. The button is the verb.
- **It must survive a transform.** A logo cannot transform into anything, which is why a logo
  makes a terrible spine and a fine last frame.
- **One object, not two.** A second travelling element is a subplot. At 5 seconds you have no
  room for a subplot.
- **It may change category.** Button becomes dot becomes spinner is legal and is the best move in
  the reference film. Button cuts to an unrelated dashboard is not.

**The object-death test:** name a frame where your object is off screen. If one exists before the
final beat, the spine is broken. Go back to the table.

---

## Step 2 - Every cut is a transform, never a jump

At each seam, write the relationship in one line: *"the X becomes the Y."* If you cannot write
that sentence, you have a jump cut between two unrelated shots, which is the slideshow.

Three legal seams, cheapest first:

1. **No cut.** The object keeps moving through the seam. The reference does this from 3.0s: the
   button shrinks, sheds its label and rounds into the dot with no cut at all.
2. **Match cut.** Hard cut where the object is in nearly the same place, at nearly the same size,
   on both sides. The eye stitches it.
3. **Hard cut with a carried element.** The background never cuts. The reference runs one
   `liquid` bg window across all 5 seconds, so even the 1.53s hard cut lands on continuous ground.

**The pixel-jump test:** at every seam, name the thing that is in the same place before and after.
No answer means insert a transform or delete the seam.

---

## Step 3 - Diegetic motion: the product moves itself

Every moving thing on screen has a cause. Ask, for each one: **who moved it?**

- If the answer is "the user pressed it", "the field is typing", "the request is loading", "the
  list is filtering" - that is **diegetic** motion. It comes from the product doing its job. It
  teaches while it moves.
- If the answer is "the editor slid it in from the left" - that is **decoration**. It is applied
  to a static frame from outside. It teaches nothing.

The slideshow failure mode, by name: *a static frame plus an entrance*. Card fades up, holds,
slides out. Card two fades up. It passes `make direction-floor` if you add enough easing, and it
is still a slideshow, because nothing on screen caused anything else on screen. (That gate is opt-in
now, `TASTE=1 make author-check`, which makes this your job rather than a tool's.)

In the reference, count the diegetic moves: the hook types itself and *untypes* itself (1.14s,
60 cps) to clear the stage. The prompt field types. The camera pans left because the prompt text
ran past the field and the button is being followed. The button is thrown, bounces, and morphs
because it was pressed. There is not one decorative entrance in 5 seconds. Every fade is a real
surface arriving.

You are allowed decoration. You are allowed roughly one instance of it, and it should be the
background.

---

## Step 3b - The object still owes you a hook

Naming an object does not excuse an unreadable first second. This skill was A/B tested against a control
on the same brief, and the plan built with it opened on a bare screenshot with no words on it: a viewer
had no idea what they were looking at until the command line appeared a second later. The control, with
no object spine at all, opened on "Screenshot any UI." and won that second outright.

So the continuity rule sits UNDER the house rule, it does not replace it. CLAUDE.md: a first-frame hook,
twelve words or fewer, strong word first. Two ways to pay it without breaking the spine:

- **Put the line on the object.** The hook overlays or labels the thing that is about to transform, so
  the words and the subject are the same shot. Best option.
- **Let the object BE the sentence.** Only when its state at t0 is self-evident to the audience you are
  aiming at. A terminal prompt reads instantly to a developer. A screenshot of an unfamiliar product
  does not.

Test it the honest way: show frame 1 to somebody who has never heard of the product. If they cannot say
what this is, the spine is fine and the hook is missing. Fix the hook, keep the spine.

### A carried background is not a licence to hide the object

The ellipsis this skill recommends, hold the background and hard-cut, was tried on a real brief and broke
its own law: a root `blur` cut hid the object for six frames, which is the object dying and being replaced.
If a transition covers the whole stage, the spine is broken for exactly as long as the cover lasts. Put the
cut on something ELSE in the frame, a mail row, a panel, a chip, and let the object ride through it. Check
it: step the frames across the boundary and confirm the object is visible in every one.

## Step 4 - Show the product working

The UI is the star. Plan the real surfaces first and fit copy around them, never the reverse.

- **Real surfaces**: `make capture` a live component, or a section screenshot as a clipped
  `image`. A hand-built `html` panel is acceptable only when you are reproducing a measured
  reference (as the recreation does) or the surface does not exist yet.
- **A claim with no UI under it in the same frame is cut.** Not moved later. Cut.
- **Slogans on black are a last resort and cost the same seconds as a working screen.** The
  reference spends its only text-on-black beat naming the product, and spends 1.4 of its 5
  seconds on it, and clears it completely before the product appears. That is the budget for
  words: one line, then get out.

---

## Step 5 - The 5-second budget (measured, not estimated)

Every number below is read off `formats/scene/higgsfield-recreation.json`, which was measured
frame by frame from the reference.

| Cost | Measured |
|---|---|
| A hook line the viewer must **read** | 33 chars/sec. "Meet higgsfield.ai" (18 chars) = 0.55s |
| Body text the viewer only needs to **recognize as text** | 110 chars/sec. The 69-char prompt = 0.63s |
| Clearing a typed line (untype) | 60 chars/sec, so ~0.3s for a short line |
| A new surface fading in | 0.30s |
| An object morphing into another object | 0.40s (`varsDur`) |
| A throw plus bounce settle | ~1.0s |
| The final state must hold | 0.6s minimum, still |

**Therefore, at 5 seconds:**

- **Three beats. Not four.** The reference: 0 to 1.53 (hook), 1.53 to 3.0 (compose), 3.0 to 5.0
  (generate). Roughly 1.5s / 1.5s / 2.0s, the last one longest because it carries the payoff.
- **One hard cut.** Possibly zero. The reference has exactly one, at 1.53s, and one no-cut
  morph at 3.0s.
- **~20 words of on-screen copy, total.** The reference has 4 in the hook, 11 in the prompt (a
  prop, not copy), 1 at the end.
- **One product surface.** You cannot establish two.

**What gets cut at 5 seconds, always:** the logo end card, the CTA, the feature list, the second
product surface, the "before" state, the testimonial, the price.

**Withhold the payoff.** The reference never shows a generated image. It ends on "Generating"
with a spinner, mid-action. That is not a shortcut, it is the point: the film ends where the
viewer's curiosity is highest. Plan the last frame as the moment *before* the reveal.

**Scaling up:** at 10s, add one state to the object, not one beat. At 15s you may add a second
object, and it must be handed to the first (the result the button generated).

---

## Worked example A: the reference, end to end

**Brief:** "5s launch film for an AI image tool."

**Object spine:**

| | |
|---|---|
| Object | the **generate button** |
| t=0 | not born yet. The brand name is typing on black over a living green field. |
| 1.55s | a yellow-green pill sitting at the right edge of a prompt bar |
| 2.73s | thrown left, tumbling, motion-blurred, following the camera pan |
| 3.00s | label fades, width collapses, radius blows out. It is now a dot. |
| 3.25s | a ring pulses off it. The dot is a loading indicator. |
| 5.00s | the dot is a spinner beside the word "Generating" |

**Beat table:**

| Time | Object state | What the viewer learns | Primitives |
|---|---|---|---|
| 0.11 - 1.53 | offscreen; brand name types then untypes | the name, and that this is a tool you talk to | `text` + `typing:33` + `untype:1.03` + `untypeRate:60` + `caret` + `caretHold`; one `bg` window `liquid` |
| 1.53 - 3.00 | button rides the prompt bar; prompt types; camera pans left with it | this is a prompt box, and here is a real prompt going into it | `rect` scrim + `html` UI panel; `text` + `typing:110`; a shared `motion:[{t,x,ease}]` track on every layer of the surface (a pure pan, no push) |
| 3.00 - 5.00 | thrown, bounced, morphed to a dot, ringed, resolved into a spinner | pressing it starts the work. The work is happening now. | `motion:[{t,x,y,rot,ease}]` + `motionBlur:0.16`; `vars:{"--p":[0,1]}` with `varsDelay:1.45`, `varsDur:0.4` driving width/height/radius/label-opacity in CSS; `rect` ring on a scale+opacity track; `text` "Generating" + `html` spinner |

Note what is absent: no logo lockup, no feature grid, no CTA, no second surface, no entrance that
the product did not cause.

## Worked example B: a different product, same grammar

**Brief:** "5s launch film for a voice notes app that turns a recording into structured notes."
(Names, copy and figures come from the real product. Do not invent them.)

**Object spine:**

| | |
|---|---|
| Object | the **record pill** |
| t=0 | a small dark pill with a mic glyph, centered on the note list |
| 0.6s | pressed. It swells and a live waveform runs inside it. |
| 1.6s | the waveform compresses right to left into one bright line as the pill stretches wide and flattens |
| 3.2s | the flattened pill IS a row in the note list. Match cut. |
| 3.4s | the row unfolds downward into a note card |
| 5.0s | title and three bullets typed inside it, held still |

**Beat table:**

| Time | Object state | What the viewer learns | Primitives |
|---|---|---|---|
| 0.0 - 1.6 | pill idle, pressed, swells, waveform runs | it records, and it is recording right now | `component` capture of the real list; `html` pill with `vars:{"--rec":[0,1]}` driving width + glyph swap; `cursor` press |
| 1.6 - 3.2 | waveform collapses to a line, pill flattens and widens; camera pulls back | the recording becomes an item you keep | `motion` track on the pill (scaleX out, height down); `cameraMove:{"move":"workspaceZoomOut"}` |
| 3.2 - 5.0 | match cut onto the row; row unfolds into a card; title + 3 bullets type in; hold 0.6s | it does not transcribe, it structures | hard cut with the pill in the same place and size on both sides; `rect` card on a height track; `text` title `typing:33`, bullets `typing:110`, staggered ~90ms |

Zero hard cuts until 3.2s, and that one is a match cut. Three beats. One surface. The payoff (a
finished, structured note) lands on the last frame and nothing follows it.

The grammar transferred without a single element of the reference coming with it: different
object, different transform, different cut count, different camera. What carried over is the
spine, the diegesis and the budget.

---

## Step 6 - Emit the plan in the format the pipeline already eats

Write `STORYBOARD.md` next to nothing, run the two existing tools, then author. Do not invent a
plan format.

```bash
make storyboard-check SB=<storyboard.md>          # blocks unless every beat has type + onscreen + why
make intent SB=<storyboard.md> D=formats/scene/<topic>.json   # writes <topic>.intent.json
make author-check D=formats/scene/<topic>.json    # inspect verifies the render against that contract
```

The shape below is verified against both tools. Four things matter:
`message`/`audience`/`arc`/`format`/`duration` in the frontmatter, a `type` + quoted `onscreen` +
`why` on every beat, a `becomes:` on every beat, and a `(0s-1.53s)` range in each heading, which is
what `make intent` reads to place its check. **The object spine goes in the frontmatter**, because
anything under a `##` heading is parsed as a beat and will fail the gate.

Under 15s the gate requires the frontmatter to name what holds the film, and takes `threads:` or
`object:`. Declaring `object:` is the stronger claim: it also requires `object_t0` / `object_states` /
`object_last` and an `object:` line on every beat, and it is what the scene-side gate later checks.
Add `threads:` beside it naming your second device, or the gate says so.

Two of those the gate now BLOCKS on, so write them first, not at the end:

- **`becomes:`** is the change at this junction, written as "the X becomes the Y". Under 15s a beat
  without one fails. `object:` says where the thing is; `becomes:` says what it turned into.
  `mechanism:` is neither, it is how the frame moves, and answering with presets ("fade, slide up")
  earns a `becomes-is-a-preset` warning. A preset is not a change.
- **The times are read.** A gap between two beats, or a last beat that stops before the frontmatter
  `duration`, fails as `timeline-hole`. Our three recreations all ended three seconds early on a
  typed claim and demonstrated none of it; nothing caught that, and now something does.

```markdown
---
message: "One sentence, under 18 words, the single thing this film communicates."
audience: "Who it is for."
arc: "one continuous action: <object> <verb>s and becomes <payoff>"
threads: "a transforming object, and an open question the last frame refuses to answer"
object: "the generate button"
object_t0: "a pill at the right edge of the prompt bar"
object_states: "pressed, thrown, morphed to a dot, resolved into a spinner"
object_last: "the dot spinning beside Generating. Payoff withheld."
format: 1920x1080
theme: themes/<brand>.json
duration: 5s
---

## Beat 1: Name (0s-1.53s)
- type: hook
- object: offscreen. The stage is being cleared for it.
- onscreen: "Meet higgsfield.ai"
- mechanism: types at 33 cps, untypes at 60 cps, caret held; background never cuts
- becomes: the empty stage becomes the name, then the name becomes an empty stage again
- why: name the thing, then get out of the product's way
- transition_out: hard cut, carried by the continuous background

## Beat 2: Compose (1.53s-3.0s)
- type: product_surface
- object: the button rides the prompt bar as the camera pans to it
- onscreen: "Generate an image of an astronaut holding glowing green puzzle pieces"
- mechanism: real UI, prompt types at 110 cps, shared pan track on every layer
- becomes: the empty prompt bar becomes a written prompt, and its right edge becomes the generate button
- why: show the actual act of using it, not a claim about using it
- transition_out: no cut. The button keeps moving.

## Beat 3: Generate (3.0s-5.0s)
- type: payoff_withheld
- object: thrown, bounced, morphed to a dot, ringed, resolved into a spinner
- onscreen: "Generating"
- mechanism: motion track with motionBlur, CSS var morph over 0.4s, ring pulse
- becomes: the pressed button becomes a thrown pill, the pill becomes a ringed dot, the dot becomes a spinner
- why: the press has a consequence, and the consequence is the last thing you see
```

Read the three `becomes:` lines on their own: prompt bar → prompt → button → pill → dot → spinner.
That chain is the film. If yours reads as three unrelated sentences, you have three shots and no
action, whatever the `mechanism:` lines promise.

`object:` is an extra field the gates ignore and the next author needs. Keep it.

**Never put an em-dash in the storyboard or the copy.** The validator rejects them on screen and
the repo bans them in prose. Comma, period, or a middle dot.

---

## Step 7 - Anti-slop: kill a bad plan before a frame renders

Run all seven against the beat table. Any failure is a rewrite of the plan, not a note for later.

1. **Reorder test.** Swap beats 2 and 3. If the film still parses, the beats are unrelated and
   you wrote a slideshow. A continuous action cannot be reordered.
2. **Object-death test.** Is there a frame before the last beat where the object is gone? Broken
   spine.
3. **Pixel-jump test.** At each seam, what is in the same place on both sides? No answer means a
   jump cut.
4. **Who-moved-it test.** For every moving element, name the in-world cause. More than one
   "the editor did" means the motion is decoration on a static frame.
5. **Logo end-card test.** If the last beat is a mark and a URL, the film ends where it should
   have started. At 5 seconds a logo is a watermark, not a beat.
6. **Unbacked-claim test.** For each on-screen line, name the UI visible in the same frame that
   proves it. No UI, cut the line.
7. **Payoff test.** Does the last frame answer the question, or sit one moment before the answer?
   Prefer the moment before. If you must show the result, show it for the final 0.6s and cut.

Then, and only then, write JSON.

---

## Where this sits

- [`docs/CRAFT/FILM-STRUCTURE.md`](../../docs/CRAFT/FILM-STRUCTURE.md) is the catalogue this skill
  is one entry in, with the sources and the six questions that pick a register. Read it BEFORE this one.
- [`vawe-video-planning`](../vawe-video-planning/SKILL.md) collects the brief, studies the brand
  and locks the palette, fonts, copy and lock sheet. Run it first. This skill replaces its Step 3
  storyboard for any film under ~15s **whose subject is one thing changing**.
- [`docs/CRAFT/BLUEPRINTS.md`](../../docs/CRAFT/BLUEPRINTS.md) gives the motion *inside* a beat.
  Use it after the spine is fixed, never to choose the spine.
- [`docs/CRAFT/TRANSITIONS.md`](../../docs/CRAFT/TRANSITIONS.md) picks the seam once you know
  the relationship. Here the relationship is always "the X becomes the Y".
- [`docs/CRAFT/DIRECTION.md`](../../docs/CRAFT/DIRECTION.md) is the cross-cutting spine, and
  [`docs/CRAFT/RECREATION.md`](../../docs/CRAFT/RECREATION.md) is the loop for copying a
  specific reference shot for shot.
- [`vawe-effects`](../vawe-effects/SKILL.md) and [`vawe-camera`](../vawe-camera/SKILL.md) pick the
  mechanism per state change.
- After rendering: `make seam-check`, then `make judge`, then the critics in
  [`docs/CRAFT/SUBAGENTS.md`](../../docs/CRAFT/SUBAGENTS.md).
