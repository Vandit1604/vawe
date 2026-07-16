/* The three proof diagrams for the claims section.
 *
 * Each claim gets a diagram drawn for THAT claim, never a shared shape: determinism is two frames
 * hashing the same, agent-native is prose becoming a contract, any-aspect is one source fanning out
 * to four ratios. The variance is the argument.
 *
 * They are SVG rather than boxes of styled text so the geometry can carry meaning: in the aspect
 * diagram the rectangles are not drawn to look like ratios, their widths ARE the ratios (one shared
 * height times 16/9, 9/16, 1/1, 4/5), so the picture cannot drift from the sentence above it.
 *
 * Cobalt is the only ink here, per The One Voice Rule. Strokes are non-scaling so a transform-scaled
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

/* Deterministic: the same frame, rendered twice, byte-identical. Two frames rather than a
   before/after, because nothing changes — that IS the claim. */
export function ProofHash() {
  return (
    <svg className="dg" viewBox="0 0 420 168" role="img" aria-hidden="true">
      <text className="dg-lab" x="2" y="9">pass 1 · frame 412</text>
      <text className="dg-lab" x="246" y="9">pass 2 · frame 412</text>

      <rect className="dg-frame" x="1" y="20" width="174" height="98" rx="10" />
      <rect className="dg-frame" x="245" y="20" width="174" height="98" rx="10" />

      <path className="dg-wave" d={WAVE} transform={waveAt(88, 69, 89)} />
      <path className="dg-wave" d={WAVE} transform={waveAt(332, 69, 89)} />

      {/* the equals is the whole point, so it is cobalt and it is the only thing between them */}
      <path className="dg-eq" d="M198 62h24M198 76h24" />

      <text className="dg-hash" x="88" y="142" textAnchor="middle">a4f0…9c1</text>
      <text className="dg-hash" x="332" y="142" textAnchor="middle">a4f0…9c1</text>
      <text className="dg-ok" x="210" y="164" textAnchor="middle">identical bytes</text>
    </svg>
  );
}

/* Agent-native: prose in, contract out. The literal prompt and the literal JSON, not a speech-bubble
   glyph pointing at a document glyph — an abstract metaphor here would be exactly the placeholder
   this repo's own value gate forbids. */
export function ProofSay() {
  return (
    <svg className="dg" viewBox="0 0 420 168" role="img" aria-hidden="true">
      <rect className="dg-soft" x="1" y="0" width="418" height="46" rx="10" />
      <text className="dg-quote" x="16" y="29">
        “a 15s launch film, cobalt, ends on the wordmark”
      </text>

      <path className="dg-arrow" d="M210 52v16" />
      <path className="dg-arrow" d="M204 63l6 7 6-7" />

      <rect className="dg-card" x="1" y="76" width="418" height="92" rx="10" />
      <text className="dg-code" x="16" y="101">
        <tspan className="dg-p">{"{"}</tspan> <tspan className="dg-k">&quot;module&quot;</tspan>
        <tspan className="dg-p">:</tspan> <tspan className="dg-s">&quot;scene&quot;</tspan>
        <tspan className="dg-p">,</tspan> <tspan className="dg-k">&quot;theme&quot;</tspan>
        <tspan className="dg-p">:</tspan> <tspan className="dg-s">&quot;vawe&quot;</tspan>
        <tspan className="dg-p">,</tspan>
      </text>
      <text className="dg-code" x="16" y="125">
        {"  "}
        <tspan className="dg-k">&quot;layers&quot;</tspan>
        <tspan className="dg-p">: [ … ]</tspan>
      </text>
      <text className="dg-code" x="16" y="149">
        <tspan className="dg-p">{"}"}</tspan>
      </text>
    </svg>
  );
}

/* Any aspect: one source, four ratios. Every frame shares ONE height and takes its width from the
   ratio itself, so the drawing is the claim rather than an illustration of it. Four, not three: the
   sentence beside this says 16:9, 9:16, 1:1 and 4:5, and a diagram that shows three is the sentence
   quietly failing. */
const H = 84;
const RATIOS: { label: string; r: number }[] = [
  { label: "16:9", r: 16 / 9 },
  { label: "9:16", r: 9 / 16 },
  { label: "1:1", r: 1 },
  { label: "4:5", r: 4 / 5 },
];

export function ProofAspect() {
  const gap = 16;
  const widths = RATIOS.map((x) => Math.round(H * x.r));
  const total = widths.reduce((a, b) => a + b, 0) + gap * (RATIOS.length - 1);
  let x = Math.round((420 - total) / 2);
  const cells = RATIOS.map((rt, i) => {
    const w = widths[i];
    const cell = { ...rt, x, w, cx: x + w / 2 };
    x += w + gap;
    return cell;
  });

  return (
    <svg className="dg" viewBox="0 0 420 172" role="img" aria-hidden="true">
      {/* the one source */}
      <rect className="dg-chip" x="162" y="0" width="96" height="26" rx="7" />
      <text className="dg-chiptx" x="210" y="17" textAnchor="middle">scene.json</text>

      {/* A drop, a bus, four drops. Curving from the chip to each centre made the four paths cross
          each other right where they left it, which read as tangle rather than fan-out. */}
      <path className="dg-fan" d="M210 28v8" />
      <path className="dg-fan" d={`M${cells[0].cx} 36H${cells[cells.length - 1].cx}`} />
      {cells.map((c) => (
        <path key={c.label} className="dg-fan" d={`M${c.cx} 36v18`} />
      ))}

      {cells.map((c) => (
        <g key={c.label}>
          <rect className="dg-frame" x={c.x} y="56" width={c.w} height={H} rx="7" />
          {/* the same mark in every frame, sized to ITS width: the engine recomposes a scene per
              aspect (pin, relative coords), it does not crop one master. Empty outlines would have
              shown four ratios and left "one scene" as a caption to take on faith. */}
          <path className="dg-wave" d={WAVE} transform={waveAt(c.cx, 56 + H / 2, c.w * 0.58)} />
          <text className="dg-lab" x={c.cx} y="158" textAnchor="middle">
            {c.label}
          </text>
        </g>
      ))}
    </svg>
  );
}
