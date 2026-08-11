---
when: "you are about to extend the bands shader, add a uniform to core/shaders-ambient.js, or trust a fidelity score"
answers: "what broke while fitting refs/colonnade/c6.jpg: a silent parameter drop, a wrong enum index, a zoom that was not the identity at 1, and a pixel metric that preferred the wrong picture"
group: look
title: Mistakes pending, c6
what: Findings from the pass that added the gradient axis, the palette ramp, the light shapes and the zoom to the bands shader. To be folded into docs/MISTAKES.md.
---

# Mistakes pending, from the c6 pass

Not yet in `docs/MISTAKES.md`; another agent holds that file this pass. Every one of these is
framework class, not authoring class.

## A. A new parameter vector that the test harness silently dropped, three times running

**What.** The `bands` branch grew from two parameter vectors to six. Each time one was added, the
first render with it looked exactly like the render without it, and each time the shader was blamed
first. `params5` reported that the within-band shading dial did nothing, so the fit chose zero for it;
`params6` reported that the ring and star modifiers did nothing, so both were nearly cut for looking
broken. Neither was broken. The measurement harness passed arguments positionally and had not been
extended, so the last vector was `undefined` and the shader saw four zeros.

**Root cause.** A positional argument list that ends in optional vectors fails SILENTLY when a caller
is one short. `draw(fx, time, seed, palette, intensity, params, params2, …)` is now eleven positions
long, and every new one is a place a caller can be quietly wrong.

**The tell to remember.** A brand-new dial that has NO effect at its first value is a plumbing bug
until proven otherwise. It is almost never the maths. Prove the value arrives before you tune it: draw
two frames with the dial at its extremes and diff the bytes, and if they match, the dial is not
connected.

**Fix, and what is still owed.** The harness was corrected. The real fix is for `draw` to take one
object rather than eleven positions, so a missing key is a missing key rather than a shifted list.
That is a change to a shared signature with other callers and belongs in its own pass.

## B. An enum whose position was not its value, and every shape drew a different shape

**What.** `core/generators.js` offered `lightShape: round | oval | bar | cross | rounded | sweep` and
sent `LIGHT_SHAPES.indexOf(name)` straight to the shader. The shader's numbering is
`0 round/oval · 1 bar · 2 rounded · 3 cross · 4 sweep`, because `round` and `oval` are ONE distance
function with a different second radius. So `oval` drew a bar, `bar` drew a rounded box, `cross` drew
a sweep, and every one of them looked like a deliberate lighting choice.

**Root cause.** Two lists that agree by coincidence rather than by construction. The name list has six
entries and the shader has five values; a list cannot encode a many-to-one mapping.

**Why it was nearly missed.** Each wrong shape was a plausible picture. Nothing threw, nothing looked
empty, and the contact sheet read as "these all work" until the labels were checked against the cells
one at a time. This is the worst failure mode a mapping can have and it argues for the same rule the
harvest section already states about silent substitution: a mapping between two vocabularies must be a
TABLE with both sides written down, never an index into one of them.

**Fix.** `const LIGHT_SHAPES = { round: 0, oval: 0, bar: 1, rounded: 2, cross: 3, sweep: 4 }`, with the
name list derived from its keys, and `render` throws on a name that is not in it.

## C. A zoom of exactly 1 was not the identity

**What.** `zoom` was added as `if (u_p6.w > 0.0) q = (q - c)/u_p6.w + c`. The generator sends `zoom: 1`
by default, so the guard passed, and `(q - c)/1.0 + c` is not bit-for-bit `q`. Separately, the
anti-alias window was widened by a formula keyed on the zoom that gave `0.44` at zoom 1 where the
shipped constant was `0.35`. Both meant that a card which had not been touched drew a different
picture from before.

**Root cause.** Treating "the dial is set" and "the dial does something" as the same question. A dial
whose neutral value is 1 has TWO neutral values, 0 meaning unset and 1 meaning explicitly neutral, and
both have to be exact.

**Fix.** `if (u_p6.w > 0.0 && u_p6.w != 1.0)`, and the softening widens only BELOW 1, as `0.35/zoom`,
so zoom 1 lands on the old constant by construction rather than by a fitted coefficient.

