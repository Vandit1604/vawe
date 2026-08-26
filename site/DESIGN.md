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

**There is one theme, and the site has no dark mode at all.** No `prefers-color-scheme`, no
`data-theme`, and since `/playground` moved to the light system, no opted-in dark scope either. A
visitor whose OS is set to dark gets the light site.

That is a decision the next change should make on purpose rather than inherit, and the way in is
already proven. The scope that used to exist was token-level, not component-level: it redefined
surface, line, ink and accent in one place and every control on the route repainted with no rule of
its own. Nothing on this site paints a colour on a component, so that mechanism still works.

What a real dark mode owes, and what the old scope never paid: `shadow-3` kept a light-surface
shadow, `ok` `ok-bg` `bad` `bad-bg` painted near-white on ink, and `accent-ink` was never
redefined. Seven tokens, plus one decision about who owns the switch.

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
