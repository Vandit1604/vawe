"use client";

import { useEffect } from "react";

// The copy buttons arrive in the generated markdown HTML (scripts/site/moves.mjs), so one delegated
// listener serves every code block instead of the page shipping the markdown twice.
export function CopyCode({ rootId }: { rootId: string }) {
  useEffect(() => {
    const root = document.getElementById(rootId);
    if (!root) return;
    const onClick = (e: MouseEvent) => {
      const button = (e.target as Element).closest<HTMLButtonElement>("[data-copy]");
      const code = button?.closest(".mv-code")?.querySelector("pre");
      if (!button || !code) return;
      void navigator.clipboard.writeText(code.textContent ?? "").then(
        () => flash(button, "Copied"),
        () => flash(button, "Select and copy"),
      );
    };
    root.addEventListener("click", onClick);
    return () => root.removeEventListener("click", onClick);
  }, [rootId]);
  return null;
}

function flash(button: HTMLButtonElement, label: string) {
  button.textContent = label;
  button.dataset.done = "";
  window.setTimeout(() => {
    button.textContent = "Copy";
    delete button.dataset.done;
  }, 1600);
}
