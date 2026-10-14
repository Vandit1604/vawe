"use client";

import { useState, type CSSProperties } from "react";

const MOVES = [0.3, 0.6, 1, 1.5, 3];

export function Demo({ name, ez }: { name: string; ez: string }) {
  const [move, setMove] = useState(1.5);
  const [run, setRun] = useState(0);
  const style = { "--ez": ez, "--d": `${move * 2}s` } as CSSProperties;
  return (
    <div className="panel ez-demo" style={style}>
      <div className="ez-demo-bar">
        <div className="ez-chips" role="group" aria-label="Duration of the move">
          {MOVES.map((m) => (
            <button key={m} type="button" className="ez-chip" aria-pressed={move === m} onClick={() => setMove(m)}>{m} s</button>
          ))}
        </div>
        <button type="button" className="ez-chip" onClick={() => setRun((n) => n + 1)}>Replay</button>
      </div>
      <div className="ez-row" key={`a-${run}`}>
        <span className="ez-lab" title={name}>{name}</span>
        <div className="ez-track"><span className="ez-box" /></div>
      </div>
      <div className="ez-row" key={`b-${run}`}>
        <span className="ez-lab">linear</span>
        <div className="ez-track"><span className="ez-box ez-box-ref" /></div>
      </div>
      <p className="ez-cap ez-stopnote">Your system asks for reduced motion, so the boxes rest at the end of the move.</p>
    </div>
  );
}
