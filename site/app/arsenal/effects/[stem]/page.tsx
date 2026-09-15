import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Header } from "../../../components/Header";
import { Footer } from "../../../components/Footer";
import { Rich, type Index, type Family, type Entry } from "../shared";
import { EffectStage } from "./EffectStage";
import { deriveKnobs } from "./knobs";
import index from "../../../../lib/effects.json";
import bodies from "../../../../lib/effects-body.json";
import "../effects.css";

/* /arsenal/effects/[stem] — one effect, one page, the way a component library gives each
 * component a page. 521 of these, statically generated: every registered effect gets a URL, not
 * just the 227 that can play.
 *
 * The `json` body (the authoring snippet, keyed by `stem`) lives in effects-body.json and is read
 * ONLY here, at build time, by a SERVER component — it lands in this one page's static HTML and
 * never in the client bundle the index page ships. That split (not a runtime fetch) is what the
 * per-effect-page amendment bought: /showcase/effects no longer carries a `json` field at all.
 *
 * Same split for the knob plan: deriveKnobs reads films/scene/schema.json (2100+ lines of field
 * labels this page's client bundle has no business shipping) and hands EffectStage a small, already
 * -resolved list. schema.json is imported nowhere the browser can reach it.
 */

const ix = index as Index;
const BODY = bodies as Record<string, string>;

// site/app/arsenal/effects/[stem]/ is 4 directories under site/ — same depth the lib/*.json
// imports above already climb, just walked at runtime instead of by the bundler, because a still's
// presence has to be checked per RELATED entry, not just this page's own.
const PUBLIC_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), "../../../../public");
const hasStill = (stem: string) => fs.existsSync(path.join(PUBLIC_DIR, "assets/effects", `${stem}.jpg`));

function find(stem: string): { family: Family; entry: Entry; prev: Entry | null; next: Entry | null } | null {
  for (const f of ix.list) {
    const i = f.entries.findIndex((e) => e.stem === stem);
    if (i !== -1) return { family: f, entry: f.entries[i], prev: f.entries[i - 1] ?? null, next: f.entries[i + 1] ?? null };
  }
  return null;
}

// Honest tags only: what the registry already knows about this entry (its family, its family's
// topical tag, whether it plays live) — never an invented adjective like "minimal", which nothing
// here measures.
function tagsFor(family: Family, entry: Entry): { label: string; title?: string }[] {
  const reason = entry.noPreview || family.noPreview;
  return [
    { label: family.tag },
    { label: family.title },
    reason ? { label: "static only", title: reason } : { label: "plays live" },
  ];
}

type RelatedEntry = Entry & { familyId: string; familyTitle: string };

// RELATED, AND NEITHER OF THE TWO CHEAP ANSWERS.
//
// The first draft opened with ADJACENCY, the entries either side of this one in its own family. That
// is not a relation, it is alphabetical order, and prev/next already shows it on this same page: on
// `blur` it put `bounce` in the footer a second time, one card away from the control that had just
// offered it. Adjacency is therefore excluded here outright.
//
// The second cheap answer is "any family sharing this tag, first two entries". `blur` shares the
// `text` tag with the ransom typefaces, so a blur preset recommended `anybody` and `archivo`, which
// are faces and have nothing to do with resolving out of a blur. Sharing a tag makes two entries
// eligible, not related.
//
// So: score by the words the two entries USE, which is the only description of meaning this registry
// carries. An entry whose blurb says "focus pull, heavy blur" scores against one that says "resolve
// out of blur"; a typeface name scores zero and drops out. Same tag is a tie-breaker rather than the
// signal. Stop words are the words every blurb has, and a word under four characters is noise.
const STOP = new Set(["the", "and", "with", "into", "from", "that", "this", "then", "each", "over",
  "onto", "when", "than", "them", "they", "its", "for", "not", "but", "one", "two", "per", "out",
  "text", "word", "layer", "scene", "frame", "effect", "every", "which", "while", "where"]);
const wordsOf = (e: Entry) => new Set(
  `${e.name} ${e.desc}`.toLowerCase().split(/[^a-z]+/).filter((w) => w.length >= 4 && !STOP.has(w)),
);

