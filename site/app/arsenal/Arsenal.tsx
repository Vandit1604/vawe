"use client";

/* /arsenal — one index over everything the engine is made of.
 *
 * It replaces three pages that indexed the same library three ways: /blocks (a category rail over
 * the block registry), /showcase/effects (a family rail over the effect registry) and /type. A
 * visitor who wanted "a wipe" had to know a wipe was an effect and not a block before they could
 * start looking. Here one search box reaches every entry and the rail is the same control on both
 * halves, so the split becomes a way to narrow rather than a thing to guess.
 *
 * THE AXIS IS THE REGISTRIES' OWN, not a taxonomy invented here. A block's axis is the module it
 * ships in; an effect's is its family tag. Both come out of scripts/site/arsenal-json.mjs, so
 * neither can drift from the engine, and there is no name-to-bucket table in this file to go stale.
 *
 * A card is a STILL and nothing more. One engine boot per entry is what playing them here would
 * cost, on a page whose job is to help you FIND one. Playback lives on the detail page, which
 * is also the only place the JSON to paste appears.
 */
import { useState, useMemo, useRef, useEffect, Suspense } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

export type Item = {
  n: string; k: string; a: string; g: string; d: string; h: string;
  s: string | null; l: boolean; w?: string | null;
};
export type Axis = { id: string; kind: string; label: string; n: number };
export type Arsenal = {
  total: number; stills: number; live: number;
  kinds: { id: string; label: string; n: number }[];
  axes: Axis[]; items: Item[];
};

// 48 fills roughly two screens at 1440 and stays one tap-and-a-half at 430. Inherited from the
// block catalog this page replaces, where it was measured.
const PER = 48;

// A block poster is cropped to the block's own bounds, so its aspect is whatever the block is;
// letterboxing it inside the cell shows the part whole. An effect still is a full 16:9 frame from
// the renderer, so it fills the cell. One cell, two fits, and the fit follows the source.
const FIT = { block: "contain", effect: "cover" } as const;

export function Arsenal(props: { data: Arsenal }) {
  return <Suspense><Index {...props} /></Suspense>;
}

function Thumb({ it, axisLabel }: { it: Item; axisLabel: string }) {
  const [broken, setBroken] = useState(false);
  // NO STILL IS A STATE, NOT A HOLE. Roughly two entries in five have no picture, and most of them
  // can never have one: an easing is a curve, a blend mode is a formula, a camera move needs content to move
  // over. A blank grey cell and a broken-image glyph both read as "the site is bugged", so the cell
  // says what the entry is instead, on a stripe that is visibly not a photograph.
  if (!it.s || broken) {
    return (
      <span className="ar-thumb ar-none" title={it.w ?? undefined}>
        <span className="ar-none-tag">{axisLabel}</span>
        <span className="ar-none-why">{it.w ? "no preview" : "no still"}</span>
      </span>
    );
  }
  return (
    <span className="ar-thumb">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={it.s}
        alt={`${it.n}, a rendered still`}
        loading="lazy"
        decoding="async"
        data-fit={FIT[it.k as keyof typeof FIT] ?? "cover"}
        onError={() => setBroken(true)}
      />
      {it.l && <span className="ar-live" aria-hidden="true" title="Plays live" />}
    </span>
  );
}

