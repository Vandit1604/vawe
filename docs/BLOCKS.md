---
when: "you want a ready-made composed block instead of stacking primitives by hand"
answers: "the block registry (`make catalog`) · the contract each block honours · what every block renders"
group: reference
---

# Block catalog — the taste library

`blocks/index.mjs` is our **vetted UI component library** for scenes (a registry, like shadcn but each
entry returns scene-layer JSON). Agent-authored beats regress to hollow (a word in a box, a static list,
an unbacked claim); the fix is to **compose from pre-approved blocks** instead of authoring structure from
scratch. Each factory is a pure function of props → an array of scene-layer JSON (absolute-positioned,
timed, animated) that is already tasteful.

**The registry is manifest-driven** (`blocks/catalog.mjs`): every named entry is a data row, so adding a
block = adding a row (+ a factory or a `variant` branch). `make catalog` auto-renders the whole arsenal to
paged sheets — browse it before authoring. Two kinds of name: bare (`card`) and namespaced `family.variant`
(`card.pricing`, `lineChart.area`) — a namespaced entry is the family with preset props you can still
override. See [`TASTE.md`](TASTE.md) for where blocks sit in the quality loop.

**Two ways to use them:**

**1. First-class in `scene.json`** (recommended) — author a `block` layer, then expand before render:

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

**Gate a scene for value:** `make critique D=formats/scene/<file>.json` — flags placeholder words,
false claims (e.g. "22 shader stings" with no shader layer), static lists, illegible stings, lonely beats.

## Contract
- Every factory returns an **array** of layers (so a block can stagger its own sub-parts in time).
- `{x,y}` = top-left, absolute on the 1920×1080 stage. `{start,dur}` in seconds.
- **Theme-aware:** `TOKENS` emit CSS vars (`var(--accent)`, `var(--card)`, …) + `color-mix()`, so the
  SAME block reskins to any brand theme. Multi-series charts default from a `SERIES` ramp derived from
  the theme. Preview under any brand: `make catalog THEME=<name>`. (Overridable per call; Stripe hexes in
  `stripeCard` stay literal on purpose.)
- Deterministic — no `Date`/random, var strings are static. Same props → same layers.

## Blocks

Auto-generated from `blocks/catalog.mjs` — run `make blocks-docs` after editing the manifest. Browse
them rendered with `make catalog`. `family.variant` names are the family with preset props (still overridable).

<!-- BLOCKS:START -->
_155 entries across 70 families._

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
| `loadingBar` | determinate fill wipes L→R, lands ✓ done |
| `deploySuccess` | CI cascade → green "Deployed to production" card |
| `browserFrame` | window chrome (traffic dots + URL bar) |
| `pillRow` | horizontal row of chip tags |
| `statBig` | scale-contrast stat — huge count + tiny label |
| `statBig.currency` | stat with a $ unit |
| `statBig.time` | stat, ms unit |
| `colorCycle` | one word cycling through hues |
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
| `searchEngine.home` | search home — wordmark + pill, query types in (keys click) |
| `searchEngine.results` | search results — ranked links, cursor clicks one |
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
<!-- BLOCKS:END -->

## Comps — reusable sub-compositions (instance a cluster many times/places)

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
untouched). Comps may contain blocks and other comps — expansion is recursive and cycle-guarded.
Like blocks, comps are **build-time sugar**: run `make expand D=<file>` → `<file>.expanded.json`,
then validate/render that. `make validate` errors on any un-expanded `block`/`comp` layer.

## Tokens
`TOKENS` exports the Creed palette + research-grounded brand hexes: `accent` terracotta `#C96442`,
`green` `#16A34A`/`greenBright` `#22C55E` (success/loading), `blurple` `#635BFF` + `stripeNavy`
`#0A2540` + `stripeTeal` `#3ECF8E` (Stripe rebuilds).

## Adding a block
Keep it a pure `(props) => layers[]`. Respect the schema (font size ≥ 18; layer fonts `sans|serif|mono`;
`elevation ≥ 1` when present). Add a row above + a tile in `scripts/site/blocks-catalog.mjs`, then re-preview.
A block earns its place in the library only if it makes a beat *demonstrate* something — never a decorative shell.
