import { paint } from './art.js';
import { LOCKUP } from './lockup.js';
import { cardFor } from './cards.js';

// One share card per site page (?route=/easing) or blog post (?post=<slug>). A page has its own scene, composition
// and ink; a post gets its topic's scene, varied by a seed from its slug, so no two posts print the same. On a page
// marked data-loop, seek(t) paints frame t of a seamless loop as long as the duration meta.

const c = cardFor(new URLSearchParams(location.search));
document.documentElement.dataset.ink = c.ink;
document.body.dataset.kind = c.kind;
const box = document.getElementById('copy');
box.innerHTML = `<div class="lockup">${LOCKUP}</div>${c.html}`;

const loop = 'loop' in document.body.dataset;
const T = Number(document.querySelector('meta[name="duration"]').content);

let done = false;
function render(t = 0) {
  if (done && !loop) return;
  done = true;
  const canvas = document.getElementById('art');
  canvas.width = window.vawe?.width || innerWidth;
  canvas.height = window.vawe?.height || innerHeight;
  const r = box.getBoundingClientRect(), p = (t % T) / T;
  const lay = loop ? { ...c.lay, ...c.loop(p) } : c.lay;
  paint(canvas, { scene: c.scene, ink: c.ink, lay, rects: [{ x: r.x, y: r.y, w: r.width, h: r.height }], seed: c.seed, phase: loop ? 2 * Math.PI * p : undefined });
}

window.seek = render;
if (!window.__pageClock) document.fonts.ready.then(() => render());
