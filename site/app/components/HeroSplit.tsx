"use client";
import { useEffect, useRef, useState } from "react";
import { FILMS, filmPoster, filmSrc } from "./films";
import { REPO_URL } from "./Header";

// THE LANDING HERO: a rendered film playing beside the list of films, one click to switch.

export function HeroSplit() {
  const [idx, setIdx] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [still, setStill] = useState(false);
  const video = useRef<HTMLVideoElement>(null);
  const film = FILMS[idx];

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
  }, [playing, film.id]);

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
          <a className="btn btn-ghost" href="/showcase">See the films</a>
        </div>
        <ol className="hs-list" aria-label="Films">
          {FILMS.map((f, i) => (
            <li key={f.id}>
              <button type="button" aria-current={i === idx ? "true" : undefined} onClick={() => { setIdx(i); if (!still) setPlaying(true); }}>
                <span className="hs-list-title">{f.title}</span>
              </button>
            </li>
          ))}
        </ol>
      </div>

      <div className="panel hs-stage">
        <div className="hs-view">
          <video
            ref={video}
            key={film.id}
            className="hs-screen"
            src={filmSrc(film.id)}
            poster={filmPoster(film.id)}
            muted
            loop
            playsInline
            preload="metadata"
            aria-label={`${film.title}, rendered by vawe`}
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
          <span className="hs-now-title">{film.title}</span>
        </div>
      </div>
    </section>
  );
}
