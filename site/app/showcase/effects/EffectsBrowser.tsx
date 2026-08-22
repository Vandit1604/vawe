"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { EffectPreview } from "./EffectPreview";

/* The arsenal index: 518 effects, all of them on one page, findable.
 *
 * WHY A TABLE AND NOT A GRID OF CARDS. 518 cards is 518 boxes of chrome around one word each, and a
 * page you scroll hoping. The atom here is a two-column row, name and what it is for, which is the
 * densest thing that still answers the only question the list has to answer: which of these do I
 * want. Judging is a different job with a different surface, so it gets one — the drawer.
 *
 * WHY SOME FAMILIES COLLAPSE TO CHIPS. 41 easings named by their curve and 17 blend modes defined by
 * the CSS spec produce 58 rows of "—". The catalog already records that decision per family
 * (`meta.skip` in effects-catalog.mjs), so those families render as one paragraph and one line of
 * names. Every name is still present and still opens; only the empty column is gone.
 *
 * Filtering is client-side over an array already in the page, and every row server-renders, so the
 * whole index is in the HTML for anything that does not run JS.
 */

export type Entry = { name: string; desc: string; json: string; scene: string | null; noPreview: string | null };
export type Family = {
  id: string; title: string; tag: string; intro: string;
  mode: "table" | "chips"; note: string | null; noPreview: string | null;
  count: number; undescribed: number; entries: Entry[];
};
export type Index = { total: number; previewed: number; families: number; tags: [string, number][]; list: Family[] };

// The intro strings are markdown from the doc generator: `code` and **bold** carry real meaning
// (they are the property names), so they are rendered rather than shown as punctuation.
function Rich({ text }: { text: string }) {
  const parts = text.split(/(`[^`]+`|\*\*[^*]+\*\*)/g).filter(Boolean);
  return (
    <>
      {parts.map((p, i) =>
        p.startsWith("`") ? <code key={i}>{p.slice(1, -1)}</code>
        : p.startsWith("**") ? <b key={i}>{p.slice(2, -2)}</b>
        : <span key={i}>{p}</span>,
      )}
    </>
  );
}

function Copy({ text }: { text: string }) {
  const [done, setDone] = useState(false);
  useEffect(() => {
    if (!done) return;
    const t = setTimeout(() => setDone(false), 1400);
    return () => clearTimeout(t);
  }, [done]);
  return (
    <button
      className="fxcopy"
      onClick={() => navigator.clipboard.writeText(text).then(() => setDone(true), () => setDone(false))}
    >
      {done ? "Copied" : "Copy JSON"}
    </button>
  );
}

function Drawer({ open, family, onClose }: { open: Entry | null; family: Family | null; onClose: () => void }) {
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [open, onClose]);

  if (!open || !family) return null;
  return (
    <aside className="fxdrawer" role="dialog" aria-modal="false" aria-label={`${open.name} effect`}>
      <header>
        <div>
          <div className="fxd-name mono">{open.name}</div>
          <div className="fxd-fam">{family.title} · <span className="tag">{family.tag}</span></div>
        </div>
        <button className="fxd-x" ref={closeRef} onClick={onClose} aria-label="Close">✕</button>
      </header>
      <div className="fxd-body">
        {open.desc && <p className="fxd-desc"><Rich text={open.desc} /></p>}

        {open.scene
          ? <EffectPreview key={open.scene} name={open.name} src={open.scene} />
          : <p className="fxd-nope"><b>No preview here.</b> {open.noPreview ?? family.noPreview}</p>}

        <div className="fxd-code">
          <div className="fxd-code-h">
            <span>The JSON that uses it</span>
            <Copy text={open.json} />
          </div>
          <pre><code>{open.json}</code></pre>
        </div>
      </div>
    </aside>
  );
}

