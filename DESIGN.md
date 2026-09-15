---
when: you want the reasoning behind the engine design, not the API
answers: "the design rationale: why one module, why JSON, why determinism is the constraint everything bends to"
group: project
name: Vawe
description: One JSON, one video. A deterministic motion-graphics engine, and the site that proves it.
colors:
  cobalt: "#2563eb"
  cobalt-deep: "#1d4ed8"
  cobalt-tint: "#eef3ff"
  cobalt-line: "#cfe0ff"
  cobalt-on-dark: "#8fc0ff"
  paper: "#ffffff"
  paper-alt: "#f6f8fb"
  field: "#e9ecf1"
  ok: "#2f7d55"
  bad: "#a3282d"
  hairline: "#e7eaf0"
  hairline-firm: "#d7dce4"
  ink: "#0f1620"
  ink-secondary: "#454f5e"
  ink-muted: "#697182"
typography:
  display:
    fontFamily: "Anybody, system-ui, sans-serif"
    fontSize: "clamp(2.9rem, 7.2vw, 6rem)"
    fontWeight: 800
    lineHeight: 1
    letterSpacing: "-0.022em"
    fontVariation: "wdth 105"
  headline:
    fontFamily: "Anybody, system-ui, sans-serif"
    fontSize: "clamp(1.7rem, 3.4vw, 2.5rem)"
    fontWeight: 800
    lineHeight: 1.06
    letterSpacing: "-0.018em"
    fontVariation: "wdth 105"
  title:
    fontFamily: "Anybody, system-ui, sans-serif"
    fontSize: "1.08rem"
    fontWeight: 400
    lineHeight: 1.6
    letterSpacing: "-0.004em"
    fontVariation: "wdth 100"
  body:
    fontFamily: "Anybody, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.55
    letterSpacing: "-0.004em"
    fontVariation: "wdth 100"
  label:
    fontFamily: "JetBrains Mono, monospace"
    fontSize: "12.5px"
    fontWeight: 500
    lineHeight: 1.2
    letterSpacing: "normal"
rounded:
  sm: "9px"
  md: "12px"
  lg: "14px"
spacing:
  xs: "8px"
  sm: "13px"
  md: "22px"
  lg: "26px"
  xl: "70px"
components:
  button-primary:
    backgroundColor: "{colors.cobalt}"
    textColor: "{colors.paper}"
    rounded: "{rounded.md}"
    padding: "13px 22px"
    typography: "{typography.title}"
  button-primary-hover:
    backgroundColor: "{colors.cobalt-deep}"
  button-ghost:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "13px 22px"
  button-white:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "13px 22px"
  nav-link:
    textColor: "{colors.ink-secondary}"
    rounded: "{rounded.sm}"
    padding: "8px 12px"
  nav-link-active:
    backgroundColor: "{colors.cobalt-tint}"
    textColor: "{colors.cobalt}"
  section-alt:
    backgroundColor: "{colors.paper-alt}"
    padding: "70px 0"
---

# Design System: Vawe

## 1. Overview

**Creative North Star: "The Contact Sheet"**

A contact sheet is a photographer's proof sheet: every frame the shoot produced, printed small, in a grid, unretouched. No captions arguing for the work. No art direction between you and the negative. You look, and you decide. That is exactly the transaction this site is built for. Its visitors, whether they arrive as developers, agent-authors, or marketers, are all asking one question: is this real? A contact sheet answers that question the only way it can be honestly answered, by showing every frame and getting out of the way.

So the system is built from two materials with a strict division of labour. The **sheet** is white paper, hairline rules, tight Space Grotesk, and exactly one accent. It is deliberately uneventful. The **frames** are real rendered video at full expressive range, and they carry one hundred percent of the voltage. Vawe's personality is bold, playful, and expressive, and that personality lives in the output, not in the mat board around it. Restraint in the chrome is not timidity here; it is what makes the motion legible. Invert this relationship, let the page start performing, and the work stops reading as proof and starts reading as decoration.

