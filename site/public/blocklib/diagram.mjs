// blocks/diagram.mjs. The DIAGRAM family: a flow that DRAWS ITSELF. Nodes arrive, then the
// connectors between them stroke on in order, then the arrowheads land and the edge labels read out.
//
// WHY IT IS ONE `html` LAYER AND NOT A STACK OF `rect`s: a connector is a path with a corner radius
// and an arrowhead, and the only honest way to draw one is SVG. Once the SVG is there the nodes may
// as well sit on the same surface, because then ONE `parts` array owns the whole choreography and the
// order of arrival is a property of the figure rather than of four hand-computed `start` values.
//
// MOTION, AND THE TRAP. CSS `transition`/`animation` are dead engine-wide (core/sanitize-html.js
// refuses them at boot), so a connector "animated" in CSS renders as a finished still. Everything
// here moves through `parts` (core/parts.js): a CSS selector into this markup, one seeked GSAP
// fromTo per matched element, staggered. `drawOn` is the entry that matters, it stamps
// `pathLength="1"` on each path and ramps `stroke-dashoffset` 1→0, so a per-path staggered draw-on
// costs one spec and needs no measurement. `parts` accepts an ARRAY (films/scene/scene.js:390), so
// nodes / edges / arrowheads / labels are four passes on one layer with their own delays.
//
// THE ARROWHEAD IS A SEPARATE PATH ON PURPOSE. `marker-end` paints at the path's end from frame one,
// dash offset or not. The head would sit there pointing at nothing while the line was still growing.
// A sibling path with its own `popIn` lands after its line arrives, which is what the eye expects.
//
// ONE ROUTER. `routeEdge` is the whole geometry surface: two boxes in, an orthogonal path between
// their NEAREST edges out, plus the arrowhead and where a label can sit. flowchart and nodeGraph both
// call it; neither owns a second copy.
import { TOKENS, HAIR, R, SPACE, TYPE, r2, onColor } from './kit.mjs';
// The label this module's blocks are grouped under on the site. Declared HERE, in the module that owns
// the blocks, so nothing keeps a 176-row name-to-category table in sync by hand. A module that
// declares none is refused by scripts/site/blocks-json.mjs at generation time, not discovered later.
export const CATEGORY = 'Diagrams';


const T = TOKENS;
// GSAP's OWN ease name, not the engine's. `parts` hands `p.ease` straight to gsap
// (films/scene/scene.js:398) and gsap has no ease called `easeOutCubic`, so an engine ease name
// there is accepted and silently replaced by gsap's default. See frameworkFindings.
const P_EASE = 'power3.out';
const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// The chamfered silhouette that makes a decision node unmistakable at a glance without rotating its
// text 45°. A diamond is the literate signal and an unreadable label is not worth it, so the SHAPE
// carries the meaning and the words stay horizontal.
const CHAMFER = (c) => `polygon(${c}px 0, calc(100% - ${c}px) 0, 100% 50%, calc(100% - ${c}px) 100%, ${c}px 100%, 0 50%)`;

