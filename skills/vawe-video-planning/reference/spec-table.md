---
when: "freezing a video's spec before authoring the JSON"
answers: "the full spec table's fields and the authoring discipline that follows it"
group: skill
---

# The spec table: freeze every decision before authoring

Write the full spec in the reply as a table before touching JSON. Every row is a decision the JSON
will transcribe, not reinterpret.

**Which rows the brief already filled.** If `make dev-tool X=quiz-apply` ran, it wrote orientation, duration,
the arc and `threads:` into the storyboard's frontmatter, and `make dev-tool X=quiz-look` settled the direction
from a drawn panel sheet. Those rows are decided: carry them across rather than re-deciding them
here, and mark the rest as still owed. Everything below the line is the author's: palette, per-beat
copy, the treatment of each image, and every cut's reason.

| Field | Value | Filled by |
|---|---|---|
| Orientation / duration / theme | e.g. landscape · 22s · `themes/preface.json` | the brief (placement) |
| **Taste anchor** (no-site videos) | the reference **`profile`** (`apple`/`linear`/…) + which real site was `vawe_reflect`ed for colour | the brief (anti-reference) |
| **Story spine** | the named arc + each beat's role (hook/build/proof/payoff/CTA) | the brief (job -> arc) |
| Palette + fonts | the exact hexes + face names (from the study OR the profile's reflected reference) | the study |
| Motion personality | `{easing, bounce, settle, enter, stagger}`. From the profile, written into the theme | the profile |
| **Continuity plan** | which 1-2 elements TRAVEL across beats; the one cut family used | the brief (thread) + quiz-look |
| Per beat (one row each) | `t-range · role · exact copy · image/treatment · cut-in (relationship + transition + WHY, per TRANSITIONS.md) · motion · feeling` | you |
| Assets | which real logos / photos / uploads (NOT bare rects), and their treatment | you |
| Sound | bed + cues, or a written `_why` for silence: [`SOUND.md`](../../../engine-doctrine/CRAFT/SOUND.md) §0 has the four-command path | you |
| Captions | timing source, `destination` if this ships to a phone feed, `captionMode`/`captionStyle` if not plain: [`CAPTIONS.md`](../../../engine-doctrine/CRAFT/CAPTIONS.md) | you |
| CTA | the exact end action + url | the brief, when the study found one |

For a no-site video, the first four rows ARE the four manufactured things
(`reference/no-site.md`). If any is blank, the plan is not ready: you have not replaced what a site
would have given, and the output will default to generic. Every per-beat row names its `feeling`
(TASTE-RULES) so `make dev-tool X=direct` can check the effect against the intent.

**Image treatments** to name per beat (don't leave images bare): `ken` (slow zoom), **`edgeFade`**
(white blur dissolving the LEFT+RIGHT edges into the bg, set `edgeFadeColor` to the bg on dark
scenes), clipped card + `radius`, `component` capture of a live UI section. A still image with no
treatment reads as slop.

If a beat needs a decision the spec table didn't make, that's a gap: amend the table before
authoring, don't improvise in the JSON.

## Authoring discipline: from the real thing, not imagination

Four failures that ship "renders-fine but wrong" videos (`engine-doctrine/MISTAKES.md #15`). Do the
opposite:
- **Assets: capture, never recreate.** `make media X=capture` a mark/mascot/illustration, or crop it from
  the section screenshot, into an `image` layer. A brand asset drawn "from memory" is a lookalike,
  not the thing.
- **Placement: `pin`/`col`/`align`, never eyeballed `x`.** `pin:"center"` or `pin:"thirds-*"` places
  a hero; a text layer with `w` MUST also set `align` or it left-aligns and reads off-centre.
- **Annotations bind to their target.** An underline/marker lives in the SAME element as the word it
  marks (an `html` layer, the underline absolutely-positioned under the span), not a blind `x` guess.
- **Fix flaws, don't rationalize them.** Eyeballing frames and catching something off means FIX it.
  Static gates can't see composition or fidelity; your eye is that gate until the vision-judge exists.
