"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { foldable, foldEffect, unfoldAll } from "@codemirror/language";
import { EditorView } from "@codemirror/view";
import { ScenePlayer } from "./ScenePlayer";
import { CodeEditor } from "./CodeEditor";
import { findSugar, sugarMessage, errorLine } from "./sugar";

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
      { id: "preface-launch", label: "template · preface launch" },
      { id: "saas-hero-launch", label: "template · saas hero launch" },
      { id: "product-feature-tour", label: "template · product feature tour" },
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

/* A fault is anything that stops the source on screen from becoming the picture on screen. There are
 * four and they used to be reported in two different places with two different lifetimes, which is
 * how a dead fetch message sat on the pane through every later edit. One shape, one owner, one line:
 * `where` decides who clears it, `line` is what makes the problem panel able to jump. */
type Fault = { kind: "parse" | "sugar" | "load" | "boot"; title: string; detail: string; line: number };

/** Everything the editor itself can rule out before the engine is asked. Pure in the document. */
function faultOf(doc: string): Fault | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(doc);
  } catch (e) {
    const m = (e as Error).message;
    return { kind: "parse", title: "invalid JSON", detail: m, line: errorLine(m, doc) };
  }
  const sugar = findSugar(parsed, doc);
  if (!sugar.length) return null;
  return { kind: "sugar", title: "needs `make expand`", detail: sugarMessage(sugar), line: sugar[0].line };
}

