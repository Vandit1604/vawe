import { useId, type ReactNode } from "react";
import "./mat-tile.css";

export type MatTone = "mat" | "cobalt" | "oxblood" | "ochre" | "graphite" | "accent";
export type MatDetail = "easing" | "moves" | "agents" | "skills" | "learn" | "compare" | "project" | "films" | "features";

const W = 200;
const H = 125;
const FINE = 5;
const HEAVY = 25;
const HEAVY_X = 0;
const HEAVY_Y = 10;
const CUT = { w: 150, h: 50, y: 35 };
const WORD_SIZE = 34;
const LONG_WORD_SIZE = 30;
const CAP_HEIGHT = 0.71;

function rulerPath() {
  const parts: string[] = [];
  for (let x = 0; x <= W; x += FINE) {
    const len = x % HEAVY === 0 ? 3.4 : 1.6;
    parts.push(`M${x} 0v${len}M${x} ${H}v${-len}`);
  }
  for (let y = 0; y <= H; y += FINE) {
    const len = (y - HEAVY_Y) % HEAVY === 0 ? 3.4 : 1.6;
    parts.push(`M0 ${y}h${len}M${W} ${y}h${-len}`);
  }
  return parts.join("");
}

const RULER_LABELS = [10, 35, 60, 85, 110].map((y, i) => ({ y, n: i + 1 }));
const SCRATCHES = "M31 92l38-5M118 21l24 3M150 102l17-9M7 61l11 2";

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
      <circle cx="16" cy="116" r="2.4" className="mat-fill" />
      <circle cx="184" cy="98" r="2.4" className="mat-fill" />
      <circle cx="70" cy="116" r="2" className="mat-solid" />
      <circle cx="112" cy="98" r="2" className="mat-solid" />
    </>
  ),
  moves: (
    <>
      <path d="M22 24C46 4 90 -2 126 14S160 20 178 20" className="mat-dash" />
      {[
        [22, 24],
        [55, 14],
        [89, 9],
        [128, 14],
        [178, 20],
      ].map(([cx, cy], i) => (
        <rect
          key={cx}
          x={cx - 6}
          y={cy - 6}
          width="12"
          height="12"
          rx="1.5"
          className={i === 4 ? "mat-fill" : "mat-solid"}
          opacity={ghost(i)}
        />
      ))}
    </>
  ),
  agents: (
    <>
      <text x="16" y="113" fontSize="9" className="mat-mono">
        $ vawe doctor
      </text>
      <rect x="92" y="105.5" width="5" height="9" className="mat-fill" />
    </>
  ),
  skills: (
    <>
      {[0, 1, 2, 3, 4].map((i) => (
        <g key={i} transform={`translate(${16 + i * 21} 104)`}>
          <rect width="14" height="14" rx="2" className="mat-solid" />
          <path d="m3.5 7.5 2.5 2.5 4.5-5" />
        </g>
      ))}
    </>
  ),
  learn: (
    <>
      <path d="M20 18H180" className="mat-thin" />
      {[20, 60, 100, 140, 180].map((cx, i) => (
        <circle key={cx} cx={cx} cy="18" r="4.5" className={i < 3 ? "mat-fill" : "mat-solid"} />
      ))}
    </>
  ),
  compare: (
    <>
      {[14, 22, 10, 25, 17, 8, 21].map((h, i) => {
        const x = 16 + i * 25;
        const other = [22, 12, 24, 13, 9, 21, 12][i];
        return (
          <g key={x}>
            <rect x={x} y={118 - h} width="8" height={h} className="mat-fill" />
            <rect x={x + 10} y={118 - other} width="8" height={other} className="mat-solid" />
          </g>
        );
      })}
    </>
  ),
  features: (
    <>
      {[16, 81, 146].map((gx, g) =>
        [0, 1, 2].map((i) => (
          <rect key={`${gx}-${i}`} x={gx + i * 13} y="102" width="10" height="10" rx="1.5" className={i <= g ? "mat-fill" : "mat-solid"} />
        )),
      )}
    </>
  ),
  films: (
    <>
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <rect key={i} x={16 + i * 28.8} y="100" width="24" height="13.5" rx="1.5" className={i === 2 ? "mat-fill" : "mat-solid"} />
      ))}
      <path d="M83.4 103.5v6.5l5.5-3.25z" className="mat-solid" />
    </>
  ),
  project: (
    <>
      {[
        [48, 1, 16],
        [78, 0.55, 40],
        [30, 0.3, 100],
      ].map(([len, a, x], i) => (
        <rect key={i} x={x} y={10 + i * 9} width={len} height="4" rx="1" className="mat-fill" opacity={a} />
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
  const id = useId();
  const x = HEAVY + shift * HEAVY;
  const diag = flip ? `M0 10L${W - 85} ${H}` : `M10 ${H}L${H + 10} 0`;
  const size = word.length > 6 ? LONG_WORD_SIZE : WORD_SIZE;
  const cy = CUT.y + CUT.h / 2;
  return (
    <svg
      className={`mat mat-${tone}`}
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <radialGradient id={`${id}-lit`} gradientUnits="userSpaceOnUse" cx="100" cy="57" r="112">
          <stop offset="0" stopColor="#fff" stopOpacity=".07" />
          <stop offset="1" stopColor="#000" stopOpacity=".24" />
        </radialGradient>
        <filter id={`${id}-grain`} x="0" y="0" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" seed="7" />
          <feColorMatrix values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 .55 -.18" />
        </filter>
      </defs>
      <rect width={W} height={H} className="mat-ground" />
      <rect width={W} height={H} fill={`url(#${id}-lit)`} />
      <rect width={W} height={H} filter={`url(#${id}-grain)`} className="mat-grain" />
      <path d={gridPath(FINE, 0, 0)} className="mat-fine" />
      <path d={gridPath(HEAVY, HEAVY_X, HEAVY_Y)} className="mat-heavy" />
      <path d={SCRATCHES} className="mat-wear" />
      <path d={diag} pathLength="1" className="mat-diag" />
      <path d={rulerPath()} className="mat-ruler" />
      {RULER_LABELS.map(({ y, n }) => (
        <text key={y} x="6.4" y={y} dy=".35em" fontSize="3.6" className="mat-num">
          {n}
        </text>
      ))}
      <g className="mat-detail">{DETAILS[detail]}</g>
      <rect x={x} y={CUT.y} width={CUT.w} height={CUT.h} className="mat-ground" />
      <rect x={x} y={CUT.y} width={CUT.w} height={CUT.h} fill={`url(#${id}-lit)`} />
      <rect x={x + 2.5} y={CUT.y + 2.5} width={CUT.w - 5} height={CUT.h - 5} className="mat-window" />
      <text x={x + CUT.w / 2} y={cy + (size * CAP_HEIGHT) / 2} textAnchor="middle" fontSize={size} className="mat-word">
        {word}
      </text>
    </svg>
  );
}
