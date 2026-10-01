# Caption karaoke

**Use when** a spoken line runs as captions and the eye must follow the voice: the word being said
lifts to full ink and one soft pill glides from word to word on the speech timing. The line never
re-wraps and no word moves except the small lift. Clip: [caption-karaoke.mp4](caption-karaoke.mp4).
Demo: [demo/caption-karaoke.html](demo/caption-karaoke.html).

```js
// [seconds the word starts, word index]: the speech timing, one table, edited in place
const SPOKEN = [[0.3, 0], [0.7, 1], [0.95, 2], [1.2, 3] /* ... */];
const box = (el) => ({ x: el.offsetLeft - pad, y: el.offsetTop - padY, w: el.offsetWidth + 2 * pad, h: el.offsetHeight + 2 * padY });
const frames = [{ offset: 0, ...at(box(spans[0])), easing: 'linear' }];
SPOKEN.forEach(([t, i], n) => {
  if (n === 0) return;
  frames.push({ offset: t / END, ...at(box(spans[SPOKEN[n - 1][1]])), easing: EASE.land });   // hold, then glide
  frames.push({ offset: (t + 0.14) / END, ...at(box(spans[i])), easing: 'linear' });
});
pill.animate(frames, { duration: END * 1000, fill: 'both', easing: 'linear' });
// each word: muted -> ink with a 0.05em lift on its second, back to muted when the next word starts
spans[i].animate([{ color: MUTED, translate: '0 0', easing: EASE.land }, { offset: .., color: INK, translate: '0 -0.05em' }, ...], { delay: (t - 0.04) * 1000, duration, fill: 'both' });
// enter(cap, ...) and leave(cap, { end }) from core/motion/presets.js
```

```css
.cap { position: relative; isolation: isolate; color: var(--muted); }
.w { display: inline-block; }
.pill-bg { position: absolute; left: 0; top: 0; z-index: -1; border-radius: var(--r3); background: var(--hover); }
```

Sound: none; the voice is the sound. Cue a tick at each SPOKEN time only if the captions run without a voice.

## The numbers that make it look expensive

- The pill takes 0.14 s to glide and then holds. On an expo-out curve it arrives in the first third, so it is already under the word when the word lifts.
- Muted text is the rest state (4.5:1 or more on the ground), full ink is the current word. The pill is a tint of the surface ladder, not an accent block, so the text keeps its contrast.
- The pill is 0.16em wider than the word on each side, so it never covers the space and a neighbour.
- Position with `offsetLeft` and `offsetTop`, not `getBoundingClientRect`: the caption itself is mid-entrance and scaled, and the offsets ignore transforms.
- Wait for `document.fonts.ready` before measuring, or the pill lands where the fallback font put the words.

## The common mistake

Moving the pill by a per-word `setTimeout` or by a `[left, width]` tween that restarts per word. Both
drift off the speech. One keyframe list on one animation, with offsets from the `SPOKEN` table, keeps
the pill in step with the seek.

Looks (ground, type, radius, accent) live in `demo/demo.css`; this snippet keeps neutral tokens.
