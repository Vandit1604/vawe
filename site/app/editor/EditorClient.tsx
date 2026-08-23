"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { foldable, foldEffect, unfoldAll } from "@codemirror/language";
import type { EditorView } from "@codemirror/view";
import { ScenePlayer } from "./ScenePlayer";
import { CodeEditor } from "./CodeEditor";

/* Every scene in site/public/scenes, not a hand-picked six. The showcase links here with
 * ?scene=<id> from each clip, so anything it can link to must be loadable and must be able to name
 * itself in the picker. Grouped, because a flat list of eleven where four are 20-40KB films reads
 * as one undifferentiated pile. */
const GROUPS: { group: string; items: { id: string; label: string }[] }[] = [
  {
    group: "capabilities",
    items: [
      { id: "showcase-type", label: "kinetic type" },
      { id: "showcase-cuts", label: "cuts" },
      { id: "showcase-stings", label: "shader stings" },
      { id: "showcase-data", label: "data story" },
      { id: "showcase-ui", label: "product UI" },
      { id: "showcase-aspect", label: "any aspect" },
      { id: "hero-site", label: "the hero scene" },
    ],
  },
  {
    group: "films",
    items: [
      { id: "argus-launch", label: "argus · launch film" },
      { id: "linear-launch", label: "linear · launch film" },
      { id: "stripe", label: "stripe · launch film" },
      { id: "creed-launch", label: "creed · launch film" },
    ],
  },
];
const PRESETS = GROUPS.flatMap((g) => g.items);

// THE STARTER MUST BOOT, and for some time it did not. `bg` became a required field (the backdrop is
// the largest area of the frame, so the engine refuses to choose it for you) and this scene predates
// that, so /editor loaded, showed its JSON, showed its scrubber, and rendered a blank stage forever.
// The engine said exactly why in `window.__engineError` inside the iframe, where nothing was reading
// it: the only outward sign was ten 404s in the console and an empty box.
// A default that does not render is worse than no default: it is the first thing anyone sees.
const STARTER = `{
 "module": "scene",
 "aspect": "16:9",
 "theme": "vawe-site",
 "duration": 4,
 "audio": { "silent": true },
 "bg": [{ "preset": "plain" }],
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
  // the select's bound value: what is actually on screen. "" = the starter scene, which is not in
  // the list, so the placeholder shows until a real pick is made.
  const [picked, setPicked] = useState("");
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const view = useRef<EditorView | null>(null);

  /* NOT CodeMirror's foldAll. That walks from line 1, and line 1 of a scene is the root `{`, so the
     first thing it folds is the whole document: 900 lines collapse to `{…}`, which hides everything
     and tells you nothing. Starting the walk on line 2 folds each TOP-LEVEL value instead, leaving
     module/aspect/theme/duration readable with `"layers": […]` beside them — the scene as a table
     of contents, which is the thing worth having on a 900-line film. The gutter chevrons still fold
     any single layer from there. */
  const fold = () => {
    const v = view.current;
    if (!v) return;
    const { state } = v;
    if (state.doc.lines < 2) return;
    const effects = [];
    let pos = state.doc.line(2).from;
    while (pos < state.doc.length) {
      const line = v.lineBlockAt(pos);
      const range = foldable(state, line.from, line.to);
      if (range) {
        effects.push(foldEffect.of(range));
        pos = v.lineBlockAt(range.to).to + 1;
      } else {
        pos = line.to + 1;
      }
    }
    if (effects.length) v.dispatch({ effects });
    v.focus();
  };

  const unfold = () => {
    const v = view.current;
    if (!v) return;
    unfoldAll(v);
    v.focus();
  };

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
      setPicked(id);                       // only on success: a failed load must not claim to be loaded
    } catch (e) { setErr(String(e)); }
    setLoading(null);
  };

  /* Deep link from the showcase: /editor?scene=<id>.
   * The id is matched against PRESETS rather than handed to fetch, because it is a URL parameter
   * anyone can write and it would otherwise be interpolated straight into a request path, where
   * ?scene=../../something would go and fetch exactly that. Matching a known list means the only
   * reachable scenes are the ones we ship.
   * Read once on mount from location, not useSearchParams: this is an entry point rather than
   * reactive state, and useSearchParams would opt this static page out of prerendering. */
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("scene");
    if (id && PRESETS.some((p) => p.id === id)) void load(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
        {/* A native <select>, not a pill row. Pills read as tags — inert labels describing the
            thing — so nobody clicks them, and these are the fastest way into the editor. A select
            announces itself as a control, and brings keyboard, mobile and screen readers for free. */}
        {/* value is bound to `picked`, not "": a select that resets itself forgets what you chose,
            so the control never reflected the scene on screen. Fetching a scene is a real wait, so
            it says so — an editor that goes quiet while loading reads as broken. */}
        <div className="ed-presets">
          <label className="ed-preslab" htmlFor="ed-scene">
            Load a scene
          </label>
          <div className={`ed-presel${loading ? " is-loading" : ""}`}>
            <select
              id="ed-scene"
              value={picked}
              disabled={!!loading}
              onChange={(e) => {
                if (e.target.value) load(e.target.value);
              }}
            >
              <option value="" disabled>
                Pick an example scene…
              </option>
              {GROUPS.map((g) => (
                <optgroup key={g.group} label={g.group}>
                  {g.items.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.label}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
            <span className="ed-caret" aria-hidden="true">
              {loading ? <span className="ed-spin" /> : "▾"}
            </span>
          </div>
          <span className="ed-preshint" aria-live="polite">
            {loading
              ? `loading ${PRESETS.find((p) => p.id === loading)?.label ?? "scene"}…`
              : "or edit the JSON below, it renders as you type"}
          </span>
        </div>
        {/* The third way in, so it sits with the other two. This lived in the page header, where
            it was preamble to read before reaching the tool, and it stretched one sentence across
            the full measure. Someone asking "how do I get a scene in here?" is looking exactly
            here. */}
        <p className="ed-claude">
          Or have Claude write one. Give it{" "}
          <a href="/vawe-rules.md" target="_blank" rel="noreferrer">
            <code>vawe-rules.md</code>
          </a>
          , every layer type, preset, easing, cut and taste rule, generated from the engine so it
          cannot drift, then paste what comes back.
        </p>
        <div className="ed-panehead">
          <span className="ed-file">scene.json</span>
          <span className="ed-lines">
            {json.split("\n").length} {json.split("\n").length === 1 ? "line" : "lines"}
          </span>
          <button className="ed-fold" onClick={fold} title="Collapse top-level values">
            fold
          </button>
          <button className="ed-fold" onClick={unfold} title="Expand everything">
            unfold
          </button>
          <button className="ed-copy" onClick={copy}>{copied ? "copied ✓" : "copy"}</button>
        </div>
        <CodeEditor value={json} onChange={setJson} viewRef={view} />
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
