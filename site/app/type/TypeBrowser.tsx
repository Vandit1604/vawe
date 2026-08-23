"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { TypeLive } from "./TypeLive";

export type Specimen = {
  id: string;
  label: string;
  kind: "preset" | "mechanic" | "beat";
  source: string;
  blurb: string;
  caution: string | null;
  ask: string | null;
  props: { name: string; label: string | null }[] | null;
  poster: number;
  json: string;
};
export type Group = { id: string; title: string; intent: string; source: string; specimens: Specimen[] };

/* The catalogue.
 *
 * ONE live engine at a time, the same rule /blocks runs on: a specimen is an iframe, a font load and
 * a rAF loop, and 39 of those is not a page. Starting one stops the last, which tears its iframe down
 * (useSceneEngine's cleanup) — so `live` being a single id is the whole mechanism.
 *
 * The still underneath is not a settled frame. Each poster is shot partway through the entrance, so
 * the grid reads as 39 different states of arrival rather than the same word set 39 times. It is
 * still a still: the motion is one press away, in the engine, not in CSS.
 */

function Card({ s, live, onToggle }: { s: Specimen; live: boolean; onToggle: () => void }) {
  const [ready, setReady] = useState(false);
  const [copied, setCopied] = useState(false);
  const booting = live && !ready;
  useEffect(() => { if (!live) setReady(false); }, [live]);
  const onReady = useCallback(() => setReady(true), []);

  // Reverts on its own, so the button never sits claiming a copy that happened a minute ago.
  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 1800);
    return () => clearTimeout(t);
  }, [copied]);

  return (
    <figure className="tycard" id={s.id}>
      <div className="tythumb">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={`/assets/type/${s.id}.png`} alt={`${s.label}, part way through its entrance`} loading="lazy" />
        {live && <TypeLive id={s.id} label={s.label} onReady={onReady} />}
        {booting && <span className="tyboot" aria-hidden="true" />}
        <button
          className="typlay"
          {...(live ? { "data-on": "" } : {})}
          {...(booting ? { "data-loading": "" } : {})}
          aria-pressed={live}
          aria-busy={booting}
          aria-label={booting ? `Loading ${s.label}` : live ? `Stop ${s.label}` : `Play ${s.label} in the engine`}
          onClick={onToggle}
        >
          {booting ? (
            <svg className="tyspin" viewBox="0 0 28 28" aria-hidden="true">
              <circle cx="14" cy="14" r="10" strokeDasharray="20 43" />
            </svg>
          ) : live ? (
            <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="6" y="5" width="4" height="14" rx="1" /><rect x="14" y="5" width="4" height="14" rx="1" /></svg>
          ) : (
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5v13l11-6.5z" /></svg>
          )}
          <span className="typlabel">{live ? "Stop" : "Play"}</span>
        </button>
      </div>

      <figcaption>
        <div className="tyname">
          <span className="mono">{s.label}</span>
          <span className="tykind">{s.kind}</span>
        </div>
        <p className="tyblurb">{s.blurb}</p>
        {s.ask && <p className="tyask">Ask for it: &ldquo;{s.ask}&rdquo;</p>}
        {s.props && s.props.length > 0 && (
          <ul className="typrops">
            {s.props.map((p) => (
              <li key={p.name}>
                <span className="mono">{p.name}</span>
                {p.label && <span>{p.label}</span>}
              </li>
            ))}
          </ul>
        )}
        {s.caution && <p className="tycaution"><b>Careful:</b> {s.caution}</p>}

        <details className="tyjson">
          <summary>
            <span>The JSON that produces it</span>
            <span className="tylines">{s.json.split("\n").length} lines</span>
          </summary>
          <pre><code>{s.json}</code></pre>
          <button
            className="tycopy"
            onClick={() => { void navigator.clipboard?.writeText(s.json).then(() => setCopied(true)); }}
          >
            {copied ? "Copied" : "Copy"}
          </button>
        </details>
      </figcaption>
    </figure>
  );
}

export function TypeBrowser({ groups }: { groups: Group[] }) {
  const [q, setQ] = useState("");
  const [live, setLive] = useState<string | null>(null);

  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return groups;
    return groups
      .map((g) => ({
        ...g,
        specimens: g.specimens.filter(
          (s) =>
            s.label.toLowerCase().includes(needle) ||
            s.kind.includes(needle) ||
            (s.blurb ?? "").toLowerCase().includes(needle) ||
            (s.props ?? []).some((p) => p.name.toLowerCase().includes(needle)),
        ),
      }))
      .filter((g) => g.specimens.length > 0);
  }, [groups, q]);

  const total = useMemo(() => shown.reduce((a, g) => a + g.specimens.length, 0), [shown]);

  return (
    <>
      <div className="tybar">
        <input
          className="tysearch"
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search the vocabulary: decode, typing, ransom, stagger…"
          aria-label="Search typography specimens"
        />
        <nav className="tyjump" aria-label="Jump to a group">
          {groups.map((g) => (
            <a key={g.id} href={`#g-${g.id}`}>{g.title}</a>
          ))}
        </nav>
      </div>

      {q.trim() && (
        <p className="tycount" role="status">
          {total === 1 ? "1 specimen matches" : `${total} specimens match`} &ldquo;{q.trim()}&rdquo;.
        </p>
      )}

      {shown.map((g) => (
        <section className="tygroup" key={g.id} id={`g-${g.id}`}>
          <div className="tyghead">
            <h2>{g.title}</h2>
            <p>{g.intent}</p>
            <span className="tysrc mono">{g.source}</span>
          </div>
          <div className="tygrid">
            {g.specimens.map((s) => (
              <Card
                key={s.id}
                s={s}
                live={live === s.id}
                onToggle={() => setLive((cur) => (cur === s.id ? null : s.id))}
              />
            ))}
          </div>
        </section>
      ))}

      {shown.length === 0 && <p className="tycount">Nothing matches that. Try a preset name, or a prop like <span className="mono">typing</span>.</p>}
    </>
  );
}
