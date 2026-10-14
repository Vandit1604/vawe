"use client";

import { useEffect } from "react";

const clamp = (x: number) => Math.min(1, Math.max(0, x));

/* The scroll behaviour of the landing page, with no markup of its own. It writes --in and --out on each
 * pinned chapter (.ch), marks .rv blocks as .in once they enter the screen, and lights the chapter rail.
 * Without script, or with reduced motion, the CSS defaults hold: chapters sit at full size and blocks show. */
export function LandingMotion() {
  useEffect(() => {
    const root = document.querySelector<HTMLElement>(".lp");
    if (!root) return;
    const calm = matchMedia("(prefers-reduced-motion: reduce)");
    const chapters = [...root.querySelectorAll<HTMLElement>(".lp-ch")];
    const dots = [...root.querySelectorAll<HTMLAnchorElement>(".lp-rail a")];
    let queued = false;

    const update = () => {
      queued = false;
      let inChapter = false;
      for (const c of chapters) {
        const r = c.getBoundingClientRect();
        if (r.top < innerHeight * 0.5 && r.bottom > innerHeight * 0.5) inChapter = true;
        if (calm.matches) continue;
        const progress = clamp(-r.top / (r.height - innerHeight));
        const entered = 1 - Math.pow(1 - clamp((innerHeight - r.top) / (innerHeight * 0.9)), 3);
        c.style.setProperty("--in", entered.toFixed(3));
        c.style.setProperty("--out", clamp((progress - 0.85) / 0.15).toFixed(3));
      }
      root.toggleAttribute("data-inch", inChapter);
    };
    const onScroll = () => {
      if (queued) return;
      queued = true;
      requestAnimationFrame(update);
    };

    const reveal = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          e.target.classList.add("in");
          reveal.unobserve(e.target);
        }
      },
      { threshold: 0.15 },
    );
    const blocks = [...root.querySelectorAll(".lp-rv")];
    blocks.forEach((b) => reveal.observe(b));

    const current = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          dots.forEach((d) => d.toggleAttribute("aria-current", d.getAttribute("href") === `#${e.target.id}`));
        }
      },
      { threshold: 0.5 },
    );
    chapters.forEach((c) => current.observe(c));

    root.setAttribute("data-motion", "");
    addEventListener("scroll", onScroll, { passive: true });
    addEventListener("resize", onScroll);
    update();
    return () => {
      removeEventListener("scroll", onScroll);
      removeEventListener("resize", onScroll);
      reveal.disconnect();
      current.disconnect();
      root.removeAttribute("data-motion");
    };
  }, []);

  return null;
}
