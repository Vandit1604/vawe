# CLAUDE.md — authoring videos for this engine

This repo turns **one self-describing JSON → one rendered video** (30fps mp4, portrait 1080×1920 or
landscape 1920×1080). There is exactly **one module: `scene`** — an open canvas of composable
primitives (text · image · component · rect · group · glow + camera · cuts · stings · captions). **No
templates.** You do not pour data into a canned layout; you compose each video from the vocabulary in
`docs/PRIMITIVES.md`. Your job when asked to "make a video about X" is to **write a scene JSON**
(and capture the real assets it needs), then render it. You do **not** edit `scene.html` or the Go
renderer unless explicitly asked.

> **Reflecting a brand/website?** `make sections` + `make palette` (eyedrop) builds the colours pack + fonts +
> favicon; `make sections URL=… NAME=…` inventories every real section to reflect. Design knowledge
> lives in **`docs/DESIGN-DATABASE.md`**; the primitive vocabulary in **`docs/PRIMITIVES.md`**; motion
> rules in **`docs/MOTION-CRAFT.md`**. **Use ONLY the site's colours** and respect dominance
> (white-first vs dark).

## The loop

```bash
make list                              # shows the scene module + its schema/sample
./bin/vawe path/to/video.json     # module read from JSON → out/<name>.mp4
make video D=path/to/video.json        # same, via make   (add --draft to bin/vawe for fast no-grain)
```

Every JSON **must** start with `"module": "scene"`. Save new videos as
`formats/scene/<topic>.json` (siblings of `sample.json`). Always read `sample.json` and an existing
video (e.g. `linear-30.json`) first as working references, then compose — never copy a structure wholesale
(that would re-introduce a template; the ledger flags it).

> **Making something good?** Read **[`docs/TASTE.md`](docs/TASTE.md)** first — the front door to the
> taste system (house-style · composition · motion · story-spine), the block registry (`make catalog`),
> and the author→gate→render quality loop. Everything below is the doctrine it indexes.

## Content philosophy (what makes these good — follow it)

Every video is built on **hook → suspense → payoff**. The data must earn attention:

- **Never spoil the payoff.** The hook poses a question / open loop; the answer lands at the end.
- **Build to a shocker.** Order beats so the most counterintuitive, "no way" moment is last.
- **Be honest.** The on-screen copy must be true. No clickbait the video can't pay off.
- **Stakes + a human line.** A surprising, specific fact beats a dry number.
- **Numbers:** use real, accurate figures. The `count` layer compacts ≥1e6 (`2500000000` → `2.5B`);
  use a unit suffix for small numbers (`unit: "$B"`, value `880` → `$880B`).

## Hard rules
- **No em-dashes (—) in any on-screen text** — the validator rejects them. Use a comma, period, or ·.
- First-frame hook ≤ ~12 words, front-load the strong word, ≤ 1 emoji.
- Text may contain `<b>…</b>` / `<em>…</em>` (rendered as HTML). Keep names short (they sit in cards).

## Reflecting a real website (capture-first — the taste is already on the page)

Never rewrite a site's sections by hand; you'll lose its taste and ignore half its assets. Instead:
1. `make sections URL=… NAME=<brand>` — inventory every section (screenshot each + `sections.json`
   with a stable selector + a ready `make capture` command per block). **Look at the shots.**
