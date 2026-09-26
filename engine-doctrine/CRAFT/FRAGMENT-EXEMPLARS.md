---
when: you want to see the stage kit used well before writing a fragment from scratch
answers: four worked fragments, one archetype and one theme each, and what each one deliberately refuses
group: look
applies-when: hasHtml
confirm: "does the new fragment name what it refuses, the way each exemplar below does?"
---

# Fragment exemplars: four archetypes, one theme apiece, one kit

[`HTML-FRAGMENTS.md`](HTML-FRAGMENTS.md) describes the stage kit the fragments below are built from.
These four exist to be looked at, not just read: an author copies what they can SEE, and a bare
description of "asymmetry" or "scale contrast" does not fix a habit a picture will. Each one is built
from `make stagekit`'s real output for its own theme (nothing hand-tuned past the kit), passes `make
preview HTML=<file> THEME=<theme>` clean, and states what it refuses in its own header comment as well
as here.

Preview any of them yourself:

```bash
make preview HTML=films/scene/demo-frag-asymmetric-split.html   THEME=linear
make preview HTML=films/scene/demo-frag-instrument-face.html    THEME=plinth
make preview HTML=films/scene/demo-frag-oversized-statement.html THEME=satara
make preview HTML=films/scene/demo-frag-data-object.html        THEME=ledgerline-neon
```

## `demo-frag-asymmetric-split.html`: theme `linear`

**Archetype:** Split (text | artifact), LAYOUT.md §6, the workhorse. A 4/8 `kit-grid`, headline and one
supporting line on the left, a single settled object (a release-gate readout) on the right.

**Does:** one accent colour used exactly once (the `9/9`, in `kit-accent`), a tabular `kit-stat` for the
number that matters, three rows of real-shaped data (a check name, a duration, a result) under one
`kit-divider` rather than as a second card.

**Refuses:** a centred hero (LAYOUT.md §2: centred is the generic default); a 6/6 split (an equal split
answers "these two matter the same," which is never the true claim for a claim-plus-evidence beat); a
second accent hue for the pass/fail rows (`--up`, already a theme token, carries that instead); an icon
tile per check (the detector's `icon-tile` tell).

## `demo-frag-instrument-face.html`: theme `plinth`

**Archetype:** a dense instrument face: several readouts in one frame, none of them competing.

**Does:** a 7/5 grid (the primary gauge earns more than half, on purpose), a DESCENDING type scale
inside the 5-column (56px, then 40px) so the two secondary numbers visibly recede rather than repeating
the primary's weight; one Instrument Serif line, upright and small, for the one quoted accent
(TYPOGRAPHY.md §2: one expressive face, used once); `.kit-panel` (fill only) for the primary readout
instead of `.kit-card`, because on this theme `--surface` sits too close in luminance to `--text-2` for
a bordered card's caption text to clear WCAG contrast (`make preview` caught this: swapping to the
quieter, `--surface-2`-backed panel fixed it without touching a single colour).

**Refuses:** three equal stat tiles (the default this archetype most wants to fall into); an icon per
gauge; an italic serif hero (the detector's `italic-serif-hero` tell); a second accent colour for the
secondary numbers (they de-emphasise by size and colour token, `--text`/`--text-2`, never by inventing
a new hue).

## `demo-frag-oversized-statement.html`: theme `satara`

**Archetype:** full-bleed number/statement, the payoff beat. "Strip it bare, let it breathe"
(LAYOUT.md §6).

**Does:** exactly two focal points (an eyebrow top-left, a caption bottom-right, LAYOUT.md §0: "never a
single text block floating in empty space") on opposite thirds, so the eye has somewhere to travel; one
accent word inside the hero line rather than a second sentence; nothing else in the frame. The hero uses
`.kit-hook` UNCHANGED, because that size is already calibrated (`theme-contract.js scaleFromMotion`,
regressed off seven real hand-authored looks) to fill 60-80% of frame width on its own; the only
discipline this exemplar had to hold was not fighting that with a box.

**Refuses:** a card, a border, or a grid of any kind; a second size fighting the hero for attention; a
CTA or a logo (a payoff beat that adds a fourth element dilutes the one it's making).

## `demo-frag-data-object.html`: theme `ledgerline-neon`

**Archetype:** a real data object: a bank-feed-to-books reconciliation, matched by amount and date, not
by the memo string.

**Does:** ONE `.kit-panel` with an internal `kit-divider` for the two ledgers, not two side-by-side
`.kit-card` boxes: a matched pair is one object with two views, and two bordered cards side by side is
exactly the equal-grid tell this whole pass exists to correct (`post-postmark.scene2.html`, before this
pass, made this exact mistake with two typefaces). One accent hue (`--up`, lime) marks a match; `--down`
marks the one flagged row; tabular numbers throughout so the amounts align down the column without a
table element.

**Refuses:** two bordered cards; a status icon per row (the amount colour already carries the status); a
second accent hue for "flagged" (the theme's own `--down` token already means that); a literal amount
format invented for this fragment (the mono face and `tabular-nums` come from the kit, unchanged).

## What the four have in common, and why that is the point

None of them share a layout. All four share: one hero decision per frame, an unequal split where a
split exists, at most one accent colour doing work, and a named refusal. A kit that produced four
identical-looking fragments, one per brand, would have failed at the one thing it exists for: every theme
(`ls themes/*.json | wc -l`) needs its own kit, not one kit reused across colours, and a fragment built from the kit should still look like a
decision, not an assembly.
