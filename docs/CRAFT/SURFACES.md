---
when: choosing the SURFACE copy sits on (glass/mesh/spotlight/bento)
answers: "the sleek block library · the build-HTML-first loop · the design spec + 8 visual styles picker"
group: look
codes: no-bg-motion, off-radius, off-shadow, ruled-grid, static-bg
---

# SURFACES: sleek components, the build-first loop, and the design spec

## AGENT SUMMARY

- Load this AFTER type/colour/layout is locked ([TYPOGRAPHY](TYPOGRAPHY.md) · [COLOR](COLOR.md) ·
  [LAYOUT](LAYOUT.md)). Pick ONE of the 8 visual styles as the register, do not mix.
- Build a reusable surface as HTML FIRST: author the fragment (prefer a `blocks/sleek.mjs` factory),
  preview it standalone (`make preview HTML=<file> THEME=<brand>`), gate it clean
  (`make designspec-check D=<file>`), only then drop it into the scene.
- Lock the one-page design spec (colours, typography, rounded, borders, shadows, spacing, motion,
  components) before authoring a bespoke surface; every block/fragment obeys it.
- Enforced by `[gated: quality/gates/designspec-check.mjs]` (codes: `no-bg-motion`, `off-radius`,
  `off-shadow`, `ruled-grid`, `static-bg`), which automates colours and typography of the post-build
  check; corners, spacing, depth and the negative list are `[eye]`.
- Confirm: did you build and gate the fragment BEFORE dropping it into the scene, and does every
  colour/font in it trace back to the spec table?

The finishing layer: the actual *surfaces* copy sits on (glass, mesh, spotlight, bento), how to build a
bespoke one before you drop it in, and a one-page design spec to lock a look. Load this after the frame's
type/colour/layout is decided ([TYPOGRAPHY](TYPOGRAPHY.md) · [COLOR](COLOR.md) · [LAYOUT](LAYOUT.md)).

## The sleek surface library (`blocks/sleek.mjs`)

Vetted, static-CSS card treatments that read premium under the determinism reset. **The rule: a block holds
only STATIC CSS. Anything that MOVES comes from a Phase-2 engine effect** (a `beam` layer, an `aurora` paint
behind glass), never a frozen CSS `@keyframes`. Drop via `{ "type":"block", "block":"<name>", ... }`, which expands at load, no separate step.

| Block | What it is | Give it |
|---|---|---|
| `glassCard` | frosted glass: BLURS whatever moves behind it, hairline edge, top sheen | a living background (aurora/mesh/paint) to blur |
| `meshPanel` | a soft mesh-gradient surface (stacked accent blobs) | a calm branded surface behind a hero line |
| `spotlightCard` | a dark card with a soft spotlight washing from a corner (`from`) | one hero line the light points at |
| `borderBeamCard` | a glass card with a light TRAVELLING its border (the animated `beam`) | the one sleek surface that moves |
| `grainOverlay` | fine film grain over the frame (feTurbulence, screen-blended) | any flat gradient that needs to read as "shot" |
| `bento` | an asymmetric bento grid: one hero cell + supporting cells | scale contrast, not a uniform card grid |

Glass needs something behind it: put an `aurora` paint or a `meshPanel` under a `glassCard` or the blur has
nothing to work on. `make catalog` renders the whole registry; browse it before hand-rolling a surface.

## Build the HTML FIRST (the default loop)

A surface you'll reuse or that must look impeccable is built and gated BEFORE it enters the scene, not
tweaked blind inside a 2000-frame render. The loop:

1. **Author the fragment**: a `blocks/sleek.mjs` factory (preferred, reusable + gated) OR a hand-written
   HTML fragment for true connective tissue (a hook, a CTA). Hand-writing? Load [`taste-skill`] +
   [`impeccable`] first (Anti-Default Discipline), then this guide's design spec.
2. **Preview it standalone**: `make preview HTML=<file> THEME=<brand>` → `/tmp/preview.png`. Read the shot.
3. **Gate the craft**: `make designspec-check D=<file>` (impeccable detector, 41 rules, no LLM) must be clean.
4. **Drop it in**, only a vetted surface enters the scene. Now the render is composing known-good parts.

Building first is what stops the "tweak coords blind, re-render, repeat" spiral that eats a session.

