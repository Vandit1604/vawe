"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { REPO_URL } from "./Header";

// THE LANDING HERO: a move clip playing beside the list of moves, one click to switch.

export type HeroMove = { name: string; title: string; group: string };

export function HeroSplit({ moves }: { moves: HeroMove[] }) {
  const [idx, setIdx] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [still, setStill] = useState(false);
  const video = useRef<HTMLVideoElement>(null);
  const move = moves[idx];

  useEffect(() => {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setStill(true);
      setPlaying(false);
    }
  }, []);

  useEffect(() => {
    const v = video.current;
    if (!v) return;
    if (playing) void v.play().catch(() => setPlaying(false));
    else v.pause();
  }, [playing, move.name]);

  return (
    <section className="hs" id="intro">
      <div className="hs-copy">
        <h1>Write a web page. Get a film.</h1>
        <p className="hs-sub">
          A vawe film is one HTML page: CSS, Web Animations, SVG, canvas or three.js. The renderer seeks
          it frame by frame and encodes the video.
        </p>
        <div className="hs-actions">
          <a className="btn btn-primary" href={REPO_URL}>Get started on GitHub</a>
          <Link className="btn btn-ghost" href="/moves">See the moves</Link>
        </div>
        <ol className="hs-list" aria-label="Moves">
          {moves.map((m, i) => (
            <li key={m.name}>
              <button type="button" aria-current={i === idx ? "true" : undefined} onClick={() => { setIdx(i); if (!still) setPlaying(true); }}>
                <span className="hs-list-title">{m.title}</span>
                <span className="meta">{m.group}</span>
              </button>
            </li>
          ))}
        </ol>
      </div>

      <div className="panel hs-stage">
        <div className="hs-view">
          <video
            ref={video}
            key={move.name}
            className="hs-screen"
            src={`/moves/${move.name}.mp4`}
            poster={`/moves/${move.name}.hd.webp`}
            muted
            loop
            playsInline
            preload="metadata"
            aria-label={`${move.title}, a move rendered by vawe`}
          />
        </div>
        <div className="hs-now">
          <button className="hs-play" type="button" onClick={() => setPlaying((p) => !p)} aria-label={playing ? "Pause" : "Play"}>
            {playing ? (
              <svg width="11" height="11" viewBox="0 0 12 12" aria-hidden="true"><path d="M3 1.5h2v9H3zM7 1.5h2v9H7z" fill="currentColor" /></svg>
            ) : (
              <svg width="11" height="11" viewBox="0 0 12 12" aria-hidden="true"><path d="M3 1.5v9l7.5-4.5z" fill="currentColor" /></svg>
            )}
          </button>
          <span className="hs-now-title">{move.title}</span>
          <Link className="hs-now-link" href={`/moves/${move.name}`} prefetch={false}>Open the move</Link>
        </div>
      </div>
    </section>
  );
}
