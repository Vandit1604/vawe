---
when: "authoring any beat (don't re-derive motion)"
answers: "compose from directed-motion beats ({type:\"beat\"}) so good motion is the default; the ambition floor that fails a plain slideshow"
group: crosscutting
---

# BLUEPRINTS — compose a video from directed beats, don't re-derive motion

The recurring failure, proven twice on the TokenJam launch: even with the full arsenal in hand, authoring
a beat from a blank JSON regresses to `rise`+`fade` — a plain slideshow that passes every gate. Blocks
fixed that for *components* (a card, a chart). **Blueprints fix it for MOTION** — each is a whole beat's
directed choreography, so the good motion is the *default* you start from, not something you remember to add.

> A blueprint fixes **motion + structure**, never copy/colour/brand. Two brands using `kineticHook` still
> differ (their words, palette, and faces differ). The ledger + similarity gate still enforce uniqueness —
> this is the opposite of a template.

## Use one

```json
{ "type": "beat", "beat": "kineticHook", "start": 0.3, "dur": 5.5,
  "eyebrow": "Where does your agent spend?", "to": 94, "unit": "%",
  "sub": "of your agent's tokens are re-reads." }
```

`make expand D=<file>` turns each `{type:"beat"}` into its real, richly-animated layers (same pipeline
blocks use). Browse the set first: **`make blueprints`**.

## The beats (`blueprints/index.mjs`)

| Beat | Role | Emits |
|---|---|---|
| `kineticHook` | hook / open loop | eyebrow + hero count-up\|word (pop) + word-by-word subline |
| `statReveal` | payoff | hero count-up + kinetic label, held long |
| `cardCascade` | feature grid | kinetic title + cards that pop in one after another |
| `chipGrid` | named things (sources/tools) | pills that pop staggered + accent footer |
| `terminalReveal` | a CLI beat | typing command + cursor + rising output + accent result |
| `screenDive` | product surface | kinetic title + a real UI shot that KEN-pushes in (zoom into the dashboard) |
| `logoLockup` | brand | mark pops + wordmark travels + kinetic headline + sub |
| `verdictProof` | claim proven | typing command + note + a tone verdict chip that pops |
| `ctaEnd` | held end card | mark + install chip + sub + url (exitDur 0) |
| `typedHook` | a hook that erases itself | types in, un-types ~2x faster, caret throughout, never fades ([KEYED-MOTION.md](KEYED-MOTION.md)) |
| `morphButton` | the object that BECOMES the next thing | a labelled button shrinks, rounds and sheds its label until it is a dot — one `--p` clock, a different power per property |

Each takes `{ x?, y?, w?, start, dur, ...content }`. Defaults target the 1920×1080 stage; override to place.
A beat emits LAYER motion; pair it with the scene-level transition it wants (a `cinematicZoom` seam into a
`screenDive`, a `dissolve` into a `logoLockup`) — `make direct` suggests these.

## The floor that enforces this

`make direction-floor` (opt-in: `TASTE=1 make author-check`) is the **ambition floor** — the inverse of effect-soup. It
reads a scene's motion vocabulary (kinetic type · count-ups · camera · transitions · ken · cursor · motion
tracks · fx · background motion · beats) and **fails a plain slideshow**. Composing from beats clears it by
construction. Directed lives *between* soup and slideshow.

## The reference bar

The gold standard in this repo is **`formats/scene/brew-native.json`** — study its seams, camera push,
`motion[]` dolly heroes, gradient+motionBlur text, cursor click, and ken. `formats/scene/tokenjam-launch.json`
is the worked blueprint-era example (kinetic hooks, dashboard dive, verdict proof, held CTA). Before authoring,
watch one and read [`DIRECTION.md`](DIRECTION.md) — anchor on ambition, then compose.

## Adding a blueprint

Add a pure `props → layers` factory to `blueprints/beats.mjs` (compose the idioms in `blueprints/kit.mjs`:
`kineticHeadline`, `dollyNumber`, `caption`, `chip`, `panel`, `verdictChip`), register it in
`blueprints/index.mjs`, and describe it in `scripts/site/blueprints-catalog.mjs`. Keep it brand-agnostic
(semantic theme vars, no hardcoded palette) and deterministic (no Date/random).
