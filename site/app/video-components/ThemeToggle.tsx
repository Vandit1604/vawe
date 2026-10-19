"use client";

import { useEffect, useState } from "react";
import type { Theme } from "../../lib/clip";
import { MiscSvg } from "./icons";

const KEY = "vawe-clip-theme";
const isTheme = (t: string | null): t is Theme => t === "light" || t === "dark";

export function writeTheme(theme: Theme | null) {
  const p = new URLSearchParams(window.location.search);
  if (theme) p.set("theme", theme);
  else p.delete("theme");
  const qs = p.toString().replace(/%2C/g, ",");
  window.history.replaceState(null, "", qs ? `?${qs}` : window.location.pathname);
}

// The URL wins over the saved choice, so a shared link shows what its sender saw.
function readTheme(): Theme | null {
  const t = new URLSearchParams(window.location.search).get("theme");
  if (isTheme(t)) return t;
  try {
    const saved = localStorage.getItem(KEY);
    return isTheme(saved) ? saved : null;
  } catch {
    return null;
  }
}

// null means each clip in its own default theme.
export function useClipTheme() {
  const [theme, setTheme] = useState<Theme | null>(null);
  useEffect(() => setTheme(readTheme()), []);
  const set = (next: Theme) => {
    setTheme(next);
    writeTheme(next);
    try {
      localStorage.setItem(KEY, next);
    } catch {}
  };
  return [theme, set] as const;
}

// `shown` is the theme the page shows now; the pressed option marks it.
export function ThemeToggle({ shown, onChange, className }: { shown: Theme; onChange: (next: Theme) => void; className?: string }) {
  return (
    <div className={`mv-theme ${className ?? ""}`} role="group" aria-label="Clip theme">
      {(["light", "dark"] as const).map((t) => (
        <button key={t} type="button" className="mv-theme-b" aria-pressed={shown === t} title={`Show clips in the ${t} theme where available`} onClick={() => onChange(t)}>
          <MiscSvg name={t === "light" ? "sun" : "moon"} size={14} />
          <span className="mv-theme-t">{t === "light" ? "Light" : "Dark"}</span>
        </button>
      ))}
    </div>
  );
}
