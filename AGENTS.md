# AGENTS.md — skill router for the vawe video engine

This repo turns one self-describing JSON → one rendered video (scene, the open-canvas primitive
engine — no templates). Read `CLAUDE.md` for the render loop and hard rules. Below: which skill to load
for which task. **Skills are vendored in `.claude/skills/` — a fresh clone has them, no install needed.**

## Routing

| You are about to… | Load this skill (Skill tool) | Then |
|---|---|---|
| Author / edit a scene JSON or `scene.html` | **vawe-scene-authoring** | purity, tokens, motion primitives, capture + QA loop |
| Plan a new video (brief → storyboard) | **vawe-video-planning** | site-derived design language, storyboard, ledger |
| **Hand-write any HTML** (a hook, CTA, card, hero) | **taste-skill** → then **impeccable** | design read + 3 dials, then production craft |
| Judge / fix a design that "looks AI-generated" | **impeccable** (`critique`, `bolder`, `quieter`) | 41-rule detector + register craft |

## The anti-slop rule (non-negotiable)

Hand-authored HTML is where generic "AI slop" enters (centered text, Inter, blue/purple gradient, equal
card grid). **Before writing HTML by hand:**
1. Load **taste-skill** — state the one-line Design Read and set the three dials
   (`DESIGN_VARIANCE` / `MOTION_INTENSITY` / `VISUAL_DENSITY`); obey its Anti-Default Discipline.
2. Prefer to **capture** a real, art-directed surface (`make capture`/`make sections`) over inventing one.
3. After authoring, run **`make slop D=<file>`** — the vendored impeccable detector (no LLM). It must be
   clean of overused-font / gradient / card-in-card / centered-default tells before render.

## The five anti-slop fixes (enforced by skill + gate)

1. **Capture the art direction, don't invent it** — reflect a real source; hand-write only connective tissue.
2. **Commit + name one art direction** per video (from taste-skill's Design Read). "Clean modern SaaS" is banned.
3. **`make slop`** gate — fail the generic tells deterministically before shipping.
4. **Asymmetry + scale contrast are defaults** — off-center anchor; one oversized hero paired with tiny text.
5. **Distinctive type** — for a real brand, the captured brand font; for anything else, never Inter/Space Grotesk.

## Gates (see CLAUDE.md / Makefile)
`make validate` → `make slop` → `make probe` → `make audit` → `make motion` → `make beats` → `make ledger`.