This system explicitly rejects three things. It is not a **generic AI-SaaS landing**: no gradient hero, no three equal feature cards, no tracked uppercase eyebrow stamped above every section, no big-number hero metric. It is not a **dark creative-tool cliché**: no black canvas, no neon, no glass. White-first, always. And it is not a **README with a stylesheet**: a taste engine whose own site has no craft refutes its central claim. The failure mode to fear most is not ugliness. It is a page that talks about motion instead of containing it.

**Key Characteristics:**
- White-first, always. The surface is paper, never a canvas.
- One accent. Cobalt, and nothing else, on every page.
- Hairlines over boxes. Structure by rule and by space before reaching for a card.
- Real output over description. Every claim on the sheet is a frame you can watch.
- Contrast is a build constraint, not a review note. Every token ships pre-checked.

## 2. Colors

A near-monochrome paper system with a single saturated cobalt that appears only where something is live, actionable, or true.

### Primary
- **Cobalt** (`#2563eb`): The one voice. Primary buttons, active nav, links, the eyebrow dot, `::selection`, and the accent inside rendered scenes. 5.17:1 on white, so it is legal for body-size text, though it should rarely need to be. This exact value is shared with `themes/vawe.json`, which means the site and the engine's own brand films are literally the same blue. That is not a coincidence to preserve casually; it is the identity.
- **Cobalt Deep** (`#1d4ed8`): Hover and active states for primary actions only. Never a second accent, never a gradient partner.
- **Cobalt Tint** (`#eef3ff`) and **Cobalt Line** (`#cfe0ff`): The accent diluted into a fill and a border for quiet selected states, chiefly active nav. Carries cobalt's presence without spending its attention.

### Neutral
- **Paper** (`#ffffff`): True white. The body, and the default card surface. Not off-white, not warm, not tinted. The warm-neutral cream band is the saturated AI default and is banned here by name.
- **Paper Alt** (`#f6f8fb`): The alternating section field, fenced top and bottom by a hairline. The only permitted way to distinguish a band of the page from its neighbours.
- **Hairline** (`#e7eaf0`) and **Hairline Firm** (`#d7dce4`): 1px rules. The primary structural tool of the entire system.
- **Ink** (`#0f1620`): Headings and body. ~17:1 on paper. A near-black carrying a trace of blue rather than a trace of warmth, so it agrees with cobalt instead of fighting it.
- **Ink Secondary** (`#454f5e`): Lead paragraphs and secondary prose. ~8:1.
- **Ink Muted** (`#697182`): Meta, captions, labels. ~5:1. **This is the floor.** Nothing lighter than this is ever permitted to carry text.

### Named Rules

**The One Voice Rule.** Cobalt is the only accent on this site. There is no secondary accent, no supporting hue, no semantic palette waiting to be introduced. A teal status chip, a green success state, an amber warning: each is a defection. If a state needs distinguishing, use ink weight, a hairline, a fill, or a mono label. The accent's authority is a direct function of its scarcity.

**The Affordance Rule.** *Cobalt and a verb means you can act on it.* Chrome does not signal interactivity here, colour does. Anything you can click is cobalt and says what it will do; anything inert is muted, carries no box, and names no action. This is the job that earns cobalt its scarcity: it is not decoration, it is the map of what responds to a click.

It exists because the site had the collision twice, in mirror image. `.tag` (inert spec strings) and `.srctoggle` (the control directly beneath it) were drawn with the same `1px solid var(--line-2)` on the same `--bg-2` at the same `border-radius: 8px`, on the same card, so nothing on screen distinguished the label from the button. Meanwhile `.ghsoon` ("Source soon", a state) wore the full chrome of `.ghbtn` (a link), which is the same failure inverted: a pill that looks pressable and does nothing. A disabled-looking button also just reads as a broken one.

The rule resolves both directions at once, and it settles new cases without a judgement call: **a new chip picks a side.** If it does something, cobalt plus a verb. If it is data, muted with no box. Never chrome alone, because chrome is exactly what both sides had.

**The Paper Rule.** Content sits on white. Not cream, not sand, not bone, not paper-tinted-warm. Every AI-designed site in this category drifts warm-neutral to feel considered, which is precisely why warm-neutral now reads as machine-made. Vawe's warmth, if it needs any, comes from the motion.

