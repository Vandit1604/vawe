"use client";

import { useEffect, useRef } from "react";

/* One rendered clip. Solves two things that were the same bug wearing different hats:
 *
 *   1. Reduced motion. The old CSS did `video{display:none}` — but `poster` is an attribute OF
 *      the video, so hiding it took the poster too and left a flat gray box where the product
 *      should be. A <video> that never plays already shows its poster: that IS the static-frame
 *      alternative, and it costs nothing because the posters are generated.
 *   2. Cost. `preload="none"` plus an IntersectionObserver means a clip fetches and decodes only
 *      while it is actually on screen. /showcase was holding 12 decode pipelines open at once.
 *
 * The two collapse into one rule: play only when motion is welcome AND the clip is visible.
 */
export function Clip({
  src,
  poster,
  className,
}: {
  src: string;
  poster?: string;
  className?: string;
}) {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const v = ref.current;
    if (!v) return;

    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    let io: IntersectionObserver | null = null;

    const stop = () => {
      io?.disconnect();
      io = null;
      v.pause();
      // Drop the buffer and return to the poster frame.
      v.removeAttribute("preload");
      v.currentTime = 0;
    };

    const start = () => {
      if (io) return;
      io = new IntersectionObserver(
        (entries) => {
          for (const e of entries) {
            if (e.isIntersecting) void v.play().catch(() => {});
            else v.pause();
          }
        },
        // Start a little before it scrolls in, so it is running by the time it is looked at.
        { rootMargin: "200px 0px", threshold: 0.01 },
      );
      io.observe(v);
    };

    // Honour the preference live: toggling it in the OS shouldn't need a reload.
    const sync = () => (mq.matches ? stop() : start());
    sync();
    mq.addEventListener("change", sync);

    return () => {
      mq.removeEventListener("change", sync);
      io?.disconnect();
    };
  }, []);

  return (
    <video
      ref={ref}
      src={src}
      poster={poster}
      className={className}
      loop
      muted
      playsInline
      preload="none"
    />
  );
}
