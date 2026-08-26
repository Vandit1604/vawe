"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useSceneEngine } from "../components/useSceneEngine";
import { useStageFit } from "../components/useStageFit";

// Boot + playback live in useSceneEngine (shared with the blocks browser) and the stage fit lives in
// useStageFit (shared with /playground). What is left here is the editor's own job: turn a JSON
// STRING into something scene.html can fetch, and offer transport controls.

export function ScenePlayer({ json, onError }: { json: string; onError: (e: string | null) => void }) {
  const [playing, setPlaying] = useState(true);

  // boot.js does `await fetch(dataUrl)` — a same-origin blob URL satisfies it with no server.
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const aspect = useMemo(() => {
    try {
      return (JSON.parse(json) as { aspect?: string }).aspect || "16:9";
    } catch {
      return "16:9";
    }
  }, [json]);

  useEffect(() => {
    try {
      JSON.parse(json);
    } catch (e) {
      onError(`JSON: ${(e as Error).message}`);
      setDataUrl(null);
      return;
    }
    const url = URL.createObjectURL(new Blob([json], { type: "application/json" }));
    setDataUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [json, onError]);

  const { hostRef, meta, frame, booting, renderFrame } = useSceneEngine({
    dataUrl,
    aspect,
    title: "Live render of the scene JSON",
    playing,
    onError,
  });

  useStageFit(hostRef, meta);

  const scrub = useCallback(
    (n: number) => {
      setPlaying(false);
      renderFrame(n);
    },
    [renderFrame],
  );

  // Frame stepping is the thing this engine can do that a <video> cannot: renderFrame is pure in n,
  // so a single frame back is exact rather than a seek to the nearest keyframe. The range input
  // already steps with the arrow keys, so these two exist for the pointer.
  const step = (d: number) => { if (meta) scrub(Math.min(meta.totalFrames - 1, Math.max(0, frame + d))); };

  const secs = meta ? (frame / meta.fps).toFixed(2) : "0.00";
  return (
    <div className="sp">
      <div className="sp-stage" ref={hostRef} />
      <div className="sp-bar">
        <button className="sp-step" onClick={() => step(-1)} disabled={!meta} aria-label="Previous frame">‹</button>
        <button className="sp-play" onClick={() => setPlaying((p) => !p)} disabled={!meta} aria-label={playing ? "Pause" : "Play"}>
          {playing ? "❚❚" : "▶"}
        </button>
        <button className="sp-step" onClick={() => step(1)} disabled={!meta} aria-label="Next frame">›</button>
        <input
          className="sp-scrub" type="range" min={0} max={meta ? meta.totalFrames - 1 : 0} value={frame}
          onChange={(e) => scrub(+e.target.value)} disabled={!meta} aria-label="Scrub"
        />
        <span className="sp-time">
          {booting ? "booting…" : meta ? `${secs}s / ${meta.duration.toFixed(2)}s · f${frame} · ${meta.width}×${meta.height}` : "—"}
        </span>
      </div>
    </div>
  );
}
