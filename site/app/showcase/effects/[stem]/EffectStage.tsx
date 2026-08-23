"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { EffectPreview } from "../EffectPreview";

/* The video + the JSON that produces it, one effect at a time.
 *
 * "ONE ENGINE ON THE PAGE, EVER" (EffectPreview's own constraint) is now satisfied for free: this
 * component mounts exactly one EffectPreview because the PAGE is exactly one effect. No open-state,
 * no drawer, no unmount-on-switch bookkeeping — that machinery lived in EffectsBrowser only because a
 * flat index had to fake having pages. Now it has real ones.
 */

type Layer = Record<string, unknown>;
type Caption = { text?: string; [k: string]: unknown };
type Scene = { layers?: Layer[]; captions?: Caption[]; [k: string]: unknown };

// Which layer in the fetched demo scene is "the headline": the biggest top-level text layer, ties
// broken by earliest start. Every PREVIEW scene effects-json.mjs writes carries at most one layer
// that reads as the film's line of copy (a hero line, a before/after pair, a caption over a field
// effect), so "biggest text wins" finds it without hand-listing every family's shape here.
function pickHeadline(layers: Layer[]): number | null {
  let best = -1, bestSize = -1, bestStart = Infinity;
  layers.forEach((l, i) => {
    if (l.type !== "text" || typeof l.text !== "string") return;
    const size = typeof l.size === "number" ? (l.size as number) : 0;
    const start = typeof l.start === "number" ? (l.start as number) : 0;
    if (size > bestSize || (size === bestSize && start < bestStart)) { best = i; bestSize = size; bestStart = start; }
  });
  return best === -1 ? null : best;
}

// /editor's own debounce for the identical problem (EditorClient.tsx: "rebooting the scene on every
// keystroke would thrash fonts + theme fetches"). Reused rather than picked fresh, so the two live
// text editors in this app feel the same.
const DEBOUNCE_MS = 500;

export function EffectStage({ name, scene, json, noPreview }: { name: string; scene: string | null; json: string; noPreview: string | null }) {
  // A headline control is offered only when BOTH are true: there is a live scene to patch, and the
  // authoring snippet itself IS a text layer (`{"type":"text","text":"…"}`). That is exactly the
  // families whose JSON is a line of copy: kinetic presets, enter/exit anims, idles, GSAP effects
  // and exits. A cut, a sting, a paint field, a filter and a blend mode carry no such field, so none
  // of them grow an input (CLAUDE.md: "not every scene has text").
  const parsedJson = useMemo<Layer | null>(() => {
    try { const o = JSON.parse(json); return o && typeof o === "object" ? (o as Layer) : null; } catch { return null; }
  }, [json]);
  // TWO PLACES A DEMO KEEPS ITS COPY, and the first version of this only knew one. A text layer
  // (`{"type":"text","text":"…"}`) covers the kinetic presets, the enter/exit anims, the idles and
  // the GSAP families. A CAPTION keeps its words somewhere else entirely, in `captions[0].text`, and
  // a caption style is the family where editing the words matters most: the whole style is a
  // treatment OF those words. Eleven styles shipped with a live player and no way to change what it
  // said. A cut, a sting, a paint field, a filter and a blend mode still carry no copy at all and
  // still grow no input.
  const editKind: "layer" | "caption" | null =
    parsedJson && parsedJson.type === "text" && typeof parsedJson.text === "string" ? "layer"
    : parsedJson && Array.isArray((parsedJson as Record<string, unknown>).captions) ? "caption"
    : null;
  const canEditHeadline = !!scene && editKind !== null;

  const [demo, setDemo] = useState<Scene | null>(null);
  const [layerIdx, setLayerIdx] = useState<number | null>(null);
  const [headline, setHeadline] = useState<string | null>(null); // null until the demo scene tells us what is actually on screen
  const initial = useRef<string | null>(null);
  const [dataUrl, setDataUrl] = useState<string | null>(scene);
  const blobUrl = useRef<string | null>(null);

  useEffect(() => {
    if (!canEditHeadline) return;
    let cancelled = false;
    fetch(scene!).then((r) => r.json()).then((s: Scene) => {
      if (cancelled) return;
      const i = editKind === "caption" ? 0 : pickHeadline(s.layers ?? []);
      const t = editKind === "caption"
        ? (s.captions?.[0]?.text as string | undefined)
        : (i !== null ? ((s.layers![i] as Layer).text as string) : undefined);
      setDemo(s);
      setLayerIdx(t === undefined ? null : i);
      if (t !== undefined) { initial.current = t; setHeadline(t); }
    });
    return () => { cancelled = true; };
    // scene/canEditHeadline only ever change together (both derive from the same effect id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scene]);

  useEffect(() => {
    if (!demo || layerIdx === null || headline === null) return;
    // Unedited: play the plain file. Building an identical blob on first load would reboot the
    // engine once for nothing.
    if (headline === initial.current) { setDataUrl(scene); return; }
    const t = setTimeout(() => {
      const patched = editKind === "caption"
        ? { ...demo, captions: (demo.captions ?? []).map((c, i) => (i === 0 ? { ...c, text: headline } : c)) }
        : { ...demo, layers: (demo.layers ?? []).map((l, i) => (i === layerIdx ? { ...l, text: headline } : l)) };
      const url = URL.createObjectURL(new Blob([JSON.stringify(patched)], { type: "application/json" }));
      if (blobUrl.current) URL.revokeObjectURL(blobUrl.current);
      blobUrl.current = url;
      setDataUrl(url);
    }, DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [headline, demo, layerIdx, scene]);

  useEffect(() => () => { if (blobUrl.current) URL.revokeObjectURL(blobUrl.current); }, []);

  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 1400);
    return () => clearTimeout(t);
  }, [copied]);

  // The copy button hands over what is actually on screen: once the headline diverges from the
  // scene's own default, the JSON echoes that edit too.
  const shownJson = canEditHeadline && parsedJson && headline !== null && headline !== initial.current
    ? JSON.stringify(editKind === "caption"
        ? { ...parsedJson, captions: ((parsedJson as unknown as Scene).captions ?? []).map((c, i) => (i === 0 ? { ...c, text: headline } : c)) }
        : { ...parsedJson, text: headline }, null, 2)
    : json;

  return (
    <div className="fxstage">
      {scene ? (
        <EffectPreview key={dataUrl ?? scene} name={name} src={dataUrl ?? scene} />
      ) : (
        <p className="fxd-nope"><b>No preview here.</b> {noPreview}</p>
      )}

      {canEditHeadline && headline !== null && (
        <label className="fxheadline">
          <span>Headline</span>
          <input
            type="text"
            name="headline"
            value={headline}
            onChange={(e) => setHeadline(e.target.value)}
            maxLength={80}
          />
        </label>
      )}

      <div className="fxd-code">
        <div className="fxd-code-h">
          <span>The JSON that uses it</span>
          <button
            className="fxcopy"
            onClick={() => navigator.clipboard.writeText(shownJson).then(() => setCopied(true), () => setCopied(false))}
          >
            {copied ? "Copied" : "Copy JSON"}
          </button>
        </div>
        <pre><code>{shownJson}</code></pre>
      </div>
    </div>
  );
}
