"use client";
import { useEffect, useRef, useState } from "react";

// THE HERO EDITOR — the browser window in the homepage hero. A real, EDITABLE editor running the
// REAL engine: the same scene.html + renderFrame(n) the renderer screenshots to make an mp4.
// Type in the left pane and the video re-renders. Nothing is uploaded; the engine runs client-side.
//
// The chrome reads `vawe.dev/editor` and that is now TRUE — /editor exists. It used to be a URL for
// a product that did not, wrapping a pre-rendered mp4 next to a hand-typed <pre> of code that was
// not the scene playing.
//
// Cost: the engine (~1.3MB) mounts on intersection and the poster carries first paint, so it stays
// off the critical path and the hero is never blank if it fails.

const POSTER = "/assets/hero.jpg";

// A small, complete, editable scene — short enough to read at a glance and to type into. This IS
// the scene the hero plays, so there is no separate "real" file it can drift from.
const START = `{
  "module": "scene",
  "aspect": "16:9",
  "theme": "vawe",
  "duration": 6,
  "audio": { "silent": true },
  "layers": [
    {
      "type": "text",
      "text": "Motion graphics",
      "x": 210, "y": 380, "w": 1500,
      "align": "center",
      "size": 112, "weight": 700,
      "split": "word", "preset": "up",
      "stagger": 0.08, "each": 0.5,
      "start": 0.3, "duration": 5.5
    },
    {
      "type": "text",
      "text": "from pure <b>data</b>.",
      "x": 210, "y": 500, "w": 1500,
      "align": "center",
      "size": 112, "weight": 700,
      "split": "word", "preset": "up",
      "stagger": 0.08, "each": 0.5,
      "start": 0.7, "duration": 5.1
    }
  ]
}`;

type Engine = { meta: { fps: number; totalFrames: number; width: number; height: number }; renderFrame: (n: number) => void };

export function HeroEditor() {
  const screen = useRef<HTMLDivElement>(null);
  const [code, setCode] = useState(START);
  const [live, setLive] = useState(START); // only pushed to the engine when it parses
  const [mount, setMount] = useState(false);
  const [ready, setReady] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [edited, setEdited] = useState(false);
  const t = useRef<ReturnType<typeof setTimeout> | null>(null);

  // keep the engine off the critical path until the hero is actually on screen
  useEffect(() => {
    const el = screen.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setMount(true); io.disconnect(); } }, { rootMargin: "250px" });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // debounce: rebooting the scene on every keystroke would thrash fonts + theme fetches
  useEffect(() => {
    if (t.current) clearTimeout(t.current);
    t.current = setTimeout(() => {
      try { JSON.parse(code); setLive(code); setErr(null); }
      catch (e) { setErr(String((e as Error).message)); } // the last good scene keeps playing
    }, 600);
    return () => { if (t.current) clearTimeout(t.current); };
  }, [code]);

  useEffect(() => {
    if (!mount) return;
    const host = screen.current;
    if (!host) return;
    let raf = 0, dead = false;
    setReady(false);

    const blob = URL.createObjectURL(new Blob([live], { type: "application/json" }));
    const el = document.createElement("iframe");
    el.className = "hb-frame";
    el.setAttribute("aria-hidden", "true");
    el.setAttribute("tabindex", "-1");
    let aspect = "16:9";
    try { aspect = (JSON.parse(live).aspect as string) || "16:9"; } catch { /* keep default */ }
    el.src = `/formats/scene/scene.html?data=${encodeURIComponent(blob)}&fps=30&aspect=${encodeURIComponent(aspect)}`;

    el.onload = () => {
      const t0 = performance.now();
      const wait = () => {
        if (dead) return;
        const w = el.contentWindow as unknown as { __engine?: Engine; __engineReady?: boolean; __engineError?: string } | null;
        if (w?.__engineError) { setErr(String(w.__engineError).split("\n")[0]); return; }
        if (w?.__engineReady && w.__engine) {
          const eng = w.__engine;
          const { fps, totalFrames, width, height } = eng.meta;
          const fit = () => host.style.setProperty("--hb-scale", String(host.clientWidth / width));
          host.style.setProperty("--hb-w", `${width}px`);
          host.style.setProperty("--hb-h", `${height}px`);
          host.style.aspectRatio = `${width} / ${height}`;
          fit();
          const ro = new ResizeObserver(fit);
          ro.observe(host);
          setReady(true);
          const start = performance.now();
          const tick = () => {
            if (dead) return;
            eng.renderFrame(Math.floor(((performance.now() - start) / 1000) * fps) % totalFrames);
            raf = requestAnimationFrame(tick);
          };
          raf = requestAnimationFrame(tick);
          return;
        }
        if (performance.now() - t0 > 15000) return; // give up quietly; the poster stays
        requestAnimationFrame(wait);
      };
      wait();
    };
    host.appendChild(el);
    return () => { dead = true; if (raf) cancelAnimationFrame(raf); el.remove(); URL.revokeObjectURL(blob); };
  }, [mount, live]);

  return (
    <div className="hero-browser">
      <div className="hb-chrome">
        <span className="hb-dots"><i /><i /><i /></span>
        <a className="hb-url" href="/editor">vawe.dev / editor</a>
        <a className="hb-open" href="/editor">open ↗</a>
      </div>
      <div className="hb-body">
        <div className="hb-pane">
          <textarea
            className="hb-code" value={code} spellCheck={false} aria-label="Scene JSON — editable"
            onChange={(e) => { setCode(e.target.value); setEdited(true); }}
          />
          <div className={`hb-status ${err ? "bad" : ""}`}>
            {err ? `invalid JSON · ${err.slice(0, 44)}` : edited ? "valid · rendering live" : "editable — change anything"}
          </div>
        </div>
        <div className="hb-right">
          <div className={`hb-out ${ready ? "is-live" : ""}`} ref={screen}>
            <img className="hb-poster" src={POSTER} alt="" aria-hidden="true" />
            <span className="hb-badge">{ready ? "live · renderFrame(n)" : "starting engine…"}</span>
          </div>
          {/* a 16:9 screen cannot fill a browser-tall window, and cropping a composed frame is never
              an option — so the leftover space carries real output facts instead of dead pixels */}
          <dl className="hb-meta">
            <div><dt>engine</dt><dd>in your browser</dd></div>
            <div><dt>output</dt><dd>1920 × 1080 · 30fps</dd></div>
            <div><dt>uploads</dt><dd>none</dd></div>
          </dl>
        </div>
      </div>
    </div>
  );
}