export function EffectsBrowser({ index }: { index: Index }) {
  const [q, setQ] = useState("");
  const [tag, setTag] = useState("");
  const [onlyPreview, setOnlyPreview] = useState(false);
  const [open, setOpen] = useState<{ fam: string; name: string } | null>(null);

  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return index.list
      .filter((f) => (!tag || f.tag === tag) && (!onlyPreview || !f.noPreview))
      .map((f) => (onlyPreview ? { ...f, entries: f.entries.filter((e) => e.scene) } : f))
      .map((f) => {
        if (!needle) return f;
        // A family whose TITLE matches keeps all of its rows: typing "stings" means show me the
        // stings, not the four stings whose own names happen to contain the word.
        if (f.title.toLowerCase().includes(needle) || f.tag.includes(needle)) return f;
        const entries = f.entries.filter((e) => e.name.toLowerCase().includes(needle) || e.desc.toLowerCase().includes(needle));
        return entries.length ? { ...f, entries } : null;
      })
      .filter(Boolean) as Family[];
  }, [index.list, q, tag, onlyPreview]);

  const count = shown.reduce((n, f) => n + f.entries.length, 0);
  const openFam = open ? index.list.find((f) => f.id === open.fam) ?? null : null;
  const openEntry = openFam ? openFam.entries.find((e) => e.name === open!.name) ?? null : null;

  const row = (f: Family, e: Entry) => (
    <button key={e.name} className="fxname mono" onClick={() => setOpen({ fam: f.id, name: e.name })} aria-expanded={open?.name === e.name && open?.fam === f.id}>
      {e.name}
      {e.scene && <span className="fxdot" aria-label="previewable" title="Plays live" />}
    </button>
  );

  return (
    <>
      <div className="bfilter fxfilter">
        <div className="bsearch">
          <svg className="bsearch-i" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
            <path d="M20 20l-3.5-3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
          <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search effects, families, descriptions…" aria-label="Search effects" />
          {q && <button className="bsearch-x" onClick={() => setQ("")} aria-label="Clear search">✕</button>}
        </div>

        <div className="bselect">
          <select value={tag} onChange={(e) => setTag(e.target.value)} aria-label="Filter by tag">
            <option value="">All tags ({index.total})</option>
            {index.tags.map(([t, n]) => <option key={t} value={t}>{t} ({n})</option>)}
          </select>
          <span className="bselect-c" aria-hidden="true">▾</span>
        </div>

        <label className="fxonly">
          <input type="checkbox" checked={onlyPreview} onChange={(e) => setOnlyPreview(e.target.checked)} />
          Plays live only
        </label>

        <span className="bcount" aria-live="polite">
          {count === index.total ? `${index.total} effects` : `${count} of ${index.total}`}
        </span>
      </div>

      {/* The families, as a jump list. 35 sections is a lot of scrolling to discover by scrolling. */}
      <nav className="fxrail" aria-label="Jump to a family">
        {shown.map((f) => (
          <a key={f.id} href={`#${f.id}`}>{f.title} <span>{f.entries.length}</span></a>
        ))}
      </nav>

      {shown.length === 0 && (
        <p className="bempty">
          Nothing matches <b>{q}</b>{tag && <> in <b>{tag}</b></>}.{" "}
          <button className="blink" onClick={() => { setQ(""); setTag(""); setOnlyPreview(false); }}>Clear filters</button>
        </p>
      )}

      <div className={open ? "fxlist fxlist-open" : "fxlist"}>
        {shown.map((f) => (
          <section className="fxfam" id={f.id} key={f.id}>
            <h2>
              {f.title} <span className="fxn">{f.entries.length}</span>
              <span className="tag">{f.tag}</span>
              {!f.noPreview && <span className="tag fxtag-live">plays live</span>}
            </h2>
            {/* THE INTRO IS A DETAIL, NOT A HEADING. 35 families meant 35 paragraphs standing between a
                person and the names they came to scan, and an index is for FINDING. It is still here,
                one keystroke away, for the reader who has decided they want it. */}
            <details className="fxabout">
              <summary>What this family is for</summary>
              <p className="fxintro"><Rich text={f.intro} /></p>
            </details>
            {/* An empty description column is a gap in the registry, not a design decision. Saying
                so is cheaper than 22 rows each repeating that nobody wrote one. */}
            {f.undescribed > 0 && (
              <p className="fxgap">
                {f.undescribed === f.count
                  ? "None of these carry a per-name description in the registry yet."
                  : `${f.undescribed} of these carry no per-name description in the registry yet.`}{" "}
                The name and the form above are what there is.
              </p>
            )}

            {f.mode === "chips" ? (
              <>
                {/* The catalog's own decision, quoted: these entries differ by name and nothing an
                    index can usefully print. One paragraph, then every name. */}
                <p className="fxskip">Near-identical across all {f.count}: {f.note}. Pick one by name.</p>
                <div className="fxchips">{f.entries.map((e) => row(f, e))}</div>
              </>
            ) : (
              <table className="fxtable">
                <thead><tr><th scope="col">Name</th><th scope="col">What / when</th></tr></thead>
                <tbody>
                  {f.entries.map((e) => (
                    <tr key={e.name} data-on={open?.fam === f.id && open?.name === e.name ? "" : undefined}>
                      <td>{row(f, e)}</td>
                      <td><Rich text={e.desc} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        ))}
      </div>

      <Drawer open={openEntry} family={openFam} onClose={() => setOpen(null)} />
    </>
  );
}
