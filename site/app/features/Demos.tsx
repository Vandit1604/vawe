"use client";

import { useEffect, useRef, useState } from "react";

const ASPECTS: { id: string; w: number; h: number; px: string }[] = [
  { id: "16:9", w: 16, h: 9, px: "1920\u00a0×\u00a01080" },
  { id: "9:16", w: 9, h: 16, px: "1080\u00a0×\u00a01920" },
  { id: "1:1", w: 1, h: 1, px: "1080\u00a0×\u00a01080" },
  { id: "4:5", w: 4, h: 5, px: "1080\u00a0×\u00a01350" },
  { id: "4:3", w: 4, h: 3, px: "1440\u00a0×\u00a01080" },
];

// One small page, laid out by CSS for each canvas: the same markup, the size comes from the box.
export function AspectDemo() {
  const [i, setI] = useState(0);
  const a = ASPECTS[i];
  return (
    <div className="ftv panel">
      <div className="ftv-bar" role="group" aria-label="Aspect">
        {ASPECTS.map((x, k) => (
          <button key={x.id} type="button" className="ez-chip" aria-pressed={k === i} onClick={() => setI(k)}>{x.id}</button>
        ))}
        <span className="meta ftv-read">{a.px}</span>
      </div>
      <div className="ftv-stage ftv-aspect">
        <div className="ftv-page" style={{ aspectRatio: `${a.w} / ${a.h}`, ["--w" as string]: a.w, ["--h" as string]: a.h }}>
          <div className="ftv-page-in">
            <b>One page.</b>
            <b>One film.</b>
            <i />
          </div>
        </div>
      </div>
    </div>
  );
}

const FPS = 30;

// Scrubs a rendered film by time: the frame under the handle is the one rendered for that second.
export function SeekScrubber({ src, webm, poster }: { src: string; webm: string; poster: string }) {
  const video = useRef<HTMLVideoElement>(null);
  const [t, setT] = useState(4.2);
  const [dur, setDur] = useState(14.2);
  useEffect(() => {
    const v = video.current;
    if (v && Number.isFinite(v.duration)) setDur(v.duration);
  }, []);
  useEffect(() => {
    const v = video.current;
    if (v) v.currentTime = t;
  }, [t]);
  return (
    <div className="ftv panel">
      <div className="ftv-stage ftv-film">
        <video ref={video} muted playsInline preload="auto" poster={poster} onLoadedMetadata={(e) => setDur(e.currentTarget.duration)} aria-label="Film at the chosen second">
          <source src={webm} type="video/webm" />
          <source src={src} type="video/mp4" />
        </video>
      </div>
      <label className="ftv-scrub">
        <span className="ez-sr">Seek time in seconds</span>
        <input type="range" min={0} max={dur} step={1 / FPS} value={t} onChange={(e) => setT(Number(e.target.value))} />
      </label>
      <p className="ftv-read mono">t = {t.toFixed(3)} s <span>frame {Math.round(t * FPS)} at {FPS} fps</span></p>
    </div>
  );
}

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

type Card = { name: string; title: string; group: string | null };

// The move list is plain JSON: an agent filters it and fetches only the files it needs.
export function MoveFilter({ moves, groups }: { moves: Card[]; groups: { id: string; label: string }[] }) {
  const [g, setG] = useState(groups[0]?.id ?? "");
  const hit = moves.filter((m) => m.group === g);
  return (
    <div className="ftv panel">
      <div className="ftv-bar" role="group" aria-label="Group">
        {groups.map((x) => (
          <button key={x.id} type="button" className="ez-chip" aria-pressed={x.id === g} onClick={() => setG(x.id)}>{x.label}</button>
        ))}
      </div>
      <p className="ftv-read mono">GET /moves/index.json <span>{hit.length} of {moves.length} moves</span></p>
      <ul className="ftv-files">
        {hit.slice(0, 8).map((m) => (
          <li key={m.name} className="mono">/moves/{m.name}.md</li>
        ))}
        {hit.length > 8 ? <li className="mono ftv-more">and {hit.length - 8} more</li> : null}
      </ul>
    </div>
  );
}
