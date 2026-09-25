"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { useSceneEngine } from "./useSceneEngine";
import { useStageFit } from "./useStageFit";
import { FILMS } from "./films";
import KINDS from "../../lib/layer-kinds.json";

// THE LANDING HERO: a film playing live in the reader's browser, the timeline of its own layers under
// it, and its scene file one tab away. All three read the same scene JSON, so they cannot disagree.

type Layer = { type: string; start?: number; duration?: number; dur?: number; [k: string]: unknown };
type Scene = { aspect?: string; duration: number; layers: Layer[] };
type Clip = { i: number; kind: string; start: number; end: number; label: string; line: string };

const LANE_NAME: Record<string, string> = { text: "Text", media: "Media", shape: "Shape", comp: "Comp", cap: "Captions", sound: "Sound" };
// Fields too long to read in one line of the scene view; the line shows that they exist, not their body.
const BULKY = new Set(["html", "motion", "children", "layers", "parts", "style", "css", "points", "data"]);
const kindOf = (type: string) => (KINDS.kind as Record<string, string>)[type] ?? "comp";

const labelOf = (l: Layer) => {
  const src = typeof l.src === "string" ? l.src.split("/").pop() : undefined;
  const raw = [l.text, l.label, l.id, src, l.block, l.type].find((v) => typeof v === "string" && v) as string;
  return raw.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 48);
};

const lineOf = (l: Layer) =>
  JSON.stringify(Object.fromEntries(Object.entries(l).map(([k, v]) => [k, BULKY.has(k) ? (Array.isArray(v) ? `[…${v.length}]` : "…") : v])));

function clipsOf(scene: Scene): Clip[] {
  return scene.layers.flatMap((l, i) => {
    if (typeof l.start !== "number") return [];
    const length = l.duration ?? l.dur ?? scene.duration - l.start;
    return [{ i, kind: kindOf(l.type), start: l.start, end: Math.min(scene.duration, l.start + length), label: labelOf(l), line: lineOf(l) }];
  });
}

// Overlapping layers stack into rows, as the studio timeline draws them, capped so a busy lane stays short.
const MAX_ROWS = 3;
function packRows(items: Clip[]): (Clip & { row: number })[] {
  const ends: number[] = [];
  return items.map((c) => {
    let row = ends.findIndex((e) => e <= c.start);
    if (row < 0) row = ends.length < MAX_ROWS ? ends.push(0) - 1 : ends.indexOf(Math.min(...ends));
    ends[row] = c.end;
    return { ...c, row };
  });
}

const clock = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

