"use client";

import Link from "next/link";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Facet, MoveCard } from "../../lib/moves";
import { clip } from "../../lib/clip";
import { moveAlt } from "../../lib/move-words";

// Enough to show the grid is alive; each playing clip holds a decoder, and phones drop frames past this.
const MAX_PLAYING = 6;
const PLAY_RATIO = 0.5;
// The first row's posters are the largest paint on load, so they skip lazy loading.
const FIRST_ROW = 3;

type Facets = { group: string[]; look: string[]; job: string[] };
type Filters = Facets & { q: string };
type FacetKey = keyof Facets;
const EMPTY: Filters = { q: "", group: [], look: [], job: [] };
const FACETS: FacetKey[] = ["group", "look", "job"];

const list = (v: string | null) => (v ? v.split(",").filter(Boolean) : []);

function readUrl(): Filters {
  const p = new URLSearchParams(window.location.search);
  return { q: p.get("q") ?? "", group: list(p.get("group")), look: list(p.get("look")), job: list(p.get("job")) };
}

function writeUrl(f: Filters) {
  const p = new URLSearchParams();
  if (f.q) p.set("q", f.q);
  for (const k of FACETS) if (f[k].length) p.set(k, f[k].join(","));
  const qs = p.toString().replace(/%2C/g, ",");
  window.history.replaceState(null, "", qs ? `?${qs}` : window.location.pathname);
}

const valuesOf = (m: MoveCard, k: FacetKey) => (k === "group" ? [m.group ?? ""] : k === "look" ? [m.look] : m.jobs);

// OR inside one facet, AND across facets. `skip` leaves one facet out, so its options can show the
// count they would add.
function matches(m: MoveCard, f: Filters, skip?: FacetKey) {
  for (const k of FACETS) {
    if (k === skip || !f[k].length) continue;
    if (!valuesOf(m, k).some((v) => f[k].includes(v))) return false;
  }
  if (!f.q) return true;
  const hay = `${m.name} ${m.title} ${m.use}`.toLowerCase();
  return f.q.toLowerCase().split(/\s+/).filter(Boolean).every((w) => hay.includes(w));
}

const Card = memo(function Card({
  move,
  groupLabel,
  first,
  live,
  reduced,
  onToggle,
}: {
  move: MoveCard;
  groupLabel: string;
  first: boolean;
  live: boolean;
  reduced: boolean;
  onToggle: (name: string) => void;
}) {
  const files = clip(move);
  return (
    <li className="mv-card panel" data-name={move.name}>
      <div className="mv-media">
        <img
          src={files.poster}
          alt={moveAlt(move)}
          width={640}
          height={360}
          loading={first ? "eager" : "lazy"}
          fetchPriority={first ? "high" : "auto"}
          decoding="async"
        />
        {live ? (
          <video
            muted
            loop
            playsInline
            autoPlay
            aria-hidden="true"
            onPlaying={(e) => e.currentTarget.setAttribute("data-on", "")}
          >
            <source src={files.webm} type="video/webm" />
            <source src={files.mp4} type="video/mp4" />
          </video>
        ) : null}
        {reduced ? (
          <button type="button" className="mv-play" aria-pressed={live} onClick={() => onToggle(move.name)}>
            {live ? "Stop" : "Play"}
            <span className="sr-only"> {move.title}</span>
          </button>
        ) : null}
      </div>
      <div className="mv-cap">
        <h2 className="mv-title">
          <Link href={`/moves/${move.name}`} prefetch={false}>{move.title}</Link>
        </h2>
        <p className="mv-use">{move.use}</p>
        <p className="meta mv-meta">
          {groupLabel}, {move.look}
        </p>
      </div>
    </li>
  );
});

