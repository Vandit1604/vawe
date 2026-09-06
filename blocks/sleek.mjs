// blocks/sleek.mjs. The SLEEK SURFACE library: glassy, mesh, spotlit, grain, bento. Modern-web card
// treatments that read premium under the determinism reset. The rule (docs/MISTAKES.md): a block holds
// only STATIC CSS; anything that MOVES comes from a Phase-2 engine effect (a `beam` layer for the border
// beam, an `aurora` paint behind a glass panel), never a frozen CSS @keyframe. Colours are semantic theme
// vars so every brand reskins them; the theme owns the palette and `make audit` owns contrast.
//
// Each factory is PURE (props → array of scene-layer JSON), the same contract as blocks/ui.mjs. Compose in
// an authoring script or via `{ "type":"block", "block":"glassCard", ... }`, which expands at load
// (core/engine/expand.js), no separate step.
import { TOKENS as T, text } from './kit.mjs';
// The label this module's blocks are grouped under on the site. Declared HERE, in the module that owns
// the blocks, so nothing keeps a 176-row name-to-category table in sync by hand. A module that
// declares none is refused by scripts/site/blocks-json.mjs at generation time, not discovered later.
export const CATEGORY = 'Surfaces';


const WHITE_HAIR = 'rgba(255,255,255,0.14)';

// glassCard. A frosted glass panel: it BLURS whatever moves behind it (put an aurora/mesh/paint under it),
// a hairline white edge, a top sheen. The signature glassmorphism surface. Give it a living background.
export function glassCard({ x, y, w = 640, h = 360, title, desc, kicker, tint = 0.06,
  radius = 22, start = 0, dur = 4, anim = 'pop', enterDur = 0.5 } = {}) {
  return [{
    type: 'group', x, y, w, h, layout: 'column', items: 'flex-start', gap: 12, pad: 32,
    bg: `rgba(255,255,255,${tint})`, radius, border: `1.5px solid ${WHITE_HAIR}`, glass: 16,
    shadow: true, start, duration: dur, anim, enterDur, out: 'defocus', exitDur: 0.4,
    children: [
      // top sheen: a thin bright gradient bar reading as a light edge on glass
      { type: 'rect', w: w - 80, h: 2, bg: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.5), transparent)', radius: 0 },
      kicker && text({ text: kicker, font: 'mono', size: 22, weight: 600, color: 'var(--accent)', ls: '0.08em' }),
      title && text({ text: title, size: 52, weight: 700, color: '#fff', ls: '-0.02em' }),
      desc && text({ text: desc, font: 'serif', size: 28, weight: 400, color: 'rgba(255,255,255,0.72)', w: w - 80 }),
    ].filter(Boolean),
  }];
}

// meshPanel: a rounded panel whose fill is a soft MESH GRADIENT (stacked radial blobs in accent hues).
// Static (the drift version is the `aurora` paint field); use this as a calm branded surface behind copy.
export function meshPanel({ x, y, w = 720, h = 420, title, desc, radius = 26, start = 0, dur = 4,
  anim = 'scale', enterDur = 0.55 } = {}) {
  const mesh = [
    'radial-gradient(60% 60% at 15% 20%, color-mix(in srgb, var(--accent) 55%, transparent), transparent 70%)',
    'radial-gradient(55% 55% at 85% 15%, color-mix(in srgb, var(--accent-glow, var(--accent)) 40%, transparent), transparent 68%)',
    'radial-gradient(70% 70% at 70% 90%, color-mix(in srgb, var(--accent) 30%, transparent), transparent 72%)',
    'linear-gradient(135deg, var(--surface-2), var(--card))',
  ].join(', ');
  return [{
    type: 'group', x, y, w, h, layout: 'column', items: 'flex-start', gap: 16, pad: 48,
    bg: mesh, radius, border: `1.5px solid var(--line)`, start, duration: dur, anim, enterDur,
    out: 'defocus', exitDur: 0.4, children: [
      title && text({ text: title, size: 56, weight: 800, color: '#fff', ls: '-0.02em' }),
      desc && text({ text: desc, size: 30, weight: 500, color: 'rgba(255,255,255,0.85)', w: w - 92 }),
    ].filter(Boolean),
  }];
}