2. Storyboard **one beat per section, in the site's order.** `make capture` the real block → a crisp,
   live `component` (target the UI cluster, e.g. `SEL='section:nth-of-type(2) [class*=illustration]'`,
   so there's no duplicate headline over your kinetic one). Real logos, gradients, copy come free.
   Only a true `<canvas>`/WebGL section can't DOM-capture → then use the section screenshot as a clipped
   `image` layer with `ken`. Animate it OUR way (window / cut / camera / staggered parts); re-type copy
   with an overlaid `type` layer, never by editing captured glyphs (purity + font faithfulness).
   Preview any capture standalone first: `make preview HTML=<component>.json THEME=<brand>`.
3. Hand-write HTML **only** for connective tissue — hook, CTA, counters. Preview every hand fragment
   before rendering: `make preview HTML=frag.html THEME=<brand>` → `/tmp/preview.png` (Read it, fix, repeat).

## Hand-writing HTML? Beat the AI slop (see `AGENTS.md`)

Hand-authored HTML regresses to the mean — centered text, Inter, blue/purple gradient, equal card grid.
Before writing any by hand, **load the relevant [`docs/CRAFT/`](docs/CRAFT/README.md) guide** (how to choose
a face / palette / layout / image), then the **`taste-skill`** (state the Design Read + set VARIANCE/MOTION/
DENSITY dials, obey Anti-Default Discipline), then **`impeccable`** for craft. Skills are vendored in `.claude/skills/`.
Defaults to reach past: **asymmetry over centered · scale contrast (one huge hero + tiny caption) · a
committed non-generic face** (the real brand font when reflecting a brand; never Inter/Space Grotesk for
anything generic). Then gate it: **`make slop D=<file>`** runs the impeccable detector (41 rules, no LLM) —
it must be clean before you render.

## Icons & images (real assets first, emoji last)

**Always prefer a real image.** Order of preference:
1. **Captured real UI** — `make capture` (a live component) is the highest-taste source.
2. **Free/openly-licensed images** — brand logos `curl https://cdn.simpleicons.org/<slug>/<hex>` →
   `assets/icons/`; flags `flagcdn.com/<iso2>.svg` → `assets/flags/`; CC0/CC-BY photos
   via `make photos` (attribution auto-recorded; CC-BY needs visible credit).
3. **Drawn icons** — `svgIcon(name)`. 4. **Generated cards** — `make assets`. 5. **Emoji** — last resort.

**Never embed copyrighted material** into a published video: movie/TV posters, album covers, film
stills, news photos, paid stock. They trigger Content ID claims. Capture the real product UI instead.

## After writing a JSON

1. **Images:** `make assets D=formats/scene/<topic>.json` fills any missing icons. Dry-run; add `WRITE=1`.
2. **See it beat-by-beat:** `make beats D=<file> [VS=<brand>]` → `/tmp/beats.png` (first/mid/last of every
   beat; `VS` stacks each beside its source section). Read it — catch murk/overlap/off beats before rendering.
2b. **Anti-slop:** `make slop D=<file>` — impeccable detector on the rendered DOM (overused-font /
   gradient / card-in-card / centered tells). Reach past anything it flags before rendering.
3. **Render:** `make video D=formats/scene/<topic>.json`.
4. **Layout audit:** `make audit` — overlap / clipped text / safe-zone / WCAG contrast (overlay → `/tmp/audit/scene.png`).
   **Shipping more than one ratio? `make audit M=<file> ASPECT=16:9,9:16,1:1,4:5` (or `ASPECT=all`).**
   A scene passes at its own aspect and is wrong at every other one: `pin` centres a *box*, so a text
   layer needs `w` (+ `align`) or it lands left-edge-on-centre; and `dx`/`dy` only apply with `anchor`.
   Both render silently. Audit every canvas you intend to ship.
   **Going to a phone feed? Set `"destination": "tiktok" | "reels" | "shorts"`** (default `web`).
   It decides the safe area, and the safe area is not a property of the shape: 9:16 for a website hero
   and 9:16 for TikTok are the same canvas, but TikTok paints a rail down the right and captions across
   the bottom. Edge keywords (`pin:"bottom"` etc.) and `col` resolve against that box, so declaring the
   destination is what keeps content out from under the chrome. One definition: `core/safe.js`.
5. **Check frames** before declaring done: `make look M=scene` / `make frame M=scene N=<n>`.
   Eyeball the hook, a reveal, and the end screen. Never silently ship an unverified video.
6. **Motion craft:** consult `docs/MOTION-CRAFT.md` when picking presets/cuts/stings.
7. **Anti-sameness:** `make ledger D=<file>` before shipping (fails if the design repeats a shipped one);
   `make ledger-add D=<file>` after the user approves it.

> **Editing `scene.html`?** Read the `vawe-scene-authoring` skill first (render-frame purity,
> tokens, motion primitives, image/capture system, QA loop). System map: `docs/CODEMAPS/ARCHITECTURE.md`.
> Run `make probe` after scene-logic changes and `make review` for a fast health snapshot.
