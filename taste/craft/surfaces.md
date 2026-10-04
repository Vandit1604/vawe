---
when: choosing the surface copy sits on (glass, mesh, spotlight, bento), or locking a look in one page
answers: "the design spec that locks a look, the check against it, the 8 visual styles picker, and the backdrop and ruled-grid rules"
group: look
---

# SURFACES: the design spec and the visual style

The finishing layer: the surface copy sits on, and a one-page spec that locks a look. Load it after
type, colour and layout are decided ([typography.md](typography.md), [color.md](color.md), [layout.md](layout.md)). Pick one visual style as
the register. Do not mix ([visual-style-one](../rules/visual-style-one.md), [surface-spec](../rules/surface-spec.md)).

## Build the surface before the film

A surface you reuse, or that must look impeccable, is built and looked at on its own before it enters the
page. Do not tweak coordinates blind inside a long render. Write the fragment as plain HTML and CSS,
open it standalone (`bin/vawe compare --page <page> --at t` renders one frame in seconds), run
`skills/impeccable/scripts/detect.mjs` on it as the anti-slop check, then drop it in. Glass needs something
behind it: put a moving gradient under a frosted panel or the blur has nothing to work on. A moving
surface (a light travelling a card border) comes from an animation, not a frozen style.

## The design spec: lock a look in one page

Fill this before authoring a bespoke surface. It is the frame's contract, and every fragment obeys it.
Take the values from the brand's real CSS.

| token | decide | example |
|---|---|---|
| colours | ground, surface, text, dim, accent (from the brand, contrast-checked) | dark ground, white text, one accent |
| typography | 1 to 3 real faces mapped to hero, body, mono, at measured weights | display 800, mono 500 |
| rounded | the radius scale, one system | 12, 18, 26 |
| borders | hairline colour and weight | 1.5 px at 14% white |
| shadows | elevation: none for flat brands, deep for glass | `0 24px 70px rgba(20,20,25,.12)` |
| spacing | padding and gap rhythm (label to value about 12 px, groups 32 px and up) | pad 40, gap 14 |
| motion | easing character, overshoot, stagger | EASE.land, 50 ms stagger |
| components | which surfaces the brand uses | glass over a gradient; no card soup |

After building, check the frame against the spec: every colour is in the palette (flag any invented
one), families and weights match with no substitution (a face was swapped silently more than once),
radii match the scale, spacing sits in the declared range, shadow depth matches, and none of the things the
spec said it would not do is present.

## The 8 visual styles

Pick one as the register. It sets colour, type and components together.

1. Editorial: serif hero, generous whitespace, hairline rules, no fills. Calm, authoritative.
2. Technical: mono, tight grid, terminal chrome, dark. Precise, developer.
3. Glass and depth: frosted glass over a living gradient, soft light. Modern, soft.
4. Brutalist: huge sans, hard edges, high contrast, one loud accent. Bold, confident.
5. Mesh and gradient: soft mesh fields, rounded, luminous. Friendly, consumer.
6. Kinetic and broadcast: fast cuts, big kinetic type, whip pans. Energetic, launch.
7. Analog and warm: grain, film halation, warm palette, slight imperfection. Human, crafted.
8. Data and dashboard: real UI surfaces, count-ups, dive-ins, telemetry motion. Proof, product.

A register you cannot justify from the brand's own site is the wrong one: restudy, do not guess.

## The backdrop is always a decision

A static field is a choice, never a default ([world-turns](../rules/world-turns.md)). Judge a moving backdrop across four or more timestamps,
never on one still: a still hides speed, scale and direction. A ruled line grid is a design tool's
canvas, not a film's. If you want one, write it on purpose and be able to say in one clause what the
grid is doing.
