---
version: beta
name: Vawe
description: The site for an open source motion-graphics engine. Pure black, white type, neutral greys, hairlines, Geist; films in big rounded frames. Colour marks an action or a layer type, nothing else.
colors:
  accent: "#3291ff"
  accent-2: "#6cb0ff"
  accent-ink: "#000000"
  accent-soft: "rgba(50,145,255,.16)"
  accent-line: "rgba(50,145,255,.42)"
  ok: "#0eaf80"
  bad: "#ff7a7a"
  bg: "#000000"
  surface: "#0a0a0a"
  surface-2: "#111111"
  raised: "#171717"
  raised-2: "#222222"
  line: "#242424"
  line-2: "#3a3a3a"
  ink: "#ffffff"
  ink-2: "#ededed"
  muted: "#a1a1a1"
  dim: "#8f8f8f"
  lane-text: "#a67dff"
  lane-media: "#52525a"
  lane-shape: "#e0714f"
  lane-comp: "#cf5b98"
  lane-cap: "#3ea3ff"
  lane-sound: "#0eaf80"
  lane-camera: "#4fb3d9"
  lane-fx: "#d9c34f"
  lane-on: "#000000"
typography:
  sans:
    fontFamily: Geist
    fontSize: 16px
    lineHeight: 1.45
    fontWeight: 400
    letterSpacing: -0.004em
  display:
    fontFamily: Geist
    lineHeight: 1.05
    fontWeight: 600
    letterSpacing: -0.045em
  heading:
    fontFamily: Geist
    lineHeight: 1.1
    fontWeight: 600
    letterSpacing: -0.03em
  title:
    fontFamily: Geist
    fontWeight: 600
  mono:
    fontFamily: Geist Mono
rounded:
  panel: 12px
  inner: 4px
  control: 8px
  pill: 999px
spacing:
  page-gutter: 26px
  column: 1040px
  page: 1160px
  scale: [4px, 8px, 12px, 16px, 24px, 32px, 48px, 64px, 96px]
---

## Overview

Vawe turns one HTML page into one film, and the site shows what it rendered: the landing page, the
`/moves` gallery and `/launch-video` play the move clips in `public/moves/`. The look is Vercel's
restraint with Framer's staging (provenance row "the redesign, 2026-10-14"): a pure black ground, white
type, neutral greys, hairlines and a faint grid, Geist and Geist Mono, huge tight headlines, and films in
big rounded frames that scale in on scroll. The brief it answers to is `IDENTITY.md`.

The clips are the colour on the page.

## Colors

Colour has two voices and each has one meaning, plus one single-use third.

- **The accent, `#3291ff`, means you can act on it, or it is live.** Links, the focus ring, the
  active clip. It is used rarely. Text on the accent is black (`accent-ink`, 6.6:1);
  white on it measures 3.2:1 and is never used. As text it measures 6.6:1 on the ground.
- **A lane colour means that layer type**, as in the studio timeline. No page uses one since the
  JSON engine left the site; the tokens stay for the next surface that shows a timeline. A lane
  colour always sits next to a label, and as TEXT it is legal only on the ground: media fails there
  (2.35:1) and composite fails on a panel.
- **Gold, `--gold` `#f5c542`, means "star the repo"** and appears only as the star on the GitHub
  button's hover. A new voice because no existing token says "star"; 11.9:1 on the ground, and a
  ground-coloured stroke keeps it apart from the white button.

Nothing else gets colour. Buttons are ink on the ground (`btn-primary`) or ink on `raised`
(`btn-ghost`); a selected row is `ink` on `raised`, never the accent on its own tint, which measured
4.3:1.

Ink is measured on the ground (`#000`): `ink` 21:1, `ink-2` 17.9:1, `muted` 8.1:1, `dim` 6.5:1 (code comments and
read-outs beside a command). Surfaces are neutral: `surface` `#0a0a0a`, `surface-2` `#111`, `raised` `#171717`.
Structure is a hairline: `line` `#242424`, and `line-2` `#3a3a3a` where it must be seen (a film frame, a hovered edge).

## Themes

The site is black only, by decision (`IDENTITY.md`), and declares `color-scheme: dark`.

## Typography

Two faces, two jobs (`app/layout.tsx`, `next/font/google`):

- **Geist** carries headings, titles and prose. Headings and titles are 600 (`--fw-head`, the landing's weight) with
  tight tracking by size (`--track-display` -.045em, `--track-head` -.03em, `--track-sub` -.02em; the landing display
  lines go to -.06 and -.07em); body is 400 at 16px / 1.45. It has no width axis, so nothing reflows.
- **Geist Mono** is for anything literal: a count, a clock, a file path, a lane name, a code block. The `.meta`
  class is its uppercase read-out form, 11px with tabular numbers.

`--font-title` is kept as an alias of `--font-sans`, so a rule that asks for a title face still resolves.

Headings are fluid: every page h1 (content pages and `/blog`) is `--fs-h1`, `clamp(2.2rem, 4.6vw, 3.5rem)`, a section h2
`clamp(1.9rem, 3.4vw, 2.75rem)`, a panel h2 `clamp(1.5rem, 2.6vw, 2rem)`. Prose is capped at a
measure of `--measure` (46ch), set on the element that carries the type, because `ch` resolves against its
own font size. No functional text is under 12px.

## Typography rules

Two sources, one rule set: Matthew Butterick, *Practical Typography* (practicaltypography.com), and Pierrick Calvez,
"A Five-Minute Guide to Better Typography". Where they differ the stricter value holds. The house rule that overrides
both: no em dash (U+2014) anywhere. `quality/gates/site-typography.mjs` enforces rows 1, 3, 4, 6 and 7 from the source;
`scripts/site/typography-audit.mjs` measures the rest on a live server at 1440 and 390.

1. Body 16px (15px under 640), never under 14px for a sentence, 12px floor for a mono label: `--fs-body`, `--fs-label`.
2. Line length 45 to 70 characters (Butterick 45 to 90, Calvez 40 to 70): `--measure` on every text column, the blog column `--read-col`.
3. Line spacing 1.45 for reading text (Butterick 1.2 to 1.45, Calvez about 1.5), 1.3 for short text, 1.05 to 1.25 for headings: `--lh-body`, `--lh-ui`, `--lh-sub`, `--lh-head`, `--lh-display`.
4. Headings are 600, body 400, one skipped weight (Calvez): `--fw-head`, the only weight above 500; a CSS 700 to 900 fails the gate.
5. Hierarchy of at most three levels per page, sizes near a ratio of 2 (56, 32, 16): `--fs-h1`, `--fs-panel`, `--fs-body`; one h1 size on every content page.
6. Tracking by size, tighter as type grows: `--track-display`, `--track-head`, `--track-sub`; kerning and ligatures on in `body`.
7. All caps and small labels take 5 to 12 percent letterspacing and stay short: `--track-caps` .06em (.08em in the blog).
8. Headings balance, paragraphs avoid one-word last lines: `text-wrap: balance` on h1 to h3, `pretty` on p, li, dd, figcaption; `hanging-punctuation` on `body`.
9. Bold or italic, never both; underline only on links; centered text only for a short headline or a button row; paragraphs are separated by space, never indented.
10. Curly quotes and apostrophes, a real ellipsis, an en dash in number ranges, a nonbreaking space between a number and its unit, the multiplication sign between sizes: `site/lib/typo.mjs` (blog, move and ease data, move pages), `scripts/site/typo-fix.mjs` for page copy. Code keeps straight quotes.
11. Tables use tabular figures (`font-variant-numeric: tabular-nums`) and hairlines, not boxes.
12. Space above a heading exceeds the space below it in prose (`.bp-prose h2` 2.2em above, .4em below).

Not applied: Calvez's em dash (house rule); a line length of 45 inside cards and columns that sit beside a proof (a
card text column is 20 to 40 characters by design, set at 14 to 16px); optical alignment beyond `hanging-punctuation`
(Chrome ignores it, Safari honours it).

