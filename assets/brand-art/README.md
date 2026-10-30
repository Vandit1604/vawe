# Brand art

Two-ink screenprint scenes painted in canvas 2D (`art.js`, seeded, so each render is the same image)
with the copy and layout in `page.js`. One page per format: `banner.html` (2:1), `og.html` (1200:630),
`post.html` (16:9), `square.html` (1:1). Pick the image with the query: `scene` (`lanes`, `pages`,
`strip`), `ink` (`a` blue print, `b` night print) and `copy` (the keys of `COPY` in `page.js`).

Render from the repo root with `bin/vawe still assets/brand-art/<format>.html --at 0 --param scene=<s> --param ink=<i> --param copy=<c>`.

| File | Scene, ink |
|---|---|
| `assets/banner.png` (vawe README) | lanes, blue print |
| `.github/skills-repo/assets/banner.png` | strip, night print |
| `site/app/opengraph-image.png` (vawe.dev default card) | strip, night print |
| `site/public/assets/og.png` (docs card) | strip, blue print |
| `vawe-hq/.github` `profile/banner.png` | strip, blue print |
