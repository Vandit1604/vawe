---
name: svg-inline
when: writing an svg layer, or setting src on an image/video/html layer
holds: eye (formats/scene/schema.json propsByType.svg has no `src` field)
answers: "svg is inline d/viewBox/stroke/draw, never a src; and how a repo path in src actually resolves"
group: reference
---
# An svg layer is inline geometry, not a file reference

The `svg` layer type has no `src` field. Its legal props are `d`, `viewBox`, `fill`, `stroke`,
`strokeWidth`, `draw`, `morph`, `w`, `h`: the path data and its box, written directly into the JSON, so
`draw` can animate the stroke and `morph` can melt one path into another. A `src` belongs on `image`,
`video`, `html` and `component`, and any repo-relative path there (`assets/logo.png`, `./x.png`) is
resolved by `core/src-url.js` to a root-relative URL; it is never resolved against the page the scene
loads from.

| layer | src field | path form |
|---|---|---|
| `svg` | none: `d` + `viewBox` inline | n/a |
| `image` / `video` / `html` / `component` | `src` | repo-relative or root-relative, resolved by `core/src-url.js` |

Right:
```json
{ "type": "svg", "viewBox": "0 0 24 24", "d": "M4 12h16", "stroke": "#fff", "strokeWidth": 2, "draw": true }
```

Wrong:
```json
{ "type": "svg", "src": "assets/icons/arrow.svg" }
```
