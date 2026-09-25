"use client";
import { useEffect, useMemo, useState } from "react";
import { useSceneEngine } from "./useSceneEngine";
import { useStageFit } from "./useStageFit";
import { FILMS } from "./films";
import KINDS from "../../lib/layer-kinds.json";
import { clipsOf, clock, packRows, type Scene } from "./scene-clips";

// One engine at a time: a card boots the live film only while it is hovered, focused or tapped, and
// shows its own layer timeline the rest of the time.

function FilmCard({ id, title, active, onActive }: { id: string; title: string; active: boolean; onActive: (on: boolean) => void }) {
  const [scene, setScene] = useState<Scene | null>(null);

  useEffect(() => {
    fetch(`/scenes/${id}.json`).then((r) => r.json()).then(setScene).catch(() => {});
  }, [id]);

  const { hostRef, meta, frame, booting } = useSceneEngine({
    dataUrl: active ? `/scenes/${id}.json` : null,
    aspect: scene?.aspect ?? "16:9",
    title: `${title}, rendered live`,
    playing: active,
  });
  useStageFit(hostRef, meta);

  const clips = useMemo(() => (scene ? clipsOf(scene) : []), [scene]);
  const lanes = useMemo(
    () => KINDS.lanes
      .map((k) => ({ kind: k, items: packRows(clips.filter((c) => c.kind === k)) }))
      .filter((l) => l.items.length),
    [clips],
  );
  const duration = scene?.duration ?? 1;
  const t = active && meta ? frame / meta.fps : 0;
  const showFilm = active && meta && !booting;

  return (
    <figure
      className={`panel fc${active ? " on" : ""}`}
      onPointerEnter={(e) => e.pointerType === "mouse" && onActive(true)}
      onPointerLeave={(e) => e.pointerType === "mouse" && onActive(false)}
    >
      <button className="fc-stage" type="button" aria-pressed={active} aria-label={`${active ? "Stop" : "Play"} ${title}`} onClick={() => onActive(!active)}>
        <span className="fc-score" aria-hidden="true" hidden={!!showFilm}>
          {lanes.map((lane) => (
            <span className="fc-lane" key={lane.kind} style={{ "--rows": String(Math.max(...lane.items.map((c) => c.row + 1))) } as React.CSSProperties}>
              {lane.items.map((c) => (
                <span
                  key={c.i}
                  className={`fc-bar lane-${c.kind}`}
                  style={{ left: `${(c.start / duration) * 100}%`, width: `${((c.end - c.start) / duration) * 100}%`, top: `${c.row * 10}px` }}
                />
              ))}
            </span>
          ))}
        </span>
        <span className="fc-screen" ref={hostRef} />
        {active && booting ? <span className="fc-note meta">starting the engine</span> : null}
        {!active ? <span className="fc-note fc-idle meta" /> : null}
        <span className="fc-playhead" aria-hidden="true" style={{ "--p": String(Math.min(1, t / duration)) } as React.CSSProperties} />
      </button>
      <figcaption className="fc-cap">
        <span className="fc-title">{title}</span>
        <span className="meta">
          {scene ? `${clock(scene.duration)} · ${clips.length} layers` : "loading"}
        </span>
        <a className="fc-open" href={`/editor?scene=${id}`}>Open in the editor</a>
      </figcaption>
    </figure>
  );
}

export function FilmGrid() {
  const [active, setActive] = useState<string | null>(null);
  return (
    <div className="fgrid">
      {FILMS.map((f) => (
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
