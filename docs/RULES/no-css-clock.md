---
name: no-css-clock
when: hand-writing an html layer or a css fragment
holds: built (core/layers/html.js refuses CSS animation/transition and opacity/filter in css)
answers: "why a fragment cannot own a CSS animation, transition, opacity, or filter, and what to use instead"
group: look
---
# The engine owns the clock: no CSS animation, transition, opacity, or filter

A render is seeked, not played: any frame can be requested out of order. CSS `animation` and
`transition` run on the browser's own clock, so a seeked frame would show the wrong point in the
motion, and the engine refuses both at boot. The same reasoning refuses `opacity`/`filter` inside a
layer's `css` block: the engine writes both every frame from `anim`/`motion`, and a value set once in
CSS would be silently overwritten or fight it. `var(--t)`/`var(--p)` are the only clocks a fragment
gets: they are engine-driven and always match the current frame.

| refused in `css` | use instead |
|---|---|
| `animation`, `transition` | `anim`/`motion`/`parts` on the layer |
| `opacity`, `filter` | `anim`/`motion`/`fx` on the layer |
| a fragment's own clock | `var(--t)` / `var(--p)` |

Right:
```json
{ "type": "html", "html": "<div class=\"card\">Hi</div>", "anim": "rise" }
```

Wrong:
```json
{ "type": "html", "html": "<style>.card{animation:fade 1s}</style><div class=\"card\">Hi</div>" }
```
