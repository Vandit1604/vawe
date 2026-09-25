"use client";
import { useEffect, useRef, useState } from "react";
import { useSceneEngine } from "./useSceneEngine";
import { useStageFit } from "./useStageFit";
import { FILMS } from "./films";
import { clock, type Scene } from "./scene-clips";

// One engine at a time: a card shows its film's still (scripts/site/film-posters.mjs) at rest and
// boots the live film while hovered. A click opens the film large and centred over a darkened page.

type Film = { id: string; title: string; aspect: string };

function FilmCard({ id, title, active, onActive, onOpen }: {
  id: string; title: string; active: boolean; onActive: (on: boolean) => void; onOpen: (f: Film) => void;
}) {
  const [scene, setScene] = useState<Scene | null>(null);

  useEffect(() => {
    fetch(`/scenes/${id}.json`).then((r) => r.json()).then(setScene).catch(() => {});
  }, [id]);

  const { hostRef, meta, booting } = useSceneEngine({
    dataUrl: active ? `/scenes/${id}.json` : null,
    aspect: scene?.aspect ?? "16:9",
    title: `${title}, rendered live`,
    playing: active,
  });
  useStageFit(hostRef, meta);
  const showFilm = active && meta && !booting;

  return (
    <figure
      className={`panel fc${active ? " on" : ""}`}
      onPointerEnter={(e) => e.pointerType === "mouse" && onActive(true)}
      onPointerLeave={(e) => e.pointerType === "mouse" && onActive(false)}
    >
      <button className="fc-stage" type="button" aria-haspopup="dialog" aria-label={`Play ${title}`} onClick={() => onOpen({ id, title, aspect: scene?.aspect ?? "16:9" })}>
        <span className="fc-screen" ref={hostRef} />
        <img className="fc-poster" src={`/assets/film-posters/${id}.jpg`} alt="" hidden={!!showFilm} loading="lazy" decoding="async" />
        {active && booting ? <span className="fc-note meta">starting the engine</span> : null}
      </button>
      <figcaption className="fc-cap">
        <span className="fc-title">{title}</span>
        <span className="meta">{scene ? `${clock(scene.duration)} · ${scene.layers.length} layers` : ""}</span>
        <a className="fc-open" href={`/editor?scene=${id}`}>Open in the editor</a>
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

  const { hostRef, meta, booting } = useSceneEngine({
    dataUrl: film ? `/scenes/${film.id}.json` : null,
    aspect: film?.aspect ?? "16:9",
    title: film ? `${film.title}, rendered live` : "film",
    playing: !!film,
  });
  useStageFit(hostRef, meta);
  const ready = !!film && !!meta && !booting;

  return (
    <dialog
      ref={dialog}
      className="ffocus"
      aria-label={film?.title}
      onClose={onClose}
      onClick={(e) => { if (e.target === e.currentTarget) dialog.current?.close(); }}
    >
      <div className="ffocus-stage">
        <span className="fc-screen" ref={hostRef} />
        {film ? <img className="fc-poster" src={`/assets/film-posters/${film.id}.jpg`} alt="" hidden={ready} /> : null}
      </div>
      <div className="ffocus-bar">
        <span className="fc-title">{film?.title}</span>
        {film ? <a className="fc-open" href={`/editor?scene=${film.id}`}>Open in the editor</a> : null}
        <button className="btn btn-ghost ffocus-close" type="button" onClick={() => dialog.current?.close()}>Close</button>
      </div>
    </dialog>
  );
}

export function FilmGrid({ ids }: { ids?: string[] }) {
  const [active, setActive] = useState<string | null>(null);
  const [open, setOpen] = useState<Film | null>(null);
  const films = ids ? FILMS.filter((f) => ids.includes(f.id)) : FILMS;
  return (
    <>
      <div className={`fgrid${films.length === 1 ? " one" : ""}`}>
        {films.map((f) => (
          <FilmCard
            key={f.id}
            id={f.id}
            title={f.title}
            active={active === f.id && !open}
            onActive={(on) => setActive((cur) => (on ? f.id : cur === f.id ? null : cur))}
            onOpen={setOpen}
          />
        ))}
      </div>
      <FilmFocus film={open} onClose={() => setOpen(null)} />
    </>
  );
}
