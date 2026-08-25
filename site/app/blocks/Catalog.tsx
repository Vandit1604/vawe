"use client";

// The block catalog, as an INSTRUMENT rather than a pitch.
//
// The old page opened with a dotted uppercase kicker, an h1, a paragraph and a note — 40 words that
// said "drop into a scene" and "reskins to your theme" TWICE each before showing a single block. The
// catalog was below all of it. Here the toolbar IS the header: the count sits next to the word, the
// search is immediately reachable, and the rail and the grid own the rest of the frame.
//
// Grouping is by CATEGORY, not family. 96 families is unusable as a rail and most hold one block; the
// category is resolved from the module each factory lives in (scripts/site/blocks-json.mjs), so there
// is no name-to-category table here to fall out of sync with the engine.
import { useState, useMemo, useRef, useEffect, Suspense } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

export type Block = { name: string; family: string; blurb: string; category?: string; props?: Record<string, unknown> };

const asset = (name: string, ext: string) => `/assets/blocks/${name.replace(/[^a-z0-9.]/gi, "_")}.${ext}`;

// A card is a STILL. Playback lives on the detail page and only there.
//
// Every card used to carry its own play button and mount the engine in place. With 176 cards that put
// a full engine boot one stray click away, on a page whose job is to help you FIND a block, not watch
// one — and the motion is exactly what you go to the detail page for. So the index shows the poster
// and gets out of the way, and the whole card is one link.
function Thumb({ name }: { name: string }) {
  return (
    <span className="ct-thumb">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={asset(name, "png")} alt="" loading="lazy" decoding="async" />
    </span>
  );
}

// 48 fills roughly two screens at 1440 and stays one tap-and-a-half at 430. Four pages for the whole
// library, one or two for any filtered category.
const PER = 48;

// useSearchParams suspends during prerender, so the boundary lives here rather than in page.tsx.
export function Catalog(props: { blocks: Block[] }) {
  return <Suspense><Grid {...props} /></Suspense>;
}

