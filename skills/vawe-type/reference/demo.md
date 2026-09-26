---
when: "authoring a product-mechanism demo (a cursor, a click, a consequence)"
answers: "the demo type's spine, motion to reach for, rules, assets and worked example"
group: skill
---

# The demo playbook: cursor-and-proof

A demo is not a launch film cut short: it proves ONE mechanism works, and its honesty depends on the
click having a real, visible consequence. A cursor that clicks nothing, or a UI that changes on its own
timer regardless of the click, is decoration wearing a demo's clothes.

## The spine changes shape with length

**Under ~15s (the common case: paceBand tops out at 4.5s/beat, so a 4-beat demo is already borderline):
ONE CONTINUOUS ACTION.** `CONTINUOUS_ACTION_MAX_S` (`harness/author/type-spines.mjs`, 15s) is the
switch: below it, write the storyboard around the control the cursor drives, the one object, idle then
clicked then showing its consequence, no cut needed because a click-and-response is already one
uninterrupted action. Read `skills/vawe-continuous-action/SKILL.md` first at this length.

**At or past ~15s: the beat spine**, hook -> demo -> payoff -> close:

Hook naming the mechanism (2-3s) -> the demo itself: cursor arrives, clicks, consequence (3-5s) ->
payoff naming what was proven (2-3s) -> close. Pace band: **2.5-4.5s per beat**. The demo beat itself
can run longer than its neighbours: give the click room to read before the consequence lands.

## What this type needs that others do not

- **Quiet register.** A demo IS the interface being demonstrated, so it inherits the UI-adjacent
  restraint rule: the click and its consequence are the one thing allowed to be loud
  (`engine-doctrine/CRAFT/MOTION-REGISTERS.md` §1, `register: 'quiet'` in `type-spines.mjs`).
- **Aim the cursor at the control, not at pixels.** `{ "recipe": "hover-click", "at": <s>, "cursor":
  "<cursor layer id>", "target": "<control layer id>" }` (`recipes/recipes.json`) eases the cursor onto
  the target's own LIVE box (`snapTo`), switches it to a hand, and clicks (`core/layers/cursor.js`).
  This is the default: it survives a later reflow of the control, which a hand-typed `{t,x,y}` does not.
  Hand-type `path:[{t,x,y}]` (times LOCAL to the layer's own `start`, coordinates absolute screen px
  when the layer carries no `x`/`y` of its own) and `clicks:[t...]` only when there is no real layer to
  name, e.g. clicking a point inside a captured image with no `component` box under it.
- **A click with a CONSEQUENCE.** Whatever changes after the click (a chip appears, a state flips) must
  start at or just after the click time, never on its own independent schedule: the causality is the
  whole point of a demo, and a coincidental timing reads as fake the moment anyone looks twice.
- **A zoom, when the detail is small.** `ken` on the underlying `image`/`component`, or a `cameraMove`,
  pushes into the part of the UI the click actually touches.
- **The subject is a picture, not a blank rectangle.** `engine-doctrine/CRAFT/SPECIMEN.md`'s own rule: a demo
  proving nothing visual is not a demo, it is a slide with a caption.

## The motion to reach for

By role (`make arsenal Q="…"` to search):
- **hook**: `kineticHook`, `typedHook`
- **the mechanism itself**: nothing pre-built owns cursor+click; compose it from a real UI
  (`component`/`image`/`html`) plus a `cursor` layer, or reach for `recordedPan`/`scrollStory` when the
  proof is a captured surface wider or taller than the frame
- **proof**: `verdictProof` (type a command, note the result, pop a verdict chip), `terminalReveal`
- **close**: `ctaEnd`

## The rules that matter most

`engine-doctrine/RULES/first-arrival.md` · `engine-doctrine/RULES/motion-offsets.md` (the cursor's own `path` keyframes) ·
`engine-doctrine/RULES/text-on-flat.md` · `engine-doctrine/CRAFT/SPECIMEN.md` (what makes a demo honest) ·
`engine-doctrine/CRAFT/SHOW-DONT-TELL.md`.

## Assets and how to get them

Prefer a real captured UI (`make capture`) over a hand-drawn panel; the worked example below uses a
plain panel only because no real product was in scope, and says so in its `note`. A cursor demo never
needs a video recording of a real click, since the engine draws and animates the pointer itself.

## Writing the storyboard

Under 15s: the continuous action above. At or past 15s: beats, in order,
`kineticHook -> recordedPan -> verdictProof -> ctaEnd` (`harness/author/type-spines.mjs`) on `soft/ink`
bg presets. `recordedPan` needs a real `image`/`capture`/`html` surface: mark it `REPLACE:` in the
storyboard until you have one; swap in a plain UI panel + `cursor` layer instead if the proof is a click
rather than a pan.

## What the judge weighs for this type

Does the cursor actually land where it claims to click? Does something change ONLY after the click, not
before or independently? Is the mechanism being proven nameable in one sentence? Is there a zoom or a
push where the detail is small enough to need one?

## The worked example

`quality/runs/evals/briefs/demo.json` (15s, 16:9). Shows: a `cursor` layer using the `hover-click`
recipe onto a named button layer, a click ripple, and a stat chip that appears only after the click,
not on its own timer. No captured site here, a plain panel stands in for one (named in the scene
`note`).
