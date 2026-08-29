---
when: you are writing an `html` layer by hand, or a fragment renders as a dead still and nothing says why
answers: "what a layer actually wraps · the four ways a fragment moves · the three things the engine refuses and what to use instead · the traps that cost a render each"
group: look
---

# Writing HTML fragments, and making them move

An `html` layer is not an escape hatch from the engine. It is the engine's **content**, and everything
the engine does to a layer it does to your markup: filters, modifiers, depth, origin, the camera, the
motion track. Verified in one render, with all of it stacked on a single fragment at once.

So the choice is never "HTML or effects". It is **HTML for what the frame LOOKS like, and the engine
for what it DOES over time.**

## Reach for HTML when the answer is CSS

If you find yourself hunting for the prop that does what a CSS declaration already does, stop and write
the CSS. A gradient-filled word with a bloom behind it is four declarations. It took three failed
attempts through the layer vocabulary to not get it, and fifteen lines of markup to get it right first
time.

Reach for a layer TYPE when it does something you would otherwise hand-roll: `text` measures and fits
and carries the theme's ink, `count` counts, `component` captures a real product surface, `group`
scopes a box and a clock.

## A layer wraps TIME, not HTML

This is the sentence that makes the rest make sense. The layer owns the window (`start`, `duration`),
injects a seekable clock, and carries the per-frame tracks. That clock is the one thing your fragment
cannot supply for itself, and it is the whole reason the layer exists.

**`--t` is the scene clock, in seconds, written on your layer every frame.** Not a fraction, not a
progress value. Seconds.

## The four ways a fragment moves

Pick by what is moving. They compose freely.

### 1. `--t` in a `calc()`, for geometry you own

```html
<div style="position:absolute;bottom:12%;height:6px;background:#ff6a00;
  width:calc(var(--t,0) * 14cqw)"></div>
```

A bar that grows on the scene clock. Always give `var(--t)` a fallback, so the fragment still renders
when previewed outside a scene.

This is the most flexible and the most hand-rolled. Use it for a shape whose geometry is a formula.

### 2. `parts`, for anything with children

**The most useful feature almost nobody uses.** 8 of 164 scenes reach for it, against 62 that carry an
`html` layer. Two agents building the same figure both concluded "an html layer leaves as one card" and
reported it as a fact about the medium. It was a feature they had not found.

`parts` is a CSS selector into your own markup. Every matched element gets an engine-driven, **seeked**
entrance with a stagger, and `out: true` gives it the paired exit:

```json
"parts": { "select": ".chip", "anim": "riseIn", "each": 0.5, "stagger": 0.12, "out": true }
```

Keys: `select · anim · each · stagger · delay · ease · out · exitDur`.

Entrances: `growUp · widen · popIn · fadeUp · riseIn · drawOn · fade · slide-left · slide-right`.

**These are their own vocabulary.** `rise` is a real name in two other slots and not here, and the
engine refuses it by name rather than resolving it to a default that would look deliberate.

The trade this makes is the good one: your markup keeps the whole CSS surface, and the CLOCK still owns
each piece.

### 3. A `motion` track, for the layer as one object

Seven keys beat one preset name. The two films this repo argues from carry hand-keyed tracks on 6 of 8
and 4 of 35 layers; the library median is 0. `make track SHAPE=pan|blast|drift|enter|exit` emits one
from a shape measured off a real film.

### 4. `vars`, for a number your own CSS reads

```json
"vars": { "--heat": [0, 1] }, "varsDur": 0.8, "varsEase": "easeOutQuint"
```

Then `calc(var(--heat) * 20px)` anywhere in your fragment. This is how every keyable value in the
engine works, including `--glow-c`, `--plane-z` and the adjustment layer's `--adjust`. **Do not invent
a second keying mechanism for your fragment.** `vars` is already the answer.

## Three refusals, and what to use instead

Each of these throws at boot, by name. None of them is arbitrary.

| refused | why | instead |
|---|---|---|
| `animation` / `transition` in your CSS | they run on a clock the renderer does not own, so a seeked frame would be wrong | `--t` in a `calc()`, `parts`, or a motion track |
| `opacity` or `filter` in `css` | the engine writes both every frame (the enter/exit envelope, and the velocity blur) | the layer's own `opacity` and `filter` props |
| a CSS value this Chrome drops | an invalid declaration is dropped silently, the rest of the rule survives, and the frame renders looking almost right | see the traps below |

The third one is the important one. **A browser drops one bad declaration and keeps going.** That is
how three of four focus brackets never moved with every check green.

## The traps, each of which cost a render

**`abs()` does not exist here.** This renderer's Chrome has no `abs()`, so `calc(abs(x))` is invalid,
the whole `filter` declaration is dropped, and the element computes `filter: none`. The frame looks
merely plain and nothing reports anything. Use `max(x, -x)`.

**Size from the CONTAINER, not the viewport.** `vw` resolves against whatever viewport the markup finds
itself in, which is the window in a live preview and something else entirely inside an exporter. Put
`container-type: size` on your root and use `cqw`. Same box in both places.

**Black means `#000000`.** Every dark preset carries a tint and samples well above zero at the corners.
A pitch-black ground is `background:#000` in your own markup, plus `"tone": "dark"` on the window,
because the engine cannot read lightness out of your CSS.

**A gradient map needs a real black to map from.** If you are remapping luminance, put the subject on
an OPAQUE plate and `mix-blend-mode: screen` to drop the plate back out. On a transparent layer the
ramp's bottom stops land where the alpha has already gone.

**Your stylesheet stops at your own layer.** A `<style>` block inside a fragment is scoped to it, so
`.chip` in one fragment cannot reach `.chip` in another. Name things for readability, not to avoid
collisions that cannot happen.

## Preview before you render

```bash
make preview HTML=formats/scene/_your-fragment.html THEME=<brand>
```

Renders the fragment in a real browser with real computed styles, runs the craft detector over it, and
writes `/tmp/preview.png`. **Read the image.** Real fonts? Real assets loaded? Spacing and hierarchy
right? Then render.

## Worked examples in this repo

- **`formats/scene/_vawe-teaser-word.html`**: an entire six-second film in one fragment: a plain state,
  a thermal ramp that fades in and out, and a goo morph between two words. Carries the four After
  Effects steps of the effect in its own comments, which is the shape to copy: the recipe lives beside
  the implementation, so the next author inherits the name rather than the guess.
- **`core/generators.js`, the `thermalBlur` card**: a fragment that inlines its own SVG filter, and
  says in its comments why it does that rather than referencing one on the page.

## The one thing to remember

A fragment animated with CSS renders as a **dead still**, and the engine tells you so at boot rather
than letting you find out from the mp4. Every other way of moving it is above, and `parts` is the one
you are most likely not to have tried.
