# Simple marquee

**Use when** rows of pictures, logos or words must slide for a whole beat, and the rows must run in
different directions: a ticker band, a "weekly finds" wall, a trust strip. Each row is one set of
items repeated four times that moves one set width and wraps without a seam. Clip: [simple-marquee.mp4](simple-marquee.mp4).
Demo: [demo/simple-marquee.html](demo/simple-marquee.html).

Credit: port of fancy by Daniel Petho, MIT. Source:
[simple-marquee](https://www.fancycomponents.dev/docs/components/blocks/simple-marquee)
([repo](https://github.com/danielpetho/fancy)). The maths and the demo layout are the original's.

A row is `repeat` copies of its items side by side, each copy `flex-shrink: 0`. All copies get the same
`translateX(x%)`, where the percent is of one copy's own width. When x wraps from -100 to 0 each copy sits
where the one before it was, so the loop is seamless.

```js
const BASE_VELOCITY = 8;     // percent of one copy per second: a 1120 px copy moves 90 px per second
const REPEAT = 4;
const wrap = (v) => ((v % -100) + -100) % -100;           // 0 down to -100, also for positive v
window.seek = (t) => rows.forEach(({ copies, sign }) => {   // sign: left -1, right +1; up and down use translateY
  const x = wrap(sign * BASE_VELOCITY * t);
  copies.forEach((c) => { c.style.transform = `translateX(${easing ? easing(x / -100) * -100 : x}%)`; });
});
```

Layout of the demo (a 532 px tall box, scaled to the frame): three rows of five 192 x 128 tiles, 16 px
margin each side (32 px gap), 16 px between rows, the first row 324 px from the top; the title
"Weekly Finds" is 60 px, centred, 133 px from the top. Directions: left, right, left.

Sound: none; or a quiet tape-like bed.

## The numbers that make it look expensive

- 8 percent per second for every row, so a wider set moves faster in pixels but laps in the same 12.5 s.
- Alternate the direction row by row (left, right, left): the eye reads weave, not a belt.
- Four copies cover any frame up to four set widths wide. Fewer copies show a gap on the wide side.
- An `easing` function is applied to each lap (`easing(x / -100)`), so a lap can start and stop softly.
- The demo reads the scroll, which is at rest, so its speed is exactly 8.00 (measured on the live page). A row with no scroll input moves 8.04: the original maps a constant 1 to a factor of 0.005.

## The common mistake

Moving the row with `left` or a keyframe that jumps back: the copies must wrap by one set width,
not by the row width. Also a first set narrower than the frame with `repeat` 2: the wrap shows a hole.

Not ported: scroll velocity (it speeds the row and flips its direction), drag with decay and the
hover slow-down. They are inputs, not motion. Difference from the original: the third row sits below
the fold in a 16:9 frame, as it does at scroll 0 in the demo box; the tiles are seeded colour gradients in place of the demo's images.
