# CRAFT: decision guides for authoring a video

> **New here? Start at [`../TASTE.md`](../TASTE.md)**. The front door that ties the spines together.
> CRAFT is where each decision actually gets made.
>
> **Never authored from scratch? Read [`AUTHORING-WALKTHROUGH.md`](AUTHORING-WALKTHROUGH.md) first**,
> the one narrative that carries a single video from a blank page to shipped, chaining every guide below
> in order. And [`DIRECTION.md`](DIRECTION.md) is the cross-cutting spine (pacing · restraint · story
> placement) these decisions all serve.
>
> **Writing the storyboard itself?** [`STORYBOARD-TEMPLATE.md`](STORYBOARD-TEMPLATE.md) is the fill-in
> block `make storyboard-check` and `make intent` both read. It is linked here in prose rather than in
> the generated table below, because its own frontmatter is the example an author copies and cannot
> also carry index metadata.

These guides answer *how to choose*: a beat order, a transition, a face, a palette, a layout, an
image, a sound. They are opinionated checklists, not textbooks: if a rule wouldn't change what you
build, it's cut. **Load the relevant guide before you author.**

---

## The layering order: decide in this sequence, hand off down the chain

**You will decide the effects first, because effects are the fun part and the table below is admin.
Don't.** That is the single biggest reason a from-scratch video comes out as effect-soup. Decide in this
order instead. Each layer sets constraints the next one fills; a choice upstream makes
the downstream choices for you.

| # | Decide | Load | It hands the next layer… |
|---|---|---|---|
| 1 | **The beats**: why these, in what order, doing what | [STORY.md](STORY.md) | each beat's role + its persuasion + its feeling |
| 2 | **The anchor**: one reference profile for the whole film | [SELECTION.md](SELECTION.md) Part 2 | the coordinated face/pace/cut-family/accent policy |
| 3 | **Per beat, the effect**: the transition/look/sting for THIS beat's feeling | [SELECTION.md](SELECTION.md) Part 1 | which cut, which of the 31 looks / 35 stings, which face role |
| 4 | **How each frame looks**: type · colour · layout · imagery | [TYPOGRAPHY](TYPOGRAPHY.md) · [COLOR](COLOR.md) · [LAYOUT](LAYOUT.md) · [IMAGERY](IMAGERY.md) | the composed frame, on the brand's palette + face |
| 5 | **How full each frame is**: produced, not a slide | [DENSITY.md](DENSITY.md) | hero + support + metadata on the content beats |
| 5b | **Whether the frame SHOWS or only tells** | [SHOW-DONT-TELL.md](SHOW-DONT-TELL.md) | a quantity, proportion or real surface drawn as a graphic, not set in type |
| 5c | **What holds the film together across its cuts** | [CONTINUITY-WITHOUT-AN-OBJECT.md](CONTINUITY-WITHOUT-AN-OBJECT.md) | a thread that is a sentence, a match cut or a rhythm, not only a resizing prop |
| 6 | **The restraint pass**: cut what doesn't earn its place | [TASTE-RULES.md](TASTE-RULES.md) | a film with 2–3 earned effects, not fifteen |
| 7 | **The sound**: sound by default, silence only with a stated reason | [SOUND.md](SOUND.md) | a film held together aurally, and a licence we can produce |

**Why the order matters:** STORY (1) decides a beat is a *proof* beat → its role tells SELECTION (2–3)
to reach for a demonstration, a hard cut, `weightShift` emphasis → COLOR/LAYOUT (4) go flat and
full-bleed so the number lands → DENSITY (5) adds the supporting stat + a mono readout → TASTE-RULES
(6) confirms no effect competes → SOUND (7) puts one `chime` on the number. One coherent beat, not
seven independent guesses. (Motion physics runs alongside 3–4: see [../MOTION-CRAFT.md](../MOTION-CRAFT.md).)

---

<!-- docmap:start -->
## The full index

**Front-to-back & cross-cutting:**

