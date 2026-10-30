import { paint } from './art.js';
import { LOCKUP } from './lockup.js';

const COPY = {
  concept: { h: 'One HTML page in.<br>One film out.', sub: 'The open-source motion graphics framework for coding agents.', mono: 'npx skills add vawe-hq/skills' },
  og: { h: 'Motion graphics<br>your agent writes.', sub: 'HTML, CSS and Web Animations in.<br>A deterministic mp4 out.', mono: 'vawe.dev' },
  post: { h: 'Agents write pages.<br>vawe makes them films.', sub: 'Open-source HTML to mp4, rendered frame by frame.<br>The same page gives the same frames.', mono: 'github.com/vawe-hq/vawe' },
  square: { h: 'Write a page.<br>Ship a film.', sub: 'Open-source HTML to mp4, made for coding agents.', mono: 'vawe.dev' },
  skills: { h: 'Teach your agent to make films.', sub: 'Skills that brief, write, critique<br>and render a vawe film.', mono: 'npx skills add vawe-hq/skills' },
  stair: { h: 'Teach your agent<br>to make films.', sub: 'Six skills from a film request to a brief,<br>a page, a critique and a re-render.', mono: 'npx skills add vawe-hq/skills' },
  search: { h: 'Awesome AI<br>search visibility.', sub: 'How AI answer engines and coding agents<br>find and cite a site, with the evidence.', mono: 'github.com/vawe-hq/awesome-ai-search-visibility', measure: '960px' },
  catalog: { h: 'Awesome agent<br>skills directories.', sub: 'Where to list agent skills and plugins,<br>with the steps to get listed.', mono: 'github.com/vawe-hq/awesome-agent-skills-directories', measure: '1060px' },
  cinema: { h: 'Awesome<br>agent video.', sub: 'Tools and references for making video<br>with code and coding agents.', mono: 'github.com/vawe-hq/awesome-agent-video' },
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
  stair: {
    f: 0.95, vx: 0.66, vy: 0.6, cardW: 0.22, cardH: 0.32, depth: 0.25, starUp: 0.6, figStep: 1, figU: 0.55, figH: 0.06,
    steps: [[-0.1, 0.3, 1.2], [0.05, 0.08, 1.5], [0.2, -0.16, 1.85], [0.35, -0.42, 2.25], [0.5, -0.7, 2.7], [0.65, -1.0, 3.2]],
  },
  search: {
    f: 0.9, vx: 0.66, vy: 0.5, camY: 0.42, z0: 1.7, zg: 1.08, rows: 40, cols: 22, pitch: 0.4, tall: 1.4, crawlers: 22, figH: 0.07, fig: [0.3, 1.9], left: 0.56, groundX: -0.15, fog: 0.42, fogZ: 14,
    haze: [[0.62, 0.5, 0.5], [0.8, 0.6, 0.55], [0.98, 0.5, 0.5]],
    cited: { x: 0.5, z: 3.2, w: 0.26, h: 0.95 }, citedFrom: [0.0, 0.42, 2.0],
    beams: [{ x: -0.2, y: 0.3, z: 5, a: -1.95, w: 0.022 }, { x: 2.4, y: 0.5, z: 6, a: -1.25, w: 0.022 }, { x: 1.2, y: 0.2, z: 11, a: -1.62, w: 0.018 }],
  },
  catalog: {
    f: 0.9, vx: 0.6, vy: 0.55, floorY: 0.5, rowH: 0.3, colZ: 0.55, rows: 24, rightX: 0.75, leftX: 2.2, leftV: 0.24, open: [0, 2], pull: 0.6,
    cards: 11, figX: 0.0, figZ: 1.72, figH: 0.075, lane: [-0.14, 0.24], starDX: 0, starUp: 0.12,
  },
  cinema: {
    f: 0.9, vx: 0.56, vy: 0.5, floorY: 0.55, curtain: 0.12, lens: [0.12, 0.47, 1.3], fig: [0.1, 1.22], figH: 0.075, aisle: 0.12, rowGap: 0.12,
    seats: [0.25, 3.2], starUV: [0.55, 0.32], screen: { x0: 0.6, z0: 3.2, x1: 3.6, z1: 6.0, top: -1.5, bot: 0.15 },
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
if (copy.measure) box.style.setProperty('--measure', copy.measure);
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
