---
name: vawe-scene-authoring
description: How to author good-looking, well-spaced, well-animated Vawe scenes (formats/<name>/scene.html) and data JSON. Use when creating or editing a format's scene HTML/CSS, adding animations, integrating images, or fixing spacing. Covers the renderFrame(n) purity contract, design tokens, motion primitives, the image/visual system, and the QA loop.
---

# Authoring Vawe scenes

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
import { boot } from '/core/boot.js';
import { interpolate, easeOutCubic } from '/core/motion.js';
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
<link rel="stylesheet" href="/core/tokens.css" />   <!-- plumbing only: fonts + geometry + reset -->
<div class="stage">…</div>
```

## The theme owns the look — no fallbacks, no default look

`core/tokens.css` is PLUMBING: font registration, frame geometry (`--vw/--vh/--safe-*`), the
determinism reset, `.stage`/`.num`/`.icon-img`/debug overlay. It contains zero colors, font choices,
scales or shadows. Every look var (`--font-*`, `--bg`, `--text/-2`, `--dim`, `--ink`, `--surface/-2`,
`--line/-strong`, `--accent/-dim/-glow`, `--up`/`--down`, `--g0..2`) is written by `applyTheme()` from
the video's theme, and `core/theme-contract.js` requires the theme to be COMPLETE — a missing key
fails at `make validate` and again at boot. Never write `var(--x, fallback)` with a constant in a
scene: if the var is a look value it comes from the theme (guaranteed), and a hardcoded fallback is
exactly the "wrong-look video renders anyway" bug the contract exists to prevent. Data JSONs must
declare `"theme"` (name or inline object).

Spacing/size rhythm lives in the video JSON (explicit px per layer) and the layout audit — a label
and its value are a *unit* (~12px apart); separate groups get 32px+.

## Beat the AI slop when hand-writing HTML (hooks, CTAs, cards)

Hand-authored HTML is where generic output creeps in. **Load `taste-skill` first** (Design Read + the
three dials + Anti-Default Discipline), then `impeccable` for craft — both vendored in `.claude/skills/`.
Non-negotiable moves:
- **Asymmetry over centered.** Default to an off-center anchor (hard-left, or a 2/3 split), not
  `align:center` on everything. Centered-everything is the #1 AI tell.
- **Scale contrast.** One oversized hero (a word, a number) paired with tiny understated text — a rhythm
  of extremes, not one safe size step.
- **A committed non-generic face.** Reflecting a real brand → its captured font. Anything else → never
  Inter or Space Grotesk (the slop faces); reach for Instrument Serif (editorial), a captured face, or one
  you register via brandkit.
- **One bespoke visual device, not card soup.** Avoid the equal rounded-card grid and the rounded-icon-
  tile-above-a-heading. Invent one signature motif per video.
- **Layout by containment — group-first.** Anything with a spatial relationship (a label+value, a logo
  row, a card grid, a checkout card's contents) goes in a `group` (flex/grid box; children flow by `gap`,
  and children can be **nested groups**) — never two absolute `x/y` layers you space by eye (that's what
  collides). Absolute `x/y` + `motion` is only for free placement / choreography. This is the another engine/HF
  flex-not-pixels rule; it's why the fix for "the % is too close to the label" is a group, not new coords.
- **Gate it:** `make slop D=<file>` runs the impeccable detector (41 rules, no LLM) on the rendered DOM;
  clear its flags before you render. Full routing: `AGENTS.md`.

## Animation — pure primitives in `core/motion.js` (no GSAP)

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
- Chips/badges/cards come from `chipBox` on any layer (bg/pad/radius/border/elevation in the JSON) —
  there is no shared treatment stylesheet (visuals.css was removed with the template formats).

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
