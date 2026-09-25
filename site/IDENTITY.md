# vawe.dev identity brief

Status: direction locked 2026-09-25 with the owner. Not shipped. `DESIGN.md` still describes the
white and cobalt site that is live; it changes only when this direction is built.

## Positioning

vawe.dev is a screening room for films an engine made. It feels like browsing reels in an editing
suite, not like a SaaS site.

## Principles

1. **The films are the brand, and the site shows how they are made.** The page opens on a film that is
   already playing, with its real layer timeline under it and its real scene file one tab away.
2. **The studio's dark.** The site stands on the same ground as the vawe studio: `#16151a`, a near-black
   with a faint violet cast (`studio/ui/studio.css:9`). The site and the tool read as one place.
3. **Three faces, three jobs.** Archivo for headings and body, Unbounded only for titles (wordmark,
   film titles, sub-heads, section clips), JetBrains Mono for every number and label.
4. **Everything sits in studio panels.** Flat `#212025` panels with 12px corners on the `#16151a`
   ground, 8px corners inside them, a 1px `rgba(255,255,255,.06)` edge. No shadow, no lift.
5. **The site is shaped like the studio.** A film rail, a preview panel with its timeline, a text
   panel, and the page's sections as clips on a strip. Studio colour: the studio's lane colours on
   the timeline and `#0a87ff` for what is live (playhead, active film). Nowhere else.

## Do

- Open on a film that is playing, with its layer timeline and scene file beside it.
- Studio tokens only: ground `#16151a`, panels `#212025` / `#27262c`, raised `#2f2e35`.
- Studio ink tiers: `#ffffff` for titles (18.2:1), `#d8d8da` for body, `#97969b` for meta (6.2:1).
- Timeline lanes in the studio's type colours; `#0a87ff` for the playhead and the active film.
- Few sizes; Mono caps for every number, runtime and label.

## Do not

- Glow, blur, frosted glass, decorative gradients.
- The Linear-clone dark look, Stripe mesh gradients, the Apple keynote hero, brutalist rawness.
- Colour outside the timeline lanes and the live state.
- Shadows or lift on panels.
- A look that another product could wear with its logo swapped in.

## Interview record

| question | answer |
|---|---|
| where the identity shows | the site |
| who it must win first | motion designers |
| register | an instrument |
| liked | Rive, Cavalry: canvas as a stage, colour arrives with the work |
| rejected | Linear-clone dark, Stripe gradient, Apple keynote, brutalist raw |
| what makes it recognisable | the films themselves |
| protected pieces | none: logo, Anybody and JetBrains Mono are all open |
| stage | editor grey at first; changed to the studio's `#16151a` after seeing it |
| films | one at a time; a card plays when hovered |
| type voice | film credits |
| chrome | none at first; changed to studio-panel cards after seeing them |
| layout | the studio canvas: rail, preview with timeline, text panel, section strip |
| type | Jost, Barlow Condensed, Cormorant: all rejected as too thin or elegant; Unbounded liked for titles but not serious enough for headings; Archivo chosen for headings |
| colour | studio tokens; the Studio mode chosen over Neutral |
| hook | the playing film plus its live timeline and scene file |

## Skills used and rejected

| skill | source | used for | rejected from it |
|---|---|---|---|
| ui-ux-interview | local `~/.claude/skills/ui-ux-interview` | the interview and this brief | its gist template: the prototype is built around real films and their real scene files instead |
| better-colors | ui-skills `jakubkrehel/better-colors` | contrast measured on the real pair; ramps by role | nothing yet; the site has almost no colour by design |
| better-typography | ui-skills `jakubkrehel/better-typography` | tracking on small caps, tabular numbers, few sizes | nothing yet |
| emil-design-eng, animate | ui-skills `emilkowalski/*` | the poster-to-video crossfade, the play state | scale and lift on hover, as decoration with no purpose |
| minimalist, brutalist, overdrive, neo-industrial | ui-skills | named as poles only | all of them as builders |

## Prototype

The approved prototype is `canvas-v2` (studio canvas, Archivo headings, Studio colour). It was built
in a scratch folder, not in the repo; the build pass ports it into `site/`, then `DESIGN.md` is
re-extracted from the shipped CSS.
