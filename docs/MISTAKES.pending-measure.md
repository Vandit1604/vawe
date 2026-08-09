# Pending entry for docs/MISTAKES.md (append serially)

## #NNN — the gates measured the box the author asked for, not the ink the frame carries (a fifth #214)

**What.** Four separate reproductions, all in gates, all the same shape.

1. A text layer 1200px wide reading "Hi" hard-failed `overlap 400x50px` against a neighbour whose
   glyphs start 700px away. Nothing on screen touches. `pin` centres a box, so a placed line HAS to
   declare a `w`, and that `w` is a wrapping width the copy does not fill.
2. `make validate` reported `layers[4].html contains an em-dash` and quoted
   `/* frosted pane — near-opaque */`. That is a CSS comment inside an `html` layer's inline
   stylesheet. It is not on-screen text, and the rule is "no em-dash in on-screen text".
3. A `group` declaring `h:400` around a 30px label reported its extent as
   `[safe] hs-group "small" — (200,800,266,1200)` and hard-failed the safe zone on 360px of empty
   air. `h` sizes the element; nothing need be painted in it.
4. `[contrast] "02 · motion, GPU-p" — 30px 1.1:1` on `motion-reel-v2` f530, and three more like it on
   `zerochrome` f55. All false. The caption is grey on the near-black field and perfectly legible; the
   probe sampled the backdrop at the CENTRE of the layer's declared box, which for a left-aligned line
   is empty slack sitting over a completely different surface (a purple gradient card).

**Root cause, one rule read wrongly in five places.** A layer's `w`/`h` is a request. On a rect, an
image or a component the engine honours it as the painted size, so there the box IS the ink. On a
text layer `w` is a wrap width and `align` decides where inside it the glyphs land; on a `group` `h`
is a container height; on an `html` layer neither is the content. Every check that formed a verdict
from `getBoundingClientRect()` was therefore answering a question about the JSON.

Two of the five were once correct and expired:

- The safe-zone walk deliberately used the INK horizontally and the BOX vertically, because a text
  ink is a line box that can overhang the border box by the font's half-leading. #242 moved
  `clampToBox` INSIDE `inkRect`, so an ink rect is now always a subset of the border box and the
  overhang is impossible. The clamp made the axis split obsolete and left it standing, and that
  leftover is the whole of defect 3.
- The scene-collision lint estimated a text layer's height as `size * 1.3`. The engine sets
  `line-height: 1.04` on `.hs-text` (`formats/scene/scene.css`). 1.3 is nobody's number: it gave every
  headline a phantom band a quarter of a line deep, and that band is what "collided" with the caption
  under it.

**Fix.**

- `verify/audit.mjs`: the ink helpers (`paintsBox` … `inkRect`) move above their consumers, and
  `info` (which feeds overlap · tight · top-heavy · display-type contrast · image contrast) is built
  from the clamped ink rather than the border box. The safe-zone walk uses the ink on BOTH axes. Both
  contrast probes (`checkSpan` and the per-element loop) sample the backdrop under the glyphs. Because
  `inkRect` is clamped, an ink rect can only ever shrink a measured box, so overlap · tight · safe can
  only lose a finding, never gain one.
- `verify/audit.mjs`: the display-type (7:1) rule judged the single largest text on the frame. The bar
  is a fact about how big type reads against a field, so it belongs to every element that IS big type.
  Picking a winner meant a headline's verdict was decided by whether it had a bigger neighbour: an
  80px headline at 3.3:1 was a hard `weak-headline` alone on the frame and reported by nothing at all
  once a 90px sibling arrived.
- `core/validate.mjs`: `noEmdash` now reads `onScreenText(s)`, which strips `<style>`/`<script>`
  blocks, HTML comments and tags (so attributes go too) before looking. The tag pattern requires a
  letter straight after `<`, so plain prose and `<b>`-marked copy are untouched. The message quotes the
  RENDERED text around the offence instead of the first 48 characters of source, which for a long
  fragment did not contain it.
- `core/validate.mjs`: the scene-collision lint derives a text layer's box from the STRING (glyph count
  times size times an average advance of 0.55em, clamped to `w`, placed by `align`) instead of from
  `w`, and uses the engine's own 1.04 line-height. Width only: dividing the run by `w` to guess a
  wrapped line was written, measured and removed, because at 0.55em a short word in a narrow column
  reads as wrapping when it does not, and the guessed second line reached into the caption below and
  added 11 warnings about headings that fit. A gate that manufactures a defect is worse than one that
  misses it, so the height under-states.

**Every consumer, fixed or cleared.** `getBoundingClientRect` in `verify/audit.mjs`, all 16:

