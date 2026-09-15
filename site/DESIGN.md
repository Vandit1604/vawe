---
version: alpha
name: Vawe
description: The marketing site for a deterministic motion-graphics engine. White-first, one cobalt accent, hairlines instead of shadows.
colors:
  accent: "#2563eb"
  accent-2: "#1d4ed8"
  accent-ink: "#ffffff"
  accent-soft: "#eef3ff"
  accent-line: "#cfe0ff"
  ok: "#2f7d55"
  ok-bg: "#f2fbf6"
  bad: "#a3282d"
  bad-bg: "#fdf3f3"
  bg: "#ffffff"
  bg-2: "#f6f8fb"
  field: "#e9ecf1"
  surface: "#ffffff"
  line: "#e7eaf0"
  line-2: "#d7dce4"
  ink: "#0f1620"
  ink-2: "#454f5e"
  muted: "#697182"
typography:
  sans:
    fontFamily: Anybody
    fontSize: 16px
    lineHeight: 1.55
    fontWeight: 400
    letterSpacing: -0.004em
  mono:
    fontFamily: JetBrains Mono
  display:
    fontFamily: Anybody
    lineHeight: 1
    fontWeight: 800
    letterSpacing: -0.022em
  heading:
    fontFamily: Anybody
    lineHeight: 1.06
    fontWeight: 800
    letterSpacing: -0.018em
  lead:
    fontFamily: Anybody
    fontSize: 1.08rem
    lineHeight: 1.6
    fontWeight: 400
  kicker:
    fontFamily: JetBrains Mono
    fontSize: 12.5px
    letterSpacing: 0.02em
rounded:
  base: 14px
spacing:
  page-gutter: 26px
  rail-gap: 22px
---

## Overview

Vawe renders one self-describing JSON into one frame-perfect video. The site exists to prove that,
so on almost every page the real engine is running: a live editor in the hero, a live block on a
detail page, a live generator in the playground. The design is built to stay out of the way of a
moving picture. It is white-first, it carries exactly one accent, and it draws structure with
hairlines rather than shadows, because a page full of soft boxes competes with the renders it
frames.

## Colors

Cobalt is the only accent, and it is a working colour, not a decorative one: **cobalt and a verb
means you can act on it.** Chrome does not signal interactivity here, colour does. That is what
keeps the accent scarce, and it is why inert data gets no box, no accent and no verb. A new chip
has to pick a side.

The one sanctioned exception is engine boot state. "The render failed" and "this is a link" cannot
be the same colour, so `ok` and `bad` exist and are used nowhere except the editor status line.

Do not fade an accent to suggest a secondary state. Cobalt on its own tint at 75% opacity measures
3.08:1 against a required 4.5. Reach for `ink-2` or `muted`, both of which are contrast-checked on
white.

There is no dark surface left to answer for. The site once carried `accent-on-dark`, cobalt lifted
to survive an ink ground; `/playground` was its only consumer and moved to the light system, so the
token went with the scope.

## Themes

**There are two themes, one switching mechanism.** The system default follows
`prefers-color-scheme: dark`; an explicit choice sets `data-theme="light"` or `data-theme="dark"` on
`<html>` and wins over the system setting in both directions. That is the one mechanism (per
`better-colors`, ui-skills: never let a media query own some tokens and a class own others), so both
the media block and the attribute block redefine the same full set of tokens rather than splitting
the work between them.

Dark is not the light palette inverted. Hue is held, vividness is pulled back and the dark end is
widened rather than mirrored, and `accent-ink` is redefined to the dark `ink` rather than kept at
white, because white-on-lightened-cobalt fails 4.5:1. Nothing on this site paints a colour on a
component, only on a token, so the swap needed no component changes: nine call sites still hard-coded
`#fff` where a component meant "the current surface" (`.ghbtn`, `.bsearch input`, `.bselect select`,
`.sp`, `.sp-play`, `.tythumb`, `.tylive`), and those moved to `var(--surface)` as part of this pass.

