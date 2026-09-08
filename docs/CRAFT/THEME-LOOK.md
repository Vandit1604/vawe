---
when: a theme should carry more than colours and fonts, or a scaffold keeps re-deciding the same thing per film
answers: "the `look` block's shape (backdrop/scale/layout/marks/cuts/field) · how it is validated · how the scaffold merges it over the type spine · how to see it as a picture"
group: crosscutting
---

# THEME LOOK: the whole-film default a theme fixes

## AGENT SUMMARY

- `theme.look` (optional; `core/registry/theme-contract.js`) fixes the things AGENTS.md names as re-decided per
  film: `backdrop` (bg preset rotation, scaffold-only, see below), `scale` (hook/headline/body/caption
  type sizes), `layout` (anchor + margin), `marks` (logo path + its two sizes), `cuts` (default/accent
  transition), `field` (grain/vignette).
- Validated at load, same discipline as every other named vocabulary: an unknown `look` key, an
  unknown bg preset, or an unknown transition refuses with the near word (`core/validate/validate.mjs`
  `validateTheme`, checked for every `themes/*.json` pack by `make validate`).
- `make scaffold TYPE=<type> THEME=<name>` reads `theme.look` and merges it OVER the type spine
  (`scripts/author/type-spines.mjs`): the brand's own fixed look wins, the type spine is only a
  fallback for a theme with none.
- `make theme-sheet THEME=<name>` renders one contact sheet so a brand's look is a picture, not JSON.

## Why this exists

Before this, a theme was colours + fonts + a small `motion` block. Everything that makes a film LOOK
like a brand, not just be COLOURED like one, was re-decided per film: which bg preset family, the type
scale, the layout band, how the mark is used, which cut family, which audio cues. Two films for the
same brand could use different backdrops, different cut families, different scales, because nothing
fixed those choices at the brand level, only at the palette level.

`look` is deliberately small: only the things a scaffold or an author was already re-deciding by hand,
not a second copy of everything a scene can express. A scene that sets a field explicitly still wins
over the theme (the theme is a DEFAULT, never a constraint an author cannot override).

## The shape

```json
"look": {
  "backdrop": ["dotmatrix", "paperDots", "paperShapes", "soft", "paper"],
  "scale": { "hook": 92, "headline": 64, "body": 38, "caption": 24 },
  "layout": { "anchor": "left", "margin": 160 },
  "marks": { "logo": "site/public/assets/favicon.svg", "endCardSize": 160, "headlineSize": 108 },
  "cuts": { "default": "fade", "accent": "cinematicZoom" },
  "field": { "grain": 0, "vignette": 0 }
}
```

| Key | Shape | Checked against |
|---|---|---|
| `backdrop` | non-empty array of bg preset names, **scaffold-only** (see below) | `core/backgrounds/index.js` `BG_NAMES` |
| `scale` | `{hook, headline, body, caption}`, each a number | (structural only, no registry) |
| `layout` | `{anchor: left\|center\|right, margin: number}` | `anchor` against a fixed enum |
| `marks` | `{logo: path, endCardSize: number, headlineSize: number}` | (structural only, `logo` is a path an author must keep valid) |
| `cuts` | `{default, accent}`, each a transition name | `core/transitions/catalog.js` `TRANSITIONS` (anim + cut + sting + seam, one merged catalog) |
| `field` | `{grain, vignette}`, each a number | (structural only) |

Every field is optional; a theme with no `look` behaves exactly as it did before this existed. Writing
one key does not require the others: a theme can fix only `backdrop` and leave scale/layout/cuts
undecided.

**`backdrop` is a scaffold-only authoring hint, and the engine deliberately does not read it.** `make
scaffold TYPE=<type> THEME=<name>` seeds a new film's `bg[]` from it (see "How the scaffold uses it"
below), but nothing at render time falls back to `theme.look.backdrop`: `bg` is a REQUIRED authoring
field (`core/engine/produce.js:14-16`), written precisely so the engine can never again pick the
backdrop for an author. `docs/MISTAKES.md` #159 is that exact mistake by name: "the engine PICKED the
background, so nobody ever designed one." Wiring `look.backdrop` as a render-time fallback would
reopen that hole under a new name; the next author who reaches for it should find this paragraph
instead of rebuilding it.

### `bgDefault` can now be a ROTATION, not only a single backdrop

Measured across `formats/scene/`: 85 of 119 films (71%) paint exactly one `bg` window for the whole
runtime, however many times the film cuts. That is not the mistake `backdrop` above guards against: an
author who writes `bg:[{use:"theme"}]` has already asked for the theme's own backdrop, the same
explicit door `bgDefault` opened as a single spec. `theme.bgDefault` now accepts an ARRAY of specs (a
rotation) as well as the single object it always could:

```json
"bgDefault": [
  { "preset": "paper" },
  { "preset": "dark" },
  { "preset": "accent" }
]
```