**How it was caught.** A snapshot that renders the `bands` CARD from its own declared defaults and
compares the hash against the old parameter vector. Every gate in the repo was green while this was
wrong, because no committed scene uses the effect and the card has no baseline.

## D. The pixel metric preferred a softer picture than the reference

**What.** Mean per-channel error against `refs/colonnade/c6.jpg` bottoms out at 14.2 and rises for
every setting that increases contrast toward the reference. Swept over convergence, the metric picked
`0.10` while the reference measures `0.112`; swept over the stop colours, refitting the centre band to
match exactly made the whole-image score WORSE, from 14.4 to 19.3.

**Root cause.** An L1 average over a whole frame is minimised by a blur. Where the picture has a hard
feature the average is cheaper to satisfy by splitting the difference than by putting the feature in
the right place, so the number rewards a wash.

**What follows.** The number is evidence and never the verdict, which this repo already says about
`ember` and said again here. The setting that was shipped is the one that looked right beside the
reference, and where the metric disagreed by less than a point the metric was overruled and the
disagreement written down in `docs/LIGHTFIELD.md`.

## E. A backtick in a shader comment, for the fourth time

**What.** A comment inside `FRAG` was written as ``so `count` keeps meaning bands``. `FRAG` is a JS
template literal, so the backtick closed the string. The failure surfaced as `PAGEERR Unexpected
identifier 'count'` from the browser, not as an error at the edit.

**Why it is worth a fifth note.** The existing warning describes the symptom as a hang with an empty
log. This time it was a parse error in the page. Same cause, different symptom, so the symptom is not
the thing to recognise: the RULE is that no comment between `const FRAG = \`` and its closing backtick
may contain one, whatever it looks like when it goes wrong.

**A cheap check.** Slice the source between the two delimiters and count backticks. Four lines, and it
would have caught every instance.

## F. `schema-drift.mjs --write` reformats the file it maintains

**What.** The gate correctly reported three new props missing from `formats/scene/schema.json`.
Running its own suggested fix produced a 383-line diff: 21 insertions and 362 deletions, because the
writer emits each array on one line and the committed file has them expanded one key per line. The
content was identical.

**Root cause.** The file in the tree is not in the format the generator emits, so every regeneration
looks like a rewrite and the real change is invisible inside it. The generator's own comment says it
splices by anchor rather than re-serialising "so that every regeneration does not look like a
rewrite", which is exactly the goal it misses one level down.

**What was done instead.** The three entries were added by hand in the file's existing format. The
gate compares parsed JSON, so it passes either way, which is why the drift went unnoticed.

**Owed.** Either the writer should emit the committed format, or the committed file should be
regenerated once so the two agree. Not done here: the file is shared and a 362-line reformat in this
branch would collide with anyone else editing it.

## G. One deliberate behaviour change, stated plainly

`u_p2.yz`, the band field's centre, was read as raw coordinates and is now read as a FRACTION OF THE
FRAME with the x half multiplied by the aspect inside the shader. Zero is still the middle, so an
unset vector is unchanged, and no committed scene sets it: the grep is `params2` across
`formats/scene/*.json`, which returns only `schema.json` itself.

It was done in the shader rather than in the generator, against the instruction to keep the mapping in
the generator, and the reason is that the generator does not know the aspect of the canvas the layer
lands on. Baking `16/9` into the mapping would make `shapeOriginX: 25` mean a different place on a
portrait canvas than on a landscape one, silently. That is the conflict; it is named rather than
forced, and the alternative is available if the aspect-independence is not wanted.

## Owed: there is no snapshot for the shader effects

Findings A and C were both caught by throwaway scripts written for this pass and deleted with it: one
that shoots all eighteen ambient effects at two clocks with and without a palette and prints a hash
per shot, and one that shoots the `bands` CARD from its own declared defaults. Between them they are
the only thing standing between "the seventeen are unchanged" as a proof and as a claim, and neither
lives in `scripts/gates/`. Until one does, the next person to add a uniform to
`core/shaders-ambient.js` has to write it again, and finding C says plainly what happens when nobody
does: every gate stays green while a shipped card draws a different picture.