Measured (WCAG relative luminance): dark `ink` on `bg` 17.4:1, `ink-2` 10.5:1, `muted` 6.1:1, `accent`
on `bg` 5.5:1, `accent-ink` (`#0b0f16`) on `accent` 5.5:1, `ok` on `ok-bg` 7.0:1, `bad` on `bad-bg`
5.3:1 — all pass 4.5:1 for text. Light mode, unchanged: `ink` 18.2:1, `muted` 4.9:1, `accent` 5.2:1.

The seven tokens the old `.pgdark` scope never paid for are now covered: `shadow-1/2/3` are darker and
more opaque rather than a light-surface shadow reused on ink, `ok` `ok-bg` `bad` `bad-bg` get their
own dark-tinted pair, and `accent-ink` is redefined (see above).

A toggle lives in `Header` (`site/app/components/ThemeToggle.tsx`), cycling system → dark → light →
system, persisted to `localStorage` (`vawe-theme`, the only precedent on this site, so it is
try/catch-guarded rather than following an existing pattern). `app/layout.tsx` applies a saved
override before first paint via an inline script, so a returning visitor never sees a flash of the
wrong theme.

## Typography

Two families, and each one has a job. Anybody carries prose and display; JetBrains Mono carries
anything that is data: a block name, a count, a file path, a JSON key, a keyboard hint. Mono is a
signal that the string is literal, so do not reach for it to make prose look technical.

Anybody carries a `wdth` axis, and width is used as a static type role rather than an effect:
display type stands wide (`105`), body sits at normal (`100`). It is deliberately never animated.
The hero already contains a live engine, and type that reflows every frame competes with the render
it frames and thrashes layout doing it.

Display and heading are FLUID, so their size is a range and not a token: display is
`clamp(2.9rem, 7.2vw, 6rem)`, heading is `clamp(1.7rem, 3.4vw, 2.5rem)`. Every other role is fixed.

Set body copy against a measure. The site caps prose at 44ch to 66ch depending on the role, and
`ch` resolves against the container's own font size, so put the cap on the element that carries the
type, not on a wrapper.

## Layout

`.wrap` is the page: `1160px` max width, `26px` gutters. Everything else sits inside it.

The catalog shape is shared. `/arsenal` indexes 743 items under dozens of headings and uses
`.rail-layout` / `.rail-col` / `.rail`: a `172px` sticky rail, a
`22px` gap, the work to its right, collapsing at `900px` into a horizontal strip of pills. A page
brings its own link type and its own collapsed direction; the frame comes from the primitive.

A rail entry marks itself with `aria-current`, set by an IntersectionObserver, and the highlight is
read off that attribute. One signal serves the sighted reader and the screen reader.

`.fold` is the other shared primitive: a `<details>` whose disclosure triangle is replaced by a
`+`/`-` that reads at 12.5px. It owns the disclosure and never the air around it, because the two
pages that carry one place it differently.

## Elevation & Depth

Three shadow steps exist and they are spent sparingly. Depth says "this is liftable", never
"this is a box". The block catalog is the register to copy: hairlines for structure, one elevation
step, and only on hover.

Prefer a border-colour change over a shadow when the element is not actually liftable.

## Shapes

`--r` is `14px` and it is the card radius. A pill is `999px`. Between those two the site has no
scale: `4px` through `16px` all appear, chosen per component.

## Components

The focus ring is `2px solid var(--accent)` with an `outline-offset` of 1 to 3 pixels, and it is
what almost every control uses. Three shipped controls do not, and a rebuild should close them
rather than copy them: the blocks filter input and its family select both drop the outline and
answer focus with a border colour only, and they do it on `:focus` rather than `:focus-visible`, so
a keyboard user gets less than a mouse user. The hero code pane drops the outline and answers with
a background tint. Where a ring genuinely cannot sit, replace it as the catalog search field does:
a border colour change PLUS a `3px` accent-tinted ring, keyed to `:focus-visible`.

A control that only appears on hover has to be permanently visible where there is no hover. Use
`@media (any-hover: none)`, which asks about the input device rather than the screen width.

