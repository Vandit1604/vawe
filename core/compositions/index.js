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
  // `rate` compresses the whole timeline so it fits a PUNCHY beat (rate 0.6 ≈ 40% faster). Default 1.
  const R = ctx.rate != null ? +ctx.rate : 1;
  const W = 600, H = 200, cardW = 150, cardH = 84, gap = (W - cardW * labels.length) / (labels.length - 1);

  const svg = svgEl('svg', { viewBox: `0 0 ${W} ${H}`, width: (el.style.width ? '' : W), style: 'width:100%;height:auto;overflow:visible' });
  const cards = [], centers = [];
  labels.forEach((label, i) => {
    const x = i * (cardW + gap), cy = H / 2;
    centers.push({ x: x + cardW / 2, y: cy });
    const g = svgEl('g', { 'data-part': 'card' });
    // Scale about the card's OWN centre, stated in user units, not `fill-box` + `50% 50%`. fill-box
    // resolves against the element's bounding box, and at build() time this layer is not in the document
    // yet (see the note at the top of this file), so it has no box to resolve against — while
    // `immediateRender: true` pins the tween's start value at exactly that moment. The card therefore
    // scaled about the wrong point and swung in from a position it never occupies at rest, dragging a
    // connector stub into empty space behind it. Both numbers here are known at build time.
    g.style.transformBox = 'view-box';
    g.style.transformOrigin = `${x + cardW / 2}px ${cy}px`;
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
    gsap.fromTo(g, { scale: 0, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.5 * R, ease: 'back.out(1.7)', delay: start + i * 0.55 * R, immediateRender: true });
  });
  links.forEach((ln, i) => {
    const at = start + (0.5 + i * 0.55) * R;
    gsap.fromTo(ln, { strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 0.35 * R, ease: 'power2.inOut', delay: at, immediateRender: true });
    const tk = tokens[i], a = centers[i], b = centers[i + 1];
    gsap.fromTo(tk, { attr: { cx: a.x + cardW / 2 }, opacity: 0 }, {
      keyframes: [
        { opacity: 1, duration: 0.06 * R },
        { attr: { cx: b.x - cardW / 2 }, duration: 0.4 * R, ease: 'power1.in' },
        { opacity: 0, duration: 0.14 * R },
      ],
      delay: at + 0.1 * R, immediateRender: true,
    });
  });
  const checkAt = start + (0.5 + (links.length) * 0.55 + 0.2) * R;
  gsap.fromTo(check, { strokeDashoffset: 1, opacity: 1 }, { strokeDashoffset: 0, duration: 0.4 * R, ease: 'power2.out', delay: checkAt, immediateRender: true });
  // emphasise the final card with a stroke-width pulse on its RECT (a child not otherwise tweened, so
  // no immediateRender start-value conflict with the card <g>'s entrance) — numeric attr, deterministic.
  gsap.fromTo(cards[cards.length - 1].querySelector('rect'), { attr: { 'stroke-width': 1.5 } },
    { attr: { 'stroke-width': 3.5 }, duration: 0.24, yoyo: true, repeat: 1, ease: 'power2.inOut', delay: checkAt, immediateRender: true });
}

