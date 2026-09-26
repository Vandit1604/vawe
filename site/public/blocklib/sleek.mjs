// blocks/sleek.mjs. The SLEEK SURFACE library: glassy, mesh, spotlit, grain, bento. Modern-web card
// treatments that read premium under the determinism reset. The rule (engine-doctrine/MISTAKES.md): a block holds
// only STATIC CSS; anything that MOVES comes from a Phase-2 engine effect (a `beam` layer for the border
// beam, an `aurora` paint behind a glass panel), never a frozen CSS @keyframe. Colours are semantic theme
// vars so every brand reskins them; the theme owns the palette and `make check GATE=audit` owns contrast.
//
// Each factory is PURE (props → array of scene-layer JSON), the same contract as blocks/ui.mjs. Compose in
// an authoring script or via `{ "type":"block", "block":"glassCard", ... }`, which expands at load
// (core/engine/expand.js), no separate step.
// The label this module's blocks are grouped under on the site. Declared HERE, in the module that owns
// the blocks, so nothing keeps a 176-row name-to-category table in sync by hand. A module that
// declares none is refused by scripts/site/blocks-json.mjs at generation time, not discovered later.
export const CATEGORY = 'Surfaces';

// The ground a PREVIEW of these blocks sits on (blocks/index.mjs `PREVIEW_BG_OF`). Every other family
// previews on `plain`, which is correct for an opaque block. These are frosted: `frost()` blurs what is
// BEHIND the panel, so over flat white there is nothing to blur and the panel reads as an empty washed
// box. That is not what the block does in a film, and a catalogue that shows a block doing nothing is
// worse than no catalogue.
export const PREVIEW_BG = 'aurora';



const WHITE_HAIR = 'rgba(255,255,255,0.14)';

// bento's three cell looks (glass / mesh / spotlight), inlined. These used to be their own exported
// blocks; cut because each was only a static styled `div` behind cardChrome-style layer props, no
// mechanism beyond markup a caller can write directly. `bento` still wants three distinct cell looks,
// so it keeps them as local builders rather than losing the visual variety.
function glassCell({ x, y, w = 640, h = 360, title, desc, kicker, tint = 0.06,
  radius = 22, start = 0, dur = 4, anim = 'pop', enterDur = 0.5 } = {}) {
  const html = `<div style="display:flex;flex-direction:column;align-items:flex-start;gap:12px;padding:32px;`
    + `box-sizing:border-box;width:${w}px;height:${h}px">`
    // top sheen: a thin bright gradient bar reading as a light edge on glass
    + `<div style="width:${w - 80}px;height:2px;background:linear-gradient(90deg, transparent, rgba(255,255,255,0.5), transparent)"></div>`
    + (kicker ? `<span style="font:600 22px var(--font-mono);color:var(--accent);letter-spacing:0.08em">${kicker}</span>` : '')
    + (title ? `<span style="font:700 52px var(--font-sans);color:#fff;letter-spacing:-0.02em">${title}</span>` : '')
    + (desc ? `<span style="font:400 28px var(--font-serif);color:rgba(255,255,255,0.72);width:${w - 80}px">${desc}</span>` : '')
    + '</div>';
  return [{
    type: 'html', x, y, w, h, html,
    bg: `rgba(255,255,255,${tint})`, radius, border: `1.5px solid ${WHITE_HAIR}`, glass: 16,
    shadow: true, start, duration: dur, anim, enterDur, out: 'defocus', exitDur: 0.4,
  }];
}

function meshCell({ x, y, w = 720, h = 420, title, desc, radius = 26, start = 0, dur = 4,
  anim = 'scale', enterDur = 0.55 } = {}) {
  const mesh = [
    'radial-gradient(60% 60% at 15% 20%, color-mix(in srgb, var(--accent) 55%, transparent), transparent 70%)',
    'radial-gradient(55% 55% at 85% 15%, color-mix(in srgb, var(--accent-glow, var(--accent)) 40%, transparent), transparent 68%)',
    'radial-gradient(70% 70% at 70% 90%, color-mix(in srgb, var(--accent) 30%, transparent), transparent 72%)',
    'linear-gradient(135deg, var(--surface-2), var(--card))',
  ].join(', ');
  const html = `<div style="display:flex;flex-direction:column;align-items:flex-start;gap:16px;padding:48px;`
    + `box-sizing:border-box;width:${w}px;height:${h}px">`
    + (title ? `<span style="font:800 56px var(--font-sans);color:#fff;letter-spacing:-0.02em">${title}</span>` : '')
    + (desc ? `<span style="font:500 30px var(--font-sans);color:rgba(255,255,255,0.85);width:${w - 92}px">${desc}</span>` : '')
    + '</div>';
  return [{
    type: 'html', x, y, w, h, html, bg: mesh, radius, border: `1.5px solid var(--line)`,
    start, duration: dur, anim, enterDur, out: 'defocus', exitDur: 0.4,
  }];
}

