# House style — creed

> The persisted **Design Read** for creed. The planning skill reads this FIRST so taste isn't
> re-derived each video and every render stays on-brand. The measured block is auto-filled from
> `themes/creed.json` (regenerate with `make house-style NAME=creed`); the judgment
> lines below are yours to sharpen from the site study (`make sections`/`make lookbook`).

## Measured facts
<!-- MEASURED:START (auto-filled from themes/creed.json — safe to regenerate) -->
- **Dominance:** light-first (bg `#f9f9f8`, luma 0.98)
- **Faces:** sans `Geist` · serif `Geist` · mono `Geist Mono`
- **Palette (use ONLY these):** bg `#f9f9f8` · text `#1f1f1a` · accent `#2563eb` · up `#1a9e57` · down `#e5484d`
- **Motion:** easing `easeOutBack` · settle 0.55 · stagger 0.05 · bounce 0.18 · enter 40 → playful (has bounce)
<!-- MEASURED:END -->

## Identity
- **References it borrows from:** Linear (technical restraint), Vercel (mono-accented dev polish), Raycast (crisp product surfaces).
- **What it refuses to be:** not playful-consumer, not gradient-y, not "friendly rounded SaaS". Serious, quiet, engineered.
- **The extremes** (details WRONG for any other brand): "AI inside the file" as the thesis · a works-with-your-stack logo wall of real dev tools · code/diff surfaces treated as first-class hero imagery.

## Type
- **Headline:** `Geist` 700, tracking -0.03em. Engineered and confident, never soft.
- **Rule:** one huge hero line + a tiny `Geist Mono` caption. Scale contrast carries the design; no decorative type.

## Colour
- **Accent usage:** blue `#2563eb` at ≤10%. One accent moment per beat (a CTA, a live status, a single highlighted word); everything else is ink on paper.
- **Dominance:** light-first. Paper `#f9f9f8` fields, dark ink. Confirmed by the hero: white-first, not dark.

## Shape & surface
- Hairline cards (1px `line`), radius ~14, **no shadows / no elevation**. The real site is flat and technical, so surfaces read by their border, not their lift.

## Motion
- A subtle spring settle, not a bouncy overshoot (bounce 0.18 is a gentle land, not a wobble). Payoffs snap 0.25-0.35s; thesis lines are luxurious. Whip/slide cuts only between same-background beats.

## Signature details (what this brand does that nothing else does)
- The `.file` motif, AI living inside the source file. · Real dev-tool logos in a stack row. · Mono readouts (paths, timings, `x:160 y:420`) as the metadata layer.

## Background
- Plain paper only. The site is flat, so **NO invented dots / shapes / aurora / mesh.** A pattern would be off-brand.

## NEVER
- Gradients · centered hero blocks (asymmetry instead) · Inter or any generic sans · stock imagery · em-dashes on screen · shadows on cards.

## Assets
- logo/marks + `sections/` + `photos/` under `engine/assets/brands/creed/`
