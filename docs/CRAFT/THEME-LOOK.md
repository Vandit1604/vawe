---
when: a theme should carry more than colours and fonts, or a scaffold keeps re-deciding the same thing per film
answers: "the `look` block's shape (backdrop/scale/layout/marks/cuts/cues/field) · how it is validated · how the scaffold merges it over the type spine · how to see it as a picture"
group: crosscutting
---

# THEME LOOK: the whole-film default a theme fixes

## AGENT SUMMARY

- `theme.look` (optional; `core/theme-contract.js`) fixes the things AGENTS.md names as re-decided per
  film: `backdrop` (bg preset rotation), `scale` (hook/headline/body/caption type sizes), `layout`
  (anchor + margin), `marks` (logo path + its two sizes), `cuts` (default/accent transition), `cues`
  (audio cue names), `field` (grain/vignette).
- Validated at load, same discipline as every other named vocabulary: an unknown `look` key, an
  unknown bg preset, or an unknown transition refuses with the near word (`core/validate.mjs`
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
  "cues": ["chime", "whoosh", "success"],
  "field": { "grain": 0, "vignette": 0 }
}
```

| Key | Shape | Checked against |
|---|---|---|
| `backdrop` | non-empty array of bg preset names | `core/backgrounds/index.js` `BG_NAMES` |
| `scale` | `{hook, headline, body, caption}`, each a number | (structural only, no registry) |
| `layout` | `{anchor: left\|center\|right, margin: number}` | `anchor` against a fixed enum |
| `marks` | `{logo: path, endCardSize: number, headlineSize: number}` | (structural only, `logo` is a path an author must keep valid) |
| `cuts` | `{default, accent}`, each a transition name | `core/transitions.js` `TRANSITIONS` (anim + cut + sting + seam, one merged catalog) |
| `cues` | non-empty array of audio cue names | `core/audio-kit.mjs` `CUES` (Node-only check, see below) |
| `field` | `{grain, vignette}`, each a number | (structural only) |

Every field is optional; a theme with no `look` behaves exactly as it did before this existed. Writing
one key does not require the others: a theme can fix only `backdrop` and leave scale/layout/cuts/cues
undecided.

## Validation, and why cues are checked in one place only

`core/theme-contract.js` exports `lookErrors(look, opts)`, the same injection shape as the existing
`themeErrors`: the lists it checks names against (`bgNames`, `transitionNames`, `cueNames`) are handed
in rather than imported, so this file stays importable from both Node and the browser (`core/boot.js`
loads `core/validate.mjs`, which loads `theme-contract.js`, at render time).

`core/audio-kit.mjs` (the source of real cue names) imports `node:fs` to bake `.wav` assets, so it
cannot be imported into anything the browser loads. That is why `cues` is checked in two places with
two different strictness levels:

- **`validateTheme` (browser + CLI, every render)**: checks `backdrop` and `cuts` against the live
  registries, skips the `cues` check (no `cueNames` handed in).
- **`make validate`'s CLI branch (Node only, `themes/*.json` pack check)**: checks all three, `cues`
  included, because it already dynamically imports `core/audio-kit.mjs` for the scene-level cue check
  (`core/validate.mjs`, look for `CUE_NAMES`).

So a bad cue name in a theme PACK is always caught by `make validate`; a bad cue name would only slip
past the browser's own theme check, which is why the CLI pass is the one that matters here.

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
- **`layout.margin` → `x`/`w` on every beat** except the three that name their own mark*/word* slots
  instead of a generic box (`logoLockup`, `ctaEnd`, `logoReveal`).
- **`cues`**: surfaced as a console note (`audio.auto` derives its cues from the cuts/stings actually
  used, not from a preference list, so `look.cues` is a reach-for-these-by-hand reference rather than
  something the scaffold writes into the scene).

**Left undone, stated plainly rather than faked**: `scale.body`/`scale.caption` and the rest of the
beat library (`cardCascade`, `chipGrid`, `wordBlast`, …) still hardcode their own internal type sizes.
Wiring a theme's full scale into every beat blueprint is the same shape of change as `heroSize` above
(an optional kwarg, current value as its default) but touches many more call sites; it is a natural
next slice of this same work, not done here because scaffold's own "keep it small" contract only
covers what a film was already re-deciding by hand for the hook and the payoff.

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
