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
| `/arsenal/effects/family/[id]` (58 hubs) | product | `pbakaus/polish` (ui-skills), nothing rejected | Its "fix at the narrowest correct level, do not build a new abstraction for one local exception" principle is what decided the build: the card and chip grid plus `.fxfam .fxintro .fxchips .fxgrid` already existed in `arsenal/effects/effects.css`, dead since the old family rail was deleted in `ce5e3023`. The hubs re-use that rendering rather than adding a component. Nothing in the skill conflicted with this file, so nothing was rejected. |
| `site/app/components/ogCard.tsx` (every generated share card) | brand | `jakubkrehel/better-ui` + `jakubkrehel/better-typography` (ui-skills) | Taken: concentric radius (outer = inner + padding), optical over geometric alignment, a 1px image outline at `oklch(0 0 0 / 0.1)` and NEVER a tinted neutral, negative tracking on the large heading, positive on the small uppercase label, balanced heading wrap. better-ui's "shadows for elevation, borders for structure" REJECTED outright: this file says hairlines instead of shadows and it owns the question. Every motion rule in both skills is inert on a PNG. |
| `/determinism`, `/json-to-video`, `/ai-agents` | brand | `jakubkrehel/better-typography` (ui-skills) | Measure cap, heading scale, `text-wrap: balance` on headings and `pretty` on descriptions taken. Its font stack and Tailwind scale REJECTED: this site owns Anybody and JetBrains Mono, and the existing `.phead`/`.tag`/`.codeblock` classes already carry the register. |
| `/json-to-video`'s `.iproof` (JSON next to the video it renders, above the fold) | product | no new fetch, local reuse only | Checked `ui-skills categories` first; a two-up code-plus-media pairing is exactly what `.isec`/`.codeblock`/`.demo-media` already carry (see the row above and `/features`' `.fsec`), so a new skill's defaults would only have re-argued a solved layout question. Composed `.iproof-art` as a flex row of the existing `.codeblock` and the existing `Clip` component rather than adding either a new primitive or a new page; the video keeps its real 9:16 (`films/scene/sample.json`'s own aspect) instead of being cropped into `.demo-media`'s fixed 16:9. |
| The footer, both variants, every page | brand | `pbakaus/layout` then `jakubkrehel/better-ui` (ui-skills) | The site used to end two different ways: a cobalt band with pills on the home page, a hairline rule with grey links everywhere else. It now ends one way. `pbakaus/layout` gave the grouping ("group by meaning, use proximity before adding containers"); its 4-unit spacing scale REJECTED, this site has no spacing scale and DESIGN.md records that as a known gap. `better-ui` gave three exact values, not ranges: motion restraint, so the pill hover is 150ms rather than the 200ms it inherited, because a footer link is high-frequency and "a custom animation there charges its attention cost on every trigger"; `scale(0.96)` on press, "always 0.96"; and transition only what changes, naming `background` and `scale` rather than `all`. Its "shadows for elevation, borders for structure" default REJECTED: this file says hairlines instead of shadows and owns that question. THE RULE THIS SURFACE RE-LEARNED THE HARD WAY: the column headers shipped at `rgba(255,255,255,.62)` and measured 2.95:1 on cobalt where 12px text needs 4.5, and white has to reach 92% to pass, which is no longer a muted colour. `site/CLAUDE.md` rule 2 already says this about the accent at 75%; the same physics apply to white. Hierarchy is carried by size, case and tracking, which cost no contrast, and the current page inverts to a filled white pill (18.17:1) rather than dimming to 2.75:1. |
| `/launch-video`, `/product-tour-video` | brand | `pbakaus/layout` (ui-skills) | Section rhythm and grouping taken. Content shaped by what the repo has actually rendered rather than by the skill: `site/lib/films.json` and the per-type spine in `skills/vawe-type-launch/SKILL.md`, so each page shows a real film rather than a described one. |
| `/remotion-alternatives`, `/when-determinism-matters` | brand | UNRECORDED by its author (agent stopped before reporting) | The surface reuses `site/app/components/intent.css` from the three intent pages above, so treat that row as its nearest source until someone re-derives it. Recorded as unknown on purpose: guessing a provenance is worse than admitting one was lost, which is the whole point of this table. |
| `Header.tsx` nav, every page | product | `jakubkrehel/better-accessibility` (ui-skills) | The header linked its own current page; the footer already had the fix (a `<span aria-current="page">`, never an `<a>`). Ported that exact mechanism rather than inventing a second one. Taken from the skill: "don't rely on color alone", so the current item is set apart by weight (`font-weight:600`) and fill, on top of the colour it already had, never by fading it. Everything else in the skill (focus rings, keyboard traps, forms) is inert on a two-state nav link and was left alone. |
| `/hyperframes-alternatives` | brand | `jakubkrehel/better-typography` (ui-skills), same as `/determinism`, `/json-to-video`, `/ai-agents` | Taken: measure cap, heading scale, `text-wrap: balance`/`pretty`. Its font stack and Tailwind scale REJECTED, same reason as those three rows: this site owns Anybody and JetBrains Mono and the existing `.phead`/`.isec`/`.itable` classes in `intent.css` already carry the register, reused as-is rather than rebuilt. |
| `site/og/card.html` | brand | `zeke/swiss-design` (ui-skills), local tokens win | Swiss principles taken (grid is real, whitespace is structure, opacity not hue for hierarchy, one accent, headings never bold). Its Tailwind and IBM Plex specifics REJECTED: this site owns its faces. |
| `site/app/components/Footer.tsx` (plain variant, the site nav grouped by Product/Learn/Use cases/Compare/Docs) | product | `pbakaus/layout` (ui-skills) | Its "group by meaning, use proximity before adding containers or decoration" and "use `gap` for sibling rhythm" taken as-is: each column is a bare `.foot-col` with a `gap`, no card or border per group, and the `.foot-nav` gap carries both the tight in-column rhythm and the wider between-column one. Its 4-unit spacing-scale and live-mode `density` param REJECTED: this site has no spacing scale (a known, recorded gap above) and no live-mode system, so neither applies without a separate pass. |
| `/arsenal/category/[id]` (13 hubs) | product | `pbakaus/polish` (ui-skills), nothing rejected | Its "fix at the narrowest correct level, do not build a new abstraction for one local exception" principle decided the build: the card grid is `.ar-card`/`.ar-grid`/`.ar-thumb` from `arsenal.css` and the page furniture is `.fxpage`/`.fxtags`/`.fxpage-nav` from `effects.css`, both already shipping. No new CSS was written. Its critique-storage workflow and native-platform guidance REJECTED as not applicable: this is a new static surface, not a polish pass on an existing broken one. |

