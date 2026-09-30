# Marker highlight

**Use when** one phrase in a held sentence is the point: a highlighter bar wipes behind it and the
text flips to dark ink for contrast. The bar has rounded ends and a slight skew, and its leading edge
is slanted like a real pen stroke. Clip: [marker-highlight.mp4](marker-highlight.mp4). Demo:
[demo/marker-highlight.html](demo/marker-highlight.html).

The colour flip is not a colour animation. A wipe box holds the bar and a dark copy of the text, and
one `clip-path` reveals both, so every letter turns dark at the exact pixel the bar reaches it.

```css
@property --p { syntax: '<number>'; inherits: false; initial-value: -12; }
.hl { position: relative; display: inline-block; white-space: nowrap; }
.wipe { position: absolute; inset: 0; --e: 8;
        clip-path: polygon(-50% -50%, calc(var(--p) * 1% + var(--e) * 1%) -50%, calc(var(--p) * 1%) 150%, -50% 150%);
        animation-name: sweep; animation-duration: 0.55s; animation-delay: var(--beat-1);
        animation-timing-function: var(--sweep); animation-fill-mode: both; }
.bar { position: absolute; inset: 0.14em -0.16em 0.02em; background: var(--accent);
       border-radius: 0.2em; transform: skewX(-7deg); }
.dark { position: absolute; inset: 0; color: var(--ground); }
@keyframes sweep { to { --p: 112; } }
```

```html
Ship the <span class="hl">launch film<span class="wipe"><span class="bar"></span><span class="dark">launch film</span></span></span>
```

`--sweep` is `curveToLinear(CURVES.expoOut)`, set on `:root` as in [mask-rise.md](mask-rise.md).

## The numbers that make it look expensive

- 0.55 s on `expoOut`: the pen is fast at the start and settles at the end.
- The leading edge is slanted (`--e: 8`, 8% of the phrase width), not vertical.
- The bar is 0.16em wider than the text on each side and sits 0.14em below the top, so the ends show
  as rounded caps and the bar covers the x-height plus a little, like a marker.
- The dark ink is the ground colour, not black: contrast on the accent is about 5.6 to 1.

## The common mistake

Animating `color` and `width` separately. The text turns dark before or after the bar reaches it, and
the frame in the middle of the wipe shows white text on the ground next to dark text on nothing. Put
the dark copy inside the wipe box so one clip drives both.