**The Bookend Rule.** The Paper Rule governs *content bands*, not the whole page. The page opens and closes on a **cobalt bookend**: a full-bleed band carrying a real vawe render, with the hero editor floating over the V it cuts. This is a Committed colour strategy (one saturated colour across 30-60% of a surface), which the brand register explicitly permits and which a product this loud has earned. The white bands in between are still paper and still governed above. Two constraints are non-negotiable:

- **The film is `assets/backdrop.mp4` and nothing else.** It comes from `films/scene/site-backdrop.json`, the one contentless scene in the repo: a single ambient shader field, no text, no blocks, no cuts, no stings, `enterDur: 0` so the loop never pulses dark at its seam. Read the rest of this twice, because it has already been got wrong twice: *every other clip in `assets/` demonstrates a capability, and demonstrations contain words.* `linear-launch` carries Linear's headline. `stings.mp4` is not shader texture at all despite its name, it is the word "proof." animating. The label describes the capability being demonstrated, not what is on screen. Blurred and multiplied, either reads as drifting black smudges behind the headline. **Never pick a bookend film from its filename or its label. Open it.**
- **The film composites with `mix-blend-mode: multiply`, never a translucent scrim.** Text over video is a moving contrast target: a cobalt scrim over a bright frame composites to ~4:1 and silently fails AA on whichever frames happen to be light. multiply can only darken, so the band is mathematically guaranteed never to exceed cobalt's luminance, and white on it never drops below 5.17:1. Verified at 5.17 worst-case across 7,616 backdrop pixels over 8 frames. **Never swap it for soft-light / overlay / screen**. Those can lighten, and the guarantee dies silently.

**The Shell Rule.** Every page is a rounded card (26px) floating on `--field`, not a document bleeding to the window edge. It frames the site the way a contact sheet frames its frames, which is the North Star made literal.

**The Muted Floor Rule.** `#697182` is the lightest colour that may hold text, anywhere, at any size. Light gray "for elegance" is the single most common reason interfaces become unreadable, and it is not available here. If text feels loud, resize it or reweight it. Never fade it.

*Corollary: the floor is a floor **on white**.* `#697182` earns the name at 4.9:1 against `#fff`, and that is the only surface it was measured on. On `--accent-soft`, the cobalt-tinted fill used by every soft chip, the identical token measures **4.41:1** and is under AA. Nothing changed but the paper. So "muted is the floor" is not a fact about the colour, it is a fact about a *pair*, and moving muted text onto any tint re-opens the question. On a tinted fill, use `--ink-2`.

*Corollary: `opacity` is not a loophole.* The rule names a colour, and opacity is not a colour, which is exactly how it gets violated. Fading text composites it toward the background and lands somewhere no token would ever have permitted. The scrollytelling claims were built de-emphasising the inactive rows at `opacity: .42` and measured **2.06:1**, less than half the required 4.5. The fix is not a gentler fade, because the arithmetic forecloses it: `--ink-2` needs **opacity ≥ .74** to clear 4.5:1, and .74 against 1.0 is not a perceptible difference. **Every opacity that communicates is illegible; every opacity that is legible communicates nothing.** So de-emphasis by fading text is not a tool this site has. Mark the active thing instead: cobalt at 5.17:1 says "this one" while every word stays readable, which is also why the emphasis and the rail are the same blue. De-emphasised text is still text; WCAG does not exempt it for being the part you are not reading yet.

**The Shared Blue Rule.** `#2563eb` is one value with two homes: `site/app/globals.css` and `themes/vawe.json`. Change one without the other and the site stops matching the films it displays. They move together or not at all.

## 3. Typography

**Display Font:** Anybody (Velvetyne) (with system-ui, sans-serif)
**Body Font:** Anybody (with system-ui, sans-serif)
**Label/Mono Font:** JetBrains Mono (with monospace)

**Character:** One family across both axes it owns, plus a mono for anything machine-authored. Anybody is a libre variable grotesk carrying a real **width axis (50-150)** alongside weight (100-900): squarish, slightly strange, and unmistakably not a default. It replaced Space Grotesk deliberately. Space Grotesk sits on the reflex-reject list, and a site arguing that generic output is the enemy could not credibly set its own headline in the single most-reached-for AI face. Anybody is the opposite bet: a face nobody arrives at by reflex.

