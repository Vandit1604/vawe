---
when: placing layers, composing a beat
answers: grid · one hero · asymmetry vs centered · archetype→intent · safe zones · active vs passive whitespace
group: look
---

# LAYOUT — composing a frame

Layout is where hand-authored work most often regresses to slop (centered everything, equal card grid). This is
how to place layers and compose an `html` layer with intent.

## 0. Guardrails: you build for the web. Video frames are not pages.

Borrowed close to verbatim from the reference system's
`another engine-creative/references/video-composition.md` and `motion-principles.md`. Read those before
arguing with these.

- **Two focal points minimum per scene.** *"The eye needs somewhere to travel. Never a single text block
  floating in empty space."* That single floating block is what [DENSITY.md](DENSITY.md) calls the slide
  tell, said from the composition side.
- **Fill the frame. Hero text: 60 to 80% of frame width. You will try to use web-sized elements. Don't.**
  Measured on our landscape films the hero ink averages **44.7%**, and **79% of frames sit below the 60%
  floor**. See the measure contradiction flagged in [TYPOGRAPHY.md](TYPOGRAPHY.md) §4 before you fix this
  by widening a text box: §5 below repeats the 45-75 character rule with no exemption for display type,
  and that rule is one mechanical route to 44.7%.
- **Anchor to edges.** *"Pin content to left/top or right/bottom. Centered-and-floating is a web layout
  pattern."* This is §2 below, stated as an accusation rather than as a tradition.
- **Three layers minimum per scene.** Background treatment, foreground content, accent elements. This is
  the same three-plane depth rule this file already carries at the bottom, and most films here have one
  plane.
- **Background is not empty.** *"Pure solid #000 reads as 'nothing loaded.'"*
- **Split frames, not centered stacks.** *"Data panel on the left, content on the right. Top bar with
  metadata, full-width below."*
- **Use structural elements.** *"Rules, dividers, border panels. They create paths for the eye and animate
  well."* In this engine that is a `rect` with a `motion` track on `w`, or `parts` with `drawOn`.
- **Web sizes are invisible on video.** Their table, which is the register to author at:
  headlines 64-120px (web 32-48) · body 28-42px (web 14-16) · labels 18-24px (web 12) · decorative opacity
  12-25% (web 3-8) · borders 2-4px (web 1) · padding 60-140px (web 16-32). *"If you're writing a font-size
  under 24px in a video composition, justify it. If you're writing decorative opacity under 10%, it's
  invisible."* [TASTE-RULES.md](TASTE-RULES.md) already names the same failure from the other end and
  calls it **the invisible effect**: if it does not read at its size and duration, it is not a feature.
  An effect nobody can see is not restraint.

## 1. One thing dominant — scale contrast
- **Make ONE element the hero** via *scale contrast*: one huge headline + one tiny caption beats three medium
  things. Emphasize with **size, then weight, then colour/contrast**; de-emphasize secondary text with lower
  contrast (`text2`/`dim`), not just smaller size.
- **Hierarchy has ~3 levels max** (primary / secondary / tertiary). More and nothing dominates.

## 2. Asymmetry over centered
- **Centered-everything reads as the generic default.** Asymmetry (the Swiss tradition) creates tension and a real
  focal point. Use a split (headline left / artifact right), a corner anchor, or a big-left/small-right balance.
- **Center only** a genuinely symmetric moment: a lone CTA, a single title card, one hero line on an empty field.
- **Alignment:** pick ONE shared edge and commit; fewer alignment lines read cleaner. **Left-align anything
  multi-line or list-like; center only short isolated blocks.** Nudge for *optical* balance (circles, icons,
  italics, punctuation need eye-correction, not math-centering).

## 3. Whitespace and the spacing scale
- **Start with too much whitespace, then remove.** Negative space is an active element; dense-by-default looks
  cheap. Give the hero room to breathe.
