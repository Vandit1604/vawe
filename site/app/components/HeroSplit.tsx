"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { REPO_URL } from "./Header";

// THE LANDING HERO: three example films, one player, beside the pitch. The remix page is not published,
// so it has no source link.

const FILMS = [
  {
    id: "three-star",
    tab: "three.js",
    title: "three.js, one page",
    line: "A three.js star turning, rendered from one page.",
    label: "A three.js star turning, a page film rendered by vawe",
    dir: "/hero",
    source: `${REPO_URL}/blob/main/films/examples/three-star/page.html`,
  },
  {
    id: "tracking-hud",
    tab: "Tracking HUD",
    title: "Tracking HUD",
    line: "A lens-filmed tracking HUD: every label is a real pixel coordinate.",
    label: "A tracking HUD filmed through a lens, each label a real pixel coordinate on the type, rendered by vawe",
    dir: "/examples",
    source: `${REPO_URL}/blob/main/films/examples/tracking-hud/page.html`,
    credit: "Style after Michael Nowak (@mnowakdesign)",
  },
  {
    id: "retro-remix",
    tab: "Retro desktop",
    title: "Retro desktop remix",
    line: "An early-2000s desktop where the old answers burn.",
    label: "An early-2000s desktop: a search box, then a stack of old answers burning, then the vawe answer, rendered by vawe",
    dir: "/examples",
  },
] as const;

export function HeroSplit() {
  const [playing, setPlaying] = useState(true);
  const [index, setIndex] = useState(0);
  const film = FILMS[index];
  const video = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) setPlaying(false);
  }, []);

  useEffect(() => {
    const v = video.current;
    if (!v) return;
    if (playing) void v.play().catch(() => setPlaying(false));
    else v.pause();
  }, [playing, index]);

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
            key={film.id}
            ref={video}
            className="hs-screen"
            poster={`${film.dir}/${film.id}.webp`}
            muted
            loop
            playsInline
            preload="metadata"
            aria-label={film.label}
          >
            <source src={`${film.dir}/${film.id}.webm`} type="video/webm" />
            <source src={`${film.dir}/${film.id}.mp4`} type="video/mp4" />
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
          <span className="hs-now-title">{film.title}</span>
          {"source" in film && <a className="hs-now-link" href={film.source}>Read the page</a>}
        </div>
        <p className="hs-cap">
          {film.line}
          {"credit" in film && <span> {film.credit}.</span>}
        </p>
        <div className="hs-tabs" role="group" aria-label="Example films">
          {FILMS.map((f, i) => (
            <button key={f.id} type="button" className="hs-tab" aria-pressed={i === index} onClick={() => setIndex(i)}>
              {f.tab}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