## Layout

The landing page is full-bleed (see "Landing"). On every other route `.wrap` is the page: 1160px wide with
26px gutters. Inside it, content sits in one centred 1040px
column (`.ls`, and `.ipage` on the content pages). Sections are separated by space, not by grey
bands; grouping is done with panels.

- `.ls` / `.ls-top`: a section, or a page's opening section with its h1.
- `.phead`: the page head on the content pages, one column, with an optional quiet
  breadcrumb (`.kicker`).
- `.isec`: one argument per panel, the text on the left and its proof on the right; a panel with no
  proof is one column.
- `.mv-grid` / `.mv-card`: move cards on `/moves`, three columns at desktop, two, then one.
- `.mv-bento`: the featured moves above the `/moves` grid, the first at 2 by 2 and four around it, two columns under 760; hidden under a filter or a search. The list is `## Featured` in `prompts/moves/README.md`.
- `.imoves`: a row of four move clips on an intent page (`MoveClips.tsx`), two under 900.

Breakpoints are 640, 760 and 900. A few older ones ship (560, 700, 860, 1000) and should fold into
that set when their page is next touched.

## Landing

`app/page.tsx`, `landing.css` (every class prefixed `lp-`) and `components/LandingMotion.tsx`.
Spike A, "full-bleed film scroll": the story is problem, page, render, result, then try it.

- **Hero:** one rounded frame the height of the viewport (`100svh`) holding the tracking HUD film, the h1
  at `clamp(3rem, 10.5vw, 11rem)`, one line of copy and two buttons. The bar floats over it
  (`.bar-overlay`: fixed, 72% black, 12px blur, one hairline). Under 760 the film is a 16:9 frame and the copy sits below it.
- **Three chapters**, each a whole film, never a move clip (the problem: retro-remix; the page: CINDRE; the result: the multi-beat showcase film, `/examples/showcase.*`, 14 s, audio stripped) (`.lp-ch`, 240svh tall; under 760 they do not pin and sit in normal flow): each pins a `100svh` stage (`position: sticky`) with one large
  film in a frame of 28px radius (16px under 640). `LandingMotion` writes `--in` (0 to 1 as the chapter enters)
  and `--out` (0 to 1 over the last 15%) on the chapter: the frame scales `.84 + .16 * in - .05 * out` and the caption
  fades and rises with `--in`. Plain CSS sticky and one rAF-throttled scroll handler, no animation library.
- **A rail** of one dot per chapter on the right edge (hidden under 900) shows the chapter; `aria-current` marks it.
- **Then:** the page contract (code and three commands on a faint grid), a 3-column grid of six move clips (2 under 900), the FAQ
  (the same `lib/faq.ts` data the FAQPage JSON-LD reads), and the way in.
- **Reduced motion:** the chapters do not pin, scale or fade, reveals show at once, and every clip holds its poster
  (`Clip.tsx`). **No script:** the CSS defaults leave every block visible.
- **No layout shift:** every film sits in a fixed-size frame with a poster; reveals move only opacity and transform.
- The scroll reveal (600 ms) and the chapter scale break the "under 300 ms" motion rule on purpose: they run once per
  scroll position and carry the story, they are not feedback to an action.
- Landing-only sizes are custom properties on `.lp` (`--fs-mega`, `--fs-chapter`, `--fs-section`, `--fs-end`, `--r-frame`).

## Features

`app/features/page.tsx`, `features.css` (classes prefixed `ft-`). The page is a content page: `.wrap` > `main.ipage.xp`, the
`.phead` with `PageTop` and the big h1, a `Toc` of the six sections, and it ends on CINDRE and then `Next` (the same ending as
every `.xp` page, so the footer has no bookend). The width is the 1040px `.ipage` column. Six sections (Miller), one `.isec`
panel each, 23 features in all: the page (4), same frames (4), light, blur and sound (4), moves and easing (3), the loop (5),
agents (3). A feature is a hairline row: a short headline, one or two lines, and ONE proof (a code or command block, a real
clip, a move strip or one number). Every claim reads off the repo or `bin/vawe <verb> --help`; the move, group and easing
counts read `lib/moves.json` and `lib/easing.json`, so they cannot drift. The blur proof says 1 to 32 subframes (the final's cap
in `render-page.mjs`); the older "1 to 3" was wrong. The CINDRE film is `/examples/cindre.*`, 10 s, audio stripped.

## Laws of UX on the landing and features

One line per law: where it shaped a section (lawsofux.com). The house rules for every page are in "Laws of UX" below.

- Jakob's law: the landing is a hero, chapters, FAQ and a close, the order every dev-tool page uses; features is a head, a section list and rows of text plus proof.
- Hick's law and choice overload: the landing hero has two buttons, the close has two, the features page adds none beyond `Next`.
- Fitts's law: every button and link is 44px tall; the hero and chapter films are the biggest targets on the page.
- Proximity and common region: on features each decision's text, proof and source file sit together, and the proof sits in the same row.
- Von Restorff: the pure black page has one standout per screen, a film frame or a 5xl number.
- Serial position and peak-end: the landing opens on the HUD film and closes on "Write the page."; the result chapter plays the showcase, the peak; features ends on CINDRE.
- Miller and chunking: six sections of seven features or fewer, four chapters, six moves.
- Doherty threshold: films sit in fixed-ratio frames with a poster and `preload="none"`, so there is no shift and nothing blocks paint.
- Aesthetic-usability: hairlines, one radius family and tight Geist type make the page read as easy to use.

## Elevation & Depth

Depth is one step: a panel is `surface` with a 1px hairline ring (`--ring`, which is `--line`), no drop shadow. Inside a
panel, a proof is a recessed well (`bg` or `surface-2`), never a second raised card. `--shadow-2`
and `--shadow-3` are kept small (12px and 16px blur) and appear only on a few catalogue cards.
The one exception is the clip on a `/moves/<name>` page, the page's hero media: a six-layer neutral
shadow under its ring lifts it off the ground (see the provenance row for `/moves`).

## Shapes

