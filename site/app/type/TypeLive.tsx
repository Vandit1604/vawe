"use client";
import { useEffect, useRef } from "react";
import { useSceneEngine } from "../components/useSceneEngine";

/* One specimen, rendered LIVE by the real engine.
 *
 * Not a CSS reproduction of the preset. The site already ships core/ and formats/scene/scene.html
 * (scripts/site/site-engine.mjs copies them into public/), so this boots the same renderFrame(n) the
 * Go renderer drives and plays the same scene JSON the poster was shot from. A hand-copied CSS
 * version of `decode` or `riseClip` would look right until the day the preset changed, and nothing
 * would say so. A showcase that lies about the engine is worse than no showcase.
 *
 * Every type specimen is a full 1920x1080 stage, so unlike a block thumbnail there is no measured
 * crop rect: the whole frame is the subject. Scale the iframe to whatever width the card has.
 */
export function TypeLive({ id, label, onReady }: { id: string; label: string; onReady?: () => void }) {
  const box = useRef<HTMLDivElement>(null);
  const { hostRef, meta } = useSceneEngine({
    dataUrl: `/assets/type/${id}.json`,
    aspect: "16:9",
    title: `Live render of the ${label} specimen`,
    playing: true,
  });

  const ready = !!meta;
  useEffect(() => { if (ready) onReady?.(); }, [ready, onReady]);

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const fit = () => el.style.setProperty("--sp-scale", String(el.clientWidth / 1920));
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div className="tylive sp-stage" ref={box} data-ready={meta ? "" : undefined}>
      <div className="tylive-stage" ref={hostRef} />
    </div>
  );
}
