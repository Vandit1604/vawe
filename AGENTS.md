# AGENTS.md: skill router for the vawe video engine

This repo turns one self-describing JSON → one rendered video (scene, the open-canvas primitive
engine: no templates). Read `CLAUDE.md` for the render loop and hard rules. Below: which skill to load
for which task. **Skills are vendored in `.claude/skills/`. A fresh clone has them, no install needed.**

## Routing

| You are about to… | Load this skill (Skill tool) | Then |
|---|---|---|
| Author / edit a scene JSON or `scene.html` | **vawe-scene-authoring** | purity, tokens, motion primitives, capture + QA loop |
| Plan a new video (brief → storyboard) | **vawe-video-planning** | site-derived design language, storyboard, ledger |
| Author a video **from scratch** (no brand site) | **vawe-video-planning** + read [`docs/CRAFT/AUTHORING-WALKTHROUGH.md`](docs/CRAFT/AUTHORING-WALKTHROUGH.md) | manufacture the four things a site gives; run the chain end-to-end |
| Fix a video that's "lots of effects, not directed" | read [`docs/CRAFT/DIRECTION.md`](docs/CRAFT/DIRECTION.md) | pacing · restraint · story placement, sourced; then `make author-check` |
| Decide what holds a short film across its cuts | read [`docs/CRAFT/FILM-STRUCTURE.md`](docs/CRAFT/FILM-STRUCTURE.md) | ~18 devices in four registers, sourced; carry two threads. A continuous object is one of them, and the one Murch ranks last |
| **Hand-write any HTML** (a hook, CTA, card, hero) | **taste-skill** → then **impeccable** | design read + 3 dials, then production craft |
| Judge / fix a design that "looks AI-generated" | **impeccable** (`critique`, `bolder`, `quieter`) | 41-rule detector + register craft |

## JSON and HTML: the division of labour, and the default

A vawe video is **JSON that composes a vocabulary**, plus **HTML where a bespoke picture is needed**.
Give each the job it is good at:

- **JSON owns** structure, timing, motion (keyframe tracks), cuts, camera, composition and audio. It is
  what makes a scene composable, diffable, shareable and generatable. Author the film here.
- **HTML owns** the *look* of one custom picture: a hero, a card, a CTA, gradients and type CSS can
  express that a prop vocabulary cannot. Reach for it for the frame's appearance, never for its timing
  (the engine drives motion; CSS `@keyframes`/`transition` are refused at boot).

**An `html` layer's markup is a FILE by default (`src`), not an inline string.** The layer takes exactly
one of `html` (inline) or `src` (a path to a `.html` file); the validator enforces one-and-only-one.
**Prefer `src`.** Reasons, in order:

1. **Agents write beautiful standalone `.html`; they write ugly escaped JSON strings.** Same skill, a
   better container. A `.html` file has highlighting, formatting, and `make preview HTML=frag.html` to
   see it in a real browser before it ever touches a scene. Inline HTML has none of that and pollutes
   the JSON with escaped soup nobody wants to read or diff.
2. **The JSON stays clean and composable** when the markup lives beside it, not inside it.
3. Inline `html` is reserved for a genuinely trivial fragment (a line, a chip) where a file is overhead.

So the authoring shape is: `hero.html` (the picture) + `launch.json` (the film, referencing it by
`src`). **Share-time is the exception:** a bundling step may inline every `src` back INTO the JSON to
produce one portable file (source vs. bundle, the same split a compiler makes). Author in files; inline
only to ship a single artifact.

## The anti-slop rule (non-negotiable)

Hand-authored HTML is where generic "AI slop" enters (centered text, Inter, blue/purple gradient, equal
card grid). **Before writing HTML by hand:**
1. Load **taste-skill**: state the one-line Design Read and set the three dials
   (`DESIGN_VARIANCE` / `MOTION_INTENSITY` / `VISUAL_DENSITY`); obey its Anti-Default Discipline.
2. Prefer to **capture** a real, art-directed surface (`make capture`/`make sections`) over inventing one.
3. After authoring, run **`make designspec-check D=<file>`**. The vendored impeccable detector (no LLM). It must be
   clean of overused-font / gradient / card-in-card / centered-default tells before render.

## The five anti-slop fixes (enforced by skill + gate)

1. **Capture the art direction, don't invent it**: reflect a real source; hand-write only connective tissue.
2. **Commit + name one art direction** per video (from taste-skill's Design Read). "Clean modern SaaS" is banned.
3. **`make designspec-check`** gate: fail the generic tells deterministically before shipping.
4. **Asymmetry + scale contrast are defaults**: off-center anchor; one oversized hero paired with tiny text.
5. **Distinctive type**, for a real brand, the captured brand font; for anything else, never Inter/Space Grotesk.

## Gates (see CLAUDE.md / Makefile)
Authoring quality, one command: **`make author-check D=<file>`** (always on: validate · beats · assets ·
inspect · plan-vs-render; `make video` runs it unless `NOCHECK=1`). The style gates, critique · direct ·
floor · dissolve · slop · designspec · copy, are OPT-IN: `TASTE=1 make author-check D=<file>`
([`docs/TASTE.md`](docs/TASTE.md)). Then the eye rungs:
`make probe` → `make audit` → `make beats` → `make ledger` → **`make judge`** (the gate that SEES,
required post-render; [`docs/JUDGE.md`](docs/JUDGE.md)).
