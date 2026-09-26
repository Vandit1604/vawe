---
when: "you want a ready-made composed block instead of stacking primitives by hand"
answers: "the block registry (`make site X=catalog`) · the contract each block honours · what every block renders"
group: reference
---

# Block catalog: the taste library

`blocks/index.mjs` is our **vetted UI component library** for scenes (a registry, like shadcn but each
entry returns scene-layer JSON). Agent-authored beats regress to hollow (a word in a box, a static list,
an unbacked claim); the fix is to **compose from pre-approved blocks** instead of authoring structure from
scratch. Each factory is a pure function of props → an array of scene-layer JSON (absolute-positioned,
timed, animated) that is already tasteful.

**The registry is manifest-driven** (`blocks/catalog.mjs`): every named entry is a data row, so adding a
block = adding a row (+ a factory or a `variant` branch). `make site X=catalog` auto-renders the whole arsenal to
paged sheets, browse it before authoring. Two kinds of name: bare (`card`) and namespaced `family.variant`
(`card.pricing`, `lineChart.area`): a namespaced entry is the family with preset props you can still
override. See [`TASTE.md`](TASTE.md) for where blocks sit in the quality loop.

**Two ways to use them:**

**1. First-class in `scene.json`** (recommended), author a `block` layer directly, it expands into real
layers at LOAD time (`core/engine/expand.js`), no separate step:

```json
{ "type": "block", "block": "stripeCard", "x": 1260, "y": 400, "w": 420, "start": 40, "dur": 3 }
```
```bash
make video D=films/scene/my.json
```

**2. From an authoring/transform script:**

```js
import * as B from '../blocks/index.mjs';
const layers = [];
layers.push(...B.deploySuccess({ x: 700, y: 300, url: 'app.stripe.com', start: 46 }));
layers.push(...B.stripeCard({ x: 1200, y: 260, start: 40 }));
```

**Pick the best of N variants:** `make compare ARGS="a.json b.json c.json --at 3"` → a labeled sheet.

**Preview the whole library:** `make site X=catalog` (auto-renders every entry to paged sheets).

**Gate a scene for value:** `make check GATE=critique D=films/scene/<file>.json`, flags placeholder words,
<!-- site-counts-allow: "22 shader stings" is a made-up on-screen claim in an example, not a count of the registry -->
false claims (e.g. "22 shader stings" with no shader layer), static lists, illegible stings, lonely beats.

## Contract
- Every factory returns an **array** of layers (so a block can stagger its own sub-parts in time).
- `{x,y}` = top-left, absolute on the 1920×1080 stage. `{start,dur}` in seconds.
- **Theme-aware:** `TOKENS` emit CSS vars (`var(--accent)`, `var(--card)`, …) + `color-mix()`, so the
  SAME block reskins to any brand theme. Multi-series charts default from a `SERIES` ramp derived from
  the theme. Preview under any brand: `make site X=catalog THEME=<name>`. (Overridable per call; Stripe hexes in
  `stripeCard` stay literal on purpose.)
- Deterministic: no `Date`/random, var strings are static. Same props → same layers.

## The option contract (`blocks/schema.mjs`)

Every one of the 100 families declares its options in a table, mirroring `core/lightfield/options.js`
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

**The gate:** `node quality/gates/block-schema.mjs`. It reads the factory source, so a table cannot
drift from the code it describes: every catalog family has a table, every declared key is a parameter
the factory really destructures, every parameter is declared or listed in `OMIT` with a reason, every
`def` deep-equals the real default, and every example row in `blocks/catalog.mjs` passes its table.

## Blocks

Auto-generated from `blocks/catalog.mjs`, run `make site X=blocks-docs` after editing the manifest. Browse
them rendered with `make site X=catalog`. `family.variant` names are the family with preset props (still overridable).

<!-- BLOCKS:START -->
_159 entries across 82 families._