// spotlightCard: a dark card with a soft SPOTLIGHT glow washing down from a corner (a radial highlight
// over a dark surface). Stages a single hero line; the light directs the eye. Pair `from` to aim it.
export function spotlightCard({ x, y, w = 640, h = 360, title, desc, from = 'top', radius = 22,
  start = 0, dur = 4, anim = 'pop', enterDur = 0.5 } = {}) {
  const at = { top: '50% -10%', 'top-left': '12% -5%', 'top-right': '88% -5%', center: '50% 30%' }[from] || '50% -10%';
  const bg = `radial-gradient(120% 90% at ${at}, color-mix(in srgb, var(--accent) 26%, transparent), transparent 60%), ` +
    `linear-gradient(180deg, var(--surface-2), color-mix(in srgb, var(--bg) 80%, black))`;
  return [{
    type: 'group', x, y, w, h, layout: 'column', items: 'flex-start', gap: 12, pad: 48,
    bg, radius, border: `1.5px solid ${WHITE_HAIR}`, shadow: true, start, duration: dur, anim, enterDur,
    out: 'defocus', exitDur: 0.4, children: [
      title && text({ text: title, size: 54, weight: 700, color: '#fff', ls: '-0.02em' }),
      desc && text({ text: desc, font: 'serif', size: 28, weight: 400, color: 'rgba(255,255,255,0.7)', w: w - 84 }),
    ].filter(Boolean),
  }];
}

// borderBeamCard: a card with a light TRAVELLING its border (the animated Phase-2 `beam` layer over a
// glass panel). The one sleek surface that MOVES. Returns [panel, content group, beam] so the beam sits on top.
export function borderBeamCard({ x, y, w = 640, h = 300, title, desc, radius = 22, thickness = 2.5,
  speed = 0.55, start = 0, dur = 4 } = {}) {
  return [
    { type: 'group', x, y, w, h, layout: 'column', items: 'flex-start', gap: 12, pad: 48, justify: 'center',
      bg: 'rgba(255,255,255,0.04)', radius, border: `1.5px solid ${WHITE_HAIR}`, glass: 12,
      start, duration: dur, anim: 'pop', enterDur: 0.5, out: 'defocus', exitDur: 0.4, children: [
        title && text({ text: title, size: 46, weight: 700, color: '#fff', ls: '-0.02em' }),
        desc && text({ text: desc, font: 'mono', size: 26, weight: 500, color: 'rgba(255,255,255,0.7)', w: w - 84 }),
      ].filter(Boolean) },
    { type: 'beam', x, y, w, h, radius, thickness, tail: 90, speed, glow: 0.6, start: start + 0.2, duration: dur - 0.2 },
  ];
}

// grainOverlay: a fine FILM GRAIN texture over the frame or a region (feTurbulence, screen-blended, low
// opacity). The finishing touch that lifts flat digital gradients into something shot. Static, pure in n.
export function grainOverlay({ x = 0, y = 0, w = 1080, h = 1920, opacity = 0.08, freq = 0.9,
  start = 0, dur = 4 } = {}) {
  const svg = `data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='140' height='140'>` +
    `<filter id='n'><feTurbulence type='fractalNoise' baseFrequency='${freq}' numOctaves='2' stitchTiles='stitch'/>` +
    `</filter><rect width='140' height='140' filter='url(%23n)'/></svg>`;
  return [{ type: 'rect', x, y, w, h, bg: `url("${svg}")`, opacity, blend: 'overlay', start, duration: dur, track: 9 }];
}

// bento. An asymmetric BENTO grid: one hero cell + supporting cells, sizes deliberately unequal (scale
// contrast, not a uniform card grid. The AI-slop tell the taste system fights). `cells` are placed into a
// 2-col layout with the first spanning tall. Each cell = { title, desc, kind:'glass'|'mesh'|'spotlight' }.
export function bento({ x, y, w = 900, h = 560, gap = 20, cells = [], start = 0, dur = 5 } = {}) {
  const colW = (w - gap) / 2, out = [];
  const mk = (kind, o) => (kind === 'mesh' ? meshPanel : kind === 'spotlight' ? spotlightCard : glassCard)(o);
  // hero: left column, full height. remaining cells stack in the right column.
  if (cells[0]) out.push(...mk(cells[0].kind, { x, y, w: colW, h, title: cells[0].title, desc: cells[0].desc, kicker: cells[0].kicker, start, dur, enterDur: 0.55 }));
  const rest = cells.slice(1);
  const cellH = rest.length ? (h - gap * (rest.length - 1)) / rest.length : h;
  rest.forEach((c, i) => {
    out.push(...mk(c.kind, { x: x + colW + gap, y: y + i * (cellH + gap), w: colW, h: cellH, title: c.title, desc: c.desc, kicker: c.kicker, start: start + 0.25 + i * 0.18, dur: dur - 0.25 - i * 0.18, enterDur: 0.5 }));
  });
  return out;
}

