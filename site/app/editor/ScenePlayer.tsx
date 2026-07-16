"use client";
import { useCallback, useEffect, useRef, useState } from "react";

// The engine is a web page: formats/scene/scene.html?data=<url> boots the scene and exposes
// window.__engine = { meta, renderFrame(n) }, pure in n. So playback is just a wall-clock loop
// calling renderFrame from OUT HERE. boot() virtualises rAF/Date INSIDE the frame, which is
// exactly why driving it from the parent stays deterministic — our loop is never captured.

type Meta = { fps: number; duration: number; totalFrames: number; width: number; height: number };
type Engine = { meta: Meta; renderFrame: (n: number) => void };

export function ScenePlayer({ json, onError }: { json: string; onError: (e: string | null) => void }) {
  const host = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLIFrameElement | null>(null);
  const engineRef = useRef<Engine | null>(null);
  const rafRef = useRef<number>(0);
  const blobRef = useRef<string | null>(null);

  const [meta, setMeta] = useState<Meta | null>(null);
  const [frame, setFrame] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [booting, setBooting] = useState(true);

  const stop = () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); rafRef.current = 0; };

  // The scene lays out at its TRUE pixel size (1920x1080) — every x/y in the JSON is a real frame
  // coordinate. So the iframe must be that size and get scaled down to fit, never resized: a
  // narrow iframe would just crop to the top-left corner and show a black stage.
  useEffect(() => {
    const h = host.current;
    if (!h || !meta) return;
    const fit = () => {
      const s = h.clientWidth / meta.width;
      h.style.setProperty("--sp-scale", String(s));
      h.style.setProperty("--sp-w", `${meta.width}px`);
      h.style.setProperty("--sp-h", `${meta.height}px`);
      h.style.aspectRatio = `${meta.width} / ${meta.height}`;
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(h);
    return () => ro.disconnect();
  }, [meta]);

  // (re)boot the scene whenever the JSON changes
  useEffect(() => {
    let dead = false;
    stop();
    setBooting(true);
    engineRef.current = null;

    let parsed: { aspect?: string } | null = null;
    try { parsed = JSON.parse(json); } catch (e) {
      onError(`JSON: ${(e as Error).message}`); setBooting(false); return;
    }

    if (blobRef.current) URL.revokeObjectURL(blobRef.current);
    // boot.js does `await fetch(dataUrl)` — a same-origin blob URL satisfies it with no server.
    const blob = URL.createObjectURL(new Blob([json], { type: "application/json" }));
    blobRef.current = blob;

    const el = document.createElement("iframe");
    el.className = "sp-frame";
    // WCAG 4.1.2 — the most important element on the page was announcing as an unnamed frame.
    el.title = "Live render of the scene JSON";
    const aspect = parsed?.aspect || "16:9";
    el.src = `/formats/scene/scene.html?data=${encodeURIComponent(blob)}&fps=30&aspect=${encodeURIComponent(aspect)}`;

    el.onload = () => {
      if (dead) return;
      // boot() is async (fonts, theme, schema) — __engine appears only once it resolves.
      const t0 = performance.now();
      const wait = () => {
        if (dead) return;
        // boot() signals with __engineReady / __engineError (core/boot.js) — the same handshake
        // the Go renderer waits on, so a scene that fails here fails identically in `make video`.
        const w = el.contentWindow as unknown as { __engine?: Engine; __engineReady?: boolean; __engineError?: string } | null;
        if (w?.__engineError) { onError(String(w.__engineError)); setBooting(false); return; }
        if (w?.__engineReady && w.__engine) {
          engineRef.current = w.__engine;
          setMeta(w.__engine.meta);
          setBooting(false);
          onError(null);
          return;
        }
        if (performance.now() - t0 > 20000) { onError("scene did not boot within 20s"); setBooting(false); return; }
        requestAnimationFrame(wait);
      };
      wait();
    };

    const h = host.current;
    if (h) { h.innerHTML = ""; h.appendChild(el); }
    frameRef.current = el;

    return () => { dead = true; stop(); };
  }, [json, onError]);

  // wall-clock playback — renderFrame is pure in n, so looping is just arithmetic
  useEffect(() => {
    if (!meta || booting) return;
    if (!playing) return;
    let start = performance.now() - (frame / meta.fps) * 1000;
    const tick = () => {
      const eng = engineRef.current;
      if (!eng) return;
      const t = (performance.now() - start) / 1000;
      let n = Math.floor(t * meta.fps);
      if (n >= meta.totalFrames) { start = performance.now(); n = 0; }
      eng.renderFrame(n);
      setFrame(n);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return stop;
    // frame is intentionally NOT a dep: it changes every tick and would restart the loop
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meta, playing, booting]);

  const scrub = useCallback((n: number) => {
    setPlaying(false); stop();
    engineRef.current?.renderFrame(n);
    setFrame(n);
  }, []);

  const secs = meta ? (frame / meta.fps).toFixed(2) : "0.00";
  return (
    <div className="sp">
      <div className="sp-stage" ref={host} />
      <div className="sp-bar">
        <button className="sp-play" onClick={() => setPlaying((p) => !p)} disabled={!meta} aria-label={playing ? "Pause" : "Play"}>
          {playing ? "❚❚" : "▶"}
        </button>
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