function Index({ data }: { data: Arsenal }) {
  const [q, setQ] = useState("");
  const [live, setLive] = useState(false);
  const search = useRef<HTMLInputElement>(null);
  const params = useSearchParams();
  const path = usePathname();
  const router = useRouter();

  // `/` focuses search, the convention every developer tool shares. Escape clears and returns focus
  // to the page, so the keyboard never traps you inside the field.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      const typing = t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable);
      if (e.key === "/" && !typing) { e.preventDefault(); search.current?.focus(); }
      if (e.key === "Escape" && typing) { setQ(""); (t as HTMLInputElement).blur(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const axisLabel = useMemo(() => new Map(data.axes.map((a) => [a.id, a.label])), [data.axes]);

  // Axis and kind live in the URL, so every view is linkable and Back walks the browse history. The
  // query does not: one history entry per keystroke would make Back useless.
  const rawAxis = params.get("axis");
  const axis = rawAxis && axisLabel.has(rawAxis) ? rawAxis : null;
  const rawKind = params.get("kind");
  const kind = axis ? axis.split(":")[0] : (rawKind && data.kinds.some((k) => k.id === rawKind) ? rawKind : null);

  const href = (next: { axis?: string | null; kind?: string | null; page?: number }) => {
    const s = new URLSearchParams();
    const a = next.axis !== undefined ? next.axis : axis;
    const k = next.kind !== undefined ? next.kind : kind;
    if (a) s.set("axis", a);
    else if (k) s.set("kind", k);
    if (next.page && next.page > 1) s.set("page", String(next.page));
    const qs = s.toString();
    return qs ? `${path}?${qs}` : path;
  };

  // The rail's own order, so a section is one contiguous run and a heading never appears twice on a
  // page. Without it the grid follows registry order, which interleaves categories: the first
  // screen opened "Core 1" above "Code 6" above, much later, "Core 32" — three headings, two of
  // them lying about how much is under them. Group order inside an axis is first-seen, which is the
  // registries' own order and therefore stable.
  const rank = useMemo(() => {
    const axis = new Map(data.axes.map((a, i) => [a.id, i]));
    const group = new Map<string, number>();
    for (const it of data.items) if (!group.has(it.g)) group.set(it.g, group.size);
    return { axis, group };
  }, [data.axes, data.items]);

  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return data.items.filter((it) => {
      if (axis ? it.a !== axis : kind ? it.k !== kind : false) return false;
      if (live && !it.l) return false;
      if (!needle) return true;
      return it.n.toLowerCase().includes(needle)
        || it.d.toLowerCase().includes(needle)
        || it.g.toLowerCase().includes(needle);
    }).sort((x, y) =>
      (rank.axis.get(x.a) ?? 99) - (rank.axis.get(y.a) ?? 99)
      || (rank.group.get(x.g) ?? 0) - (rank.group.get(y.g) ?? 0),
    );
  }, [data.items, q, axis, kind, live, rank]);

  // A page is made of WHOLE sections. Splitting a group across a page boundary would leave a
  // heading reading "Code 7" under a rail reading "Code 38", i.e. two different numbers for one
  // thing. Packing whole runs keeps every heading's count equal to what is under it.
  const paged = useMemo(() => {
    const runs: { g: string; items: Item[] }[] = [];
    for (const it of shown) {
      if (runs.at(-1)?.g !== it.g) runs.push({ g: it.g, items: [] });
      runs.at(-1)!.items.push(it);
    }
    const out: (typeof runs)[] = [];
    let n = 0;
    for (const r of runs) {
      // A run with no pictures renders as chips, which take about a third of the height the same
      // count of cards would, so it costs a third of the page budget. Counting them as cards left a
      // page holding 41 easings and two thirds white.
      const cost = r.items.every((it) => !it.s) ? Math.ceil(r.items.length / 3) : r.items.length;
      // A single run larger than a page simply gets a larger page; splitting it costs more than it buys.
      if (!out.length || (n && n + cost > PER)) { out.push([]); n = 0; }
      out.at(-1)!.push(r);
      n += cost;
    }
    return out;
  }, [shown]);

  const pages = Math.max(1, paged.length);
  const page = Math.min(pages, Math.max(1, Number(params.get("page")) || 1));
  const sections = paged[page - 1] ?? [];

  // Typing narrows the list under you; staying on page 3 of a result set that now has one page is a
  // dead end, so the query resets the page rather than the page fighting the query.
  const typed = useRef(false);
  useEffect(() => {
    if (typed.current && page > 1) router.replace(href({ page: 1 }), { scroll: false });
    typed.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, live]);

  const top = useRef<HTMLDivElement>(null);
  const first = useRef(true);
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    top.current?.scrollIntoView({ block: "start" });
  }, [page, axis, kind]);

  const filtered = !!(q || axis || kind || live);

  return (
    <div className="ar">
      <div className="ar-bar">
        <h1>arsenal <span className="ar-n">{data.total}</span></h1>
        <div className="ar-find">
          <svg viewBox="0 0 16 16" aria-hidden="true"><circle cx="7" cy="7" r="4.5" /><path d="M10.5 10.5 L14 14" /></svg>
          <input
            ref={search}
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={`Search ${data.total} blocks and effects`}
            aria-label="Search the arsenal"
            spellCheck={false}
          />
          <kbd aria-hidden="true">/</kbd>
        </div>
        <label className="ar-live-only">
          <input type="checkbox" checked={live} onChange={(e) => setLive(e.target.checked)} />
          Plays live <span className="ar-n">{data.live}</span>
        </label>
      </div>

      <div className="rail-layout ar-body">
        <div className="rail-col">
        <nav className="rail ar-rail" aria-label="Filter the arsenal">
          <Link className="ar-ax ar-ax-all" href={href({ axis: null, kind: null, page: 1 })}
            aria-current={!axis && !kind ? "true" : undefined} scroll={false}>
            <span>Everything</span><em>{data.total}</em>
          </Link>

          {data.kinds.map((k) => (
            <div className="ar-group" key={k.id}>
              {/* The kind row is a filter in its own right, so "show me every effect" is one click
                  and not nineteen. The axes under it narrow the same list further. */}
              <Link className="ar-ax ar-ax-kind" href={href({ axis: null, kind: k.id, page: 1 })}
                aria-current={kind === k.id && !axis ? "true" : undefined} scroll={false}>
                <span>{k.label}</span><em>{k.n}</em>
              </Link>
              {data.axes.filter((a) => a.kind === k.id).map((a) => (
                <Link key={a.id} className="ar-ax" href={href({ axis: axis === a.id ? null : a.id, kind: null, page: 1 })}
                  aria-current={axis === a.id ? "true" : undefined} scroll={false}>
                  <span>{a.label}</span><em>{a.n}</em>
                </Link>
              ))}
            </div>
          ))}

          {/* Type is the one part of the library a still cannot index: every specimen is motion, and
              the page that shows them plays each one. So it is a destination, not a filter. */}
          <Link className="ar-ax ar-ax-out" href="/arsenal/type">
            <span>Type specimens</span><em>→</em>
          </Link>

          {/* The one fact a visitor cannot infer from looking. Everything else the grid shows. */}
          <p className="ar-how">
            A block goes into a scene as <code>{'{"block":"name"}'}</code>. An effect is a value on a
            layer, and its own page carries the JSON that uses it.
          </p>
        </nav>
        </div>

        <div className="ar-main" ref={top}>
          {filtered && (
            <p className="ar-count" role="status">
              {shown.length} of {data.total}
              {axis && <> in <b>{axisLabel.get(axis)}</b></>}
              {!axis && kind && <> in <b>{data.kinds.find((k) => k.id === kind)?.label}</b></>}
              {live && <> that play live</>}
              <Link className="ar-clear" href={path} onClick={() => { setQ(""); setLive(false); }} scroll={false}>Clear</Link>
            </p>
          )}

          {shown.length === 0 ? (
            <p className="ar-none-msg">
              Nothing matches <b>{q}</b>. Try <code>wipe</code>, <code>chart</code>, <code>terminal</code> or <code>blur</code>.
            </p>
          ) : (
            sections.map((s) => {
              // A GROUP THAT CAN NEVER BE PICTURED IS A LIST, NOT A GRID. An easing is a curve and a
              // blend mode is a formula: 41 identical striped swatches carrying one repeated
              // sentence is more chrome than information. So where NOTHING in the run has a still,
              // the run drops to names. The test is the data, not a hand-kept list of families.
              const chips = s.items.every((it) => !it.s);
              return (
                <section key={s.g} className="ar-sec" aria-label={s.g}>
                  <h2>{s.g} <span className="ar-n">{s.items.length}</span></h2>
                  {chips ? (
                    <ul className="ar-chips">
                      {s.items.map((it) => (
                        <li key={it.h}>
                          <Link className="ar-chip" href={it.h}>
                            <code>{it.n}</code>
                            {it.l && <span className="ar-live" aria-hidden="true" title="Plays live" />}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <ul className="ar-grid">
                      {s.items.map((it) => (
                        <li key={it.h}>
                          <Link className="ar-card" href={it.h}>
                            <Thumb it={it} axisLabel={axisLabel.get(it.a) ?? it.k} />
                            <span className="ar-meta">
                              <code>{it.n}</code>
                              {it.d && <span className="ar-blurb">{it.d}</span>}
                            </span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              );
            })
          )}

          {pages > 1 && (
            <nav className="ar-pages" aria-label="Pages">
              {/* At the ends the step is not a disabled link but no link at all: nothing to tab to,
                  nothing to click that goes nowhere. */}
              {page > 1 ? (
                <Link className="ar-step" href={href({ page: page - 1 })} rel="prev" scroll={false}>
                  <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M10 3 L5 8 L10 13" /></svg> Prev
                </Link>
              ) : <span className="ar-step" aria-hidden="true"><svg viewBox="0 0 16 16"><path d="M10 3 L5 8 L10 13" /></svg> Prev</span>}
              <ol>
                {Array.from({ length: pages }, (_, i) => i + 1).map((p) => (
                  <li key={p}>
                    <Link className="ar-pg" href={href({ page: p })} scroll={false} aria-current={p === page ? "page" : undefined} data-on={p === page ? "" : undefined}>{p}</Link>
                  </li>
                ))}
              </ol>
              {page < pages ? (
                <Link className="ar-step" href={href({ page: page + 1 })} rel="next" scroll={false}>
                  Next <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M6 3 L11 8 L6 13" /></svg>
                </Link>
              ) : <span className="ar-step" aria-hidden="true">Next <svg viewBox="0 0 16 16"><path d="M6 3 L11 8 L6 13" /></svg></span>}
            </nav>
          )}
        </div>
      </div>
    </div>
  );
}
