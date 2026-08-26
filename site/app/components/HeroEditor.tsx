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
//
// It also carries THE REFUSAL, which is the one claim on this page that has to be live rather than
// drawn. Every comparable tool asks its authors, in prose, not to reach for a wall clock. This one
// refuses at boot and names the layer, because a frame is seeked and not played, so anything that
// runs on wall-clock time is dead config. `break it` writes one such property into the scene; the
// status strip below then shows the engine's own words, unedited.

const POSTER = "/assets/hero.jpg";

// A small, complete, editable scene — short enough to read at a glance and to type into. This IS
// the scene the hero plays, so there is no separate "real" file it can drift from.
const START = `{
  "module": "scene",
  "aspect": "16:9",
  "theme": "vawe",
  "duration": 6,
  "audio": { "silent": true },
  "bg": [{ "preset": "dotmatrix" }],
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

// The same scene with ONE banned property added. `css` is the passthrough for CSS the layer
// vocabulary does not name, and core/validate.mjs refuses any property the engine rewrites every
// frame. `transition` is one: it is killed engine-wide because a frame is seeked, not played. The
// message the strip shows below is the engine's, unedited.
const BROKEN = START.replace(
  '"split": "word", "preset": "up",',
  '"split": "word", "preset": "up",\n      "css": { "transition": "opacity .4s ease" },',
);

/** The one line worth showing from an engine refusal: the first bullet, or the first line if the
 *  error carries no list. boot.js reports `Error: invalid data for "scene":\n  - <reason>`, so line
 *  zero is only a heading. */
const reason = (e: string) => {
  const bullet = e.split("\n").find((l) => l.trimStart().startsWith("- "));
  return (bullet ? bullet.trim().slice(2) : e.split("\n")[0].replace(/^Error:\s*/, "")).trim();
};

type Engine = { meta: { fps: number; totalFrames: number; width: number; height: number }; renderFrame: (n: number) => void };

export function HeroEditor() {
  const screen = useRef<HTMLDivElement>(null);
  const [code, setCode] = useState(START);
  const [live, setLive] = useState(START); // only pushed to the engine when it parses
  const [mount, setMount] = useState(false);
  const [ready, setReady] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [edited, setEdited] = useState(false);
  const broken = code === BROKEN;
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
        if (w?.__engineError) { setErr(reason(String(w.__engineError))); return; }
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
            <span className="hb-msg">
              {err ? err : edited ? "valid · rendering live" : "editable · change anything"}
            </span>
            <button className="hb-break" type="button" onClick={() => { setCode(broken ? START : BROKEN); setEdited(true); }}>
              {broken ? "put it back" : "break it"}
            </button>
          </div>
        </div>
        <div className="hb-right">
          <div className={`hb-out ${ready ? "is-live" : ""}`} ref={screen}>
            <img className="hb-poster" src={POSTER} alt="" aria-hidden="true" />
            {/* `err` alone does not mean the render stopped: a JSON typo mid-edit leaves the last
                good scene playing. Only a scene that never booted is a refusal. */}
            <span className={`hb-badge ${!ready && err ? "bad" : ""}`}>{ready ? "live · renderFrame(n)" : err ? "refused at boot" : "starting engine…"}</span>
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
