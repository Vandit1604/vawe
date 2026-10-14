"use client";

import { useState } from "react";

// Shutter 180 degrees: the smear is half of one frame of travel, split across N subframes.
export function BlurDemo() {
  const [n, setN] = useState(8);
  const ghosts = Array.from({ length: n }, (_, k) => k);
  const smear = 56;
  return (
    <div className="ftv panel">
      <div className="ftv-stage ftv-blur">
        <div className="ftv-run">
          {ghosts.map((k) => (
            <span key={k} className="ftv-ghost" style={{ left: `${n === 1 ? 0 : (k / (n - 1)) * smear}px`, opacity: 1 / Math.sqrt(n) }} />
          ))}
        </div>
      </div>
      <label className="ftv-slide">
        <span className="meta">Subframes per frame</span>
        <input type="range" min={1} max={32} step={1} value={n} onChange={(e) => setN(Number(e.target.value))} />
        <b className="mono">{n}</b>
      </label>
    </div>
  );
}
