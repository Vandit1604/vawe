# CRAFT: decision guides for authoring a video

> **New here? Start at [`../TASTE.md`](../TASTE.md)**. The front door that ties the spines together.
> CRAFT is where each decision actually gets made.
>
> **Never authored from scratch? Read [`AUTHORING-WALKTHROUGH.md`](AUTHORING-WALKTHROUGH.md) first**,
> the one narrative that carries a single video from a blank page to shipped, chaining every guide below
> in order. And [`DIRECTION.md`](DIRECTION.md) is the cross-cutting spine (pacing · restraint · story
> placement) these decisions all serve.
>

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
| 2 | **The anchor**: one reference profile for the whole film | [SELECTION.md](SELECTION.md) | the coordinated face/pace/cut-family/accent policy |
| 3 | **Per beat, the effect**: the transition/look/sting for THIS beat's feeling | [SELECTION.md](SELECTION.md) | which cut, which face role |
| 4 | **How each frame looks**: type · colour · layout · imagery | [TYPOGRAPHY](TYPOGRAPHY.md) · [COLOR](COLOR.md) · [LAYOUT](LAYOUT.md) · [IMAGERY](IMAGERY.md) | the composed frame, on the brand's palette + face |
| 5 | **How full each frame is**: produced, not a slide | [DENSITY.md](DENSITY.md) | hero + support + metadata on the content beats |
| 5b | **Whether the frame SHOWS or only tells** | [SHOW-DONT-TELL.md](SHOW-DONT-TELL.md) | a quantity, proportion or real surface drawn as a graphic, not set in type |
| 5c | **What holds the film together across its cuts** | [CONTINUITY-WITHOUT-AN-OBJECT.md](CONTINUITY-WITHOUT-AN-OBJECT.md) | a thread that is a sentence, a match cut or a rhythm, not only a resizing prop |
| 6 | **The restraint pass**: cut what doesn't earn its place | [TASTE-RULES.md](TASTE-RULES.md) | a film with 2–3 earned effects, not fifteen |
| 7 | **The sound**: sound by default, silence only with a stated reason | [SOUND.md](SOUND.md) | a film held together aurally, and a licence we can produce |