export function EditorClient() {
  const [json, setJson] = useState(STARTER);
  const [live, setLive] = useState(STARTER);   // only pushed to the player when it is renderable
  const [bootErr, setBootErr] = useState<string | null>(null);
  const [loadErr, setLoadErr] = useState<string | null>(null);
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

  /* The whole point of a problem panel: an error is only useful if it takes you to the cause. Unfolds
     first, because a folded scene swallows the selection and the jump lands nowhere visible. */
  const goto = (line: number) => {
    const v = view.current;
    if (!v || !line || line > v.state.doc.lines) return;
    unfoldAll(v);
    const l = v.state.doc.line(line);
    v.dispatch({ selection: { anchor: l.from }, effects: EditorView.scrollIntoView(l.from, { y: "center" }) });
    v.focus();
  };

  // Reading the document is cheap and has to be exact, so it happens on every render rather than on
  // a timer: the panel must never describe a document that is no longer on screen.
  const fault = useMemo(() => faultOf(json), [json]);

  // debounce: rebooting the scene on every keystroke would thrash fonts + theme fetches.
  // A faulted document is never pushed, so the stage holds the last scene that rendered rather than
  // going black — the same rule invalid JSON has always had, extended to the sugar the engine
  // refuses. Booting into a refusal would replace a picture with a stack trace.
  useEffect(() => {
    if (fault) return;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setLive(json), 500);
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, [json, fault]);

  const edit = useCallback((v: string) => {
    setJson(v);
    setLoadErr(null);   // a fetch failure is about the picker; the moment you type, it is history
  }, []);

  const load = async (id: string) => {
    setLoading(id);
    setLoadErr(null);
    try {
      const r = await fetch(`/scenes/${id}.json`);
      if (!r.ok) throw new Error(`/scenes/${id}.json not found (${r.status})`);
      const text = await r.text();
      setJson(text);
      // Push the scene STRAIGHT to the player rather than letting the 500ms debounce do it. The
      // debounce exists to stop a keystroke rebooting the engine; a scene you just chose is not a
      // keystroke, and waiting for it booted the film twice — once now and once when the timer
      // fired. Faulted scenes are still withheld, which is the whole reason this is not
      // unconditional (saas-hero-launch would boot into the refusal the panel already explains).
      if (!faultOf(text)) setLive(text);
      setPicked(id);                       // only on success: a failed load must not claim to be loaded
    } catch (e) { setLoadErr((e as Error).message); }
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

  const onErr = useCallback((e: string | null) => setBootErr(e), []);

  // One precedence, stated once. The document outranks the engine: a scene that will not parse makes
  // whatever the engine last said about a different scene irrelevant.
  const shown: Fault | null = fault
    ?? (loadErr ? { kind: "load", title: "load failed", detail: loadErr, line: 0 } : null)
    ?? (bootErr ? { kind: "boot", title: "the engine refused this scene", detail: bootErr, line: 0 } : null);

  const lines = json.split("\n").length;

  return (
    <>
      <div className="ed">
        {/* One toolbar across the whole app, not a control column beside a picture. Everything that
            acts on the SCENE is here; everything that acts on the PICTURE is on the transport. */}
        <div className="ed-bar">
          <label className="ed-barlab" htmlFor="ed-scene">Scene</label>
          <div className={`ed-presel${loading ? " is-loading" : ""}`}>
            <select
              id="ed-scene"
              value={picked}
              disabled={!!loading}
              onChange={(e) => { if (e.target.value) load(e.target.value); }}
            >
              <option value="" disabled>Pick an example…</option>
              {GROUPS.map((g) => (
                <optgroup key={g.group} label={g.group}>
                  {g.items.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
                </optgroup>
              ))}
            </select>
            <span className="ed-caret" aria-hidden="true">{loading ? <span className="ed-spin" /> : "▾"}</span>
          </div>
          <div className="ed-baracts">
            <button className="ed-fold" onClick={fold} title="Collapse top-level values">fold</button>
            <button className="ed-fold" onClick={unfold} title="Expand everything">unfold</button>
            <button className="ed-copy" onClick={copy}>{copied ? "copied ✓" : "copy"}</button>
          </div>
        </div>

        <div className="ed-panes">
          <section className="ed-source" aria-label="Scene source">
            <div className="ed-panehead">
              <span className="ed-file">scene.json</span>
              <span className="ed-lines">{lines} {lines === 1 ? "line" : "lines"}</span>
              {/* Tab indents inside CodeMirror, so plain Tab does not leave the editor. That is a
                  keyboard trap unless the way out is stated, and it is also read to a screen reader
                  through aria-describedby (see CodeEditor.tsx). */}
              <span className="ed-kbd" id="ed-cm-help">Tab indents · Esc then Tab exits</span>
            </div>
            <CodeEditor value={json} onChange={edit} viewRef={view} describedBy="ed-cm-help" />
          </section>

          <section className="ed-stage" aria-label="Live render">
            <ScenePlayer json={live} onError={onErr} />
          </section>
        </div>

        {/* The engine's refusal is the most useful thing on this page, so it gets a region rather
            than a strip: its own scroll, its own whitespace, and a way back to the line. The status
            line below stays one line whatever happens, so the frame never jumps. */}
        {shown && (
          <div className="ed-problem" role="group" aria-label="Problem">
            <div className="ed-probhead">
              <span className="ed-probtitle">{shown.title}</span>
              {shown.line > 0 && (
                <button className="ed-goto" onClick={() => goto(shown.line)}>go to line {shown.line}</button>
              )}
            </div>
            <pre className="ed-probbody">{shown.detail}</pre>
          </div>
        )}

        {/* role=status, so someone who cannot see the bar is told when the scene stops rendering. */}
        <div className={`ed-status ${shown ? "bad" : "ok"}`} role="status">
          <span className="ed-dot" aria-hidden="true" />
          {loading
            ? `loading ${PRESETS.find((p) => p.id === loading)?.label ?? "scene"}…`
            : shown
              ? `${shown.title} · the stage holds the last scene that rendered`
              : "valid · rendering live"}
        </div>
      </div>

      <p className="ed-legend">
        Every frame comes from the same <code>renderFrame(n)</code> the renderer screenshots to make an
        mp4. For a file with sound and grain: <code>make video D=scene.json</code>. To have Claude write
        a scene, give it <a href="/vawe-rules.md" target="_blank" rel="noreferrer"><code>vawe-rules.md</code></a>,
        generated from the engine so it cannot drift. Any other agent can call the render itself:{" "}
        <a href="/ai-agents">the MCP server, for an agent that renders its own draft →</a>
      </p>
    </>
  );
}
