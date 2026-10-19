"use client";

import { useEffect, useRef, useState } from "react";
import { MiscSvg } from "../icons";

const clock = (t: number) => `00:${t.toFixed(2).padStart(5, "0")}`;

// The player chrome under the clip: play and pause, a timecode and a scrubber for the video beside it.
export function StageBar({ duration }: { duration: number | null }) {
  const bar = useRef<HTMLDivElement>(null);
  const code = useRef<HTMLSpanElement>(null);
  const scrub = useRef<HTMLInputElement>(null);
  const video = useRef<HTMLVideoElement | null>(null);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    const el = bar.current;
    const v = el?.parentElement?.querySelector("video");
    if (!el || !v) return;
    video.current = v;
    let raf = 0;
    const draw = () => {
      const p = Math.min(v.currentTime / (v.duration || duration || 1), 1);
      el.style.setProperty("--p", String(p));
      if (scrub.current) scrub.current.value = String(p);
      if (code.current) code.current.textContent = clock(v.currentTime);
    };
    const tick = () => {
      draw();
      raf = requestAnimationFrame(tick);
    };
    const onPlaying = () => {
      setPlaying(true);
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(tick);
    };
    const onPause = () => {
      setPlaying(false);
      cancelAnimationFrame(raf);
    };
    setPlaying(!v.paused);
    v.addEventListener("playing", onPlaying);
    v.addEventListener("pause", onPause);
    v.addEventListener("seeked", draw);
    return () => {
      v.removeEventListener("playing", onPlaying);
      v.removeEventListener("pause", onPause);
      v.removeEventListener("seeked", draw);
      cancelAnimationFrame(raf);
    };
  }, [duration]);

  const toggle = () => {
    const v = video.current;
    if (!v) return;
    if (v.paused) void v.play().catch(() => {});
    else v.pause();
  };
  const seek = (p: number) => {
    const v = video.current;
    if (v) v.currentTime = p * (v.duration || duration || 0);
  };

  return (
    <div className="mvd-bar" ref={bar}>
      <button type="button" className="mvd-play" onClick={toggle} aria-label={playing ? "Pause clip" : "Play clip"}>
        <MiscSvg name={playing ? "pause" : "play"} size={12} />
      </button>
      <span className="mvd-code" ref={code}>{clock(0)}</span>
      <span className="mvd-scrub">
        <i />
        <input ref={scrub} type="range" min={0} max={1} step="any" defaultValue={0} aria-label="Seek" onChange={(e) => seek(Number(e.target.value))} />
      </span>
      <span className="mvd-code mvd-total">{clock(duration ?? 0)}</span>
    </div>
  );
}