function relatedFor(family: Family, entry: Entry): RelatedEntry[] {
  const mine = wordsOf(entry);
  if (!mine.size) return [];
  const scored: { e: Entry; familyId: string; familyTitle: string; score: number }[] = [];
  for (const f of ix.list) {
    for (const e of f.entries) {
      if (e.stem === entry.stem) continue;
      let shared = 0;
      for (const w of wordsOf(e)) if (mine.has(w)) shared++;
      if (!shared) continue;
      // Same tag breaks ties toward the neighbourhood the reader is already in, without letting a
      // shared tag alone put an unrelated entry on the page.
      scored.push({ e, familyId: f.id, familyTitle: f.title, score: shared * 2 + (f.tag === family.tag ? 1 : 0) });
    }
  }
  scored.sort((a, b) => b.score - a.score || a.e.name.localeCompare(b.e.name));
  return scored.slice(0, 6).map(({ e, familyId, familyTitle }) => ({ ...e, familyId, familyTitle }));
}

export function generateStaticParams() {
  return ix.list.flatMap((f) => f.entries.map((e) => ({ stem: e.stem })));
}

export async function generateMetadata({ params }: { params: Promise<{ stem: string }> }): Promise<Metadata> {
  const { stem } = await params;
  const hit = find(stem);
  if (!hit) return { title: "Vawe · effects" };
  const { family, entry } = hit;
  return {
    title: `Vawe · ${entry.name}`,
    description: entry.desc || `${entry.name}, from the ${family.title} family in the Vawe effects arsenal, with the JSON that uses it.`,
  };
}

export default async function EffectDetail({ params }: { params: Promise<{ stem: string }> }) {
  const { stem } = await params;
  const hit = find(stem);
  if (!hit) notFound();
  const { family, entry, prev, next } = hit;
  const json = BODY[stem] ?? "";
  const { knobs, bodyType } = deriveKnobs(json, entry.name);
  const related = relatedFor(family, entry);

  return (
    <div className="shell">
      <Header active="arsenal" />
      <div className="wrap">
        <main id="content" tabIndex={-1}>
          <section className="fxpage">
            <Link className="backlink" href={`/arsenal?axis=${encodeURIComponent("effect:" + family.tag)}`}>← arsenal<span aria-hidden="true"> / </span>{family.tag}</Link>

            <div className="phead" style={{ padding: 0, maxWidth: "none" }}>
              <span className="kicker">
                <span className="dot" /> {family.tag} · {family.title}
                {!family.noPreview && !entry.noPreview && <> · <span className="tag fxtag-live">plays live</span></>}
              </span>
              <h1 className="mono">{entry.name}</h1>
              {entry.desc && <p><Rich text={entry.desc} /></p>}
            </div>

            <div className="fxtags" aria-label="Tags">
              {tagsFor(family, entry).map((t) => (
                <span key={t.label} className="fxtagchip" title={t.title}>{t.label}</span>
              ))}
            </div>

            <EffectStage name={entry.name} scene={entry.scene} json={json} noPreview={entry.noPreview ?? family.noPreview} knobs={knobs} bodyType={bodyType} />

            <nav className="fxpage-nav" aria-label="Other effects in this family">
              {prev ? (
                <Link href={`/arsenal/effects/${prev.stem}`} className="fxpage-prev">← <span className="mono">{prev.name}</span></Link>
              ) : <span />}
              {next ? (
                <Link href={`/arsenal/effects/${next.stem}`} className="fxpage-next"><span className="mono">{next.name}</span> →</Link>
              ) : <span />}
            </nav>

            {related.length > 0 && (
              <section className="fxrelated" aria-label="Related effects">
                <h2 className="fxrelated-h">Related</h2>
                <div className="fxgrid">
                  {related.map((e) => (
                    <Link key={e.stem} href={`/arsenal/effects/${e.stem}`} className="fxcard">
                      <span className="fxcard-media">
                        {hasStill(e.stem) ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={`/assets/effects/${e.stem}.jpg`} alt={`${e.name}, a still from its preview`} width={320} height={180} loading="lazy" className="is-loaded" />
                        ) : (
                          <span className="fxcard-noimg"><span className="mono">{e.familyId}</span></span>
                        )}
                      </span>
                      <span className="fxcard-body">
                        <span className="fxcard-name mono">{e.name}</span>
                        <span className="fxcard-desc">{e.familyTitle}</span>
                      </span>
                    </Link>
                  ))}
                </div>
              </section>
            )}
          </section>
        </main>

        <Footer note={`${family.title} · ${entry.name}`} />
      </div>
    </div>
  );
}
