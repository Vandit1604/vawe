"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { EffectPreview } from "../EffectPreview";
import type { Knob } from "./knobs";

/* The live player, its knob panel, and the three tabs (Preview / JSON / Scene) that hold them, one
 * effect at a time. "ONE ENGINE ON THE PAGE, EVER" (EffectPreview's own constraint) is satisfied
 * for free: this component mounts exactly one EffectPreview because the PAGE is exactly one effect.
 */

type Layer = Record<string, unknown>;
type Scene = { layers?: Layer[]; [k: string]: unknown };

// /editor's own debounce for the identical problem (EditorClient.tsx: "rebooting the scene on every
// keystroke would thrash fonts + theme fetches"). Reused rather than picked fresh.
const DEBOUNCE_MS = 500;

function setDeep(obj: unknown, path: (string | number)[], value: unknown): unknown {
  if (path.length === 0) return value;
  const [head, ...rest] = path;
  if (typeof head === "number") {
    const arr = Array.isArray(obj) ? obj.slice() : [];
    arr[head] = setDeep(arr[head], rest, value);
    return arr;
  }
  const o: Record<string, unknown> = obj && typeof obj === "object" && !Array.isArray(obj) ? { ...(obj as Record<string, unknown>) } : {};
  o[head] = setDeep(o[head], rest, value);
  return o;
}

const pathKey = (path: (string | number)[]) => path.join(".");

// Where a knob's edit lands in the FULL booted scene. A body that carries its own `type` describes
// ONE LAYER (kinetic presets, idles, paint fields, a beam): find that layer in the fetched demo and
// patch it. Every other family's body already has the shape of the SCENE ROOT (cuts/stings/seams/bg
// /captionStyle/captions all live at scene level in both the authoring snippet and the booted
// scene, because effects-json.mjs's USAGE writes them there directly) — so its own path applies to
// the scene unchanged.
type Target = { get: () => unknown; set: (v: unknown) => Scene };
function resolveTarget(demo: Scene, bodyType: string | null): Target | null {
  if (bodyType) {
    const idx = (demo.layers ?? []).findIndex((l) => l.type === bodyType);
    if (idx === -1) return null;
    return {
      get: () => demo.layers![idx],
      set: (v) => {
        const layers = demo.layers!.slice();
        layers[idx] = v as Layer;
        return { ...demo, layers };
      },
    };
  }
  return { get: () => demo, set: (v) => v as Scene };
}

function applyKnobs(node: unknown, editable: Knob[], values: Record<string, string | number | boolean>): unknown {
  let next = node;
  for (const k of editable) next = setDeep(next, k.path, values[pathKey(k.path)]);
  return next;
}

const TABS = ["preview", "json", "scene"] as const;
type Tab = (typeof TABS)[number];
const TAB_LABEL: Record<Tab, string> = { preview: "Preview", json: "JSON", scene: "Scene" };

