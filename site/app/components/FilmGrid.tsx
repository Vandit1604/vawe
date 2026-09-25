"use client";
import { useEffect, useState } from "react";
import { useSceneEngine } from "./useSceneEngine";
import { useStageFit } from "./useStageFit";
import { FILMS } from "./films";
import { clock, type Scene } from "./scene-clips";

// One engine at a time: a card shows its film's still (scripts/site/film-posters.mjs) at rest, and
// boots the live film only while it is hovered, focused or tapped.

function FilmCard({ id, title, active, onActive }: { id: string; title: string; active: boolean; onActive: (on: boolean) => void }) {
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
      <button className="fc-stage" type="button" aria-pressed={active} aria-label={`${active ? "Stop" : "Play"} ${title}`} onClick={() => onActive(!active)}>
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

export function FilmGrid({ ids }: { ids?: string[] }) {
  const [active, setActive] = useState<string | null>(null);
  const films = ids ? FILMS.filter((f) => ids.includes(f.id)) : FILMS;
  return (
    <div className={`fgrid${films.length === 1 ? " one" : ""}`}>
      {films.map((f) => (
        <FilmCard
          key={f.id}
          id={f.id}
          title={f.title}
          active={active === f.id}
          onActive={(on) => setActive((cur) => (on ? f.id : cur === f.id ? null : cur))}
        />
      ))}
    </div>
  );
}