On a film whose single `bg` window is `{use:"theme"}` with no `from`/`to` of its own, and whose theme
declares a `bgDefault` array of 2+ specs, `core/backgrounds/theme-rotation.js`'s `expandThemeRotation`
turns that one window into one per shot (`shotWindows`, `core/timeline/junctions.js`), cycling the
rotation in order. A film with no joints stays one shot: there is nowhere for a second window to live,
which is a true answer, not a fallback. A film that authors its own `bg` windows (any count, any
`from`/`to`) is untouched, and a theme with a single-object `bgDefault` behaves exactly as before.

This is NOT `look.backdrop` reopened under a new name. `look.backdrop` stays scaffold-only and is still
never read at render; the rotation lives on the field already read at render (`bgDefault`), and only
fires when the author already wrote the opt-in the engine has always honoured.

`look` used to carry an eighth key, `cues`: a fixed per-theme list of audio cue names. It is gone.
`buildSfx` (`formats/scene/scene.js:1593-1602`) already derives every cue from the `CUT_CUE`/`SEAM_CUE`
tables in `core/audio/cues.js`, keyed on the transition actually used at each joint, so a fixed list
could never say which cue replaces which as a film's cut family changes beat to beat. It would have
been a second, disagreeing owner of a fact `buildSfx` already owns.

## Validation

`core/registry/theme-contract.js` exports `lookErrors(look, opts)`, the same injection shape as the existing
`themeErrors`: the lists it checks names against (`bgNames`, `transitionNames`) are handed
in rather than imported, so this file stays importable from both Node and the browser (`core/engine/boot.js`
loads `core/validate/validate.mjs`, which loads `theme-contract.js`, at render time). Both checks run at
every `validateTheme` call, browser and CLI alike: neither list requires a node-only import the way the
old `cues` check did.

## How the scaffold uses it

`make scaffold TYPE=<type> THEME=<name>` (`scripts/author/scaffold.mjs`) loads `themes/<name>.json`
once, at the top, and merges its `look` over everything the generic rotation / the type spine would
otherwise pick:

- **`backdrop` → `bg[]`**: one window per beat, cycling the theme's own preset list. Wins over an
  exemplar match (`--like`) and over the type spine's `bgPresets`.
- **`cuts` → `transitions[].fx`**: wins over the type spine's `cutFamily`.
- **`scale.hook` / `scale.headline` → the hook and payoff beats' `heroSize`**: `blueprints/beats.mjs`'s
  `kineticHook` and `statReveal` both take an optional `heroSize` (unchanged default if omitted), so a
  brand's hook/headline scale is real without every other caller of those two beats changing.
- **`scale.body` / `scale.caption` → the remaining beats' own size kwargs**: `cardCascade` (`heroSize`,
  the card body copy), `chipGrid` (`bodySize` for the chips, `captionSize` for the footer), `wordBlast`
  (`bodySize`), `screenDive` (`captionSize`), `kineticHook`/`statReveal` (`captionSize`, alongside their
  existing hook/headline `heroSize`), `containerFill` (`itemSize`), `listBuildRows` (`size`),
  `terminalReveal` (`bodySize` for the command, `captionSize` for the output lines), `verdictProof`
  (`bodySize` for the command, `captionSize` for the note), `logoLockup` (`bodySize` for the headline,
  `captionSize` for the sub) and `logoReveal` (`bodySize` for the wordmark, `captionSize` for the sub).
  Same shape as `scale.hook`/`scale.headline` above: an optional kwarg, current value as its default,
  so a brand with no scale opinion renders byte-identical.
- **`layout.margin` → `x`/`w` on every beat** except the three that name their own mark*/word* slots
  instead of a generic box (`logoLockup`, `ctaEnd`, `logoReveal`).

