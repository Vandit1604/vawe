---
version: beta
name: Vawe
description: The site for an open source motion-graphics engine, on the vawe studio's own dark tokens. Move clips play live; colour marks an action or a layer type, nothing else.
colors:
  accent: "#0a87ff"
  accent-2: "#3a9dff"
  accent-ink: "#16151a"
  accent-soft: "rgba(10,135,255,.16)"
  accent-line: "rgba(10,135,255,.42)"
  ok: "#0eaf80"
  bad: "#ff7a7a"
  bg: "#16151a"
  surface: "#212025"
  surface-2: "#27262c"
  raised: "#2f2e35"
  raised-2: "#393840"
  line: "rgba(255,255,255,.07)"
  line-2: "rgba(255,255,255,.13)"
  ink: "#ffffff"
  ink-2: "#d8d8da"
  muted: "#97969b"
  lane-text: "#a67dff"
  lane-media: "#52525a"
  lane-shape: "#e0714f"
  lane-comp: "#cf5b98"
  lane-cap: "#3ea3ff"
  lane-sound: "#0eaf80"
  lane-camera: "#4fb3d9"
  lane-fx: "#d9c34f"
  lane-on: "#16151a"
typography:
  sans:
    fontFamily: Archivo
    fontSize: 16px
    lineHeight: 1.55
    fontWeight: 400
    letterSpacing: -0.004em
  display:
    fontFamily: Archivo
    lineHeight: 1
    fontWeight: 800
    letterSpacing: -0.035em
  heading:
    fontFamily: Archivo
    lineHeight: 1.05
    fontWeight: 800
    letterSpacing: -0.025em
  title:
    fontFamily: Unbounded
    fontWeight: 500
  mono:
    fontFamily: JetBrains Mono
rounded:
  panel: 12px
  inner: 4px
  control: 8px
  pill: 999px
spacing:
  page-gutter: 26px
  column: 1040px
  page: 1160px
---

## Overview

Vawe turns one HTML page into one film, and the site shows what it rendered: the landing hero, the
`/moves` gallery and `/launch-video` play the move clips in `public/moves/`. The design is the vawe studio's own look (`studio/ui/studio.css`), because the
site and the tool should read as one product. The brief it answers to is `IDENTITY.md`.

A dark ground, panels a step lighter, and almost no colour. The clips are the colour on the page.

## Colors

Colour has two voices and each has one meaning.

- **The accent, `#0a87ff`, means you can act on it, or it is live.** Links, the focus ring, the
  active clip. Text on the accent is the ground (`accent-ink`, 5.12:1);
  white on it measures 3.55:1 and is never used.
- **A lane colour means that layer type**, as in the studio timeline. No page uses one since the
  JSON engine left the site; the tokens stay for the next surface that shows a timeline. A lane
  colour always sits next to a label, and as TEXT it is legal only on the ground: media fails there
  (2.35:1) and composite fails on a panel.

Nothing else gets colour. Buttons are ink on the ground (`btn-primary`) or ink on `raised`
(`btn-ghost`); a selected row is `ink` on `raised`, never the accent on its own tint, which measured
4.3:1.

Ink is measured on the ground: `ink` 18.2:1, `ink-2` 14.0:1, `muted` 6.2:1. The studio's own
`#7c7b81` measures 4.3:1 and is never text here.

## Themes

The site is dark only, by decision (`IDENTITY.md`), and declares `color-scheme: dark`.

## Typography

Three faces, three jobs (`app/layout.tsx`):

- **Archivo** carries headings and prose. Headings are 800 with tight tracking; body is 400 at
  16px / 1.55. Its `wdth` axis is loaded and held at 100; it is never animated, because type that
  reflows every frame competes with the live render beside it.
- **Unbounded** is for short titles only: a film name, a card title, the wordmark, an FAQ question.
  It was judged not serious enough for headings.
- **JetBrains Mono** is for anything literal: a count, a clock, a file path, a JSON key, a lane name.
  The `.meta` class is its uppercase read-out form, 11px with tabular numbers.

Headings are fluid: a page h1 is `clamp(2.2rem, 4.6vw, 3.5rem)`, a section h2
`clamp(1.9rem, 3.4vw, 2.75rem)`, a panel h2 `clamp(1.5rem, 2.6vw, 2rem)`. Prose is capped at a
measure of 52 to 66ch, set on the element that carries the type, because `ch` resolves against its
own font size. No functional text is under 11px.

