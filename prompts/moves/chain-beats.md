# Chain beats

**Use when** a film has three or more beats and each one would otherwise wait for the last. The next
move starts at 60 to 70 percent of the previous one, and one element hands off: here a dot widens into
a bar, the bar closes to the rule under the headline, and the headline rises out of that rule. One
object carries the film, so the beats read as one gesture, not a list. Clip:
[chain-beats.mp4](chain-beats.mp4). Demo: [demo/chain-beats.html](demo/chain-beats.html).

```html
<div class="row"><div class="chip"><span class="label">vawe ship films/launch</span></div></div>
<script type="module">
import { curveToLinear, CURVES } from '../../core/motion/springs.js';
const settle = curveToLinear(CURVES.expoOut);
const chip = document.querySelector('.chip');
const next = (beat) => beat.at + beat.dur * 0.3;   // expoOut reads as done at 0.46 of its duration; 0.3 is 65% of that
const A = { at: 50, dur: 800 };
const B = { at: next(A), dur: 1000 };
const C = { at: next(B), dur: 1500 };
const run = (el, frames, beat, fill = 'both') =>
  el.animate(frames, { duration: beat.dur, delay: beat.at, easing: settle, fill });

run(chip, [{ translate: '-9vw 0' }, { translate: '0 0' }], A);                                      // the dot lands
run(chip, [{ width: '5vh', height: '5vh' }, { width: '72vw', height: '10vh' }], B);                 // the dot becomes a bar
run(chip, [{ height: '0.6vh' }], C, 'forwards');                                                    // the bar becomes the rule
run(document.querySelector('h1'), [{ translate: '0 105%' }, { translate: '0 0' }], { at: C.at + 80, dur: 1300 });
</script>
```

The overlap is measured on what the eye sees, not on the duration: `expoOut` covers 95 percent of its
distance by 0.46 of the duration, so "65 percent of the beat" is 0.3 of `dur`. Start the next beat at
100 percent and the dot sits still for 0.2 s, which is the template feel this move removes. A later
beat on the same property needs a keyframe with no `from` and `fill: 'forwards'`; a `from` fills
backwards over the earlier beat and wipes it. Hand off the element, not the idea: if beat B brings a
new object, the chain is broken.

Looks (ground, type, radius, accent) live in `demo/demo.css`; this snippet keeps neutral tokens.