- **Space on a scale, not arbitrary px** — e.g. 8 · 16 · 24 · 32 · 48 · 64 · 96 · 128. Any two values should be
  *visibly* different. (Design tokens live in `core/tokens.css`.)
- **Relative spacing signals grouping** — *less* space inside a group, *more* between groups. Proximity does the
  work of borders (Gestalt). Reach for proximity / similarity / a shared container (`group`, a card) before a divider line.

## 4. Grid, focal point, the eye
- A **column grid** removes arbitrary decisions and reads as competence; break it only for a deliberate focal
  moment, never by accident.
- **Rule of thirds:** place the hero on a third-line intersection, not dead-center, and leave lead room in the
  direction of gaze/motion to guide the eye. Motion order = reading order (the most important element moves last).
- **Composition is built into placement** (resolves per aspect, deterministic): `pin:"thirds-tl|thirds-br|…"`
  drops a layer on a power point; `pin:"center"` uses OPTICAL center (~46%, reads centered); `col:"2-7"` places
  it on a 12-column grid (sets x + w). Reach for these instead of eyeballed px — well-composed by default.

## 5. Video safe zones (this engine)
- Keep essential text/hero inside **title-safe ≈ inner 90%** of the frame; for social keep key content out of the
  outer ~10-12% (captions/UI overlap there). `make audit` enforces the safe box (`SAFE` / `SAFE_LAND`).
- **Portrait 9:16:** anchor the hero in the **upper-middle third** (the lower third gets covered by captions/UI).
- **Landscape 16:9:** hero on a thirds intersection, never hugging edges.
- **Measure:** set text-layer `w` so lines are 45-75 chars (~66 ideal); full-bleed text loses the return sweep.

## 6. Archetype → intent (pick by the beat's job, then rotate)

No layout archetype twice in a row; the storyboard names each beat's archetype. Pick it by what the
beat is *doing* (see [STORY.md](STORY.md) for the beat role), not by habit. Margins ≥ 8% (~155px at
1920); 40–60% of the frame stays empty.

| Archetype | Reach for it when the beat… | Note |
|---|---|---|
| **Left-aligned macro** | states one idea, wants tension | the anti-centered default; hero on the left third |
| **Centered statement** | is a lone title / CTA / single hero line | only when genuinely symmetric (rule §2) |
| **Split (text \| artifact)** | pairs a claim with a real UI capture / image | headline left, artifact right; the workhorse |
| **Full-bleed number/statement** | is the payoff — one big stat or line | strip it bare; let it breathe |
| **3-up card row / flow** | shows a process (how-it-works, ≤3 steps) | cards + connectors, staggered |
| **2-col feature grid** | lists capabilities (a Build/FAB beat) | quick staggered fades; cut weak features |
| **Quote block** | is a testimonial / pull-quote | serif, cite fades last |
| **Asymmetric card-over-board** | wants depth — a card floating over context | anchor with intent, never random-float |
| **Lower-third** | labels/annotates without stealing focus | over a running artifact |

(See [../MOTION-CRAFT.md](../MOTION-CRAFT.md) for the rhythm side; the `impeccable` skill flags
centered-default tells.)

## Active vs passive whitespace

**The empty part of a frame is either doing a job or it is a leftover, and those look completely
different to a viewer.** Design writing names the two:

- **ACTIVE** whitespace is deliberately left blank to do something: isolate the subject, direct the
  eye, give a line room to land, hold a beat.
- **PASSIVE** whitespace is what merely *occurs* between elements. It usually comes from placing things
  independently, most often on opposite sides of the frame, and it reads as slack rather than as calm.

A film composed of passive space does not read as minimal. It reads as unfinished, because nothing in
it is claiming the emptiness.

### The two tests, in order

**1. Name what the empty area is doing.** In one clause. "It isolates the claim." "It gives the globe
somewhere to be." If the honest answer is *"it is the gap between the thing on the left and the thing
on the right"*, it is passive and it is not composition.