## The design spec (lock a look in one page)

Before authoring a bespoke surface, fill this: it is the frame's contract, and every block/fragment obeys it.
Adapted from another engine' design-spec; the values come from the brand study ([`../DESIGN-DATABASE.md`], `make brandspec`).

| Token | Decide | Example |
|---|---|---|
| `colors` | bg · surface · text · dim · accent (from the brand, contrast-checked) | cobalt bg, white text, lime accent |
| `typography` | 1-3 real faces mapped to hero/body/mono, at MEASURED weights | Anybody 800 / serif 400 / mono 500 |
| `rounded` | the radius scale (one system: tight/card/soft) | 12 / 18 / 26 |
| `borders` | hairline colour + weight | 1.5px `rgba(255,255,255,.14)` |
| `shadows` | elevation (none for flat brands, deep for glass) | `0 24px 70px rgba(20,20,25,.12)` |
| `spacing` | pad + gap rhythm (label+value ~12px, groups 32px+) | pad 40, gap 14 |
| `motion` | easing character · bounce · stagger (the brand's `motion`) | `easeOutCubic`, settle 0.7, stagger 60ms |
| `components` | which surfaces this brand uses (glass? mesh? plain?) | glass over aurora; no card soup |

### Check the frame against the spec AFTER you build it

Borrowed close to verbatim from the reference system's
`another engine-creative/references/design-adherence.md`. Run it after building, before the preview, because
a spec nobody re-reads is a spec that was decoration.

1. **Colours**: every hex in the composition appears in the spec's palette. **Flag any invented colour.**
2. **Typography**: families and weights match the spec. **No substitutions.** This engine has substituted
   a face silently more than once ([`../MISTAKES.md`](../MISTAKES.md) #10, #22, #317).
3. **Corners**: `border-radius` values match the declared radius scale.
4. **Spacing**: padding and gap fall inside the declared density range.
5. **Depth**: shadow usage matches the declared level. Flat means none.
6. **The negative list**: verify none of the things the spec said it would NOT do are present.

`make designspec-check D=<file>` automates points 1 and 2 against the theme lock. Points 3 to 6 are yours.

### The 8 visual styles (mood-first picker)

Pick ONE as the register; it sets colors/typography/components together. Don't mix.

1. **Editorial**: serif hero, generous whitespace, hairline rules, no fills. (calm, authoritative)
2. **Technical**: mono, tight grid, terminal chrome, dark. (precise, developer)
3. **Glass / depth**: frosted glass over a living gradient, soft light. (premium, modern)
4. **Brutalist**: huge sans, hard edges, high contrast, one loud accent. (bold, confident)
5. **Mesh / gradient**: soft mesh fields, rounded, luminous. (friendly, consumer)
6. **Kinetic / broadcast**: fast cuts, big kinetic type, whip pans. (energetic, launch)
7. **Analog / warm**: grain, film halation, warm palette, slight imperfection. (human, crafted)
8. **Data / dashboard**: real UI surfaces, count-ups, dive-ins, telemetry motion. (proof, product)

A register that can't be justified by the brand's own site is the wrong one, restudy, don't guess.

Effects to move over these surfaces: [EFFECTS.md](../EFFECTS.md) · skills: `vawe-effects` · `vawe-animation` · `vawe-camera`.

## `static-bg`: the backdrop is always a decision

`bg` is required, so a static field is a choice, never a default. The cheap fix: list windows in the
order the film turns, give none of them a `from`/`to`, and the engine binds window `i` to the joint
after it (`core/timeline/junctions.js`), so the cuts you already wrote own the numbers. Judge motion
across 4+ frame timestamps, never on one still: a still hides speed, scale and direction
([`../MISTAKES.md`](../MISTAKES.md) #155). `node harness/dev/library-stats.mjs` prints how many
gate-visible scenes still paint one window for the whole runtime; never quote that count from memory.

## `ruled-grid`: opt in, don't default into one

A ruled line grid is a design tool's canvas, not a film's. Want one? Write it explicitly: `grid: true`
on a `softwash` fx, with `gridColor`, `gridAlpha` and `gridSpacing` beside it, and be able to say in one
clause what the grid is doing. No preset bakes one in silently.
