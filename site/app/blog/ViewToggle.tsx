"use client";

import { useEffect, useRef, useState } from "react";

type View = "grid" | "list";

const KEY = "vawe-blog-view";
const OPTIONS: { id: View; label: string }[] = [
  { id: "grid", label: "Grid" },
  { id: "list", label: "List" },
];

// The pre-paint script in page.tsx has already set data-view on .bl from ?view= or storage; the
// buttons only change it. Their pressed look comes from that attribute in blog.css, so it never lags.
export function ViewToggle() {
  const group = useRef<HTMLDivElement>(null);
  const [view, setView] = useState<View>("grid");
  const root = () => group.current?.closest<HTMLElement>(".bl");

  useEffect(() => {
    setView(root()?.dataset.view === "list" ? "list" : "grid");
  }, []);

  function choose(next: View) {
    setView(next);
    const el = root();
    if (el) el.dataset.view = next;
    try {
      localStorage.setItem(KEY, next);
    } catch {}
    const url = new URL(location.href);
    url.searchParams.set("view", next);
    history.replaceState(history.state, "", url);
  }

  return (
    <div className="bl-view" role="group" aria-label="View" ref={group}>
      {OPTIONS.map((o) => (
        <button key={o.id} type="button" data-v={o.id} aria-pressed={view === o.id} onClick={() => choose(o.id)}>
          <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" focusable="false">
            {o.id === "grid" ? (
              <path d="M2 2h5v5H2zM9 2h5v5H9zM2 9h5v5H2zM9 9h5v5H9z" />
            ) : (
              <path d="M2 3h12v2H2zM2 7h12v2H2zM2 11h12v2H2z" />
            )}
          </svg>
          {o.label}
        </button>
      ))}
    </div>
  );
}
