---
when: writing or changing repo maintenance tooling: a brand-capture script or a site build helper
answers: "what scripts/ is: brand/ (capture a site into a kit: palette, sections, photos), site/ (build helpers for the marketing site) and vendor-gsap.mjs"
group: process
---

# scripts/

Repo maintenance, distinct from `generators/` (bakes standing assets) and `harness/` (film-authoring
tools and hooks).

- `brand/`: reflects a website into `assets/brands/<name>/`. `node scripts/brand/kit.mjs <url> <name>`
  runs the steps in one go and writes `kit.json` (palette, fonts, favicon, section captures).
  The steps run alone: `sections.mjs`, `palette.mjs`, `photos.mjs`, `localize-assets.mjs`.
- `site/`: builds what the marketing site consumes (`og-image.mjs`, `vendor-assets.mjs`,
  `dev-all.mjs`). `easing.mjs` builds `site/lib/easing.json`; `easing-clips.mjs` renders the clip on each
  `/easing` page into `site/public/easing/`.
- `vendor-gsap.mjs`: copies `gsap.min.js` from `node_modules` into `assets/vendor/` on `npm install`.
