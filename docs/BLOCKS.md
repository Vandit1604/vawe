---
when: "you want a ready-made composed block instead of stacking primitives by hand"
answers: "the block registry (`make catalog`) · the contract each block honours · what every block renders"
group: reference
---

# Block catalog: the taste library

`blocks/index.mjs` is our **vetted UI component library** for scenes (a registry, like shadcn but each
entry returns scene-layer JSON). Agent-authored beats regress to hollow (a word in a box, a static list,
an unbacked claim); the fix is to **compose from pre-approved blocks** instead of authoring structure from
scratch. Each factory is a pure function of props → an array of scene-layer JSON (absolute-positioned,
timed, animated) that is already tasteful.

**The registry is manifest-driven** (`blocks/catalog.mjs`): every named entry is a data row, so adding a
block = adding a row (+ a factory or a `variant` branch). `make catalog` auto-renders the whole arsenal to
paged sheets, browse it before authoring. Two kinds of name: bare (`card`) and namespaced `family.variant`
(`card.pricing`, `lineChart.area`): a namespaced entry is the family with preset props you can still
override. See [`TASTE.md`](TASTE.md) for where blocks sit in the quality loop.

**Two ways to use them:**

**1. First-class in `scene.json`** (recommended), author a `block` layer, then expand before render:

```json
{ "type": "block", "block": "stripeCard", "x": 1260, "y": 400, "w": 420, "start": 40, "dur": 3 }
```
```bash
make expand D=formats/scene/my.json     # → my.expanded.json with real layers
make video  D=formats/scene/my.expanded.json
```

**2. From an authoring/transform script:**

```js
import * as B from '../blocks/index.mjs';
const layers = [];
layers.push(...B.deploySuccess({ x: 700, y: 300, url: 'app.stripe.com', start: 46 }));
layers.push(...B.stripeCard({ x: 1200, y: 260, start: 40 }));
```

**Pick the best of N variants:** `make compare ARGS="a.json b.json c.json --at 3"` → a labeled sheet.

**Preview the whole library:** `make catalog` (auto-renders every entry to paged sheets).

**Gate a scene for value:** `make critique D=formats/scene/<file>.json`, flags placeholder words,
false claims (e.g. "22 shader stings" with no shader layer), static lists, illegible stings, lonely beats.

## Contract
- Every factory returns an **array** of layers (so a block can stagger its own sub-parts in time).
- `{x,y}` = top-left, absolute on the 1920×1080 stage. `{start,dur}` in seconds.
- **Theme-aware:** `TOKENS` emit CSS vars (`var(--accent)`, `var(--card)`, …) + `color-mix()`, so the
  SAME block reskins to any brand theme. Multi-series charts default from a `SERIES` ramp derived from
  the theme. Preview under any brand: `make catalog THEME=<name>`. (Overridable per call; Stripe hexes in
  `stripeCard` stay literal on purpose.)
- Deterministic: no `Date`/random, var strings are static. Same props → same layers.

## The option contract (`blocks/schema.mjs`)

Every one of the 70 families declares its options in a table, mirroring `core/lightfield/options.js`
key for key. A JS default is a value, not a contract: `w = 560` carries no floor, `color = SERIES[0]`
carries no "this is a colour rather than a string", `tone = 'info'` carries no list of the spellings
that paint. So no control panel could be built from a factory and no caller could be validated.

```js
import { SCHEMA, resolve } from './blocks/schema.mjs';

SCHEMA.barChart.h;                       // { kind: 'int', min: 130, max: 1080, def: 260 }
resolve('barChart', { h: 40 });          // throws: barChart.h must be between 130 and 1080
```

A rule is `{ kind, def, ...bounds }`. The kinds are lightfield's seven (`int` · `unit` · `num` ·
`hex` · `hexlist` · `enum` · `group`) plus seven the blocks needed: `str` · `bool` · `color` (a hex
**or** a theme expression like `var(--accent)`, which is what the library actually emits) · `list` ·
`row` · `oneOf` · `block` (a `{block, props}` pane descriptor).

