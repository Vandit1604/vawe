---
when: "you are at phase 3 of a film and pick the ui-skills for the ladder rungs"
answers: "the named skill combos (PROVEN or UNTESTED), their rungs, the look, what to reject, and the films that used them"
group: reference
---
# Skill combos

A combo is a named set of ui-skills for the ladder rungs builder, type, colour and depth. The frame rung is always vawe's own rules (about 1 line and 2 or 3 things, a ground never flat, an eye path). Fetch each skill with `command npx -y ui-skills get <slug>`.

Rules:
- Start from a PROVEN combo. A film may swap one rung, and DESIGN.md gives the reason.
- DESIGN.md records `Combo: <name>` and then the usual `Skill <rung>: <slug>: what it decided` lines.
- An UNTESTED combo becomes PROVEN only after a still-frame test and the owner's approval. Record both in its entry here.
- A skill changes the surface (palette, type), not the composition. Reject its web-page patterns in every combo: nav, CTA button, pill, eyebrow, section padding, cluttered hero.

## Soft light (PROVEN)

- Builder: `leonxlnx/soft-skill`. Type: none needed, Geist from `bin/vawe fonts`. Colour: `pbakaus/colorize`. Depth: `mengto/progressive-blur`.
- Look: white ground with soft coloured light, floating glass parts, tinted diffused shadows, a ghost layer under a progressive blur veil.
- Reject: soft-skill's page layout and section spacing (take the glass and the shadows); colorize's multi-accent palettes (one accent); a blur veil over text that must be read.
- Films: `films/s9b-loomline`, `films/s9c-loomline` (all three rungs; owner: "the states look good", "we nailed the look"), `films/tidepool` (soft-skill and colorize, blur rejected; clean, liked).
- Not enough alone: `films/design-systems` used colorize without the builder rung and the product UI became placeholder bars (owner: the components did not look good). Keep the builder rung.

## Crisp product (UNTESTED)

- Builder: `emilkowalski/emil-design-eng`. Type: `jakubkrehel/better-typography`. Colour: `jakubkrehel/better-colors`. Depth: `mengto/beautiful-shadows`.
- Look: sharp, precise product UI, tight type, layered real shadows. For app screens and feature films.
- Reject: emil-design-eng's hover and press states (a film has no pointer); better-colors' dark-mode pairs (pick one mode).
- Films: none. Status: needs a still-frame test and owner approval.

## Editorial (UNTESTED)

- Builder: `zeke/swiss-design`. Type: `pbakaus/typeset`. Colour: `pbakaus/colorize`. Depth: none (flat, grain from the ground rules).
- Look: grid, large type, one accent, hard edges. For statement and typographic films.
- Reject: swiss-design's dense multi-column grids (a frame holds about 1 line); long text blocks.
- Films: none. Status: needs a still-frame test and owner approval.

## Evidence

The S5 tournament ran 11 single-skill arms (bolder, swiss-design, soft-skill, emil-design-eng, minimalist-skill, overdrive, frontend-design, landing-page, taste-skill, design-first-ui-prompting, gpt-tasteskill). All looked decent and all were cluttered web heroes. No winner was chosen. This is why a combo plus the frame rung is the unit, not one skill.
