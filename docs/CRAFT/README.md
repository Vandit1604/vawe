# CRAFT — decision guides for authoring a video

> **New here? Start at [`../TASTE.md`](../TASTE.md)** — the front door that ties the spines together.
> CRAFT is where each decision actually gets made.
>
> **Never authored from scratch? Read [`AUTHORING-WALKTHROUGH.md`](AUTHORING-WALKTHROUGH.md) first** —
> the one narrative that carries a single video from a blank page to shipped, chaining every guide below
> in order. And [`DIRECTION.md`](DIRECTION.md) is the cross-cutting spine (pacing · restraint · story
> placement) these decisions all serve.

These guides answer *how to choose* — a beat order, a transition, a face, a palette, a layout, an
image, a sound. They are opinionated checklists, not textbooks: if a rule wouldn't change what you
build, it's cut. **Load the relevant guide before you author.**

---

## The layering order — decide in this sequence, hand off down the chain

The single biggest reason a from-scratch video comes out as effect-soup is deciding effects *first*.
Decide in this order instead. Each layer sets constraints the next one fills; a choice upstream makes
the downstream choices for you.

| # | Decide | Load | It hands the next layer… |
|---|---|---|---|
| 1 | **The beats** — why these, in what order, doing what | [STORY.md](STORY.md) | each beat's role + its persuasion + its feeling |
| 2 | **The anchor** — one reference profile for the whole film | [SELECTION.md](SELECTION.md) Part 2 | the coordinated face/pace/cut-family/accent policy |
| 3 | **Per beat, the effect** — the transition/look/sting for THIS beat's feeling | [SELECTION.md](SELECTION.md) Part 1 | which cut, which of the 31 looks / 35 stings, which face role |
| 4 | **How each frame looks** — type · colour · layout · imagery | [TYPOGRAPHY](TYPOGRAPHY.md) · [COLOR](COLOR.md) · [LAYOUT](LAYOUT.md) · [IMAGERY](IMAGERY.md) | the composed frame, on the brand's palette + face |
| 5 | **How full each frame is** — produced, not a slide | [DENSITY.md](DENSITY.md) | hero + support + metadata on the content beats |
| 6 | **The restraint pass** — cut what doesn't earn its place | [TASTE-RULES.md](TASTE-RULES.md) | a film with 2–3 earned effects, not fifteen |
| 7 | **The sound** — silent by default, a bed/cue only if earned | [SOUND.md](SOUND.md) | the audio layer matched to the profile |

**Why the order matters:** STORY (1) decides a beat is a *proof* beat → its role tells SELECTION (2–3)
to reach for a demonstration, a hard cut, `weightShift` emphasis → COLOR/LAYOUT (4) go flat and
full-bleed so the number lands → DENSITY (5) adds the supporting stat + a mono readout → TASTE-RULES
(6) confirms no effect competes → SOUND (7) puts one `chime` on the number. One coherent beat, not
seven independent guesses. (Motion physics runs alongside 3–4: see [../MOTION-CRAFT.md](../MOTION-CRAFT.md).)

---

## The full index

**Front-to-back & cross-cutting:**

