# Launch-video guide — make a great product video for any brand

The one-page playbook. Everything is wired so a new brand takes **one command + one JSON**.

```
 URL ──▶ make brandkit ──▶ themes/<name>.json  (colours pack)     ──▶ author scenes ──▶ make video ──▶ mp4
                          dna/<name>.json     (identity+storyboard)     (demo/brandfilm)
                          fonts + favicon
```

## Step 1 — Onboard the brand (automatic)

```bash
make brandkit URL=https://plinthai.xyz NAME=plinth
```
Crawls the site's CSS and writes:
- **`themes/<name>.json`** — the *colours pack*: palette (with the **dominant** colour detected — white-first vs dark), a `bg` palette that drives every background, fonts, and format vars. **Use ONLY these colours.**
- **`dna/<name>.json`** — the *Brand DNA*: product name, tagline, description, all headings (your storyboard raw material), CTA, plus inferred **voice / motion character / bg strategy** and a suggested **storyboard**.
- Downloads the site's **fonts** (prints the `@font-face` lines to paste into `core/tokens.css` once) and its **favicon** to `engine/assets/brands/<name>/`.

Read `dna/<name>.json` — it tells you the dominant colour, the beats, and whether to go plain or busy.

## Step 2 — Study the site, then design (no templates)

```bash
make lookbook URL=https://site.com NAME=brand    # full-page + viewport screenshots for study
```
Read `engine/assets/brands/<name>/look/*.png` and name the design language in words —
typography, density, shape language, signature details, motion character (the
`shortwave-video-planning` skill is the checklist). Then storyboard by hand: every beat's
copy comes from the site's own words, every visual choice traces to an observation from the
lookbook. There is no draft generator on purpose — story structure is designed per product.

For a hand-authored storyboard instead, pick a spine by the brand's voice (see `docs/DESIGN-DATABASE.md §15`):
mission→**Golden Circle** · performance→**PAS / Hook-Story-Offer** · transformation→**BAB** · launch→**AIDA**.

Spine: **Hook (first 3s) → Build → Proof → Payoff (shocker at ~80–90%) → CTA (3–5s).**
Budget: **30s → 5–7 scenes** (~3–6s each) · **60s → 8–12** (~4–7s).
Map product fields → beats: tagline→hook · how-it-works→build (max 3 steps) · features→FAB blocks · **best stat→payoff** · CTA→end. One idea per scene.

## Step 3 — Author the scenes (one JSON)

Two formats, both theme-driven (they render in the brand's colours automatically via `"theme":"<name>"`):

- **`demo`** — product **walkthrough** with working UI animations (code editor, deploy pipeline, API call with a clicking cursor, earnings counter). Best when you can *show the product working*. Scene types: `title`, `statement`, `code`, `deploy`, `call`, `earn`, `cta`.
- **`brandfilm`** — long-form **narrative** reel. Scene types: `title`, `statement`, `steps`, `stats`, `features`, `quote`, `split`, `cta`.

```jsonc
{ "module": "demo", "orientation": "landscape", "theme": "plinth", "audio": {"silent": true},
  "scenes": [
    { "type": "title", "bg": "paperShapes", "eyebrow": "…", "title": "Hook line <em>here.</em>" },
    { "type": "code",  "bg": "paper", "lines": ["name: x", "price: $0.002 / call"] },
    { "type": "cta",   "bg": "soft", "logo": "…", "cta": "…", "url": "brand.com" }
  ] }
```

### Use the product's REAL UI (not a lookalike)
Lift a genuine component off the live site (its HTML + computed CSS) into an animatable scene:
```bash
make capture URL=https://site.com SEL="#how-it-works" NAME=acme LABEL=howitworks
```
→ `engine/assets/brands/<name>/components/<label>.json`. Then a **`component`** scene renders it, scaled + animated:
```jsonc
{ "type": "component", "src": "/engine/assets/brands/acme/components/howitworks.json", "dur": 4 }
```
It's real HTML (self-contained inline styles), so it renders faithfully and can still be zoomed/cursor-driven. Best for "here's the actual product" beats. (Limitation: `::before/::after` pseudo-elements aren't captured.) Prefer *recreating* small components you need to type into/animate heavily; *capture* full sections you want pixel-faithful.

### Backgrounds — use them tastefully (`bgPreset` in `core/backgrounds.js`)
- **Light brands (white-dominant):** `paper` (plain) · `paperShapes` · `paperDots` · `soft` (tint) · `accent` (brand-colour bg) · `ink` (dark contrast).
- **Dark brands:** `aurora` · `mesh` · `constellation` · `spotlight` · `brandglow` · `plain`.
- **The rule:** default to **PLAIN** so content breathes; add texture (`paperShapes`/`dots`/`aurora`) **only on the hook, CTA, and low-copy/connective beats**. Never decorate a scene whose job is to make one thing land. (See §14–15.)

## Step 4 — Render + verify

```bash
make video D=formats/demo/<name>-ad.json     # → engine/out/<name>-ad.mp4
make probe M=demo                            # purity (must stay green)
make motion M=demo                           # animation-over-time contract: final frame holds,
                                             # payoffs settle before the exit, typing completes
make audit M=demo                            # layout (landscape-aware, [data-layer=critical])
# eyeball frames: ffmpeg -ss <t> -i out.mp4 -frames:v 1 f.png
```

**The motion contract (enforced by `make motion`):** a scene is fully opaque from `TRANS → dur−TRANS`;
every payoff must settle by `dur − TRANS − HOLD` (0.5 + 0.6s) and HOLD there; the last scene never
exits (`sequence()` holdLast). Typewriters/count-ups derive their windows from content length, never
fixed constants. Tag looping chrome (carets, spinners) `data-motion="loop"` to exempt it.

## The knowledge (consult before authoring)

- **`docs/DESIGN-DATABASE.md`** — the design brain: backgrounds, motion/easing (ease-out for entrances, quick never slow), transitions (dip · swipe · wipe · scale-punch · gloss sheen), microinteractions, cursor (Fitts travel + click), zoom, **storyboard structures + second-budgets**, plain-vs-busy, WCAG, 60-30-10. `docs/animation-db.json` = machine-readable.
- **`core/`** — `backgrounds.js` (palette-driven presets + engines), `kinetic.js` (split-text presets), `compose.js` (declarative clips + adapters), `icons.js` (SVG icons), `lib.js` (motion primitives + theme system).

## Hard rules (learned; do not break)
1. **Only the site's colours**, and respect **dominance** — if white is the main colour, the video is white-first (not dark). `brandkit` detects this.
2. **No heavy vignette.** In light formats, kill the shared `.stage` dark bg/grid/vignette.
3. **Backgrounds move** (drift + slow camera zoom) but stay **tasteful** — plain by default.
4. **Dark code/UI windows on a white page** read premium — but force light text inside them (`.win{color:…}`) so a light scene's ink colour doesn't make them invisible.
5. Pure in `n` — `make probe` must pass.
