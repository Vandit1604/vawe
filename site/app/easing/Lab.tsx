"use client";

import { useState, type CSSProperties } from "react";
import Link from "next/link";
import { CurveChart, VelocityChart, type Curve } from "./Charts";
import { SpacingChart, ghostValues, spacingDomain } from "./Spacing";

export type Variant = Curve & { slug: string; label: string; linear: string };

const MOVES = [0.3, 0.6, 1, 1.5, 3];
const SLOW = 4;
const GHOSTS = 24;
const TILES = ["Card enters", "Modal scales in", "Toast drops", "Menu slides"] as const;

function Tile({ kind }: { kind: (typeof TILES)[number] }) {
  return (
    <figure className="ez-tile">
      <div className="ez-stage-ui" aria-hidden="true">
        {kind === "Card enters" ? (
          <div className="ez-ui-card"><i /><i /><i /></div>
        ) : kind === "Modal scales in" ? (
          <>
            <div className="ez-ui-dim" />
            <div className="ez-ui-modal"><i /><i /><b /></div>
          </>
        ) : kind === "Toast drops" ? (
          <div className="ez-ui-toast"><span /><i /></div>
        ) : (
          <div className="ez-ui-menu"><i /><i /><i /><i /></div>
        )}
      </div>
      <figcaption className="meta">{kind}</figcaption>
    </figure>
  );
}

export function Lab({ current, variants }: { current: string; variants: Variant[] }) {
  const [sel, setSel] = useState(Math.max(0, variants.findIndex((v) => v.slug === current)));
  const [move, setMove] = useState(1.5);
  const [loop, setLoop] = useState(true);
  const [slow, setSlow] = useState(false);
  const [run, setRun] = useState(0);
  const v = variants[sel];
  const style = {
    "--ez": v.linear,
    "--d": `${move * 2 * (slow ? SLOW : 1)}s`,
    "--loop": loop ? "infinite" : "1",
  } as CSSProperties;
  const ghosts = ghostValues(v.y, GHOSTS);
  const even = Array.from({ length: GHOSTS }, (_, k) => k / (GHOSTS - 1));
  const domain = spacingDomain([ghosts]);

  return (
    <div className="ez-lab" style={style}>
      <div className="panel ez-lab-bar">
        {variants.length > 1 ? (
          <div className="ez-chips" role="group" aria-label="Variant of this ease">
            {variants.map((x, i) => (
              <button key={x.slug} type="button" className="ez-chip" aria-pressed={sel === i} onClick={() => { setSel(i); setRun((n) => n + 1); }}>{x.label}</button>
            ))}
          </div>
        ) : null}
        <div className="ez-lab-motion ez-chips" role="group" aria-label="Duration of the move">
          {MOVES.map((m) => (
            <button key={m} type="button" className="ez-chip" aria-pressed={move === m} onClick={() => { setMove(m); setRun((n) => n + 1); }}>{m} s</button>
          ))}
        </div>
        <div className="ez-lab-motion ez-chips" role="group" aria-label="Playback">
          <button type="button" className="ez-chip" aria-pressed={loop} onClick={() => { setLoop((x) => !x); setRun((n) => n + 1); }}>Loop</button>
          <button type="button" className="ez-chip" aria-pressed={slow} onClick={() => { setSlow((x) => !x); setRun((n) => n + 1); }}>0.25&times; speed</button>
          <button type="button" className="ez-chip" onClick={() => setRun((n) => n + 1)}>Replay</button>
        </div>
        {sel !== variants.findIndex((x) => x.slug === current) ? (
          <Link className="ez-link ez-lab-open" href={`/easing/${v.slug}`} prefetch={false}>Open {v.name}</Link>
        ) : null}
      </div>

      <div key={run} className="ez-lab-body">
        <figure className="panel ez-chart ez-graphs">
          <span className="meta">Progress against time, with the playhead</span>
          <CurveChart e={v} w={400} h={190} playhead />
          <span className="meta">Speed against time, in multiples of average speed</span>
          <VelocityChart e={v} w={400} h={140} playhead />
          <figcaption className="ez-cap">Dashed: linear, and 1&times; speed. The dot and the line move with the object below.{v.peakSpeed > 12 ? " The speed graph stops at 12×." : ""}</figcaption>
        </figure>

        <div className="ez-lab-side">
        <figure className="panel ez-chart ez-spacing-fig">
            <span className="meta">Spacing: {GHOSTS} equal steps of time</span>
            <div className="ez-row">
              <span className="ez-lab-name" title={v.name}>{v.name}</span>
              <SpacingChart values={ghosts} domain={domain} w={340} h={44} ghost={8} label={`${v.name} at ${GHOSTS} equal time steps. Ghosts bunch where the ease is slow and spread where it is fast.`} />
            </div>
            <div className="ez-row">
              <span className="ez-lab-name">linear</span>
              <SpacingChart values={even} domain={domain} w={340} h={44} ghost={8} />
            </div>
            <figcaption className="ez-cap">Bunched shapes are slow. Wide gaps are fast. Past the right line means overshoot.</figcaption>
          </figure>
  
          <div className="panel ez-demo">
            <div className="ez-row">
              <span className="ez-lab-name" title={v.name}>{v.name}</span>
              <div className="ez-track"><span className="ez-box" /></div>
            </div>
            <div className="ez-row">
              <span className="ez-lab-name">linear</span>
              <div className="ez-track"><span className="ez-box ez-box-ref" /></div>
            </div>
            <p className="ez-cap ez-stopnote">Your system asks for reduced motion, so nothing plays. The charts above show the whole move.</p>
          </div>
        </div>

        <div className="panel ez-ui">
          <span className="meta">Four interface motions with this ease</span>
          <div className="ez-tiles">
            {TILES.map((t) => <Tile key={t} kind={t} />)}
          </div>
        </div>
      </div>
    </div>
  );
}
