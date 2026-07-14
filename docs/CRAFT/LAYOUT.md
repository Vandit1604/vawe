# LAYOUT — composing a frame

Layout is where hand-authored work most often regresses to slop (centered everything, equal card grid). This is
how to place layers and compose an `html` layer with intent.

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

## 6. Rotate archetypes (anti-monotony)
No layout archetype twice in a row: split · centered-top with full-width artifact · full-bleed statement ·
asymmetric card-over-board. The storyboard names each beat's archetype. (See [../MOTION-CRAFT.md](../MOTION-CRAFT.md)
for the rhythm side; the `impeccable` skill flags centered-default tells.)

**Sources:** Refactoring UI (hierarchy, spacing, layout); Müller-Brockmann *Grid Systems in Graphic Design*;
Gestalt principles (proximity, similarity, common region); Butterick (measure); broadcast title-safe standards.
