# Bracket callout

**Use when** the eye must go to one word or one part of a UI: four corner brackets fly in from
outside, snap onto the target box and land with a small overshoot. Clip:
[bracket-callout.mp4](bracket-callout.mp4). Demo: [demo/bracket-callout.html](demo/bracket-callout.html).

```css
.frame { position: absolute; inset: -1.3vh; --far: 13vh; --arm: 3.4vh; }
.c { position: absolute; width: var(--arm); height: var(--arm); border: 0 solid var(--accent); opacity: 0;
     animation-duration: 0.55s; animation-delay: var(--beat-1);
     animation-timing-function: var(--land); animation-fill-mode: both; }
.tl { left: 0; top: 0; border-width: 0.7vh 0 0 0.7vh; border-top-left-radius: 0.6vh; animation-name: tl; }
/* tr, bl, br: the same with the other two borders and the other two corners */
@keyframes tl { from { translate: calc(var(--far) * -1) calc(var(--far) * -1); opacity: 0; }
                12% { opacity: 1; } to { translate: 0 0; opacity: 1; } }
```

```html
<span class="target">Export<span class="frame"><i class="c tl"></i><i class="c tr"></i><i class="c bl"></i><i class="c br"></i></span></span>
```

`--land` is `curveToLinear(CURVES.overshoot)`. The curve passes 1, so each corner travels 5 to 10
percent past the box (toward the target's centre) and comes back.

## The numbers that make it look expensive

- Each corner travels `--far` (13vh) along the diagonal, in 0.55 s. All four run at once, so the
  frame looks like one object closing in.
- The overshoot dips the brackets inside the frame for about 60 ms: this is the "snap".
- The frame sits 1.3vh outside the target's own box, so it never touches the text. Arms are 3.4vh,
  about half of the target height, with a 0.6vh corner radius that matches the target's radius.
- Opacity reaches 1 in the first 12 percent, so the brackets are never seen fading.
- Only the accent draws. The target does not change colour; the brackets are the whole signal.

## The common mistake

Scaling one bordered box down onto the target. The stroke shrinks with the scale, the corner radius
distorts, and the four sides are visible the whole way. Move four separate corners instead: strokes
stay one width and only the corners travel.
