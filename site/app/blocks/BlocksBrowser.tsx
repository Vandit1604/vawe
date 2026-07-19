"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { BlockLive, type Frame } from "./BlockLive";
import frames from "../../lib/block-frames.json";

/* Search + family filter over the registry.
 *
 * 96 blocks in one flat grid meant scrolling and hoping. The families come from the data itself
 * rather than a hand-kept category list, so adding a block cannot leave the filter behind: there
 * are 44 of them, near 1:1 with block names, which is exactly why the dropdown alone would not be
 * enough and search carries the real load.
 *
 * Filtering happens client-side over an array that is already in the page. All 96 cards still
 * server-render, so the grid is in the HTML for anything that does not run JS.
 */

export type Block = { name: string; family: string; blurb: string; props: Record<string, unknown> };

const asset = (name: string, ext: string) => `/assets/blocks/${name.replace(/[^a-z0-9.]/gi, "_")}.${ext}`;
const propKeys = (props: Record<string, unknown>) => Object.keys(props).slice(0, 6).join(" · ") || "—";
const FRAMES = frames as Record<string, Frame>;

/* A block is MOTION, and a still is the one thing it cannot show. So pressing play runs the block in
 * the REAL ENGINE, right here: this page ships core/ and scene.html already (the editor needs them),
 * and every block has a scene JSON, so the card can boot the same renderFrame(n) the mp4 was made
 * from. It used to play a pre-encoded clip, which is a strange thing for the marketing page of a
 * render engine to do, and every one of them 404'd in production. NOT because of .dockerignore: its
 * `*.mp4` never matched these, since Docker's `*` does not cross a `/` (the homepage's own mp4s serve
 * fine). They 404'd because the clips and the play button shipped in the same commit, and the running
 * image predated it. Derived media that must be regenerated whenever its source changes will drift,
 * and `make blocks-json` had been printing "grid changed, re-run blocks-stills" the whole time.
 * Rendering live removes the artifact, so there is nothing left to go stale.
 *
 * The poster is what SHIPS. An engine per card is an iframe, a font load and a rAF loop per card, so
 * the live one exists only while its card is the playing one — `live` is a single name, and starting
 * a second card unmounts the first, which tears its iframe down (useSceneEngine's cleanup).
 *
 * Playing is a state, so the control says so: it toggles back to the still, and aria-pressed tells a
 * screen reader which state it is in rather than leaving "play" to mean both things.
 */
function BlockThumb({ name, playing, onToggle }: { name: string; playing: boolean; onToggle: () => void }) {
  const frame = FRAMES[name];
  return (
    <div className="thumb">
      {/* The poster stays mounted underneath: the live render fades in only once the engine reports
          ready, so the card never flashes an empty stage while the scene boots. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={asset(name, "png")} alt={name} loading="lazy" />
      {playing && frame && <BlockLive name={name} src={asset(name, "json")} frame={frame} />}
      <button
        className="bplay"
        {...(playing ? { "data-on": "" } : {})}
        aria-pressed={playing}
        aria-label={playing ? `Stop ${name}` : `Play ${name}`}
        onClick={(e) => {
          // the whole card is a link to the detail page; play means "show me the move", not "leave"
          e.preventDefault();
          e.stopPropagation();
          onToggle();
        }}
      >
        {playing ? (
          <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="6" y="5" width="4" height="14" rx="1" /><rect x="14" y="5" width="4" height="14" rx="1" /></svg>
        ) : (
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5v13l11-6.5z" /></svg>
        )}
      </button>
    </div>
  );
}

export function BlocksBrowser({ blocks }: { blocks: Block[] }) {
  const [q, setQ] = useState("");
  const [fam, setFam] = useState("");
  // ONE live engine at a time. Each is a full engine boot in an iframe; 148 of them is not viable.
  const [live, setLive] = useState<string | null>(null);

  const families = useMemo(() => {
    const counts = new Map<string, number>();
    for (const b of blocks) counts.set(b.family, (counts.get(b.family) ?? 0) + 1);
    return [...counts.entries()].sort((a, z) => a[0].localeCompare(z[0]));
  }, [blocks]);

  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return blocks.filter((b) => {
      if (fam && b.family !== fam) return false;
      if (!needle) return true;
      // Props are searchable too, and they carry real weight: 23 of the 61 prop names appear in no
      // block name or blurb, so they are the ONLY way to reach those blocks by search. `deltaUp`
      // finds card.stat, `author` finds quote, `initials` finds card.profile. Remembering the knob
      // you need is a normal way to look for a component.
      return (
        b.name.toLowerCase().includes(needle) ||
        b.family.toLowerCase().includes(needle) ||
        (b.blurb ?? "").toLowerCase().includes(needle) ||
        Object.keys(b.props).some((k) => k.toLowerCase().includes(needle))
      );
    });
  }, [blocks, q, fam]);

  return (
    <>
      <div className="bfilter">
        <div className="bsearch">
          <svg className="bsearch-i" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
            <path d="M20 20l-3.5-3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search blocks, families, props…"
            aria-label="Search blocks"
          />
          {q && (
            <button className="bsearch-x" onClick={() => setQ("")} aria-label="Clear search">
              ✕
            </button>
          )}
        </div>

        <div className="bselect">
          <select value={fam} onChange={(e) => setFam(e.target.value)} aria-label="Filter by family">
            <option value="">All families ({blocks.length})</option>
            {families.map(([f, n]) => (
              <option key={f} value={f}>
                {f} ({n})
              </option>
            ))}
          </select>
          <span className="bselect-c" aria-hidden="true">▾</span>
        </div>

        {/* aria-live: the result of typing is a number that changes somewhere else on the page */}
        <span className="bcount" aria-live="polite">
          {shown.length === blocks.length
            ? `${blocks.length} blocks`
            : `${shown.length} of ${blocks.length}`}
        </span>
      </div>

      {shown.length === 0 ? (
        <p className="bempty">
          Nothing matches <b>{q}</b>
          {fam && <> in <b>{fam}</b></>}.{" "}
          <button
            className="blink"
            onClick={() => {
              setQ("");
              setFam("");
            }}
          >
            Clear filters
          </button>
        </p>
      ) : (
        <div className="bgrid">
          {shown.map((b) => (
            <Link className="bcard" href={`/blocks/${b.name}`} key={b.name}>
              <BlockThumb
                name={b.name}
                playing={live === b.name}
                onToggle={() => setLive((cur) => (cur === b.name ? null : b.name))}
              />
              <div className="meta">
                <div className="bn">{b.name}</div>
                <div className="bf">{b.family}</div>
                <div className="bp">{b.blurb || propKeys(b.props)}</div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
