# Split-flap resolve

**Use when** a name, a number or a status is decided on screen: a departure board, a counter, a
model name locking in. Each letter is a cell one glyph tall that clips a column of glyphs; `steps()`
flips through the column and stops on the last one, the real letter, left to right. Clip:
[flap-resolve.mp4](flap-resolve.mp4). Demo: [demo/flap-resolve.html](demo/flap-resolve.html).

```html
<h1>Resolve</h1>
<style>
  h1 { display: flex; gap: 0.04em; line-height: 1; text-transform: uppercase; }
  .cell { overflow: hidden; height: 1em; }
  .cell span { display: block; width: max-content; height: 1em; margin: 0 auto; }
</style>
<script type="module">
import { rng } from '../../core/motion/springs.js';
const h1 = document.querySelector('h1'), pool = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789', flips = 8;
const rand = rng(7);   // seeded: the same glyphs on every render
const cells = [...h1.textContent].map((ch) => {
  const cell = document.createElement('div'), col = document.createElement('div');
  cell.className = 'cell';
  for (let i = 0; i < flips; i++) col.append(Object.assign(document.createElement('span'), { textContent: pool[Math.floor(rand() * pool.length)] }));
  col.append(Object.assign(document.createElement('span'), { textContent: ch }));
  cell.append(col);
  return cell;
});
h1.replaceChildren(...cells);
cells.forEach((cell) => { cell.style.width = `${cell.firstChild.lastChild.getBoundingClientRect().width}px`; });
cells.forEach((cell, i) => cell.firstChild.animate(
  [{ translate: '0 0' }, { translate: `0 -${flips}em` }],
  { duration: flips * 55, delay: 100 + i * 60, easing: `steps(${flips}, end)`, fill: 'both' },
));
</script>
```

Each cell is fixed to its final glyph's width, so the word does not breathe while an M flips past
an I. 55 ms per flip is a real flap board; 60 ms between cells resolves the word in reading order,
and every cell runs the same eight flips, so the last letter lands 360 ms after the first. Uppercase
keeps every glyph the same height. Use `rng` from springs.js, never `Math.random`: the render seeks
frames in any order and the glyphs must not change between them.
