"use client";
import { useEffect, useRef, useState } from "react";
import { FILMS, filmPoster, filmSrc } from "./films";

// A card shows its film's still at rest and plays the rendered mp4 while a mouse hovers it. A click
// opens the film large, with controls, over a darkened page.

type Film = { id: string; title: string };

const reducedMotion = () => matchMedia("(prefers-reduced-motion: reduce)").matches;

function FilmCard({ film, onOpen }: { film: Film; onOpen: (f: Film) => void }) {
  const video = useRef<HTMLVideoElement>(null);

  const hover = (on: boolean) => {
    const v = video.current;
    if (!v) return;
    if (on && !reducedMotion()) void v.play().catch(() => {});
    else v.pause();
  };

  return (
    <figure
      className="panel fc"
      onPointerEnter={(e) => e.pointerType === "mouse" && hover(true)}
      onPointerLeave={(e) => e.pointerType === "mouse" && hover(false)}
    >
      <button className="fc-stage" type="button" aria-haspopup="dialog" aria-label={`Play ${film.title}`} onClick={() => onOpen(film)}>
        <video ref={video} className="fc-poster" src={filmSrc(film.id)} poster={filmPoster(film.id)} muted loop playsInline preload="none" />
      </button>
      <figcaption className="fc-cap">
        <span className="fc-title">{film.title}</span>
      </figcaption>
    </figure>
  );
}

function FilmFocus({ film, onClose }: { film: Film | null; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const d = dialog.current;
    if (!d) return;
    if (film && !d.open) d.showModal();
    if (!film && d.open) d.close();
  }, [film]);

  return (
    <dialog
      ref={dialog}
      className="ffocus"
      aria-label={film?.title}
      onClose={onClose}
      onClick={(e) => { if (e.target === e.currentTarget) dialog.current?.close(); }}
    >
      <div className="ffocus-stage">
        {film ? (
          <video
            key={film.id}
            className="fc-poster"
            src={filmSrc(film.id)}
            poster={filmPoster(film.id)}
            muted
            playsInline
            controls
            autoPlay={!reducedMotion()}
          />
        ) : null}
      </div>
      <div className="ffocus-bar">
        <span className="fc-title">{film?.title}</span>
        <button className="btn btn-ghost ffocus-close" type="button" onClick={() => dialog.current?.close()}>Close</button>
      </div>
    </dialog>
  );
}

export function FilmGrid({ ids }: { ids?: string[] }) {
  const [open, setOpen] = useState<Film | null>(null);
  const films = ids ? FILMS.filter((f) => ids.includes(f.id)) : FILMS;
  return (
    <>
      <div className={`fgrid${films.length === 1 ? " one" : ""}`}>
        {films.map((f) => <FilmCard key={f.id} film={f} onOpen={setOpen} />)}
      </div>
      <FilmFocus film={open} onClose={() => setOpen(null)} />
    </>
  );
}
