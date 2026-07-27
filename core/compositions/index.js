// compositions/index.js — the PER-BEAT TIMELINE registry (the safe form of another engine' "one worker
// hand-writes a GSAP timeline per beat" model).
//
// A composition is a FIRST-PARTY builder that authors a bespoke, multi-tween GSAP timeline for one beat
// — the expressiveness `parts` (per-child stagger) and blueprints (fixed shapes) cannot reach: overlapping
// tweens, cross-timed hand-offs, a token travelling a path while a counter ticks and a check draws. The
// JSON only NAMES it (`{ "type":"composition", "comp":"pipelineFlow", "props":{…} }`) and passes DATA via
// `props`; the CODE lives here, never in the JSON. That is the whole security boundary — untrusted MCP
// input can name a comp and fill in labels, but cannot inject code (unlike an inline `<script>`, the real
// past exploit). Comps therefore treat every `props` string as DATA (textContent / attr), never innerHTML.
//
// Determinism contract (identical to every hook in formats/scene/scene.js):
//   • build(ctx) constructs the beat's STATIC DOM into `el`, then authors PAUSED tweens via `ctx.gsap`
//     with `delay` offset by `ctx.start` and `immediateRender:true` so the start values are pinned.
//   • No `Date.now()`, no `Math.random()`, no reading prior DOM/frame state — pure in the frame.
//   • `seekAll(t)` (core/clips.js) pauses+seeks `gsap.globalTimeline` each frame, so the whole timeline
//     is a pure function of t regardless of render order. `make probe` guards it.
// SVG draw-on uses the pathLength=1 / dasharray "1 1" trick (as PARTS.drawOn) so it needs no getTotalLength
// (the layer is not in the document yet at build() time — scene.js appends AFTER renderer.build).

const NS = 'http://www.w3.org/2000/svg';

// small helpers kept local — a comp reaches for these, nothing global.
const svgEl = (name, attrs = {}) => { const e = document.createElementNS(NS, name); for (const k in attrs) e.setAttribute(k, attrs[k]); return e; };
const drawable = (path) => { path.setAttribute('pathLength', '1'); path.style.strokeDasharray = '1 1'; path.style.strokeDashoffset = '1'; return path; };

// ---- pipelineFlow ---------------------------------------------------------------------------------
// A staged pipeline: N stage cards pop in, each connector DRAWS between them, a token TRAVELS the
// connector into the next card, and the final card blooms with a check that draws on. One hand-authored
// timeline — a genuine motion-graphics beat, not an assembly of primitives.
//   props: { stages:[string,string,string] (labels), accent?:cssColor }
function pipelineFlow(ctx) {
  const { el, gsap, start } = ctx;
  const labels = (Array.isArray(ctx.stages) && ctx.stages.length ? ctx.stages : ['Input', 'Engine', 'Render']).slice(0, 3);
  const accent = ctx.accent || 'var(--accent)';
  const W = 600, H = 200, cardW = 150, cardH = 84, gap = (W - cardW * labels.length) / (labels.length - 1);

  const svg = svgEl('svg', { viewBox: `0 0 ${W} ${H}`, width: (el.style.width ? '' : W), style: 'width:100%;height:auto;overflow:visible' });
  const cards = [], centers = [];
  labels.forEach((label, i) => {
    const x = i * (cardW + gap), cy = H / 2;
    centers.push({ x: x + cardW / 2, y: cy });
    const g = svgEl('g', { 'data-part': 'card' });
    g.style.transformBox = 'fill-box'; g.style.transformOrigin = '50% 50%';
    g.appendChild(svgEl('rect', { x, y: cy - cardH / 2, width: cardW, height: cardH, rx: 14, fill: 'var(--surface)', stroke: 'var(--line-strong)', 'stroke-width': 1.5 }));
    const t = svgEl('text', { x: x + cardW / 2, y: cy + 6, 'text-anchor': 'middle', fill: 'var(--text)', 'font-size': 22, 'font-family': 'var(--font-sans)', 'font-weight': 600 });
    t.textContent = String(label);                                   // DATA, not markup
    g.appendChild(t); svg.appendChild(g); cards.push(g);
  });

  // connectors + travelling tokens between consecutive cards
  const links = [], tokens = [];
  for (let i = 0; i < centers.length - 1; i++) {
    const a = centers[i], b = centers[i + 1];
    const x0 = a.x + cardW / 2, x1 = b.x - cardW / 2, y = a.y;
    links.push(drawable(svgEl('path', { d: `M ${x0} ${y} L ${x1} ${y}`, fill: 'none', stroke: accent, 'stroke-width': 3, 'stroke-linecap': 'round' })));
    tokens.push(svgEl('circle', { cx: x0, cy: y, r: 6, fill: accent, opacity: 0 }));
    svg.appendChild(links[i]);
  }
  tokens.forEach((tk) => svg.appendChild(tk));

  // a check that draws on inside the final card
  const last = centers[centers.length - 1];
  const check = drawable(svgEl('path', { d: `M ${last.x - 16} ${last.y + 22} l 10 10 l 18 -22`, fill: 'none', stroke: accent, 'stroke-width': 4, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', opacity: 0 }));
  svg.appendChild(check);
  el.appendChild(svg);

  // ---- the hand-authored timeline (paused, absolute delays from `start`) ----
  // EVERY tween is a fromTo with immediateRender:true so its start value is PINNED at build time —
  // seeking the paused global timeline to any t then yields the same DOM regardless of which frames
  // rendered before it (pure in n). No `gsap.to(...immediateRender:false)`: that leaves the END value
  // stuck when the timeline is seeked backwards, which is exactly the render-order impurity `make probe`
  // exists to catch. The travelling token appears/moves/vanishes in ONE keyframed fromTo for the same
  // reason. No colour tween between two `var()` strings — GSAP can't interpolate them (it snaps/NaNs).
  cards.forEach((g, i) => {
    gsap.fromTo(g, { scale: 0, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.5, ease: 'back.out(1.7)', delay: start + i * 0.55, immediateRender: true });
  });
  links.forEach((ln, i) => {
    const at = start + 0.5 + i * 0.55;
    gsap.fromTo(ln, { strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 0.35, ease: 'power2.inOut', delay: at, immediateRender: true });
    const tk = tokens[i], a = centers[i], b = centers[i + 1];
    gsap.fromTo(tk, { attr: { cx: a.x + cardW / 2 }, opacity: 0 }, {
      keyframes: [
        { opacity: 1, duration: 0.06 },
        { attr: { cx: b.x - cardW / 2 }, duration: 0.4, ease: 'power1.in' },
        { opacity: 0, duration: 0.14 },
      ],
      delay: at + 0.1, immediateRender: true,
    });
  });
  const checkAt = start + 0.5 + (links.length) * 0.55 + 0.2;
  gsap.fromTo(check, { strokeDashoffset: 1, opacity: 1 }, { strokeDashoffset: 0, duration: 0.4, ease: 'power2.out', delay: checkAt, immediateRender: true });
  // emphasise the final card with a stroke-width pulse on its RECT (a child not otherwise tweened, so
  // no immediateRender start-value conflict with the card <g>'s entrance) — numeric attr, deterministic.
  gsap.fromTo(cards[cards.length - 1].querySelector('rect'), { attr: { 'stroke-width': 1.5 } },
    { attr: { 'stroke-width': 3.5 }, duration: 0.24, yoyo: true, repeat: 1, ease: 'power2.inOut', delay: checkAt, immediateRender: true });
}

export const COMPOSITIONS = { pipelineFlow };
export const COMPOSITION_NAMES = Object.keys(COMPOSITIONS);
