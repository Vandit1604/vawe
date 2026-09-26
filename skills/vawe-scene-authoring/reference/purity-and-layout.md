---
when: "writing or editing renderFrame(n), the scene layout scaffold, or a design token"
answers: "the purity contract in full, the shared .stage/.safe layout, and why a hardcoded colour fallback is always a bug"
group: skill
---

# Purity, layout, and the theme

## The one hard rule: `renderFrame(n)` is PURE in `n`

The scene exposes `window.__engine = { meta, renderFrame(n) }`. `renderFrame(n)` must produce
**byte-identical DOM for a given `n`, regardless of call order**, the renderer shards frames across
parallel Chrome tabs. So:

- Derive **everything** from `n` (and the data). No accumulation across frames, no `Date.now()`,
  no `Math.random()`, no reading previous DOM state.
- Set every animated property explicitly each frame. CSS `transition`/`animation` are globally killed.
- Animate **only** compositor-friendly props: `transform`, `opacity`, `clip-path`, `filter`. Never
  per-frame `width/height/top/left/margin` (layout thrash + impure).
- Guard it: `make check GATE=probe M=<format>` asserts purity. Run it after any scene-logic change.

```js
import { boot } from '/core/engine/boot.js';
import { interpolate, easeOutCubic } from '/core/motion/motion.js';
boot((data, fps) => {
  const duration = /* seconds */, total = Math.round(duration * fps);
  function renderFrame(n) {
    const t = n / fps;                       // seconds: your clock
    el.style.opacity = interpolate(t, [0, 0.5], [0, 1], { easing: easeOutCubic }).toFixed(3);
  }
  return { fps, duration, stings, sfx, segments, renderFrame };
});
```

## Layout scaffold

Every scene shares: `.stage` (graphite + grid + vignette) → `.act-hook/.act-body/.act-cta` (phase
visibility via `stage.className = 'stage phase-' + phase`) → `.safe` (the safe column). Use the
**safe zone**: content must stay inside `var(--safe-*)`. Mark important text/cards
`data-layer="critical"` so the layout audit checks them.

```html
<link rel="stylesheet" href="/core/tokens.css" />   <!-- plumbing only: fonts + geometry + reset -->
<div class="stage">…</div>
```

## The theme owns the look: no fallbacks, no default look

`core/tokens.css` is PLUMBING: font registration, frame geometry (`--vw/--vh/--safe-*`), the
determinism reset, `.stage`/`.num`/`.icon-img`/debug overlay. It contains zero colors, font choices,
scales or shadows. Every look var (`--font-*`, `--bg`, `--text/-2`, `--dim`, `--ink`, `--surface/-2`,
`--line/-strong`, `--accent/-dim/-glow`, `--up`/`--down`, `--g0..2`) is written by `applyTheme()` from
the video's theme, and `core/registry/theme-contract.js` requires the theme to be COMPLETE, a missing key
fails at `make validate` and again at boot. Never write `var(--x, fallback)` with a constant in a
scene: if the var is a look value it comes from the theme (guaranteed), and a hardcoded fallback is
exactly the "wrong-look video renders anyway" bug the contract exists to prevent. Data JSONs must
declare `"theme"` (name or inline object).

Spacing/size rhythm lives in the video JSON (explicit px per layer) and the layout audit, a label
and its value are a *unit* (~12px apart); separate groups get 32px+.