| Site | Verdict |
|---|---|
| `paintsOwnBox` (x2) | cleared: a ratio of two boxes, asking "does a child FILL this layer" |
| `svgInk` others | cleared: `<text>/<image>/<use>` have no outline to sample; the box is the honest fallback |
| `clampToBox` | cleared: the clamp target IS the border box by definition |
| `inkRect` Range | cleared: that call IS the ink |
| `els` filter | cleared: an existence guard, not a measurement |
| `info` | **fixed** |
| safe-zone walk | **fixed** |
| tiny-image | cleared: an `<img>`'s box IS its raster |
| tiny-text width guard | cleared: an existence guard |
| `buried` | cleared: already `inkRect(el) || box`, fixed by #242 |
| per-element contrast | **fixed** (probe point) |
| `checkSpan` | **fixed** (probe point; it is handed a whole LAYER when the layer is headline-scale) |
| `overlayFn` | cleared with a caveat: it draws the debug overlay, not a verdict. It still outlines border boxes, so the overlay is now looser than the rule. Worth aligning. |

`textContent` in `verify/audit.mjs`, all 4 remaining: safe-zone label, `buried` label, per-element
contrast label and `checkSpan`'s emptiness test are now `inkText`. The last of those was a GATE, not
just a label, and `checkSpan` is called with a whole layer, so a layer carrying only an inline
stylesheet passed its emptiness test on its own CSS source.

Declared geometry outside the audit: `scripts/gates/scene-timing.mjs` reads `L.w`/`L.h` on RECTS
(cleared: for a rect the declaration IS the paint), `scripts/gates/critique.mjs` and
`direction-floor.mjs` read `l.size` as an authoring signal rather than a geometric verdict (cleared),
`snap-signature.mjs` and `motion-audit.mjs` use `textContent` as a fingerprint or a label (cleared).
`core/validate.mjs` `layoutErrors` is a rule ABOUT the declaration ("a centring keyword with nothing
to centre") and is correct by nature (cleared).

**Library diff, 149 scenes.** 125 identical. 16 finding lines removed, 24 added. Verdicts:
70 FAIL→FAIL, 35 OK→OK, 35 WARN→WARN, 7 CRASH→CRASH (non-scene sidecars, unchanged), plus two moves:

- `example-product-promo.beatsync.json` WARN → FAIL, `[weak-headline] "free at your.app" 56px at 2.9:1`.
  Not a new defect: `example-product-promo.expanded.json`, the SAME film, already emitted that exact
  line and already hard-failed on it in the before run. The beatsync cut escaped only because a bigger
  text happened to share frame 469. The bug was its absence.
- `showcase-aspect.json` OK → WARN, `top-heavy`. Warn tier. The composition rule now measures where
  the glyphs end rather than where the declared boxes end, so the dead bottom is reported honestly.

`make validate`: 131 ok / 3 failed before and after (the 3 are missing VO/spectrum files, untouched).
Collision warnings 52 → 43; 14 false ones dropped, 5 pairs surfaced that the "full containment is
intentional" escape had been hiding, because two stacked lines sharing one declared `w` looked like a
chip inside a card.

`node scripts/gates/scene-snap.mjs scene`: IDENTICAL, 25 frames. No rendering changed.
`make probe`, `make lib-test` (577), `make lint-test`, `make schema-check`, `make audit-test`: pass.

**Which gate now catches it.** `verify/measure-regression.mjs`, run by `make audit-test`. Three
fixtures, one per reproduction, each of which hard-failed the audit before the fix and is asserted
clean (or, for the headline case, asserted to fire on the SECOND headline) after it. Verified by
reverting `verify/audit.mjs` to HEAD: all three assertions fail. `make lint-test` gains the matching
assertion for the validator: declared boxes that overlap only in empty slack must stay silent.

`verify/fixtures/lint-bad.json` had to change, and that is worth saying plainly rather than burying.
Its collision pair was "scene A body" / "scene B body", two 12-character lines at 40px in 800px boxes,
300px apart. Measured honestly they are about 264px wide and do not touch: the fixture pinned a FALSE
POSITIVE. The copy is now long enough to fill the boxes, so the fixture pins a collision that would be
on screen.

**Class.** Gate gap, and the fifth logged instance of one rule. #214 found `<style>` source counted as
glyphs in the overlap check and fixed that call site; #216 was the same bug in clipped-text; #217 was
two more consumers; #242 was the ink clamp living at one call site while `buried` read it raw. The
shape is always the same: a measurement primitive is corrected where it was noticed and left alone
everywhere else, and the untouched half looks exactly like the finished half until something trips it.
The counter-measure that was missing every time is not a comment. It is a test that fails on the old
code, which is why this entry ships with one.
