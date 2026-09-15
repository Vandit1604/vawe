"use client";
import { useEffect, useState } from "react";

// The only override this site persists. No precedent for storage elsewhere on the site, so this is
// guarded try/catch rather than assumed available (a private window or blocked site data throws).
const KEY = "vawe-theme";

function apply(theme: "light" | "dark" | null) {
  const root = document.documentElement;
  if (theme) root.setAttribute("data-theme", theme);
  else root.removeAttribute("data-theme");
}

// Two states, not three: system default, or an explicit override. The override cycles light -> dark
// -> system, so a visitor never gets stuck once they have opted out of their OS setting.
export function ThemeToggle() {
  const [theme, setTheme] = useState<"light" | "dark" | null>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(KEY);
      setTheme(stored === "light" || stored === "dark" ? stored : null);
    } catch {
      /* no-op: falls back to system default */
    }
  }, []);

  const cycle = () => {
    const next = theme === null ? "dark" : theme === "dark" ? "light" : null;
    setTheme(next);
    apply(next);
    try {
      if (next) localStorage.setItem(KEY, next);
      else localStorage.removeItem(KEY);
    } catch {
      /* no-op: the toggle still works for this page load */
    }
  };

  const label = theme === "dark" ? "Dark" : theme === "light" ? "Light" : "System";
  return (
    <button type="button" className="themetoggle" onClick={cycle} aria-label={`Theme: ${label}. Click to change.`}>
      {label}
    </button>
  );
}
