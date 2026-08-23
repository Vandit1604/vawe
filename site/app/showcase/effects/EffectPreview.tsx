"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useSceneEngine } from "../../components/useSceneEngine";

/* One effect, rendered LIVE by the real engine.
 *
 * Same handshake as /blocks and /editor: scene.html in an iframe at its true 1920x1080 size, scaled
 * to fit, driven by renderFrame(n) from out here. The scene it boots is generated beside the index
 * (scripts/site/effects-json.mjs), so what plays is a real scene file an author could render.
 *
 * ONE ENGINE ON THE PAGE, EVER. 227 previewable effects is 227 iframes if the index mounted them
 * all, so it mounts none: the index is a `<Link>` to `[stem]/page.tsx`, and that page renders
 * exactly one of these. The constraint used to be enforced by an open-drawer state machine in the
 * list; now it is enforced by there being one effect per page.
 *
 * A boot failure is SHOWN. The alternative is a black rectangle that claims to be an effect, and
 * this page's whole promise is that it says what it cannot show.
 */
export function EffectPreview({ name, src }: { name: string; src: string }) {
  const host = useRef<HTMLDivElement | null>(null);
  const [playing, setPlaying] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const onError = useCallback((e: string | null) => setErr(e), []);
  const { hostRef, meta, frame, booting, renderFrame } = useSceneEngine({
    dataUrl: src,
    aspect: "16:9",
    title: `Live render of the ${name} effect`,
    playing,
    onError,
  });

  useEffect(() => {
    const h = host.current;
    if (!h || !meta) return;
    const fit = () => {
      h.style.setProperty("--sp-scale", String(h.clientWidth / meta.width));
      h.style.setProperty("--sp-w", `${meta.width}px`);
      h.style.setProperty("--sp-h", `${meta.height}px`);
      h.style.aspectRatio = `${meta.width} / ${meta.height}`;
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(h);
    return () => ro.disconnect();
  }, [meta]);

  return (
    <div className="sp fxprev">
      <div
        className="sp-stage"
        ref={(el) => {
          host.current = el;
          hostRef.current = el;
        }}
      />
      {err && (
        <p className="fxprev-err" role="status">
          This preview did not boot: <span className="mono">{err}</span>
        </p>
      )}
      <div className="sp-bar">
        <button className="sp-play" onClick={() => setPlaying((p) => !p)} disabled={!meta} aria-label={playing ? "Pause" : "Play"}>
          {playing ? "❚❚" : "▶"}
        </button>
        <input
          className="sp-scrub"
          type="range"
          min={0}
          max={meta ? meta.totalFrames - 1 : 0}
          value={frame}
          onChange={(e) => {
            setPlaying(false);
            renderFrame(+e.target.value);
          }}
          disabled={!meta}
          aria-label="Scrub"
        />
        <span className="sp-time">{booting ? "booting…" : meta ? `${(frame / meta.fps).toFixed(2)}s / ${meta.duration.toFixed(2)}s` : "0.00s"}</span>
      </div>
    </div>
  );
}
