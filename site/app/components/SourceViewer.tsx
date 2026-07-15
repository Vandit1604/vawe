"use client";

import { useState } from "react";

// lightweight JSON syntax highlighter — escapes HTML, then wraps tokens in spans.
function highlight(json: string): string {
  const esc = json.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return esc.replace(
    /("(?:\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(?:\s*:)?)|(\b(?:true|false)\b)|(\bnull\b)|(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)/g,
    (m, str, bool, nul, num) => {
      if (str) return `<span class="j-${/:\s*$/.test(str) ? "key" : "str"}">${str}</span>`;
      if (bool) return `<span class="j-bool">${m}</span>`;
      if (nul) return `<span class="j-null">${m}</span>`;
      if (num) return `<span class="j-num">${m}</span>`;
      return m;
    }
  );
}

export function SourceViewer({ name, lines }: { name: string; lines: number }) {
  const [open, setOpen] = useState(false);
  const [html, setHtml] = useState<string | null>(null);
  const [raw, setRaw] = useState("");
  const [copied, setCopied] = useState(false);

  async function toggle() {
    if (!open && html === null) {
      try {
        const text = await (await fetch(`/scenes/${name}.json`)).text();
        setRaw(text);
        setHtml(highlight(text));
      } catch {
        setHtml("// could not load source");
      }
    }
    setOpen((v) => !v);
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(raw);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard unavailable */
    }
  }

  return (
    <div className="srcview">
      <button className={open ? "srctoggle on" : "srctoggle"} onClick={toggle} aria-expanded={open}>
        <span className="mono">{"{ }"}</span>
        {open ? "Hide source" : "View source JSON"}
        <span className="srcmeta">{lines} lines</span>
      </button>
      {open && (
        <div className="srcpanel">
          <div className="srcbar">
            <span className="mono">formats/scene/{name}.json</span>
            <button className="srccopy" onClick={copy}>
              {copied ? "Copied ✓" : "Copy"}
            </button>
          </div>
          <pre className="srccode">
            <code dangerouslySetInnerHTML={{ __html: html ?? "" }} />
          </pre>
        </div>
      )}
    </div>
  );
}
