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

**Preview the whole library:** `node scripts/blocks-catalog.mjs && make video D=formats/scene/_blocks-catalog.json`

**Gate a scene for value:** `make critique D=formats/scene/<file>.json` — flags placeholder words,
false claims (e.g. "22 shader stings" with no shader layer), static lists, illegible stings, lonely beats.

## Contract
- Every factory returns an **array** of layers (so a block can stagger its own sub-parts in time).
- `{x,y}` = top-left, absolute on the 1920×1080 stage. `{start,dur}` in seconds.
- Colours default to the Creed token set (`TOKENS`); every colour is overridable.
- Deterministic — no `Date`/random. Same props → same layers.

## Blocks

| Block | Use for | Key props |
|---|---|---|
| `card` | feature/capability tile — elevated white card, tinted panel, pill tags, CTA arrow | `title, desc, pills[], tint, cta` |
| `codeBlock` | a code card; `lines` = strings or `{text,color}` for syntax | `lines[], label, dark, size` |
| `terminal` | a command prompt + output (command decodes in) | `command, output[]` |
| `loadingBar` | a green fill that wipes L→R and lands `✓ done` | `w, fillDur, label, done` |
| `deploySuccess` | CI pipeline `Building→Deploying→Live` → green "Deployed to production" card (URL, Ready in 1.2s) | `url, w` |
| `browserFrame` | window chrome (traffic dots + URL bar); draw content on top | `url, w, h` |
| `pillRow` | a horizontal row of chip tags | `items[], fg, bg` |
| `statBig` | scale-contrast stat — huge animated count + tiny label | `to, from, unit, label, size` |
| `colorCycle` | one word cycling through hues (proof of "any colour" without colour everywhere) | `word, colors[], each` |
| `stripeCard` | a recognizably-Stripe payments card (Net volume, blurple bar chart + Pay button) | `w` |

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
`elevation ≥ 1` when present). Add a row above + a tile in `scripts/blocks-catalog.mjs`, then re-preview.
A block earns its place in the library only if it makes a beat *demonstrate* something — never a decorative shell.