// ── NODES ────────────────────────────────────────────────────────────────────────────────────────
// Three registers, and the difference is the SILHOUETTE, not just a tint: a terminal is a pill, a
// decision is chamfered, a process is a hairline card. A reader who cannot see colour still reads the
// flow.
function nodeEl(n) {
  const kind = n.kind || 'process';
  const hot = !!n.highlight;
  // THE TYPE SIZE IS A PROP BECAUSE THE READABILITY FLOOR IS A FUNCTION OF THE CANVAS. `make audit`
  // fails text under 1.3% of the frame's HEIGHT, which is ~14px on a 1080-tall canvas and ~25px on a
  // 1920-tall one. The same 17px caption is therefore fine in landscape and unreadable in portrait, so
  // the portrait variant raises both steps rather than shipping a warning.
  const label = `<div style="font:700 ${n.size || TYPE.lead}px var(--font-sans);letter-spacing:-0.01em">${esc(n.text)}</div>`
    + (n.sub ? `<div style="font:500 ${n.subSize || TYPE.body}px var(--font-mono);color:${T.dim};margin-top:${SPACE.tight}px">${esc(n.sub)}</div>` : '');
  const seat = `position:absolute;left:${r2(n.x)}px;top:${r2(n.y)}px;width:${r2(n.w)}px;height:${r2(n.h)}px;`
    + `box-sizing:border-box;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center`;

  if (kind === 'decision') {
    const c = Math.min(26, n.h / 2);
    // The outline is a second clipped box behind the first, because `clip-path` clips a border away.
    return `<div data-node style="${seat};padding:0 ${r2(c + SPACE.md)}px;color:${T.ink}">`
      + `<div style="position:absolute;inset:0;background:${T.accent};clip-path:${CHAMFER(c)}"></div>`
      + `<div style="position:absolute;inset:2px;background:${T.card};clip-path:${CHAMFER(c)}"></div>`
      + `<div style="position:relative">${label}</div></div>`;
  }
  if (kind === 'terminal') {
    return `<div data-node style="${seat};padding:0 ${SPACE.lg}px;background:${T.accent};`
      + `border-radius:${R.pill}px;color:${onColor(T.accent)}">${label}</div>`;
  }
  return `<div data-node style="${seat};padding:0 ${SPACE.md}px;background:${T.card};`
    + `border:${hot ? `2px solid ${T.accent}` : HAIR};border-radius:${R.card}px;color:${T.ink}`
    + (hot ? `;box-shadow:0 0 0 6px ${T.accentSoft}` : '') + `">${label}</div>`;
}

