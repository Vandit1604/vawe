import type { ReactNode } from "react";
import "./mat-tile.css";

export type MatTone = "mat" | "cobalt" | "oxblood" | "ochre" | "graphite" | "accent";
export type MatDetail = "easing" | "moves" | "agents" | "skills" | "learn" | "compare" | "project";

const W = 200;
const H = 125;
const FINE = 5;
const HEAVY = 25;
const HEAVY_X = 0;
const HEAVY_Y = 10;
const CUT = { w: 150, h: 50, y: 35 };

function gridPath(step: number, x0: number, y0: number) {
  const parts: string[] = [];
  for (let x = x0 % step; x <= W; x += step) parts.push(`M${x} 0V${H}`);
  for (let y = y0 % step; y <= H; y += step) parts.push(`M0 ${y}H${W}`);
  return parts.join("");
}

const ghost = (i: number) => [0.14, 0.24, 0.4, 0.62, 1][i];

const DETAILS: Record<MatDetail, ReactNode> = {
  easing: (
    <>
      <path d="M16 116H70M184 98H112" className="mat-thin" />
      <path d="M16 116C70 116 112 98 184 98" />
      <circle cx="16" cy="116" r="2.2" className="mat-fill" />
      <circle cx="184" cy="98" r="2.2" className="mat-fill" />
      <circle cx="70" cy="116" r="1.8" />
      <circle cx="112" cy="98" r="1.8" />
    </>
  ),
  moves: (
    <>
      <path d="M25 24C48 4 90 -2 126 14S160 20 175 20" className="mat-dash" />
      {[
        [25, 24],
        [55, 14],
        [89, 9],
        [128, 14],
        [175, 20],
      ].map(([cx, cy], i) => (
        <rect
          key={cx}
          x={cx - 6}
          y={cy - 6}
          width="12"
          height="12"
          rx="1.5"
          className={i === 4 ? "mat-fill" : undefined}
          opacity={ghost(i)}
        />
      ))}
    </>
  ),
  agents: (
    <>
      <text x="16" y="110" fontSize="9" className="mat-mono">
        $ vawe doctor
      </text>
      <rect x="92" y="102.5" width="5" height="9" className="mat-fill" />
    </>
  ),
  skills: (
    <>
      {[0, 1, 2, 3, 4].map((i) => (
        <g key={i} transform={`translate(${16 + i * 22} 99)`}>
          <rect width="14" height="14" rx="2" />
          <path d="m3.5 7.5 2.5 2.5 4.5-5" />
        </g>
      ))}
    </>
  ),
  learn: (
    <>
      <path d="M20 18H180" className="mat-thin" />
      {[20, 60, 100, 140, 180].map((cx, i) => (
        <circle key={cx} cx={cx} cy="18" r="4.5" className={i < 3 ? "mat-fill" : "mat-ground-fill"} />
      ))}
    </>
  ),
  compare: (
    <>
      {[14, 22, 10, 25, 17, 8, 21].map((h, i) => {
        const x = 16 + i * 24;
        const other = [22, 12, 24, 13, 9, 21, 12][i];
        return (
          <g key={x}>
            <rect x={x} y={118 - h} width="8" height={h} className="mat-fill" />
            <rect x={x + 10} y={118 - other} width="8" height={other} />
          </g>
        );
      })}
    </>
  ),
  project: (
    <>
      {[
        [48, 1],
        [78, 0.55],
        [30, 0.3],
      ].map(([len, a], i) => (
        <rect key={i} x={i === 1 ? 40 : i === 2 ? 100 : 16} y={8 + i * 9} width={len} height="4" rx="1" className="mat-fill" opacity={a} />
      ))}
    </>
  ),
};

type Props = {
  word: string;
  tone: MatTone;
  detail: MatDetail;
  shift?: -1 | 0 | 1;
  flip?: boolean;
};

export function MatTile({ word, tone, detail, shift = 0, flip = false }: Props) {
  const x = HEAVY + shift * HEAVY;
  const diag = flip ? `M0 0L${W} ${H}` : `M0 ${H}L${W} 0`;
  return (
    <svg
      className={`mat mat-${tone}`}
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
      focusable="false"
    >
      <rect width={W} height={H} className="mat-ground" />
      <path d={gridPath(FINE, 0, 0)} className="mat-fine" />
      <path d={gridPath(HEAVY, HEAVY_X, HEAVY_Y)} className="mat-heavy" />
      <path d={diag} pathLength="1" className="mat-diag" />
      <g className="mat-detail">{DETAILS[detail]}</g>
      <rect x={x} y={CUT.y} width={CUT.w} height={CUT.h} className="mat-ground" />
      <text x={x + CUT.w / 2} y={CUT.y + CUT.h / 2} dy=".35em" textAnchor="middle" fontSize="34" className="mat-word">
        {word}
      </text>
    </svg>
  );
}
