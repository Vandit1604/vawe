"use client";

import Link from "next/link";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Facet, MoveCard } from "../../lib/moves";

// Enough to show the grid is alive; each playing clip holds a decoder, and phones drop frames past this.
const MAX_PLAYING = 6;
const PLAY_RATIO = 0.5;
// The first row's posters are the largest paint on load, so they skip lazy loading.
const FIRST_ROW = 3;

type Filters = { q: string; group: string; look: string; job: string };
const EMPTY: Filters = { q: "", group: "", look: "", job: "" };
const KEYS = Object.keys(EMPTY) as (keyof Filters)[];

function readUrl(): Filters {
  const p = new URLSearchParams(window.location.search);
  return { q: p.get("q") ?? "", group: p.get("group") ?? "", look: p.get("look") ?? "", job: p.get("job") ?? "" };
}

function writeUrl(f: Filters) {
  const p = new URLSearchParams();
  for (const k of KEYS) if (f[k]) p.set(k, f[k]);
  const qs = p.toString();
  window.history.replaceState(null, "", qs ? `?${qs}` : window.location.pathname);
}

function matches(m: MoveCard, f: Filters, jobText: Map<string, string>) {
  if (f.group && m.group !== f.group) return false;
  if (f.look && m.look !== f.look) return false;
  if (f.job && !m.jobs.includes(f.job)) return false;
  if (!f.q) return true;
  const hay = `${m.name} ${m.title} ${m.use} ${m.jobs.map((j) => jobText.get(j)).join(" ")}`.toLowerCase();
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
  return (
    <li className="mv-card panel" data-name={move.name}>
      <div className="mv-media">
        <img
          src={`/moves/${move.name}.webp`}
          alt=""
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
            <source src={`/moves/${move.name}.webm`} type="video/webm" />
            <source src={`/moves/${move.name}.mp4`} type="video/mp4" />
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
          {groupLabel} · {move.look}
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
  const [live, setLive] = useState<string[]>([]);
  const [reduced, setReduced] = useState(false);
  const grid = useRef<HTMLUListElement>(null);

  const groupText = useMemo(() => new Map(groups.map((g) => [g.id, g.label])), [groups]);
  const jobText = useMemo(() => new Map(jobs.map((j) => [j.id, j.label])), [jobs]);
  const shown = useMemo(() => moves.filter((m) => matches(m, filters, jobText)), [moves, filters, jobText]);

  useEffect(() => setFilters(readUrl()), []);

  const update = (patch: Partial<Filters>) => {
    const next = { ...filters, ...patch };
    setFilters(next);
    writeUrl(next);
  };

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
  const active = KEYS.some((k) => filters[k]);

  return (
    <>
      <div className="mv-bar" role="search">
        <label className="mv-find">
          <span className="sr-only">Search moves by name or job</span>
          <svg viewBox="0 0 16 16" aria-hidden="true">
            <circle cx="7" cy="7" r="4.5" />
            <path d="M10.5 10.5 14 14" />
          </svg>
          <input
            type="search"
            placeholder="Search by name or job"
            value={filters.q}
            onChange={(e) => update({ q: e.target.value })}
          />
        </label>
        <label className="mv-select">
          <span className="meta">Job</span>
          <select value={filters.job} onChange={(e) => update({ job: e.target.value })}>
            <option value="">Any job</option>
            {jobs.map((j) => (
              <option key={j.id} value={j.id}>
                {j.label}
              </option>
            ))}
          </select>
        </label>
        <label className="mv-select">
          <span className="meta">Look</span>
          <select value={filters.look} onChange={(e) => update({ look: e.target.value })}>
            <option value="">Any look</option>
            {looks.map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </select>
        </label>
        <div className="mv-row">
        <div className="mv-groups" role="group" aria-label="Group">
          <button type="button" aria-pressed={!filters.group} onClick={() => update({ group: "" })}>
            All
          </button>
          {groups.map((g) => (
            <button key={g.id} type="button" aria-pressed={filters.group === g.id} onClick={() => update({ group: g.id })}>
              {g.label}
            </button>
          ))}
        </div>
        <p className="meta mv-count" aria-live="polite">
          {shown.length} of {moves.length} moves
        </p>
        </div>
      </div>

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
          {active ? (
            <button type="button" className="btn btn-ghost" onClick={() => update(EMPTY)}>
              Clear filters
            </button>
          ) : null}
        </div>
      )}
    </>
  );
}
