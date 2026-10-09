# Media between text

**Use when** a line of type must open a gap and put a picture or a clip into it: "that's a nice ( ) chair!", a
product shot inside a sentence, a face between two words. The two halves of the line part as the media grows from
zero width and close again when it leaves. Clip: [media-between-text.mp4](media-between-text.mp4).
Demo: [demo/media-between-text.html](demo/media-between-text.html).

Credit: port of fancy by Daniel Petho, MIT. Source:
[media-between-text](https://www.fancycomponents.dev/docs/components/blocks/media-between-text)
([repo](https://github.com/danielpetho/fancy)). The markup, the sizes and the demo are the original's. The font is
Overused Grotesk (OFL), the site's own.

One flex row, centred: the left words, a media box of width 0 and height 100 px with `overflow: hidden`, the right
words. Only the media width moves; the flex layout parts the words and wraps them when the row is full. No text is
animated.

```js
const WIDTH = 100;                                        // px
const OPEN = { k: 532.6, d: 46.15 };                      // motion spring { duration: 0.4, bounce: 0 }: critically damped, w = 9.23 / 0.4
const closeEase = cubicBezier(0.25, 0.1, 0.35, 1);        // motion's default tween for a value with no transition, 0.3 s
const HOVERS = [[0.5, 1.9], [2.8, 3.7]];                  // [enter, leave] seconds
const widthAt = (t) => {
  for (let i = HOVERS.length - 1; i >= 0; i--) {
    const [enter, leave] = HOVERS[i];
    if (t >= leave) return WIDTH * (1 - closeEase(Math.min((t - leave) / 0.3, 1)));
    if (t >= enter) return WIDTH * spring(t - enter, OPEN.k, OPEN.d);
  }
  return 0;
};
media.style.width = `${widthAt(t)}px`;
```

The line is 60 px light, lowercase, `#ff5941`, in a box 500 px wide; the media box has margins 16 px on top and 8 px
on both sides. The words wrap in two lines when the media is open, as in the original.

Sound: none; or a soft pop as the picture opens.

## The numbers that make it look expensive

- Open on a critically damped spring of 0.4 s (stiffness 533, damping 46): fast and settled by 0.25 s, no overshoot.
- Close is not the same curve: it is a 0.3 s tween (0.25, 0.1, 0.35, 1). The media leaves a little slower in its first half than it came.
- Width 100 px, height 100 px: in a 500 px box the row is full, so flex squeezes the media to 84.5 px and wraps the words.
- Margin 8 px each side keeps the picture off the parentheses.
- Light weight at 60 px with the picture the same height as one line pair: the picture reads as a glyph.

## The common mistake

Animating the words too, or animating the media to `width: auto`: both fight the flex layout and the words jump. Animate
only the media width and let the layout move the words. Also closing with the open spring: the exit then drifts. Use
the tween.

Difference from the original: the photo is a loft ceiling in place of the chair, the hover is a time table of enter and
leave seconds, and the first hover is long enough to read the open state. The original uses the media height 30 px on
screens under the sm breakpoint; only the desktop size is ported.
