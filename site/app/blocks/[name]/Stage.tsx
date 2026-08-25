"use client";

// The stage. The block MOVING is the subject of this page, so the live engine mounts on load and the
// poster sits underneath only until it reports ready — never a black rectangle, never a hover-to-play.
//
// Framing is the caller's job (see useSceneEngine's banner): `frame` is the rect measured around this
// block on its 1920x1080 canvas, and BlockLive turns that into a window. Here the window is capped by
// width AND height and never cropped, because the 176 blocks run from 2.7:1 (codeTyping) to 1.4:1
// (usMapHex) and a fixed box with `cover` would cut half of them.
import { useCallback, useEffect, useRef, useState } from "react";
import { BlockLive, type Frame } from "../BlockLive";

export function Stage({ name, poster, src, frame }: { name: string; poster: string; src: string; frame?: Frame }) {
  const [playing, setPlaying] = useState(true);
  const [ready, setReady] = useState(false);
  const seek = useRef<((n: number) => void) | null>(null);

  // A looping render is motion the visitor did not ask for, so reduced-motion starts it paused on
  // frame 0 rather than refusing to render it. The transport is the same either way.
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) setPlaying(false);
  }, []);

  const onReady = useCallback(() => setReady(true), []);
  const onEngine = useCallback((fn: (n: number) => void) => { seek.current = fn; }, []);

  // Two commits, not one: the playback loop reads its start frame when it (re)starts, so pausing and
  // resuming in the same tick would collapse to no change and the loop would keep its old clock.
  const replay = () => {
    setPlaying(false);
    seek.current?.(0);
    requestAnimationFrame(() => setPlaying(true));
  };

  return (
    <div className="bx-stagewrap">
      {/* The block's own aspect, handed to CSS: it is what lets the poster and the live window be
          sized by the same one-line rule and therefore land in exactly the same box. */}
      <div className="bx-stage" style={{ "--bx-ar": frame ? frame.w / frame.h : 16 / 9 } as React.CSSProperties}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {/* Once the live render is up it describes the same thing the poster does, and the iframe
            carries its own title — so the poster stops announcing itself and becomes decoration. */}
        <img src={poster} alt={ready ? "" : `The ${name} block, rendered still`} />
        {frame && (
          <BlockLive name={name} src={src} frame={frame} playing={playing} onReady={onReady} onEngine={onEngine} />
        )}
      </div>

      <div className="bx-transport">
        <button type="button" onClick={() => setPlaying((p) => !p)} disabled={!ready}>
          {playing ? "Pause" : "Play"}
        </button>
        <button type="button" onClick={replay} disabled={!ready}>Replay</button>
        <span className="bx-state mono" role="status">
          {!frame ? "no live scene" : ready ? (playing ? "live · looping" : "paused") : "booting engine"}
        </span>
      </div>
    </div>
  );
}

export function Copy({ text }: { text: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      className="bx-copy"
      // The label is fixed for assistive tech and the confirmation goes to the live region below:
      // a button whose accessible NAME changes is announced only if it happens to hold focus.
      aria-label="Copy the block JSON"
      onClick={() => {
        navigator.clipboard.writeText(text).then(() => {
          setDone(true);
          setTimeout(() => setDone(false), 1600);
        });
      }}
    >
      <span>{done ? "Copied" : "Copy"}</span>
      <span className="bx-sr" role="status">{done ? "Copied to clipboard" : ""}</span>
    </button>
  );
}
