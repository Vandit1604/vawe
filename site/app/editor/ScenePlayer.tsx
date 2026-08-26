"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSceneEngine } from "../components/useSceneEngine";

// Boot + playback live in useSceneEngine (shared with the blocks browser). What is left here is the
// editor's own job: turn a JSON STRING into something scene.html can fetch, fit the stage, and offer
// transport controls.

export function ScenePlayer({ json, onError }: { json: string; onError: (e: string | null) => void }) {
  const host = useRef<HTMLDivElement>(null);
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

  // The scene lays out at its TRUE pixel size (1920x1080) — every x/y in the JSON is a real frame
  // coordinate. So the iframe must be that size and get scaled down to fit, never resized: a narrow
  // iframe would just crop to the top-left corner and show a black stage.
  //
  // CONTAIN, not fit-to-width. The stage is a fixed region of an application frame now, so a scene
  // is fitted on BOTH axes and centred in whatever is left. Scaling on width alone was correct only
  // while the stage could grow to any height, and it silently overflowed a 9:16 scene off the bottom
  // of the panel — which is the one ratio the page advertises as free.
  useEffect(() => {
    const h = host.current;
    if (!h || !meta) return;
    const fit = () => {
      const s = Math.min(h.clientWidth / meta.width, h.clientHeight / meta.height);
      h.style.setProperty("--sp-scale", String(s));
      h.style.setProperty("--sp-w", `${meta.width}px`);
      h.style.setProperty("--sp-h", `${meta.height}px`);
      h.style.setProperty("--sp-x", `${(h.clientWidth - meta.width * s) / 2 / s}px`);
      h.style.setProperty("--sp-y", `${(h.clientHeight - meta.height * s) / 2 / s}px`);
      // Below 900px the frame has no fixed height, so the stage has nothing to fill and would
      // collapse to nothing. There it takes the scene's own ratio instead, which only the scene
      // knows — so the scene publishes it and the stylesheet reads it.
      h.style.setProperty("--sp-ar", `${meta.width} / ${meta.height}`);
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(h);
    return () => ro.disconnect();
  }, [meta]);

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
      <div
        className="sp-stage"
        ref={(el) => {
          host.current = el;
          hostRef.current = el;
        }}
      />
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
