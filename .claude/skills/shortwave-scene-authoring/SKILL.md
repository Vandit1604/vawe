---
name: shortwave-scene-authoring
description: How to author good-looking, well-spaced, well-animated Shortwave scenes (formats/<name>/scene.html) and data JSON. Use when creating or editing a format's scene HTML/CSS, adding animations, integrating images, or fixing spacing. Covers the renderFrame(n) purity contract, design tokens, motion primitives, the image/visual system, and the QA loop.
---

# Authoring Shortwave scenes

One self-describing JSON → one rendered Short (1080×1920, 30fps). Scenes are vanilla HTML/CSS/JS;
a Go renderer (chromedp + ffmpeg) seeks to each frame and screenshots. **You almost never edit the
Go renderer.** You write data JSON (most common) or a format's `scene.html`.

## The one hard rule: `renderFrame(n)` is PURE in `n`

The scene exposes `window.__engine = { meta, renderFrame(n) }`. `renderFrame(n)` must produce
**byte-identical DOM for a given `n`, regardless of call order** — the renderer shards frames across
parallel Chrome tabs. So:

- Derive **everything** from `n` (and the data). No accumulation across frames, no `Date.now()`,
  no `Math.random()`, no reading previous DOM state.
- Set every animated property explicitly each frame. CSS `transition`/`animation` are globally killed.
- Animate **only** compositor-friendly props: `transform`, `opacity`, `clip-path`, `filter`. Never
  per-frame `width/height/top/left/margin` (layout thrash + impure).
- Guard it: `make probe M=<format>` asserts purity. Run it after any scene-logic change.

```js
import { boot, interpolate, easeOutCubic } from '/core/lib.js';
boot((data, fps) => {
  const duration = /* seconds */, total = Math.round(duration * fps);
  function renderFrame(n) {
    const t = n / fps;                       // seconds — your clock
    el.style.opacity = interpolate(t, [0, 0.5], [0, 1], { easing: easeOutCubic }).toFixed(3);
  }
  return { fps, duration, stings, sfx, segments, renderFrame };
});
```

## Layout scaffold

Every scene shares: `.stage` (graphite + grid + vignette) → `.act-hook/.act-body/.act-cta` (phase
visibility via `stage.className = 'stage phase-' + phase`) → `.safe` (the safe column). Use the
**safe zone** — content must stay inside `var(--safe-*)`. Mark important text/cards
`data-layer="critical"` so the layout audit checks them.

```html
<link rel="stylesheet" href="/core/tokens.css" />
<link rel="stylesheet" href="/core/visuals.css" />   <!-- opt-in: image/visual treatments -->
<div class="stage phase-hook">
  <div class="safe"><div class="hook-title" data-layer="critical">…</div></div>
</div>
```

## Use tokens — don't hardcode px (this is what keeps spacing in rhythm)

`core/tokens.css` defines scales. Reach for them instead of magic numbers:

- **Type:** `--fs-1 … --fs-9` (28→168px) + `--lh-tight/-snug/-body`, `--tr-tight/-label`.
- **Spacing:** `--sp-0 … --sp-7` (8→140px) for `gap`/`padding`. Layout helpers: `.stack-N`, `.cluster-N`.
- **Color:** `--text/-2`, `--dim`, `--up`/`--down` (data semantics), `--accent` (lime, brand chrome
  ONLY — never the up-color), `--accent-2` (cyan, decor only).
- **Depth:** `--r-sm/-md/-lg/-xl`, `--shadow-1/-2/-3`, `--glow-accent`.

A label and its value are a *unit* — keep them ~`var(--sp-1)` apart, not touching. Separate groups
get `var(--sp-3)`+.

## Animation — pure primitives in `core/lib.js` (no GSAP)

GSAP gives no render-speed benefit here (we seek-and-screenshot, not real-time playback), and risks
the purity contract. Use these closed-form, pure-in-`n` helpers instead:

- `interpolate(t, inRange, outRange, { easing, clamp })` — the workhorse. Replaces
  `ease(clamp01((t-s)/d))`. Multi-stop: `interpolate(t, [0,1,4], [0,100,400])`.
- `spring(t, { bounce, settle })` — natural pops; `springSettle(opts)` tells you when it settles
  (size your holds with it). `t` is seconds since the pop started.
- `track(n, fps, beats)` — given `[{name, dur}]`, returns `{ name, t01, localT }` for the active beat.
  Use it instead of hand-rolling `ENTER/GUESS/REVEAL` window math.
- transitions → `{opacity, transform}`: `rise(t)`, `fade(t)`, `pop(t)`, `slide(t,dir)`; apply with
  `applyT(el, rise(t))`.
- easings: `easeOutCubic/Quart/Expo/Back`, `easeInOutCubic`, `easeInCubic`, `easeOutElastic`, `punch`.

**Standard beat structure:** hook → enter (rise/pop in) → hold/guess → reveal (pop + count-up) →
hold → exit. Count-ups: `setVal(el, value * interpolate(t,[r0,r1],[0,1],{easing:easeOutQuart}))`.
`formats/higherlower/scene.html` is the reference. Test primitives with `make lib-test`.

## Images & visuals — real first, emoji last

Order of preference (CLAUDE.md): **real licensed image → generated card → emoji**. Never embed
copyrighted media (posters/stills/album art) in a published video.

- **Auto-source:** `make assets D=formats/<fmt>/<topic>.json` — fills missing icons: country→flag
  (flagcdn, PD), brand→logo (simple-icons, free), else a generated topic card. Dry-run by default;
  `WRITE=1` to apply.
- **Topic cards (any subject):** `node scripts/cards.mjs "Quantum Computing" --sub "…"` → a designed
  SVG (deterministic per-title palette, grain, vignette, frame). Use when no clean image exists.
- **`icon(value, fallback)`** turns an image path into `<img class="icon-img">`, else renders the
  fallback (emoji/monogram). Always pass a monogram fallback: `icon(c.icon, name[0].toUpperCase())`.
- **Treatments** (opt-in `/core/visuals.css`): `.ic-ring`, `.ic-duotone` (set `--duo`), `.ic-glow`,
  `.tex-grain`, `.badge`/`.chip`, `.frame-gradient`. Richer visuals from a class, no per-frame cost.

## QA loop — run before declaring a scene done

| command | checks |
|---|---|
| `make probe M=<fmt>` | render-order **purity** (must pass — protects sharded rendering) |
| `make audit [M=<fmt>]` | **overlap / overflow / safe-zone / tight-spacing** on `[data-layer=critical]`; overlays → `/tmp/audit/<fmt>.png` |
| `make look M=<fmt>` / `make frame M=<fmt> N=<n>` | storyboard / one frame to eyeball |
| `make verify` | render integrity (dims/fps/codec/audio) + safe-zone + contact sheets |
| `make review` | fast snapshot: lib-test + audit + a master overlay sheet (`/tmp/review.png`) |

**Always eyeball frames** (storyboard or `/tmp/review.png`) — don't claim "looks good" unrendered.
If the audit flags overlap/overflow, fix with the spacing tokens and re-run. Mark new key text
`data-layer="critical"` so the audit can see it.

See `docs/CODEMAPS/ARCHITECTURE.md` for the full system map.