JetBrains Mono is not decorative here: it marks text a machine wrote or will read. Since Vawe's entire pitch is that the JSON is the interface, mono is a semantic role, not a texture. The pairing works on a genuine contrast axis (grotesk against a coding mono) rather than the amateur move of pairing two similar-but-not-identical sans faces.

Anybody sets wider and squarer than a normal grotesk, so it needs **less** negative tracking than Space Grotesk did. -0.038em closed its counters; display sits at -0.022em.

### Hierarchy
- **Display** (700, `clamp(2.9rem, 7.2vw, 6rem)`, lh 0.99, ls -0.038em): Hero H1 only. Once per page, maximum. The 6rem ceiling and the -0.04em tracking floor are both hard limits and the current values sit deliberately just inside them: this is as loud as the sheet is ever allowed to be.
- **Headline** (700, `clamp(1.7rem, 3.4vw, 2.5rem)`, lh 1.05, ls -0.03em): Section H2. Always `text-wrap: balance`.
- **Title** (500, 1.08rem, lh 1.55): Lead paragraphs under a headline. Capped at `56ch`.
- **Body** (400, 1rem, lh 1.5, ls -0.011em): Prose. Never exceeds 65-75ch.
- **Label** (JetBrains Mono, 500, 12.5px): Eyebrows, code, filenames, JSON keys, technical metadata.

### Named Rules

**The Mono Means Machine Rule.** JetBrains Mono is reserved for text a machine authored or consumes: code, JSON, filenames, counts, technical labels. It is never used for atmosphere. A mono label on human marketing copy is a costume, and on this site specifically it dilutes the one signal that carries the product's argument.

**The One Display Per Page Rule.** Display size appears once, on the hero. A second element at display scale means the page has two heroes, which means it has none.

**The Eyebrow Is Not Scaffolding Rule.** `.eyebrow` exists and is legitimate as a *deliberate, occasional* device. It becomes the banned AI tell the moment it appears above every section by reflex. If a page has an eyebrow on each of its sections, that is the trope, regardless of what the font is. Fix the cadence, don't restyle the eyebrow.

**The Width Is A Role Rule.** Anybody's `wdth` axis is **static contrast, not an effect**: display stands wide and planted (`--wd-display: 105`), body sits neutral (100), technical labels may compress (88). It is deliberately never animated. The hero already contains a live engine; type that reflows every frame would compete with the render it frames and thrash layout doing it. The face is expressive enough standing still. Animating it is the affectation this pick risks, and the reason to resist it is principle #1.

## 4. Elevation

**Layered and ambient.** Three tinted steps, each tinted to the ink hue (`rgba(16,22,32,…)`), never pure black. Pure-black shadow on white paper reads as dirt; ink-tinted shadow reads as air.

- **`--shadow-1`** (`0 1px 2px /.04`, `0 2px 8px /.05`): Resting. Nav buttons, small surfaces sitting barely off the sheet.
- **`--shadow-2`** (`0 8px 24px -8px /.14`, `0 2px 8px /.06`): Engaged. Hover lift on white buttons and cards.
- **`--shadow-3`** (`0 40px 80px -24px /.28`, `0 12px 32px -12px /.16`): The artifact. Reserved for the things that ARE the product: the hero editor window and video surfaces. This is the deepest the system goes and it is spent deliberately.

Elevation and hairlines are complements, not alternatives. Hairlines do the everyday structural work of separating a section from its neighbour; shadow says a surface is a *thing* sitting on the sheet, most of all the hero editor, which must read as a real window onto a real running engine. The gradient of intent runs shadow-1 to shadow-3 as resting to engaged to real.

**The Tinted Shadow Rule.** Every shadow is tinted to `rgba(16,22,32,…)`. A pure-black shadow anywhere in this system is a bug.

## 5. Components