## Layout

`.wrap` is the page: 1160px wide with 26px gutters. Inside it, content sits in one centred 1040px
column (`.ls`, and `.ipage` on the content pages). Sections are separated by space, not by grey
bands; grouping is done with panels.

- `.ls` / `.ls-top`: a section, or a page's opening section with its h1.
- `.phead`: the page head on the content pages, one column, with an optional quiet
  breadcrumb (`.kicker`).
- `.isec`: one argument per panel, the text on the left and its proof on the right; a panel with no
  proof is one column.
- `.mv-grid` / `.mv-card`: move cards on `/moves`, three columns at desktop, two, then one.
- `.imoves`: a row of four move clips on an intent page (`MoveClips.tsx`), two under 900.

Breakpoints are 640, 760 and 900. A few older ones ship (560, 700, 860, 1000) and should fold into
that set when their page is next touched.

## Elevation & Depth

Depth is one step: a panel is `surface` with a 1px inner ring (`--ring`), no drop shadow. Inside a
panel, a proof is a recessed well (`bg` or `surface-2`), never a second raised card. `--shadow-2`
and `--shadow-3` are kept small (12px and 16px blur) and appear only on a few catalogue cards.
The one exception is the clip on a `/moves/<name>` page, the page's hero media: a six-layer neutral
shadow under its ring lifts it off the ground (see the provenance row for `/moves`).

## Shapes

Four radii: a panel is `--r` (12px), a well or chip inside it is `--r-in` (4px), a control is 8px,
a pill is 999px. Some older routes still use 6px and 10px.

## Components

- **Bar:** the wordmark, three links (Moves, Features, Docs), and GitHub as the one
  filled action. The current page is a `<span aria-current="page">` on `raised`, never a link.
- **Footer:** one panel with the generated link groups (`lib/site-pages.json`) and the Apache 2.0
  line. Pages that end a journey add a closing panel above it (`<Footer bookend />`).
- **Landing hero:** the three.js example film (`films/examples/three-star`, 1.2 s, looped) at
  1280 px: a VP9 WebM, an H.264 fallback and a WebP poster in `public/hero/`, about 100 KB each.
- **Move card** (`app/moves/`): the clip's 640 px poster at rest; its 640 px WebM plays while at
  least half on screen, six at most, and with reduced motion only on a tap. The move page shows the
  1280 px poster as an image and fades the 1280 px clip in over it once it plays. Hover rings sit
  behind `(hover: hover) and (pointer: fine)`, so a tap on a phone never leaves one stuck. A code block shows syntax by tone and weight
  (`ink`, `ink-2`, `muted`, italic comments), never by hue.
- **Focus:** `2px solid var(--accent)` on `:focus-visible`. A field that cannot carry an outside
  ring uses a border change plus a 3px accent-tinted ring.
- A control that appears on hover is visible where there is no hover (`@media (hover: none)`).
- Reduced motion stops playback on load and removes movement, never information.

## Do's and Don'ts

- Do put a rule in `globals.css` only when two routes use it.
- Do give colour to a token, never to a component.
- Don't use a lane colour without its label, or as decoration.
- Don't tint the accent for a secondary state; use `ink` on `raised`.
- Don't put white text on the accent.
- Don't nest a shadowed card inside a panel.
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

The first rows record the 2026-09-25 studio rebuild. The rows after them were written for the
white-and-cobalt site and describe surfaces the rebuild replaced; they stay as the record of what
was tried.