Reduced motion removes movement, never information. A spinner that stops spinning cannot be told
from the frozen state it exists to deny, so it fades instead.

## Do's and Don'ts

- Do put a rule in `globals.css` only when two routes need it. One consumer keeps its rule in its
  own stylesheet, which is why `globals.css` does not know what a `.fxcard` is.
- Do give a colour to a token, never to a component. The dark scope that used to ship worked
  because every control painted from `--surface` and `--ink` rather than from a literal, so one
  scope repainted a whole route. That is why a dark mode is still reachable here.
- Don't use `mix-blend-mode: soft-light`, `overlay` or `screen` on the cobalt bookend band.
  `multiply` can only darken, which is what mathematically guarantees white stays above cobalt's
  5.17:1 on every frame of the video behind it. Those three can lighten, and the guarantee dies.
- Don't draw an inert chip and a control the same way.
- Don't animate the `wdth` axis.

## Provenance: what shaped each surface

Every rule above records a decision. This section records where the decision CAME FROM, per surface,
because that is the one part of a design that evaporates.

The gap this closes is real and was found the dull way: someone asked which skills built `/arsenal`,
and the answer was unrecoverable. Not in the commit message, not here, not in a comment in
`Arsenal.tsx`. The tokens survived; the reasoning did not. A design system that records what a colour
is but not why that colour was reached for can only be obeyed, never argued with, and a rule nobody can
argue with is followed until it is quietly abandoned.

**The convention.** When you build or rework a surface, add its row. One line, written at the time,
while you still know.

| Surface | Register | Shaped by | Notes |
|---|---|---|---|
| `/arsenal` | product | `ibelick/improve-ui` (ui-skills), rail pass only | Its PROOF GATE taken: a hierarchy finding needs rendered or user evidence, never a source read, so the rail was screenshotted before and after rather than argued about. That gate is what turned "the two levels look alike" into the actual cause: `.rail a` in globals.css is (0,1,1) and `.ar-ax-kind` was (0,1,0), so the leader's `--ink` never applied and it rendered in its children's grey. Its READ-ONLY boundary rejected, because a fix was asked for. The rest of the page predates this convention: hairlines for structure, one elevation step and only on hover, mono for anything literal, sources lost. Re-derive from the code, do not guess. |
| `/editor` | product | **UNRECORDED** | Same. |
| `/showcase`, `/`, `/playground`, `/features` | brand | **UNRECORDED** | Same. |
| `site/og/card.html` | brand | `zeke/swiss-design` (ui-skills), local tokens win | Swiss principles taken (grid is real, whitespace is structure, opacity not hue for hierarchy, one accent, headings never bold). Its Tailwind and IBM Plex specifics REJECTED: this site owns its faces. |
| Dark mode (`globals.css` tokens, `ThemeToggle`) | system | `jakubkrehel/better-colors` (ui-skills) | Taken: one switching mechanism end to end (not media query for some tokens, class for others); dark built by holding hue and reducing vividness rather than inverting; redefine `accent-ink` rather than leave it white; measure the rendered pair, don't estimate. REJECTED: its `oklch()`-first recommendation — this site's tokens are hex and stay hex, migrating notation was not in scope; its ramp/scale guidance — this site has single tokens per role, not 50-950 ramps, and defining ramps is the separate scale pass `site/CLAUDE.md` already defers. Also rejected: a third "auto" visible state — system default plus one override cycle is enough, per the brief. |

**Two rules for filling a row in.**

Name the source precisely enough to re-fetch: `zeke/swiss-design (ui-skills)` can be re-read;
"some design skill" cannot. The registry command is `npm exec --yes -- ui-skills get <name>` (a bare
`npx` is rewritten by a local hook here and fails).

Say what you REJECTED, not only what you took. A fetched skill arrives with defaults that have not read
this project: a font stack, an icon set, a colour strategy. The local system wins on specifics, because
it has read these tokens and that register. Recording the rejection is what stops the next author
re-importing the default and calling it the house style.