Four radii, all tokens: a panel is `--r` (12px), a control is `--r-ctl` (8px), a well or chip inside
a panel is `--r-in` (4px), a pill is `--r-pill`. Nested corners are concentric: outer = inner + padding
(the hero panel is 12 = 4 + 8). Some older routes still use 6px and 10px.

## Type scale

Few sizes, each with one job (`globals.css`, `--fs-*`). Body is 16px, inside Practical Typography's
15 to 25px for the web.

| token | size | job |
|---|---|---|
| `--fs-label` | 11px | mono caps read-outs only (`.meta`, `.foot-h`), tracked `--track-caps` (.06em) |
| `--fs-code` | 12px | mono code, the section strip |
| `--fs-ui` | 14px | controls, buttons, tabs, captions, nav, footer |
| `--fs-body` | 16px | prose and card text |
| `--fs-lead` | 18px | the hero's one paragraph |
| `--fs-h3` | 16px | card and FAQ titles: weight carries the rank, not the size |
| `--fs-h2`, `--fs-h1`, `--fs-display` | fluid | section, page and hero headings |
| `--fs-panel`, `--fs-sub`, `--fs-figure` | fluid | a panel h2, a sub-heading in a panel or document, a big mono number |

Line heights: `--lh-body` 1.55, `--lh-ui` 1.35, `--lh-head` 1.04. Body stays at 1.55, above
Butterick's 120 to 145%, because light text on the dark ground needs the extra lead (typeset's
light-on-dark rule). Prose is 45 to 75 characters a line; kerning is on (`font-kerning: normal`).
Weight never changes on hover or on a selected state, so nothing reflows.

## Space scale

`--sp-1` to `--sp-9`: 4, 8, 12, 16, 24, 32, 48, 64, 96px. The gap between groups is at least twice
the gap inside a group: card gap 12, section head to grid 32, section to section 96 (64 under 640).

## Motion

Curves are named tokens with the easing.dev values; durations stay under 300ms (Emil) and under
200ms for an interaction (Rauno).

| token | value | use |
|---|---|---|
| `--ease-out` | Out Quint `cubic-bezier(.23,1,.32,1)` | enters, hovers, state changes; `--ease` aliases it |
| `--ease-press` | Quick Out `cubic-bezier(0,0,.2,1)` | the press scale |
| `--ease-in` | In Cubic `cubic-bezier(.55,.055,.675,.19)` | exits |
| `--ease-in-out` | In Out Cubic `cubic-bezier(.645,.045,.355,1)` | a view moving on screen |
| `--dur-press` | 120ms | press |
| `--dur-hover` | 150ms | hover colour |
| `--dur-state` | 200ms | a small state change, a crossfade |
| `--dur-exit` | 150ms | exits are shorter than entrances |

Name each property in a transition, never `all`. No animation on what a visitor repeats (the FAQ
toggle, the strip, a tab switch): only colour and the press. The hero film loops because it IS the
product; reduced motion pauses it and sets every transition to 0.01ms.

## Interaction states

One rule per state, the same on every control:

- **Hover:** inside `@media (hover: hover)`; `raised` goes to `raised-2`, `ink` to `ink-2`, a text
  link gains its underline. Never a lift, never a weight change.
- **Press:** `scale: var(--press)` (.96) over `--dur-press` on `--ease-press`, on buttons, tabs and
  round controls; never on cards.
- **Focus:** `:focus-visible` only, `outline: var(--focus-ring)` (2px accent) at a 2px offset, on
  links, buttons, summaries and inputs; inset (-2px) where an outside ring would clip.
- **Selected / current:** `ink` fill with `bg` text (tabs, the strip, the sound toggle) or `ink` on
  `raised` (nav); `aria-pressed` or `aria-current` carries it, never colour alone.
- **Disabled:** `opacity: .5` and `pointer-events: none`; no hover, no tooltip.
- **Hit area:** 40px on desktop, 44px under 640; inline links in prose are exempt.

## Migration to the scales

Migrated (2026-10-13): the landing page (`page.tsx`, `landing.css`, `HeroSplit.tsx`, `SectionStrip`
styles) and the shared parts in `globals.css`: `.btn` (now 14px on `--r-ctl`, 44px tall), the focus
ring, `.ghbtn` and `.nav` timing, `.meta`, `.foot*`, `.ls`, `.ls-sub`, `.ls-grid`, body size.

Migrated (2026-10-14): every other route. `moves/moves.css`, `easing/easing.css`, `components/intent.css`,
`components/study.css`, `blog/blog.css`, and the bar (`.bar`, `.nav`, `.ghbtn`, `.mark`) and `.phead` in
`globals.css`. Dead rules `.row`, `.media`, `.num`, `.copy`, `.pop` and `.section` were deleted.

What stays literal on purpose, so the next grep does not report it as a leftover:

- The blog reading sizes (19 px body, 17 px on a phone, 20 and 24 px card titles) are custom properties on
  `.bl, .bp` in `blog.css` (`--fs-read`, `--fs-read-sm`, `--fs-card`, `--fs-card-lg`), measured under "Blog".
  The masthead and lead headings keep their own clamp: they are the blog's one decisive size each.
- The star on the GitHub button keeps its 320 ms overshoot curve (the provenance row for it).
- The SVG tick labels of the easing charts are 10 and 12 user units inside a scaled viewBox, not px.
- Layout measures (card minimums such as 230 and 190 px, `ch` measures, aspect ratios, `.wrap` gutter 26 px,
  the `.ls` 112 and 80 px landing offsets) are not on the space scale.
- `.mv-clear:disabled` is hidden, not dimmed, because the button reserves its place and a dimmed "Clear" on an
  unfiltered list reads as a control you missed.
- The blog's `min-width:1000px` for the table of contents (720 + 48 + 240 plus gutters) is a measured breakpoint.
- The `/easing/[slug]` demo boxes animate forever: they ARE the curve being shown. Reduced motion parks them.

