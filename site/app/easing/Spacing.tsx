// Spacing chart (onion skin): the shape at equal time steps. Static SVG, no animation.
// Pure functions and one pure component, so the server renders the cards and the client draws the tray.

export function ghostValues(y: number[], n: number): number[] {
  const last = y.length - 1;
  return Array.from({ length: n }, (_, k) => {
    const p = (k / (n - 1)) * last;
    const i = Math.min(last - 1, Math.floor(p));
    return y[i] + (y[i + 1] - y[i]) * (p - i);
  });
}

export const spacingDomain = (rows: number[][]): [number, number] => [Math.min(0, ...rows.flat()), Math.max(1, ...rows.flat())];

type Props = { values: number[]; domain?: [number, number]; w?: number; h?: number; ghost?: number; label?: string; className?: string };

export function SpacingChart({ values, domain, w = 160, h = 30, ghost = 7, label, className = "ez-spacing" }: Props) {
  const [lo, hi] = domain ?? spacingDomain([values]);
  const pad = ghost / 2 + 2;
  const x = (v: number) => pad + ((v - lo) / (hi - lo)) * (w - 2 * pad);
  const gh = h - 8;
  return (
    <svg className={className} viewBox={`0 0 ${w} ${h}`} role={label ? "img" : undefined} aria-label={label} aria-hidden={label ? undefined : true}>
      <line className="ez-sp-end" x1={x(0)} x2={x(0)} y1={1} y2={h - 1} />
      <line className="ez-sp-end" x1={x(1)} x2={x(1)} y1={1} y2={h - 1} />
      {values.map((v, i) => (
        <rect key={i} className="ez-sp-ghost" x={x(v) - ghost / 2} y={4} width={ghost} height={gh} rx={2} />
      ))}
    </svg>
  );
}