**Left undone, stated plainly rather than faked**: `recordedPan` has no text of its own (a bare
surface, riders are the caller's own layers), so there is nothing for `scale.body`/`scale.caption` to
reach; the keyed-track beats (`echoRing`, `scrollStory`, `focusRack`) still hardcode their own internal
type sizes. Wiring those (where they have one) is the same shape of change (an optional kwarg, current
value as its default) but touches more call sites than this slice covered.

## Seeing it: `make theme-sheet`

```
make theme-sheet THEME=vawe
```

Renders one scene that shows a headline on every `backdrop` window, names the `cuts` pair on screen,
and (when `marks.logo` resolves to a real file) holds the mark at both `headlineSize` and
`endCardSize` on the closing window. Writes `site/public/blocklib/themes/<name>/sheet.png` (a tiled
contact sheet, one frame per backdrop window) and `sheet.mp4`. Reuses
`scripts/gates/tile.mjs`'s `frameTile`/`tileGrid`/`tileBox`/`renderOf`, the exact machinery
`scripts/dev/preset-sheets.mjs` already uses for the six reference profiles, rather than a second
render-and-tile pipeline.

Refuses by name, rather than rendering a blank sheet, when the theme has no `look` at all.

## Where a theme's `look` lives today

`themes/vawe.json` (the real brand, derived from `site/app/globals.css`) and all six
`themes/presets/*.json` (the taste-anchor profiles: a24, apple, bloomberg, duolingo, nike, vercel)
carry one. `themes/default.json` and `themes/linear.json`/`themes/stripe.json` do not yet; a theme
with no `look` is not an error, it is a theme that has not been given one.

## The computed look, for the other 37

Only 1 of the 42 themes in the registry carries an authored `look`, so an engine default reading
`theme.look` alone would do nothing for nearly all of them, `themes/default.json` included. `computedLook(theme, { isLightBg })` and `resolveLook(theme,
opts)` (`core/registry/theme-contract.js`, beside `lookErrors`) close that gap: `resolveLook` returns
`{...computedLook(theme), ...(theme.look||{})}`, so an authored key always wins over the computed one,
key by key, and a theme that fixes only `backdrop` still gets a computed `scale`/`layout`/`cuts`/`field`
for the rest.

**`scale` and `cuts` are DERIVED, not constants.** A first cut of this function filled every theme
with `themes/vawe.json`'s own numbers, so a calm brand and a loud one computed the identical type
scale and the identical cuts. `scripts/gates/theme-look-spread.mjs` (`make theme-look-spread`) exists
because nothing caught that: it counts distinct values per derived key across every shipped theme and fails
by name if one collapses.

- `scale`: `hook ~= 55 + 1.12 * motion.enter` (regressed off the 7 hand-authored looks; the 7 numbers
  vawe/a24/apple/bloomberg/duolingo/nike/vercel already carried are within 7px of what the formula
  predicts). `headline`/`body`/`caption` stay a fixed proportion of `hook` (~0.70 / ~0.41 / ~0.27,
  again averaged off the same 7 and each within 0.03 of every one of them): that ratio is a genuine
  type-scale relationship, kept constant on purpose, not re-fit per theme.
- `cuts.default` reads `motion.durationScale` (the brand's ordinary pace: `whip` when faster than the
  house pace, up through `fade`/`dissolve`/`riseBlur` as it slows). `cuts.accent` reads `motion.bounce`
  (the brand's peak energy: `letterbox` near zero overshoot, up through `cinematicZoom`/`zoom`/`punch`
  as it climbs). Every name is a real `core/transitions/catalog.js` entry, so a bad tier boundary fails
  loud at `lookErrors` rather than shipping an unknown transition.
- `field` is unchanged: `isLightBg(theme.palette.bg)` decides `{grain:0,vignette:0}` vs
  `{grain:0.08,vignette:0.15}`, the same light-vs-dark split every authored look already used.
- `layout` STAYS a constant (`{anchor:"left", margin:160}`, `themes/vawe.json`'s own values), and says
  so where it is written: no field any theme carries (palette, type, motion, bg, bgDefault) correlates
  with anchor or margin across the 7 hand-authored looks, and margin is structurally a per-video canvas
  decision, not a brand one. Fitting a formula to 7 points with no real signal would be curve-fitting,
  not derivation.

`isLightBg` is handed in, not imported, the same injection shape `lookErrors` already uses for
`bgNames`/`transitionNames`, so `theme-contract.js` stays free of `core/motion/motion.js` and
importable from node and the browser both. `theme.motion` itself is optional (one shipped theme,
`themes/plinth-auto.json`, has none), so a missing field falls back to the same numbers
`core/motion/motion.js`'s own `DEFAULT_MOTION` uses, quoted rather than imported for the same purity
reason.

**Two keys stay uncomputed, on purpose:**

- **`backdrop` is never a computed default, and is never read at render time at all.** Which bg preset
  a film turns through is a taste decision, and the engine choosing it for an author is
  `docs/MISTAKES.md` #159 by name: `bg` is a required authoring field (`core/engine/produce.js:14-16`)
  precisely so this cannot happen again. `theme.bgDefault` remains the one engine-owned bg default;
  `computedLook` does not become a second one, and `look.backdrop` stays a `make scaffold` seed only.
- **`marks` needs a real logo path.** No theme-agnostic default exists (a made-up path 404s at render),
  so a theme with no `marks` stays without one until it declares its own.

(`cues` used to be a third uncomputed key. It is gone from `LOOK_KEYS` entirely: `buildSfx`
(`formats/scene/scene.js:1593-1602`) already derives every cue from the transition actually used at
each joint, so a fixed per-theme cue list was a second, disagreeing owner of the same fact rather than
something worth computing a default for.)

`scripts/author/scaffold.mjs` reads `computedLook(themeObj)` as its own last-resort fallback (in place
of the literal `{default:"fade",accent:"cinematicZoom"}` and `margin ?? 160` it used to hold as a second
copy), so the scaffold and the engine cannot drift on the same numbers the way two copies of
`scripts/lib/theme-bg.mjs`'s `bgBlock` once did. The scaffold's own priority is unchanged: an authored
`theme.look` still wins over the `--type` spine, which still wins over this house default.

`core/engine/produce.js`'s `produceBaseline(data, theme, frame, look)` now takes the resolved look as
its fourth argument, wired from `core/engine/boot.js` (theme resolved once, before `resolveCoords`, so
`resolveLook` runs early enough for anything downstream to read it). Nothing inside `produceBaseline`
reads `look` yet: this is plumbing only, and a later phase adds the defaults that actually consume it.
