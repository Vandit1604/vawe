"use client";
import { useEffect, useRef, useState } from "react";

// The page's sections as clips on a timeline strip, with a playhead that follows the scroll: the
// studio's own vocabulary used as page navigation. Each clip is a real link, so it works with no JS.
export function SectionStrip({ sections }: { sections: { id: string; label: string }[] }) {
  const [current, setCurrent] = useState(0);
  const clips = useRef<HTMLDivElement>(null);
  const head = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const onScroll = () => {
      const max = document.documentElement.scrollHeight - innerHeight;
      const p = max > 0 ? scrollY / max : 0;
      if (head.current && clips.current) head.current.style.transform = `translateX(${p * (clips.current.clientWidth - 8)}px)`;
      let cur = 0;
      sections.forEach((s, i) => {
        const el = document.getElementById(s.id);
        if (el && el.getBoundingClientRect().top < innerHeight * 0.5) cur = i;
      });
      setCurrent(p > 0.99 ? sections.length - 1 : cur);
    };
    onScroll();
    addEventListener("scroll", onScroll, { passive: true });
    addEventListener("resize", onScroll);
    return () => { removeEventListener("scroll", onScroll); removeEventListener("resize", onScroll); };
  }, [sections]);

  return (
    <nav className="panel strip" aria-label="Sections">
      <div className="strip-clips" ref={clips} style={{ gridTemplateColumns: `repeat(${sections.length}, minmax(0, 1fr))` }}>
        <span className="strip-head" ref={head} aria-hidden="true" />
        {sections.map((s, i) => (
          <a key={s.id} href={`#${s.id}`} className="strip-clip" aria-current={i === current ? "true" : undefined}>{s.label}</a>
        ))}
      </div>
    </nav>
  );
}