// ── THE ROUTER ───────────────────────────────────────────────────────────────────────────────────
// Two boxes → an orthogonal elbow between their nearest edges, with rounded corners. The dominant
// delta picks the axis, so a node placed anywhere (flowchart's grid, nodeGraph's free coordinates) is
// left and entered on the side that faces its partner. Returns the path, the arrowhead as its own
// path, and the point on the CROSSING segment where a label sits clear of both boxes.
// `axis` is the one thing the dominant delta CANNOT know. In a free graph the nearest edges are the
// right answer. In a ranked flow they are not: a portrait flowchart puts two branch targets further
// apart ACROSS the frame than they are DOWN it, so `auto` sent both arrowheads into the side of a node
// in a flow that reads downward. `'v'`/`'h'` names the flow axis and wins whenever the two boxes are on
// different ranks; same rank falls back to `auto`.
export function routeEdge(a, b, { radius = 16, gap = 3, head = 11, axis = 'auto' } = {}) {
  const acx = a.x + a.w / 2, acy = a.y + a.h / 2;
  const bcx = b.x + b.w / 2, bcy = b.y + b.h / 2;
  const dx = bcx - acx, dy = bcy - acy;
  const vertical = axis === 'v' && Math.abs(dy) > 1 ? true
    : axis === 'h' && Math.abs(dx) > 1 ? false
    : Math.abs(dy) >= Math.abs(dx);
  const sign = (v) => (v < 0 ? -1 : 1);

  let sx, sy, ex, ey, dir, d, lx, ly;
  if (vertical) {
    const k = sign(dy);
    sx = acx; sy = k > 0 ? a.y + a.h : a.y;
    ex = bcx; ey = k > 0 ? b.y - gap : b.y + b.h + gap;
    dir = k > 0 ? 'down' : 'up';
    const my = (sy + ey) / 2;
    if (Math.abs(ex - sx) < 1) { d = `M${r2(sx)} ${r2(sy)} L${r2(sx)} ${r2(ey)}`; }
    else {
      const jx = sign(ex - sx);
      const r = Math.max(0, Math.min(radius, Math.abs(ex - sx) / 2, Math.abs(my - sy), Math.abs(ey - my)));
      d = `M${r2(sx)} ${r2(sy)} L${r2(sx)} ${r2(my - k * r)} Q${r2(sx)} ${r2(my)} ${r2(sx + jx * r)} ${r2(my)}`
        + ` L${r2(ex - jx * r)} ${r2(my)} Q${r2(ex)} ${r2(my)} ${r2(ex)} ${r2(my + k * r)} L${r2(ex)} ${r2(ey)}`;
    }
    lx = (sx + ex) / 2; ly = my;
  } else {
    const k = sign(dx);
    sx = k > 0 ? a.x + a.w : a.x; sy = acy;
    ex = k > 0 ? b.x - gap : b.x + b.w + gap; ey = bcy;
    dir = k > 0 ? 'right' : 'left';
    const mx = (sx + ex) / 2;
    if (Math.abs(ey - sy) < 1) { d = `M${r2(sx)} ${r2(sy)} L${r2(ex)} ${r2(sy)}`; }
    else {
      const jy = sign(ey - sy);
      const r = Math.max(0, Math.min(radius, Math.abs(ey - sy) / 2, Math.abs(mx - sx), Math.abs(ex - mx)));
      d = `M${r2(sx)} ${r2(sy)} L${r2(mx - k * r)} ${r2(sy)} Q${r2(mx)} ${r2(sy)} ${r2(mx)} ${r2(sy + jy * r)}`
        + ` L${r2(mx)} ${r2(ey - jy * r)} Q${r2(mx)} ${r2(ey)} ${r2(mx + k * r)} ${r2(ey)} L${r2(ex)} ${r2(ey)}`;
    }
    lx = mx; ly = (sy + ey) / 2;
  }

  const wing = head * 0.62;
  const ARROW = {
    down: `M${r2(ex - wing)} ${r2(ey - head)} L${r2(ex)} ${r2(ey)} L${r2(ex + wing)} ${r2(ey - head)}`,
    up: `M${r2(ex - wing)} ${r2(ey + head)} L${r2(ex)} ${r2(ey)} L${r2(ex + wing)} ${r2(ey + head)}`,
    right: `M${r2(ex - head)} ${r2(ey - wing)} L${r2(ex)} ${r2(ey)} L${r2(ex - head)} ${r2(ey + wing)}`,
    left: `M${r2(ex + head)} ${r2(ey - wing)} L${r2(ex)} ${r2(ey)} L${r2(ex + head)} ${r2(ey + wing)}`,
  };
  return { d, arrow: ARROW[dir], dir, label: { x: r2(lx), y: r2(ly) } };
}

// The edge, as markup. `hot` is the one highlighted path in a graph; everything else reads as plumbing.
function edgeEls(a, b, e, opts, labelSize = TYPE.body) {
  const rt = routeEdge(a, b, opts);
  const hot = !!e.hot;
  const col = hot ? T.accent : T.sub;
  const wgt = hot ? 3 : 2;
  const stroke = `fill="none" stroke="${col}" stroke-width="${wgt}" stroke-linecap="round" stroke-linejoin="round"`;
  return {
    path: `<path data-edge d="${rt.d}" ${stroke}/>`,
    arrow: `<path data-arrow d="${rt.arrow}" ${stroke}/>`,
    label: e.label
      ? `<div data-elabel style="position:absolute;left:${rt.label.x}px;top:${rt.label.y}px;transform:translate(-50%,-50%);`
        + `font:600 ${labelSize}px var(--font-mono);letter-spacing:0.08em;text-transform:uppercase;color:${hot ? T.accent : T.sub};`
        + `background:${T.paper};border:${HAIR};border-radius:${R.pill}px;padding:3px 12px;white-space:nowrap">${esc(e.label)}</div>`
      : '',
  };
}

