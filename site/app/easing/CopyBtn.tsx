"use client";

import { useState } from "react";

export function CopyBtn({ value, label }: { value: string; label: string }) {
  const [text, setText] = useState(label);
  const flash = (t: string) => {
    setText(t);
    window.setTimeout(() => setText(label), 1400);
  };
  return (
    <button type="button" className="ez-chip" onClick={() => void navigator.clipboard.writeText(value).then(() => flash("Copied"), () => flash("Select and copy"))}>
      {text}
    </button>
  );
}