| Surface | Register | Shaped by | Notes |
|---|---|---|---|
| **studio rebuild, 2026-09-25:** tokens, type, every route | brand | `ui-ux-interview` (local), then ui-skills `jakubkrehel/better-colors`, `better-typography`, `mengto/landing-page`, `jakubkrehel/better-layout`, `better-ui`, `better-interface`, `pbakaus/distill`, `pbakaus/colorize`; `impeccable detect` on every route at 1440 and 390 | The full record is `IDENTITY.md` → Skills used and rejected. Rejected: stock gradient heroes and logo walls, pill navs on colour bands, icon badges on every card, colour as decoration, a sticky rail on content pages. Kept on purpose against `impeccable`: clipping in the editor frame and the playground field (deliberate), and a generator's glow (the engine's own artwork). Not reviewed: better-accessibility and better-writing were not loaded. |
| `/`, split hero with a live film, timeline and scene file | brand | `mengto/landing-page`, `emilkowalski/emil-design-eng` | The hero plays a film through the in-browser engine, with its layer bars in lane colours and its scene file one tab away; all three read one scene JSON. Rejected: mp4 loops, which had drifted from their scenes. |
| `/showcase`, `/launch-video`, `/product-tour-video` film cards | brand | `pbakaus/colorize` | Idle face is the film's own layer timeline; only a hovered card boots an engine. |
| `site/app/components/ogCard.tsx`, `site/og/card.html` | brand | local tokens only | Studio ground and Archivo. Satori reads woff, so the font lock carries `Archivo-400/800.woff`. |
| `/moves`, `/moves/[name]` filters and fluff pass | product | ui-skills `jakubkrehel/better-accessibility`, `pbakaus/distill`, `leonxlnx/minimalist-skill` | Taken: native checkboxes and fieldsets, visible focus, a polite status count, 44 px targets on touch (accessibility); remove what carries no information, show less until asked (distill); no emoji, no gradient, no stacked shadow, plain copy (minimalist). Rejected from minimalist: its serif and warm palette, pastel pill tags, staggered scroll entry, drifting background blob, card lift on hover. Local tokens and Archivo win. |
| `/arsenal` | product | `ibelick/improve-ui` (ui-skills), rail pass only | Its PROOF GATE taken: a hierarchy finding needs rendered or user evidence, never a source read, so the rail was screenshotted before and after rather than argued about. That gate is what turned "the two levels look alike" into the actual cause: `.rail a` in globals.css is (0,1,1) and `.ar-ax-kind` was (0,1,0), so the leader's `--ink` never applied and it rendered in its children's grey. Its READ-ONLY boundary rejected, because a fix was asked for. The rest of the page predates this convention: hairlines for structure, one elevation step and only on hover, mono for anything literal, sources lost. Re-derive from the code, do not guess. |
| `/editor` | product | **UNRECORDED** | Same. |
| `/showcase`, `/`, `/features` | brand | **UNRECORDED** | Same. |
| `/playground` (rail layout, colour fields) | product | `ibelick/baseline-ui` (ui-skills), Tailwind/animation rules rejected | Read `ui-skills categories` first, then `list --category craft` for a fast cleanup pass on a layout reading as unfinished. Taken, translated off Tailwind onto this site's own CSS: truncate dense UI text instead of letting it wrap or collide (the rail's kind label moved under the name and both truncate, `.pg-rail a`), one clear next action on an empty state rather than a paragraph floating on white (`.pg-empty`, a hairline card, never a shadow, per this file's own Elevation rule), tabular-nums on data (already this file's rule, unchanged), one accent per view (already true here, unchanged). REJECTED wholesale: its whole Stack and Components sections (Tailwind, `cn`, Base UI, `motion/react`, `tw-animate-css`) and every Animation rule, none of which this route or this repo uses; its z-index and shadow-scale defaults, both already fixed by this file's own closed set. Also read `emilkowalski/emil-design-eng` (ui-skills) from the same listing and rejected it entirely for this surface: it is a motion/animation-engineering skill end to end, and the fault the owner named (a rail that reads unfinished) is spacing and typography, not motion; nothing in it was applicable and it was not fetched a second time to force a fit. |
| `/arsenal/effects/family/[id]` (58 hubs) | product | `pbakaus/polish` (ui-skills), nothing rejected | Its "fix at the narrowest correct level, do not build a new abstraction for one local exception" principle is what decided the build: the card and chip grid plus `.fxfam .fxintro .fxchips .fxgrid` already existed in `arsenal/effects/effects.css`, dead since the old family rail was deleted in `ce5e3023`. The hubs re-use that rendering rather than adding a component. Nothing in the skill conflicted with this file, so nothing was rejected. |
| `site/app/components/ogCard.tsx` (every generated share card) | brand | `jakubkrehel/better-ui` + `jakubkrehel/better-typography` (ui-skills) | Taken: concentric radius (outer = inner + padding), optical over geometric alignment, a 1px image outline at `oklch(0 0 0 / 0.1)` and NEVER a tinted neutral, negative tracking on the large heading, positive on the small uppercase label, balanced heading wrap. better-ui's "shadows for elevation, borders for structure" REJECTED outright: this file says hairlines instead of shadows and it owns the question. Every motion rule in both skills is inert on a PNG. |
| `/determinism`, `/json-to-video`, `/ai-agents` | brand | `jakubkrehel/better-typography` (ui-skills) | Measure cap, heading scale, `text-wrap: balance` on headings and `pretty` on descriptions taken. Its font stack and Tailwind scale REJECTED: this site owns Anybody and JetBrains Mono, and the existing `.phead`/`.tag`/`.codeblock` classes already carry the register. |
| `/json-to-video`'s `.iproof` (JSON next to the video it renders, above the fold) | product | no new fetch, local reuse only | Checked `ui-skills categories` first; a two-up code-plus-media pairing is exactly what `.isec`/`.codeblock`/`.demo-media` already carry (see the row above and `/features`' `.fsec`), so a new skill's defaults would only have re-argued a solved layout question. Composed `.iproof-art` as a flex row of the existing `.codeblock` and the existing `Clip` component rather than adding either a new primitive or a new page; the video keeps its real 9:16 (`films/scene/sample.json`'s own aspect) instead of being cropped into `.demo-media`'s fixed 16:9. |
| The footer, both variants, every page | brand | `pbakaus/layout` then `jakubkrehel/better-ui` (ui-skills) | The site used to end two different ways: a cobalt band with pills on the home page, a hairline rule with grey links everywhere else. It now ends one way. `pbakaus/layout` gave the grouping ("group by meaning, use proximity before adding containers"); its 4-unit spacing scale REJECTED, this site has no spacing scale and DESIGN.md records that as a known gap. `better-ui` gave three exact values, not ranges: motion restraint, so the pill hover is 150ms rather than the 200ms it inherited, because a footer link is high-frequency and "a custom animation there charges its attention cost on every trigger"; `scale(0.96)` on press, "always 0.96"; and transition only what changes, naming `background` and `scale` rather than `all`. Its "shadows for elevation, borders for structure" default REJECTED: this file says hairlines instead of shadows and owns that question. THE RULE THIS SURFACE RE-LEARNED THE HARD WAY: the column headers shipped at `rgba(255,255,255,.62)` and measured 2.95:1 on cobalt where 12px text needs 4.5, and white has to reach 92% to pass, which is no longer a muted colour. `site/CLAUDE.md` rule 2 already says this about the accent at 75%; the same physics apply to white. Hierarchy is carried by size, case and tracking, which cost no contrast, and the current page inverts to a filled white pill (18.17:1) rather than dimming to 2.75:1. |
| `/launch-video`, `/product-tour-video` | brand | `pbakaus/layout` (ui-skills) | Section rhythm and grouping taken. Content shaped by what the repo has actually rendered rather than by the skill: the deleted films.json and the per-type spine in `skills/vawe-type/reference/launch.md`, so each page shows a real film rather than a described one. |
| `/remotion-alternatives`, `/when-determinism-matters` | brand | UNRECORDED by its author (agent stopped before reporting) | The surface reuses `site/app/components/intent.css` from the three intent pages above, so treat that row as its nearest source until someone re-derives it. Recorded as unknown on purpose: guessing a provenance is worse than admitting one was lost, which is the whole point of this table. |
| `Header.tsx` nav, every page | product | `jakubkrehel/better-accessibility` (ui-skills) | The header linked its own current page; the footer already had the fix (a `<span aria-current="page">`, never an `<a>`). Ported that exact mechanism rather than inventing a second one. Taken from the skill: "don't rely on color alone", so the current item is set apart by weight (`font-weight:600`) and fill, on top of the colour it already had, never by fading it. Everything else in the skill (focus rings, keyboard traps, forms) is inert on a two-state nav link and was left alone. |
| `/hyperframes-alternatives` | brand | `jakubkrehel/better-typography` (ui-skills), same as `/determinism`, `/json-to-video`, `/ai-agents` | Taken: measure cap, heading scale, `text-wrap: balance`/`pretty`. Its font stack and Tailwind scale REJECTED, same reason as those three rows: this site owns Anybody and JetBrains Mono and the existing `.phead`/`.isec`/`.itable` classes in `intent.css` already carry the register, reused as-is rather than rebuilt. |
| `site/og/card.html` | brand | `zeke/swiss-design` (ui-skills), local tokens win | Swiss principles taken (grid is real, whitespace is structure, opacity not hue for hierarchy, one accent, headings never bold). Its Tailwind and IBM Plex specifics REJECTED: this site owns its faces. |
| `site/app/components/Footer.tsx` (plain variant, the site nav grouped by Product/Learn/Use cases/Compare/Docs) | product | `pbakaus/layout` (ui-skills) | Its "group by meaning, use proximity before adding containers or decoration" and "use `gap` for sibling rhythm" taken as-is: each column is a bare `.foot-col` with a `gap`, no card or border per group, and the `.foot-nav` gap carries both the tight in-column rhythm and the wider between-column one. Its 4-unit spacing-scale and live-mode `density` param REJECTED: this site has no spacing scale (a known, recorded gap above) and no live-mode system, so neither applies without a separate pass. |
| `/arsenal/category/[id]` (13 hubs) | product | `pbakaus/polish` (ui-skills), nothing rejected | Its "fix at the narrowest correct level, do not build a new abstraction for one local exception" principle decided the build: the card grid is `.ar-card`/`.ar-grid`/`.ar-thumb` from `arsenal.css` and the page furniture is `.fxpage`/`.fxtags`/`.fxpage-nav` from `effects.css`, both already shipping. No new CSS was written. Its critique-storage workflow and native-platform guidance REJECTED as not applicable: this is a new static surface, not a polish pass on an existing broken one. |
| `SectionStrip.tsx`, `/` bottom nav | product | `emilkowalski/mobile-native` (ui-skills), categories `interaction` list checked first, no sticky-bar or scrubber skill exists so this was the nearest fit | Moved the strip from a floating `position:fixed` pill (with a `.foot` padding-bottom hack to stop it covering the footer) to `position:sticky; bottom:0`, a plain sibling of `<main>` in normal flow, so it reserves its own space and the hack is gone. Taken: the skill's safe-area framing for a bottom-docked bar on a notched phone. REJECTED: its `env(safe-area-inset-bottom)` + `viewport-fit=cover` fix, because this site's `layout.tsx` sets no `viewport-fit`, so the env() would resolve to 0 and ship as dead code; out of scope for a site-wide viewport contract change. Dropped `.panel`'s raised surface and radius in favour of `--bg` (studio ground) with a `border-top:1px solid var(--line)` hairline, per this file's own hairline-not-shadow rule. |
| **JSON-era films removed, 2026-09-30 (second pass):** `/` hero, `/launch-video`, nav, footer | brand | no new fetch; `.hs` and the `/moves` card styles reused | The five showcase films were JSON-engine renders, so they, `/showcase`, `/product-tour-video` (both redirect to `/moves`) and every unused clip under `public/assets` left. The hero plays six move clips at 1280 px; `/launch-video` shows four move clips (`MoveClips.tsx`, `.imoves`) in place of its film grid. |
| `/` hero, three.js film (2026-10-01) | brand | no new fetch; `.hs` reused | The owner asked for the three.js film in the hero for now. The move list and its switcher left with the move clip; the stage, the play button and the reduced-motion pause stay. The 1.2 s film loops in the element rather than being encoded longer, so each file stays near 100 KB. |
| **JSON engine removed, 2026-09-30:** `/` hero, film cards, every page's copy | brand | no new fetch; the existing `.hs`, `.fc` and `.ffocus` styles reused | The live engine, the layer timeline and the scene-file tab left with the JSON engine; the hero and cards play rendered mp4s instead. `/arsenal`, `/editor`, `/playground` and `/json-to-video` are gone, so their rows above are history. |
| `/moves`, `/moves/[name]` (gallery and one move, 2026-09-30) | product | ui-skills ladder, one per stage: `jakubkrehel/better-ui` (layout), `vercel-labs/react-best-practices` (build), `ibelick/fixing-motion-performance` (video), `addyosmani/web-quality-audit` (audit) | better-ui: TAKEN, `scale(.96)` on press, 150 ms colour transitions naming their properties, one SVG chevron in `currentColor` grey, a stretched title link so the card has one target. REJECTED: "shadows for elevation" (hairlines own that here; hover is a `line-2` ring) and its icon cross-fade and theme-switch recipes (no icons swap, dark only). react-best-practices: TAKEN, `server-serialization` (the client grid gets name, title, group, look, use and jobs; the 380 KB of rendered markdown stays in server HTML and one delegated listener serves every copy button), `rendering-resource-hints` (`preload` of the detail poster), `rendering-content-visibility` on cards, `client-event-listeners` (one IntersectionObserver for the grid), `prefetch={false}` on 70 card links. REJECTED: SWR, Suspense streaming and dynamic imports (static data, no fetch, 2 kB page chunk). fixing-motion-performance: TAKEN, play only in view through IntersectionObserver, opacity-only fade of a clip over its poster, no scroll listeners; the cap of six playing clips is ours. Nothing rejected. web-quality-audit: TAKEN, first-row posters eager with `fetchpriority=high` (Lighthouse flagged a lazy LCP image), 44 px group and play targets under 640. REJECTED: its generic "preload critical fonts" and CSP advice (site-wide, not this surface). Local rule kept over every skill: no hue in syntax highlighting, because colour here means act-on-it or a lane. |
| `/moves`, `/moves/[name]` ladder, second pass (2026-09-30) | product | ui-skills, one per stage: `pbakaus/typeset` (type), `emilkowalski/emil-design-eng` (craft), `mengto/beautiful-shadows` (depth) | typeset: TAKEN, its hierarchy check found the fault: `.phead p` (0,1,1) outranked `.kicker` and `.meta` and set the breadcrumb and the look line at 16.8 px, the body size, so three metadata roles read as prose; they are back at 12 and 11 px (`.mvd-head .kicker`, `.mvd-head .mvd-meta`) and the agent link at 12 px. Its light-on-dark rule: card copy gets line-height 1.5 and no negative tracking. REJECTED: the `impeccable detect` scan (not installed here), the live-mode `scale` param (no live mode) and a new role scale (the known type-scale gap wants its own pass). emil-design-eng: TAKEN, hover only behind `(hover: hover) and (pointer: fine)`; the clip replaces its poster with an opacity fade on `--ease` (its strong ease-out, 200 ms) instead of a hard swap, and the move page now does the same over a 1280 px poster image. REJECTED: stagger or `@starting-style` entrances on the grid (filtering happens tens of times a visit, its own frequency table says no animation), press scale on whole cards (large surfaces; `.96` on buttons stays, from better-ui), its Before/After/Why review format. beautiful-shadows: TAKEN, its "lg" six-layer neutral stack for hero media, on the move page's clip only, alphas raised about 4x because its values are tuned for a white ground and vanish on `#16151a`. REJECTED: its Tailwind utilities (no Tailwind), "sm" and "md" on cards and controls (this file says hairlines, one step, hover is a `line-2` ring). |