// ── THE SURFACE ──────────────────────────────────────────────────────────────────────────────────
// One html layer, four `parts` passes. The delays chain: nodes land, edges stroke on between them,
// heads arrive, labels read out. `out: true` gives every pass its paired exit, so the figure leaves
// piece by piece instead of as one card.
function diagramLayer({ x, y, w, h, nodes, edges, start, dur, step, radius, gap, axis, labelSize, anim }) {
  const byId = Object.fromEntries(nodes.map((n) => [n.id, n]));
  const drawn = edges.map((e) => {
    const a = byId[e.from], b = byId[e.to];
    if (!a || !b) throw new Error(`blocks/diagram: edge "${e.from}"→"${e.to}" names a node that does not exist. `
      + `Known ids: ${nodes.map((n) => n.id).join(', ')}`);
    return edgeEls(a, b, e, { radius, gap, axis }, labelSize);
  });

  // The chain, and the one number that has to be right: an arrowhead must land AFTER its own line
  // has finished drawing, or the head sits pointing at a stroke that has not arrived yet. `edgeEach`
  // is that line's duration, so `headIn` is derived from it rather than guessed at.
  const nodeIn = 0.12;
  const edgeIn = r2(nodeIn + step * 1.4);
  const edgeEach = r2(step * 3);
  const headIn = r2(edgeIn + edgeEach);
  const labelIn = r2(headIn + step);

  const html = `<div style="position:relative;width:${r2(w)}px;height:${r2(h)}px">`
    + `<svg viewBox="0 0 ${r2(w)} ${r2(h)}" width="${r2(w)}" height="${r2(h)}" `
    + `style="position:absolute;left:0;top:0;overflow:visible">`
    + drawn.map((e) => e.path).join('') + drawn.map((e) => e.arrow).join('') + `</svg>`
    + nodes.map(nodeEl).join('')
    + drawn.map((e) => e.label).join('')
    + `</div>`;

  return [{
    type: 'html', x, y, w: r2(w), h: r2(h), html,
    start, duration: dur, anim: anim || 'fade', enterDur: 0.25, exitDur: 0.35,
    parts: [
      { select: '[data-node]', anim: 'popIn', each: 0.42, stagger: step, delay: nodeIn, ease: P_EASE, out: true },
      { select: '[data-edge]', anim: 'drawOn', each: edgeEach, stagger: step, delay: edgeIn, ease: P_EASE, out: true },
      { select: '[data-arrow]', anim: 'popIn', each: 0.24, stagger: step, delay: headIn, ease: P_EASE, out: true },
      { select: '[data-elabel]', anim: 'popIn', each: 0.26, stagger: step, delay: labelIn, ease: P_EASE, out: true },
    ],
  }];
}

// ── flowchart ────────────────────────────────────────────────────────────────────────────────────
// A ranked decision flow. `col` is the rank ALONG the flow, `lane` the offset ACROSS it (…-1, 0, 1…),
// so the author states the shape and the block owns every coordinate. `variant: 'vertical'` turns the
// same graph through 90° for a phone feed: cols run down the frame, lanes across it.
export const FLOW_DEFAULT = {
  nodes: [
    { id: 'json', text: 'Scene JSON', kind: 'terminal', col: 0, lane: 0 },
    { id: 'gate', text: 'Gates green?', kind: 'decision', col: 1, lane: 0 },
    { id: 'render', text: 'Render', sub: '30fps · 1920×1080', col: 2, lane: -1 },
    { id: 'fix', text: 'Read the finding', sub: 'fix at the root', col: 2, lane: 1 },
    { id: 'mp4', text: 'out/film.mp4', kind: 'terminal', col: 3, lane: -1 },
  ],
  edges: [
    { from: 'json', to: 'gate' },
    { from: 'gate', to: 'render', label: 'yes' },
    { from: 'gate', to: 'fix', label: 'no' },
    { from: 'render', to: 'mp4' },
  ],
};