Read the tables beside the factories they describe: `CHART_SCHEMAS`, `UI_SCHEMAS`, `DEV_SCHEMAS`,
`SOCIAL_SCHEMAS`, `APP_SCHEMAS`, `INTERACT_SCHEMAS`, `SLEEK_SCHEMAS`, `CORE_SCHEMAS`. `schema.mjs`
merges them into one `SCHEMA` map and owns the checker.

`x` · `y` · `start` · `dur` appear in **no** table. They are placement and timing the scene supplies,
never content an author dials, and `resolve` passes them through untouched.

**The gate:** `node scripts/gates/block-schema.mjs`. It reads the factory source, so a table cannot
drift from the code it describes: every catalog family has a table, every declared key is a parameter
the factory really destructures, every parameter is declared or listed in `OMIT` with a reason, every
`def` deep-equals the real default, and every example row in `blocks/catalog.mjs` passes its table.

## Blocks

Auto-generated from `blocks/catalog.mjs`, run `make blocks-docs` after editing the manifest. Browse
them rendered with `make catalog`. `family.variant` names are the family with preset props (still overridable).

<!-- BLOCKS:START -->
_188 entries across 100 families._

| Block | For |
|---|---|
| `card` | elevated card · tinted panel · pill tags · CTA arrow |
| `codeBlock` | code card; syntax-coloured lines |
| `codeBlock.light` | code card, light surface |
| `codeBlock.py` | code card, python |
| `codeBlock.midnight` | code theme · cool dark, blue-first cycling |
| `codeBlock.ember` | code theme · warm dark, amber and rose |
| `codeBlock.forest` | code theme · deep green, mossy accents |
| `codeBlock.ocean` | code theme · deep blue, cyan-led |
| `codeBlock.neon` | code theme · near-black, vivid signage hues |
| `codeBlock.paper` | code theme · warm light, print-ink syntax |
| `codeBlock.ink` | code theme · indigo dark, violet-blue syntax |
| `codeBlock.dusk` | code theme · plum dark, orchid and rose |
| `codeBlock.slate` | code theme · neutral dark, muted steel syntax |
| `codeBlock.aurora` | code theme · teal dark, mint and violet |
| `codeBlock.linen` | code theme · warm light, earthen syntax |
| `codeBlock.frost` | code theme · cool light, ice-blue syntax |
| `terminal` | command prompt; command types in, output answers after it |
| `terminal.git` | git command |
| `terminal.install` | install command |
| `terminal.build` | build output |
| `terminalPro` | a deploy terminal built from layer primitives: every line its own timed, measurable object |
| `terminalHtml` | the same terminal as one hand-authored surface: box gradient, per-token syntax colour, a caret on the reveal edge |
| `loadingBar` | determinate fill wipes L→R, lands ✓ done |
| `deploySuccess` | CI cascade → green "Deployed to production" card |
| `browserFrame` | window chrome (traffic dots + URL bar) |
| `pillRow` | horizontal row of chip tags |
| `statBig` | scale-contrast stat, huge count + tiny label |
| `statBig.currency` | stat with a $ unit |
| `statBig.time` | stat, ms unit |
| `colorCycle` | one word cycling through hues |
| `splitFlapBoard` | a mechanical departure board · a drum per character steps through the alphabet and lands |
| `splitFlapBoard.small` | the board at caption size, no header rail |
| `stripeCard` | recognizably-Stripe payments card |
| `barChart` | labeled bars scaled to max |
| `barChart.green` | bars in success green |
| `diff` | code diff card (+/- coloured) |
| `diff.config` | config diff |
| `quote` | pull quote + attribution |
| `quote.customer` | customer quote |
| `notification` | toast card (dot + title + body) |
| `notification.warn` | toast, amber accent |
| `notification.error` | toast, error |
| `notification.stack` | alerts that stack and expire, not one that sits |
| `kpiRow` | row of stat cells (value + label) |
| `kpiRow.money` | KPI row, currency |
| `kpiRow.time` | latency percentiles |
| `callout` | info/success/warn strip |
| `callout.info` | info strip (blurple) |
| `callout.warn` | warning strip (terracotta) |
| `comparison` | two columns (Before/After · Others/Us) |
| `comparison.beforeAfter` | Before / After columns |
| `comparison.screens` | before / after as two SCREENS, not two lists |
| `captions` | timed subtitle chips (bottom overlay) |
| `lineChart` | trend line in a hairline card |
| `lineChart.area` | trend line with area fill |
| `lineChart.down` | declining trend (red) |
| `donutChart` | ring segments + legend |
| `donutChart.two` | two-segment ring |
| `stackedBar` | multi-series stacked bars |
| `stackedBar.three` | three-series stack |
| `card.pricing` | plan · price · features · CTA |
| `card.pricing.free` | pricing, free tier |
| `card.pricing.team` | pricing, team tier |
| `card.stat` | boxed KPI with delta chip |
| `card.stat.down` | KPI card, negative delta |
| `card.stat.plain` | KPI card, no delta |
| `card.profile` | avatar · name · role |
| `fileTree` | indented file/folder tree |
| `logLines` | log stream (timestamp + level colour) |
| `logLines.light` | log stream on a light surface |
| `logLines.errors` | log stream with errors |
| `commitRow` | git history list |
| `phoneFrame` | phone shell (draw content on top) |
| `tabBar` | segmented control |
| `tabBar.four` | four-tab control |
| `tabBar.switch` | the selection SLIDES from one tab to another |
| `tabBar.icons` | app tab bar · icon over label, selection slides |
| `checklist` | checked / unchecked items |
| `checklist.todo` | checklist, all open |
| `checklist.done` | checklist, all complete |
| `table` | data table (header + rows) |
| `table.pricing` | table, pricing rows |
| `timeline` | vertical rail of events |
| `timeline.release` | release timeline |
| `stepFlow` | horizontal numbered steps |
| `stepFlow.start` | steps, at start |
| `stepFlow.done` | steps, all complete |
| `stepFlow.build` | the track TRAVELS · rings light and connectors fill in sequence |
| `kanban` | columns of cards |
| `kanban.two` | two-column board |
| `chatBubble` | a message thread |
| `chatBubble.support` | support thread |
| `tweetCard` | a post card + counts |
| `avatarStack` | overlapping avatars + overflow |
| `avatarStack.large` | larger avatar stack |
| `toast` | dark snackbar + action |
| `toast.error` | snackbar, error + retry |
| `toast.info` | snackbar, info |
| `toast.stack` | snackbars that stack and expire |
| `reactionBar` | reaction count pills |
| `reactionBar.love` | reactions (love set) |
| `logoWall` | grid of wordmarks / logos |
| `logoWall.four` | four logos, 2 cols |
| `badge` | CI-shield token (label · value) |
| `badge.version` | version badge |
| `badge.warn` | badge, warning |
| `badge.info` | badge, info |
| `badge.beta` | beta status badge |
| `gauge` | semicircular meter |
| `gauge.warn` | gauge, low (amber) |
| `gauge.full` | gauge, complete (green) |
| `progressRing` | circular progress + % label |
| `progressRing.done` | ring, 100% (green) |
| `progressRing.low` | ring, low (amber) |
| `banner` | accent announcement bar |
| `banner.info` | banner, info (blurple) |
| `banner.warn` | banner, warning (amber) |
| `spinner` | looping Lottie (deterministic) |
| `spinner.small` | small looping Lottie |
| `lowerThird.cleanBar` | hairline plate · name over role · the quiet one |
| `lowerThird.boldBlock` | name reversed out of a solid accent block |
| `lowerThird.bild` | tabloid front page · caps, reversed, loud |
| `lowerThird.darkCard` | dark card · the one that survives bright photography |
| `lowerThird.sideRule` | thick accent rule, no plate · needs a calm backdrop |
| `lowerThird.kickerName` | mono kicker above, big name below |
| `lowerThird.accentUnderline` | underline draws under the name (kinetic) |
| `lowerThird.maskReveal` | name rises out of a clipped baseline, word by word |
| `lowerThird.softPill` | soft accent pill · product tours, not news |
| `lowerThird.colourBlock` | two offset blocks, ink then accent |
| `lowerThird.stackBars` | plate over a short accent bar · reads as a mark |
| `lowerThird.newsTicker` | accent chip + line · role IS the chip (LIVE/BREAKING) |
| `nowPlaying` | music-player card · artwork, progress, transport |
| `videoLowerThird` | creator lower third · avatar, subs, red CTA |
| `followCard` | name over handle, pill CTA |
| `searchEngine.home` | search home. Wordmark + pill, query types in (keys click) |
| `searchEngine.results` | search results, ranked links, cursor clicks one |
| `feedRow` | feed item · avatar, name, timestamp, body |
| `listRow` | generic list item · icon tile, title over sub, trailing detail |
| `settingsRow` | settings row · label + toggle, chevron or value |
| `profileHeader` | account header · avatar over name, handle, stat row |
| `onboardCard` | onboarding pane · progress dots, title, body, CTA |
| `emptyState` | zero state · icon tile, what is missing, the action that fills it |
| `pointer` | mouse pointer · travels to a target and clicks it (ripple) |
| `tapRipple` | touch tap · contact dot and an expanding ring, for phone demos |
| `keyboard` | phone keyboard · qwerty keys, rises up into frame |
| `keyboard.numeric` | phone keypad · numeric grid, rises up into frame |
| `pressButton` | CTA that depresses and releases when it is clicked |
| `splitScreen` | two panes, one geometry · second pane lands behind the first |
| `splitScreen.pip` | picture-in-picture · an aside inset over the subject |
| `screenSwap` | screen A becomes screen B in place (wipe, no travel) |
| `screenSwap.slide` | screen change that reads as travel · enters right, leaves left |
| `socialProof` | avatar stack + the line it proves (caption owned by the block) |
| `installCard` | app-store row · stars sweep to the rating, then install |
| `glassCard` | frosted glass panel (blurs the moving bg behind it) + sheen |
| `meshPanel` | soft mesh-gradient surface (stacked accent blobs) |
| `spotlightCard` | dark card with a soft spotlight glow washing from a corner |
| `borderBeamCard` | glass card with a light TRAVELLING its border (animated beam) |
| `grainOverlay` | fine film-grain texture over the frame (feTurbulence) |
| `bento` | asymmetric bento grid: one hero cell + supporting cells (scale contrast) |
| `camcorderHud` | viewfinder OSD: corner brackets, a blinking REC lamp, a running timecode, battery + zoom |
| `scanGate` | autofocus gate: a band travels the frame, the brackets contract onto the target and lock |
| `flowchart` | landscape decision flow · nodes pop in, connectors draw on in order, yes/no ride the edges |
| `flowchart.vertical` | the same flow turned 90 degrees for a phone feed · cols run down, lanes across, type raised to the portrait floor |
| `nodeGraph` | non-hierarchical graph · author-placed nodes, routed edges, one node lit |
| `glassWidgets` | frosted widget cluster: one big showcase panel + small stat tiles + chips (scale contrast, not a grid) |
| `glassNotification` | frosted alerts fly in from the right and stack, each card narrower than the one above it |
| `glassMenu` | frosted command panel: icon column, rows, separators, one row lit with the accent |
| `glassControls` | frosted media panels SPREAD out of one collapsed point: scrubber, transport, level meter |
| `glassHome` | frosted launcher grid led by one wide widget tile; tiles arrive on the diagonal |
| `glassDock` | floating frosted dock strip with one item magnified, its neighbours swelling toward it |
| `codeTyping` | live coding: one character frontier crosses the snippet, the caret riding it |
| `codeHighlight` | a band sweeps down to one line while the context dims out of the way |
| `codeScroll` | a viewport onto a long file: it scrolls until the target line centres, then lights it |
| `codeDiff` | the edit PERFORMED: removals collapse red, additions expand green, in edit order |
| `codeMorph` | a refactor as a transformation: shared tokens glide, the rest fade out and in |
| `codeFlight` | discrete snippets fly in from alternating sides and assemble into one program |
| `usMapHex` | US hex cartogram: every state the same size, so the reading is the value not the acreage |
| `usMap` | US choropleth by state (Albers USA, AK/HI inset) with value labels + a gradient legend |
| `worldMap` | world choropleth by ISO alpha-3 (Natural Earth I), data countries arrive over a live base map |
| `usMapBubble` | proportional circles at city coordinates (AREA is the value) with name + value callouts |
| `usMapFlow` | origin to destination arcs that DRAW ON, stroke weight by volume, one hub node called out |
| `textCursor` | a caret that bleeds light: an accent glow on the cell, a red/cyan fringe on the type converging as the line settles |
| `textCursor.bar` | the same treatment with a thin vertical rule instead of a filled cell |
| `parallaxZoom` | one card eats the frame: the centre cell scales to fill the board while its eight neighbours travel outward and dim |
| `parallaxUnzoom` | the same board run backwards: the hero starts filling the frame and retreats into its cell as the ring arrives |
| `morphText` | a gooey word cycle: each word melts into the next through a metaball filter, no letter correspondence |
| `redditPost` | a link-aggregator post: the vote rail left of the title, subreddit line, body, comment count |
| `uiReveal3d` | UI rows folding up out of depth: each hinges at its top edge in real perspective, one after another |
<!-- BLOCKS:END -->