**Philosophy: precise and tactile.** Tight radii, hairline borders, real press feedback, expo easing. Everything responds exactly as much as you would expect and no more. The motion vocabulary is `--ease: cubic-bezier(.16,1,.3,1)`, an ease-out-expo: fast departure, long settle, no bounce and no elastic anywhere. A site about a motion engine cannot afford motion that feels careless, but it equally cannot afford motion that shows off. Overshoot would undercut the word "deterministic" on the very page that claims it.

- **Radius scale**: `9px` (nav links) · `12px` (buttons) · `14px` (`--r`, cards and panels). One coherent soft scale. There is no pill, and there is no sharp. Mixing in either without a documented rule is broken.
- **Buttons**: 13px/22px padding, 15.5px/600 label, 12px radius. `:hover` lifts `-1px` to `-2px` and deepens the shadow one step; `:active` returns `translateY(1px) scale(.99)`, a real physical push. `.btn-primary` is cobalt on white with a cobalt-tinted glow (the one place a coloured shadow is sanctioned, because it is the accent's own hue). `.btn-white` and `.btn-ghost` are for secondary actions. Every button must pass contrast against its own background; a white-on-white ghost is banned.
- **Nav**: `.bar.over` (transparent, over the hero) and `.bar.solid` (hairline-bottomed, interior pages) are the only two variants. Active is cobalt on cobalt-tint. **The nav must wrap below 700px**, not overflow: it has broken this way before.
- **Cards**: white on paper, `14px` radius, hairline border, `--shadow-1` at rest. **Cards are the lazy answer.** Reach for a hairline rule, a `divide-y`, or plain negative space first. Nested cards are always wrong, and identical repeating card grids of icon-heading-text are the AI-SaaS tell this system exists to refuse.
- **Sections**: `70px 0`. `.section.alt` fills `--bg-2` and fences itself with hairlines top and bottom. This alternation is the only sanctioned way to band the page.
- **Hero editor**: a white browser-chrome window running the real engine, at `--shadow-3`. It is the most elevated object on the site because it is the only one that is literally the product. It is editable on purpose: a read-only demo would be a description of the engine, and descriptions are what this site refuses. It overlaps **up** into the bookend's V, so the band reads as pouring into it.
- **Shell**: `.shell`, 26px radius, `margin:10px` on `--field`, `position:relative` (the pill nav anchors to it). Every page wears one.
- **Bookend**: `.bookend`, cobalt, with an abstract render at `mix-blend-mode:multiply`. `.tap` adds the V via `clip-path`. Governed by The Bookend Rule above; read it before touching either.
- **Pill nav** (`.bar.pill`): floats absolutely over the bookend, translucent white on cobalt, active state inverts to solid white. Absolute *by design*. It leaves the flow so `<main>` can wrap the hero headline instead of starting below it. Interior pages use `.bar.solid` on paper.
- **Claims** (`.claims` / `.claim`): hairline-ruled rows, each pairing a claim with a proof artifact unique to it. This replaced three identical icon+heading+text cards. Do not let it regress into a grid: **the variation between rows is the design**, because the claims are not interchangeable.

## 6. Do's and Don'ts

**Do** show the running engine. `/editor` executes the real `renderFrame(n)`; the showcase is real encodes from real scene JSON. If a claim can be demonstrated and is instead described, that is a failure, not a shortcut.

**Do** spend the accent narrowly. Cobalt marks live, actionable, or true. Everything else is ink and paper.

**Do** structure with hairlines and space. Reach for `border-top` and `divide-y` before a card.

**Do** check contrast before a colour lands. The shipped tokens all pass; anything new must clear 4.5:1 for body and 3:1 for large text as a build constraint, not a review note.

**Do** give every animation a `prefers-reduced-motion: reduce` alternative, autoplaying showcase video included. A motion engine that overrides a user's stated motion preference is arguing against itself.

**Do** keep `#2563eb` synchronised between `globals.css` and `themes/vawe.json`.

**Don't** tint the content bands warm. No cream, no sand, no bone. White. (The cobalt bookends are the one sanctioned departure; see The Bookend Rule.)

**Don't** introduce a second accent. The only exception is `--ok` / `--bad` on the editor's status line, because "the render failed" and "this is a link" cannot be the same colour. Nothing else earns it.

**Don't** put a narrative film in a bookend, or composite one with anything but `multiply`. Both are silent failure modes: the first puts a competitor's headline behind ours, the second breaks AA on frames nobody screenshotted.

**Don't** put an eyebrow above every section, or number sections `01 / 02 / 03` as scaffolding. Numbers earn their place only when the content genuinely is an ordered sequence.

**Don't** use gradient text (`background-clip: text`), decorative glassmorphism, side-stripe accent borders, or a hero-metric block. Each is banned outright and no brief overrides them.

**Don't** let display type exceed 6rem or track tighter than -0.04em.

**Don't** fade text below `#697182` to make a page feel calm. Resize or reweight instead.

**Don't** let the chrome start performing. If the page is more interesting than the video playing inside it, the design has inverted its own thesis.

## ui-skills: what was used on this repo's frames, and what was refused

Consulted 2026-09-09 while building `films/scene/_vawe-oblique.*.html`.

**Used, both refiners rather than builders, so neither competes with the vendored `impeccable`:**

- **`pbakaus/typeset`** (typography). Took: state the roles and their intended contrast BEFORE editing;
  the fewest roles that make hierarchy unmistakable; combine size, weight, space and tone rather than
  asking size to do all the work; keep repeated roles identical across screens; tabular numerals where
  digits line up; tune leading to the face and the measure, not a universal ratio. Refused: its web
  reading floors (16px body, a 45-75ch measure). A 1920x1080 frame read from across a room is not a
  reading surface, and its body role is 38px.
- **`mengto/beautiful-shadows`** (elevation). Took: the layered ramp shape, three named levels, one
  level per element, and neutral black only, never a tinted shadow. Refused: its Tailwind class syntax
  (this repo writes CSS), and its `0 0 0 1px` contact ring, which is a border wearing a shadow's
  clothes. A frame that wants an edge asks for `.kit-card`, which has one.

**Refused outright:** `zeke/swiss-design`, `ericzakariasson/scandinavian-design`, `leonxlnx/soft-skill`
and every other whole-look skill. A film already has an art direction, from its theme and from its
reference, and importing a second one is how a brand's video stops looking like the brand.

**Already vendored, so never fetched:** `pbakaus/impeccable`. It runs inside `make preview` as the
detector. Do not fetch the skill version alongside it.

**Consulted 2026-09-09 for the studio "every beat shows a picture" fix** (`studio/server.mjs`,
`studio/page.mjs`). Read `ui-skills categories`, then `color` and `visual`.

**Rejected, both:**
- **`accesslint/contrast-checker`** (color, accessibility). Read the whole skill: it drives a live
  browser through a full WCAG audit protocol, built for auditing a shipped product surface. This task
  was one token pair (`--bg`, `--line`) in a dev tool nobody but an author ever opens. The repo's own
  convention already measures contrast inline as a comment next to the token (e.g. `--muted:#6E6E6E`,
  "5.1:1 on the panel. Measured, not guessed"), so the fix computed WCAG relative-luminance ratios by
  hand and kept the same comment style, rather than importing a heavier audit workflow for one number.
- Every whole-look/color-system skill in `visual` and `color` (`ericzakariasson/scandinavian-design`,
  `pbakaus/colorize`, the OKLCH palette generators). This room is deliberately achromatic (studio-page.mjs's
  own header: "any hue in the surround skews the judgement of the picture"), so a fetched palette
  system would import hue or a different elevation model into a surface that has to stay grey-scale by
  design. The local system, not the default, wins here.

**What the fix actually is:** a fragment-less beat now draws an inline SVG sketch from its own
storyboard fields (`archetype:`, `picture:`/`object:`, `onscreen:`) instead of a grey box, and the dark
theme's ground moved from `#161616` to true `#000000`, with `--line`/`--line-2` alpha raised (0.09→0.16,
0.18→0.35) so a panel boundary still reads a non-text contrast ratio against pure black (measured:
0.16 alpha is 1.44:1, 0.35 alpha is 3.00:1, WCAG 1.4.11's floor for a UI boundary).
