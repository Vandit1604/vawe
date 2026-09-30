"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { REPO_URL } from "./Header";

// THE LANDING HERO: the three.js example film (films/examples/three-star) beside the pitch.

const FILM_SOURCE = `${REPO_URL}/blob/main/films/examples/three-star/page.html`;

export function HeroSplit() {
  const [playing, setPlaying] = useState(true);
  const video = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) setPlaying(false);
  }, []);

  useEffect(() => {
    const v = video.current;
    if (!v) return;
    if (playing) void v.play().catch(() => setPlaying(false));
    else v.pause();
  }, [playing]);

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
      </div>

      <div className="panel hs-stage">
        <div className="hs-view">
          <video
            ref={video}
            className="hs-screen"
            poster="/hero/three-star.webp"
            muted
            loop
            playsInline
            preload="metadata"
            aria-label="A three.js star turning, a page film rendered by vawe"
          >
            <source src="/hero/three-star.webm" type="video/webm" />
            <source src="/hero/three-star.mp4" type="video/mp4" />
          </video>
        </div>
        <div className="hs-now">
          <button className="hs-play" type="button" onClick={() => setPlaying((p) => !p)} aria-label={playing ? "Pause" : "Play"}>
            {playing ? (
              <svg width="11" height="11" viewBox="0 0 12 12" aria-hidden="true"><path d="M3 1.5h2v9H3zM7 1.5h2v9H7z" fill="currentColor" /></svg>
            ) : (
              <svg width="11" height="11" viewBox="0 0 12 12" aria-hidden="true"><path d="M3 1.5v9l7.5-4.5z" fill="currentColor" /></svg>
            )}
          </button>
          <span className="hs-now-title">three.js, one page</span>
          <a className="hs-now-link" href={FILM_SOURCE}>Read the page</a>
        </div>
      </div>
    </section>
  );
}
