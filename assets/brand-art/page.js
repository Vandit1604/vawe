import { paint } from './art.js';

const LOCKUP = '<svg viewBox="8 3 217 56" aria-label="vawe"><path fill="currentColor" d="M8 19h25v8h-25zM41 19h15v8h-15zM20 32h13v8h-13zM41 32h15v8h-15zM8 45h25v8h-25zM41 45h15v8h-15zM32 3H42V10L38 14V59H36V14L32 10z"/><path fill="currentColor" d="M84.41 53L72 19L80.59 19L89.25 44.79L97.91 19L106.51 19L94.09 53ZM119.18 53.76Q113.83 53.76 110.58 51.31Q107.33 48.86 107.33 44.47Q107.33 40.07 110.07 37.59Q112.81 35.11 118.41 34.03L129.68 31.8Q129.68 28.17 128.03 26.35Q126.37 24.540 123.12 24.54Q120.2 24.54 118.51 25.91Q116.82 27.28 116.18 29.82L107.91 29.44Q108.93 24.03 112.87 21.13Q116.82 18.24 123.12 18.24Q130.38 18.24 134.11 21.9Q137.83 25.56 137.83 32.37L137.830 44.72Q137.83 46.06 138.31 46.57Q138.79 47.08 139.74 47.08L140.82 47.08L140.82 53Q140.44 53.13 139.58 53.19Q138.72 53.25 137.83 53.25Q135.73 53.25 134.08 52.59Q132.42 51.92 131.53 50.2Q131.02 49.24 130.76 47.78Q130.19 48.99 129.17 50.07Q127.45 51.85 124.91 52.81Q122.36 53.76 119.18 53.76ZM120.83 47.84Q123.57 47.84 125.54 46.76Q127.52 45.68 128.6 43.77Q129.68 41.86 129.68 39.25L129.68 37.34L120.9 39.12Q118.16 39.69 116.98 40.81Q115.8 41.920 115.8 43.7Q115.8 45.68 117.11 46.76Q118.41 47.84 120.83 47.84ZM150.18 53L139.93 19L148.27 19L154.9 43.77L161.71 19L168.84 19L175.72 43.77L182.34 19L190.68 19L180.43 53L172.02 53L165.27 30.21L158.59 53ZM208.12 53.76Q203.03 53.76 199.27 51.57Q195.52 49.37 193.48 45.36Q191.44 41.35 191.44 36Q191.44 30.65 193.48 26.67Q195.52 22.69 199.24 20.46Q202.97 18.24 207.93 18.24Q212.77 18.24 216.43 20.4Q220.09 22.57 222.07 26.64Q224.04 30.72 224.04 36.45L224.04 38.29L199.91 38.29Q200.17 42.75 202.36 45.01Q204.56 47.27 208.19 47.27Q210.93 47.27 212.74 46.03Q214.56 44.79 215.26 42.56L223.6 43.07Q222.2 48.03 218.09 50.9Q213.98 53.76 208.12 53.76ZM199.91 32.82L215.64 32.82Q215.38 28.68 213.28 26.67Q211.18 24.67 207.93 24.67Q204.69 24.67 202.55 26.77Q200.42 28.87 199.91 32.82Z"/></svg>';

const COPY = {
  concept: { h: 'One HTML page in.<br>One film out.', sub: 'The open-source motion graphics framework for coding agents.', mono: 'npx skills add vawe-hq/skills' },
  og: { h: 'Motion graphics<br>your agent writes.', sub: 'HTML, CSS and Web Animations in.<br>A deterministic mp4 out.', mono: 'vawe.dev' },
  post: { h: 'Agents write pages.<br>vawe makes them films.', sub: 'Open-source HTML to mp4, rendered frame by frame.<br>The same page gives the same frames.', mono: 'github.com/vawe-hq/vawe' },
  square: { h: 'Write a page.<br>Ship a film.', sub: 'Open-source HTML to mp4, made for coding agents.', mono: 'vawe.dev' },
  skills: { h: 'Teach your agent to make films.', sub: 'Skills that brief, write, critique<br>and render a vawe film.', mono: 'npx skills add vawe-hq/skills' },
  org: { h: 'Films, written<br>as web pages.', sub: 'Open source. One HTML page in, one mp4 out, for Claude Code, Codex and Cursor.', mono: 'vawe.dev  ·  github.com/vawe-hq' },
};

const BANNER = {
  lanes: {
    f: 0.95, vx: 0.62, vy: 0.42, figZ: 1.6,
    towers: [
      { o: [0.95, -0.3], q: [1, -1], zn: 1.3, zf: 3.4 },
      { o: [1.0, 0.25], q: [1, 1], zn: 1.2, zf: 3.6 },
      { o: [-0.8, -0.6], q: [-1, -1], zn: 1, zf: 2.3 },
      { o: [0.55, -0.7], q: [1, -1], zn: 1, zf: 2.8 },
      { o: [-0.85, 0.8], q: [-1, 1], zn: 1, zf: 2.0 },
      { o: [0.5, 0.55], q: [1, 1], zn: 1, zf: 2.5 },
    ],
  },
  pages: {
    f: 0.9, vx: 0.71, vy: 0.5, frameW: 1.2, bridge: ['s6', 's3'], bridgeZ: 2.6, bridgeY: 0.07, figU: 0.5, figH: 0.07,
    stacks: [
      { id: 's1', r: [-0.42, -1.0, -0.12, -0.36], zt: 1.45 },
      { id: 's2', r: [0.1, -1.0, 0.66, -0.32], zt: 1.8 },
      { id: 's3', r: [0.3, -0.24, 0.86, 0.3], zt: 1.5 },
      { id: 's4', r: [0.14, 0.4, 0.9, 1.0], zt: 1.65 },
      { id: 's5', r: [-0.44, 0.36, -0.1, 1.0], zt: 2.0 },
      { id: 's6', r: [-0.4, -0.26, -0.18, 0.26], zt: 1.9 },
    ],
  },
  strip: { f: 0.95, vy: 0.44, camY: 0.32, pageEnd: 1.6, pageW: 0.56, vx: 0.71, gates: [2.6, 4, 6.2, 9.5], figZ: 1.9, figH: 0.075 },
};

const OVERRIDE = {
  square: { strip: { vx: 0.6, vy: 0.66, gates: [4, 6.2, 9.5], figZ: 2.1 } },
  post: { strip: { vx: 0.73 } },
};

const q = new URLSearchParams(location.search);
const scene = q.get('scene') || 'lanes';
const ink = q.get('ink') || 'a';
const format = document.body.dataset.format;
const copy = COPY[q.get('copy') || 'concept'];
document.documentElement.dataset.ink = ink;

const box = document.getElementById('copy');
box.innerHTML = `<div class="lockup">${LOCKUP}</div><h1>${copy.h}</h1><p class="sub">${copy.sub}</p><p class="mono"><span>${copy.mono}</span></p>`;

let done = false;
function render() {
  if (done) return;
  done = true;
  const canvas = document.getElementById('art');
  canvas.width = window.vawe?.width || innerWidth;
  canvas.height = window.vawe?.height || innerHeight;
  const r = box.getBoundingClientRect();
  paint(canvas, { scene, ink, lay: { ...BANNER[scene], ...OVERRIDE[format]?.[scene] }, rects: [{ x: r.x, y: r.y, w: r.width, h: r.height }] });
}

window.seek = render;
if (!window.__pageClock) document.fonts.ready.then(render);