**Not authoring a film at all?** The nine steps above are for somebody making one. If you are changing
the ENGINE (a gate, a layer type, a registry, the capture path, anything under `core/` or `internal/`),
the doctrine is [ENGINE-CHANGES.md](ENGINE-CHANGES.md): why a gate is the last resort, why sugar must
fail loudly, the three extension primitives, how to price a change that touches the capture path, and
the framework harvest.

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
| [AUTHORING-WALKTHROUGH.md](AUTHORING-WALKTHROUGH.md) | authoring a whole video, especially with no brand site | the single narrative: spine → manufacture the four things → lock sheet → JSON → the mandatory ladder → judge → ship |
| [CAPTIONS.md](CAPTIONS.md) | adding burnt-in captions, or shipping to a phone feed (tiktok / reels / shorts) | caption timing (words, vo-captions), the safe strip per destination, captionMode vs captionStyle |
| [COMMAND-OUTPUT.md](COMMAND-OUTPUT.md) | you are writing or changing a command that reports something (a gate, a check, an audit) | the one output contract every reporting command follows, tight prose by default and --json for structure |
| [CONTINUITY-WITHOUT-AN-OBJECT.md](CONTINUITY-WITHOUT-AN-OBJECT.md) | the film must hold together and its subject is NOT one object that transforms | the threads that are not a travelling prop: a sentence completed across cuts, a match cut on shape or motion, a rhythm, a camera that keeps travelling · how each satisfies the continuity floor |
| [DIRECTION.md](DIRECTION.md) | it "reads amateur" though every layer renders fine | the direction spine, Disney's 12 · Murch's Rule of Six · restraint · story placement, each sourced + tagged by which gate enforces it |
| [DISCOVERY.md](DISCOVERY.md) | you are about to author and want to reach past the default slice into the full vocabulary | how to use the whole palette (the layer types `ls core/layers/` lists, plus the effect arsenal `make regen` owns the count of, blueprints, cuts): the always-visible primer, the search, the gap report, and the name-three-reject-the-first discipline; and why the search stays token-overlap, not embeddings |
| [ENGINE-CHANGES.md](ENGINE-CHANGES.md) | you are changing the ENGINE rather than authoring a film: a gate, a layer type, a registry, the capture path, or anything under core/ and internal/ | why a gate is the LAST resort and where a refusal belongs instead · how sugar must fail loudly rather than no-op · the three primitives that let you add a thing without touching everything · how to price a change that touches the capture path · the framework harvest, and how to classify a problem as framework, gate gap or authoring |
| [FILM-STRUCTURE.md](FILM-STRUCTURE.md) | "what holds this film together across its cuts" | the devices a short film can be held by (spatial · verbal · temporal · conceptual), what practitioners actually say about choosing between them, and why our one blocking structural rule enforced the item Murch ranks last |
| [GRAMMAR.md](GRAMMAR.md) | before authoring, or when a film reads flat and you cannot say why | what films that read well actually MEASURE: shot length, motion, whether the ground turns, and what carries across a cut |
| [KEYED-MOTION.md](KEYED-MOTION.md) | a film has the right structure and still feels amateur, or a recreation drifts where the original snaps | how the exemplar actually MOVES, as numbers from its JSON: dense keys with linear between them · layers sharing one pan · `--p` carrying what position cannot · traced timings · diegetic exits. A register you choose, not a floor, and deliberately ungated |
| [MOTION-TRACE.md](MOTION-TRACE.md) | judging or proving a layer's motion without rendering or watching the video, checking a claimed wind-up/pulse/beat-timing against real numbers | per-layer moving/held spans, peak velocity, peak area change (a wind-up/scale pulse), monotonic vs oscillating shape |
| [PER-SCENE-FANOUT.md](PER-SCENE-FANOUT.md) | "one agent per scene, writing HTML" or "why do my three fragments not read as one film" | the lock-step-before-fan-out chain: stagekit, contract, scenes, assemble, and when it is overkill |
| [PITCH.md](PITCH.md) | the brief is unformed, "make a video about X" with no locked angle yet | diverge before you converge: five concepts sampled wide, an anti-median probability gate, a silhouette check, the three-line pitch format |
| [REVIEW-STOPS.md](REVIEW-STOPS.md) | "we built the whole thing and then it was rejected\ | the points where the work gets shown before it is finished: concept, storyboard, style frames, the 85% draft |
| [ROUTING.md](ROUTING.md) | "let's make a video", before opening any file: which film type is this, and which prompt template and skill does it take? | the film-type table (nine types, first matching row wins), the prompts/ template and skill each one takes, and how to resolve the common ambiguities |
| [SOUND.md](SOUND.md) | the film has no sound, you are about to ship it mute, or you are placing a cue or a music bed | how to place subtle cues with <audio data-synth>; the 13 voices and their pitfalls; sound bridges, sync points, silence; what music we may legally put under a film |
| [SUBAGENTS.md](SUBAGENTS.md) | judging your own render (a full pass, a recreation, anything you will ship), or about to fan work out to subagents | why a self-grading agent grades kindly; the critics and the one artifact each is handed; how to run them; what a fan-out costs; the brief lines and worktree contract every subagent brief needs |
| [WRITING-FOR-AGENTS.md](WRITING-FOR-AGENTS.md) | you are writing or editing AGENTS.md, a skills/*/SKILL.md, or a brief an agent will read, and want the rule to survive truncation | six patterns that keep a rule readable by an agent, and the frontmatter and size contract a SKILL.md must meet |

**What & why (the story layer):**

| Guide | Load it when you are… | Answers |
|---|---|---|
| [IDEATE.md](IDEATE.md) | turning a reference video or a raw idea into a film, before any storyboard or JSON exists | what `make ideate` writes, the two ways to run it, and how to fill what it cannot measure |
| [MEASURE.md](MEASURE.md) | you need a transition's REAL numbers (a reference to reproduce, or to verify our own render) | `make study-tool X=measure` · per-frame tracking → nearest engine preset + residual · what frames can't reveal · self-verification loop |
| [RECREATION.md](RECREATION.md) | recreating a specific reference video end to end ("make ours look like this"), or reflecting a real website section by section | the ordered loop: measure, capture, build, score, verify; one beat per section in the site's order; what to sample; the honest 1:1 ceiling |
| [REFERENCE-STUDY.md](REFERENCE-STUDY.md) | a real video looks better than ours and you want to learn and copy why | how to sample a reference, what a dense read shows, and the premium-feel habits to reach for on purpose |
| [SELECTION.md](SELECTION.md) | picking the transition, font, easing or overall look for a feeling, or picking between whole directions | intent to choice (cited) for cuts, faces and easing; eight named reference profiles as a whole coordinated look; the contradictions to avoid |
| [STORY.md](STORY.md) | deciding the beats and their order | the spine, beat role to persuasion to feeling, named spines with timing, scene budget, product material to beats |
| [TASTE-RULES.md](TASTE-RULES.md) | it "renders fine but feels cheap\ | the guardrails you break by default, the cause to feeling ease table, the failure-modes catalog, restraint, continuity |
| [TRANSITIONS.md](TRANSITIONS.md) | choosing the cut between two beats (you cannot say why a transition is there) | the transition taxonomy (type, meaning), Murch's Rule of Six, continuity versus montage, the per-seam decision procedure, durations and speed profiles |

**How it looks (the house-style layer):**

| Guide | Load it when you are… | Answers |
|---|---|---|
| [AUTHOR-THE-FRAME.md](AUTHOR-THE-FRAME.md) | a beat needs a bespoke SVG/HTML dataviz or diagram | authoring a bespoke inline-SVG beat · the `window.__timelines` seek bridge · the per-child-choreography gap |
| [BLOCKS-HTML-STATUS.md](BLOCKS-HTML-STATUS.md) | you are about to convert another blocks/*.mjs family to html output, or wondering why one family still returns native layers | which factories are already html, and which are deliberately native, with the reason |
| [COLOR.md](COLOR.md) | authoring a `theme` palette, choosing bg/accent | build from one dominant · 60-30-10 · dominance · deploy-for-mood · gradient-vs-flat · WCAG |
| [EYE-TRACE.md](EYE-TRACE.md) | a cut moves the subject across the frame | where the eye is at each cut · the attention ranking · our 0.30 threshold and where it came from · why it reports |
| [FRAGMENT-EXEMPLARS.md](FRAGMENT-EXEMPLARS.md) | you want to see the stage kit used well before writing a fragment from scratch | four worked fragments, one archetype and one theme each, and what each one deliberately refuses |
| [FRAME-SPEC.md](FRAME-SPEC.md) | starting a video, lock the contract BEFORE the JSON | the per-video design-system spec + scene-by-scene storyboard (Reproduce/Adapt · persuasion · emotion) · the anti-front-load reveal model · seam QA.  |
| [HTML-FRAGMENTS.md](HTML-FRAGMENTS.md) | you are about to author a fragment and want to know what has to exist first, you are deciding HOW MANY fragments a film needs, you are writing an `html` layer by hand, or a fragment's motion does not show up in the render | how to route a frame through the stage kit and ui-skills before writing markup · why the storyboard has to exist before any fragment · how many fragments a film needs and why beats, frames and fragments are three different counts · how to author a resting frame the engine can grab · what a layer actually wraps · the ways a fragment moves, including CSS animation/transition and Web Animations, all seeked deterministically · the one thing still refused and why · the traps that cost a render each · the defaults that make hand-written markup read as AI slop, and which of the two gates sees what |
| [IMAGERY.md](IMAGERY.md) | choosing image vs gradient, treating a photo, icons, or fetching a brand mark | the visual ladder · where a real asset comes from · treatment→intent · licensing · icon choice |
| [LAYOUT.md](LAYOUT.md) | placing layers, composing a beat | grid · one hero · asymmetry vs centered · archetype→intent · safe zones · active vs passive whitespace |
| [MOTION-REGISTERS.md](MOTION-REGISTERS.md) | the restraint rule (one loud moment, effects as seasoning) reads wrong for the type you are writing, or you need a published number instead of an adjective | why restraint is register-dependent, not universal; the Material Design 3 curves and the duration/stagger numbers that replace our adjectives; the seven-device motion taxonomy; what is and is not measurable about motion |
| [MOTION-STANDARDS.md](MOTION-STANDARDS.md) | motion is technically correct and still feels wrong, or you are choosing an easing or a duration | the outside standards for why motion reads well, which of them transfer to FILM, and what this engine already has against what it is missing |
| [SCREENS.md](SCREENS.md) | you are about to author a product screen (an editor, a results grid, a dashboard, a chat, a card) for a film, or a screen previews as a grey box, with tiny type, or with something clipped | why a product screen is designed for the video, not a plain mock; the measured numbers; the checks for size, clipping and images |
| [SURFACES.md](SURFACES.md) | choosing the surface copy sits on (glass, mesh, spotlight, bento), or locking a look in one page | the design spec that locks a look, the check against it, the 8 visual styles picker, and the backdrop and ruled-grid rules |
| [TYPOGRAPHY.md](TYPOGRAPHY.md) | picking a font or type face, or sizing headlines | which face signals which personality, pairing, the size scale, weight, tracking and leading, the overused-face list |

**How full · how it sounds:**

| Guide | Load it when you are… | Answers |
|---|---|---|
| [CONTENT.md](CONTENT.md) | a beat draws a screen/window/product/photo, or a film reads as plain beside its reference | the four content numbers · dense-where-dense/quiet-where-quiet · theme source (R1) · screens (R2) · what real material means |
| [DENSITY.md](DENSITY.md) | a beat looks flat / slide-like | hero + support + metadata triad · the "produced" tell · thin-beat rule |
| [READING.md](READING.md) | a line is on screen and you do not know if anyone can read it | hold by word count, the numbers and their sources, which text counts as prose, the flicker gap |
| [SHOW-DONT-TELL.md](SHOW-DONT-TELL.md) | the film is all type in boxes | decoration versus explanation, what each claim shape wants, why the graphic must be the subject, three questions to ask by hand |

**Reference (look it up):**

| Guide | Load it when you are… | Answers |
|---|---|---|
| [AE-TECHNIQUES.md](AE-TECHNIQUES.md) | you want a motion-design technique one practitioner states the dials for, and the engine word for it | 12 techniques studied from one After Effects channel · the ordered recipe and the step nobody guesses · the values that practitioner states, which are settings and not standards · where each one lands in this engine · default or per-film option |
| [AFTER-EFFECTS-TECHNIQUES.md](AFTER-EFFECTS-TECHNIQUES.md) | you want the named procedure a motion designer would reach for, and the engine word for it (or the news that there isn't one) | 26 named After Effects recipes with their real numbers · a HAVE/PARTLY/LACK verdict per recipe against this engine (26 HAVE, 0 PARTLY, 0 LACK as of 2026-09-23) · what is left and where it would live |
| [EDITING.md](EDITING.md) | you want autocomplete or inline errors while typing a scene JSON, in an editor | the .vscode/settings.json json.schemas mapping · the per-scene $schema pointer convention · what real field-level autocomplete needs · the follow-up that would fix it |
| [FROM-GSAP.md](FROM-GSAP.md) | you know GSAP and want the vawe JSON that does the same thing | 17 side-by-side pairs, a GSAP tween/timeline/stagger/ease/motionPath/wiggle/loop/trim/matte next to the vawe field or JSON that does the same job, and why the shape differs (renderFrame(n) has no wall clock and no callbacks) |
| [LAUNCH-REFERENCE.md](LAUNCH-REFERENCE.md) | you are about to author a launch/product film and want a real bar for what 'great' looks like, not a memory of it | 6 launch sites as links only, each with 2-3 named moves mapped to the vawe mechanism that makes them |
| [PRIMITIVES-VOCABULARY.md](PRIMITIVES-VOCABULARY.md) | you want to see every primitive the engine has, the plain words that find it, and the sentence that says what it does | the full word-action listing every defineRegistry registry carries, grouped by registry, graded the same way make check GATE=word-action grades it |

_The whole-repo map, including everything outside CRAFT, is [`../INDEX.md`](../INDEX.md)._
<!-- docmap:end -->

## How these relate to the rest of the docs (no overlap)
- **CRAFT/** = *how to choose/build* (decisions). ← you are here
- [`../DESIGN-DATABASE.md`](../DESIGN-DATABASE.md) = *what techniques exist* (the catalog).
- [`../MOTION-CRAFT.md`](../MOTION-CRAFT.md) = *how it moves* (motion rules + gates).
- [`../MISTAKES.md`](../MISTAKES.md) = *what went wrong before* (mistake → fix log).
- `skills/{taste-skill,impeccable}` = *enforcement* (the anti-slop detector + dials). CRAFT tells
  you what to do; impeccable checks you did it. Reach past what impeccable flags using these guides.
