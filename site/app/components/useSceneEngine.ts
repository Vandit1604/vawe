"use client";
import { useCallback, useEffect, useRef, useState, type RefObject } from "react";

// The engine is a web page: films/scene/scene.html?data=<url> boots the scene and exposes
// window.__engine = { meta, renderFrame(n) }, pure in n. So playback is just a wall-clock loop
// calling renderFrame from OUT HERE. boot() virtualises rAF/Date INSIDE the frame, which is
// exactly why driving it from the parent stays deterministic — our loop is never captured.
//
// This hook owns boot + playback and nothing else. FRAMING is deliberately left to the caller,
// because the two callers frame differently and both are right: the editor fits a whole 1920x1080
// scene into a panel, while a block thumbnail shows one measured rect out of that same canvas. What
// they share is the handshake and the loop, so that is what lives here.

export type SceneMeta = { fps: number; duration: number; totalFrames: number; width: number; height: number };
type Engine = { meta: SceneMeta; renderFrame: (n: number) => void };

export type SceneEngine = {
  /** Attach to the element the iframe should be mounted into. */
  hostRef: RefObject<HTMLDivElement | null>;
  meta: SceneMeta | null;
  frame: number;
  booting: boolean;
  /** Render one frame. Playback keeps running unless the caller also sets `playing` false. */
  renderFrame: (n: number) => void;
};

export function useSceneEngine({
  dataUrl,
  aspect = "16:9",
  title,
  playing,
  onError,
}: {
  /** URL scene.html should fetch the scene JSON from. A same-origin blob URL works; so does a path. */
  dataUrl: string | null;
  aspect?: string;
  title: string;
  playing: boolean;
  onError?: (e: string | null) => void;
}): SceneEngine {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const engineRef = useRef<Engine | null>(null);
  const rafRef = useRef(0);
  // Kept in a ref so an inline callback from the caller cannot re-boot the scene on every render.
  const errRef = useRef(onError);
  errRef.current = onError;

  const [meta, setMeta] = useState<SceneMeta | null>(null);
  const [frame, setFrame] = useState(0);
  const [booting, setBooting] = useState(true);
  // Mirrors `frame` for the playback effect, which must not list it as a dependency (it changes
  // every tick and would restart the loop) yet needs it to resume from wherever a scrub left off.
  const frameRef = useRef(0);
  frameRef.current = frame;

  const stop = () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = 0;
  };

  // (re)boot whenever the scene source changes
  useEffect(() => {
    let dead = false;
    stop();
    engineRef.current = null;
    setMeta(null);
    setFrame(0);

    const host = hostRef.current;
    if (!dataUrl || !host) return;
    setBooting(true);

    const el = document.createElement("iframe");
    el.className = "sp-frame";
    // WCAG 4.1.2 — the most important element on the page was announcing as an unnamed frame.
    el.title = title;
    // A rendered frame holds nothing focusable, so a Tab into it put the focus ring somewhere the
    // keyboard user could not see and could not act on. Every consumer of this hook (editor stage,
    // block thumbnail, playground) had the same hole, so it is closed here rather than per caller.
    el.tabIndex = -1;
    el.src = `/films/scene/scene.html?data=${encodeURIComponent(dataUrl)}&fps=30&aspect=${encodeURIComponent(aspect)}`;

    el.onload = () => {
      if (dead) return;
      // boot() is async (fonts, theme, schema) — __engine appears only once it resolves. It signals
      // with __engineReady / __engineError (core/boot.js), the same handshake the Go renderer waits
      // on, so a scene that fails here fails identically in `make video`.
      const t0 = performance.now();
      const wait = () => {
        if (dead) return;
        const w = el.contentWindow as unknown as
          | { __engine?: Engine; __engineReady?: boolean; __engineError?: string }
          | null;
        if (w?.__engineError) {
          errRef.current?.(String(w.__engineError));
          setBooting(false);
          return;
        }
        if (w?.__engineReady && w.__engine) {
          engineRef.current = w.__engine;
          setMeta(w.__engine.meta);
          setBooting(false);
          errRef.current?.(null);
          return;
        }
        if (performance.now() - t0 > 20000) {
          errRef.current?.("scene did not boot within 20s");
          setBooting(false);
          return;
        }
        requestAnimationFrame(wait);
      };
      wait();
    };

    host.innerHTML = "";
    host.appendChild(el);

    return () => {
      dead = true;
      stop();
      engineRef.current = null;
      // The iframe is a whole engine: fonts, a schema fetch, a rAF-driven document. Removing it from
      // the DOM destroys its browsing context and everything in it, which is what makes 148 cards
      // affordable — one at a time, and the previous one really is gone. (Pointing it at about:blank
      // first also works, but it cancels the in-flight document and logs a failed request.)
      el.remove();
    };
  }, [dataUrl, aspect, title]);

  // wall-clock playback — renderFrame is pure in n, so looping is just arithmetic
  useEffect(() => {
    if (!meta || booting || !playing) return;
    let start = performance.now() - (frameRef.current / meta.fps) * 1000;
    const tick = () => {
      const eng = engineRef.current;
      if (!eng) return;
      const t = (performance.now() - start) / 1000;
      let n = Math.floor(t * meta.fps);
      if (n >= meta.totalFrames) {
        start = performance.now();
        n = 0;
      }
      eng.renderFrame(n);
      setFrame(n);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return stop;
  }, [meta, playing, booting]);

  const renderFrame = useCallback((n: number) => {
    engineRef.current?.renderFrame(n);
    setFrame(n);
  }, []);

  return { hostRef, meta, frame, booting, renderFrame };
}