function spotlightCell({ x, y, w = 640, h = 360, title, desc, from = 'top', radius = 22,
  start = 0, dur = 4, anim = 'pop', enterDur = 0.5 } = {}) {
  const at = { top: '50% -10%', 'top-left': '12% -5%', 'top-right': '88% -5%', center: '50% 30%' }[from] || '50% -10%';
  const bg = `radial-gradient(120% 90% at ${at}, color-mix(in srgb, var(--accent) 26%, transparent), transparent 60%), ` +
    `linear-gradient(180deg, var(--surface-2), color-mix(in srgb, var(--bg) 80%, black))`;
  const html = `<div style="display:flex;flex-direction:column;align-items:flex-start;gap:12px;padding:48px;`
    + `box-sizing:border-box;width:${w}px;height:${h}px">`
    + (title ? `<span style="font:700 54px var(--font-sans);color:#fff;letter-spacing:-0.02em">${title}</span>` : '')
    + (desc ? `<span style="font:400 28px var(--font-serif);color:rgba(255,255,255,0.7);width:${w - 84}px">${desc}</span>` : '')
    + '</div>';
  return [{
    type: 'html', x, y, w, h, html, bg, radius, border: `1.5px solid ${WHITE_HAIR}`, shadow: true,
    start, duration: dur, anim, enterDur, out: 'defocus', exitDur: 0.4,
  }];
}

// borderBeamCard: a card with a light TRAVELLING its border (the animated Phase-2 `beam` layer over a
// glass panel). The one sleek surface that MOVES. Returns [panel, content group, beam] so the beam sits on top.
// HTML-FIRST. Design Read: same white-on-dark vocabulary. The PANEL half converts; the paired
// `type:'beam'` layer is a native-only mechanism (a travelling border light) and stays as-is.
export function borderBeamCard({ x, y, w = 640, h = 300, title, desc, radius = 22, thickness = 2.5,
  speed = 0.55, start = 0, dur = 4 } = {}) {
  const html = `<div style="display:flex;flex-direction:column;align-items:flex-start;justify-content:center;`
    + `gap:12px;padding:48px;box-sizing:border-box;width:${w}px;height:${h}px">`
    + (title ? `<span style="font:700 46px var(--font-sans);color:#fff;letter-spacing:-0.02em">${title}</span>` : '')
    + (desc ? `<span style="font:500 26px var(--font-mono);color:rgba(255,255,255,0.7);width:${w - 84}px">${desc}</span>` : '')
    + '</div>';
  return [
    { type: 'html', x, y, w, h, html, bg: 'rgba(255,255,255,0.04)', radius, border: `1.5px solid ${WHITE_HAIR}`, glass: 12,
      start, duration: dur, anim: 'pop', enterDur: 0.5, out: 'defocus', exitDur: 0.4 },
    { type: 'beam', x, y, w, h, radius, thickness, tail: 90, speed, glow: 0.6, start: start + 0.2, duration: dur - 0.2 },
  ];
}

// bento. An asymmetric BENTO grid: one hero cell + supporting cells, sizes deliberately unequal (scale
// contrast, not a uniform card grid. The AI-slop tell the taste system fights). `cells` are placed into a
// 2-col layout with the first spanning tall. Each cell = { title, desc, kind:'glass'|'mesh'|'spotlight' }.
// PURE COMPOSITION: unchanged. It only positions whatever glassCell/meshCell/spotlightCell return, so
// changing those three (above) changes this one for free, no edit needed here.
export function bento({ x, y, w = 900, h = 560, gap = 20, cells = [], start = 0, dur = 5 } = {}) {
  const colW = (w - gap) / 2, out = [];
  const mk = (kind, o) => (kind === 'mesh' ? meshCell : kind === 'spotlight' ? spotlightCell : glassCell)(o);
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
