import type { Ease } from "../../lib/easing";

const W = 320, H = 220, L = 34, R = 12, T = 14, B = 26;

type Scale = { x: (u: number) => number; y: (v: number) => number };

function scale(lo: number, hi: number): Scale {
  return { x: (u) => L + u * (W - L - R), y: (v) => T + (1 - (v - lo) / (hi - lo)) * (H - T - B) };
}

function path(values: number[], s: Scale, lo: number, hi: number) {
  const n = values.length - 1;
  return values.map((v, i) => `${i ? "L" : "M"}${s.x(i / n).toFixed(1)} ${s.y(Math.min(hi, Math.max(lo, v))).toFixed(1)}`).join("");
}

function Frame({ s, lo, marks, yLabel }: { s: Scale; lo: number; marks: number[]; yLabel: string }) {
  return (
    <>
      {marks.map((m) => (
        <g key={m}>
          <line className="ez-grid" x1={L} x2={W - R} y1={s.y(m)} y2={s.y(m)} />
          <text className="ez-tick" x={L - 6} y={s.y(m) + 4} textAnchor="end">{m}</text>
        </g>
      ))}
      {[0, 0.5, 1].map((u) => (
        <text className="ez-tick" key={u} x={s.x(u)} y={H - 8} textAnchor={u === 0 ? "start" : u === 1 ? "end" : "middle"}>{u === 0 ? "0" : u === 1 ? "1" : "0.5"}</text>
      ))}
      <text className="ez-axis" x={L} y={10}>{yLabel}</text>
      <line className="ez-base" x1={L} x2={W - R} y1={s.y(Math.max(lo, 0))} y2={s.y(Math.max(lo, 0))} />
    </>
  );
}

export function CurveChart({ e }: { e: Ease }) {
  const lo = Math.min(0, ...e.y) - 0.06, hi = Math.max(1, ...e.y) + 0.06;
  const s = scale(lo, hi);
  const at = (u: number, v: number) => <circle className="ez-dot" cx={s.x(u)} cy={s.y(v)} r={3.5} />;
  return (
    <svg className="ez-svg" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${e.name}: progress from 0 to 1 over normalised time. 50% of the travel is done at ${Math.round(e.t50 * 100)}% of the time.`}>
      <Frame s={s} lo={lo} marks={[0, 1]} yLabel="progress" />
      <line className="ez-diag" x1={s.x(0)} y1={s.y(0)} x2={s.x(1)} y2={s.y(1)} />
      <path className="ez-line" d={path(e.y, s, lo, hi)} fill="none" />
      {at(e.t50, 0.5)}
      {at(e.t90, 0.9)}
      <text className="ez-note" x={s.x(e.t50) + 7} y={s.y(0.5) + 14}>50%</text>
      <text className="ez-note" x={s.x(e.t90) - 7} y={s.y(0.9) - 8} textAnchor="end">90%</text>
    </svg>
  );
}

const VCAP = 12;

export function VelocityChart({ e }: { e: Ease }) {
  const lo = Math.min(0, ...e.vel) - 0.2;
  const hi = Math.min(VCAP, Math.max(2, ...e.vel)) + 0.3;
  const s = scale(lo, hi);
  const marks = [0, 1, ...(hi > 4 ? [Math.floor(hi / 4) * 4].filter((m) => m > 1) : hi > 2.5 ? [2] : [])];
  return (
    <svg className="ez-svg" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${e.name} velocity as a multiple of average speed. Peak ${e.peakSpeed > 20 ? "over 20" : e.peakSpeed} times average.`}>
      <Frame s={s} lo={lo} marks={marks} yLabel="speed, x average" />
      <line className="ez-diag" x1={s.x(0)} x2={s.x(1)} y1={s.y(1)} y2={s.y(1)} />
      <path className="ez-line" d={path(e.vel, s, lo, hi)} fill="none" />
    </svg>
  );
}

export function Thumb({ e }: { e: Ease }) {
  const lo = Math.min(0, ...e.y) - 0.08, hi = Math.max(1, ...e.y) + 0.08;
  const w = 88, h = 56, pad = 5;
  const sx = (u: number) => pad + u * (w - 2 * pad), sy = (v: number) => pad + (1 - (v - lo) / (hi - lo)) * (h - 2 * pad);
  const d = e.y.filter((_, i) => i % 2 === 0).map((v, i, a) => `${i ? "L" : "M"}${sx(i / (a.length - 1)).toFixed(1)} ${sy(v).toFixed(1)}`).join("");
  return (
    <svg className="ez-thumb" viewBox={`0 0 ${w} ${h}`} aria-hidden="true">
      <line className="ez-diag" x1={sx(0)} y1={sy(0)} x2={sx(1)} y2={sy(1)} />
      <path className="ez-line" d={d} fill="none" />
    </svg>
  );
}