| Block | For |
|---|---|
| `codeBlock` | a code snippet card: lines of code write themselves in one by one, syntax-coloured, like a syntax-highlighted editor screenshot |
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
| `terminal` | a terminal window: a shell command types itself in character by character, then its output prints below |
| `terminal.git` | git command |
| `terminal.install` | install command |
| `terminal.build` | build output |
| `terminalPro` | a full deploy terminal built from real boxes: typed command, a live percent counter over its track, a file diff, a spinner turning into a checkmark |
| `terminalHtml` | the same deploy terminal as one hand-drawn console surface: gradient glass, per-word command colouring, a blinking text cursor |
| `loadingBar` | a progress bar: a track fills left to right to a set percent and finishes with a green done checkmark |
| `deploySuccess` | a CI/CD pipeline status: build steps queue then run then check off, ending on a green deployed card with the live URL |
| `browserFrame` | a fake browser window: traffic-light dots and a URL bar framing a screenshot or any content drawn inside it. |
| `pillRow` | a horizontal row of rounded chip tags, for labels, filters, or categories side by side. |
| `statBig` | one huge number with a tiny label under it, for a single headline stat or KPI callout |
| `statBig.currency` | stat with a $ unit |
| `statBig.time` | stat, ms unit |
| `colorCycle` | one word that changes colour again and again, repainted through a rainbow of hues in a fixed order |
| `splitFlapBoard` | an airport or train station split-flap departure board where each letter flips through the alphabet to land on a word |
| `splitFlapBoard.small` | the board at caption size, no header rail |
| `barChart` | a bar chart: labeled vertical bars scaled to the tallest one, for comparing values side by side |
| `barChart.green` | bars in success green |
| `notification` | a light system alert card that slides in from the edge, a status dot, a heading and a message, arrives and leaves like a phone banner. |
| `notification.warn` | toast, amber accent |
| `notification.error` | toast, error |
| `notification.stack` | alerts that stack and expire, not one that sits |
| `kpiRow` | a row of numbers side by side, each with a small label under it, and the numbers count up |
| `kpiRow.money` | KPI row, currency |
| `kpiRow.time` | latency percentiles |
| `callout` | a coloured info, success, or warning strip with a solid left bar and one line of text, for a note inline in a page. |
| `callout.info` | info strip (blurple) |
| `callout.warn` | warning strip (terracotta) |
| `comparison` | before and after, or us versus them, shown as two columns of bullet points side by side |
| `comparison.beforeAfter` | Before / After columns |
| `comparison.screens` | before / after as two SCREENS, not two lists |
| `captions` | subtitles at the bottom of the screen, timed to appear line by line like closed captions |
| `lineChart` | a line graph over time: a trend line in a hairline card, optionally filled to an area chart |
| `lineChart.area` | trend line with area fill |
| `lineChart.down` | declining trend (red) |
| `donutChart` | a pie chart drawn as a ring: coloured segments of a whole plus a legend of labels |
| `donutChart.two` | two-segment ring |
| `stackedBar` | a stacked bar chart: multiple series piled in one bar per category to show a total and its parts |
| `stackedBar.three` | three-series stack |
| `card.stat` | a boxed metric: a label, a number counting up, and a delta chip only when you pass one |
| `card.stat.down` | KPI card, negative delta |
| `card.stat.plain` | KPI card, no delta |
| `fileTree` | a project file explorer: an indented list of folders and files, rows expanding in top to bottom like a sidebar |
| `logLines` | a console log feed: timestamped lines stream in fast, colour-coded by info, warning and error level |
| `logLines.light` | log stream on a light surface |
| `logLines.errors` | log stream with errors |
| `commitRow` | a git commit history list: hash, message, author and time per row, like a GitHub commits page |
| `phoneFrame` | a phone shaped shell: dark bezel, notch, status clock, screen area to draw your app content into for a mobile mockup. |
| `tabBar` | a row of tabs or a segmented control whose selected pill actually slides from one tab to another. |
| `tabBar.four` | four-tab control |
| `tabBar.switch` | the selection SLIDES from one tab to another |
| `tabBar.icons` | app tab bar · icon over label, selection slides |
| `checklist` | a checklist of items with checkboxes ticking off one by one, done rows dim to read as completed. |
| `checklist.todo` | checklist, all open |
| `checklist.done` | checklist, all complete |
| `table` | a table of rows and columns: a header plus data rows divided by hairlines, rows fill in one after another. |
| `table.pricing` | table, pricing rows |
| `timeline` | a vertical rail of dated events with dots and a connecting line, each entry lands beside its dot in sequence. |
| `timeline.release` | dated shipping milestones down a rail, for a changelog or a roadmap |
| `stepFlow` | a horizontal row of numbered steps with connectors that fill in as progress moves from one step to the next. |
| `stepFlow.start` | steps, at start |
| `stepFlow.done` | steps, all complete |
| `stepFlow.build` | the track TRAVELS · rings light and connectors fill in sequence |
| `kanban` | a kanban board: columns of small cards dealt in reading order, for a task board or pipeline view. |
| `kanban.two` | two-column board |
| `chatBubble` | a text message thread, chat bubbles left and right like iMessage or WhatsApp |
| `chatBubble.support` | support thread |
| `avatarStack` | overlapping circular profile pictures in a row with a +N overflow count |
| `avatarStack.large` | the same overlapping profile pictures at a bigger size, for a hero or a title card |
| `toast` | a dark snackbar with a status dot, a message, and an optional action link, the popup that says something just happened. |
| `toast.error` | snackbar, error + retry |
| `toast.info` | snackbar, info |
| `toast.stack` | snackbars that stack and expire |
| `reactionBar` | emoji reaction pills with counts, like the reactions under a Slack or Discord message |
| `reactionBar.love` | reactions (love set) |
| `gauge` | a speedometer-style dial: a semicircular meter needle showing one value against a max |
| `gauge.warn` | gauge, low (amber) |
| `gauge.full` | gauge, complete (green) |
| `progressRing` | a circular progress ring with the percent complete written in its centre |
| `progressRing.done` | ring, 100% (green) |
| `progressRing.low` | ring, low (amber) |
| `spinner` | a small looping loading spinner animation for a busy or working state |
| `spinner.small` | small looping Lottie |
| `lowerThird.cleanBar` | a name plate low in the frame: the speaker's name over their job title, on a hairline plate |
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
| `nowPlaying` | a music player card: album artwork, a scrubbing progress bar, and play/skip transport controls |
| `videoLowerThird` | a YouTube-style creator lower third: avatar, subscriber count, and a red subscribe CTA |
| `followCard` | a social profile follow card: name over @handle next to a follow button pill |
| `searchEngine.home` | a search engine home page: a wordmark over a rounded search box, the query typing itself in |
| `searchEngine.results` | the search results page: a ranked list of links, with a cursor clicking one |
| `profileHeader` | the top of an account screen: avatar over a name and @handle, with a small row of stat counts below. |
| `onboardCard` | one pane of a first-run onboarding flow: progress dots, a title, body copy, and a CTA button. |
| `emptyState` | a zero state panel with dashed border: an icon, a line saying what is missing, and a button that fills it. |
| `pointer` | a mouse cursor that travels across the screen to a target and clicks it, with a click ripple. |
| `tapRipple` | a finger tap on a touchscreen: a contact dot and an expanding ring at the point touched, for phone demos. |
| `keyboard` | an on-screen phone keyboard, qwerty keys or a numeric keypad, that slides up from the bottom edge. |
| `keyboard.numeric` | phone keypad · numeric grid, rises up into frame |
| `pressButton` | a CTA button that visibly depresses and springs back when clicked, the payoff for a pointer tap on a button. |
| `splitScreen` | the screen divided into two side-by-side panes, or a small inset video in the corner like picture-in-picture |
| `splitScreen.pip` | picture-in-picture · an aside inset over the subject |
| `screenSwap` | one app screen replaces another in the same spot, either a wipe or a slide, like swiping between phone screens |
| `screenSwap.slide` | screen change that reads as travel · enters right, leaves left |
| `socialProof` | an avatar stack next to a trust line, like Trusted by 8,000 teams, for social proof |
| `installCard` | an app store listing row: icon, star rating that sweeps in, and an Install button |
| `borderBeamCard` | a glass card with a bright line of light chasing around its border, like a loading ring on the edge |
| `bento` | an asymmetric grid of boxes in different sizes, one big hero box and smaller ones around it, like a bento box or an Apple feature grid |
| `camcorderHud` | a camcorder or viewfinder overlay: corner brackets, a blinking REC dot, a running timecode, battery and zoom readout |
| `scanGate` | an autofocus targeting reticle: a scan line sweeps the frame and brackets snap shut and lock onto the subject |
| `flowchart` | a flowchart: boxes connected by lines that draw themselves on, with yes/no labels on the branches |
| `flowchart.vertical` | the same flow turned 90 degrees for a phone feed · cols run down, lanes across, type raised to the portrait floor |
| `nodeGraph` | a network diagram of nodes and connecting edges, not a top-down tree, with one node highlighted |
| `glassWidgets` | a cluster of frosted iOS-style widgets: one big showcase panel plus small stat tiles and chips |
| `glassNotification` | frosted push notifications sliding in from the side and stacking up, like a phone lock screen |
| `glassMenu` | a frosted right-click or context menu: icon column, list of rows, one row highlighted |
| `glassControls` | a frosted media player bar: scrubber, play and transport buttons, a volume or level meter |
| `glassHome` | a frosted phone home screen: a grid of app icon tiles plus one wide widget |
| `glassDock` | a floating frosted taskbar or dock strip where the icon under the cursor grows bigger, like the macOS dock |
| `codeTyping` | code being typed live in an editor: a text cursor runs across the snippet revealing one character at a time |
| `codeHighlight` | a code editor spotlight: the surrounding lines dim while a highlighted band sweeps down onto one target line |
| `codeScroll` | an editor auto-scrolling through a long file until the target line reaches the middle and lights up |
| `codeDiff` | a code edit replayed as it happened: the old line collapses away in red while the new line types in green |
| `codeMorph` | a code refactor shown as a shape-shift: shared words glide into their new position while the rest fades out and in |
| `codeFlight` | separate code snippets fly in from opposite sides of the screen and snap together into one finished file |
| `usMapHex` | a hex map of the United States: every state drawn as one same-size hexagon so colour reads value, not land area |
| `usMap` | a map of the United States coloured state by state, a choropleth with a legend and value labels per state |
| `worldMap` | a world map coloured country by country, a global choropleth with a legend for the data shown |
| `usMapBubble` | a map of the United States with circles sized by value at each city, a proportional bubble map |
| `usMapFlow` | a map of the United States with arrows drawn between cities showing flow or movement from an origin to destinations |
| `textCursor` | a blinking text cursor typing a word, with a glowing red/cyan light-fringe on the letters as it lands |
| `textCursor.bar` | the same treatment with a thin vertical rule instead of a filled cell |
| `parallaxZoom` | a grid of cards where the centre card zooms to fill the whole frame while the rest slide outward and fade |
| `parallaxUnzoom` | the reverse of a zoom-in: one card fills the frame first, then shrinks back into a grid of cards around it |
| `morphText` | a gooey word swap: one word melting into the next through a metaball blur, letters with no correspondence |
| `uiReveal3d` | rows of a UI folding upright out of the floor in 3D perspective, one after another |
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
Like blocks, comps are **build-time sugar**, expanded at LOAD time (`core/engine/expand.js`); validate and
render the source file directly, no separate step. `make expand D=<file>` still exists to print the
expanded JSON to stdout when you want to see what a comp becomes.

## Tokens
`TOKENS` exports the Creed palette + research-grounded brand hexes: `accent` terracotta `#C96442`,
`green` `#16A34A`/`greenBright` `#22C55E` (success/loading), `blurple` `#635BFF` + `stripeNavy`
`#0A2540` + `stripeTeal` `#3ECF8E` (Stripe rebuilds).

## Adding a block
Keep it a pure `(props) => layers[]`. Respect the schema (font size ≥ 18; layer fonts `sans|serif|mono`;
`elevation ≥ 1` when present). Add a row above + a tile in `scripts/site/blocks-catalog.mjs`, then re-preview.
A block earns its place in the library only if it makes a beat *demonstrate* something, never a decorative shell.