| `/`, `/features`, `/json-to-video`, `/docs` (docs-site index) query-phrase copy pass | copy | `coreyhaines31/marketingskills`: `ai-seo` + `copywriting` (skills.sh) | From `ai-seo`: taken its report that ChatGPT 5.6 demoted listicle and comparison citations while owned product/docs pages with extractable structure held, which is why this pass went into `/`, `/features`, `/json-to-video` and the docs entry rather than a third comparison page; taken its Google-quoted rule against writing separate content for AI or fragmenting prose into machine-only chunks, so every phrase landed inside a normal sentence a person would read; taken "citation is not recommendation", so the new sentences describe how the engine works rather than arguing it is the best choice. REJECTED: FAQ/HowTo schema blocks, 40-60 word answer-block formatting, "last updated" freshness stamps, and the query-fan-out cluster-building exercise, none of which fit a site whose structured data already ships from `site/lib/schema.ts` and whose register is prose, not blocks. From `copywriting`: taken clarity/specificity/active-voice as line-edit checks only. REJECTED its whole page-structure framework (hero formulas, CTA formulas, rhetorical questions, humor): DESIGN.md and this site's existing hero/CTA copy already carry a considered voice (see `app/page.tsx`'s own comments on why the h1 reads as it does), and this pass edited supporting paragraphs, never the hero. |

**Two rules for filling a row in.**

Name the source precisely enough to re-fetch: `zeke/swiss-design (ui-skills)` can be re-read;
"some design skill" cannot. The registry command is `npm exec --yes -- ui-skills get <name>` (a bare
`npx` is rewritten by a local hook here and fails).

Say what you REJECTED, not only what you took. A fetched skill arrives with defaults that have not read
this project: a font stack, an icon set, a colour strategy. The local system wins on specifics, because
it has read these tokens and that register. Recording the rejection is what stops the next author
re-importing the default and calling it the house style.
