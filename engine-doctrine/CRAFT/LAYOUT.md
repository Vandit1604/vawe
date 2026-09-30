---
when: placing elements, composing a beat
answers: "one hero · hero fill · asymmetry over centred · whitespace and spacing · grid and thirds · safe zones · archetype by intent · active vs passive whitespace · lead room, visual weight, three planes"
group: look
---

# LAYOUT: composing a frame

Layout is where hand-authored work most often regresses to slop: everything centred, an equal card grid.
Video frames are not pages. Compose asymmetric with one hero, anchored to edges and thirds.

## 0. Video is not the web

- **The eye needs somewhere to travel.** Never a single text block floating in empty space
  (`DENSITY.md`). One hero stays dominant, with proof and structure subordinate.
- **Fill the frame. Hero text is 60 to 80 % of frame width.** You will try web-sized elements. Do not.
  In an old measurement of this library, landscape hero ink sat at a 40 % median. The declared boxes were
  near right and the glyphs filled only two thirds of them: the fix is bigger type, not a wider box.
  The 45 to 75 character measure (section 4) is a body rule and does not apply to display type.
- **Anchor to edges.** Pin content to left or top, or right or bottom. Centred and floating is a web pattern.
- **Split frames, not centred stacks.** Data on the left and content on the right. A metadata bar on top and
  full width below.
- **Use structure.** Rules, dividers and border panels give the eye paths and animate well.
- **Web sizes are invisible on video.** Author at: headlines 64 to 120 px (web 32 to 48), body 28 to 42 px,
  labels 18 to 24 px, decorative opacity 12 to 25 % (web 3 to 8), borders 2 to 4 px, padding 60 to 140 px.
  A font size under 24 px needs a reason. A decorative under 10 % opacity is invisible. An effect nobody can
  see is not restraint.
- **Three planes:** background treatment, midground content, foreground accents. Most films have one.

## 1. One thing dominant

- Make one element the hero by scale contrast: one huge headline and one tiny caption beat three medium
  things. Emphasise with size, then weight, then colour or contrast. De-emphasise secondary text with lower
  contrast, not only smaller size.
- Keep about three levels of hierarchy. More and nothing dominates.

## 2. Asymmetry over centred

- Centred everything is the generic default. Asymmetry (the Swiss tradition) makes tension and a focal
  point: a split (headline left, artifact right), a corner anchor, big-left and small-right.
- Centre only a genuinely symmetric moment: a lone CTA, a single title card.
- Pick one shared edge and commit. Left-align anything multi-line or list-like. Nudge for optical balance:
  circles, icons, italics and punctuation need eye correction, not math-centring.

## 3. Whitespace and spacing

- Start with too much whitespace, then remove. Dense by default looks cheap.
- Space on a scale (8, 16, 24, 32, 48, 64, 96, 128). Any two values are visibly different.
- Less space inside a group, more between groups. Proximity does the work of borders. Reach for
  proximity, similarity or a shared container before a divider line.

## 4. Grid, thirds, safe zones

- A column grid removes arbitrary decisions. Break it only for a deliberate focal moment. Pick an unequal
  pair of spans (4 and 8, 7 and 5): a 6/6 split is the equal grid again.
- Rule of thirds: put the hero on a thirds intersection, not dead centre, with lead room in the direction
  of travel. The most important element moves last. Optical centre sits at about 46 % height.
- Keep essential content inside title-safe, the inner 90 % of the frame. For social, keep key content out
  of the outer 10 to 12 %. Portrait 9:16: anchor the hero in the upper-middle third, the lower third is
  covered by captions and UI. Per-destination strips are in `../RULES/caption-safe-strip.md`. A headline near
  the bottom can collide with a caption band that looks empty in your draft.
- **Body and captions:** 45 to 75 characters a line (about 66 ideal). Display type is exempt (60 px and up,
  or read in one fixation).

## 5. Archetype by intent

Pick by what the beat does, then rotate: no archetype twice in a row. Margins 8 % or more (about 155 px at
1920), 40 to 60 % of the frame stays empty.

| Archetype | Use it when the beat | Note |
|---|---|---|
| Left-aligned macro | states one idea and wants tension | hero on the left third |
| Centred statement | is a lone title, CTA or hero line | only when genuinely symmetric |
| Split (text and artifact) | pairs a claim with a real capture | the workhorse |
| Full-bleed number or statement | is the payoff | strip it bare |
| 3-up card row or flow | shows a process of 3 steps or fewer | staggered, with connectors |
| 2-column feature grid | lists capabilities | cut weak features |
| Quote block | is a testimonial | serif, cite last |
| Asymmetric card over board | wants depth | anchor with intent, never a random float |
| Lower third | labels without stealing focus | over a running artifact |

## 6. Active vs passive whitespace

The empty part of a frame either does a job or is a leftover. Active whitespace is left blank on purpose:
it isolates the subject, directs the eye, gives a line room to land. Passive whitespace is what occurs
between independently placed elements, usually on opposite sides of the frame. It reads as slack, not calm.

Two tests, in order:

1. **Name what the empty area is doing**, in one clause. "It isolates the claim." If the honest answer is
   "it is the gap between the thing on the left and the thing on the right", it is passive.
2. **Ask whether a bigger subject removes it, and the frame improves.** If enlarging the subject eats the
   emptiness and the frame gets better, the space was never working. Active space survives: enlarging into
   it makes the frame worse.

A globe boxed at x 780 on a 1920 frame with copy in the left column left half the frame empty by arithmetic.
The fix was one column: the globe centred, 1200 wide, running past the bottom edge, type above it on the same
axis. A subject the frame cannot contain reads differently from one it can: a cropped sphere is a planet you
are near. Cropping is an active use of the frame's edge and is usually stronger than centring with room to spare.
No check finds a half-empty frame nobody decided. That is for your eyes, per beat.

## 7. Composition for a frame that moves

- **Lead room.** A moving subject needs space in front of it, in the direction of travel. A subject that
  travels toward the edge it is nearest reads cramped for the whole move. Fix it at the start of the shot.
- **Visual weight.** Bright, large, saturated and detailed pull harder than dark, small, muted and plain.
  One large quiet mass balances one small loud one. This is why one accent works and two do not.
- **Leading lines.** A route, a track, an arc or the edge of a capture directs the eye. Ask where each one
  points when the cut comes.
- **The frame edge is a tool.** Containing a subject and cropping it are two different statements.
- **A lone element needs a home:** centre it on the optical centre rather than leave it at a corner.

These are decided when you choose the shot. Moving a layer 20 px later cannot repair them, so put them in the
storyboard.

Sources: Refactoring UI (hierarchy, spacing); Muller-Brockmann, Grid Systems in Graphic Design; Gestalt
(proximity, similarity, common region); Butterick (measure); broadcast title-safe standards; film composition
(lead room, weight, leading lines, three planes) restated for a moving frame; active and passive whitespace
is standard graphic-design vocabulary.