## Comps: reusable sub-compositions (instance a cluster many times/places)

A **block** is a library factory (shared across films). A **comp** is a cluster you define once inside
*this* scene and instance repeatedly. Define them under a top-level `comps` map (each entry is
`{ "layers": [...] }` authored relative to origin `0,0`), then place with a `comp` layer:

```json
"comps": {
  "stat": { "layers": [
    { "type": "text", "text": "99.9%", "x": 0, "y": 0,  "size": 80, "start": 0,   "duration": 3.5, "anim": "rise" },
    { "type": "text", "text": "uptime", "x": 0, "y": 96, "size": 28, "start": 0.2, "duration": 3.3, "anim": "rise" }
  ] }
},
"layers": [
  { "type": "comp", "ref": "stat", "x": 240,  "y": 460, "start": 0.3 },
  { "type": "comp", "ref": "stat", "x": 1180, "y": 460, "start": 0.9 }
]
```

The instance's `x/y/start` **offset** every layer in the comp (group children flow, so they're
untouched). Comps may contain blocks and other comps, expansion is recursive and cycle-guarded.
Like blocks, comps are **build-time sugar**: run `make expand D=<file>` → `<file>.expanded.json`,
then validate/render that. `make validate` errors on any un-expanded `block`/`comp` layer.

## Tokens
`TOKENS` exports the Creed palette + research-grounded brand hexes: `accent` terracotta `#C96442`,
`green` `#16A34A`/`greenBright` `#22C55E` (success/loading), `blurple` `#635BFF` + `stripeNavy`
`#0A2540` + `stripeTeal` `#3ECF8E` (Stripe rebuilds).

## Adding a block
Keep it a pure `(props) => layers[]`. Respect the schema (font size ≥ 18; layer fonts `sans|serif|mono`;
`elevation ≥ 1` when present). Add a row above + a tile in `scripts/site/blocks-catalog.mjs`, then re-preview.
A block earns its place in the library only if it makes a beat *demonstrate* something, never a decorative shell.
