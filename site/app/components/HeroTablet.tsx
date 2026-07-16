"use client";
import { useEffect, useRef, useState } from "react";

// THE HERO TABLET — the device frame in the homepage hero. It runs the REAL engine (the same
// scene.html + renderFrame(n) the renderer screenshots to make an mp4), not a video of it.
//
// It used to be a browser chrome (traffic lights + a `vawe.dev/editor` URL that did not exist)
// wrapping a pre-rendered mp4 next to a hand-typed <pre> of code that was not the scene playing.
// Now the code IS the scene and the scene IS live.
//
// Cost control: the engine is ~1.3MB (core + fonts) and this sits above the fold, so the poster
// carries first paint and the iframe only mounts once the hero is actually on screen. If the engine
// never boots, the poster simply stays — the hero is never blank.

const SCENE = "/scenes/hero-site.json";
const POSTER = "/assets/hero.jpg";

// the real first lines of formats/scene/hero-site.json — shown, not paraphrased
const CODE = `{
  "module": "scene",
  "aspect": "16:9",
  "theme": "vawe",
  "duration": 7.6,
  "audio": {
    "silent": true
  },
  "cuts": [
    {
      "t": 3.9,
      "style": "riseBlur"
    }
  ],
  "layers": [
    {
      "type": "text",
      "text": "Motion graphics",
      "x": 210,
      "y": 380,
      "w": 1500,
      "align": "center",
    ...
  ]
}`;

type Engine = { meta: { fps: number; totalFrames: number; width: number; height: number }; renderFrame: (n: number) => void };

export function HeroTablet() {
  const screen = useRef<HTMLDivElement>(null);
  const [live, setLive] = useState(false);
  const [mount, setMount] = useState(false);

  // only boot the engine once the hero is on screen (it is above the fold, so this is usually
  // immediate — but it keeps the cost off the critical path and off a prerender)
  useEffect(() => {
    const el = screen.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setMount(true); io.disconnect(); } }, { rootMargin: "200px" });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!mount) return;
    const host = screen.current;
    if (!host) return;
    let raf = 0, dead = false;

    const el = document.createElement("iframe");
    el.className = "ht-frame";
    el.setAttribute("aria-hidden", "true");
    el.setAttribute("tabindex", "-1");
    el.src = `/formats/scene/scene.html?data=${encodeURIComponent(SCENE)}&fps=30&aspect=16:9`;

    el.onload = () => {
      const t0 = performance.now();
      const wait = () => {
        if (dead) return;
        const w = el.contentWindow as unknown as { __engine?: Engine; __engineReady?: boolean } | null;
        if (w?.__engineReady && w.__engine) {
          const eng = w.__engine;
          const { fps, totalFrames, width, height } = eng.meta;
          const fit = () => host.style.setProperty("--ht-scale", String(host.clientWidth / width));
          host.style.setProperty("--ht-w", `${width}px`);
          host.style.setProperty("--ht-h", `${height}px`);
          fit();
          const ro = new ResizeObserver(fit);
          ro.observe(host);
          setLive(true);
          const start = performance.now();
          const tick = () => {
            if (dead) return;
            const n = Math.floor(((performance.now() - start) / 1000) * fps) % totalFrames;
            eng.renderFrame(n);
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
    return () => { dead = true; if (raf) cancelAnimationFrame(raf); el.remove(); };
  }, [mount]);

  return (
    <div className="hero-tablet">
      <div className="ht-bezel">
        <div className="ht-screen">
          <div className="ht-code">
            <pre>{CODE}</pre>
          </div>
          <div className="ht-right">
            <div className={`ht-out ${live ? "is-live" : ""}`} ref={screen}>
              {/* poster holds the frame until the engine is up, so the hero is never blank */}
              <img className="ht-poster" src={POSTER} alt="" aria-hidden="true" />
              <span className="ht-badge">{live ? "live · renderFrame(n)" : "loading engine…"}</span>
            </div>
            {/* a 16:9 screen cannot fill a tablet-tall frame, and cropping a composed frame is never
                an option — so the leftover space carries the real output facts instead of dead pixels */}
            <dl className="ht-meta">
              <div><dt>out</dt><dd>hero-site.mp4</dd></div>
              <div><dt>frames</dt><dd>228 · 30fps</dd></div>
              <div><dt>size</dt><dd>1920 × 1080</dd></div>
            </dl>
          </div>
        </div>
      </div>
    </div>
  );
}