**2. Ask whether making the subject bigger removes it, and whether the frame improves.** If enlarging
the subject eats the emptiness and the frame gets better, that space was never working. Active space
survives this test: enlarging the subject into it makes the frame worse, which is the proof it was
load-bearing.

The second test is the one that decides, because the first is easy to pass with a sentence you invented
after the fact.

### How this actually goes wrong here

Not by anyone choosing to leave space. It goes wrong by placing the subject in one box and the type in
another and never looking at what is between them:

> `showcase-flight-globe` had the globe boxed at x 780 on a 1920 frame with the copy in the left
> column. Half the frame was empty and it had not been composed, it was arithmetic left over from two
> independent placements. The fix was one column: the globe centred at 1200 wide and running past the
> bottom edge, with the type above it on the same axis. The emptiness that remains is above and around
> the type, and it has one job.

That fix carries a second rule worth keeping: **a subject the frame cannot contain reads differently
from one it can.** A sphere that fits entirely inside the frame is an object on a page. One cropped by
the edge is a planet you are near. Cropping the subject is an active use of the frame's boundary and it
is usually stronger than centring it with room to spare.

### What no gate will tell you

There is none for this, and there probably cannot be: `make audit` measures overlap, clipping, safe
zones and contrast, all of which are about content COLLIDING, and none of which fires on a frame that
is half empty because nobody decided anything. `pace-check` measures time, not space. This is `make
judge` and your eyes, and the question to ask the sheet is the first test above, per beat.


## The rest of the composition vocabulary, for a frame that MOVES

Active/passive whitespace above is the one that caught us. These are the neighbours, and each is
written in the form it takes here rather than the form a photographer uses, because our frame changes
and theirs does not.

**LEAD ROOM.** A moving subject needs space in FRONT of it, in the direction of travel. A photograph
wants this so the subject is not about to hit the edge; a film wants it more, because the subject is
genuinely going there and the eye is already ahead of it. The version that bites here: a subject that
travels toward the edge it is nearest reads as cramped for the whole of the move, and the fix is at the
START of the shot, not the end.

> Directly relevant and not yet applied: the aircraft in `showcase-flight-globe` flies west to east
> across a centred globe. It has no lead room by construction, because the globe is centred and the
> route ends near the limb. Worth a pass.

**VISUAL WEIGHT.** Bright, large, saturated and detailed all pull harder than dark, small, muted and
plain. Balance is not symmetry: one large quiet mass balances one small loud one. This is why a single
accent works and two do not, and it is the same argument as one bright thing per frame.

**LEADING LINES.** A line in the frame directs the eye whether or not you intended it. Ours are usually
literal: a route, a track, an arc, the edge of a captured UI. Ask where each one points and whether that
is where you want the eye when the cut comes.

**THREE PLANES.** Foreground, middle, background. Depth comes from having all three doing something,
and most films here have exactly one: a subject on a flat field. A backdrop that moves is the cheapest
second plane, which is one more reason the bg is a required field.

**THE FRAME EDGE IS A TOOL.** Covered above under cropping, and it belongs to this list: containing a
subject and cropping it are two different statements, not a tidy version and a sloppy one.

### Why these are in the storyboard, not the audit

Every one of them is decided when you choose the shot, and none of them can be repaired later by moving
a layer twenty pixels. `storyboard-check` asks for `shot:`, `camera:`, `picture:` and `placement:` for
exactly this reason: the composition is a plan, and the JSON transcribes it.


**Sources:** Refactoring UI (hierarchy, spacing, layout); Müller-Brockmann *Grid Systems in Graphic Design*;
Gestalt principles (proximity, similarity, common region); Butterick (measure); broadcast title-safe standards;
lead room, visual weight, leading lines and three-plane depth from the standard film-composition
literature (Filmmakers Academy, storyboardart.org, wolfcrow), restated for a frame that moves;
active/passive whitespace is standard graphic-design vocabulary (Depositphotos, AND Academy, Think Design all draw
the same line), applied here to a moving frame.