New tokens from this pass (`globals.css`): `--fs-panel`, `--fs-sub`, `--fs-figure`, `--lh-sub`,
`--track-head`, `--track-display`, `--sp-panel` and `--gap-panel` (a content panel's padding and column gap),
and `--hit` (40 px, 44 px under 640), which every control's `min-height` uses.

## Components

- **Bar:** the wordmark, five links (Moves, Features, Easing, Blog, Docs), and GitHub as the one
  filled action. The current page is a `<span aria-current="page">` on `raised`, never a link.
- **Footer:** one panel with the generated link groups (`lib/site-pages.json`) and the Apache 2.0
  line. Pages that end a journey add a closing panel above it (`<Footer bookend />`).
- **Landing:** see "Landing". The old split hero (one player, two example films, tabs and a sound toggle) and the section strip left with spike A.
- **Move card** (`app/moves/`): the clip's 640 px poster at rest; its 640 px WebM plays while at
  least half on screen, six at most, and with reduced motion only on a tap. The move page shows the
  1280 px poster as an image and fades the 1280 px clip in over it once it plays. Hover rings sit
  behind `(hover: hover) and (pointer: fine)`, so a tap on a phone never leaves one stuck. A code block shows syntax by tone and weight
  (`ink`, `ink-2`, `muted`, italic comments), never by hue.
- **Focus:** `var(--focus-ring)` (2px accent) on `:focus-visible` for links, buttons, summaries and
  inputs. A field that cannot carry an outside ring uses a border change plus a 3px accent-tinted ring.
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

## Blog

`/blog` and `/blog/<slug>` (`app/blog/`, `blog.css`, `Cover.tsx`) read `content/blog/*.md` through
`lib/blog.ts`, the one owner of the front matter, the Markdown render (`marked`, GFM) and the post order.

**Section colour.** Each of the five sections borrows one lane colour: architecture `lane-shape`, agent
experience `lane-sound`, taste `lane-text`, measurement `lane-fx`, speed `lane-camera`
(`[data-s]` in `blog.css`). The lane rule holds: the colour means that section and always sits beside
its name (a swatch beside the section label on cards, filters and the post kicker).

**Index.** A masthead (an 800-weight h1 with its second half in `muted`, a dek, an RSS link), a filter row of native radios in a fieldset
(five sections plus All; `:has()` hides the other sections and shows the chosen section's intro; `/blog#<section>` selects one
with a five-line inline script, and without script every post shows), then one grid of equal cards in post order: three columns,
two under 900, one under 640. No featured card. A card (`Card.tsx`, shared with "Read next") is the cover at 1200/630, the section
label, a title clamped to three lines (height reserved), a description clamped to two, and one stretched title link over the whole card.

**Laws of UX applied** (lawsofux.com): Hick's law, six filter choices and no more; Fitts's law, the whole card is the link;
Von Restorff, no card stands out so the covers do; similarity and common region, one card shape, one hairline ring, one cover ratio;
proximity, 8px inside a card text block and 24px between cards; Jakob's law, a grid of cover, title and blurb is the blog card readers know;
chunking, numbered h2 sections and a table of contents on a post; measure, the prose line is 720px at 19px (about 65 characters);
peak-end, a post ends on "Read next" (three cards) and then the one call to action, with no second pager to choose between.

**No visible dates** (owner, 2026-10-13: dates showed posts clustered on a few days). Cards, "Read next"
and the post head show section and reading time only; the true dates stay in JSON-LD, the sitemap and RSS.

**Type.** The blog routes set headings and body in Geist like every other route. They used Plus Jakarta Sans
(chosen 2026-10-13) until the redesign of 2026-10-14 moved the whole site to Geist. The cover images under
`public/blog/` still carry Jakarta in their pixels. 

**The cover.** A post's cover is `public/blog/<slug>/thumb.webp`, the "dithered rays" style. `lib/blog.ts`
uses it when the file exists: on the index cards, as the post's header image (the post's hero diagram
then moves to the top of the body), as the Open Graph image (`[slug]/opengraph-image.tsx` converts it to
PNG, because LinkedIn does not read WebP) and as the JSON-LD image. Its alt is empty, because the
title always sits beside it. Without the file a card has no image and the share card is the generated one.

**Post.** A head (title, dek, mono meta with the issue number), the cover, a 720 px body and, from
1000 px, a numbered table of contents on the LEFT (240 px, sticky, the article to its right; under 1000 px it is hidden). The first paragraph is the lead by tone (`ink`), not by size. Each h2
carries its mono number, matching the TOC. Figures are mounted on a `surface` panel with a `Fig. 01` mono
caption; tables sit on a panel and scroll inside it; code blocks have a header strip with the language,
tone and weight only, never hue; a blockquote is a pull quote. The end is a "Made with vawe" panel (the
wave glyph, the repo and `/docs`), the newer and older pager, and three "Read next" cards with covers
(same section first; there is no cluster field yet).

**Typography (Butterick, *Practical Typography*, 2026-10-13).** Measured on `/blog/chrome-per-lane`:
body 19 px / 1.42 at 1440 (69 characters per line, was 17 px / 1.65, 71), 17 px / 1.45 on a 390 px phone
(36 characters: the 338 px column cannot reach 45 at a readable size). Kerning, `liga` and `calt` on;
`optimizeLegibility` on headings; space between paragraphs (.75em), never also an indent; h2 24 px / 700,
h3 19 px / 700, line-height 1.2 to 1.3, more space above a heading than below; display heads at 1.08 to
1.1; all-caps mono meta, kickers, table heads and figure labels at 8% letterspacing, each item on one
line; bold never with italic; links a 1 px underline at .2em offset; tables `tabular-nums`;
`hanging-punctuation` where supported; `text-wrap: balance` on headings, `pretty` on prose.
`smartHtml()` in `lib/blog.ts` sets curly quotes and apostrophes, `…` and en-dash number ranges (1–16, not
dates) on text nodes only, never inside a tag, `<code>`, `<pre>` or a URL, and never writes an em dash;
`smart()` does the same for titles and descriptions on the pages. Plus Jakarta Sans's `calt` draws "3x"
as "3×". From typeset: role contrast by tone before size, which agreed with Butterick; its 45 to 75ch
range taken as 60 to 75 at desktop.

**Rejected cover direction.** `scripts/site/blog-thumbs/thumb.html` (numbers in Archivo with a motif
per section, every choice a `--cover-*` custom property, `node scripts/site/blog-thumbs.mjs` for six
samples in `out/blog-thumbs/`) was the candidate the owner did not pick. It stays as a restylable template.

Shaped by ui-skills `jakubkrehel/better-typography` (first pass), then `pbakaus/bolder` and
`pbakaus/typeset` (pages) and `anthropics/canvas-design` (the rejected covers); see the provenance rows.

## Laws of UX

The laws from lawsofux.com (all thirty were read), as house rules for every page. One line each; the
selectors that carry them are in `components/xp.css`, `components/Xp.tsx` and `moves/moves.css`.

