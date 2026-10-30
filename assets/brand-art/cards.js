import { rng } from './art.js';

// The share-card system: each site page's scene, composition, ink and copy; each blog topic's scene and how a post's
// slug varies it. card.js paints a still from it, loop.js a seamless loop.

export const PAGES = {
  '/blog': {
    scene: 'pages', ink: 'a',
    h: 'Notes from building vawe, with the numbers.',
    sub: 'What broke, what we measured<br>and what we changed.',
    lay: {
      f: 0.9, vx: 0.76, vy: 0.5, frameW: 1.1, bridge: ['s6', 's3'], bridgeZ: 2.6, bridgeY: 0.07, figU: 0.5, figH: 0.07,
      stacks: [
        { id: 's1', r: [-0.3, -1.0, 0.0, -0.4], zt: 1.5 },
        { id: 's2', r: [0.14, -1.0, 0.62, -0.34], zt: 1.85 },
        { id: 's3', r: [0.3, -0.22, 0.8, 0.28], zt: 1.55 },
        { id: 's4', r: [0.12, 0.42, 0.62, 1.0], zt: 1.7 },
        { id: 's5', r: [-0.34, 0.38, -0.04, 1.0], zt: 2.0 },
        { id: 's6', r: [-0.32, -0.24, -0.12, 0.26], zt: 1.9 },
      ],
    },
    // The loop's moving parts at loop fraction p: the film below plays, a band of light crosses the stacks, the star
    // twinkles. calm keeps the band off the copy.
    loop: (p) => ({ play: p, sweep: p, twinkle: 1 + 0.35 * Math.sin(4 * Math.PI * p), calm: 0.08, feather: 0.14 }),
  },
  '/resources': {
    scene: 'catalog', ink: 'b',
    h: 'Resources for motion graphics by code.',
    sub: 'Easing curves, video components, files<br>for AI agents, guides and comparisons.',
    lay: {
      f: 0.9, vx: 0.7, vy: 0.5, floorY: 0.5, rowH: 0.26, colZ: 0.5, rows: 26, rightX: 0.62, leftX: 2.4, leftV: 0.2, open: [1, 3], pull: 0.5,
      cards: 9, figX: 0.1, figZ: 1.9, figH: 0.075, lane: [-0.06, 0.3], starDX: 0, starUp: 0.1,
    },
  },
  '/easing': {
    scene: 'ease', ink: 'a',
    h: 'Easing functions as CSS.',
    sub: 'Preview a curve, copy its cubic-bezier()<br>or linear(), compare three side by side.',
    lay: { f: 0.9, vx: 0.6, vy: 0.48, floorY: 0.62, origin: [0.0, 2.2], span: [1.55, 0.9], height: 1.5, track: 0.5, bez: [0.65, 0, 0.35, 1], frames: 21, figU: -0.03, figH: 0.075, starUp: 0.07 },
  },
};