// ---- commaSplit -----------------------------------------------------------------------------------
// THE SENTENCE THIS REPLACES: "The commas were always columns."
//
// A delimited line pulls itself apart into a table, and the commas are not thrown away: each one SHRINKS
// to a point and a column rule GROWS out of that same point, so the delimiter visibly becomes the
// structure it always was. The fields slide from their crammed positions to their column origins at the
// same time. A viewer who reads no words still learns the claim, which is the entire reason this exists
// rather than a caption saying so.
//
// Why this is a composition and not `parts` or a `--p` window: the glyphs travel independently, the
// comma's exit and its rule's entrance are two tweens that must overlap on the same point, and the
// field slides are staggered against both. That is cross-timed hand-off, which is the thing `clamp()`
// staging on a single variable cannot express.
//
// props: { fields:[string], targets:[number|null], rules:[number], size?, rowY?, ruleH?, accent?,
//          dim?, ink?, rate? }
//   targets[i] === null drops that field (a trailing `,USD` the table has no column for).
//   rules[i] is where comma i's rule lands. Fewer rules than commas is fine: the extras just leave.
function commaSplit(ctx) {
  const { el, gsap, start } = ctx;
  const fields = (Array.isArray(ctx.fields) && ctx.fields.length ? ctx.fields : ['a', 'b']).map(String);
  const targets = Array.isArray(ctx.targets) ? ctx.targets : fields.map((_, i) => i * 220);
  const rules = Array.isArray(ctx.rules) ? ctx.rules : [];
  const R = ctx.rate != null ? +ctx.rate : 1;
  const FS = ctx.size != null ? +ctx.size : 29;
  const ADV = FS * 0.6;                       // JetBrains Mono advances 0.6em, as everywhere else here
  const ROW = ctx.rowY != null ? +ctx.rowY : 70;
  const RH = ctx.ruleH != null ? +ctx.ruleH : 60;
  const accent = ctx.accent || 'var(--accent)';
  const dim = ctx.dim || 'var(--dim)';
  const ink = ctx.ink || 'var(--text)';
  const W = ctx.w != null ? +ctx.w : 808, H = ctx.h != null ? +ctx.h : 150;

  const svg = svgEl('svg', { viewBox: `0 0 ${W} ${H}`, style: 'width:100%;height:auto;overflow:visible' });

  // RAW LAYOUT: fields laid end to end with a comma between each, exactly as the file has them.
  const rawX = [], commaX = [];
  let cursor = 0;
  fields.forEach((f, i) => {
    rawX.push(cursor);
    cursor += f.length * ADV;
    if (i < fields.length - 1) { commaX.push(cursor); cursor += ADV; }
  });

  const texts = fields.map((f, i) => {
    const t = svgEl('text', { x: rawX[i], y: ROW, fill: ink, 'font-size': FS, 'font-family': 'var(--font-mono)', 'xml:space': 'preserve' });
    t.textContent = f;                                                // DATA, never markup
    svg.appendChild(t); return t;
  });
  const commas = commaX.map((x) => {
    const t = svgEl('text', { x, y: ROW, fill: dim, 'font-size': FS, 'font-family': 'var(--font-mono)' });
    t.textContent = ',';
    // same fix as pipelineFlow's cards: fill-box needs a bounding box, and at build() time this layer is
    // not in the document, while immediateRender pins the tween's start value right then
    t.style.transformBox = 'view-box'; t.style.transformOrigin = `${x}px ${ROW}px`;
    svg.appendChild(t); return t;
  });
  // one rule per comma that has somewhere to land. It grows from the comma's own point.
  const bars = rules.map((rx) => {
    const r = svgEl('rect', { x: rx, y: ROW - RH + 12, width: 1, height: RH, fill: accent, opacity: 0.55 });
    r.style.transformBox = 'view-box'; r.style.transformOrigin = `${rx}px ${ROW - RH / 2 + 12}px`;
    svg.appendChild(r); return r;
  });
  el.appendChild(svg);

  // ---- the timeline ----
  // Every tween is a fromTo with immediateRender:true, so seeking to any t gives the same DOM whatever
  // rendered before it. See the pipelineFlow note above: a bare `.to()` leaves the end value stuck when
  // the paused global timeline is seeked backwards, which is the render-order impurity `make probe` catches.
  const HOLD = 0.35 * R;          // let the viewer read the raw line before it moves
  fields.forEach((_, i) => {
    const to = targets[i];
    if (to == null) {             // a field the table has no column for: it leaves rather than lands
      gsap.fromTo(texts[i], { opacity: 1 }, { opacity: 0, duration: 0.3 * R, ease: 'power2.in', delay: start + HOLD, immediateRender: true });
      return;
    }
    gsap.fromTo(texts[i], { attr: { x: rawX[i] } }, {
      attr: { x: to }, duration: 0.62 * R, ease: 'power3.inOut',
      delay: start + HOLD + i * 0.05 * R, immediateRender: true,
    });
  });
  // THE HAND-OFF: the comma collapses to a point and the rule grows out of that same point. The two
  // overlap deliberately, so there is a moment where the delimiter and the structure are the same mark.
  commas.forEach((c, i) => {
    const bar = bars[i];
    if (!bar) {                   // a comma with no column to become: it just leaves
      gsap.fromTo(c, { scale: 1, opacity: 1 }, { scale: 0.18, opacity: 0, duration: 0.3 * R, ease: 'power2.in', delay: start + HOLD + 0.06 * R, immediateRender: true });
      return;
    }
    // The comma FLIES to the gutter and shrinks to nothing there, then the rule grows out of that exact
    // point. Linking them in SPACE and not merely in time is what makes the delimiter read as becoming
    // the structure. The rule waits for the comma to land, so it never crosses a field still in motion.
    gsap.fromTo(c, { attr: { x: commaX[i] }, scale: 1, opacity: 1 }, {
      attr: { x: rules[i] }, scale: 0.2, opacity: 0, duration: 0.44 * R, ease: 'power3.inOut',
      delay: start + HOLD, immediateRender: true,
    });
    gsap.fromTo(bar, { scaleY: 0, opacity: 0 }, {
      scaleY: 1, opacity: 0.55, duration: 0.32 * R, ease: 'power3.out',
      delay: start + HOLD + 0.34 * R, immediateRender: true,
    });
  });
}

export const COMPOSITIONS = { pipelineFlow, commaSplit };
export const COMPOSITION_NAMES = Object.keys(COMPOSITIONS);
