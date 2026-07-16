"use client";
import Link from "next/link";
import { useMemo, useState } from "react";

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

const still = (name: string) => `/assets/blocks/${name.replace(/[^a-z0-9.]/gi, "_")}.png`;
const propKeys = (props: Record<string, unknown>) => Object.keys(props).slice(0, 6).join(" · ") || "—";

export function BlocksBrowser({ blocks }: { blocks: Block[] }) {
  const [q, setQ] = useState("");
  const [fam, setFam] = useState("");

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
              <div className="thumb">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={still(b.name)} alt={b.name} loading="lazy" />
              </div>
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
