---
when: you are about to convert another blocks/*.mjs family to html output, or wondering why one family still returns native layers
answers: "which of the 65 remaining factories are already html, which are real candidates for the next conversion pass, and which are deliberately native, with the reason"
group: look
---

# blocks/: which families are html, which are candidates, which stay native

The owner's decision is that everything in `blocks/` builds from HTML: one markup string, kit chrome
(`bg`/`border`/`radius`/`elevation`) carried as a LAYER PROP, and `parts` for a multi-item family's own
staggered children (`docs/CRAFT/HTML-FRAGMENTS.md`). `blocks/ui.mjs`, `blocks/app.mjs`,
`blocks/social.mjs` and `blocks/interact.mjs` are converted. This table is the census of everyone else,
so the next author extends the list instead of re-deriving it.

Counted by `export function` factory, not by file: 65 factories across `board.mjs`, `camera-chrome.mjs`,
`charts.mjs`, `codeanim.mjs`, `core.mjs`, `dev.mjs`, `diagram.mjs`, `geo.mjs`, `glass.mjs`, `sleek.mjs`,
`terminal-html.mjs`, `terminal-layers.mjs`, `vfx.mjs`. Two exports are excluded because they are not
blocks (`blocks/index.mjs`'s own `NOT_A_BLOCK`, with its reason): `codeanim.mjs`'s `palette` and
`diagram.mjs`'s `routeEdge`.

**27 already html · 27 convert candidates · 11 deliberately left native.**

## Already html (27)

| file | factory |
|---|---|
| camera-chrome.mjs | camcorderHud, scanGate |
| charts.mjs | barChart, lineChart, donutChart, stackedBar, gauge, progressRing |
| codeanim.mjs | codeTyping, codeHighlight, codeScroll, codeDiff, codeMorph, codeFlight |
| diagram.mjs | flowchart, nodeGraph |
| geo.mjs | usMapHex, worldMap, usMap, usMapBubble, usMapFlow |
| terminal-html.mjs | terminalHtml |
| vfx.mjs | textCursor, parallaxZoom, parallaxUnzoom, morphText, uiReveal3d |

## Convert candidates (27): native group/text, no children slot, no native-only mechanism

The next conversion pass, in the order a caller is most likely to want them (product chrome, then
frosted glass, then gradient cards):

| file | factory | why it converts cleanly |
|---|---|---|
| core.mjs | card | group+text, no data picture, no children slot |
| core.mjs | colorCycle | sequential top-level `text` layers, no native-only mechanism |
| core.mjs | stripeCard | group+text/box bars, plain chrome |
| core.mjs | quote | group+text |
| core.mjs | kpiRow | group+text on its string-value path (the `count`-value path stays native, see below) |
| core.mjs | comparison | group+text on its string-list form (the screen form is a container, see below) |
| core.mjs | captions | array of `text` layers, no chrome needed but convertible |
| core.mjs | pricingCard | group+text/ticks |
| dev.mjs | codeBlock | group+text lines, no native-only mechanism |
| dev.mjs | deploySuccess | group+text tiled-state glyphs |
| dev.mjs | diff | group+text |
| dev.mjs | fileTree | group+text rows |
| dev.mjs | logLines | group+text rows |
| dev.mjs | commitRow | group+text rows |
| glass.mjs | glassWidgets | group+`frost()` chrome; `glass` (backdrop-filter) works on an html layer too |
| glass.mjs | glassNotification | group+`frost()`, stacked cards |
| glass.mjs | glassMenu | group+`frost()`, icon rows |
| glass.mjs | glassHome | group+`frost()`, tile grid |
| glass.mjs | glassDock | group+`frost()`, magnify row |
| glass.mjs | glassControls | 2 of 3 panels are already html; the middle transport row is a native group |
| sleek.mjs | glassCard | group+gradient/text, `glass` prop transfers to html |
| sleek.mjs | meshPanel | group+gradient/text |
| sleek.mjs | spotlightCard | group+gradient/text |
| sleek.mjs | borderBeamCard | the panel half is group+text (candidate); its paired `type:'beam'` layer stays native regardless |
| sleek.mjs | grainOverlay | one `rect` with a data-uri background + blend mode; both work as html or as a layer prop |
| sleek.mjs | bento | pure composition of the four sleek factories above; converts once they do |
| vfx.mjs | redditPost | group+text, the same shape `tweetCard` was before its own conversion |

## Deliberately left as layers (11), with the reason

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

None of the 11 fall in the fourth sub-reason this table started with ("a data picture needing SVG/canvas
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