| Guide | Load it when you are… | Answers |
|---|---|---|
| [AUTHORING-WALKTHROUGH.md](AUTHORING-WALKTHROUGH.md) | authoring a whole video, especially with no brand site | the single narrative: spine → manufacture the four things → lock sheet → JSON → the mandatory ladder → judge → ship |
| [DIRECTION.md](DIRECTION.md) | it "reads amateur" though every layer renders fine | the direction spine — Disney's 12 · Murch's Rule of Six · restraint · story placement, each sourced + tagged by which gate enforces it |
| [BLUEPRINTS.md](BLUEPRINTS.md) | authoring any beat (don't re-derive motion) | compose from directed-motion beats ({type:"beat"}) so good motion is the default; the ambition floor that fails a plain slideshow |
| [`vawe-continuous-action`](../../.claude/skills/vawe-continuous-action/SKILL.md) (skill) | planning a short product film (≤ ~15s) from a one-line brief, or your plan is coming out hook-then-feature-then-logo | the continuous-object spine (one object transforms across every cut) · diegetic vs decorative motion · the measured 5-second budget · the storyboard shape `storyboard-check` + `make intent` already eat. Worked from `higgsfield.mp4` + `formats/scene/higgsfield-recreation.json`. |
| [SUBAGENTS.md](SUBAGENTS.md) | judging your own render (a full pass, a recreation, anything you'll ship) | why a self-grading agent grades kindly · the six standing critics (beat · bg-motion · reveal · fidelity · copy · seam) with the exact input and verdict shape for each · run them in parallel, in one message |

**What & why (the story layer):**

| Guide | Load it when you are… | Answers |
|---|---|---|
| [STORY.md](STORY.md) | deciding the beats and their order | the spine · beat-role→persuasion→feeling · named spines + timing · scene budget · product→beats |
| [SELECTION.md](SELECTION.md) | picking the transition/font/look/sting for a feeling | intent→effect (cited) · complete look/sting coverage · 8 named reference profiles |
| [TRANSITIONS.md](TRANSITIONS.md) | choosing the CUT between two beats (you can't say why a transition is there) | the transition taxonomy (type→meaning) · Murch's Rule of Six · continuity vs montage · the per-seam decision procedure |
| [MEASURE.md](MEASURE.md) | you need a transition's REAL numbers (a reference to reproduce, or to verify our own render) | `make measure` · per-frame tracking → nearest engine preset + residual · what frames can't reveal · self-verification loop |
| [REFERENCE-STUDY.md](REFERENCE-STUDY.md) | a real video looks better than ours and you want to learn/copy why | the study pipeline (measure → catalog → map) · the 12 premium-feel habits · reference-feel→primitive map |
| [RECREATION.md](RECREATION.md) | recreating a specific reference video end to end ("make ours look like this") | the ordered loop: measure → capture → build (cinematic) → score → beat-sync → verify · the honest 1:1 ceiling |
| [TASTE-RULES.md](TASTE-RULES.md) | it "renders fine but feels cheap" | cause→feeling ease table · the failure-modes catalog · restraint · continuity |

**How it looks (the house-style layer):**

| Guide | Load it when you are… | Answers |
|---|---|---|
| [TYPOGRAPHY.md](TYPOGRAPHY.md) | picking `type.sans/serif/mono`, sizing headlines | which face signals which personality · pairing · the size scale · weight/tracking/leading |
| [COLOR.md](COLOR.md) | authoring a `theme` palette, choosing bg/accent | build from one dominant · 60-30-10 · dominance · deploy-for-mood · gradient-vs-flat · WCAG |
| [LAYOUT.md](LAYOUT.md) | placing layers, composing a beat | grid · one hero · asymmetry vs centered · archetype→intent · safe zones |
| [IMAGERY.md](IMAGERY.md) | choosing image vs gradient, treating a photo, icons | the visual ladder · treatment→intent · licensing · icon choice |
| [SURFACES.md](SURFACES.md) | choosing the SURFACE copy sits on (glass/mesh/spotlight/bento) | the sleek block library · the build-HTML-first loop · the design spec + 8 visual styles picker |
| [FRAME-SPEC.md](FRAME-SPEC.md) | starting a video — lock the contract BEFORE the JSON | the per-video design-system spec + scene-by-scene storyboard (Reproduce/Adapt · persuasion · emotion) · the anti-front-load reveal model · seam QA. Fill-in template: [STORYBOARD-TEMPLATE.md](STORYBOARD-TEMPLATE.md) (gate: `make storyboard-check`). |
| [AUTHOR-THE-FRAME.md](AUTHOR-THE-FRAME.md) | a beat needs a bespoke SVG/HTML dataviz or diagram | authoring a bespoke inline-SVG beat · the `window.__timelines` seek bridge · the per-child-choreography gap |

**How full · how it sounds:**

| Guide | Load it when you are… | Answers |
|---|---|---|
| [DENSITY.md](DENSITY.md) | a beat looks flat / slide-like | hero + support + metadata triad · the "produced" tell · thin-beat rule |
| [SOUND.md](SOUND.md) | deciding audio | music-vs-silence · bed mood→feeling · sfx restraint · caption style→intent · per-profile policy |

## How these relate to the rest of the docs (no overlap)
- **CRAFT/** = *how to choose/build* (decisions). ← you are here
- [`../DESIGN-DATABASE.md`](../DESIGN-DATABASE.md) = *what techniques exist* (the catalog).
- [`../MOTION-CRAFT.md`](../MOTION-CRAFT.md) = *how it moves* (motion rules + gates).
- [`../MISTAKES.md`](../MISTAKES.md) = *what went wrong before* (mistake → fix log).
- `.claude/skills/{taste-skill,impeccable}` = *enforcement* (the anti-slop detector + dials). CRAFT tells
  you what to do; impeccable checks you did it. Reach past what impeccable flags using these guides.
- `make craft-coverage` = *doc integrity* — fails if a look/sting in the engine isn't classified in
  SELECTION, a doc names a removed effect, a CRAFT cross-link breaks, or a guide is orphaned from this index.

## The engine facts these guides are grounded in (not generic advice)
- **Theme contract** (`core/theme-contract.js`): a theme MUST define `palette.{bg,bg2,surface,surface2,
  line,lineStrong,text,text2,dim,ink,accent,accentDim,accentGlow,up,down}`, `type.{sans,serif,mono,num}`,
  and 3 `gradient` stops. No fallback look — COLOR/TYPOGRAPHY map to exactly these keys.
- **Bundled faces** (`core/tokens.css`): Inter, Inter Display, Space Grotesk, Instrument Serif, Geist,
  Geist Mono, Plus Jakarta Sans, JetBrains Mono, Hanken Grotesk, Caveat (Söhne is local/licensed).
- **Real registries** the guides cover in full: 31 composite looks (`core/looks.js`), 35 shader stings
  (`SHADER_FX` in `core/stings.js`), the palette-driven bg presets (`core/backgrounds.js`).
- **Doctrine**: colours ONLY from the brand (eyedrop, `make palette`); dominance decided by LOOKING;
  no em-dashes on screen; patterns are seasoning not wallpaper. See [`../MISTAKES.md`](../MISTAKES.md).
