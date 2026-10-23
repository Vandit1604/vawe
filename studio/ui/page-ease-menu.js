// studio/ui/page-ease-menu.js: the ease picker. Every named ease shows its curve with a dot that runs along it
// and a box that moves with it over the element's own duration. Hovering or focusing an ease calls onTry(name)
// and leaving the list calls onRestore(): the studio previews it without writing. Picking calls onPick(name).
import { h } from './dom.js';
import { easeOptions, curveSamples, curveRange, curvePath, plotAt, loopProgress, NAMED } from './page-eases.js';

const NS = 'http://www.w3.org/2000/svg';
const svg = (tag, attrs = {}) => {
  const el = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  return el;
};
const W = 72, TRACK = 38;
const MIN_LOOP_S = 0.3;
export const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

function curveEl(name) {
  const samples = curveSamples(name);
  const range = curveRange(samples);
  const dot = svg('circle', { r: 2.6, class: 'dot' });
  const box = svg('rect', { width: 7, height: 7, y: TRACK - 3.5, rx: 1.5, class: 'box' });
  const root = svg('svg', { viewBox: `0 0 ${W} 44`, width: W, height: 44, 'aria-hidden': 'true' });
  root.append(svg('path', { d: curvePath(samples), class: 'curve' }), svg('line', { x1: 3, x2: W - 3, y1: TRACK, y2: TRACK, class: 'track' }), dot, box);
  const at = (u) => {
    const v = samples[Math.round(u * (samples.length - 1))][1];
    const [x, y] = plotAt(u, v, range);
    dot.setAttribute('cx', x.toFixed(1)); dot.setAttribute('cy', y.toFixed(1));
    box.setAttribute('x', (plotAt((v - range.lo) / (range.hi - range.lo), 0, range)[0] - 3.5).toFixed(1));
  };
  at(1);
  return { root, at };
}

export function easeMenu({ current, durationS, onPick, onTry = null, onRestore = null }) {
  const options = easeOptions(current);
  const picked = options.find((o) => o.selected);
  const motions = [];
  const items = options.map((o) => {
    const named = NAMED.includes(o.value);
    const curve = named ? curveEl(o.value) : null;
    if (curve) motions.push(curve.at);
    const [name, ...hint] = o.label.split(': ');
    return h('li', { role: 'option', tabindex: '-1', 'aria-selected': String(o.selected), 'data-value': o.value },
      curve?.root, h('span', { class: 'what' }, h('b', {}, named ? name : o.label), named ? h('small', {}, hint.join(': '), ` · ${durationS.toFixed(2)} s`) : null));
  });
  const list = h('ul', { class: 'easelist', role: 'listbox', 'aria-label': 'ease', hidden: true }, ...items);
  const button = h('button', { type: 'button', class: 'easebtn', 'aria-haspopup': 'listbox', 'aria-expanded': 'false' }, picked.custom ? picked.label : picked.value);
  const root = h('div', { class: 'easemenu' }, button, list);
  let raf = 0;

  const loop = (now) => {
    const u = loopProgress(now / 1000, Math.max(durationS, MIN_LOOP_S));
    for (const at of motions) at(u);
    raf = requestAnimationFrame(loop);
  };
  const close = () => {
    if (list.hidden) return;
    list.hidden = true;
    button.setAttribute('aria-expanded', 'false');
    cancelAnimationFrame(raf);
    onRestore?.();
  };
  const open = () => {
    list.hidden = false;
    button.setAttribute('aria-expanded', 'true');
    if (!reducedMotion()) raf = requestAnimationFrame(loop);
    (items.find((li) => li.getAttribute('aria-selected') === 'true') || items[0]).focus();
  };
  const tryItem = (li) => { if (NAMED.includes(li.dataset.value)) onTry?.(li.dataset.value); };

  button.addEventListener('click', () => (list.hidden ? open() : close()));
  list.addEventListener('mouseleave', () => onRestore?.());
  for (const li of items) {
    li.addEventListener('mouseenter', () => tryItem(li));
    li.addEventListener('focus', () => tryItem(li));
    li.addEventListener('click', () => { if (NAMED.includes(li.dataset.value)) { list.hidden = true; cancelAnimationFrame(raf); onPick(li.dataset.value); } else close(); });
  }
  list.addEventListener('keydown', (e) => {
    const i = items.indexOf(document.activeElement);
    if (e.key === 'ArrowDown') items[Math.min(items.length - 1, i + 1)].focus();
    else if (e.key === 'ArrowUp') items[Math.max(0, i - 1)].focus();
    else if (e.key === 'Enter' || e.key === ' ') document.activeElement.click();
    else if (e.key === 'Escape') { close(); button.focus(); }
    else return;
    e.preventDefault();
  });
  root.addEventListener('focusout', (e) => { if (!root.contains(e.relatedTarget)) close(); });
  return root;
}