- **Jakob's Law and mental model:** a page looks like the web's pages: a breadcrumb trail (`PageTop`), a header nav of four items, a footer sitemap. No new pattern for a known job.
- **Hick's Law and choice overload:** one primary action per page end (`Next`: one white button, one quiet button, then a ruled list). More than seven equal choices fold or filter (the moves list has search and facets; a long chip list folds behind a `details`).
- **Miller's Law and chunking:** a group holds seven items or fewer. A paragraph that lists three or more things becomes a numbered list (`.xp-list`); sources fold (`Sources`).
- **Fitts's Law:** a target is 40 px on desktop and 44 px under 640 (`--hit`). Jump links, breadcrumbs, the list rows of `Next` and the card links meet it. A whole card is one target.
- **Proximity and common region:** one idea per hairline panel; the gap between panels is larger than the gap inside one.
- **Similarity and uniform connectedness:** the same job has the same look. The comparison pages share one order (head, jump links, table, detail, FAQ, `Next`), equal choices share one frame (`.xp-alt`), and a hairline connects a list's rows.
- **Prägnanz and Occam's Razor:** the simplest form wins. A repeated line of copy goes. A footer group with one link joins another group. A control that repeats the header (the open source pill) goes.
- **Von Restorff:** one thing per view differs. The white button is the only filled control in a page body; the vawe column of a table is the only tinted column; Now is the only roadmap column with the live dot.
- **Serial position and peak-end:** the answer comes first (the table sits above the prose) and every page ends on `Next`, never on a bare footer. The h1 is the peak: `--fs-page`.
- **Cognitive load, selective attention and working memory:** show less until asked. Evidence and sources are for checking, so they fold. Jump links show the shape of a long page, so a reader does not hold it in mind.
- **Goal-gradient and Zeigarnik:** a long page shows progress (the `.xp-progress` hairline, a scroll timeline, off under reduced motion) and its section list at the top.
- **Tesler's Law and Pareto:** the complexity of a move or an ease stays on the page, but the 20 per cent a reader needs first (the clip, the code to copy) comes first: on an ease page the code sits above the numbers.
- **Doherty Threshold and flow:** the page reacts in under 400 ms. Hover and press take 120 to 200 ms, no content waits on a script, and a card paints its poster first.
- **Aesthetic-usability:** one ground, two faces, hairlines, a big headline. A page that looks finished reads as easier to use.
- **Postel's Law:** a filter accepts any mix of facets and a search; the URL it writes is one the page reads back.
- **Parkinson's Law, paradox of the active user, cognitive bias, Flow:** no page asks for a manual to be read first. The action is on the page that names it.

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
| **Copy cut and /easing tool pass, 2026-10-14:** `/easing`, `/easing/[slug]` and the copy of every route | Reference tool: search, role chips (Entrance, Exit, Move, Overshoot), a copy button per card, a compare tray, a duration control on the demo; copy that gives a fact, an instruction, a number or a reason | `impeccable` (`clarify`, `distill`, the AI-tells list, `scripts/detect.mjs` before and after), `jakubkrehel/better-writing` (verb-first buttons, links that name their target, no blame or filler, empty state says the next step), `pbakaus/distill` (remove what does not help the task) | Rejected: better-writing's "sentence case for every element" and "Learn more" suffix rules where the page has no such label; distill's default of flattening grouped lists (the groups match how people choose an ease, Hick). Detector findings left on purpose: `overused-font` (Geist is the owner's choice), `extreme-negative-tracking` on display type. |
| **Laws of UX pass, 2026-10-14:** `/moves`, `/moves/[name]`, `/easing`, `/easing/[slug]`, `/ai-agents`, `/determinism`, `/when-determinism-matters`, `/launch-video`, `/remotion-alternatives`, `/hyperframes-alternatives`, `/vs/*`, `/problems`, `/roadmap`, the footer | brand | lawsofux.com (every law read); ui-skills `pbakaus/layout` and `ibelick/baseline-ui` | Taken from layout: group by meaning before adding containers, the squint test for reading order, a thesis of primary path per page. Taken from baseline-ui: icon-only controls carry a label, no layout-property animation (the progress hairline is a scale). REJECTED: baseline-ui's whole Stack (Tailwind, `cn`, `motion/react`), its "no animation unless asked", and layout's 4-unit scale advice (the space scale already exists). Local tokens win. The `/features`, blog and landing pages were not touched, so they still use the old head sizes; `.xp` scopes the new layer. The docs app is separate and out of scope. |
| **the redesign, 2026-10-14:** tokens, type, `/` (spike A), every route follows the tokens | brand | Spike A of the landing spikes ("full-bleed film scroll: four pinned chapters, one huge film each", `out/spikes/landing/a.html`), chosen by the owner. Direction: Vercel (pure black, white type, neutral greys, hairlines, faint grid lines, Geist and Geist Mono from `next/font/google`) and Framer (huge bold headlines with tight tracking, films in big rounded frames that scale and fade in on scroll, pinned storytelling). ui-skills `leonxlnx/minimalist-skill`, `jakubkrehel/better-typography` and `mengto/gsap-scrolltrigger-storytelling`, applied in the spike | Taken: from minimalist, restraint, one accent, hairlines, no gradients except the film scrim; from better-typography, tight tracking on display sizes, `text-wrap: balance` on headings and `pretty` on prose, tabular mono; from gsap-scrolltrigger-storytelling, the pin-and-scrub structure (pinned stage, progress 0 to 1, scale and fade). REJECTED: GSAP and ScrollTrigger (plain CSS `position: sticky` and one rAF scroll handler do the same with no dependency), minimalist's serif and warm palette, a Vercel-blue `#0070f3` accent (4.4:1 as text on black, so the accent became `#3291ff` at 6.6:1), the spike's 24px film radius token on non-landing panels (panels keep 12px), Plus Jakarta Sans on the blog (the owner chose Geist for the whole site). The old split hero, the two-film tabs and the section strip were deleted. Not done: `og.png` and the blog cover images are rasters and keep the old look until re-rendered. |
| **blog index, 2026-10-14:** one equal-card grid, post and index laws | product | ui-skills `pbakaus/layout` (reading order, grouping, one spacing rhythm, structure that matches the content) and `pbakaus/distill` (remove what does not earn its place), plus lawsofux.com | Taken: from layout, equal items get one repeated structure and spacing carries grouping before extra containers; from distill, the featured card, stats row, per-card reading time, second pager and inner card padding went. REJECTED: both skills' detector scripts and their ask-the-user steps (not available here), a featured lead (Von Restorff: nothing is the standout, the covers carry it), the 12-column mixed-width rhythm, hiding descriptions on small cards (sizes differ by card, which is the owner complaint). Fonts untouched: Geist stays until the owner decides. |
| **studio rebuild, 2026-09-25:** tokens, type, every route | brand | `ui-ux-interview` (local), then ui-skills `jakubkrehel/better-colors`, `better-typography`, `mengto/landing-page`, `jakubkrehel/better-layout`, `better-ui`, `better-interface`, `pbakaus/distill`, `pbakaus/colorize`; `impeccable detect` on every route at 1440 and 390 | The full record is `IDENTITY.md` → Skills used and rejected. Rejected: stock gradient heroes and logo walls, pill navs on colour bands, icon badges on every card, colour as decoration, a sticky rail on content pages. Kept on purpose against `impeccable`: clipping in the editor frame and the playground field (deliberate), and a generator's glow (the engine's own artwork). Not reviewed: better-accessibility and better-writing were not loaded. |
| `/`, split hero with a live film, timeline and scene file | brand | `mengto/landing-page`, `emilkowalski/emil-design-eng` | The hero plays a film through the in-browser engine, with its layer bars in lane colours and its scene file one tab away; all three read one scene JSON. Rejected: mp4 loops, which had drifted from their scenes. |
| `/showcase`, `/launch-video`, `/product-tour-video` film cards | brand | `pbakaus/colorize` | Idle face is the film's own layer timeline; only a hovered card boots an engine. |
| `site/app/components/ogCard.tsx`, `site/og/card.html` | brand | local tokens only | Black ground since 2026-10-14; the card still sets Archivo, because Satori reads woff and Geist ships as woff2. Satori reads woff, so the font lock carries `Archivo-400/800.woff`. |
| `/moves`, `/moves/[name]` filters and fluff pass | product | ui-skills `jakubkrehel/better-accessibility`, `pbakaus/distill`, `leonxlnx/minimalist-skill` | Taken: native checkboxes and fieldsets, visible focus, a polite status count, 44 px targets on touch (accessibility); remove what carries no information, show less until asked (distill); no emoji, no gradient, no stacked shadow, plain copy (minimalist). Rejected from minimalist: its serif and warm palette, pastel pill tags, staggered scroll entry, drifting background blob, card lift on hover. Local tokens and Archivo win. |
| `/moves` featured bento | product | ui-skills `zeke/swiss-design` (grid principles only), four local mock layouts chosen by the owner (bento) | Taken: one grid, size as the rank signal, one accent. Rejected: its IBM Plex face and stone palette, which the studio tokens replace. Picks come from a blind three-reviewer score of every clip. |
| `/` hero film switcher (tracking HUD, retro remix) | brand | ui-skills `pbakaus/layout`, `ibelick/fixing-motion-performance` | Taken: group by meaning with proximity (tabs sit with the caption they switch, no new card), `gap` for rhythm, collapse at 640 to 44 px targets; one video element mounted at a time, no layout-affecting animation. Rejected: layout's 4-unit spacing scale and density param (no scale here), a separate gallery section (the hero already owns the film slot), motion-performance's will-change and scroll-linked advice (nothing scroll-linked). Local tokens and Archivo win. |
| `/arsenal` | product | `ibelick/improve-ui` (ui-skills), rail pass only | Its PROOF GATE taken: a hierarchy finding needs rendered or user evidence, never a source read, so the rail was screenshotted before and after rather than argued about. That gate is what turned "the two levels look alike" into the actual cause: `.rail a` in globals.css is (0,1,1) and `.ar-ax-kind` was (0,1,0), so the leader's `--ink` never applied and it rendered in its children's grey. Its READ-ONLY boundary rejected, because a fix was asked for. The rest of the page predates this convention: hairlines for structure, one elevation step and only on hover, mono for anything literal, sources lost. Re-derive from the code, do not guess. |
| `/editor` | product | **UNRECORDED** | Same. |
| `/showcase`, `/`, `/features` | brand | **UNRECORDED** | Same. |
| `/playground` (rail layout, colour fields) | product | `ibelick/baseline-ui` (ui-skills), Tailwind/animation rules rejected | Read `ui-skills categories` first, then `list --category craft` for a fast cleanup pass on a layout reading as unfinished. Taken, translated off Tailwind onto this site's own CSS: truncate dense UI text instead of letting it wrap or collide (the rail's kind label moved under the name and both truncate, `.pg-rail a`), one clear next action on an empty state rather than a paragraph floating on white (`.pg-empty`, a hairline card, never a shadow, per this file's own Elevation rule), tabular-nums on data (already this file's rule, unchanged), one accent per view (already true here, unchanged). REJECTED wholesale: its whole Stack and Components sections (Tailwind, `cn`, Base UI, `motion/react`, `tw-animate-css`) and every Animation rule, none of which this route or this repo uses; its z-index and shadow-scale defaults, both already fixed by this file's own closed set. Also read `emilkowalski/emil-design-eng` (ui-skills) from the same listing and rejected it entirely for this surface: it is a motion/animation-engineering skill end to end, and the fault the owner named (a rail that reads unfinished) is spacing and typography, not motion; nothing in it was applicable and it was not fetched a second time to force a fit. |
| `/arsenal/effects/family/[id]` (58 hubs) | product | `pbakaus/polish` (ui-skills), nothing rejected | Its "fix at the narrowest correct level, do not build a new abstraction for one local exception" principle is what decided the build: the card and chip grid plus `.fxfam .fxintro .fxchips .fxgrid` already existed in `arsenal/effects/effects.css`, dead since the old family rail was deleted in `ce5e3023`. The hubs re-use that rendering rather than adding a component. Nothing in the skill conflicted with this file, so nothing was rejected. |
| `site/app/components/ogCard.tsx` (every generated share card) | brand | `jakubkrehel/better-ui` + `jakubkrehel/better-typography` (ui-skills) | Taken: concentric radius (outer = inner + padding), optical over geometric alignment, a 1px image outline at `oklch(0 0 0 / 0.1)` and NEVER a tinted neutral, negative tracking on the large heading, positive on the small uppercase label, balanced heading wrap. better-ui's "shadows for elevation, borders for structure" REJECTED outright: this file says hairlines instead of shadows and it owns the question. Every motion rule in both skills is inert on a PNG. |
| `/determinism`, `/json-to-video`, `/ai-agents` | brand | `jakubkrehel/better-typography` (ui-skills) | Measure cap, heading scale, `text-wrap: balance` on headings and `pretty` on descriptions taken. Its font stack and Tailwind scale REJECTED: this site owns Anybody and JetBrains Mono, and the existing `.phead`/`.tag`/`.codeblock` classes already carry the register. |
| `/json-to-video`'s `.iproof` (JSON next to the video it renders, above the fold) | product | no new fetch, local reuse only | Checked `ui-skills categories` first; a two-up code-plus-media pairing is exactly what `.isec`/`.codeblock`/`.demo-media` already carry (see the row above and `/features`' `.fsec`), so a new skill's defaults would only have re-argued a solved layout question. Composed `.iproof-art` as a flex row of the existing `.codeblock` and the existing `Clip` component rather than adding either a new primitive or a new page; the video keeps its real 9:16 (the deleted JSON sample's own aspect) instead of being cropped into `.demo-media`'s fixed 16:9. |
| The footer, both variants, every page | brand | `pbakaus/layout` then `jakubkrehel/better-ui` (ui-skills) | The site used to end two different ways: a cobalt band with pills on the home page, a hairline rule with grey links everywhere else. It now ends one way. `pbakaus/layout` gave the grouping ("group by meaning, use proximity before adding containers"); its 4-unit spacing scale REJECTED, this site has no spacing scale and DESIGN.md records that as a known gap. `better-ui` gave three exact values, not ranges: motion restraint, so the pill hover is 150ms rather than the 200ms it inherited, because a footer link is high-frequency and "a custom animation there charges its attention cost on every trigger"; `scale(0.96)` on press, "always 0.96"; and transition only what changes, naming `background` and `scale` rather than `all`. Its "shadows for elevation, borders for structure" default REJECTED: this file says hairlines instead of shadows and owns that question. THE RULE THIS SURFACE RE-LEARNED THE HARD WAY: the column headers shipped at `rgba(255,255,255,.62)` and measured 2.95:1 on cobalt where 12px text needs 4.5, and white has to reach 92% to pass, which is no longer a muted colour. `site/CLAUDE.md` rule 2 already says this about the accent at 75%; the same physics apply to white. Hierarchy is carried by size, case and tracking, which cost no contrast, and the current page inverts to a filled white pill (18.17:1) rather than dimming to 2.75:1. |
| `/launch-video`, `/product-tour-video` | brand | `pbakaus/layout` (ui-skills) | Section rhythm and grouping taken. Content shaped by what the repo has actually rendered rather than by the skill: the deleted films.json and the per-type spine of the deleted vawe-type skill, so each page shows a real film rather than a described one. |
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
| `/problems`, `/roadmap`, `/vs/[slug]`, `/hyperframes-alternatives` (2026-10-03) | brand | ui-skills `pbakaus/typeset` (one skill); layout ideas only from VoltAgent/awesome-design-md `vercel` DESIGN.md | typeset: TAKEN, role contrast by size and tone (title, mono label, body, metadata), 45 to 75ch measure, 16px body, mono for every figure. Vercel spec: TAKEN as layout idea only, large gaps between panels and tight interior, 3-up collapsing to 1-up. REJECTED: its 4px spacing tokens, mesh gradient, pill buttons, and `impeccable detect` (not installed). Status chips use shape (filled, half, ring dot) not hue, because colour here means act-on-it or a lane. Rules in `app/components/study.css`, shared by the three routes. Second pass: icons are inline Lucide paths (ISC) in `app/components/Icon.tsx`, no dependency; images are only vawe's own move posters and clips, and the ease curve is drawn from `core/motion` `easeFn` points in `ease-curves.json`. Competitor logos are NOT used: no official page allows a logo in a comparison (Remotion terms reserve logos; HyperFrames, Motion Canvas and Lottie state nothing), so names are plain text. |