// Blog posts: the topic picks the scene and its usual ink; the slug's seed varies the composition within safe ranges
// and prints about half of each topic's posts in the other ink.
export const TOPICS = {
  agents: { scene: 'stair', ink: 'b', vary: (R) => {
    const n = 4 + Math.floor(R() * 3), x0 = -0.14 + 0.1 * R(), dx = 0.08 + 0.12 * R(), rise = 0.18 + 0.14 * R(), grow = 1.15 + 0.15 * R();
    const bend = 0.12 * (R() - 0.5);
    return {
      f: 0.95, vx: 0.64 + 0.08 * R(), vy: 0.52 + 0.14 * R(), cardW: 0.18 + 0.07 * R(), cardH: 0.26 + 0.1 * R(), depth: 0.25,
      starUp: 0.4 + 0.3 * R(), figStep: Math.floor(R() * (n - 1)), figU: 0.3 + 0.4 * R(), figH: 0.06,
      steps: Array.from({ length: n }, (_, i) => [x0 + dx * i + bend * i * i, 0.3 - rise * i, 1.2 * grow ** i]),
    };
  } },
  determinism: { scene: 'strip', ink: 'a', vary: (R) => {
    const gates = Array.from({ length: 2 + Math.floor(R() * 4) }, () => 2.4 + 9 * R() ** 1.2);
    return { f: 0.85 + 0.15 * R(), vy: 0.38 + 0.1 * R(), camY: 0.28 + 0.08 * R(), pageEnd: 1.4 + 0.5 * R(), pageW: 0.4 + 0.2 * R(), vx: 0.68 + 0.08 * R(), gates, figZ: 1.9 + 0.6 * R(), figH: 0.075 };
  } },
  audio: { scene: 'wave', ink: 'b', vary: (R) => ({
    f: 0.9, vx: 0.66 + 0.08 * R(), vy: 0.44 + 0.12 * R(), floorY: 0.28 + 0.12 * R(), amp: 0.62 + 0.12 * R(), target: 0.62, step: 1.035 + 0.01 * R(),
    phase: R() * 6.28, beat: 2 + 3 * R(), left: [0.5, 2.2, 0.7], right: [0.42, 0.9, 0.96], fillZ: 0.7, road: 0.05, figZ: 1.5 + 0.4 * R(), figH: 0.07,
  }) },
  motion: { scene: 'ease', ink: 'a', vary: (R) => ({
    f: 0.9, vx: 0.6, vy: 0.48, floorY: 0.62, origin: [0.0, 2.2], span: [1.55, 0.9], height: 1.5, track: 0.5,
    bez: [0.15 + 0.7 * R(), -0.1 + 0.3 * R(), 0.15 + 0.7 * R(), 0.8 + 0.3 * R()], frames: 15 + Math.floor(R() * 9), figU: -0.03, figH: 0.075, starUp: 0.07,
  }) },
};

// The sample posts; a rollout reads title, section and topic from the post's front matter instead.
export const POSTS = {
  'advise-refuse': { title: 'AI agent guardrails: when a check should refuse', section: 'Agents', topic: 'agents' },
  'audio-as-written': { title: 'LUFS for video: set a loudness target in code', section: 'Motion and sound', topic: 'audio' },
  determinism: { title: 'Headless Chrome screenshots differ between runs: 6 fixes', section: 'Rendering', topic: 'determinism' },
  'weaker-model': { title: 'AI agent tooling: design for the weaker model', section: 'Agents', topic: 'agents' },
  'one-binary': { title: 'CLI design for AI agents: one binary, one verb per step', section: 'Agents', topic: 'agents' },
};

const OTHER = { a: 'b', b: 'a' };

function fnv1a(s) {
  let h = 0x811c9dc5;
  for (const ch of s) h = Math.imul(h ^ ch.charCodeAt(0), 0x01000193);
  return h >>> 0;
}

// The scene, ink, composition, seed and copy markup for ?route=<path> or ?post=<slug>.
export function cardFor(q) {
  const slug = q.get('post');
  if (slug) {
    const p = POSTS[slug], T = TOPICS[q.get('topic') || p.topic], seed = fnv1a(slug);
    return {
      kind: 'post', scene: T.scene, ink: q.get('ink') || (seed & 0x10000 ? OTHER[T.ink] : T.ink), lay: T.vary(rng(seed)), seed: seed % 9973,
      html: `<p class="kicker">Blog · ${p.section}</p><h1>${p.title}</h1><p class="mono"><span>vawe.dev/blog/${slug}</span></p>`,
    };
  }
  const route = q.get('route') || '/blog', P = PAGES[route];
  return {
    kind: 'page', scene: P.scene, ink: q.get('ink') || P.ink, lay: P.lay, loop: P.loop, seed: 7,
    html: `<h1>${P.h}</h1><p class="sub">${P.sub}</p><p class="mono"><span>vawe.dev${route}</span></p>`,
  };
}
