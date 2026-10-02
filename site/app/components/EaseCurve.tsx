import curves from "./ease-curves.json";

type Name = keyof typeof curves;

export function EaseCurve({ name, label }: { name: Name; label: string }) {
  const pts = curves[name] as [number, number][];
  const W = 240;
  const H = 150;
  const pad = 14;
  const lo = Math.min(0, ...pts.map((p) => p[1]));
  const hi = Math.max(1, ...pts.map((p) => p[1]));
  const x = (u: number) => pad + u * (W - 2 * pad);
  const y = (v: number) => H - pad - ((v - lo) / (hi - lo)) * (H - 2 * pad);
  const d = pts.map((p, i) => `${i ? "L" : "M"}${x(p[0]).toFixed(1)} ${y(p[1]).toFixed(1)}`).join(" ");
  return (
    <svg className="ease-curve" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={label}>
      <line x1={x(0)} y1={y(0)} x2={x(1)} y2={y(0)} className="ec-axis" />
      <line x1={x(0)} y1={y(1)} x2={x(1)} y2={y(1)} className="ec-axis" />
      <line x1={x(0)} y1={y(0)} x2={x(1)} y2={y(1)} className="ec-lin" />
      <path d={d} className="ec-path" />
      <circle cx={x(1)} cy={y(1)} r={3.5} className="ec-dot" />
    </svg>
  );
}
