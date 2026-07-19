"use client";
import { useEffect, useRef } from "react";
import { useSceneEngine } from "../components/useSceneEngine";

export type Frame = { x: number; y: number; w: number; h: number };

/* The block, rendered LIVE by the real engine, framed identically to its poster.
 *
 * Every block's scene is a 1920x1080 canvas with the block alone on it, and `frame` is the rect that
 * was measured around the block when its poster was screenshot (scripts/site/blocks-scenes.mjs).
 * So showing the same region here is not a re-derivation, it is the same numbers applied the other
 * way round: the iframe stays 1920x1080 (a narrow iframe would crop to its top-left, not fit), and a
 * window of frame.w x frame.h scales it and slides it so the rect fills the window.
 *
 * That is what makes press-play not jump. The poster is frame.w x frame.h of pixels; this box has
 * the same intrinsic size and the same cap-don't-stretch rules, so it lands in exactly the same
 * layout box, showing exactly the same region.
 */
export function BlockLive({ name, src, frame }: { name: string; src: string; frame: Frame }) {
  const box = useRef<HTMLDivElement>(null);
  const { hostRef, meta } = useSceneEngine({
    dataUrl: src,
    aspect: "16:9",
    title: `Live render of the ${name} block`,
    playing: true,
  });

  // The window is capped by the card, so its used width is not frame.w — measure it and scale.
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const fit = () => el.style.setProperty("--sp-scale", String(el.clientWidth / frame.w));
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, [frame.w]);

  return (
    <div
      className="blive"
      ref={box}
      // Hidden until the engine reports ready, so the card shows its poster rather than a black
      // stage for the second the scene spends fetching fonts, theme and schema.
      data-ready={meta ? "" : undefined}
      style={{
        width: frame.w,
        aspectRatio: `${frame.w} / ${frame.h}`,
        "--bl-x": `${-frame.x}px`,
        "--bl-y": `${-frame.y}px`,
      } as React.CSSProperties}
    >
      <div className="blive-stage" ref={hostRef} />
    </div>
  );
}