export function MovesGallery({
  moves,
  groups,
  looks,
  jobs,
}: {
  moves: MoveCard[];
  groups: Facet[];
  looks: string[];
  jobs: Facet[];
}) {
  const [filters, setFilters] = useState<Filters>(EMPTY);
  const [panelOpen, setPanelOpen] = useState(false);
  const [live, setLive] = useState<string[]>([]);
  const [reduced, setReduced] = useState(false);
  const grid = useRef<HTMLUListElement>(null);

  const groupText = useMemo(() => new Map(groups.map((g) => [g.id, g.label])), [groups]);
  const shown = useMemo(() => moves.filter((m) => matches(m, filters)), [moves, filters]);
  const counts = useMemo(() => {
    const out = {} as Record<FacetKey, Map<string, number>>;
    for (const k of FACETS) {
      const c = new Map<string, number>();
      for (const m of moves) if (matches(m, filters, k)) for (const v of valuesOf(m, k)) c.set(v, (c.get(v) ?? 0) + 1);
      out[k] = c;
    }
    return out;
  }, [moves, filters]);

  useEffect(() => setFilters(readUrl()), []);

  const update = (next: Filters) => {
    setFilters(next);
    writeUrl(next);
  };
  const toggleValue = (k: FacetKey, v: string) =>
    update({ ...filters, [k]: filters[k].includes(v) ? filters[k].filter((x) => x !== v) : [...filters[k], v] });

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => {
      setReduced(mq.matches);
      setLive([]);
    };
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  // One observer for the whole grid. The clips that play are the first MAX_PLAYING cards, in page
  // order, that are at least half on screen.
  useEffect(() => {
    const root = grid.current;
    if (!root || reduced) return;
    const ratios = new Map<Element, number>();
    const pick = () => {
      const names = [...root.children]
        .filter((el) => (ratios.get(el) ?? 0) >= PLAY_RATIO)
        .slice(0, MAX_PLAYING)
        .map((el) => (el as HTMLElement).dataset.name as string);
      setLive((prev) => (prev.length === names.length && prev.every((n, i) => n === names[i]) ? prev : names));
    };
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) ratios.set(e.target, e.intersectionRatio);
        pick();
      },
      { threshold: [0, PLAY_RATIO, 1] },
    );
    for (const el of root.children) io.observe(el);
    return () => io.disconnect();
  }, [reduced, shown]);

  const toggle = useCallback(
    (name: string) =>
      setLive((prev) => (prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name].slice(-MAX_PLAYING))),
    [],
  );

  const liveSet = new Set(live);
  const picked = FACETS.reduce((n, k) => n + filters[k].length, 0);
  const active = picked > 0 || filters.q !== "";

  const options: { key: FacetKey; legend: string; items: Facet[]; fold?: boolean }[] = [
    { key: "group", legend: "Job group", items: groups },
    { key: "look", legend: "Look", items: looks.map((l) => ({ id: l, label: l })) },
    { key: "job", legend: "Pick by job", items: jobs, fold: true },
  ];

  return (
    <>
      <div className="mv-top" role="search">
        <label className="mv-find">
          <span className="sr-only">Search moves by name or when line</span>
          <input
            type="search"
            placeholder="Search name or when to use"
            value={filters.q}
            onChange={(e) => update({ ...filters, q: e.target.value })}
          />
        </label>
        <button
          type="button"
          className="mv-fold"
          aria-expanded={panelOpen}
          aria-controls="mv-filters"
          onClick={() => setPanelOpen(!panelOpen)}
        >
          Filters{picked ? ` (${picked})` : ""}
        </button>
        <p className="meta mv-count" role="status">
          {shown.length} {shown.length === 1 ? "move" : "moves"}
        </p>
      </div>

      <div className="mv-layout">
        <form className="mv-filters" id="mv-filters" data-open={panelOpen || undefined} onSubmit={(e) => e.preventDefault()}>
          {options.map(({ key, legend, items, fold }) => {
            const body = (
              <ul>
                {items.map((it) => {
                  const n = counts[key].get(it.id) ?? 0;
                  const on = filters[key].includes(it.id);
                  return (
                    <li key={it.id}>
                      <label className={on || n ? "" : "is-zero"}>
                        <input type="checkbox" checked={on} onChange={() => toggleValue(key, it.id)} />
                        <span>{it.label}</span>
                        <span className="mv-n">{n}</span>
                      </label>
                    </li>
                  );
                })}
              </ul>
            );
            return fold ? (
              <details key={key} open={filters[key].length > 0 || undefined}>
                <summary>{legend}{filters[key].length ? ` (${filters[key].length})` : ""}</summary>
                {body}
              </details>
            ) : (
              <fieldset key={key}>
                <legend>{legend}</legend>
                {body}
              </fieldset>
            );
          })}
          <button type="button" className="mv-clear" disabled={!active} onClick={() => update(EMPTY)}>
            Clear filters
          </button>
        </form>

        {shown.length ? (
          <ul className="mv-grid" ref={grid}>
            {shown.map((m, i) => (
              <Card
                key={m.name}
                move={m}
                first={i < FIRST_ROW}
                groupLabel={groupText.get(m.group ?? "") ?? ""}
                live={liveSet.has(m.name)}
                reduced={reduced}
                onToggle={toggle}
              />
            ))}
          </ul>
        ) : (
          <div className="mv-empty">
            <p>No move matches these filters.</p>
            <button type="button" className="btn btn-ghost" onClick={() => update(EMPTY)}>
              Clear filters
            </button>
          </div>
        )}
      </div>
    </>
  );
}