// ─────────────────────────────────────────────────────────────────────────────
// THE OPTION CONTRACT for this file's families. Vocabulary and checker: blocks/schema.mjs.
// x · y · start · dur are excluded from every table: the scene supplies them, an author does not dial them.
//
// These surfaces are white-on-dark by construction (the copy is '#fff' at every size), so they want a
// living background under them. That is a scene decision, not a dial, and it is why there is no `bg`.
export const SLEEK_SCHEMAS = {
  glassCard: {
    w: { kind: 'int', min: 160, max: 1920, def: 640 },
    h: { kind: 'int', min: 120, max: 1080, def: 360 },
    title: { kind: 'str', max: 60 },
    desc: { kind: 'str', max: 200 },
    kicker: { kind: 'str', max: 40 },
    // How milky the glass is. 0 is clear and the panel is only its edge and its blur; 1 is opaque
    // white and the backdrop it exists to blur stops reading at all.
    tint: { kind: 'unit', def: 0.06 },
    radius: { kind: 'int', min: 0, max: 200, def: 22 },
    anim: { kind: 'str', max: 24, def: 'pop' },
    enterDur: { kind: 'num', min: 0, max: 4, def: 0.5 },
  },

  meshPanel: {
    w: { kind: 'int', min: 160, max: 1920, def: 720 },
    h: { kind: 'int', min: 120, max: 1080, def: 420 },
    title: { kind: 'str', max: 60 },
    desc: { kind: 'str', max: 200 },
    radius: { kind: 'int', min: 0, max: 200, def: 26 },
    anim: { kind: 'str', max: 24, def: 'scale' },
    enterDur: { kind: 'num', min: 0, max: 4, def: 0.55 },
  },

  spotlightCard: {
    w: { kind: 'int', min: 160, max: 1920, def: 640 },
    h: { kind: 'int', min: 120, max: 1080, def: 360 },
    title: { kind: 'str', max: 60 },
    desc: { kind: 'str', max: 200 },
    // Where the light comes from. Anything else falls back to `top`.
    from: { kind: 'enum', of: ['top', 'top-left', 'top-right', 'center'], def: 'top' },
    radius: { kind: 'int', min: 0, max: 200, def: 22 },
    anim: { kind: 'str', max: 24, def: 'pop' },
    enterDur: { kind: 'num', min: 0, max: 4, def: 0.5 },
  },

  borderBeamCard: {
    w: { kind: 'int', min: 160, max: 1920, def: 640 },
    h: { kind: 'int', min: 120, max: 1080, def: 300 },
    title: { kind: 'str', max: 60 },
    desc: { kind: 'str', max: 200 },
    radius: { kind: 'int', min: 0, max: 200, def: 22 },
    // The travelling light's stroke width and its speed along the border.
    thickness: { kind: 'num', min: 0.5, max: 20, def: 2.5 },
    speed: { kind: 'num', min: 0, max: 5, def: 0.55 },
  },

  grainOverlay: {
    // This one is a full-frame overlay, so its box defaults to the portrait stage rather than a card.
    w: { kind: 'int', min: 1, max: 4000, def: 1080 },
    h: { kind: 'int', min: 1, max: 4000, def: 1920 },
    // Overlay-blended noise. Past about 0.2 the grain stops being a finish and becomes the picture.
    opacity: { kind: 'unit', def: 0.08 },
    // feTurbulence baseFrequency: low is coarse cloud, high is fine sand.
    freq: { kind: 'num', min: 0.05, max: 4, def: 0.9 },
  },

  bento: {
    w: { kind: 'int', min: 200, max: 1920, def: 900 },
    h: { kind: 'int', min: 160, max: 1080, def: 560 },
    gap: { kind: 'int', min: 0, max: 200, def: 20 },
    // The first cell is the hero and takes the left column at full height; the rest stack on the
    // right. Each cell picks which sleek surface draws it.
    cells: { kind: 'list', of: { kind: 'row', fields: {
      kind: { kind: 'enum', of: ['glass', 'mesh', 'spotlight'] },
      title: { kind: 'str', max: 60 },
      desc: { kind: 'str', max: 200 },
      kicker: { kind: 'str', max: 40 },
    } }, def: [] },
  },
};
