/* The three proof diagrams for the claims section.
 *
 * Each claim gets a diagram drawn for THAT claim, never a shared shape: determinism is one frame
 * hashing the same from two different render orders, agent-native is prose becoming a contract,
 * any-aspect is one source fanning out to four ratios. The variance is the argument.
 *
 * They are SVG rather than boxes of styled text so the geometry can carry meaning: in the aspect
 * diagram the rectangles' widths ARE the ratios (one shared height times 16/9, 9/16, 1/1, 4/5),
 * computed, so the picture cannot drift from the sentence beside it.
 *
 * Cobalt is the only ink, per The One Voice Rule. Strokes are non-scaling so a transform-scaled
 * mark keeps the same hairline as an unscaled one. All three are aria-hidden: they illustrate the
 * claim beside them, and a screen reader gets that claim as prose.
 */

const WAVE = "M2 13c2.5 0 2.5-5 5-5s2.5 5 5 5 2.5-5 5-5 2.5 5 5 5";
// The mark's own centre inside its 24-unit box: x spans 2..22 and y spans 8..13, so it is NOT at
// (12,12). Centring it needs these, not half the box.
const WAVE_CX = 12;
const WAVE_CY = 10.5;
/** transform that centres WAVE on (cx, cy) at a given drawn width */
const waveAt = (cx: number, cy: number, width: number) => {
  const s = width / 24;
  return `translate(${cx - WAVE_CX * s}, ${cy - WAVE_CY * s}) scale(${s})`;
};

const VB = "0 0 520 300";

/* ── Deterministic ────────────────────────────────────────────────────────────────────────────
   A filmstrip, then the same frame hashed from two DIFFERENT render orders. Two identical frames
   side by side only showed "twice"; the claim is stronger than that and the picture should say it:
   412 comes out first in one pass and last in the other, and the bytes do not care. That is what
   "any render order" means, and it is why frames can shard across parallel tabs at all. */
export function ProofHash() {
  const frames = [
    { n: "411", x: 52 },
    { n: "412", x: 196, on: true },
    { n: "413", x: 340 },
  ];
  return (
    <svg className="dg" viewBox={VB} role="img" aria-hidden="true">
      {/* the strip */}
      <rect className="dg-strip" x="34" y="0" width="452" height="126" rx="10" />
      {Array.from({ length: 11 }, (_, i) => (
        <g key={i}>
          <rect className="dg-perf" x={46 + i * 40} y="7" width="12" height="7" rx="2" />
          <rect className="dg-perf" x={46 + i * 40} y="112" width="12" height="7" rx="2" />
        </g>
      ))}

      {frames.map((f) => (
        <g key={f.n}>
          <rect
            className={f.on ? "dg-frame is-on" : "dg-frame"}
            x={f.x}
            y="26"
            width="128"
            height="72"
            rx="6"
          />
          <path className={f.on ? "dg-wave on-fill" : "dg-wave"} d={WAVE} transform={waveAt(f.x + 64, 62, 74)} />
          <text className={f.on ? "dg-lab is-on" : "dg-lab"} x={f.x + 64} y="146" textAnchor="middle">
            {f.n}
          </text>
        </g>
      ))}

      {/* two passes, two orders, one result */}
      <g transform="translate(0,176)">
        <text className="dg-lab" x="34" y="0">pass 1 · rendered 412, 88, 903</text>
        <rect className="dg-card" x="34" y="10" width="452" height="34" rx="8" />
        <text className="dg-hash" x="48" y="32">frame 412</text>
        <text className="dg-hash is-key" x="472" y="32" textAnchor="end">a4f0…9c1</text>

        <text className="dg-lab" x="34" y="72">pass 2 · rendered 903, 412, 88</text>
        <rect className="dg-card" x="34" y="82" width="452" height="34" rx="8" />
        <text className="dg-hash" x="48" y="104">frame 412</text>
        <text className="dg-hash is-key" x="472" y="104" textAnchor="end">a4f0…9c1</text>
      </g>
    </svg>
  );
}

/* ── Agent-native ─────────────────────────────────────────────────────────────────────────────
   The literal prompt and the literal contract, not a speech-bubble glyph pointing at a document
   glyph: an abstract metaphor here would be exactly the placeholder this repo's own value gate
   forbids. The layer rail at the bottom is the part a schema buys you, drawn as structure. */