export function flowchart({ x = 0, y = 0, variant = '', nodes = FLOW_DEFAULT.nodes, edges = FLOW_DEFAULT.edges,
  nodeW, nodeH, colGap, laneGap, size, subSize, labelSize, radius = 16, gap = 3, start = 0, dur = 6, step = 0.16, anim } = {}) {
  const down = variant === 'vertical';
  // Portrait is 1080 wide and a lane offset has to live inside it, so the vertical branch is not the
  // landscape one rotated: its nodes are narrower and its lanes sit closer.
  const NW = nodeW ?? (down ? 300 : 300);
  const NH = nodeH ?? (down ? 148 : 100);
  const CG = colGap ?? (down ? 84 : 118);
  const LG = laneGap ?? (down ? 24 : 44);
  const TS = size ?? (down ? TYPE.head : TYPE.lead);
  const SS = subSize ?? (down ? TYPE.head : TYPE.body);
  const LS = labelSize ?? (down ? TYPE.head : TYPE.body);

  const cols = nodes.map((n) => n.col ?? 0);
  const lanes = nodes.map((n) => n.lane ?? 0);
  const c0 = Math.min(...cols), c1 = Math.max(...cols);
  const l0 = Math.min(...lanes), l1 = Math.max(...lanes);

  const along = (c) => (c - c0) * ((down ? NH : NW) + CG);
  const across = (l) => (l - l0) * ((down ? NW : NH) + LG);

  const placed = nodes.map((n) => ({
    ...n,
    w: n.w ?? NW, h: n.h ?? NH, size: n.size ?? TS, subSize: n.subSize ?? SS,
    x: r2(down ? across(n.lane ?? 0) : along(n.col ?? 0)),
    y: r2(down ? along(n.col ?? 0) : across(n.lane ?? 0)),
  }));

  const spanAlong = (c1 - c0 + 1) * (down ? NH : NW) + (c1 - c0) * CG;
  const spanAcross = (l1 - l0 + 1) * (down ? NW : NH) + (l1 - l0) * LG;

  return diagramLayer({ x, y, w: down ? spanAcross : spanAlong, h: down ? spanAlong : spanAcross,
    nodes: placed, edges, start, dur, step, radius, gap, axis: down ? 'v' : 'h', labelSize: LS, anim });
}

// ── nodeGraph ────────────────────────────────────────────────────────────────────────────────────
// A NON-hierarchical graph: the author places every node, the same router draws every edge, and one
// node can be lit. Use it for a topology, a dependency web, a map of parts, anything whose shape is
// not a rank.
export const GRAPH_DEFAULT = {
  nodes: [
    { id: 'core', text: 'core', sub: 'renderFrame(n)', x: 400, y: 210, w: 300, h: 104 },
    { id: 'layers', text: 'layers', sub: '18 types', x: 0, y: 40, w: 260, h: 96 },
    { id: 'blocks', text: 'blocks', sub: 'pure factories', x: 0, y: 380, w: 260, h: 96 },
    { id: 'gates', text: 'gates', sub: 'author-check', x: 840, y: 40, w: 260, h: 96 },
    { id: 'mp4', text: 'mp4', kind: 'terminal', x: 840, y: 380, w: 260, h: 96 },
  ],
  edges: [
    { from: 'layers', to: 'core' }, { from: 'blocks', to: 'core' },
    { from: 'core', to: 'gates' }, { from: 'core', to: 'mp4', hot: true },
  ],
};

export function nodeGraph({ x = 0, y = 0, nodes = GRAPH_DEFAULT.nodes, edges = GRAPH_DEFAULT.edges,
  highlight = 'core', nodeW = 260, nodeH = 96, labelSize = TYPE.body, radius = 20, gap = 3,
  start = 0, dur = 6, step = 0.14, anim } = {}) {
  const placed = nodes.map((n) => ({
    ...n, w: n.w ?? nodeW, h: n.h ?? nodeH, x: r2(n.x ?? 0), y: r2(n.y ?? 0),
    highlight: n.highlight ?? (n.id === highlight),
  }));
  const w = Math.max(...placed.map((n) => n.x + n.w));
  const h = Math.max(...placed.map((n) => n.y + n.h));
  return diagramLayer({ x, y, w, h, nodes: placed, edges, start, dur, step, radius, gap, axis: 'auto', labelSize, anim });
}