| `/`, `/features`, `/json-to-video`, `/docs` (docs-site index) query-phrase copy pass | copy | `coreyhaines31/marketingskills`: `ai-seo` + `copywriting` (skills.sh) | From `ai-seo`: taken its report that ChatGPT 5.6 demoted listicle and comparison citations while owned product/docs pages with extractable structure held, which is why this pass went into `/`, `/features`, `/json-to-video` and the docs entry rather than a third comparison page; taken its Google-quoted rule against writing separate content for AI or fragmenting prose into machine-only chunks, so every phrase landed inside a normal sentence a person would read; taken "citation is not recommendation", so the new sentences describe how the engine works rather than arguing it is the best choice. REJECTED: FAQ/HowTo schema blocks, 40-60 word answer-block formatting, "last updated" freshness stamps, and the query-fan-out cluster-building exercise, none of which fit a site whose structured data already ships from `site/lib/schema.ts` and whose register is prose, not blocks. From `copywriting`: taken clarity/specificity/active-voice as line-edit checks only. REJECTED its whole page-structure framework (hero formulas, CTA formulas, rhetorical questions, humor): DESIGN.md and this site's existing hero/CTA copy already carry a considered voice (see `app/page.tsx`'s own comments on why the h1 reads as it does), and this pass edited supporting paragraphs, never the hero. |

**Two rules for filling a row in.**

Name the source precisely enough to re-fetch: `zeke/swiss-design (ui-skills)` can be re-read;
"some design skill" cannot. The registry command is `npm exec --yes -- ui-skills get <name>` (a bare
`npx` is rewritten by a local hook here and fails).

Say what you REJECTED, not only what you took. A fetched skill arrives with defaults that have not read
this project: a font stack, an icon set, a colour strategy. The local system wins on specifics, because
it has read these tokens and that register. Recording the rejection is what stops the next author
re-importing the default and calling it the house style.
