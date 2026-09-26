---
when: you are about to convert another blocks/*.mjs family to html output, or wondering why one family still returns native layers
answers: "which factories are already html, and which are deliberately native, with the reason"
group: look
---

# blocks/: which families are html, which stay native, and why

The owner's decision is that everything in `blocks/` builds from HTML: one markup string, kit chrome
(`bg`/`border`/`radius`/`elevation`) carried as a LAYER PROP, and `parts` for a multi-item family's own
staggered children (`engine-doctrine/CRAFT/HTML-FRAGMENTS.md`). `blocks/ui.mjs`, `blocks/app.mjs`,
`blocks/social.mjs`, `blocks/interact.mjs` were converted first; `core.mjs`, `dev.mjs`, `glass.mjs`,
`sleek.mjs` and `vfx.mjs` followed in the pass this table now reflects.

A later pass cut every block that was only a static styled HTML fragment with no mechanism beyond
markup an authoring script can write inline: `card`, `quote`, `pricingCard`, `stripeCard` (core.mjs),
`diff` (dev.mjs), `glassCard`, `meshPanel`, `spotlightCard`, `grainOverlay` (sleek.mjs), `redditPost`
(vfx.mjs), plus `profileCard`/`tweetCard` (social.mjs), `logoWall`/`badge`/`banner` (ui.mjs), and
`feedRow`/`listRow`/`settingsRow` (app.mjs, converted in the earlier pass, so never in this table's
count). `bento` (sleek.mjs) keeps its three cell looks as local, unexported helpers now that
`glassCard`/`meshPanel`/`spotlightCard` are gone.

Counted by `export function` factory, not by file: 55 factories across `board.mjs`, `camera-chrome.mjs`,
`charts.mjs`, `codeanim.mjs`, `core.mjs`, `dev.mjs`, `diagram.mjs`, `geo.mjs`, `glass.mjs`, `sleek.mjs`,
`terminal-html.mjs`, `terminal-layers.mjs`, `vfx.mjs`. Two exports are excluded because they are not
blocks (`blocks/index.mjs`'s own `NOT_A_BLOCK`, with its reason): `codeanim.mjs`'s `palette` and
`diagram.mjs`'s `routeEdge`.

**43 already html · 0 convert candidates left · 12 deliberately native.**

## Already html (43)

| file | factory |
|---|---|
| camera-chrome.mjs | camcorderHud, scanGate |
| charts.mjs | barChart, lineChart, donutChart, stackedBar, gauge, progressRing |
| codeanim.mjs | codeTyping, codeHighlight, codeScroll, codeDiff, codeMorph, codeFlight |
| diagram.mjs | flowchart, nodeGraph |
| geo.mjs | usMapHex, worldMap, usMap, usMapBubble, usMapFlow |
| terminal-html.mjs | terminalHtml |
| vfx.mjs | textCursor, parallaxZoom, parallaxUnzoom, morphText, uiReveal3d |
| core.mjs | colorCycle, kpiRow (hybrid, see below), comparison (string-list path only, see below), captions |
| dev.mjs | codeBlock, deploySuccess (success card only, see below), fileTree, logLines, commitRow |
| glass.mjs | glassWidgets, glassNotification, glassMenu, glassHome, glassControls |
| sleek.mjs | borderBeamCard (panel half; the paired `beam` layer stays native), bento (pure composition of `glassCell`/`meshCell`/`spotlightCell`, its own local helpers, not exported blocks) |

Four of these are not a flat "one factory, one markup string" and are worth naming so the next reader
does not mistake a partial conversion for an incomplete one:
- `kpiRow`: hybrid by design. An item with a numeric `to` still emits a native `type:'count'` layer
  plus a native label under it (no html counter exists, per `statBig`/`statCard` below); an item with a
  formatted `value` string is one `html` fragment. Both paths coexist in the same row.
- `comparison`: only the plain string-list path (`left`/`right` arrays) converted, to two `html`
  columns. The `leftScreen`/`rightScreen` path is untouched: it still calls the native `splitScreen`
  container, which hosts caller-supplied blocks and cannot become markup (see below).
- `deploySuccess`: the queued/running/done cascade is a tiled state machine over time (each step is a
  short-lived layer whose window IS the state), which would need a CSS clock to reproduce in one
  fragment, and CSS `animation`/`transition` are refused at boot. Only the final success card converted.
- `colorCycle` and `captions` were never single cards; each already emitted N independently-timed
  layers (one per hue step, one per caption line). They convert layer-by-layer: N `html` layers instead
  of N `text` layers, same shape, same timing.

## Deliberately native (12), with the reason

| file | factory | reason |
|---|---|---|
| core.mjs | splitScreen | **container**: resolves a caller-supplied `{block, props}` PANE via `blockFactory`, so its children are arbitrary scene layers, not markup this factory owns |
| core.mjs | screenSwap | **container**: same `pane()` resolver, its screens are arbitrary blocks |
| terminal-layers.mjs | terminalPro | **container / no-html-equivalent**: the file header states the design intent directly ("no `type:'html'` anywhere"), the deliberate all-native counterpart to `terminal-html.mjs`; also hosts a `type:'count'` child |
| dev.mjs | loadingBar | **continuous sweep on a native layer**: a `rect` fill already driven by `fillRight`'s `vars`/mask reveal, the same mechanism an html `parts:'widen'` reproduces elsewhere, just not moved yet |
| board.mjs | splitFlapBoard | **no-html-equivalent**: `split:'char'` + `preset:'flap'`, a native-text-only per-character mechanism |
| charts.mjs | statBig | **no-html-equivalent**: is a `type:'count'` layer, no html counter exists |
| charts.mjs | statCard | **no-html-equivalent**: hosts a `type:'count'` child |
| core.mjs | lowerThird | **no-html-equivalent** (partial): 2 of its 12 named variants (`underline`, `riseClip`) use `split`+`preset`, a native-text-only mechanism; kept as one native factory rather than forking the other 10 |
| core.mjs | searchEngine | **no-html-equivalent**: uses `type:'image'`, a `typing` (char-reveal) prop, and a `type:'cursor'` layer, three native-only mechanisms in one factory |
| dev.mjs | terminal | **no-html-equivalent**: `typing:cps`, the native char-reveal mechanism |
| dev.mjs | spinner | **no-html-equivalent**: is a `type:'lottie'` layer, no html equivalent |
| glass.mjs | glassDock | **gate dependency, found during the conversion pass**: `tests/registry/lib-test.registry.test.mjs` asserts every tile's corner is the same fraction of its own size off `dock.children[i].radius / .w`. Reverted to its original `group`+`box()` tiles. Its magnified-item label chip converted to html regardless (that one had no test dependency). |

None of the 12 fall in the fourth sub-reason this table started with ("a data picture needing SVG/canvas
primitives an html layer can't host"): every chart, gauge, ring, map and diagram in the "already html"
list already proves an `<svg>` fragment inside an `html` layer covers that case, so nothing here is left
native for that reason.

## Method

Classification is by what the factory returns and what mechanism it depends on, not by file name:
`type:'html'` at the top level → already; native `group`/`text`/`rect` with no children-slot and no
native-only prop (`type:'count'`, `type:'cursor'`, `type:'image'` as the mechanism itself, `typing`,
`split`+`preset`, `blockFactory`) → candidate; anything using one of those → left, with the mechanism
named. Re-run against `blocks/index.mjs`'s `FAMILY_MODULES` if a new family is added; this table is a
snapshot, not a generator.