// ─────────────────────────────────────────────────────────────────────────────
// THE OPTION CONTRACT. Same vocabulary as the other families (blocks/schema.mjs); x · y · start · dur
// are the shared passthrough and are not repeated here. `nodes`/`edges` are a bare `list` rather than a
// typed `row`: a node's geometry keys are OPTIONAL overrides of the block's own layout, and declaring
// them as fields would turn the common case (id + text) into an error.
export const DIAGRAM_SCHEMAS = {
  flowchart: {
    variant: { kind: 'enum', of: ['', 'vertical'], def: '' },
    nodes: { kind: 'list', of: { kind: 'row', fields: {
      id: { kind: 'str', max: 48 }, text: { kind: 'str', max: 80 }, sub: { kind: 'str', max: 80 },
      kind: { kind: 'enum', of: ['process', 'decision', 'terminal'] },
      col: { kind: 'int', min: 0, max: 24 }, lane: { kind: 'int', min: -12, max: 12 },
      w: { kind: 'int', min: 80, max: 900 }, h: { kind: 'int', min: 40, max: 480 },
      size: { kind: 'int', min: 12, max: 96 }, subSize: { kind: 'int', min: 12, max: 72 } } }, def: FLOW_DEFAULT.nodes },
    edges: { kind: 'list', of: { kind: 'row', fields: {
      from: { kind: 'str', max: 48 }, to: { kind: 'str', max: 48 },
      label: { kind: 'str', max: 24 }, hot: { kind: 'bool' } } }, def: FLOW_DEFAULT.edges },
    nodeW: { kind: 'int', min: 120, max: 900 },
    nodeH: { kind: 'int', min: 48, max: 480 },
    colGap: { kind: 'int', min: 0, max: 600 },
    laneGap: { kind: 'int', min: 0, max: 600 },
    size: { kind: 'int', min: 12, max: 96 },
    subSize: { kind: 'int', min: 12, max: 72 },
    labelSize: { kind: 'int', min: 12, max: 72 },
    radius: { kind: 'int', min: 0, max: 80, def: 16 },
    // the connector's clearance from a node edge before it turns
    gap: { kind: 'int', min: 0, max: 60, def: 3 },
    // seconds between one node arriving and the next
    step: { kind: 'num', min: 0, max: 2, def: 0.16 },
    anim: { kind: 'str', max: 32 },
  },

  nodeGraph: {
    nodes: { kind: 'list', of: { kind: 'row', fields: {
      id: { kind: 'str', max: 48 }, text: { kind: 'str', max: 80 }, sub: { kind: 'str', max: 80 },
      kind: { kind: 'enum', of: ['process', 'decision', 'terminal'] },
      x: { kind: 'int', min: -4000, max: 4000 }, y: { kind: 'int', min: -4000, max: 4000 },
      w: { kind: 'int', min: 80, max: 900 }, h: { kind: 'int', min: 40, max: 480 },
      highlight: { kind: 'bool' } } }, def: GRAPH_DEFAULT.nodes },
    edges: { kind: 'list', of: { kind: 'row', fields: {
      from: { kind: 'str', max: 48 }, to: { kind: 'str', max: 48 },
      label: { kind: 'str', max: 24 }, hot: { kind: 'bool' } } }, def: GRAPH_DEFAULT.edges },
    // the id of the lit node. A node may override with its own `highlight`.
    highlight: { kind: 'str', max: 48, def: 'core' },
    nodeW: { kind: 'int', min: 120, max: 900, def: 260 },
    nodeH: { kind: 'int', min: 48, max: 480, def: 96 },
    labelSize: { kind: 'int', min: 12, max: 72, def: TYPE.body },
    radius: { kind: 'int', min: 0, max: 80, def: 20 },
    gap: { kind: 'int', min: 0, max: 60, def: 3 },
    step: { kind: 'num', min: 0, max: 2, def: 0.14 },
    anim: { kind: 'str', max: 32 },
  },
};
