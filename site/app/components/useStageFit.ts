"use client";
import { useEffect, type RefObject } from "react";
import type { SceneMeta } from "./useSceneEngine";

// A scene lays out at its TRUE pixel size (1920x1080 and friends): every x/y in the JSON is a real
// frame coordinate. So the iframe must be that size and get SCALED to fit, never resized: a narrow
// iframe would just crop to the top-left corner and show a black stage.
//
// CONTAIN, not fit-to-width. Fitting on width alone is correct only while the stage can grow to any
// height, and neither stage can: /editor's is a fixed region of an application frame, and
// /playground's carries `max-height`, which clamps its box shorter than the ratio it declares. Both
// then spilled off the bottom, losing 37% of the picture at 1440x700 on /playground, and
// `overflow: hidden` hid the loss.
// Two consumers, so the arithmetic lives here rather than in each of them.
export function useStageFit(hostRef: RefObject<HTMLDivElement | null>, meta: SceneMeta | null) {
  useEffect(() => {
    const h = hostRef.current;
    if (!h || !meta) return;
    const fit = () => {
      const s = Math.min(h.clientWidth / meta.width, h.clientHeight / meta.height);
      h.style.setProperty("--sp-scale", String(s));
      h.style.setProperty("--sp-w", `${meta.width}px`);
      h.style.setProperty("--sp-h", `${meta.height}px`);
      // Divided by s because the translate is applied after scale(), in the frame's own coordinates.
      h.style.setProperty("--sp-x", `${(h.clientWidth - meta.width * s) / 2 / s}px`);
      h.style.setProperty("--sp-y", `${(h.clientHeight - meta.height * s) / 2 / s}px`);
      // Below 900px /editor's frame has no fixed height, so its stage has nothing to fill and would
      // collapse to nothing. There it takes the scene's own ratio instead, which only the scene
      // knows, so the scene publishes it and the stylesheet reads it.
      h.style.setProperty("--sp-ar", `${meta.width} / ${meta.height}`);
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(h);
    return () => ro.disconnect();
  }, [hostRef, meta]);
}
