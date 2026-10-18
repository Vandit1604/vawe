"use client";

import { useEffect } from "react";

// The pre-paint script in page.tsx covers a full load; a client navigation to /blog#<section> runs
// no inline script, so this selects the filter on mount and when the hash changes.
export function HashFilter() {
  useEffect(() => {
    const apply = () => {
      const id = location.hash.slice(1);
      const radio = id ? document.getElementById(`f-${id}`) : null;
      if (radio instanceof HTMLInputElement) radio.checked = true;
    };
    apply();
    addEventListener("hashchange", apply);
    return () => removeEventListener("hashchange", apply);
  }, []);
  return null;
}
