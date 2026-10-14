# vawe.dev identity brief

Status: direction changed 2026-10-14. The owner chose spike A of the landing spikes and moved the whole
site to its colours and fonts. `DESIGN.md` describes what ships.

History: the direction of 2026-09-25 was "the studio's dark" (`#16151a`, panels, Archivo, Unbounded). The JSON
engine left the site on 2026-09-30, so the hero plays move clips. On 2026-10-14 the studio look gave way to the
direction below.

## Positioning

vawe.dev is a screening room for films an engine made. The films do the most; the copy is short; the page
tells a story: the problem, the page, the render, the result, then try it.

## Principles

1. **The films are the brand.** The page opens on a film that fills the screen, and each chapter of the story
   is one large film in a big rounded frame.
2. **Vercel's restraint.** A pure black ground (`#000`), white type, neutral greys, hairlines for structure and
   a faint grid behind two sections. No shadows, no colour on surfaces.
3. **Framer's staging.** Huge bold headlines with tight tracking. Films sit in frames that scale and fade in as
   you scroll. Four chapters pin to the screen while their film plays.
4. **Two faces.** Geist for headings and body, IBM Plex Mono for every number, label, command and code line.
5. **One accent, used rarely.** `#3291ff` means you can act on it, or it is live. Lane colours mean a layer
   type and always sit beside a label.

## Do

- Open on a playing film, full width, with the h1 over it.
- Neutral tokens only: ground `#000`, panels `#0a0a0a` and `#111`, raised `#171717`, hairlines `#242424` and `#3a3a3a`.
- Ink tiers: `#fff` for titles, `#ededed` for body, `#a1a1a1` for meta (8.1:1 on black).
- Mono caps for every number, runtime and label.
- Reduced motion keeps every film on its poster and every chapter at rest.

## Do not

- Decorative gradients, glow, or colour on surfaces. The one gradient is the dark scrim that keeps text legible over a film.
  The bar's blur is the one frosted layer.
- The Linear-clone dark look, Stripe mesh gradients, the Apple keynote hero, brutalist rawness.
- Shadows or lift on panels.
- An animation library for the scroll story: plain CSS sticky and one scroll handler do it.
- A look that another product could wear with its logo swapped in.

## Interview record

The 2026-09-25 interview, kept for history. Its colour and type answers no longer apply.

| question | answer |
|---|---|
| where the identity shows | the site |
| who it must win first | motion designers |
| register | an instrument |
| liked | Rive, Cavalry: canvas as a stage, colour arrives with the work |
| rejected | Linear-clone dark, Stripe gradient, Apple keynote, brutalist raw |
| what makes it recognisable | the films themselves |
| films | one at a time; a card plays when hovered |
| type voice | film credits |
| hook | the playing film |

2026-10-14 decision: three landing spikes (A, B, C) were built. The owner chose A, "full-bleed film scroll: four
pinned chapters, one huge film each", with the direction "Vercel plus Framer".

## Skills used and rejected

The full record is the provenance table in `DESIGN.md`. In short:

| skill | source | used for | rejected from it |
|---|---|---|---|
| minimalist | ui-skills `leonxlnx/minimalist-skill` | restraint: one accent, hairlines, plain copy | its serif and warm palette |
| better-typography | ui-skills `jakubkrehel/better-typography` | tight tracking on display sizes, balanced headings, tabular mono | its font stack |
| gsap-scrolltrigger-storytelling | ui-skills `mengto/gsap-scrolltrigger-storytelling` | the pin-and-scrub structure | GSAP itself: CSS sticky and a scroll handler replace it |
| ui-ux-interview | local `~/.claude/skills/ui-ux-interview` | the 2026-09-25 interview and its brief | its gist template |
| landing-page, better-layout, better-ui, distill, colorize, better-interface | ui-skills (2026-09-25 rebuild) | the landing order, grouping with panels, fewer words per card, lane colours by meaning, the bar and footer | stock gradient heroes, logo walls, icon badges, a sticky rail on content pages |

## Prototype

The approved prototype is spike A (`out/spikes/landing/a.html`, `base.css`, `base.js`). It is now shipped in
`site/` as `app/page.tsx`, `app/landing.css` and `app/components/LandingMotion.tsx`; `DESIGN.md` is extracted
from that CSS.
