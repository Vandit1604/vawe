# Calm lockup

**Use when** the film ends quietly: the logo and one line settle slowly while the world under them
keeps moving. Nothing lands hard. The brand settles over 1 s with a blur that clears, the line
follows 140 ms later, and two soft lights drift behind a lockup that floats 2 percent larger over
the clip. Clip: [calm-lockup.mp4](calm-lockup.mp4). Demo: [demo/calm-lockup.html](demo/calm-lockup.html).

```html
<div class="light l1"></div><div class="light l2"></div>
<div class="lockup"><div class="brand">...mark and name...</div><p class="line">One page in. One film out.</p></div>
<div class="grain"></div>
<style>
.light { position: absolute; width: 90vh; height: 90vh; border-radius: 50%; }
.l1 { background: radial-gradient(closest-side, rgba(10,135,255,0.16), rgba(10,135,255,0)); }
.l2 { background: radial-gradient(closest-side, rgba(255,255,255,0.07), rgba(255,255,255,0)); }
.grain { position: absolute; inset: 0; opacity: 0.05; mix-blend-mode: screen; /* an feTurbulence tile as a data URI */ }
</style>
<script type="module">
import { curveToLinear, CURVES } from '../../core/motion/springs.js';
const settle = curveToLinear(CURVES.expoOut);
[['.brand', 60], ['.line', 200]].forEach(([sel, at]) => {
  q(sel).animate([{ translate: '0 2.2vh', filter: 'blur(8px)' }, { translate: '0 0', filter: 'blur(0px)' }], { duration: 1000, delay: at, easing: settle, fill: 'both' });
  q(sel).animate([{ opacity: 0 }, { opacity: 1 }], { duration: 220, delay: at, easing: 'linear', fill: 'both' });
});
q('.l1').animate([{ translate: '0 0' }, { translate: '14vw 9vh' }], { duration: 2000, easing: 'linear', fill: 'both' });
q('.l2').animate([{ translate: '0 0' }, { translate: '-12vw -8vh' }], { duration: 2000, easing: 'linear', fill: 'both' });
q('.lockup').animate([{ scale: 1 }, { scale: 1.02 }], { duration: 2000, easing: 'linear', fill: 'both' });
</script>
```

This is the gravity band (0.5 to 0.8 s and up): the entrance is long and small, 2.2vh of travel,
so it settles and does not arrive. Opposite drifts on the two lights read as depth. The lights are
radial gradients that end at zero alpha, so there is no edge to band; the 5 percent grain hides
the steps in the dark. The line is 7.6vh, cap height above 5 percent. Never freeze the lockup: the
drift is what separates this from a held logo.
