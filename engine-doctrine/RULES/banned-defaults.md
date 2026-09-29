---
name: banned-defaults
when: choosing type, colour, layout, motion or a transition for any hand-authored page or surface
holds: gated (quality/gates/designspec-check.mjs; off-colour, ruled-grid, and the generic-tell checks); the motion rows are reported by the critique
answers: "the banned-defaults list, the thing to do instead of each, and the escape valve for when the content genuinely calls for one"
group: look
---
# Ban gradient text, cyan/purple, identical card grids, and Inter by default

These are the tells that read as generated rather than designed, because they are what a model reaches
for with no direction. A rule that names the default it replaces fires; a rule that states a virtue
does not. So every row says what you will reach for, and what to do instead.
`make check GATE=designspec-check` catches the deterministic look rows; the critique
(`skills/vawe-critique/SKILL.md`) names the motion rows on the rendered film.

## Look

| you will reach for | do instead |
|---|---|
| gradient text | one flat colour from the kit |
| a cyan/purple gradient, or any random gradient | the brand's own surface, or a real capture |
| an identical-weight card grid | one card at full weight, the rest smaller or later |
| everything centred, equal weight | one focal point off-centre, one accent colour per frame |
| Inter or Space Grotesk with no brand reason | the kit's face (`make kit URL=`) |
| pure `#000`/`#fff` when the brief did not say black | the kit's dark or light surface |
| a centred title on a gradient | the title on a real surface, a capture, or white space |
| corner labels and frame borders | nothing decorates the edge |
| glow on UI text or chrome | contrast from weight and size, not light |
| fake product UI | a capture of the real thing, or nothing |
| two things fighting for attention | one focal point; the second thing arrives after the first lands |

## Motion

| you will reach for | do instead |
|---|---|
| everything fading in | one entrance per beat, and make it a move |
| `ease-out` on everything | arrive fast, land soft: a spring, or `approach` with k 0.12 to 0.19 |
| bouncy overshoot (`back.out`, `playful`) | `snappy` or `heavy`; overshoot only when the brief asks |
| an exit as slow as its entrance | exits faster and shorter, and they accelerate |
| a crossfade as the only transition | a cut on the beat, a wipe on the motion, a match on a shape |
| the same direction on adjacent transitions | change axis or direction at every seam |
| particle bursts, shockwave rings, RGB split, camera shake, lens flares | the subject itself moving |
| a group landing on one frame | a stagger of 30 to 80 ms |
| a logo slam at the end | the wordmark held still, 1.5 s, on its own surface |
| dead time nobody declared | a declared hold (`authoring.allow: ["dead-air"]` with a `_why`) |

## The escape valve

If the content genuinely calls for one of these, say so. In a page film:

```html
<script type="application/json" id="authoring">
  {"allow": ["off-colour"], "_why": {"off-colour": "the brand's own palette is cyan/purple, captured from its site"}}
</script>
```

In a scene JSON (until that format is deleted):

```json
{ "authoring": { "allow": ["off-colour"], "_why": { "off-colour": "the brand's own palette is cyan/purple, captured from its site" } } }
```

Wrong, in either: the default written by reflex, with no `_why`.