function Grid({ blocks }: { blocks: Block[] }) {
  const [q, setQ] = useState("");
  const search = useRef<HTMLInputElement>(null);
  const params = useSearchParams();
  const path = usePathname();
  const router = useRouter();

  // `/` focuses search, the convention every developer tool shares. Escape clears and returns focus to
  // the page, so the keyboard never traps you inside the field.
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

  const cats = useMemo(() => {
    const n = new Map<string, number>();
    for (const b of blocks) n.set(b.category ?? "Core", (n.get(b.category ?? "Core") ?? 0) + 1);
    return [...n.entries()].sort((a, b) => b[1] - a[1]);
  }, [blocks]);

  // Category and page live in the URL, so every view is linkable and Back walks the browse history.
  // The query does not: one history entry per keystroke would make Back useless.
  const raw = params.get("cat");
  const cat = raw && cats.some(([c]) => c === raw) ? raw : null;

  const href = (c: string | null, p: number) => {
    const s = new URLSearchParams();
    if (c) s.set("cat", c);
    if (p > 1) s.set("page", String(p));
    const qs = s.toString();
    return qs ? `${path}?${qs}` : path;
  };

  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const rank = new Map(cats.map(([c], i) => [c, i]));
    return blocks
      .filter((b) => {
        if (cat && (b.category ?? "Core") !== cat) return false;
        if (!needle) return true;
        return b.name.toLowerCase().includes(needle) || b.blurb.toLowerCase().includes(needle);
      })
      // Sorted into the rail's own order so each category is one contiguous run and a section heading
      // never has to appear twice on a page.
      .sort((a, b) => (rank.get(a.category ?? "Core") ?? 99) - (rank.get(b.category ?? "Core") ?? 99));
  }, [blocks, q, cat, cats]);

  // A page is made of WHOLE sections. Splitting a category across a page boundary would leave a
  // heading reading "Code 7" under a rail reading "Code 38", i.e. two different numbers for one
  // thing. Packing whole runs keeps every heading's count equal to what is under it.
  const paged = useMemo(() => {
    const runs: { cat: string; items: Block[] }[] = [];
    for (const b of shown) {
      const c = b.category ?? "Core";
      if (runs.at(-1)?.cat !== c) runs.push({ cat: c, items: [] });
      runs.at(-1)!.items.push(b);
    }
    const out: (typeof runs)[] = [];
    let n = 0;
    for (const r of runs) {
      // A single run larger than a page simply gets a larger page; splitting it costs more than it buys.
      if (!out.length || (n && n + r.items.length > PER)) { out.push([]); n = 0; }
      out.at(-1)!.push(r);
      n += r.items.length;
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
    // not on mount: a linked ?page=3 must survive the first render
    if (typed.current && page > 1) router.replace(href(cat, 1), { scroll: false });
    typed.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  const top = useRef<HTMLDivElement>(null);
  const first = useRef(true);
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    top.current?.scrollIntoView({ block: "start" });
  }, [page, cat]);

  return (
    <div className="ct">
      <div className="ct-bar">
        <h1>
          blocks <span className="ct-n">{blocks.length}</span>
        </h1>
        <div className="ct-find">
          <svg viewBox="0 0 16 16" aria-hidden="true"><circle cx="7" cy="7" r="4.5" /><path d="M10.5 10.5 L14 14" /></svg>
          <input
            ref={search}
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={`Search ${blocks.length} blocks`}
            aria-label="Search blocks"
            spellCheck={false}
          />
          <kbd aria-hidden="true">/</kbd>
        </div>
      </div>

      <div className="ct-body">
        <nav className="ct-rail" aria-label="Categories">
          {/* One control, one job: the rail FILTERS. The headings in the grid only label what the rail
              already chose, so there is never a second way to reach the same state. */}
          <Link className="ct-cat" href={href(null, 1)} aria-current={cat === null ? "true" : undefined} data-on={cat === null ? "" : undefined} scroll={false}>
            <span>All</span><em>{blocks.length}</em>
          </Link>
          {cats.map(([c, n]) => (
            <Link key={c} className="ct-cat" href={href(cat === c ? null : c, 1)} aria-current={cat === c ? "true" : undefined} data-on={cat === c ? "" : undefined} scroll={false}>
              <span>{c}</span><em>{n}</em>
            </Link>
          ))}
          {/* The one fact a visitor cannot infer from looking. Everything else the grid already shows. */}
          <p className="ct-how">
            Drop one into a scene as <code>{'{"block":"name"}'}</code>. It takes your theme&apos;s colours and type.
          </p>
        </nav>

        <div className="ct-main" ref={top}>
          {(q || cat) && (
            <p className="ct-count" role="status">
              {shown.length} of {blocks.length}
              {cat && <> in <b>{cat}</b></>}
              <Link className="ct-clear" href={path} onClick={() => setQ("")} scroll={false}>Clear</Link>
            </p>
          )}

          {shown.length === 0 ? (
            <p className="ct-none">
              Nothing matches <b>{q}</b>. Try a family name like <code>chart</code>, <code>terminal</code> or <code>map</code>.
            </p>
          ) : (
            sections.map((s) => (
              // With a category chosen, the rail and the result line already name it; a heading saying
              // the same word a third time is not a division, it is an echo. The region keeps its
              // accessible name either way.
              <section key={s.cat} className="ct-sec" aria-label={s.cat}>
                {!cat && (
                  <h2>
                    {s.cat} <span className="ct-n">{s.items.length}</span>
                  </h2>
                )}
                <ul className="ct-grid">
                  {s.items.map((b) => (
                    <li key={b.name}>
                      <Link className="ct-card" href={`/blocks/${b.name}`}>
                        <Thumb name={b.name} />
                        <span className="ct-meta">
                          <code>{b.name}</code>
                          <span className="ct-blurb">{b.blurb}</span>
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            ))
          )}

          {pages > 1 && (
            <nav className="ct-pages" aria-label="Pages">
{/* At the ends the step is not a disabled link but no link at all: nothing to tab to, nothing to
                  click that goes nowhere. */}
              {page > 1 ? (
                <Link className="ct-step" href={href(cat, page - 1)} rel="prev" scroll={false}>
                  <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M10 3 L5 8 L10 13" /></svg> Prev
                </Link>
              ) : <span className="ct-step" aria-hidden="true"><svg viewBox="0 0 16 16"><path d="M10 3 L5 8 L10 13" /></svg> Prev</span>}
              <ol>
                {Array.from({ length: pages }, (_, i) => i + 1).map((p) => (
                  <li key={p}>
                    <Link className="ct-pg" href={href(cat, p)} scroll={false} aria-current={p === page ? "page" : undefined} data-on={p === page ? "" : undefined}>{p}</Link>
                  </li>
                ))}
              </ol>
{page < pages ? (
                <Link className="ct-step" href={href(cat, page + 1)} rel="next" scroll={false}>
                  Next <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M6 3 L11 8 L6 13" /></svg>
                </Link>
              ) : <span className="ct-step" aria-hidden="true">Next <svg viewBox="0 0 16 16"><path d="M6 3 L11 8 L6 13" /></svg></span>}
            </nav>
          )}
        </div>
      </div>
    </div>
  );
}