export function HeroSplit() {
  const [idx, setIdx] = useState(0);
  const [view, setView] = useState<"film" | "file">("film");
  const [playing, setPlaying] = useState(true);
  const [onScreen, setOnScreen] = useState(true);
  const [scene, setScene] = useState<Scene | null>(null);
  const [picked, setPicked] = useState<number | null>(null);
  const root = useRef<HTMLDivElement>(null);
  const sceneBox = useRef<HTMLDivElement>(null);
  const film = FILMS[idx];

  useEffect(() => {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) setPlaying(false);
    const el = root.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setOnScreen(e.isIntersecting));
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    let dead = false;
    setScene(null);
    setPicked(null);
    fetch(`/scenes/${film.id}.json`)
      .then((r) => r.json())
      .then((s: Scene) => { if (!dead) setScene(s); })
      .catch(() => {});
    return () => { dead = true; };
  }, [film.id]);

  const { hostRef, meta, frame, booting } = useSceneEngine({
    dataUrl: `/scenes/${film.id}.json`,
    aspect: scene?.aspect ?? "16:9",
    title: `${film.title}, rendered live`,
    playing: playing && onScreen,
  });
  useStageFit(hostRef, meta);

  const clips = useMemo(() => (scene ? clipsOf(scene) : []), [scene]);
  const lanes = useMemo(
    () => KINDS.lanes
      .map((k) => ({ kind: k, items: packRows(clips.filter((c) => c.kind === k)) }))
      .filter((l) => l.items.length)
      .map((l) => ({ ...l, rows: Math.max(...l.items.map((c) => c.row + 1)) })),
    [clips],
  );
  const duration = scene?.duration ?? meta?.duration ?? 1;
  const t = meta ? frame / meta.fps : 0;
  const live = new Set(clips.filter((c) => t >= c.start && t < c.end).map((c) => c.i));

  const openLine = (i: number) => {
    setView("file");
    setPicked(i);
    requestAnimationFrame(() => sceneBox.current?.querySelector(`[data-line="${i}"]`)?.scrollIntoView({ block: "center" }));
  };

  return (
    <section className="hs" id="intro" ref={root}>
      <div className="hs-copy">
        <h1>Every frame of this film is a line of text.</h1>
        <p className="hs-sub">Each bar under the film is one layer of its scene file. Pick a film and watch its layers play.</p>
        <div className="hs-actions">
          <a className="btn btn-primary" href="/editor">Open the editor</a>
          <button className="btn btn-ghost" type="button" onClick={() => setView("file")}>Open the scene file</button>
        </div>
        <ol className="hs-list" aria-label="Films">
          {FILMS.map((f, i) => (
            <li key={f.id}>
              <button type="button" aria-current={i === idx ? "true" : undefined} onClick={() => { setIdx(i); setView("film"); }}>
                <span className="hs-list-title">{f.title}</span>
                {i === idx && meta ? <span className="hs-meta">{clock(meta.duration)}</span> : null}
              </button>
            </li>
          ))}
        </ol>
      </div>

      <div className="panel hs-stage">
        <div className="hs-head">
          <div className="hs-tabs" role="group" aria-label="View">
            <button type="button" aria-pressed={view === "film"} onClick={() => setView("film")}>Film</button>
            <button type="button" aria-pressed={view === "file"} onClick={() => setView("file")}>Scene file</button>
          </div>
          <span className="hs-meta">{scene ? `${clips.length} layers · ${scene.aspect ?? "16:9"}` : "loading"}</span>
        </div>

        <div className="hs-view">
          <div className="hs-screen" ref={hostRef} hidden={view !== "film"} />
          <div className="hs-scene" ref={sceneBox} hidden={view !== "file"}>
            <div>{`{ "module": "scene", "duration": ${duration}, "layers": [`}</div>
            {clips.map((c) => (
              <div key={c.i} data-line={c.i} className={`${live.has(c.i) ? "live" : ""} ${picked === c.i ? "sel" : ""}`}>
                {`  ${c.line},`}
              </div>
            ))}
            <div>{"] }"}</div>
          </div>
          {booting && view === "film" ? <span className="hs-booting hs-meta">starting the engine</span> : null}
        </div>

        <div className="hs-now">
          <button className="hs-play" type="button" onClick={() => setPlaying((p) => !p)} aria-label={playing ? "Pause" : "Play"} disabled={!meta}>
            {playing ? (
              <svg width="11" height="11" viewBox="0 0 12 12" aria-hidden="true"><path d="M3 1.5h2v9H3zM7 1.5h2v9H7z" fill="currentColor" /></svg>
            ) : (
              <svg width="11" height="11" viewBox="0 0 12 12" aria-hidden="true"><path d="M3 1.5v9l7.5-4.5z" fill="currentColor" /></svg>
            )}
          </button>
          <span className="hs-now-title">{film.title}</span>
          <span className="hs-meta">{`${clock(t)} / ${clock(duration)}`}</span>
        </div>

        <div className="hs-tl" style={{ "--p": String(Math.min(1, t / duration)) } as React.CSSProperties}>
          {lanes.map((lane) => (
            <div className="hs-lane" key={lane.kind} style={{ "--rows": String(lane.rows) } as React.CSSProperties}>
              <span className="hs-meta">{LANE_NAME[lane.kind]}</span>
              <div className="hs-track">
                {lane.items.map((c) => (
                  <button
                    key={c.i}
                    type="button"
                    className={`hs-bar lane-${c.kind} ${live.has(c.i) ? "on" : ""}`}
                    style={{ left: `${(c.start / duration) * 100}%`, width: `${((c.end - c.start) / duration) * 100}%`, top: `${c.row * 8 + 1}px` }}
                    title={c.label}
                    aria-label={`${LANE_NAME[c.kind]} layer: ${c.label}. Show its line in the scene file`}
                    onClick={() => openLine(c.i)}
                  />
                ))}
              </div>
            </div>
          ))}
          <span className="hs-playhead" aria-hidden="true" />
        </div>
      </div>
    </section>
  );
}