export function ProofSay() {
  const layers = [
    { t: "text", w: 96 },
    { t: "shader", w: 78 },
    { t: "image", w: 70 },
    { t: "cut", w: 54 },
  ];
  let lx = 34;
  return (
    <svg className="dg" viewBox={VB} role="img" aria-hidden="true">
      <text className="dg-lab" x="34" y="0">you say</text>
      <rect className="dg-soft" x="34" y="10" width="452" height="48" rx="10" />
      <text className="dg-quote" x="50" y="40">
        “a 15s launch film, cobalt, ends on the wordmark”
      </text>

      <path className="dg-arrow" d="M260 66v22" />
      <path className="dg-arrow" d="M253 82l7 8 7-8" />

      <text className="dg-lab" x="34" y="112">vawe writes</text>
      <rect className="dg-card" x="34" y="122" width="452" height="112" rx="10" />
      <text className="dg-code" x="50" y="148">
        <tspan className="dg-p">{"{"}</tspan> <tspan className="dg-k">&quot;module&quot;</tspan>
        <tspan className="dg-p">:</tspan> <tspan className="dg-s">&quot;scene&quot;</tspan>
        <tspan className="dg-p">,</tspan> <tspan className="dg-k">&quot;theme&quot;</tspan>
        <tspan className="dg-p">:</tspan> <tspan className="dg-s">&quot;vawe&quot;</tspan>
        <tspan className="dg-p">,</tspan>
      </text>
      <text className="dg-code" x="50" y="172">
        <tspan className="dg-p">{"  "}</tspan>
        <tspan className="dg-k">&quot;duration&quot;</tspan>
        <tspan className="dg-p">: </tspan>
        <tspan className="dg-n">15</tspan>
        <tspan className="dg-p">,</tspan>
      </text>
      <text className="dg-code" x="50" y="196">
        <tspan className="dg-p">{"  "}</tspan>
        <tspan className="dg-k">&quot;layers&quot;</tspan>
        <tspan className="dg-p">: [ … ]</tspan>
      </text>
      <text className="dg-code" x="50" y="220">
        <tspan className="dg-p">{"}"}</tspan>
      </text>

      {/* the vocabulary the schema names, as structure rather than a word */}
      <text className="dg-lab" x="34" y="262">composable primitives</text>
      {layers.map((l) => {
        const x = lx;
        lx += l.w + 10;
        return (
          <g key={l.t}>
            <rect className="dg-pill" x={x} y="272" width={l.w} height="24" rx="6" />
            <text className="dg-pilltx" x={x + l.w / 2} y="288" textAnchor="middle">
              {l.t}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

/* ── Any aspect ───────────────────────────────────────────────────────────────────────────────
   One source, four ratios. Every frame shares ONE height and takes its width from the ratio
   itself, so the drawing is the claim rather than an illustration of it. Four, not three: the
   sentence beside this says 16:9, 9:16, 1:1 and 4:5, and a diagram showing three is the sentence
   quietly failing. */
const H = 132;
const RATIOS = [
  { label: "16:9", dim: "1920×1080", r: 16 / 9 },
  { label: "9:16", dim: "1080×1920", r: 9 / 16 },
  { label: "1:1", dim: "1080×1080", r: 1 },
  { label: "4:5", dim: "1080×1350", r: 4 / 5 },
];

export function ProofAspect() {
  const gap = 14;
  const widths = RATIOS.map((x) => Math.round(H * x.r));
  const total = widths.reduce((a, b) => a + b, 0) + gap * (RATIOS.length - 1);
  let x = Math.round((520 - total) / 2);
  const cells = RATIOS.map((rt, i) => {
    const w = widths[i];
    const c = { ...rt, x, w, cx: x + w / 2 };
    x += w + gap;
    return c;
  });

  return (
    <svg className="dg" viewBox={VB} role="img" aria-hidden="true">
      <rect className="dg-chip" x="212" y="6" width="96" height="28" rx="7" />
      <text className="dg-chiptx" x="260" y="24" textAnchor="middle">scene.json</text>
      <text className="dg-lab" x="260" y="52" textAnchor="middle">one source · one pass</text>

      {/* A drop, a bus, four drops. Curving from the chip to each centre made the four paths cross
          each other right where they left it, which read as tangle rather than fan-out. */}
      <path className="dg-fan" d="M260 60v10" />
      <path className="dg-fan" d={`M${cells[0].cx} 70H${cells[cells.length - 1].cx}`} />
      {cells.map((c) => (
        <path key={c.label} className="dg-fan" d={`M${c.cx} 70v20`} />
      ))}

      {cells.map((c) => (
        <g key={c.label}>
          <rect className="dg-frame" x={c.x} y="92" width={c.w} height={H} rx="7" />
          {/* the same mark in every frame, sized to ITS width: the engine recomposes a scene per
              aspect (pin, relative coords), it does not crop one master. Empty outlines would have
              shown four ratios and left "one scene" as a caption to take on faith. */}
          <path className="dg-wave" d={WAVE} transform={waveAt(c.cx, 92 + H / 2, c.w * 0.56)} />
          <text className="dg-lab is-on" x={c.cx} y="248" textAnchor="middle">{c.label}</text>
          <text className="dg-dim" x={c.cx} y="266" textAnchor="middle">{c.dim}</text>
        </g>
      ))}
    </svg>
  );
}