export function EffectStage({
  name, scene, json, noPreview, knobs, bodyType,
}: { name: string; scene: string | null; json: string; noPreview: string | null; knobs: Knob[]; bodyType: string | null }) {
  const editable = useMemo(() => knobs.filter((k) => !k.locked), [knobs]);

  const [values, setValues] = useState<Record<string, string | number | boolean>>(
    () => Object.fromEntries(editable.map((k) => [pathKey(k.path), k.value])),
  );
  const dirty = editable.some((k) => values[pathKey(k.path)] !== k.value);

  const [demo, setDemo] = useState<Scene | null>(null);
  const [dataUrl, setDataUrl] = useState<string | null>(scene);
  const blobUrl = useRef<string | null>(null);
  const [tab, setTab] = useState<Tab>("preview");

  useEffect(() => {
    if (!scene) return;
    let cancelled = false;
    fetch(scene).then((r) => r.json()).then((s: Scene) => { if (!cancelled) setDemo(s); });
    return () => { cancelled = true; };
  }, [scene]);

  const target = useMemo(() => (demo ? resolveTarget(demo, bodyType) : null), [demo, bodyType]);
  const canEdit = !!target;

  // Unedited: play the plain file. Building an identical blob on first load would reboot the
  // engine once for nothing.
  useEffect(() => {
    if (!demo || !target) return;
    if (!dirty) { setDataUrl(scene); return; }
    const t = setTimeout(() => {
      const patched = target.set(applyKnobs(target.get(), editable, values));
      const url = URL.createObjectURL(new Blob([JSON.stringify(patched)], { type: "application/json" }));
      if (blobUrl.current) URL.revokeObjectURL(blobUrl.current);
      blobUrl.current = url;
      setDataUrl(url);
    }, DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [values, demo, target, dirty, editable, scene]);

  useEffect(() => () => { if (blobUrl.current) URL.revokeObjectURL(blobUrl.current); }, []);

  const [copiedJson, setCopiedJson] = useState(false);
  const [copiedScene, setCopiedScene] = useState(false);
  useEffect(() => { if (!copiedJson) return; const t = setTimeout(() => setCopiedJson(false), 1400); return () => clearTimeout(t); }, [copiedJson]);
  useEffect(() => { if (!copiedScene) return; const t = setTimeout(() => setCopiedScene(false), 1400); return () => clearTimeout(t); }, [copiedScene]);

  const parsedBody = useMemo<unknown>(() => {
    try { return JSON.parse(json); } catch { return null; }
  }, [json]);

  // The copy button hands over what is actually on screen: an edited knob echoes into the snippet
  // the same way it echoes into the live preview.
  const shownJson = useMemo(() => {
    if (!parsedBody) return json;
    return JSON.stringify(applyKnobs(parsedBody, editable, values), null, 2);
  }, [parsedBody, json, editable, values]);

  const patchedDemo = useMemo(() => {
    if (!demo || !target || !dirty) return demo;
    return target.set(applyKnobs(target.get(), editable, values));
  }, [demo, target, dirty, editable, values]);

  const cyclePanel = (dir: 1 | -1) => {
    const i = TABS.indexOf(tab);
    const next = TABS[(i + dir + TABS.length) % TABS.length];
    setTab(next);
    document.getElementById(`fxtab-${next}`)?.focus();
  };

  return (
    <div className="fxstage">
      <div className="fxtabs" role="tablist" aria-label="Effect views">
        {TABS.map((id) => (
          <button
            key={id}
            role="tab"
            id={`fxtab-${id}`}
            aria-selected={tab === id}
            aria-controls={`fxpanel-${id}`}
            tabIndex={tab === id ? 0 : -1}
            className="fxtab"
            onClick={() => setTab(id)}
            onKeyDown={(e) => {
              if (e.key === "ArrowRight") cyclePanel(1);
              else if (e.key === "ArrowLeft") cyclePanel(-1);
            }}
          >
            {TAB_LABEL[id]}
          </button>
        ))}
      </div>

      <div id="fxpanel-preview" role="tabpanel" aria-labelledby="fxtab-preview" hidden={tab !== "preview"}>
        {scene ? (
          <EffectPreview key={dataUrl ?? scene} name={name} src={dataUrl ?? scene} />
        ) : (
          <p className="fxd-nope"><b>No preview here.</b> {noPreview}</p>
        )}

        {knobs.length > 0 && (
          <div className="fxknobs">
            <div className="fxknobs-h">
              <span>Knobs</span>
              {!canEdit && editable.length > 0 && <span className="fxknobs-note">no live scene to reboot &middot; still updates the JSON tab</span>}
            </div>
            <div className="fxknobs-grid">
              {knobs.map((k) => {
                const pk = pathKey(k.path);
                return (
                  <label className="fxknob" key={pk}>
                    <span className="fxknob-top">
                      <span className="fxknob-key mono">{k.key}</span>
                      {k.locked && <span className="fxknob-lock" title="This value names the effect on this page. Editing it would make the page show a different effect than its title.">locked</span>}
                    </span>
                    {k.locked ? (
                      <span className="fxknob-fixed mono">{String(k.value)}</span>
                    ) : k.control === "select" ? (
                      <select value={String(values[pk])} onChange={(e) => setValues((v) => ({ ...v, [pk]: e.target.value }))}>
                        {k.options!.map((o) => <option key={o} value={o}>{o}</option>)}
                      </select>
                    ) : k.control === "boolean" ? (
                      <input type="checkbox" checked={!!values[pk]} onChange={(e) => setValues((v) => ({ ...v, [pk]: e.target.checked }))} />
                    ) : k.control === "number" ? (
                      <input
                        type="number"
                        step="any"
                        value={String(values[pk])}
                        onChange={(e) => setValues((v) => ({ ...v, [pk]: e.target.value === "" ? 0 : Number(e.target.value) }))}
                      />
                    ) : (
                      <input type="text" value={String(values[pk])} maxLength={200} onChange={(e) => setValues((v) => ({ ...v, [pk]: e.target.value }))} />
                    )}
                    {k.label && <span className="fxknob-desc">{k.label}</span>}
                  </label>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <div id="fxpanel-json" role="tabpanel" aria-labelledby="fxtab-json" hidden={tab !== "json"}>
        <div className="fxd-code">
          <div className="fxd-code-h">
            <span>The JSON that uses it</span>
            <button className="fxcopy" onClick={() => navigator.clipboard.writeText(shownJson).then(() => setCopiedJson(true), () => setCopiedJson(false))}>
              {copiedJson ? "Copied" : "Copy JSON"}
            </button>
          </div>
          <pre><code>{shownJson}</code></pre>
        </div>
        <p className="fxd-hint">Paste it into your composition.</p>
      </div>

      <div id="fxpanel-scene" role="tabpanel" aria-labelledby="fxtab-scene" hidden={tab !== "scene"}>
        {scene ? (
          <div className="fxd-code">
            <div className="fxd-code-h">
              <span>The full demo scene this preview boots</span>
              <button
                className="fxcopy"
                disabled={!demo}
                onClick={() => navigator.clipboard.writeText(JSON.stringify(patchedDemo ?? demo, null, 2)).then(() => setCopiedScene(true), () => setCopiedScene(false))}
              >
                {copiedScene ? "Copied" : "Copy scene"}
              </button>
            </div>
            <pre><code>{demo ? JSON.stringify(patchedDemo ?? demo, null, 2) : "Loading…"}</code></pre>
          </div>
        ) : (
          <p className="fxd-nope">No live scene renders this effect. {noPreview}</p>
        )}
      </div>
    </div>
  );
}