| `/features` rebuild, blog TOC left, `/easing` in the nav (2026-10-14) | product | no new fetch; the `.xp` layer, `.isec` and `.codeblock` reused | Features joined the content pages instead of keeping its own 1160px layout. The blog TOC moved left and sticky (an earlier rule rejected a sticky rail on content pages; the owner asked for it on posts, where the article is long). `/easing` was in the footer but not the header; the header stays at five items. |
| `/blog`, `/blog/[slug]`, RSS (2026-10-13) | brand | ui-skills `jakubkrehel/better-typography` | Measure, line-height, wrap and underline rules taken; its scale and Tailwind specifics rejected; TOC not sticky by the rebuild rule. |
| `/blog`, `/blog/[slug]` typography pass (2026-10-13) | brand | Butterick, *Practical Typography* (practicaltypography.com, summary of key rules and the headings page); ui-skills `pbakaus/typeset` where it agreed | Taken: body 15 to 25 px web range (19 px), 120 to 145% line spacing (142%), 45 to 90 characters (69 at desktop), curly quotes, bold or italic sparingly and never together, underline only links, 5 to 12% caps letterspacing (8%), kerning on, space or indent not both, headings bold and only as large as needed with space above. REJECTED: Butterick's dislike of free fonts (the owner chose Plus Jakarta Sans) and title-case advice (titles are front matter). |
| GitHub button star hover (2026-10-13) | brand | ui-skills `emilkowalski/animate` (from `list --category motion`) | Taken: CSS transitions so a quick hover-out retargets; transform and opacity only; never `scale(0)` (starts at .5); its strong ease-out `cubic-bezier(.23,1,.32,1)` for the exit (140 ms) and an overshoot for the 320 ms entrance; reduced motion shows the star with no motion; hover and `:focus-visible` both trigger. REJECTED: its frequency gate ("hover: near-imperceptible or nothing"), because the owner asked for a visible star-the-repo hint, and its Motion library advice (CSS only, no dependency). Not loaded: `pbakaus/delight`, `emil-design-eng`. |
| `/blog`, `/blog/[slug]` type: Plus Jakarta Sans (2026-10-13) | brand | owner decision | The owner picked Plus Jakarta Sans over Archivo, Geist and Bricolage on 2026-10-13, for the blog routes only. Mono stays for numbers and meta; the bar and footer keep Archivo. Headline tracking loosened from -.045em to -.032em, because Jakarta is set tighter than Archivo. |
| `/blog`, `/blog/[slug]` personality pass, blog covers (2026-10-13) | brand | ui-skills `pbakaus/bolder`, `pbakaus/typeset` (pages); `anthropics/canvas-design` (covers). Read `start`, `categories`, then `list` for visual, taste, typography and motion first | bolder: TAKEN, amplify what the system already owns (Archivo 800 at display size, mono read-outs, lane colours by meaning) instead of new effects; one decisive move per surface (the masthead h1 and the cover number) with everything around it quiet; the skeleton test (cards still read as ranked by size with the copy removed). REJECTED: its "touch only the named target" scope rule (the owner asked for the whole blog) and any new colour, font or radius. typeset: TAKEN, role contrast by size, weight and tone (title, dek, lead, body, mono meta), a 680 px measure, light-on-dark compensation (lead at 1.55, body at 1.65), tabular numbers. REJECTED: `impeccable detect` (not installed) and its live-mode `scale` param. canvas-design: TAKEN, the "systematic observation" register (registration marks, tick scales, mono labels, a dot lattice, dense repeated marks), a limited palette per cover, nothing overlaps, refine before adding. REJECTED: its philosophy .md and PDF output, thin type (Archivo 800 is the site's display face), downloading fonts, and its "masterpiece" framing. Motion: no skill loaded; the pages have no animation beyond 150 ms colour and ring hovers, off under reduced motion. Local tokens and faces win everywhere. |
| `/easing`, `/easing/[slug]` (44 pages, 2026-10-03) | product | ui-skills `ibelick/fixing-metadata` (taken); `ibelick/baseline-ui` (fetched, rejected); layout read from the Vercel spec on getdesign.md (VoltAgent/awesome-design-md) | fixing-metadata: TAKEN, one `pageMetadata` call per page, title, description (under 155), canonical and JSON-LD agreeing, deterministic dates. baseline-ui: REJECTED, it assumes Tailwind, `cn` and `motion/react`, none of which this site uses. Vercel spec: TAKEN for the idea only, hairline panels and a spec-sheet layout of numbers then code; its Geist faces and monochrome palette rejected. Local tokens won: the curve line is the accent (it is live data), everything else is ink and muted; the `.mv-code` block and `moves.css` are reused. The charts are server-rendered SVG from `lib/easing.json`, built by `scripts/site/easing.mjs`. |
| `/` craft pass and the scales (type, space, radius, motion, states), 2026-10-13 | brand | Practical Typography (practicaltypography.com/summary-of-key-rules.html) | TAKEN: body 15 to 25px (16 kept, card and FAQ text raised from 15), 45 to 90 characters a line (hero copy column widened from 34 to 45), caps tracked 5 to 12% (.04em to .06em), kerning on, curly apostrophes in prose. REJECTED: line spacing 120 to 145% (body stays 1.55 for light on dark); its professional-font advice (Archivo, Unbounded, JetBrains Mono are owned). |
| same | brand | interfaces.dev/cheat-sheet | TAKEN: hit areas 40 desktop and 44 touch (play, sound, tabs, FAQ rows, "Read the page", footer links), `:focus-visible` ring on every control, hover inside `@media (hover: hover)`, named transition properties, concentric radius (hero panel 12 = 4 + 8), 1px outline at 8% white on the film, `-moz-osx-font-smoothing`, `text-underline-position: from-font` and skip-ink, group gap twice item gap. REJECTED: press scale .95 to .98 at 200ms (DESIGN.md says .96 at 120ms), "layered shadow instead of border" (hairlines own this here), light-mode rules (dark only). |
| same | brand | emilkowal.ski/ui/you-dont-need-animations | TAKEN: no animation on frequent actions (FAQ toggle, strip, tabs: colour and press only), every duration under 300ms, the hero film kept because it explains the product. REJECTED: nothing; the page had no decorative entrances left to cut. |
| same | brand | shedsgns.me/taste | TAKEN: restraint and "the right amount of nothing": icon badges cut from the four "What you get" cards (IDENTITY.md already rejects them), the hero kicker moved from accent to muted (colour means act-on-it), the second "Write a page. Get a film." heading renamed "How it works." so the hero line is said once. REJECTED: nothing checkable beyond that; it gives no numbers. |
| same | product | interfaces.rauno.me | TAKEN: interactions at 200ms or less, no weight change on a selected tab (600 removed), hover only on hover devices, `muted playsinline` on autoplay video (already true). REJECTED: focus rings as box-shadow (outline is the house ring and survives forced colours), arrow-key lists and ⌘Backspace (no lists here). |
| same | product | rauno.me/craft/interaction-design | TAKEN: frequency and novelty decide motion (same as Emil), Fitts on edges (the strip docks to the viewport bottom). REJECTED: gesture and pinch rules (no gestures on this page). |
| same | product | tasteskill.dev (Taste Skill) | TAKEN: audit first, then fix, with a pre-flight pass (the before and after screenshots at 1440 and 390). REJECTED: its design-system mapping (Material, shadcn) and dual-mode default (dark only by decision). |
| same | product | userinterface.wiki (rules in github.com/raphaelsalaja/userinterface-wiki/skills/SKILL.md) | TAKEN: press and hover 120 to 180ms (`--dur-press` 120, `--dur-hover` 150), small state 180 to 260ms (`--dur-state` 200), entrances ease-out and exits ease-in (`--ease-out`, `--ease-in`), similar elements share timing, a consistent spacing scale, caps letter-spacing, `text-wrap: pretty`. REJECTED: Fitts minimum 32px (stricter 40 and 44 from interfaces.dev win), springs and AnimatePresence rules (no React motion library), oldstyle numerals (mono figures stay tabular). |
| same | product | easing.dev (Easing Graphs) | TAKEN: exact curves for the motion tokens: Out Quint `(.23,1,.32,1)`, Quick Out `(0,0,.2,1)`, In Cubic `(.55,.055,.675,.19)`, In Out Cubic `(.645,.045,.355,1)`. REJECTED: Overshoot and Anticipate (no overshoot on site controls; films own that). It gives no durations. |
| same | product | designsystemchecklist.com (text in github.com/ardakaracizmeli/design-system-checklist) | TAKEN: what the token set must cover: units on a 4px step, type scale with readability (tracking, leading, measure), a z-index system (already closed), easing and duration values, reduced motion. REJECTED: shadow per elevation level (one elevation step here), light and dark palettes. |
| same | brand | lawsofux.com | TAKEN: Fitts (bigger primary targets, full-width CTAs under 640), Hick (two hero actions, one per card panel), Jakob (native `details`, a plain FAQ, a standard footer), proximity and common region (panels group, gaps rank), Doherty under 400ms (all feedback under 200ms). REJECTED: none; Miller's 7 is not a layout rule. |
| same | brand | raphaelsalaja.com/library/the-concept-of-taste | TAKEN: hierarchy, proportion and clarity as checks: one display size, one lead, one body, labels in mono. REJECTED: nothing checkable beyond that. |
| same | product | devouringdetails.com | TAKEN: its public principle list only (inferring intent, responsive interfaces): the pressed tab and sound toggle answer at once. REJECTED: the paid chapters were not read, so nothing else is claimed from it. |
| same | brand | benji.org/family-values | TAKEN: one family: every control on the page now shares radius `--r-ctl`, the press scale, the hover step and the timing (the hero buttons were 12px radius and 15px beside 8px tabs at 13px). Delight inverse to frequency, same as Emil. REJECTED: trays, text morphing and easter eggs (a marketing page, nothing repeated enough to earn them). |
| same | product | practicaltypography.com (Butterick: Typography in ten minutes, Summary of key rules, body text, line length, line spacing, all caps, letterspacing, kerning, hierarchy, quotes, dashes, ellipses, nonbreaking spaces, bold or italic, underlining, centered text, tables) and pierrickcalvez.com/journal/a-five-minute-guide-to-better-typography | TAKEN: the "Typography rules" section, the type tokens (`--measure`, `--lh-*`, `--fw-head`, `--track-*`), `lib/typo.mjs`, the audit and the gate; the stricter value where the two differ (line length 45 to 70, 12px label floor, a skipped weight). REJECTED: the em dash both guides use (house rule), first-line indents, 800-weight headings. The owner's reference weight is the landing's 600. |

| every remaining route on the scales (2026-10-14) | product | the 14 sources of the landing pass (rows above, same text) applied to `/moves`, `/easing`, the intent pages, `/problems`, `/roadmap`, `/vs/*`, `/blog`, the bar; ui-skills `pbakaus/polish` (fetched) | polish: TAKEN, classify each drift (missing token, one-off, local defect) and fix at the narrowest level: a missing token became `--fs-panel`, `--hit` and friends, one-offs became existing tokens, the local defect was the `.ez-note` class used for both SVG labels and a paragraph, so the paragraph rendered in mono. Also TAKEN from the sources: 40/44 px targets on every control, hover only inside `(hover: hover)`, the house focus ring, press scale on buttons and pill controls, tabular numbers on tables, no layout shift. REJECTED: polish's critique-storage commands (no impeccable install here), `impeccable detect`. The blog kept its Butterick sizes as local custom properties. Verified with before and after shots at 1440 and 390 of 17 routes (`out/site-scales/`). |

**Two rules for filling a row in.**

Name the source precisely enough to re-fetch: `zeke/swiss-design (ui-skills)` can be re-read;
"some design skill" cannot. The registry command is `npm exec --yes -- ui-skills get <name>` (a bare
`npx` is rewritten by a local hook here and fails).

Say what you REJECTED, not only what you took. A fetched skill arrives with defaults that have not read
this project: a font stack, an icon set, a colour strategy. The local system wins on specifics, because
it has read these tokens and that register. Recording the rejection is what stops the next author
re-importing the default and calling it the house style.

### Features page and Laws of UX (2026-10-14)

Used: `pbakaus/layout` (group by proximity before adding containers; one spacing scale) and `danilaa1/compact-landing`
(real product content, no fake metrics; one product-native artifact per section). Rejected: compact-landing's random design
fingerprint, its 440px column and its button-size question; the local tokens win.
