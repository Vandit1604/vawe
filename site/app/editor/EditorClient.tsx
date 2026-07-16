"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { ScenePlayer } from "./ScenePlayer";

const PRESETS = [
  { id: "showcase-type", label: "kinetic type" },
  { id: "showcase-cuts", label: "cuts" },
  { id: "showcase-stings", label: "shader stings" },
  { id: "showcase-data", label: "data story" },
  { id: "showcase-ui", label: "product UI" },
  { id: "argus-launch", label: "argus · film" },
];

const STARTER = `{
 "module": "scene",
 "aspect": "16:9",
 "theme": "vawe-site",
 "duration": 4,
 "audio": { "silent": true },
 "layers": [
  {
   "type": "text",
   "text": "Motion graphics",
   "x": 140, "y": 380, "size": 96, "weight": 700,
   "split": "word", "preset": "up", "stagger": 0.08,
   "start": 0.2, "duration": 3.6
  },
  {
   "type": "text",
   "text": "from pure <b>data.</b>",
   "x": 140, "y": 500, "size": 96, "weight": 700,
   "split": "word", "preset": "up", "stagger": 0.08,
   "start": 0.5, "duration": 3.3
  }
 ]
}`;

export function EditorClient() {
  const [json, setJson] = useState(STARTER);
  const [live, setLive] = useState(STARTER);   // only pushed to the player when it parses
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // debounce: rebooting the scene on every keystroke would thrash fonts + theme fetches
  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      try { JSON.parse(json); setLive(json); } catch { /* leave the last good scene playing */ }
    }, 500);
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, [json]);

  const load = async (id: string) => {
    setLoading(id);
    try {
      const r = await fetch(`/scenes/${id}.json`);
      if (!r.ok) throw new Error(`${id}.json not found`);
      const text = await r.text();
      setJson(text);
      setLive(text);
    } catch (e) { setErr(String(e)); }
    setLoading(null);
  };

  const copy = async () => {
    await navigator.clipboard.writeText(json);
    setCopied(true); setTimeout(() => setCopied(false), 1400);
  };

  const onErr = useCallback((e: string | null) => setErr(e), []);

  let parseErr: string | null = null;
  try { JSON.parse(json); } catch (e) { parseErr = (e as Error).message; }

  return (
    <div className="ed">
      <div className="ed-side">
        <div className="ed-presets">
          {PRESETS.map((p) => (
            <button key={p.id} onClick={() => load(p.id)} disabled={loading === p.id}>
              {loading === p.id ? "…" : p.label}
            </button>
          ))}
        </div>
        <div className="ed-panehead">
          <span className="ed-file">scene.json</span>
          <span className="ed-lines">{json.split("\n").length} lines</span>
          <button className="ed-copy" onClick={copy}>{copied ? "copied ✓" : "copy"}</button>
        </div>
        <textarea
          className="ed-code" value={json} spellCheck={false}
          onChange={(e) => setJson(e.target.value)}
          aria-label="Scene JSON"
        />
        <div className={`ed-status ${parseErr || err ? "bad" : "ok"}`}>
          {parseErr ? `invalid JSON · ${parseErr}` : err ? err : "valid · rendering live"}
        </div>
      </div>

      <div className="ed-main">
        <ScenePlayer json={live} onError={onErr} />
        <p className="ed-note">
          This is the real engine, running in your browser. The same <code>renderFrame(n)</code> the
          renderer screenshots to make an mp4. Edit the JSON and it re-renders.
          <br />
          For a frame-perfect file with sound and grain:{" "}
          <code>make video D=scene.json</code>
        </p>
      </div>
    </div>
  );
}