| Guide | Load it when you are… | Answers |
|---|---|---|
| [APPROVAL-STOPS.md](APPROVAL-STOPS.md) | "we built the whole thing and then it was rejected" | the points where the work gets shown before it is finished: concept · storyboard panels · a hand-written fragment · style frames · the 85% draft |
| [AUTHORING-WALKTHROUGH.md](AUTHORING-WALKTHROUGH.md) | authoring a whole video, especially with no brand site | the single narrative: spine → manufacture the four things → lock sheet → JSON → the mandatory ladder → judge → ship |
| [BLUEPRINTS.md](BLUEPRINTS.md) | authoring any beat (don't re-derive motion) | compose from directed-motion beats ({type:"beat"}) so good motion is the default; the ambition floor that fails a plain slideshow |
| [CONTINUITY-WITHOUT-AN-OBJECT.md](CONTINUITY-WITHOUT-AN-OBJECT.md) | the film must hold together and its subject is NOT one object that transforms | the threads that are not a travelling prop: a sentence completed across cuts, a match cut on shape or motion, a rhythm, a camera that keeps travelling · how each satisfies the continuity floor |
| [DIRECTION.md](DIRECTION.md) | it "reads amateur" though every layer renders fine | the direction spine, Disney's 12 · Murch's Rule of Six · restraint · story placement, each sourced + tagged by which gate enforces it |
| [FILM-STRUCTURE.md](FILM-STRUCTURE.md) | "what holds this film together across its cuts" | the devices a short film can be held by (spatial · verbal · temporal · conceptual), what practitioners actually say about choosing between them, and why our one blocking structural rule enforced the item Murch ranks last |
| [GRAMMAR.md](GRAMMAR.md) | before authoring, or when a film reads flat and you cannot say why | what films that read well actually MEASURE: shot length, motion, whether the ground turns, and what carries across a cut |
| [KEYED-MOTION.md](KEYED-MOTION.md) | a film has the right structure and still feels amateur, or a recreation drifts where the original snaps | how the exemplar actually MOVES, as numbers from its JSON: dense keys with linear between them · layers sharing one pan · `--p` carrying what position cannot · traced timings · diegetic exits. A register you choose, not a floor, and deliberately ungated |
| [REF-together-chat.md](REF-together-chat.md) | "what does a film we admire actually measure" | a frame-by-frame study of one product film: shot timings, palette dominance by pixel count, what holds it together |
| [SOUND.md](SOUND.md) | the film has no sound, or you are about to ship it mute | sound as STRUCTURE (J-cut · L-cut · sync points · the pre-impact drop) · how to write a sound bridge (audio.bridges) · sound design vs music · how well any of it is evidenced · what we may legally put under a commercial film · the engine's audio block and commands |
| [SUBAGENT-BUDGET.md](SUBAGENT-BUDGET.md) | "why did that fan-out cost so much" | the measured cost of a real run here, and the rules that follow: fewer and larger agents, file contents in the prompt, never two agents on one file |
| [SUBAGENTS.md](SUBAGENTS.md) | judging your own render (a full pass, a recreation, anything you'll ship) | why a self-grading agent grades kindly · the six standing critics (beat · bg-motion · reveal · fidelity · copy · seam) with the exact input and verdict shape for each · run them in parallel, in one message |
| [VOCABULARY.md](VOCABULARY.md) | you know the FEELING you want and not the engine name for it | the plain words the engine resolves in a real slot: feel to an easing, duration to seconds, a shot description to a camera move |
| [`vawe-continuous-action`](../../.claude/skills/vawe-continuous-action/SKILL.md) (skill) | planning a short product film (≤ ~15s) whose subject really is one thing changing, pick it from FILM-STRUCTURE.md first, it is one device of about eighteen | the continuous-object spine (one object transforms across every cut) · diegetic vs decorative motion · the measured 5-second budget · the storyboard shape `storyboard-check` + `make intent` already eat. Worked from `higgsfield.mp4` + `formats/scene/higgsfield-recreation.json`. |

**What & why (the story layer):**

| Guide | Load it when you are… | Answers |
|---|---|---|
| [MEASURE.md](MEASURE.md) | you need a transition's REAL numbers (a reference to reproduce, or to verify our own render) | `make measure` · per-frame tracking → nearest engine preset + residual · what frames can't reveal · self-verification loop |
| [RECREATION.md](RECREATION.md) | recreating a specific reference video end to end ("make ours look like this") | the ordered loop: measure → capture → build (cinematic) → score → beat-sync → verify · the honest 1:1 ceiling |
| [REFERENCE-STUDY.md](REFERENCE-STUDY.md) | a real video looks better than ours and you want to learn/copy why | the study pipeline (measure → catalog → map) · the 12 premium-feel habits · reference-feel→primitive map |
| [SELECTION.md](SELECTION.md) | picking the transition/font/look/sting for a feeling, or picking between whole directions | intent→effect (cited) · complete look/sting coverage · 8 named reference profiles · how `make concept` forces a round off the median |
| [STORY.md](STORY.md) | deciding the beats and their order | the spine · beat-role→persuasion→feeling · named spines + timing · scene budget · product→beats |
| [TASTE-RULES.md](TASTE-RULES.md) | it "renders fine but feels cheap" | cause→feeling ease table · the failure-modes catalog · restraint · continuity |
| [TRANSITIONS.md](TRANSITIONS.md) | choosing the CUT between two beats (you can't say why a transition is there) | the transition taxonomy (type→meaning) · Murch's Rule of Six · continuity vs montage · the per-seam decision procedure |

**How it looks (the house-style layer):**

| Guide | Load it when you are… | Answers |
|---|---|---|
| [AUTHOR-THE-FRAME.md](AUTHOR-THE-FRAME.md) | a beat needs a bespoke SVG/HTML dataviz or diagram | authoring a bespoke inline-SVG beat · the `window.__timelines` seek bridge · the per-child-choreography gap |
| [COLOR.md](COLOR.md) | authoring a `theme` palette, choosing bg/accent | build from one dominant · 60-30-10 · dominance · deploy-for-mood · gradient-vs-flat · WCAG |
| [EYE-TRACE.md](EYE-TRACE.md) | a cut moves the subject across the frame | where the eye is at each cut · the attention ranking · our 0.30 threshold and where it came from · why it reports |
| [FRAME-SPEC.md](FRAME-SPEC.md) | starting a video, lock the contract BEFORE the JSON | the per-video design-system spec + scene-by-scene storyboard (Reproduce/Adapt · persuasion · emotion) · the anti-front-load reveal model · seam QA. Fill-in template: `STORYBOARD-TEMPLATE.md` (gate: `make storyboard-check`). |
| [HTML-FRAGMENTS.md](HTML-FRAGMENTS.md) | you are writing an `html` layer by hand, or a fragment renders as a dead still and nothing says why | what a layer actually wraps · the four ways a fragment moves · the three things the engine refuses and what to use instead · the traps that cost a render each |
| [IMAGERY.md](IMAGERY.md) | choosing image vs gradient, treating a photo, icons | the visual ladder · treatment→intent · licensing · icon choice |
| [LAYOUT.md](LAYOUT.md) | placing layers, composing a beat | grid · one hero · asymmetry vs centered · archetype→intent · safe zones · active vs passive whitespace |
| [MOTION-STANDARDS.md](MOTION-STANDARDS.md) | motion is technically correct and still feels wrong, or you are choosing an easing or a duration | the outside standards for why motion reads well, which of them transfer to FILM, and what this engine already has against what it is missing |
| [SPECIMEN.md](SPECIMEN.md) | you are about to write a scene that PROVES a mechanism works | what a specimen is · why the subject is a picture · the series constants and why each is fixed · when it is `make catalog` instead |
| [SURFACES.md](SURFACES.md) | choosing the SURFACE copy sits on (glass/mesh/spotlight/bento) | the sleek block library · the build-HTML-first loop · the design spec + 8 visual styles picker |
| [TYPOGRAPHY.md](TYPOGRAPHY.md) | picking `type.sans/serif/mono`, sizing headlines | which face signals which personality · pairing · the size scale · weight/tracking/leading |

**How full · how it sounds:**

| Guide | Load it when you are… | Answers |
|---|---|---|
| [DENSITY.md](DENSITY.md) | a beat looks flat / slide-like | hero + support + metadata triad · the "produced" tell · thin-beat rule |
| [READING.md](READING.md) | a line is on screen and you do not know if anyone can read it | hold by word count · the flicker gap · what counts as prose · why the library reads once, not twice |
| [SHOW-DONT-TELL.md](SHOW-DONT-TELL.md) | the film is all type in boxes | decoration vs explanation · what each claim shape wants · the subject-size rule · no gate, your eyes |

**Reference (look it up):**

| Guide | Load it when you are… | Answers |
|---|---|---|
| [AE-TECHNIQUES.md](AE-TECHNIQUES.md) | you want a motion-design technique with the numbers a practitioner actually states, and the engine word for it | 12 techniques studied from one After Effects channel · the ordered recipe and the step nobody guesses · the stated values · where each one lands in this engine · default or per-film option |
| [AFTER-EFFECTS-RECIPES.md](AFTER-EFFECTS-RECIPES.md) | you want the named procedure a motion designer would reach for, and the engine word for it (or the news that there isn't one) | 26 named After Effects recipes with their real numbers · a HAVE/PARTLY/LACK verdict per recipe against this engine (23 HAVE, 3 PARTLY, 0 LACK as of 2026-08-29) · what is left and where it would live |

_GENERATED by `make doc-index` from each guide's `when:` / `answers:` frontmatter, the rows cannot
drift from the docs. Change a description in the doc, then run `make doc-index`. The whole-repo map,
including everything outside CRAFT, is [`../INDEX.md`](../INDEX.md)._
<!-- docmap:end -->

## How these relate to the rest of the docs (no overlap)
- **CRAFT/** = *how to choose/build* (decisions). ← you are here
- [`../DESIGN-DATABASE.md`](../DESIGN-DATABASE.md) = *what techniques exist* (the catalog).
- [`../MOTION-CRAFT.md`](../MOTION-CRAFT.md) = *how it moves* (motion rules + gates).
- [`../MISTAKES.md`](../MISTAKES.md) = *what went wrong before* (mistake → fix log).
- `.claude/skills/{taste-skill,impeccable}` = *enforcement* (the anti-slop detector + dials). CRAFT tells
  you what to do; impeccable checks you did it. Reach past what impeccable flags using these guides.
- `make craft-coverage` = *doc integrity*: fails if a look/sting in the engine isn't classified in
  SELECTION, a doc names a removed effect, a CRAFT cross-link breaks, or a guide is orphaned from this index.

## The engine facts these guides are grounded in (not generic advice)
- **Theme contract** (`core/theme-contract.js`): a theme MUST define `palette.{bg,bg2,surface,surface2,
  line,lineStrong,text,text2,dim,ink,accent,accentDim,accentGlow,up,down}`, `type.{sans,serif,mono,num}`,
  and 3 `gradient` stops. No fallback look, COLOR/TYPOGRAPHY map to exactly these keys.
- **Bundled faces** (`core/tokens.css`): Inter, Inter Display, Space Grotesk, Instrument Serif, Geist,
  Geist Mono, Plus Jakarta Sans, JetBrains Mono, Hanken Grotesk, Caveat (Söhne is local/licensed).
- **Real registries** the guides cover in full: 31 composite looks (`core/looks.js`), 35 shader stings
  (`SHADER_FX` in `core/stings.js`), the palette-driven bg presets (`core/backgrounds.js`).
- **Doctrine**: colours ONLY from the brand (eyedrop, `make palette`); dominance decided by LOOKING;
  no em-dashes on screen; patterns are seasoning not wallpaper. See [`../MISTAKES.md`](../MISTAKES.md).
