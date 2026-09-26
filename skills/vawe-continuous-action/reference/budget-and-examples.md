---
when: "budgeting a continuous-action film's seconds, or wanting a worked example"
answers: "the measured cost-per-second table and two worked object spines end to end"
group: skill
---

# The 5-second budget and two worked examples

Every number below is read off `films/scene/higgsfield-recreation.json`, which was measured frame by
frame from the reference.

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

Same shape as example A's beat table: three beats (0.0-1.6 record, 1.6-3.2 collapse into a kept item,
3.2-5.0 match-cut onto the row and unfold into a structured note), zero hard cuts until 3.2s where the
one cut is a match cut, one surface, and the payoff (a finished, structured note) lands on the last
frame with nothing after it.

The grammar transferred without a single element of the reference coming with it: different
object, different transform, different cut count, different camera. What carried over is the
spine, the diegesis and the budget.
