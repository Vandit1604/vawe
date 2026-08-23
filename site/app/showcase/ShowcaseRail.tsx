"use client";
import { useEffect, useState } from "react";

/* The component-library rail: categories, each with the entries inside it, same idea as a docs
 * sidebar (or another engine' own catalog page) rather than the flat 35-link family rail on
 * /showcase/effects. That page's rail names sections; this one names sections AND the things in
 * them, because the ask was to browse a library by name, not just jump between headings.
 *
 * The observed elements are the real section ids already on the page (film-<slug>, cap-<src>,
 * ratio-<n>) rather than a second parallel DOM the rail owns, so a page edit can't drift the two
 * out of sync the way a hand-kept list could.
 */

export type Entry = { id: string; label: string };
export type Category = { id: string; title: string; entries: Entry[] };

export function ShowcaseRail({ categories }: { categories: Category[] }) {
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    const ids = categories.flatMap((c) => c.entries.map((e) => e.id));
    const targets = ids.map((id) => document.getElementById(id)).filter(Boolean) as HTMLElement[];
    if (!targets.length) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const en of entries) if (en.isIntersecting) setActiveId(en.target.id);
      },
      { rootMargin: "-96px 0px -70% 0px", threshold: 0 },
    );
    targets.forEach((t) => io.observe(t));
    setActiveId(targets[0].id);
    return () => io.disconnect();
  }, [categories]);

  return (
    <nav className="scrail" aria-label="Showcase contents">
      {categories.map((cat) => (
        <div className="scrail-cat" key={cat.id}>
          <span className="scrail-catlabel">{cat.title}</span>
          <ul>
            {cat.entries.map((e) => (
              <li key={e.id}>
                <a href={`#${e.id}`} aria-current={activeId === e.id ? "location" : undefined}>
                  {e.label}
                </a>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </nav>
  );
}
