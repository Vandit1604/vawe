# Caret typing

**Use when** a command, a prompt or a name is typed in. The caret is the next flex item, so it moves
with each character; when the typing ends the same caret becomes the next element (here the rule
under the word), so nothing new enters. Monospace type makes `ch` exact. Clip:
[caret-typing.mp4](caret-typing.mp4). Demo: [demo/caret-typing.html](demo/caret-typing.html).

```css
.type { display: inline-flex; align-items: center; font-family: ui-monospace, Menlo, monospace; }
.text { overflow: hidden; white-space: nowrap; width: 0;
        animation-name: type; animation-duration: 0.5s; animation-delay: var(--beat-1);
        animation-timing-function: steps(9, end); animation-fill-mode: both; }   /* 9 = characters */
.caret { position: relative; width: 0.08em; height: 1em; margin-left: 0.06em; background: var(--accent);
         animation-name: spread, drop; animation-duration: 0.35s, 0.16s;
         animation-delay: calc(var(--beat-1) + 0.55s), calc(var(--beat-1) + 0.55s);
         animation-timing-function: var(--settle), var(--settle); animation-fill-mode: both, both; }
@keyframes type { to { width: 9ch; } }
@keyframes drop { to { height: 0.12em; top: 0.64em; } }               /* first: thin and below the letters */
@keyframes spread { to { width: 9ch; translate: calc(-9ch - 0.06em) 0; } }
```

```html
<div class="type"><span class="text">vawe ship</span><span class="caret"></span></div>
<script type="module">
import { curveToLinear, CURVES } from '../../core/motion/springs.js';
document.documentElement.style.setProperty('--settle', curveToLinear(CURVES.expoOut));
</script>
```

Sound: pluck at --beat-1 (the first character) and at --beat-1 + 0.5 s (the last character) (default gain); never one per character.

Looks (ground, type, radius, accent) live in `demo/demo.css`; this snippet keeps neutral tokens.
